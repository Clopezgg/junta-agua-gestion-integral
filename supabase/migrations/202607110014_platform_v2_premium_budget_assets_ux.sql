begin;

alter table public.organizations
  add column if not exists signature_path text,
  add column if not exists stamp_path text,
  add column if not exists receipt_signatory_name text,
  add column if not exists receipt_signatory_title text,
  add column if not exists receipt_template_version text not null default '2.0';

alter table public.payments
  add column if not exists receipt_brand_snapshot jsonb;

insert into public.permissions(code,description) values
  ('budget.read','Consultar presupuesto y ejecución'),
  ('budget.manage','Administrar y aprobar presupuesto'),
  ('assets.read','Consultar activos e infraestructura'),
  ('assets.manage','Administrar activos e infraestructura'),
  ('maintenance.manage','Administrar mantenimiento preventivo')
on conflict(code) do update set description=excluded.description;

insert into public.role_permissions(role_id,permission_code)
select r.id,p.code
from public.roles r
cross join public.permissions p
where
  (r.code='superadmin' and p.code in('budget.read','budget.manage','assets.read','assets.manage','maintenance.manage')) or
  (r.code='admin' and p.code in('budget.read','budget.manage','assets.read','assets.manage','maintenance.manage')) or
  (r.code='treasurer' and p.code in('budget.read','budget.manage','assets.read')) or
  (r.code='auditor' and p.code in('budget.read','assets.read')) or
  (r.code='member' and p.code in('budget.read','assets.read')) or
  (r.code='secretary' and p.code in('budget.read','assets.read')) or
  (r.code='technician' and p.code in('assets.read','assets.manage','maintenance.manage'))
on conflict do nothing;

create table if not exists public.fiscal_periods(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  fiscal_year int not null check(fiscal_year between 2000 and 2100),
  status text not null default 'draft' check(status in('draft','approved','closed')),
  opening_cash numeric(14,2) not null default 0 check(opening_cash>=0),
  opening_bank numeric(14,2) not null default 0 check(opening_bank>=0),
  reserve_target numeric(14,2) not null default 0 check(reserve_target>=0),
  notes text,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,fiscal_year)
);

create table if not exists public.budget_categories(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  category_type text not null check(category_type in('income','expense','reserve')),
  match_pattern text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(organization_id,code)
);

create table if not exists public.budget_lines(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  fiscal_period_id uuid not null references public.fiscal_periods(id) on delete cascade,
  category_id uuid not null references public.budget_categories(id),
  budget_amount numeric(14,2) not null check(budget_amount>=0),
  notes text,
  created_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique(fiscal_period_id,category_id)
);

create table if not exists public.assets(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  asset_type text not null check(asset_type in('pozo','tanque','bomba','motor','tuberia','valvula','medidor','macromedidor','clorador','edificio','vehiculo','herramienta','otro')),
  status text not null default 'active' check(status in('active','inactive','maintenance','retired')),
  condition text not null default 'good' check(condition in('excellent','good','fair','poor','critical')),
  criticality text not null default 'medium' check(criticality in('low','medium','high','critical')),
  sector text,
  address text,
  latitude numeric(10,7) check(latitude between -90 and 90),
  longitude numeric(10,7) check(longitude between -180 and 180),
  installed_at date,
  expected_life_years int check(expected_life_years is null or expected_life_years>0),
  replacement_cost numeric(14,2) not null default 0 check(replacement_cost>=0),
  serial_number text,
  notes text,
  photo_path text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);

