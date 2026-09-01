-- V5-FASE7+ · Bancos y conciliación: resolución, saldos y gestión de conciliación.
-- Amplía la conciliación bancaria con acciones que el backend base (040) no ofrecía:
-- descartar una partida, desvincularla y calcular el saldo conciliable por cuenta.
begin;

create or replace function public.discard_bank_transaction(p_transaction_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare old bank_transactions; r bank_transactions;
begin
 if not has_permission('bank.manage') then raise exception 'FORBIDDEN'; end if;
 select * into old from bank_transactions where id=p_transaction_id and organization_id=current_organization_id() for update;
 if old.id is null then raise exception 'NOT_FOUND'; end if;
 update bank_transactions set recon_status='descartado',linked_payment_id=null,linked_expense_id=null where id=p_transaction_id returning * into r;
 perform write_audit_event('bank.discard','bank_transactions',r.id::text,to_jsonb(old),to_jsonb(r),null);
 return to_jsonb(r);
end$$;

create or replace function public.unlink_bank_transaction(p_transaction_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare old bank_transactions; r bank_transactions;
begin
 if not has_permission('bank.manage') then raise exception 'FORBIDDEN'; end if;
 select * into old from bank_transactions where id=p_transaction_id and organization_id=current_organization_id() for update;
 if old.id is null then raise exception 'NOT_FOUND'; end if;
 update bank_transactions set recon_status='pendiente',linked_payment_id=null,linked_expense_id=null where id=p_transaction_id returning * into r;
 perform write_audit_event('bank.unlink','bank_transactions',r.id::text,to_jsonb(old),to_jsonb(r),null);
 return to_jsonb(r);
end$$;

create or replace function public.get_bank_account_balance(p_bank_account_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object('account_id',a.id,'opening_balance',a.opening_balance,
 'debits',coalesce(sum(case when t.txn_type='debito' then t.amount end),0),
 'credits',coalesce(sum(case when t.txn_type='credito' then t.amount end),0),
 'linked',coalesce(sum(case when t.recon_status='conciliado' then t.amount end),0),
 'pending',coalesce(sum(case when t.recon_status='pendiente' then t.amount end),0))
 from bank_accounts a
 left join bank_transactions t on t.bank_account_id=a.id and t.organization_id=a.organization_id
 where a.id=p_bank_account_id and a.organization_id=current_organization_id() and has_permission('finance.read')
 group by a.id,a.opening_balance$$;

grant execute on function public.discard_bank_transaction(uuid) to authenticated;
grant execute on function public.unlink_bank_transaction(uuid) to authenticated;
grant execute on function public.get_bank_account_balance(uuid) to authenticated;

commit;
