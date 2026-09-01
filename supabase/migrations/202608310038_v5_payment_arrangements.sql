-- V5-FASE4 · Morosidad y convenios: planes de pago / convenios con cuotas.
begin;

create type public.arrangement_status as enum('activo','cumplido','incumplido','cancelado');
create type public.frequency_enum as enum('semanal','quincenal','mensual');

create table public.payment_arrangements(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  code text not null,
  abonado_id uuid references abonados(id),
  subscriber_id uuid not null references subscribers(id),
  status arrangement_status not null default 'activo',
  frequency frequency_enum not null default 'mensual',
  total_debt numeric(14,2) not null check(total_debt>=0),
  installment_amount numeric(14,2) not null check(installment_amount>0),
  num_installments int not null check(num_installments>=1 and num_installments<=120),
  first_due_date date not null,
  notes text,
  approved_by uuid not null references profiles(id),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);

-- Un convenio es sobre obligaciones específicas.
create table public.arrangement_obligations(
  organization_id uuid not null references organizations(id),
  arrangement_id uuid not null references payment_arrangements(id) on delete cascade,
  obligation_id uuid not null references obligations(id),
  original_amount numeric(14,2) not null,
  primary key(arrangement_id,obligation_id)
);

-- Cuotas del convenio (plan de pago).
create table public.arrangement_installments(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  arrangement_id uuid not null references payment_arrangements(id) on delete cascade,
  installment_no int not null,
  due_date date not null,
  amount numeric(14,2) not null check(amount>0),
  paid_amount numeric(14,2) not null default 0 check(paid_amount>=0),
  paid_at timestamptz,
  payment_id uuid references payments(id),
  status text not null default 'pendiente' check(status in('pendiente','pagada','atrasada')),
  created_at timestamptz not null default now(),
  unique(arrangement_id,installment_no)
);

create or replace function public.create_payment_arrangement(p_subscriber_id uuid,p_total_debt numeric,p_installment_amount numeric,p_frequency text,p_first_due_date date,p_obligation_ids uuid[],p_notes text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();aid uuid;n int;numb int;d date;amt numeric;i int;
begin
  if not has_permission('obligations.manage') then raise exception 'FORBIDDEN';end if;
  if auth.jwt()->>'aal'<>'aal2' then raise exception 'MFA_REQUIRED';end if;
  if p_installment_amount<=0 or p_total_debt<=0 then raise exception 'INVALID_AMOUNTS';end if;
  numb:=ceil(p_total_debt/p_installment_amount);
  select count(*)+1 into n from payment_arrangements where organization_id=org;
  insert into payment_arrangements(organization_id,code,subscriber_id,status,frequency,total_debt,installment_amount,num_installments,first_due_date,notes,approved_by,created_by)
  values(org,'CONV-'||lpad(n::text,4,'0'),p_subscriber_id,'activo',(p_frequency)::frequency_enum,p_total_debt,p_installment_amount,numb,p_first_due_date,p_notes,auth.uid(),auth.uid()) returning id into aid;
  foreach i in array p_obligation_ids loop
    insert into arrangement_obligations(organization_id,arrangement_id,obligation_id,original_amount)
    select org,aid,i,o.original_amount from obligations o where o.id=i and o.organization_id=org
    on conflict do nothing;
  end loop;
  d:=p_first_due_date;i:=1;
  while i<=numb loop
    amt:=case when i=numb then p_total_debt-((i-1)*p_installment_amount) else p_installment_amount end;
    insert into arrangement_installments(organization_id,arrangement_id,installment_no,due_date,amount) values(org,aid,i,d,amt);
    i:=i+1;d:=d+case p_frequency when 'semanal' then interval '7 days' when 'quincenal' then interval '15 days' else interval '1 month' end;
  end loop;
  perform write_audit_event('create','payment_arrangement',aid::text,null,jsonb_build_object('code','CONV-'||lpad(n::text,4,'0'),'num',numb),'Nuevo convenio de pago');
  return aid;
end$$;

create or replace function public.list_payment_arrangements(p_status text default null) returns setof payment_arrangements
language sql stable security definer set search_path=public as $$
select * from payment_arrangements where organization_id=current_organization_id() and has_permission('obligations.read') and (p_status is null or status=(p_status)::arrangement_status) order by created_at desc$$;

create or replace function public.get_arrangement_detail(p_arrangement_id uuid) returns jsonb
language sql stable security definer set search_path=public as $$
select jsonb_build_object('arrangement',to_jsonb(a),
  'obligations',coalesce((select jsonb_agg(to_jsonb(ao)) from arrangement_obligations ao where ao.arrangement_id=a.id),'[]'::jsonb),
  'installments',coalesce((select jsonb_agg(to_jsonb(ai) order by ai.installment_no) from arrangement_installments ai where ai.arrangement_id=a.id),'[]'::jsonb))
from payment_arrangements a where a.id=p_arrangement_id and a.organization_id=current_organization_id() and has_permission('obligations.read')$$;

alter table public.payment_arrangements enable row level security;
alter table public.arrangement_obligations enable row level security;
alter table public.arrangement_installments enable row level security;
create policy arrangements_read on payment_arrangements for select using(organization_id=current_organization_id() and has_permission('obligations.read'));
create policy arrangement_obligations_read on arrangement_obligations for select using(organization_id=current_organization_id() and has_permission('obligations.read'));
create policy arrangement_installments_read on arrangement_installments for select using(organization_id=current_organization_id() and has_permission('obligations.read'));
revoke insert,update,delete on payment_arrangements,arrangement_obligations,arrangement_installments from authenticated;

commit;