create table if not exists public.maintenance_plans(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  name text not null,
  frequency_days int not null check(frequency_days between 1 and 3650),
  next_due_date date not null,
  estimated_cost numeric(14,2) not null default 0 check(estimated_cost>=0),
  checklist text,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.asset_maintenance_log(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  work_order_id uuid references public.work_orders(id),
  maintenance_plan_id uuid references public.maintenance_plans(id),
  event_date timestamptz not null default now(),
  event_type text not null check(event_type in('preventive','corrective','inspection','replacement')),
  description text not null,
  cost numeric(14,2) not null default 0 check(cost>=0),
  condition_after text check(condition_after is null or condition_after in('excellent','good','fair','poor','critical')),
  performed_by uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.work_orders
  add column if not exists asset_id uuid references public.assets(id),
  add column if not exists maintenance_plan_id uuid references public.maintenance_plans(id),
  add column if not exists due_date date,
  add column if not exists estimated_cost numeric(14,2) not null default 0 check(estimated_cost>=0),
  add column if not exists actual_cost numeric(14,2) not null default 0 check(actual_cost>=0);

alter table public.fiscal_periods enable row level security;
alter table public.budget_categories enable row level security;
alter table public.budget_lines enable row level security;
alter table public.assets enable row level security;
alter table public.maintenance_plans enable row level security;
alter table public.asset_maintenance_log enable row level security;

create policy fiscal_periods_read on public.fiscal_periods
for select using(organization_id=public.current_organization_id() and public.has_permission('budget.read'));
create policy budget_categories_read on public.budget_categories
for select using(organization_id=public.current_organization_id() and public.has_permission('budget.read'));
create policy budget_lines_read on public.budget_lines
for select using(organization_id=public.current_organization_id() and public.has_permission('budget.read'));
create policy assets_read on public.assets
for select using(organization_id=public.current_organization_id() and public.has_permission('assets.read'));
create policy maintenance_plans_read on public.maintenance_plans
for select using(organization_id=public.current_organization_id() and public.has_permission('assets.read'));
create policy asset_maintenance_log_read on public.asset_maintenance_log
for select using(organization_id=public.current_organization_id() and public.has_permission('assets.read'));

revoke insert,update,delete on public.fiscal_periods,public.budget_categories,public.budget_lines,public.assets,public.maintenance_plans,public.asset_maintenance_log from authenticated;

create index if not exists fiscal_periods_org_year_idx on public.fiscal_periods(organization_id,fiscal_year desc);
create index if not exists budget_lines_period_idx on public.budget_lines(fiscal_period_id);
create index if not exists assets_org_type_status_idx on public.assets(organization_id,asset_type,status);
create index if not exists assets_gis_idx on public.assets(organization_id,sector) where latitude is not null and longitude is not null;
create index if not exists maintenance_due_idx on public.maintenance_plans(organization_id,next_due_date) where active;
create index if not exists work_orders_asset_idx on public.work_orders(organization_id,asset_id,status);

create or replace function public.get_organization_settings()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',o.id,
    'name',o.name,
    'address',o.address,
    'phone',o.phone,
    'email',o.email,
    'rtn',o.rtn,
    'logo_path',o.logo_path,
    'signature_path',o.signature_path,
    'stamp_path',o.stamp_path,
    'receipt_signatory_name',o.receipt_signatory_name,
    'receipt_signatory_title',o.receipt_signatory_title,
    'receipt_template_version',o.receipt_template_version,
    'receipt_footer',o.receipt_footer,
    'currency',o.currency
  )
  from public.organizations o
  where o.id=public.current_organization_id()
    and (
      public.has_permission('settings.read')
      or public.has_permission('settings.manage')
      or public.has_permission('payments.read')
    )
$$;

create or replace function public.update_organization_settings(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  old_row public.organizations%rowtype;
  new_row public.organizations%rowtype;
begin
  if not public.has_permission('settings.manage')
     or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;

  select * into old_row
  from public.organizations
  where id=public.current_organization_id()
  for update;

  update public.organizations set
    name=coalesce(nullif(trim(p_payload->>'name'),''),name),
    address=nullif(trim(p_payload->>'address'),''),
    phone=nullif(trim(p_payload->>'phone'),''),
    email=nullif(trim(p_payload->>'email'),''),
    rtn=nullif(trim(p_payload->>'rtn'),''),
    logo_path=nullif(trim(p_payload->>'logo_path'),''),
    signature_path=nullif(trim(p_payload->>'signature_path'),''),
    stamp_path=nullif(trim(p_payload->>'stamp_path'),''),
    receipt_signatory_name=nullif(trim(p_payload->>'receipt_signatory_name'),''),
    receipt_signatory_title=nullif(trim(p_payload->>'receipt_signatory_title'),''),
    receipt_template_version=coalesce(nullif(trim(p_payload->>'receipt_template_version'),''),'2.0'),
    receipt_footer=nullif(trim(p_payload->>'receipt_footer'),''),
    currency=coalesce(nullif(trim(p_payload->>'currency'),''),'HNL')
  where id=old_row.id
  returning * into new_row;

  perform public.write_audit_event(
    'organization.settings.update',
    'organizations',
    new_row.id::text,
    to_jsonb(old_row),
    to_jsonb(new_row),
    null
  );

  return to_jsonb(new_row);
end
$$;

create or replace function public.attach_payment_receipt_v2(
  p_payment_id uuid,
  p_storage_path text,
  p_brand_snapshot jsonb
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  old_row public.payments%rowtype;
begin
  if not public.has_permission('payments.create') then
    raise exception 'FORBIDDEN';
  end if;

  if coalesce(trim(p_storage_path),'')='' then
    raise exception 'PATH_REQUIRED';
  end if;

  select * into old_row
  from public.payments
  where id=p_payment_id
    and organization_id=public.current_organization_id()
  for update;

  if old_row.id is null then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  update public.payments
  set receipt_path=p_storage_path,
      receipt_brand_snapshot=coalesce(p_brand_snapshot,'{}'::jsonb)
  where id=old_row.id;

  perform public.write_audit_event(
    'payment.receipt.attach',
    'payments',
    old_row.id::text,
    to_jsonb(old_row),
    jsonb_build_object(
      'receipt_path',p_storage_path,
      'template_version',coalesce(p_brand_snapshot->>'templateVersion','2.0')
    ),
    null
  );
end
$$;

create or replace function public.get_payment_receipt_data(p_payment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  result jsonb;
begin
  if not public.has_permission('payments.read') then
    raise exception 'FORBIDDEN';
  end if;

  select jsonb_build_object(
    'id',p.id,
    'receipt_number',p.receipt_number,
    'created_at',p.created_at,
    'total',p.total,
    'received_amount',p.received_amount,
    'change_amount',p.change_amount,
    'method',p.method,
    'status',p.status,
    'verification_token',p.verification_token,
    'subscriber_name',s.full_name,
    'subscriber_code',s.code,
    'brand_snapshot',p.receipt_brand_snapshot,
    'items',(
      select coalesce(
        jsonb_agg(
          jsonb_build_object('description',o.description,'amount',pa.amount)
          order by o.due_date
        ),
        '[]'::jsonb
      )
      from public.payment_allocations pa
      join public.obligations o on o.id=pa.obligation_id
      where pa.payment_id=p.id
    ),
    'components',(
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'method',c.method,
            'amount',c.amount,
            'reference',c.reference
          )
        ),
        '[]'::jsonb
      )
      from public.payment_components c
      where c.payment_id=p.id
    )
  ) into result
  from public.payments p
  join public.subscribers s on s.id=p.subscriber_id
  where p.id=p_payment_id
    and p.organization_id=public.current_organization_id();

  if result is null then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  return result;
end
$$;

create or replace function public.save_fiscal_period(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  period_row public.fiscal_periods%rowtype;
  old_row public.fiscal_periods%rowtype;
  year_value int;
  cash_value numeric;
  bank_value numeric;
  reserve_value numeric;
begin
  if not public.has_permission('budget.manage')
     or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;

  year_value:=(p_payload->>'fiscal_year')::int;
  cash_value:=coalesce((p_payload->>'opening_cash')::numeric,0);
  bank_value:=coalesce((p_payload->>'opening_bank')::numeric,0);
  reserve_value:=coalesce((p_payload->>'reserve_target')::numeric,0);

  if year_value<2000 or year_value>2100
     or cash_value<0 or bank_value<0 or reserve_value<0 then
    raise exception 'INVALID_FISCAL_PERIOD';
  end if;

  select * into old_row
  from public.fiscal_periods
  where organization_id=public.current_organization_id()
    and fiscal_year=year_value
  for update;

  if old_row.id is not null and old_row.status='closed' then
    raise exception 'FISCAL_PERIOD_CLOSED';
  end if;

  insert into public.fiscal_periods(
    organization_id,fiscal_year,opening_cash,opening_bank,
    reserve_target,notes,created_by
  ) values(
    public.current_organization_id(),
    year_value,
    cash_value,
    bank_value,
    reserve_value,
    nullif(trim(p_payload->>'notes'),''),
    auth.uid()
  )
  on conflict(organization_id,fiscal_year) do update set
    opening_cash=excluded.opening_cash,
    opening_bank=excluded.opening_bank,
    reserve_target=excluded.reserve_target,
    notes=excluded.notes,
    updated_at=now()
  returning * into period_row;

  perform public.write_audit_event(
    'budget.period.save',
    'fiscal_periods',
    period_row.id::text,
    case when old_row.id is null then null else to_jsonb(old_row) end,
    to_jsonb(period_row),
    null
  );

  return to_jsonb(period_row);
end
$$;

create or replace function public.save_budget_line(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  period_row public.fiscal_periods%rowtype;
  category_row public.budget_categories%rowtype;
  line_row public.budget_lines%rowtype;
  code_value text;
  type_value text;
  amount_value numeric;
begin
  if not public.has_permission('budget.manage') then
    raise exception 'FORBIDDEN';
  end if;

  select * into period_row
  from public.fiscal_periods
  where id=(p_payload->>'fiscal_period_id')::uuid
    and organization_id=public.current_organization_id()
  for update;

  if period_row.id is null or period_row.status='closed' then
    raise exception 'INVALID_FISCAL_PERIOD';
  end if;

  code_value:=upper(regexp_replace(trim(p_payload->>'code'),'[^A-Za-z0-9]+','_','g'));
  type_value:=trim(p_payload->>'category_type');
  amount_value:=(p_payload->>'budget_amount')::numeric;

  if length(code_value)<2
     or length(trim(coalesce(p_payload->>'name','')))<2
     or type_value not in('income','expense','reserve')
     or amount_value<0 then
    raise exception 'INVALID_BUDGET_LINE';
  end if;

  insert into public.budget_categories(
    organization_id,code,name,category_type,match_pattern
  ) values(
    public.current_organization_id(),
    code_value,
    trim(p_payload->>'name'),
    type_value,
    nullif(trim(p_payload->>'match_pattern'),'')
  )
  on conflict(organization_id,code) do update set
    name=excluded.name,
    category_type=excluded.category_type,
    match_pattern=excluded.match_pattern,
    active=true
  returning * into category_row;

  insert into public.budget_lines(
    organization_id,fiscal_period_id,category_id,budget_amount,notes,created_by
  ) values(
    public.current_organization_id(),
    period_row.id,
    category_row.id,
    amount_value,
    nullif(trim(p_payload->>'notes'),''),
    auth.uid()
  )
  on conflict(fiscal_period_id,category_id) do update set
    budget_amount=excluded.budget_amount,
    notes=excluded.notes,
    updated_at=now()
  returning * into line_row;

  perform public.write_audit_event(
    'budget.line.save',
    'budget_lines',
    line_row.id::text,
    null,
    to_jsonb(line_row)||jsonb_build_object(
      'code',category_row.code,
      'name',category_row.name,
      'category_type',category_row.category_type
    ),
    null
  );

  return to_jsonb(line_row);
end
$$;

create or replace function public.approve_budget(p_fiscal_year int)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  period_row public.fiscal_periods%rowtype;
begin
  if not public.has_permission('budget.manage')
     or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;

  update public.fiscal_periods
  set status='approved',
      approved_by=auth.uid(),
      approved_at=now(),
      updated_at=now()
  where organization_id=public.current_organization_id()
    and fiscal_year=p_fiscal_year
    and status='draft'
  returning * into period_row;

  if period_row.id is null then
    raise exception 'DRAFT_BUDGET_NOT_FOUND';
  end if;

  if not exists(
    select 1 from public.budget_lines
    where fiscal_period_id=period_row.id
  ) then
    raise exception 'BUDGET_LINES_REQUIRED';
  end if;

  perform public.write_audit_event(
    'budget.approve',
    'fiscal_periods',
    period_row.id::text,
    null,
    to_jsonb(period_row),
    'Presupuesto aprobado con MFA'
  );

  return to_jsonb(period_row);
end
$$;

create or replace function public.get_budget_dashboard(p_fiscal_year int)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  result jsonb;
begin
  if not public.has_permission('budget.read') then
    raise exception 'FORBIDDEN';
  end if;

  with selected_period as (
    select *
    from public.fiscal_periods
    where organization_id=public.current_organization_id()
      and fiscal_year=p_fiscal_year
    limit 1
  ),
  line_actuals as (
    select
      bl.id,
      bc.code,
      bc.name,
      bc.category_type,
      bc.match_pattern,
      bl.budget_amount,
      bl.notes,
      case
        when bc.category_type='income' then coalesce((
          select sum(le.amount)
          from public.ledger_entries le
          where le.organization_id=public.current_organization_id()
            and extract(year from le.entry_date)=p_fiscal_year
            and le.entry_type='income'
            and (
              bc.match_pattern is null
              or concat_ws(' ',le.source_type,le.account,le.description) ilike '%'||bc.match_pattern||'%'
            )
        ),0)
        when bc.category_type='expense' then abs(coalesce((
          select sum(le.amount)
          from public.ledger_entries le
          where le.organization_id=public.current_organization_id()
            and extract(year from le.entry_date)=p_fiscal_year
            and le.entry_type='expense'
            and (
              bc.match_pattern is null
              or concat_ws(' ',le.source_type,le.account,le.description) ilike '%'||bc.match_pattern||'%'
            )
        ),0))
        else greatest(0,least(
          bl.budget_amount,
          coalesce((select opening_cash+opening_bank from selected_period),0)
          +coalesce((
            select sum(le.amount)
            from public.ledger_entries le
            where le.organization_id=public.current_organization_id()
              and extract(year from le.entry_date)<=p_fiscal_year
          ),0)
        ))
      end as actual_amount
    from public.budget_lines bl
    join public.budget_categories bc on bc.id=bl.category_id
    join selected_period sp on sp.id=bl.fiscal_period_id
  ),
  totals as (
    select
      coalesce(sum(budget_amount) filter(where category_type='income'),0) as income_budget,
      coalesce(sum(actual_amount) filter(where category_type='income'),0) as income_actual,
      coalesce(sum(budget_amount) filter(where category_type='expense'),0) as expense_budget,
      coalesce(sum(actual_amount) filter(where category_type='expense'),0) as expense_actual,
      coalesce(sum(budget_amount) filter(where category_type='reserve'),0) as reserve_budget,
      coalesce(sum(actual_amount) filter(where category_type='reserve'),0) as reserve_actual
    from line_actuals
  )
  select jsonb_build_object(
    'period',(select to_jsonb(sp) from selected_period sp),
    'lines',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',la.id,
          'code',la.code,
          'name',la.name,
          'category_type',la.category_type,
          'match_pattern',la.match_pattern,
          'budget_amount',la.budget_amount,
          'actual_amount',la.actual_amount,
          'variance',case
            when la.category_type='expense' then la.budget_amount-la.actual_amount
            else la.actual_amount-la.budget_amount
          end,
          'execution_percent',case
            when la.budget_amount=0 then 0
            else round((la.actual_amount/la.budget_amount)*100,2)
          end,
          'notes',la.notes
        )
        order by la.category_type,la.code
      )
      from line_actuals la
    ),'[]'::jsonb),
    'summary',coalesce((select to_jsonb(t) from totals t),'{}'::jsonb),
    'current_balance',
      coalesce((select opening_cash+opening_bank from selected_period),0)
      +coalesce((
        select sum(le.amount)
        from public.ledger_entries le
        where le.organization_id=public.current_organization_id()
          and le.entry_date::date<=make_date(p_fiscal_year,12,31)
      ),0)
  ) into result;

  return coalesce(result,jsonb_build_object(
    'period',null,
    'lines','[]'::jsonb,
    'summary','{}'::jsonb,
    'current_balance',0
  ));
