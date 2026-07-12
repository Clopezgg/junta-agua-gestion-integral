begin;

alter table public.obligations
  add column if not exists base_amount numeric(14,2),
  add column if not exists discount_amount numeric(14,2) not null default 0 check(discount_amount>=0),
  add column if not exists late_fee_amount numeric(14,2) not null default 0 check(late_fee_amount>=0),
  add column if not exists calculation_snapshot jsonb not null default '{}'::jsonb;

update public.obligations
set base_amount=coalesce(base_amount,original_amount),
    calculation_snapshot=case when calculation_snapshot='{}'::jsonb then jsonb_build_object('legacy_amount',original_amount,'migrated_at',now()) else calculation_snapshot end
where base_amount is null;

create or replace function public.generate_annual_obligations(p_tariff_definition_id uuid,p_year integer,p_due_date date)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  org uuid:=public.current_organization_id();
  def public.tariff_definitions%rowtype;
  ver public.tariff_versions%rowtype;
  inserted_count integer:=0;
  due_expected date;
  late_from date;
begin
  if not public.has_permission('obligations.manage') then raise exception 'FORBIDDEN'; end if;
  if coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'MFA_REQUIRED'; end if;
  if p_year<2000 or p_year>2100 then raise exception 'INVALID_YEAR'; end if;
  due_expected:=make_date(p_year,11,30);
  late_from:=make_date(p_year,12,1);
  if p_due_date<>due_expected then raise exception 'ANNUAL_DUE_DATE_MUST_BE_NOVEMBER_30'; end if;

  select * into def from public.tariff_definitions where id=p_tariff_definition_id and organization_id=org and status='active';
  if not found or not def.is_annual then raise exception 'ANNUAL_TARIFF_NOT_FOUND'; end if;
  select * into ver from public.tariff_versions
  where tariff_definition_id=def.id and valid_from<=make_date(p_year,12,31) and (valid_to is null or valid_to>=make_date(p_year,1,1))
  order by valid_from desc limit 1;
  if not found then raise exception 'NO_TARIFF_VERSION_FOR_YEAR'; end if;

  insert into public.obligations(
    organization_id,subscriber_id,connection_id,tariff_definition_id,tariff_version_id,source,period_key,description,
    issue_date,due_date,original_amount,base_amount,discount_amount,late_fee_amount,calculation_snapshot,created_by
  )
  select
    org,
    w.subscriber_id,
    w.id,
    def.id,
    ver.id,
    'annual_generation',
    'ANUAL-'||p_year,
    def.name||' '||p_year,
    make_date(p_year,1,1),
    p_due_date,
    greatest(0,ver.amount - case when senior.is_eligible then round(ver.amount*senior.percentage/100,2) else 0 end),
    ver.amount,
    case when senior.is_eligible then round(ver.amount*senior.percentage/100,2) else 0 end,
    0,
    jsonb_build_object(
      'rule','annual_fee_per_active_connection',
      'year',p_year,
      'period_from',make_date(p_year,1,1),
      'period_to',p_due_date,
      'late_from',late_from,
      'connection_code',w.code,
      'unit_amount',ver.amount,
      'base_amount',ver.amount,
      'senior_discount_applied',senior.is_eligible,
      'senior_age',senior.age_value,
      'senior_percentage',case when senior.is_eligible then senior.percentage else 0 end,
      'discount_amount',case when senior.is_eligible then round(ver.amount*senior.percentage/100,2) else 0 end,
      'total_amount',greatest(0,ver.amount - case when senior.is_eligible then round(ver.amount*senior.percentage/100,2) else 0 end),
      'identity_required',true,
      'generated_at',now()
    ),
    auth.uid()
  from public.water_connections w
  join public.subscribers s on s.id=w.subscriber_id
  left join lateral (
    select
      public.age_on_date(s.birth_date,make_date(p_year,12,31)) as age_value,
      coalesce((select bd.percentage from public.benefit_definitions bd where bd.organization_id=org and bd.code='SENIOR_60' and bd.active limit 1),25) as percentage,
      public.age_on_date(s.birth_date,make_date(p_year,12,31))>=60
        and exists(select 1 from public.subscriber_identities i where i.subscriber_id=s.id and i.organization_id=org and i.is_primary) as is_eligible
  ) senior on true
  where w.organization_id=org and w.status='active' and s.status='active' and (def.applies_to_service is null or def.applies_to_service=w.service_type)
  on conflict(organization_id,connection_id,tariff_definition_id,period_key) do nothing;
  get diagnostics inserted_count=row_count;

  perform public.write_audit_event('generate','annual_obligations',def.id::text,null,jsonb_build_object('year',p_year,'count',inserted_count,'due_date',p_due_date,'discounts','snapshotted'),'Generación anual con descuento histórico por pegue');
  return jsonb_build_object('created',inserted_count,'year',p_year,'tariff',def.name,'amount',ver.amount,'due_date',p_due_date,'late_from',late_from);
