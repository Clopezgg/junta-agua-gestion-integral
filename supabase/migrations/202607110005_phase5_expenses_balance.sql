begin;
create type public.expense_status as enum('requested','approved','rejected','confirmed','voided');
create table public.suppliers(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations(id) on delete cascade,name text not null,tax_id text,phone text,active boolean not null default true,unique(organization_id,name));
create table public.expenses(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations(id) on delete cascade,description text not null,reason text not null,category text not null,supplier text,amount numeric(14,2) not null check(amount>0),status expense_status not null default 'requested',invoice_number text,invoice_path text,paid_from text,requested_by uuid not null references profiles(id),approved_by uuid references profiles(id),confirmed_by uuid references profiles(id),created_at timestamptz not null default now(),approved_at timestamptz,confirmed_at timestamptz);
create table public.bank_accounts(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations(id) on delete cascade,name text not null,account_mask text,currency text not null default 'HNL',opening_balance numeric(14,2) not null default 0,active boolean not null default true,unique(organization_id,name));
create table public.ledger_entries(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations(id) on delete cascade,entry_date timestamptz not null default now(),entry_type text not null check(entry_type in('income','expense','refund','adjustment')),source_type text not null,source_id uuid not null,amount numeric(14,2) not null,account text not null,description text not null,created_by uuid not null references profiles(id),unique(source_type,source_id,entry_type));
insert into permissions(code,description) values('expenses.read','Consultar gastos'),('expenses.create','Solicitar gastos'),('expenses.approve','Aprobar gastos'),('expenses.confirm','Comprobar gastos'),('finance.read','Consultar balance'),('bank.manage','Administrar bancos') on conflict(code) do update set description=excluded.description;
insert into role_permissions(role_id,permission_code) select r.id,p.code from roles r cross join permissions p where r.code='superadmin' and p.code in('expenses.read','expenses.create','expenses.approve','expenses.confirm','finance.read','bank.manage') on conflict do nothing;
alter table expenses enable row level security;alter table suppliers enable row level security;alter table bank_accounts enable row level security;alter table ledger_entries enable row level security;
create policy expense_read on expenses for select using(organization_id=current_organization_id() and has_permission('expenses.read'));create policy ledger_read on ledger_entries for select using(organization_id=current_organization_id() and has_permission('finance.read'));create policy supplier_read on suppliers for select using(organization_id=current_organization_id() and has_permission('expenses.read'));create policy bank_read on bank_accounts for select using(organization_id=current_organization_id() and has_permission('finance.read'));
revoke insert,update,delete on expenses,ledger_entries,suppliers,bank_accounts from authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('expense-evidence','expense-evidence',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do nothing;
create policy expense_files_read on storage.objects for select using(bucket_id='expense-evidence' and has_permission('expenses.read'));
create policy expense_files_insert on storage.objects for insert with check(bucket_id='expense-evidence' and has_permission('expenses.confirm') and (storage.foldername(name))[1]=current_organization_id()::text);

create or replace function public.create_expense_request(p_payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$declare r expenses;begin
 if not has_permission('expenses.create') then raise exception 'FORBIDDEN';end if;
 if length(trim(coalesce(p_payload->>'description','')))<3 or (p_payload->>'amount')::numeric<=0 then raise exception 'INVALID_EXPENSE';end if;
 insert into expenses(organization_id,description,reason,category,supplier,amount,requested_by) values(current_organization_id(),trim(p_payload->>'description'),trim(coalesce(nullif(p_payload->>'reason',''),p_payload->>'description')),trim(p_payload->>'category'),nullif(trim(p_payload->>'supplier'),''),(p_payload->>'amount')::numeric,auth.uid()) returning * into r;
 perform write_audit_event('expense.request','expenses',r.id::text,null,to_jsonb(r),null);return to_jsonb(r);end$$;
create or replace function public.approve_expense(p_expense_id uuid,p_decision text,p_notes text default null) returns jsonb language plpgsql security definer set search_path=public as $$declare old expenses;r expenses;begin
 if not has_permission('expenses.approve') or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then raise exception 'FORBIDDEN_OR_MFA';end if;
 select * into old from expenses where id=p_expense_id and organization_id=current_organization_id() and status='requested' for update;
 if old.id is null then raise exception 'INVALID_STATUS';end if;if old.requested_by=auth.uid() then raise exception 'SELF_APPROVAL_FORBIDDEN';end if;if p_decision not in('approved','rejected') then raise exception 'INVALID_DECISION';end if;
 update expenses set status=p_decision::expense_status,approved_by=auth.uid(),approved_at=now() where id=old.id returning * into r;
 perform write_audit_event('expense.'||p_decision,'expenses',r.id::text,to_jsonb(old),to_jsonb(r),p_notes);return to_jsonb(r);end$$;
create or replace function public.confirm_expense(p_expense_id uuid,p_invoice_path text,p_invoice_number text,p_paid_from text) returns jsonb language plpgsql security definer set search_path=public as $$declare old expenses;r expenses;begin
 if not has_permission('expenses.confirm') or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then raise exception 'FORBIDDEN_OR_MFA';end if;
 if coalesce(trim(p_invoice_path),'')='' or coalesce(trim(p_invoice_number),'')='' or coalesce(trim(p_paid_from),'')='' then raise exception 'INVOICE_REQUIRED';end if;
 select * into old from expenses where id=p_expense_id and organization_id=current_organization_id() and status='approved' for update;if old.id is null then raise exception 'NOT_APPROVED';end if;
 update expenses set status='confirmed',invoice_path=p_invoice_path,invoice_number=p_invoice_number,paid_from=p_paid_from,confirmed_by=auth.uid(),confirmed_at=now() where id=old.id returning * into r;
 insert into ledger_entries(organization_id,entry_type,source_type,source_id,amount,account,description,created_by) values(current_organization_id(),'expense','expense',r.id,-r.amount,p_paid_from,r.description,auth.uid());
 perform write_audit_event('expense.confirm','expenses',r.id::text,to_jsonb(old),to_jsonb(r),null);return to_jsonb(r);end$$;
create or replace function public.list_expenses() returns setof jsonb language sql stable security definer set search_path=public as $$select to_jsonb(e) from expenses e where e.organization_id=current_organization_id() and has_permission('expenses.read') order by e.created_at desc$$;
create or replace function public.ledger_payment_trigger() returns trigger language plpgsql security definer set search_path=public as $$begin if new.status='confirmed' then insert into ledger_entries(organization_id,entry_type,source_type,source_id,amount,account,description,created_by) values(new.organization_id,'income','payment',new.id,new.total,new.method::text,'Pago '||new.receipt_number,new.created_by) on conflict do nothing;end if;return new;end$$;
create trigger payments_to_ledger after insert on payments for each row execute function ledger_payment_trigger();
create or replace function public.ledger_payment_event_trigger() returns trigger language plpgsql security definer set search_path=public as $$
declare p payments;
begin
 select * into p from payments where id=new.payment_id;
 if new.event_type='refund' then
  insert into ledger_entries(organization_id,entry_type,source_type,source_id,amount,account,description,created_by) values(new.organization_id,'refund','payment_event',new.id,-new.amount,p.method::text,'Devolución de '||p.receipt_number,new.created_by);
 elsif new.event_type='void' then
  insert into ledger_entries(organization_id,entry_type,source_type,source_id,amount,account,description,created_by) values(new.organization_id,'adjustment','payment_event',new.id,-p.total,p.method::text,'Anulación de '||p.receipt_number,new.created_by);
 end if;
 return new;
end$$;
create trigger payment_events_to_ledger after insert on payment_events for each row execute function ledger_payment_event_trigger();
commit;