end
$$;

create or replace function public.create_asset(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  asset_row public.assets%rowtype;
  type_value text;
  code_value text;
begin
  if not public.has_permission('assets.manage') then
    raise exception 'FORBIDDEN';
  end if;

  code_value:=upper(trim(p_payload->>'code'));
  type_value:=trim(p_payload->>'asset_type');

  if length(code_value)<2
     or length(trim(coalesce(p_payload->>'name','')))<3
     or type_value not in('pozo','tanque','bomba','motor','tuberia','valvula','medidor','macromedidor','clorador','edificio','vehiculo','herramienta','otro') then
    raise exception 'INVALID_ASSET';
  end if;

  insert into public.assets(
    organization_id,code,name,asset_type,status,condition,criticality,
    sector,address,latitude,longitude,installed_at,expected_life_years,
    replacement_cost,serial_number,notes,created_by
  ) values(
    public.current_organization_id(),
    code_value,
    trim(p_payload->>'name'),
    type_value,
    coalesce(nullif(trim(p_payload->>'status'),''),'active'),
    coalesce(nullif(trim(p_payload->>'condition'),''),'good'),
    coalesce(nullif(trim(p_payload->>'criticality'),''),'medium'),
    nullif(trim(p_payload->>'sector'),''),
    nullif(trim(p_payload->>'address'),''),
    nullif(p_payload->>'latitude','')::numeric,
    nullif(p_payload->>'longitude','')::numeric,
    nullif(p_payload->>'installed_at','')::date,
    nullif(p_payload->>'expected_life_years','')::int,
    coalesce(nullif(p_payload->>'replacement_cost','')::numeric,0),
    nullif(trim(p_payload->>'serial_number'),''),
    nullif(trim(p_payload->>'notes'),''),
    auth.uid()
  )
  returning * into asset_row;

  perform public.write_audit_event(
    'asset.create',
    'assets',
    asset_row.id::text,
    null,
    to_jsonb(asset_row),
    null
  );

  return to_jsonb(asset_row);
end
$$;

create or replace function public.list_assets(
  p_query text default null,
  p_status text default null,
  p_type text default null
)
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',a.id,
    'code',a.code,
    'name',a.name,
    'asset_type',a.asset_type,
    'status',a.status,
    'condition',a.condition,
    'criticality',a.criticality,
    'sector',a.sector,
    'address',a.address,
    'latitude',a.latitude,
    'longitude',a.longitude,
    'installed_at',a.installed_at,
    'expected_life_years',a.expected_life_years,
    'replacement_cost',a.replacement_cost,
    'serial_number',a.serial_number,
    'notes',a.notes,
    'next_maintenance',(
      select min(mp.next_due_date)
      from public.maintenance_plans mp
      where mp.asset_id=a.id and mp.active
    ),
    'open_orders',(
      select count(*)
      from public.work_orders w
      where w.asset_id=a.id
        and w.status not in('completed','cancelled')
    )
  )
  from public.assets a
  where a.organization_id=public.current_organization_id()
    and public.has_permission('assets.read')
    and (
      coalesce(trim(p_query),'')=''
      or a.code ilike '%'||trim(p_query)||'%'
      or a.name ilike '%'||trim(p_query)||'%'
      or coalesce(a.serial_number,'') ilike '%'||trim(p_query)||'%'
      or coalesce(a.sector,'') ilike '%'||trim(p_query)||'%'
    )
    and (coalesce(trim(p_status),'')='' or a.status=p_status)
    and (coalesce(trim(p_type),'')='' or a.asset_type=p_type)
  order by
    case a.criticality when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end,
    a.name
