
begin;

insert into public.permissions(code,description) values
  ('metering.read','Consultar lecturas, consumo y candidatos a corte'),
  ('metering.manage','Administrar tarifas por consumo, lecturas y facturación'),
  ('imports.read','Consultar historiales de importación'),
  ('imports.manage','Importar abonados y lecturas con validación')
on conflict(code) do update set description=excluded.description;

insert into public.role_permissions(role_id,permission_code)
select r.id,p.code
from public.roles r
cross join public.permissions p
where
  (r.code='superadmin' and p.code in('metering.read','metering.manage','imports.read','imports.manage')) or
  (r.code='admin' and p.code in('metering.read','metering.manage','imports.read','imports.manage')) or
  (r.code='secretary' and p.code in('metering.read','imports.read','imports.manage')) or
  (r.code='treasurer' and p.code in('metering.read','metering.manage','imports.read')) or
  (r.code='auditor' and p.code in('metering.read','imports.read')) or
  (r.code='member' and p.code in('metering.read')) or
  (r.code='technician' and p.code in('metering.read','metering.manage','imports.read','imports.manage'))
on conflict do nothing;

create type public.data_import_kind as enum('subscribers','meter_readings');
create type public.data_import_status as enum('draft','validated','completed','failed','cancelled');
create type public.import_row_status as enum('pending','valid','imported','skipped','error');
create type public.reading_batch_status as enum('draft','validated','posted','cancelled');
create type public.meter_reading_status as enum('valid','warning','error','posted');

create table public.data_import_batches(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind public.data_import_kind not null,
  file_name text not null,
  file_type text,
  file_size bigint not null default 0 check(file_size>=0),
  source_sha256 text,
  mapping jsonb not null default '{}'::jsonb,
  status public.data_import_status not null default 'draft',
  total_rows integer not null default 0 check(total_rows>=0),
  valid_rows integer not null default 0 check(valid_rows>=0),
  imported_rows integer not null default 0 check(imported_rows>=0),
  skipped_rows integer not null default 0 check(skipped_rows>=0),
  error_rows integer not null default 0 check(error_rows>=0),
  error_message text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.data_import_rows(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.data_import_batches(id) on delete cascade,
  row_number integer not null check(row_number>0),
  raw_data jsonb not null,
  normalized_data jsonb not null default '{}'::jsonb,
  status public.import_row_status not null default 'pending',
  error_codes text[] not null default '{}',
  result_entity_id uuid,
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(batch_id,row_number)
);

create table public.consumption_tariff_schemes(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  service_type text check(service_type is null or service_type in('residential','commercial','community','institutional')),
  version_number integer not null check(version_number>0),
  fixed_charge numeric(14,2) not null default 0 check(fixed_charge>=0),
  effective_from date not null,
  effective_to date,
  tariff_definition_id uuid not null references public.tariff_definitions(id),
  tariff_version_id uuid not null references public.tariff_versions(id),
  status text not null default 'active' check(status in('active','inactive')),
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check(effective_to is null or effective_to>=effective_from),
  unique(organization_id,code,version_number)
);

create table public.consumption_tariff_blocks(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scheme_id uuid not null references public.consumption_tariff_schemes(id) on delete cascade,
  block_order integer not null check(block_order>0),
  from_volume numeric(14,3) not null check(from_volume>=0),
  to_volume numeric(14,3),
  unit_price numeric(14,4) not null check(unit_price>=0),
  check(to_volume is null or to_volume>from_volume),
  unique(scheme_id,block_order)
);

create table public.meter_reading_batches(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_key text not null,
  reading_date date not null,
  due_date date not null,
  scheme_id uuid not null references public.consumption_tariff_schemes(id),
  status public.reading_batch_status not null default 'draft',
  total_readings integer not null default 0,
  warning_readings integer not null default 0,
  error_readings integer not null default 0,
  posted_readings integer not null default 0,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  posted_by uuid references public.profiles(id),
  posted_at timestamptz,
  check(due_date>=reading_date),
  unique(organization_id,period_key,scheme_id)
);

create table public.meter_readings(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  batch_id uuid not null references public.meter_reading_batches(id) on delete cascade,
  connection_id uuid not null references public.water_connections(id),
  previous_reading numeric(14,3) not null check(previous_reading>=0),
  current_reading numeric(14,3) not null check(current_reading>=0),
  consumption numeric(14,3) not null check(consumption>=0),
  status public.meter_reading_status not null,
  anomaly_code text,
  notes text,
  obligation_id uuid references public.obligations(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(batch_id,connection_id)
);

create index data_import_batches_org_date_idx on public.data_import_batches(organization_id,created_at desc);
create index data_import_rows_batch_status_idx on public.data_import_rows(batch_id,status,row_number);
create index consumption_tariffs_org_code_idx on public.consumption_tariff_schemes(organization_id,code,effective_from desc);
create index meter_reading_batches_org_period_idx on public.meter_reading_batches(organization_id,reading_date desc);
create index meter_readings_connection_idx on public.meter_readings(organization_id,connection_id,created_at desc);
create index obligations_meter_reading_idx on public.obligations(organization_id,connection_id,period_key) where source='meter_reading';

alter table public.data_import_batches enable row level security;
alter table public.data_import_rows enable row level security;
alter table public.consumption_tariff_schemes enable row level security;
alter table public.consumption_tariff_blocks enable row level security;
alter table public.meter_reading_batches enable row level security;
alter table public.meter_readings enable row level security;

create policy data_import_batches_read on public.data_import_batches
for select using(organization_id=public.current_organization_id() and public.has_permission('imports.read'));
create policy data_import_rows_read on public.data_import_rows
for select using(organization_id=public.current_organization_id() and public.has_permission('imports.read'));
create policy consumption_tariff_schemes_read on public.consumption_tariff_schemes
for select using(organization_id=public.current_organization_id() and public.has_permission('metering.read'));
create policy consumption_tariff_blocks_read on public.consumption_tariff_blocks
for select using(organization_id=public.current_organization_id() and public.has_permission('metering.read'));
create policy meter_reading_batches_read on public.meter_reading_batches
for select using(organization_id=public.current_organization_id() and public.has_permission('metering.read'));
create policy meter_readings_read on public.meter_readings
for select using(organization_id=public.current_organization_id() and public.has_permission('metering.read'));

revoke insert,update,delete on
  public.data_import_batches,public.data_import_rows,
  public.consumption_tariff_schemes,public.consumption_tariff_blocks,
  public.meter_reading_batches,public.meter_readings
from authenticated;


commit;
