-- =============================================================================
-- V6 · G.3 — Recibo oficial: snapshot de "Situación de la cuenta" (§19, §24)
-- El recibo congela saldo anterior / pago aplicado / saldo posterior en el
-- momento del pago. Se calcula en el wrapper register_payment_with_document
-- (sin tocar el núcleo register_payment). get_payment_receipt_data los expone
-- junto con un texto de concepto listo para "POR CONCEPTO DE".
-- =============================================================================

alter table public.payments
  add column if not exists balance_before numeric(14,2),
  add column if not exists balance_after  numeric(14,2);

create or replace function public.register_payment_with_document(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  payment_result jsonb;
  document_result jsonb;
  payment_id uuid;
  bal_after numeric;
begin
  payment_result:=public.register_payment(p_payload);
  payment_id:=(payment_result->>'id')::uuid;
  if payment_id is null then raise exception 'PAYMENT_RESULT_INVALID'; end if;

  -- Snapshot de la cuenta, congelado en el pago (§19/§24). Guardado sólo una vez.
  update public.payments p set
    balance_after = sub.bal,
    balance_before = sub.bal + p.total
  from (
    select coalesce(sum(public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)),0) as bal
    from public.obligations o
    join public.payments pp on pp.id=payment_id
    where o.subscriber_id=pp.subscriber_id
      and o.organization_id=pp.organization_id
      and o.cancelled_at is null
  ) sub
  where p.id=payment_id and p.balance_after is null
  returning p.balance_after into bal_after;

  document_result:=public.post_payment_financial_document(payment_id);
  return payment_result||jsonb_build_object('financial_document',document_result);
end
$$;

-- get_payment_receipt_data: + previous_balance, new_balance, concept
create or replace function public.get_payment_receipt_data(p_payment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare base jsonb; extra jsonb; y int; concept text;
begin
  if not public.has_permission('payments.read') then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'id',p.id,'receipt_number',p.receipt_number,'created_at',p.created_at,'total',p.total,
    'received_amount',p.received_amount,'change_amount',p.change_amount,'method',p.method,'status',p.status,
    'verification_token',p.verification_token,'subscriber_name',s.full_name,'subscriber_code',s.code,
    'subscriber_email',s.email,'subscriber_address',s.address,'subscriber_sector',s.sector,
    'receipt_path',p.receipt_path,'cash_session_id',p.cash_session_id,
    'previous_balance',p.balance_before,'new_balance',p.balance_after,
    'masked_identity',(select left(i.normalized_number,4)||repeat('*',greatest(length(i.normalized_number)-8,2))||right(i.normalized_number,4) from public.subscriber_identities i where i.subscriber_id=s.id and i.is_primary limit 1),
    'brand_snapshot',p.receipt_brand_snapshot,
    'cashier',(select pr.full_name from public.profiles pr where pr.id=p.created_by),
    'cash_box',(select cs.location from public.cash_sessions cs where cs.id=p.cash_session_id),
    'annual_year',(select max((o.calculation_snapshot->>'year')::int) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id and o.calculation_snapshot ? 'year'),
    'connection_count',(select count(distinct o.connection_id) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id and o.connection_id is not null),
    'connection_codes',(select coalesce(jsonb_agg(distinct c.code),'[]'::jsonb) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id left join public.water_connections c on c.id=o.connection_id where pa.payment_id=p.id and c.code is not null),
    'base_amount',(select coalesce(sum(coalesce(o.base_amount,o.original_amount)),0) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id),
    'discount_amount',(select coalesce(sum(o.discount_amount),0) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id),
    'late_fee_amount',(select coalesce(sum(o.late_fee_amount),0) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id),
    'reference',(select string_agg(distinct nullif(trim(c.reference),''),' · ') from public.payment_components c where c.payment_id=p.id),
    'items',(select coalesce(jsonb_agg(jsonb_build_object('code',coalesce(c.code,'SRV'),'description',o.description,'quantity',1,'unitPrice',coalesce(o.base_amount,o.original_amount),'amount',pa.amount) order by o.due_date),'[]'::jsonb) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id left join public.water_connections c on c.id=o.connection_id where pa.payment_id=p.id),
    'components',(select coalesce(jsonb_agg(jsonb_build_object('method',c.method,'amount',c.amount,'reference',c.reference)),'[]'::jsonb) from public.payment_components c where c.payment_id=p.id)
  ) into base
  from public.payments p join public.subscribers s on s.id=p.subscriber_id
  where p.id=p_payment_id and p.organization_id=public.current_organization_id();
  if base is null then raise exception 'PAYMENT_NOT_FOUND'; end if;

  y:=(base->>'annual_year')::int;
  if y is not null then
    concept:='Pago de cuota del servicio de agua potable correspondiente al año '||y||'.';
  else
    select string_agg(distinct o.description,'; ') into concept
    from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id
    where pa.payment_id=p_payment_id;
    concept:=coalesce(concept,'Pago del servicio de agua potable.');
  end if;
  return base||jsonb_build_object('concept',concept);
end
$$;

grant execute on function public.register_payment_with_document(jsonb) to authenticated;
grant execute on function public.get_payment_receipt_data(uuid) to authenticated;