$$;

create or replace function public.create_maintenance_plan(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  asset_row public.assets%rowtype;
  plan_row public.maintenance_plans%rowtype;
begin
  if not public.has_permission('maintenance.manage') then
    raise exception 'FORBIDDEN';
  end if;

  select * into asset_row
  from public.assets
  where id=(p_payload->>'asset_id')::uuid
    and organization_id=public.current_organization_id();

  if asset_row.id is null
     or length(trim(coalesce(p_payload->>'name','')))<3
     or (p_payload->>'frequency_days')::int<1 then
    raise exception 'INVALID_MAINTENANCE_PLAN';
  end if;

  insert into public.maintenance_plans(
    organization_id,asset_id,name,frequency_days,next_due_date,
    estimated_cost,checklist,created_by
  ) values(
    public.current_organization_id(),
    asset_row.id,
    trim(p_payload->>'name'),
    (p_payload->>'frequency_days')::int,
    (p_payload->>'next_due_date')::date,
    coalesce(nullif(p_payload->>'estimated_cost','')::numeric,0),
    nullif(trim(p_payload->>'checklist'),''),
    auth.uid()
  ) returning * into plan_row;

  perform public.write_audit_event(
    'maintenance.plan.create',
    'maintenance_plans',
    plan_row.id::text,
    null,
    to_jsonb(plan_row),
    null
  );

  return to_jsonb(plan_row);
end
$$;

create or replace function public.list_maintenance_plans()
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',mp.id,
    'asset_id',mp.asset_id,
    'asset_code',a.code,
    'asset_name',a.name,
    'name',mp.name,
    'frequency_days',mp.frequency_days,
    'next_due_date',mp.next_due_date,
    'estimated_cost',mp.estimated_cost,
    'checklist',mp.checklist,
    'active',mp.active,
    'overdue',mp.next_due_date<current_date
  )
  from public.maintenance_plans mp
  join public.assets a on a.id=mp.asset_id
  where mp.organization_id=public.current_organization_id()
    and public.has_permission('assets.read')
  order by mp.next_due_date,a.name
