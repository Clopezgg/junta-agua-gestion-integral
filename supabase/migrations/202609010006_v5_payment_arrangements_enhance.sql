-- V5-FASE4+ · Morosidad y convenios: registro de cuotas y avance del plan.
-- Completa la base 038 (payment_arrangements) con la operación faltante:
-- marcar una cuota como pagada y avanzar el plan a 'cumplido' al saldarse todas.
begin;

create or replace function public.mark_arrangement_installment_paid(
  p_arrangement_id uuid,p_installment_no int,p_paid_amount numeric default null,
  p_payment_id uuid default null
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  a payment_arrangements; ins arrangement_installments;
  paid numeric; total_paid numeric; open_count int; remaining numeric;
begin
  if not has_permission('obligations.manage') then raise exception 'FORBIDDEN'; end if;
  if coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'MFA_REQUIRED'; end if;

  select * into a from payment_arrangements
   where id=p_arrangement_id and organization_id=current_organization_id() for update;
  if a.id is null then raise exception 'NOT_FOUND'; end if;
  if a.status='cumplido' or a.status='cancelado' then raise exception 'ARRANGEMENT_CLOSED'; end if;

  select * into ins from arrangement_installments
   where arrangement_id=p_arrangement_id and installment_no=p_installment_no for update;
  if ins.id is null then raise exception 'INSTALLMENT_NOT_FOUND'; end if;
  if ins.status='pagada' then raise exception 'ALREADY_PAID'; end if;

  remaining:=ins.amount-ins.paid_amount;
  paid:=coalesce(p_paid_amount,remaining);
  if paid<=0 then raise exception 'INVALID_AMOUNT'; end if;
  if paid>remaining then raise exception 'AMOUNT_EXCEEDS_REMAINING'; end if;

  update arrangement_installments
     set paid_amount=ins.paid_amount+paid,
         paid_at=case when ins.paid_amount+paid>=ins.amount then now() else ins.paid_at end,
         payment_id=coalesce(p_payment_id,ins.payment_id),
         status=case when ins.paid_amount+paid>=ins.amount then 'pagada' else ins.status end
   where id=ins.id;

  select coalesce(sum(amount),0) into total_paid from arrangement_installments
   where arrangement_id=p_arrangement_id and status='pagada';
  select count(*) into open_count from arrangement_installments
   where arrangement_id=p_arrangement_id and status<>'pagada';

  if open_count=0 then
    update payment_arrangements set status='cumplido',updated_at=now() where id=p_arrangement_id;
  else
    update payment_arrangements set updated_at=now() where id=p_arrangement_id;
  end if;

  perform write_audit_event('payment_arrangement.installment','arrangement_installments',
    ins.id::text,null,
    jsonb_build_object('arrangement_id',p_arrangement_id,'installment_no',p_installment_no,
      'paid_amount',paid,'paid_to_date',ins.paid_amount+paid,'total_paid',total_paid,
      'remaining_open',open_count),
    'Cuota del plan de pago registrada');

  return jsonb_build_object('arrangement_id',p_arrangement_id,
    'installment_no',p_installment_no,'paid_amount',paid,
    'installment_status',case when ins.paid_amount+paid>=ins.amount then 'pagada' else ins.status end,
    'arrangement_status',case when open_count=0 then 'cumplido' else a.status end);
end$$;

grant execute on function public.mark_arrangement_installment_paid(uuid,int,numeric,uuid) to authenticated;

commit;