end
$$;

create or replace function public.get_payment_receipt_data(p_payment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare result jsonb;
begin
  if not public.has_permission('payments.read') then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'id',p.id,'receipt_number',p.receipt_number,'created_at',p.created_at,'total',p.total,
    'received_amount',p.received_amount,'change_amount',p.change_amount,'method',p.method,'status',p.status,
    'verification_token',p.verification_token,'subscriber_name',s.full_name,'subscriber_code',s.code,
    'subscriber_email',s.email,'subscriber_address',s.address,'subscriber_sector',s.sector,
    'masked_identity',(select left(i.normalized_number,4)||repeat('*',greatest(length(i.normalized_number)-8,2))||right(i.normalized_number,4) from public.subscriber_identities i where i.subscriber_id=s.id and i.is_primary limit 1),
    'brand_snapshot',p.receipt_brand_snapshot,
    'annual_year',(select max((o.calculation_snapshot->>'year')::int) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id and o.calculation_snapshot ? 'year'),
    'period_from',(select min(o.issue_date) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id),
    'period_to',(select max(o.due_date) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id),
    'late_from',(select max((o.calculation_snapshot->>'late_from')::date) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id and o.calculation_snapshot ? 'late_from'),
    'connection_count',(select count(distinct o.connection_id) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id and o.connection_id is not null),
    'connection_codes',(select coalesce(jsonb_agg(distinct c.code),'[]'::jsonb) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id left join public.water_connections c on c.id=o.connection_id where pa.payment_id=p.id and c.code is not null),
    'base_amount',(select coalesce(sum(coalesce(o.base_amount,o.original_amount)),0) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id),
    'discount_amount',(select coalesce(sum(o.discount_amount),0) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id),
    'late_fee_amount',(select coalesce(sum(o.late_fee_amount),0) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id),
    'items',(select coalesce(jsonb_agg(jsonb_build_object('code',coalesce(c.code,'SRV'),'description',o.description,'quantity',1,'unitPrice',coalesce(o.base_amount,o.original_amount),'amount',pa.amount) order by o.due_date),'[]'::jsonb) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id left join public.water_connections c on c.id=o.connection_id where pa.payment_id=p.id),
    'components',(select coalesce(jsonb_agg(jsonb_build_object('method',c.method,'amount',c.amount,'reference',c.reference)),'[]'::jsonb) from public.payment_components c where c.payment_id=p.id)
  ) into result
  from public.payments p join public.subscribers s on s.id=p.subscriber_id
  where p.id=p_payment_id and p.organization_id=public.current_organization_id();
  if result is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
  return result;
end
$$;

create or replace function public.verify_receipt_public(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'valid',true,'receipt_number',p.receipt_number,'created_at',p.created_at,'total',p.total,'method',p.method,'status',p.status,
    'subscriber',left(s.full_name,1)||repeat('*',greatest(length(s.full_name)-2,1))||right(s.full_name,1),
    'subscriber_code',s.code,
    'masked_identity',(select left(i.normalized_number,4)||repeat('*',greatest(length(i.normalized_number)-8,2))||right(i.normalized_number,4) from public.subscriber_identities i where i.subscriber_id=s.id and i.is_primary limit 1),
    'organization',o.name,'organization_address',o.address,'receipt_path',p.receipt_path,
    'items',(select coalesce(jsonb_agg(jsonb_build_object('description',ob.description,'amount',pa.amount) order by ob.due_date),'[]'::jsonb) from public.payment_allocations pa join public.obligations ob on ob.id=pa.obligation_id where pa.payment_id=p.id)
  )
  from public.payments p
  join public.subscribers s on s.id=p.subscriber_id
  join public.organizations o on o.id=p.organization_id
  where p.verification_token=p_token
  limit 1
$$;

grant execute on function public.generate_annual_obligations(uuid,integer,date) to authenticated;
grant execute on function public.get_payment_receipt_data(uuid) to authenticated;
grant execute on function public.verify_receipt_public(uuid) to anon,authenticated;

commit;