$$;

create or replace function public.generate_preventive_work_orders(p_through_date date default current_date)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  plan_row record;
  work_row public.work_orders%rowtype;
  generated int:=0;
begin
  if not public.has_permission('maintenance.manage')
     or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;

  for plan_row in
    select mp.*,a.name as asset_name,a.code as asset_code
    from public.maintenance_plans mp
    join public.assets a on a.id=mp.asset_id
    where mp.organization_id=public.current_organization_id()
      and mp.active
      and mp.next_due_date<=p_through_date
    order by mp.next_due_date
    for update of mp
  loop
    if not exists(
      select 1
      from public.work_orders w
      where w.organization_id=public.current_organization_id()
        and w.maintenance_plan_id=plan_row.id
        and w.status not in('completed','cancelled')
    ) then
      insert into public.work_orders(
        organization_id,order_number,type,description,priority,status,
        asset_id,maintenance_plan_id,due_date,scheduled_at,estimated_cost,created_by
      ) values(
        public.current_organization_id(),
        public.next_document_number('work_order','OT',5),
        'mantenimiento_preventivo',
        plan_row.name||' — '||plan_row.asset_code||' '||plan_row.asset_name,
        case when plan_row.next_due_date<current_date then 'high' else 'normal' end,
        'scheduled',
        plan_row.asset_id,
        plan_row.id,
        plan_row.next_due_date,
        plan_row.next_due_date::timestamptz,
        plan_row.estimated_cost,
        auth.uid()
      ) returning * into work_row;

      generated:=generated+1;

      perform public.write_audit_event(
        'maintenance.work_order.generate',
        'work_orders',
        work_row.id::text,
        null,
        to_jsonb(work_row),
        null
      );
    end if;

    update public.maintenance_plans
    set next_due_date=next_due_date+frequency_days,
        updated_at=now()
    where id=plan_row.id;
  end loop;

  return jsonb_build_object('generated',generated,'through_date',p_through_date);
