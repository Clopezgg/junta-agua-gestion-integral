-- =============================================================================
-- V6 · Milestone F — Listado profesional de abonados (§33, §103)
-- Consulta paginada en el servidor con búsqueda multi-campo, filtros y las
-- columnas reales de la tabla: código, abonado, ubicación, pegues, saldo,
-- estado, último pago, beneficio. Sin traer miles de filas al cliente.
-- =============================================================================

create or replace function public.list_subscribers(
  p_query       text default '',
  p_status      text default null,
  p_sector      text default null,
  p_balance     text default null,   -- 'con_saldo' | 'al_dia'
  p_has_benefit boolean default null,
  p_limit       int default 50,
  p_offset      int default 0
)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  with base as (
    select
      s.id                as subscriber_id,
      s.code              as code,
      s.full_name         as full_name,
      s.sector            as sector,
      s.address           as address,
      s.whatsapp          as whatsapp,
      s.status::text      as status,
      public.mask_identifier(i.document_number) as masked_document,
      (select count(*) from public.water_connections w
         where w.subscriber_id=s.id and w.status<>'cancelled') as connections_count,
      (select coalesce(array_agg(distinct w.service_type),array[]::text[]) from public.water_connections w
         where w.subscriber_id=s.id and w.status<>'cancelled') as service_types,
      (select coalesce(sum(public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)),0)
         from public.obligations o
         where o.subscriber_id=s.id and o.cancelled_at is null) as balance,
      exists(select 1 from public.subscriber_benefits sb
         where sb.subscriber_id=s.id and sb.status in('eligible','active')) as has_benefit,
      (select max(p.created_at::date) from public.payments p
         where p.subscriber_id=s.id and p.status<>'voided') as last_payment_date
    from public.subscribers s
    join public.subscriber_identities i on i.subscriber_id=s.id and i.is_primary
    where s.organization_id=public.current_organization_id()
      and public.has_permission('subscribers.read')
      and (
        coalesce(trim(p_query),'')=''
        or s.code ilike '%'||p_query||'%'
        or s.full_name ilike '%'||p_query||'%'
        or i.normalized_number like '%'||public.normalize_identifier(p_query)||'%'
        or s.whatsapp like '%'||p_query||'%'
        or s.sector ilike '%'||p_query||'%'
        or s.address ilike '%'||p_query||'%'
        or exists(select 1 from public.water_connections w
             where w.subscriber_id=s.id
               and (w.code ilike '%'||p_query||'%'
                 or w.normalized_meter like '%'||public.normalize_identifier(p_query)||'%'))
      )
      and (p_status is null or s.status::text=p_status)
      and (p_sector is null or s.sector=p_sector)
  ),
  filtered as (
    select * from base
    where (p_balance is null
       or (p_balance='con_saldo' and balance>0)
       or (p_balance='al_dia' and balance<=0))
      and (p_has_benefit is null or has_benefit=p_has_benefit)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows',  coalesce((
      select jsonb_agg(to_jsonb(page) order by page.full_name)
      from (
        select * from filtered
        order by full_name
        limit least(greatest(p_limit,1),100)
        offset greatest(p_offset,0)
      ) page
    ), '[]'::jsonb),
    'sectors', coalesce((select jsonb_agg(distinct sector) from base where sector is not null), '[]'::jsonb)
  );
$$;

grant execute on function public.list_subscribers(text,text,text,text,boolean,int,int) to authenticated;
