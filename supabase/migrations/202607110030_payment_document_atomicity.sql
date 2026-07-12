begin;

create or replace function public.reverse_payment_financial_document(
  p_document_id uuid,
  p_reason text,
  p_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  original_row public.financial_documents%rowtype;
  reversal_row public.financial_documents%rowtype;
  refunded_before numeric:=0;
  refundable numeric:=0;
  new_status text;
begin
  if not public.has_permission('payments.void')
     or coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;
  if length(trim(coalesce(p_reason,'')))<15 then raise exception 'REVERSAL_REASON_REQUIRED'; end if;

  select * into original_row
  from public.financial_documents
  where id=p_document_id
    and organization_id=public.current_organization_id()
    and document_type='payment_receipt'
  for update;
  if original_row.id is null then raise exception 'PAYMENT_DOCUMENT_NOT_FOUND'; end if;
  if original_row.status='voided' then raise exception 'DOCUMENT_ALREADY_VOIDED'; end if;

  select coalesce(sum(abs(total_amount)),0) into refunded_before
  from public.financial_documents
  where reversal_of_document_id=original_row.id
    and document_type='refund_document';

  refundable:=greatest(0,original_row.total_amount-refunded_before);
  if p_amount<=0 or p_amount>refundable then raise exception 'INVALID_REFUND_AMOUNT'; end if;
  new_status:=case when p_amount>=refundable then 'refunded' else 'partially_refunded' end;

  insert into public.financial_documents(
    organization_id,document_number,document_type,status,subscriber_id,connection_id,
    obligation_id,payment_id,reversal_of_document_id,fiscal_year,posting_date,due_date,
    base_amount,discount_amount,late_fee_amount,total_amount,currency,template_snapshot,
    calculation_snapshot,posted_by,void_reason
  ) values(
    original_row.organization_id,
    public.next_document_number('refund_document','DEV',6),
    'refund_document','posted',original_row.subscriber_id,original_row.connection_id,
    original_row.obligation_id,original_row.payment_id,original_row.id,original_row.fiscal_year,
    current_date,null,-p_amount,0,0,-p_amount,original_row.currency,original_row.template_snapshot,
    jsonb_build_object('reversal_reason',trim(p_reason),'original_number',original_row.document_number,'refund_amount',p_amount),
    auth.uid(),trim(p_reason)
  ) returning * into reversal_row;

  update public.financial_documents
  set status=new_status,void_reason=trim(p_reason)
  where id=original_row.id;

  perform public.write_audit_event(
    'financial_document.refund','financial_documents',original_row.id::text,
    to_jsonb(original_row),
    jsonb_build_object('new_status',new_status,'reversal_document_id',reversal_row.id,'refund_amount',p_amount),
    trim(p_reason)
  );

  return jsonb_build_object('original_document_id',original_row.id,'new_status',new_status,'reversal_document',to_jsonb(reversal_row));
end
$$;

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
begin
  payment_result:=public.register_payment(p_payload);
  payment_id:=(payment_result->>'id')::uuid;
  if payment_id is null then raise exception 'PAYMENT_RESULT_INVALID'; end if;
  document_result:=public.post_payment_financial_document(payment_id);
  return payment_result||jsonb_build_object('financial_document',document_result);
end
$$;

create or replace function public.void_payment_with_document(p_payment_id uuid,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  original_document jsonb;
  payment_result jsonb;
  reversal_result jsonb;
begin
  if not public.has_permission('payments.void')
     or coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;
  original_document:=public.post_payment_financial_document(p_payment_id);
  payment_result:=public.void_payment(p_payment_id,p_reason);
  reversal_result:=public.reverse_financial_document((original_document->>'id')::uuid,p_reason,'void_document');
  return jsonb_build_object('payment',payment_result,'financial_reversal',reversal_result);
end
$$;

create or replace function public.refund_payment_with_document(p_payment_id uuid,p_amount numeric,p_reason text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  original_document jsonb;
  payment_result jsonb;
  reversal_result jsonb;
begin
  if not public.has_permission('payments.void')
     or coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;
  original_document:=public.post_payment_financial_document(p_payment_id);
  payment_result:=public.refund_payment(p_payment_id,p_amount,p_reason);
  reversal_result:=public.reverse_payment_financial_document((original_document->>'id')::uuid,p_reason,p_amount);
  return jsonb_build_object('payment',payment_result,'financial_reversal',reversal_result);
end
$$;

grant execute on function public.register_payment_with_document(jsonb) to authenticated;
grant execute on function public.void_payment_with_document(uuid,text) to authenticated;
grant execute on function public.refund_payment_with_document(uuid,numeric,text) to authenticated;
grant execute on function public.reverse_payment_financial_document(uuid,text,numeric) to authenticated;

commit;