end
$$;

create or replace function public.create_work_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  work_row public.work_orders%rowtype;
begin
  if not public.has_permission('operations.manage') then
    raise exception 'FORBIDDEN';
  end if;

  if length(trim(coalesce(p_payload->>'description','')))<5 then
    raise exception 'DESCRIPTION_REQUIRED';
  end if;

  insert into public.work_orders(
    organization_id,order_number,type,description,priority,
    subscriber_id,connection_id,assigned_to,scheduled_at,created_by,
    asset_id,maintenance_plan_id,due_date,estimated_cost
  ) values(
    public.current_organization_id(),
    public.next_document_number('work_order','OT',5),
    trim(p_payload->>'type'),
    trim(p_payload->>'description'),
    coalesce(nullif(p_payload->>'priority',''),'normal'),
    nullif(p_payload->>'subscriber_id','')::uuid,
    nullif(p_payload->>'connection_id','')::uuid,
    nullif(p_payload->>'assigned_to','')::uuid,
    nullif(p_payload->>'scheduled_at','')::timestamptz,
    auth.uid(),
    nullif(p_payload->>'asset_id','')::uuid,
    nullif(p_payload->>'maintenance_plan_id','')::uuid,
    nullif(p_payload->>'due_date','')::date,
    coalesce(nullif(p_payload->>'estimated_cost','')::numeric,0)
  ) returning * into work_row;

  perform public.write_audit_event(
    'work_order.create',
    'work_orders',
    work_row.id::text,
    null,
    to_jsonb(work_row),
    null
  );

  return to_jsonb(work_row);
