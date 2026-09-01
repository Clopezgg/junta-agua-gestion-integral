-- =============================================================================
-- V6 · Milestone F — Expediente único del Abonado 360 (§34)
-- Un solo RPC que arma todo lo que muestra la ficha (8 pestañas): identidad,
-- servicio (pegues/contratos), cuenta (obligaciones + saldo), pagos, atención
-- (solicitudes), trabajo (órdenes), documentos y trazabilidad. Keyed por
-- subscriber_id — el eje real de facturación/operación. Si existe la relación
-- PERSONA→ABONADO del modelo V5 (§31) se anexa sin exponerla como diagrama.
-- Sin cambios destructivos. Respeta permisos por sección.
-- =============================================================================

create or replace function public.get_subscriber_expediente(p_subscriber_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  with s as (
    select * from public.subscribers
    where id=p_subscriber_id and organization_id=public.current_organization_id()
  ),
  acct_items as (
    select
      o.id,o.description,o.period_key,o.due_date,o.issue_date,
      o.original_amount,o.adjustment_amount,o.paid_amount,o.cancelled_at,
      d.name as tariff_name, w.code as connection_code,
      public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount) as balance,
      public.obligation_computed_state(o.due_date,o.original_amount,o.adjustment_amount,o.paid_amount,o.cancelled_at)::text as state
    from public.obligations o
    join public.tariff_definitions d on d.id=o.tariff_definition_id
    left join public.water_connections w on w.id=o.connection_id
    where o.subscriber_id=p_subscriber_id
      and o.organization_id=public.current_organization_id()
      and public.has_permission('obligations.read')
  )
  select case when not exists(select 1 from s) or not public.has_permission('subscribers.read') then null else jsonb_build_object(
    'subscriber', (select to_jsonb(s) - 'normalized_name' from s),
    'identities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',i.id,'document_type',i.document_type,
        'masked_number',public.mask_identifier(i.document_number),
        'is_primary',i.is_primary,'has_file',i.storage_path is not null))
      from public.subscriber_identities i where i.subscriber_id=p_subscriber_id
    ),'[]'::jsonb),
    'connections', coalesce((
      select jsonb_agg(to_jsonb(w) order by w.code)
      from public.water_connections w where w.subscriber_id=p_subscriber_id
    ),'[]'::jsonb),
    'person_link', (
      select jsonb_build_object(
        'abonado_id',a.id,'category',a.category,'status',a.status,'since_date',a.since_date,
        'person',(select to_jsonb(pe) - 'normalized_name' - 'normalized_document'
                  from public.persons pe where pe.id=a.person_id))
      from public.abonados a where a.subscriber_id=p_subscriber_id
    ),
    'contracts', coalesce((
      select jsonb_agg(to_jsonb(sc))
      from public.service_contracts sc
      join public.abonados a on a.id=sc.abonado_id
      where a.subscriber_id=p_subscriber_id
    ),'[]'::jsonb),
    'account', (
      select jsonb_build_object(
        'total_pending', coalesce(sum(balance) filter (where state<>'cancelled'),0),
        'overdue_amount', coalesce(sum(balance) filter (where state='overdue'),0),
        'overdue_count', count(*) filter (where state='overdue'),
        'oldest_due_date', min(due_date) filter (where state='overdue'),
        'solvent', coalesce(sum(balance) filter (where state<>'cancelled'),0)=0
      ) from acct_items
    ),
    'obligations', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.due_date desc) from acct_items a
    ),'[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'receipt_number',p.receipt_number,'method',p.method,
        'total',p.total,'status',p.status,'created_at',p.created_at,'verification_token',p.verification_token))
      from (
        select * from public.payments
        where subscriber_id=p_subscriber_id and organization_id=public.current_organization_id()
          and public.has_permission('payments.read')
        order by created_at desc limit 20
      ) p
    ),'[]'::jsonb),
    'benefits', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',sb.id,'status',sb.status,'name',bd.name,'percentage',bd.percentage,
        'valid_from',sb.valid_from,'valid_to',sb.valid_to,'automatic',sb.detected_automatically))
      from public.subscriber_benefits sb
      join public.benefit_definitions bd on bd.id=sb.benefit_definition_id
      where sb.subscriber_id=p_subscriber_id
    ),'[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',sr.id,'code',sr.code,'type',sr.request_type,'status',sr.status,
        'subject',sr.subject,'priority',sr.priority,'created_at',sr.created_at,
        'work_order_id',sr.work_order_id) order by sr.created_at desc)
      from public.service_requests sr where sr.subscriber_id=p_subscriber_id
    ),'[]'::jsonb),
    'work_orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',wo.id,'order_number',wo.order_number,'type',wo.type,'status',wo.status,
        'priority',wo.priority,'scheduled_at',wo.scheduled_at,'completed_at',wo.completed_at,
        'created_at',wo.created_at) order by wo.created_at desc)
      from public.work_orders wo
      where wo.subscriber_id=p_subscriber_id and public.has_permission('operations.read')
    ),'[]'::jsonb),
    'audit', coalesce((
      select jsonb_agg(jsonb_build_object(
        'action',ae.action,'entity_type',ae.entity_type,'reason',ae.reason,'created_at',ae.created_at)
        order by ae.created_at desc)
      from (
        select ae2.* from public.audit_events ae2
        where ae2.organization_id=public.current_organization_id()
          and public.has_permission('audit.read')
          and (
            ae2.entity_id=p_subscriber_id::text
            or ae2.entity_id in (select w.id::text from public.water_connections w where w.subscriber_id=p_subscriber_id)
            or ae2.entity_id in (select p.id::text from public.payments p where p.subscriber_id=p_subscriber_id)
          )
        order by ae2.created_at desc limit 40
      ) ae
    ),'[]'::jsonb)
  ) end;
$$;

grant execute on function public.get_subscriber_expediente(uuid) to authenticated;
