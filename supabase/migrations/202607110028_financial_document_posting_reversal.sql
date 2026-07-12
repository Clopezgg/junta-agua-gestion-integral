begin;

create or replace function public.get_active_document_template(p_document_type text)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',t.id,
    'document_type',t.document_type,
    'version_number',t.version_number,
    'name',t.name,
    'configuration',t.configuration,
    'activated_at',t.activated_at
  )
  from public.document_template_versions t
  where t.organization_id=public.current_organization_id()
    and t.document_type=p_document_type
    and t.status='active'
    and public.has_permission('document_templates.read')
  order by t.version_number desc
  limit 1
$$;

create or replace function public.post_annual_financial_document(p_obligation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  obligation_row public.obligations%rowtype;
  subscriber_row public.subscribers%rowtype;
  connection_row public.water_connections%rowtype;
  existing_row public.financial_documents%rowtype;
  document_row public.financial_documents%rowtype;
  template_row public.document_template_versions%rowtype;
  benefit_percentage numeric:=0;
  discount_amount numeric:=0;
  base_amount numeric:=0;
  balance_amount numeric:=0;
  year_value int;
begin
  if not public.has_permission('obligations.manage')
     or coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;

  select * into obligation_row
  from public.obligations
  where id=p_obligation_id
    and organization_id=public.current_organization_id()
    and cancelled_at is null
  for update;
  if obligation_row.id is null then raise exception 'OBLIGATION_NOT_FOUND'; end if;

  select * into existing_row
  from public.financial_documents
  where obligation_id=obligation_row.id
    and document_type='annual_invoice'
    and status<>'voided'
  order by created_at desc limit 1;
  if existing_row.id is not null then return to_jsonb(existing_row); end if;

  select * into subscriber_row from public.subscribers where id=obligation_row.subscriber_id;
  if obligation_row.connection_id is not null then select * into connection_row from public.water_connections where id=obligation_row.connection_id; end if;
  year_value:=coalesce(nullif(regexp_replace(coalesce(obligation_row.period_key,''),'[^0-9]','','g'),'')::int,extract(year from obligation_row.due_date)::int);
  base_amount:=obligation_row.original_amount+obligation_row.adjustment_amount;
  balance_amount:=public.obligation_balance(obligation_row.original_amount,obligation_row.adjustment_amount,obligation_row.paid_amount);

  if public.age_on_date(subscriber_row.birth_date,make_date(year_value,12,31))>=60
     and exists(select 1 from public.subscriber_identities i where i.subscriber_id=subscriber_row.id and i.is_primary)
     and exists(select 1 from public.benefit_definitions bd where bd.organization_id=subscriber_row.organization_id and bd.code='SENIOR_60' and bd.active) then
    benefit_percentage:=25;
  end if;

  discount_amount:=case
    when benefit_percentage>0 and obligation_row.description ilike '%anual%' then round(base_amount*benefit_percentage/100,2)
    else 0
  end;

  select * into template_row
  from public.document_template_versions
  where organization_id=obligation_row.organization_id
    and document_type='annual_invoice'
    and status='active'
  order by version_number desc limit 1;

  insert into public.financial_documents(
    organization_id,document_number,document_type,status,subscriber_id,connection_id,
    obligation_id,fiscal_year,posting_date,due_date,base_amount,discount_amount,
    late_fee_amount,total_amount,currency,template_snapshot,calculation_snapshot,posted_by
  ) values(
    obligation_row.organization_id,
    public.next_document_number('annual_invoice','FAC',6),
    'annual_invoice',
    case when balance_amount<=0 then 'paid' when obligation_row.due_date<current_date then 'posted' else 'posted' end,
    obligation_row.subscriber_id,
    obligation_row.connection_id,
    obligation_row.id,
    year_value,
    current_date,
    obligation_row.due_date,
    base_amount,
    discount_amount,
    0,
    greatest(0,base_amount-discount_amount),
    'HNL',
    coalesce(template_row.configuration,'{}'::jsonb)||jsonb_build_object('template_id',template_row.id,'version_number',template_row.version_number),
    jsonb_build_object(
      'subscriber_code',subscriber_row.code,
      'subscriber_name',subscriber_row.full_name,
      'connection_code',connection_row.code,
      'concept',obligation_row.description,
      'base_amount',base_amount,
      'senior_percentage',benefit_percentage,
      'discount_amount',discount_amount,
      'balance_at_posting',balance_amount,
      'due_date',obligation_row.due_date
    ),
    auth.uid()
  ) returning * into document_row;

  perform public.write_audit_event(
    'financial_document.post',
    'financial_documents',
    document_row.id::text,
    null,
    to_jsonb(document_row),
    'Documento anual contabilizado con MFA'
  );
  return to_jsonb(document_row);
end
$$;

create or replace function public.post_payment_financial_document(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  payment_row public.payments%rowtype;
  existing_row public.financial_documents%rowtype;
  document_row public.financial_documents%rowtype;
  template_row public.document_template_versions%rowtype;
begin
  if not public.has_permission('payments.read') then raise exception 'FORBIDDEN'; end if;
  select * into payment_row from public.payments
  where id=p_payment_id and organization_id=public.current_organization_id();
  if payment_row.id is null then raise exception 'PAYMENT_NOT_FOUND'; end if;

  select * into existing_row from public.financial_documents
  where payment_id=payment_row.id and document_type='payment_receipt'
  order by created_at desc limit 1;
  if existing_row.id is not null then return to_jsonb(existing_row); end if;

  select * into template_row from public.document_template_versions
  where organization_id=payment_row.organization_id and document_type='payment_receipt' and status='active'
  order by version_number desc limit 1;

  insert into public.financial_documents(
    organization_id,document_number,document_type,status,subscriber_id,payment_id,
    fiscal_year,posting_date,base_amount,total_amount,currency,template_snapshot,
    calculation_snapshot,posted_by
  ) values(
    payment_row.organization_id,
    payment_row.receipt_number,
    'payment_receipt',
    case payment_row.status when 'voided' then 'voided' when 'refunded' then 'refunded' when 'partially_refunded' then 'partially_refunded' else 'paid' end,
    payment_row.subscriber_id,
    payment_row.id,
    extract(year from payment_row.created_at)::int,
    payment_row.created_at::date,
    payment_row.total,
    payment_row.total,
    'HNL',
    coalesce(payment_row.receipt_brand_snapshot,template_row.configuration,'{}'::jsonb),
    jsonb_build_object('method',payment_row.method,'received_amount',payment_row.received_amount,'change_amount',payment_row.change_amount),
    payment_row.created_by
  ) returning * into document_row;

  perform public.write_audit_event('financial_document.post','financial_documents',document_row.id::text,null,to_jsonb(document_row),'Recibo contabilizado');
  return to_jsonb(document_row);
end
$$;

create or replace function public.reverse_financial_document(
  p_document_id uuid,
  p_reason text,
  p_reversal_type text default 'void_document'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  original_row public.financial_documents%rowtype;
  reversal_row public.financial_documents%rowtype;
  prefix_value text;
begin
  if not public.has_permission('payments.void')
     or coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;
  if length(trim(coalesce(p_reason,'')))<15 then raise exception 'REVERSAL_REASON_REQUIRED'; end if;
  if p_reversal_type not in('void_document','refund_document','credit_note') then raise exception 'INVALID_REVERSAL_TYPE'; end if;

  select * into original_row from public.financial_documents
  where id=p_document_id and organization_id=public.current_organization_id()
  for update;
  if original_row.id is null then raise exception 'DOCUMENT_NOT_FOUND'; end if;
  if original_row.status in('voided','refunded') then raise exception 'DOCUMENT_ALREADY_REVERSED'; end if;

  prefix_value:=case p_reversal_type when 'void_document' then 'ANU' when 'refund_document' then 'DEV' else 'NCR' end;

  insert into public.financial_documents(
    organization_id,document_number,document_type,status,subscriber_id,connection_id,
    obligation_id,payment_id,reversal_of_document_id,fiscal_year,posting_date,due_date,
    base_amount,discount_amount,late_fee_amount,total_amount,currency,template_snapshot,
    calculation_snapshot,posted_by,void_reason
  ) values(
    original_row.organization_id,
    public.next_document_number(p_reversal_type,prefix_value,6),
    p_reversal_type,
    'posted',
    original_row.subscriber_id,
    original_row.connection_id,
    original_row.obligation_id,
    original_row.payment_id,
    original_row.id,
    original_row.fiscal_year,
    current_date,
    null,
    -original_row.base_amount,
    -original_row.discount_amount,
    -original_row.late_fee_amount,
    -original_row.total_amount,
    original_row.currency,
    original_row.template_snapshot,
    jsonb_build_object('reversal_reason',trim(p_reason),'original_number',original_row.document_number),
    auth.uid(),
    trim(p_reason)
  ) returning * into reversal_row;

  update public.financial_documents
  set status=case when p_reversal_type='refund_document' then 'refunded' else 'voided' end,
      void_reason=trim(p_reason)
  where id=original_row.id;

  perform public.write_audit_event('financial_document.reverse','financial_documents',original_row.id::text,to_jsonb(original_row),jsonb_build_object('new_status',case when p_reversal_type='refund_document' then 'refunded' else 'voided' end,'reversal_document_id',reversal_row.id),trim(p_reason));
  return jsonb_build_object('original_document_id',original_row.id,'reversal_document',to_jsonb(reversal_row));
end
$$;

create or replace function public.list_financial_documents(
  p_query text default null,
  p_document_type text default null,
  p_status text default null,
  p_limit int default 100
)
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',d.id,'document_number',d.document_number,'document_type',d.document_type,
    'status',d.status,'posting_date',d.posting_date,'due_date',d.due_date,
    'subscriber_id',d.subscriber_id,'subscriber_code',s.code,'subscriber_name',s.full_name,
    'connection_code',c.code,'base_amount',d.base_amount,'discount_amount',d.discount_amount,
    'late_fee_amount',d.late_fee_amount,'total_amount',d.total_amount,'currency',d.currency,
    'fiscal_year',d.fiscal_year,'reversal_of_document_id',d.reversal_of_document_id,
    'calculation_snapshot',d.calculation_snapshot,'created_at',d.created_at
  )
  from public.financial_documents d
  left join public.subscribers s on s.id=d.subscriber_id
  left join public.water_connections c on c.id=d.connection_id
  where d.organization_id=public.current_organization_id()
    and (public.has_permission('payments.read') or public.has_permission('obligations.read') or public.has_permission('audit.read'))
    and (coalesce(trim(p_query),'')='' or d.document_number ilike '%'||trim(p_query)||'%' or s.full_name ilike '%'||trim(p_query)||'%' or s.code ilike '%'||trim(p_query)||'%')
    and (coalesce(trim(p_document_type),'')='' or d.document_type=p_document_type)
    and (coalesce(trim(p_status),'')='' or d.status=p_status)
  order by d.created_at desc
  limit least(greatest(p_limit,1),500)
$$;

create index if not exists financial_documents_obligation_idx on public.financial_documents(organization_id,obligation_id,document_type);
create index if not exists financial_documents_payment_idx on public.financial_documents(organization_id,payment_id,document_type);
create index if not exists financial_documents_reversal_idx on public.financial_documents(organization_id,reversal_of_document_id);

commit;