end
$$;

create or replace function public.update_work_order_v2(p_id uuid,p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  old_row public.work_orders%rowtype;
  new_row public.work_orders%rowtype;
begin
  if not public.has_permission('operations.manage') then
    raise exception 'FORBIDDEN';
  end if;

  select * into old_row
  from public.work_orders
  where id=p_id
    and organization_id=public.current_organization_id()
  for update;

  if old_row.id is null then
    raise exception 'NOT_FOUND';
  end if;

  update public.work_orders set
    status=coalesce(nullif(p_payload->>'status',''),status::text)::public.work_order_status,
    notes=coalesce(nullif(trim(p_payload->>'notes'),''),notes),
    assigned_to=coalesce(nullif(p_payload->>'assigned_to','')::uuid,assigned_to),
    scheduled_at=coalesce(nullif(p_payload->>'scheduled_at','')::timestamptz,scheduled_at),
    due_date=coalesce(nullif(p_payload->>'due_date','')::date,due_date),
    estimated_cost=coalesce(nullif(p_payload->>'estimated_cost','')::numeric,estimated_cost),
    actual_cost=coalesce(nullif(p_payload->>'actual_cost','')::numeric,actual_cost),
    completed_at=case
      when coalesce(nullif(p_payload->>'status',''),status::text)='completed' then coalesce(completed_at,now())
      else completed_at
    end
  where id=old_row.id
  returning * into new_row;

  if new_row.status='completed' and new_row.asset_id is not null
     and not exists(select 1 from public.asset_maintenance_log where work_order_id=new_row.id) then
    insert into public.asset_maintenance_log(
      organization_id,asset_id,work_order_id,maintenance_plan_id,
      event_type,description,cost,performed_by,created_by
    ) values(
      public.current_organization_id(),
      new_row.asset_id,
      new_row.id,
      new_row.maintenance_plan_id,
      case when new_row.maintenance_plan_id is null then 'corrective' else 'preventive' end,
      new_row.description,
      new_row.actual_cost,
      coalesce(new_row.assigned_to,auth.uid()),
      auth.uid()
    );
  end if;

  perform public.write_audit_event(
    'work_order.update',
    'work_orders',
    new_row.id::text,
    to_jsonb(old_row),
    to_jsonb(new_row),
    nullif(trim(p_payload->>'notes'),'')
  );

  return to_jsonb(new_row);
end
$$;

create or replace function public.list_work_orders()
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',w.id,
    'order_number',w.order_number,
    'type',w.type,
    'description',w.description,
    'priority',w.priority,
    'status',w.status,
    'scheduled_at',w.scheduled_at,
    'due_date',w.due_date,
    'completed_at',w.completed_at,
    'notes',w.notes,
    'estimated_cost',w.estimated_cost,
    'actual_cost',w.actual_cost,
    'asset_id',w.asset_id,
    'asset_code',a.code,
    'asset_name',a.name,
    'maintenance_plan_id',w.maintenance_plan_id,
    'assigned_to',w.assigned_to,
    'assigned_name',p.full_name,
    'created_at',w.created_at
  )
  from public.work_orders w
  left join public.assets a on a.id=w.asset_id
  left join public.profiles p on p.id=w.assigned_to
  where w.organization_id=public.current_organization_id()
    and public.has_permission('operations.read')
  order by
    case w.status when 'open' then 0 when 'scheduled' then 1 when 'in_progress' then 2 else 3 end,
    case w.priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
    coalesce(w.due_date,w.created_at::date),
    w.created_at desc
