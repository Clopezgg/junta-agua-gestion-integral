-- =============================================================================
-- V6 · Milestone G — Caja como espacio propio (§46)
-- La operación de caja deja de vivir dentro de Pagos. Estos RPC alimentan las
-- vistas Cobros / Arqueo / Diferencias / Historial. Sin cambios en la lógica de
-- apertura/cierre (ya correcta): solo lectura enriquecida.
-- =============================================================================

-- Reporte de una sesión de caja (la activa del usuario si p_session_id es NULL):
-- fondo, cobros de la sesión por método, efectivo esperado y, si está cerrada,
-- contado y diferencia.
create or replace function public.get_cash_session_report(p_session_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  with sess as (
    select c.* from public.cash_sessions c
    where c.organization_id=public.current_organization_id()
      and public.has_permission('payments.read')
      and (
        (p_session_id is not null and c.id=p_session_id)
        or (p_session_id is null and c.user_id=auth.uid() and c.status='open')
      )
    order by c.opened_at desc
    limit 1
  ),
  pays as (
    select p.* from public.payments p
    join sess on sess.id=p.cash_session_id
  ),
  refunds as (
    select coalesce(sum(e.amount),0) as amount
    from public.payment_events e
    join pays on pays.id=e.payment_id
    where e.event_type='refund'
  )
  select case when not exists(select 1 from sess) then null else jsonb_build_object(
    'session', (select to_jsonb(s) from sess s),
    'cashier', (select pr.full_name from public.profiles pr where pr.id=(select user_id from sess)),
    'payment_count', (select count(*) from pays where status='confirmed'),
    'totals_by_method', coalesce((
      select jsonb_object_agg(method, amount) from (
        select p.method::text as method, sum(p.total) as amount
        from pays p where p.status='confirmed' group by p.method
      ) t
    ), '{}'::jsonb),
    'cash_collected', (select coalesce(sum(total),0) from pays where status='confirmed' and method='cash'),
    'refunds', (select amount from refunds),
    'expected_cash', (
      (select opening_amount from sess)
      + (select coalesce(sum(total),0) from pays where status='confirmed' and method='cash')
      - (select amount from refunds)
    ),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'receipt_number',p.receipt_number,'subscriber_name',s.full_name,
        'method',p.method,'total',p.total,'status',p.status,'created_at',p.created_at)
        order by p.created_at desc)
      from pays p join public.subscribers s on s.id=p.subscriber_id
    ), '[]'::jsonb)
  ) end;
$$;

-- Historial de sesiones de caja (abiertas y cerradas) con cajero y diferencia.
create or replace function public.list_cash_sessions(p_limit int default 40)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(jsonb_agg(row) ,'[]'::jsonb) from (
    select jsonb_build_object(
      'id',c.id,'status',c.status,'location',c.location,
      'cashier',pr.full_name,
      'opening_amount',c.opening_amount,'expected_amount',c.expected_amount,
      'counted_amount',c.counted_amount,'difference',c.difference,
      'opened_at',c.opened_at,'closed_at',c.closed_at,'notes',c.notes
    ) as row
    from public.cash_sessions c
    join public.profiles pr on pr.id=c.user_id
    where c.organization_id=public.current_organization_id()
      and public.has_permission('payments.read')
    order by c.opened_at desc
    limit least(greatest(p_limit,1),200)
  ) q;
$$;

grant execute on function public.get_cash_session_report(uuid) to authenticated;
grant execute on function public.list_cash_sessions(int) to authenticated;
