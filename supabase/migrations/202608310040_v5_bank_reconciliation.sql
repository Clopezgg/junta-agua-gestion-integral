-- V5-FASE7 · Bancos y conciliación: movimientos bancarios, conciliación y saldos.
begin;

create type public.bank_txn_type as enum('debito','credito');
create type public.recon_status as enum('pendiente','conciliado','descartado');

create table public.bank_statements(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  bank_account_id uuid not null references bank_accounts(id),
  period_start date not null,
  period_end date not null,
  opening_balance numeric(14,2) not null default 0,
  closing_balance numeric(14,2) not null default 0,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid not null references profiles(id),
  imported boolean not null default false
);
create index bank_statements_org_acct on bank_statements(organization_id,bank_account_id);

create table public.bank_transactions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  bank_account_id uuid not null references bank_accounts(id),
  statement_id uuid references bank_statements(id),
  txn_date date not null,
  txn_type bank_txn_type not null,
  amount numeric(14,2) not null check(amount>0),
  description text,
  reference text,
  recon_status recon_status not null default 'pendiente',
  linked_payment_id uuid references payments(id),
  linked_expense_id uuid references expenses(id),
  created_at timestamptz not null default now(),
  unique(organization_id,bank_account_id,reference) 
);
create index bank_transactions_org_status on bank_transactions(organization_id,recon_status);

create or replace function public.import_bank_statement(p_bank_account_id uuid,p_period_start date,p_period_end date,p_opening numeric,p_closing numeric,p_transactions jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();sid uuid;t jsonb;
begin
  if not has_permission('bank.manage') then raise exception 'FORBIDDEN';end if;
  insert into bank_statements(organization_id,bank_account_id,period_start,period_end,opening_balance,closing_balance,uploaded_by,imported)
  values(org,p_bank_account_id,p_period_start,p_period_end,p_opening,p_closing,auth.uid(),true) returning id into sid;
  for t in select * from jsonb_array_elements(p_transactions) loop
    insert into bank_transactions(organization_id,bank_account_id,statement_id,txn_date,txn_type,amount,description,reference)
    values(org,p_bank_account_id,sid,(t->>'txn_date')::date,(t->>'txn_type')::bank_txn_type,(t->>'amount')::numeric,t->>'description',t->>'reference');
  end loop;
  perform write_audit_event('create','bank_statement',sid::text,null,jsonb_build_object('account',p_bank_account_id),'Importe de estado de cuenta');
  return sid;
end$$;

create or replace function public.link_bank_transaction(p_transaction_id uuid,p_kind text,p_source_id uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not has_permission('bank.manage') then raise exception 'FORBIDDEN';end if;
  if p_kind='payment' then
    update bank_transactions set linked_payment_id=p_source_id,recon_status='conciliado' where id=p_transaction_id and organization_id=current_organization_id();
  elsif p_kind='expense' then
    update bank_transactions set linked_expense_id=p_source_id,recon_status='conciliado' where id=p_transaction_id and organization_id=current_organization_id();
  else raise exception 'INVALID_KIND';end if;
end$$;

create or replace function public.list_bank_transactions(p_status text default 'pendiente',p_bank_account_id uuid default null) returns setof bank_transactions
language sql stable security definer set search_path=public as $$
select * from bank_transactions where organization_id=current_organization_id() and has_permission('finance.read') and (p_status is null or recon_status=(p_status)::recon_status) and (p_bank_account_id is null or bank_account_id=p_bank_account_id) order by txn_date desc$$;

alter table public.bank_statements enable row level security;
alter table public.bank_transactions enable row level security;
create policy bank_statements_read on bank_statements for select using(organization_id=current_organization_id() and has_permission('finance.read'));
create policy bank_transactions_read on bank_transactions for select using(organization_id=current_organization_id() and has_permission('finance.read'));
revoke insert,update,delete on bank_statements,bank_transactions from authenticated;

commit;
