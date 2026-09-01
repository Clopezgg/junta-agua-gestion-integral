-- V5-FASE10 · AGUA Y AMBIENTE: fuentes, calidad del agua, cloración, continuidad y microcuenca.
begin;

-- ---------------------------------------------------------------------------
-- FUENTES DE AGUA
-- ---------------------------------------------------------------------------
create type public.source_type as enum('manantial','pozo','rio','quebrada','naciente','toma_superficial');
create type public.source_status as enum('activa','mantenimiento','inactiva');
create table public.water_sources(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  code text not null,
  name text not null,
  source_type source_type not null,
  status source_status not null default 'activa',
  location text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  estimated_flow numeric(10,2),
  microcuenca_id uuid,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique(organization_id,code)
);

-- ---------------------------------------------------------------------------
-- MICROCUENCA
-- ---------------------------------------------------------------------------
create table public.watersheds(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  code text,
  description text,
  protection_status text,
  created_at timestamptz not null default now()
);
alter table public.water_sources add constraint water_sources_microcuenca_fk foreign key(microcuenca_id) references watersheds(id);

-- ---------------------------------------------------------------------------
-- CALIDAD DEL AGUA (muestras y parámetros)
-- ---------------------------------------------------------------------------
create type public.sample_status as enum('pendiente','en_laboratorio','resultado','rechazada');
create table public.water_samples(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  code text not null,
  source_id uuid references water_sources(id),
  sample_date timestamptz not null default now(),
  collected_by uuid references profiles(id),
  chlorine_residual numeric(6,2),
  turbidity numeric(10,3),
  ph numeric(5,2),
  temperature numeric(5,2),
  status sample_status not null default 'pendiente',
  notes text,
  created_at timestamptz not null default now(),
  unique(organization_id,code)
);
create table public.water_sample_parameters(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  sample_id uuid not null references water_samples(id) on delete cascade,
  parameter text not null,
  result numeric(14,4),
  unit text,
  limit_min numeric(14,4),
  limit_max numeric(14,4),
  compliant boolean,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CLORACIÓN (registros de dosificación y cloro residual)
-- ---------------------------------------------------------------------------
create type public.chlorination_point as enum('entrada','salida','tanque','red');
create table public.chlorination_logs(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  recorded_at timestamptz not null default now(),
  source_id uuid references water_sources(id),
  point chlorination_point not null default 'salida',
  chlorine_dose numeric(8,2),
  residual_chlorine numeric(6,2) not null,
  operator_id uuid references profiles(id),
  notes text,
  created_at timestamptz not null default now()
);
create index chlorination_logs_org_date on chlorination_logs(organization_id,recorded_at);

-- ---------------------------------------------------------------------------
-- CONTINUIDAD / RACIONAMIENTOS
-- ---------------------------------------------------------------------------
create type public.rational_status as enum('programado','vigente','finalizado','cancelado');
create type public.rational_type as enum('racionamiento','corte_planificado','horario_restriccion');
create table public.rationalization_schedules(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  rational_type rational_type not null default 'racionamiento',
  status rational_status not null default 'programado',
  title text not null,
  description text,
  zones text[],
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
create index rational_org_status on rationalization_schedules(organization_id,status);

-- ---------------------------------------------------------------------------
-- FUNCIONES AGUA
-- ---------------------------------------------------------------------------
create or replace function public.register_water_source(p_code text,p_name text,p_source_type text,p_location text default null,p_latitude numeric default null,p_longitude numeric default null,p_estimated_flow numeric default null,p_microcuenca_id uuid default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();sid uuid;
begin
  if not has_permission('water.manage') then raise exception 'FORBIDDEN';end if;
  insert into water_sources(organization_id,code,name,source_type,location,latitude,longitude,estimated_flow,microcuenca_id,created_by)
  values(org,upper(trim(p_code)),trim(p_name),(p_source_type)::source_type,p_location,p_latitude,p_longitude,p_estimated_flow,p_microcuenca_id,auth.uid()) returning id into sid;
  perform write_audit_event('create','water_source',sid::text,null,jsonb_build_object('code',p_code),'Registro de fuente');
  return sid;
end$$;

create or replace function public.register_water_sample(p_payload jsonb,p_parameters jsonb default '[]') returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();sid uuid;n int;par jsonb;
begin
  if not has_permission('water.manage') then raise exception 'FORBIDDEN';end if;
  select count(*)+1 into n from water_samples where organization_id=org;
  insert into water_samples(organization_id,code,source_id,sample_date,collected_by,chlorine_residual,turbidity,ph,temperature,status,notes)
  values(org,'MUESTRA-'||lpad(n::text,4,'0'),nullif(p_payload->>'source_id','')::uuid,coalesce(nullif(p_payload->>'sample_date','')::timestamptz,now()),auth.uid(),
  nullif(p_payload->>'chlorine_residual','')::numeric,nullif(p_payload->>'turbidity','')::numeric,nullif(p_payload->>'ph','')::numeric,nullif(p_payload->>'temperature','')::numeric,
  coalesce(p_payload->>'status','resultado')::sample_status,p_payload->>'notes') returning id into sid;
  for par in select * from jsonb_array_elements(p_parameters) loop
    insert into water_sample_parameters(organization_id,sample_id,parameter,result,unit,limit_min,limit_max,compliant)
    values(org,sid,par->>'parameter',nullif(par->>'result','')::numeric,par->>'unit',nullif(par->>'limit_min','')::numeric,nullif(par->>'limit_max','')::numeric,
    case when par->>'limit_min' is not null and par->>'result' is not null then (par->>'result')::numeric between (par->>'limit_min')::numeric and coalesce((par->>'limit_max')::numeric,(par->>'result')::numeric) end);
  end loop;
  perform write_audit_event('create','water_sample',sid::text,null,null,'Registro de muestra de agua');
  return sid;
end$$;

create or replace function public.register_chlorination(p_source_id uuid,p_point text,p_residual_clorine numeric,p_chlorine_dose numeric default null,p_notes text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();lid uuid;
begin
  if not has_permission('water.manage') then raise exception 'FORBIDDEN';end if;
  insert into chlorination_logs(organization_id,source_id,point,chlorine_dose,residual_chlorine,operator_id,notes)
  values(org,p_source_id,(p_point)::chlorination_point,p_chlorine_dose,p_residual_clorine,auth.uid(),p_notes) returning id into lid;
  return lid;
end$$;

create or replace function public.list_water_samples(p_limit int default 100) returns setof water_samples
language sql stable security definer set search_path=public as $$
select * from water_samples where organization_id=current_organization_id() and has_permission('water.read') order by sample_date desc limit least(p_limit,200)$$;

create or replace function public.list_chlorination_logs(p_limit int default 100) returns setof chlorination_logs
language sql stable security definer set search_path=public as $$
select * from chlorination_logs where organization_id=current_organization_id() and has_permission('water.read') order by recorded_at desc limit least(p_limit,200)$$;

create or replace function public.list_rationalization(p_status text default null) returns setof rationalization_schedules
language sql stable security definer set search_path=public as $$
select * from rationalization_schedules where organization_id=current_organization_id() and has_permission('water.read') and (p_status is null or status=(p_status)::rational_status) order by starts_at$$;

create or replace function public.register_watershed(p_name text,p_code text default null,p_protection_status text default null,p_description text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();wid uuid;
begin
  if not has_permission('water.manage') then raise exception 'FORBIDDEN';end if;
  insert into watersheds(organization_id,name,code,protection_status,description)
  values(org,trim(p_name),p_code,p_protection_status,p_description) returning id into wid;
  return wid;
end$$;

create or replace function public.create_rationalization(p_rational_type text,p_title text,p_starts_at timestamptz,p_ends_at timestamptz default null,p_description text default null,p_zones text[] default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();rid uuid;
begin
  if not has_permission('water.manage') then raise exception 'FORBIDDEN';end if;
  insert into rationalization_schedules(organization_id,rational_type,status,title,description,zones,starts_at,ends_at,created_by)
  values(org,(p_rational_type)::rational_type,'programado',trim(p_title),p_description,p_zones,p_starts_at,p_ends_at,auth.uid()) returning id into rid;
  perform write_audit_event('create','rationalization',rid::text,null,jsonb_build_object('title',p_title),'Nuevo racionamiento');
  return rid;
end$$;

-- ---------------------------------------------------------------------------
-- RLS + permisos
-- ---------------------------------------------------------------------------
insert into permissions(code,description) values('water.read','Consultar agua y ambiente'),('water.manage','Administrar agua y ambiente') on conflict(code) do update set description=excluded.description;
insert into role_permissions(role_id,permission_code) select r.id,p.code from roles r cross join permissions p where r.code='superadmin' and p.code in('water.read','water.manage') on conflict do nothing;

alter table public.water_sources enable row level security;
alter table public.watersheds enable row level security;
alter table public.water_samples enable row level security;
alter table public.water_sample_parameters enable row level security;
alter table public.chlorination_logs enable row level security;
alter table public.rationalization_schedules enable row level security;

create policy water_sources_read on water_sources for select using(organization_id=current_organization_id() and has_permission('water.read'));
create policy watersheds_read on watersheds for select using(organization_id=current_organization_id() and has_permission('water.read'));
create policy water_samples_read on water_samples for select using(organization_id=current_organization_id() and has_permission('water.read'));
create policy water_sample_parameters_read on water_sample_parameters for select using(organization_id=current_organization_id() and has_permission('water.read'));
create policy chlorination_logs_read on chlorination_logs for select using(organization_id=current_organization_id() and has_permission('water.read'));
create policy rationalization_read on rationalization_schedules for select using(organization_id=current_organization_id() and has_permission('water.read'));

revoke insert,update,delete on water_sources,watersheds,water_samples,water_sample_parameters,chlorination_logs,rationalization_schedules from authenticated;

commit;