$$;

create or replace function public.get_role_dashboard()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'overdue_debt',case when public.has_permission('obligations.read') then (
      select coalesce(sum(public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)),0)
      from public.obligations o
      where o.organization_id=public.current_organization_id()
        and o.cancelled_at is null
        and o.due_date<current_date
    ) else null end,
    'pending_expenses',case when public.has_permission('expenses.read') then (
      select count(*) from public.expenses e
      where e.organization_id=public.current_organization_id()
        and e.status in('requested','approved')
    ) else null end,
    'open_work_orders',case when public.has_permission('operations.read') then (
      select count(*) from public.work_orders w
      where w.organization_id=public.current_organization_id()
        and w.status not in('completed','cancelled')
    ) else null end,
    'urgent_work_orders',case when public.has_permission('operations.read') then (
      select count(*) from public.work_orders w
      where w.organization_id=public.current_organization_id()
        and w.status not in('completed','cancelled')
        and w.priority='urgent'
    ) else null end,
    'overdue_maintenance',case when public.has_permission('assets.read') then (
      select count(*) from public.maintenance_plans mp
      where mp.organization_id=public.current_organization_id()
        and mp.active
        and mp.next_due_date<current_date
    ) else null end,
    'critical_assets',case when public.has_permission('assets.read') then (
      select count(*) from public.assets a
      where a.organization_id=public.current_organization_id()
        and a.status<>'retired'
        and (a.condition='critical' or a.criticality='critical')
    ) else null end,
    'low_stock',case when public.has_permission('inventory.read') then (
      select count(*) from public.inventory_items i
      where i.organization_id=public.current_organization_id()
        and i.active
        and i.quantity<=i.minimum_stock
    ) else null end,
    'budget_status',case when public.has_permission('budget.read') then (
      select fp.status from public.fiscal_periods fp
      where fp.organization_id=public.current_organization_id()
        and fp.fiscal_year=extract(year from current_date)::int
      limit 1
    ) else null end,
    'active_cash_session',case when public.has_permission('cash.manage') then exists(
      select 1 from public.cash_sessions cs
      where cs.organization_id=public.current_organization_id()
        and cs.user_id=auth.uid()
        and cs.status='open'
    ) else null end
  )
$$;

create or replace function public.global_search(p_query text,p_limit int default 20)
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  with normalized as (
    select trim(coalesce(p_query,'')) as q
  ),
  results as (
    select
      'subscriber'::text as result_type,
      s.id,
      s.code||' — '||s.full_name as label,
      coalesce(s.whatsapp,s.email,'Abonado') as subtitle,
      '/abonados'::text as route,
      1 as priority
    from public.subscribers s,normalized n
    where public.has_permission('subscribers.read')
      and s.organization_id=public.current_organization_id()
      and length(n.q)>=2
      and (
        s.code ilike '%'||n.q||'%'
        or s.full_name ilike '%'||n.q||'%'
        or coalesce(s.whatsapp,'') ilike '%'||n.q||'%'
      )

    union all

    select
      'payment',
      p.id,
      p.receipt_number||' — '||s.full_name,
      'Recibo · L '||to_char(p.total,'FM999999990.00'),
      '/pagos',
      2
    from public.payments p
    join public.subscribers s on s.id=p.subscriber_id
    cross join normalized n
    where public.has_permission('payments.read')
      and p.organization_id=public.current_organization_id()
      and length(n.q)>=2
      and (
        p.receipt_number ilike '%'||n.q||'%'
        or s.full_name ilike '%'||n.q||'%'
      )

    union all

    select
      'work_order',
      w.id,
      w.order_number||' — '||w.type,
      w.description,
      '/operaciones',
      3
    from public.work_orders w,normalized n
    where public.has_permission('operations.read')
      and w.organization_id=public.current_organization_id()
      and length(n.q)>=2
      and (
        w.order_number ilike '%'||n.q||'%'
        or w.description ilike '%'||n.q||'%'
      )

    union all

    select
      'asset',
      a.id,
      a.code||' — '||a.name,
      a.asset_type||coalesce(' · '||a.sector,''),
      '/operaciones',
      4
    from public.assets a,normalized n
    where public.has_permission('assets.read')
      and a.organization_id=public.current_organization_id()
      and length(n.q)>=2
      and (
        a.code ilike '%'||n.q||'%'
        or a.name ilike '%'||n.q||'%'
        or coalesce(a.serial_number,'') ilike '%'||n.q||'%'
      )
  )
  select jsonb_build_object(
    'type',r.result_type,
    'id',r.id,
    'label',r.label,
    'subtitle',r.subtitle,
    'route',r.route
  )
  from results r
  order by r.priority,r.label
  limit least(greatest(p_limit,1),50)
$$;

commit;
