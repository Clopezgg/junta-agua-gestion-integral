-- V6 · Milestone H — Cartera y convenios (Visual Contract §34-36, §49-50).
-- Sólo lectura y agregación. NO introduce suspensión automática ni política de
-- mora embebida: los cortes siguen siendo una decisión operativa (list_cut_candidates).
-- No altera enums ni tablas existentes.
begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- get_portfolio_overview: foto de la cartera a una fecha (§34).
-- Antigüedad de saldo (aging), desglose por sector y mayores deudores.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_portfolio_overview(p_as_of date default current_date)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  with open_ob as (
    select o.subscriber_id,o.connection_id,o.due_date,
      public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount) as bal
    from public.obligations o
    where o.organization_id=public.current_organization_id()
      and public.has_permission('obligations.read')
      and o.cancelled_at is null
      and public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)>0
  ),
  tagged as (
    select ob.*,
      w.sector,
      case
        when ob.due_date>=p_as_of then 'por_vencer'
        when p_as_of-ob.due_date between 1 and 30 then 'd1_30'
        when p_as_of-ob.due_date between 31 and 60 then 'd31_60'
        when p_as_of-ob.due_date between 61 and 90 then 'd61_90'
        else 'd90_mas'
      end as bucket
    from open_ob ob
    join public.water_connections w on w.id=ob.connection_id
  )
  select jsonb_build_object(
    'as_of',p_as_of,
    'totals',jsonb_build_object(
      'subscribers_with_debt',(select count(distinct subscriber_id) from tagged),
      'obligations_open',(select count(*) from tagged),
      'balance_total',(select coalesce(sum(bal),0) from tagged),
      'current',(select coalesce(sum(bal) filter(where bucket='por_vencer'),0) from tagged),
      'overdue',(select coalesce(sum(bal) filter(where bucket<>'por_vencer'),0) from tagged)
    ),
    'aging',(
      select coalesce(jsonb_agg(jrow order by ord),'[]'::jsonb) from (
        select jsonb_build_object(
          'bucket',b.bucket,'label',b.label,
          'subscribers',coalesce(count(distinct t.subscriber_id),0),
          'amount',coalesce(sum(t.bal),0)
        ) as jrow,b.ord
        from (values
          ('por_vencer','Por vencer',1),('d1_30','1–30 días',2),
          ('d31_60','31–60 días',3),('d61_90','61–90 días',4),
          ('d90_mas','Más de 90 días',5)
        ) as b(bucket,label,ord)
        left join tagged t on t.bucket=b.bucket
        group by b.bucket,b.label,b.ord
      ) s
    ),
    'by_sector',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'sector',sector,'subscribers',subscribers,'amount',amount,'overdue_amount',overdue_amount
      ) order by amount desc),'[]'::jsonb)
      from (
        select coalesce(sector,'Sin sector') as sector,
          count(distinct subscriber_id) as subscribers,
          sum(bal) as amount,
          sum(bal) filter(where bucket<>'por_vencer') as overdue_amount
        from tagged group by coalesce(sector,'Sin sector')
      ) g
    ),
    'top_debtors',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'subscriber_id',d.subscriber_id,'subscriber_code',s.code,'subscriber_name',s.full_name,
        'sector',d.sector,'balance',d.balance,'oldest_due_date',d.oldest_due_date,
        'days_overdue',greatest(p_as_of-d.oldest_due_date,0)
      ) order by d.balance desc),'[]'::jsonb)
      from (
        select subscriber_id,max(sector) as sector,sum(bal) as balance,min(due_date) as oldest_due_date
        from tagged group by subscriber_id order by sum(bal) desc limit 25
      ) d
      join public.subscribers s on s.id=d.subscriber_id
    )
  )
$$;

grant execute on function public.get_portfolio_overview(date) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- list_arrangements_workspace: convenios con nombre del abonado, avance de pago
-- y estado derivado para el tablero (§36, §50). No muta nada.
-- display_status: cancelado | completado | vencido | al_dia
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.list_arrangements_workspace(p_status text default null)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select case when not public.has_permission('obligations.read') then '[]'::jsonb else coalesce(jsonb_agg(jrow order by created_at desc),'[]'::jsonb) end
  from (
    select a.created_at,jsonb_build_object(
      'id',a.id,'code',a.code,'status',a.status,'frequency',a.frequency,
      'total_debt',a.total_debt,'installment_amount',a.installment_amount,
      'num_installments',a.num_installments,'first_due_date',a.first_due_date,'notes',a.notes,
      'subscriber_id',a.subscriber_id,'subscriber_name',s.full_name,'subscriber_code',s.code,
      'paid_to_date',coalesce((select sum(ai.paid_amount) from arrangement_installments ai where ai.arrangement_id=a.id),0),
      'installments_paid',coalesce((select count(*) from arrangement_installments ai where ai.arrangement_id=a.id and ai.status='pagada'),0),
      'installments_total',a.num_installments,
      'next_due_date',(select min(ai.due_date) from arrangement_installments ai where ai.arrangement_id=a.id and ai.status<>'pagada'),
      'overdue_installments',coalesce((select count(*) from arrangement_installments ai where ai.arrangement_id=a.id and ai.status<>'pagada' and ai.due_date<current_date),0),
      'display_status',case
        when a.status='cancelado' then 'cancelado'
        when a.status='cumplido' then 'completado'
        when a.status='incumplido' then 'vencido'
        when exists(select 1 from arrangement_installments ai where ai.arrangement_id=a.id and ai.status<>'pagada' and ai.due_date<current_date) then 'vencido'
        else 'al_dia'
      end
    ) as jrow
    from payment_arrangements a
    join subscribers s on s.id=a.subscriber_id
    where a.organization_id=current_organization_id()
      and (p_status is null or a.status=(p_status)::arrangement_status)
  ) t
$$;

grant execute on function public.list_arrangements_workspace(text) to authenticated;

commit;
