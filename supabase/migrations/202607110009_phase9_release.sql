begin;
create index if not exists payments_org_created_idx on payments(organization_id,created_at desc);
create index if not exists ledger_org_date_idx on ledger_entries(organization_id,entry_date desc);
create index if not exists expenses_org_status_idx on expenses(organization_id,status,created_at desc);
create index if not exists work_orders_org_status_idx on work_orders(organization_id,status,created_at desc);
create index if not exists obligations_org_due_idx on obligations(organization_id,due_date) where cancelled_at is null;
create table public.system_health_checks(id uuid primary key default gen_random_uuid(),organization_id uuid not null references organizations(id) on delete cascade,check_key text not null,status text not null check(status in('passed','failed','pending')),details jsonb not null default '{}',checked_at timestamptz not null default now(),checked_by uuid references profiles(id));
alter table system_health_checks enable row level security;create policy health_read on system_health_checks for select using(organization_id=current_organization_id() and has_permission('audit.read'));revoke insert,update,delete on system_health_checks from authenticated;
commit;
