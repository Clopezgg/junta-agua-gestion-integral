-- V5-FASE11 · CUMPLIMIENTO: ERSAPS, calendario institucional, informe anual y transparencia.
-- Reglas configurables con fuente/versión; marcamos "requiere validación institucional/legal".
begin;

-- ---------------------------------------------------------------------------
-- CALENDARIO
-- ---------------------------------------------------------------------------
create type public.calendar_event_kind as enum('regulatorio','institucional','operativo','financiero','social');
create table public.calendar_events(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  title text not null,
  event_date date not null,
  event_kind calendar_event_kind not null default 'institucional',
  description text,
  responsible_person_id uuid references persons(id),
  recurring text,
  compliance_ref text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
create index calendar_events_org_date on calendar_events(organization_id,event_date);

-- ---------------------------------------------------------------------------
-- ERSAPS COMPLIANCE (reglas configurables con fuente/versión)
-- ---------------------------------------------------------------------------
create type public.compliance_status as enum('pendiente','en_proceso','cumplido','vencido','requiere_validacion');
create table public.compliance_obligations(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  code text not null,
  title text not null,
  description text,
  regulation_source text not null,
  regulation_version text,
  frequency text,
  due_date date,
  status compliance_status not null default 'pendiente',
  requires_validation boolean not null default true,
  evidence text,
  completed_at timestamptz,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique(organization_id,code)
);
create index compliance_org_status on compliance_obligations(organization_id,status);

-- ---------------------------------------------------------------------------
-- INFORMES ANUALES / TRANSPARENCIA
-- ---------------------------------------------------------------------------
create type public.report_doc_kind as enum('informe_anual','estado_financiero','transparencia','rendicion_cuentas');
create table public.institutional_reports(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  year int not null,
  report_kind report_doc_kind not null default 'informe_anual',
  title text not null,
  storage_path text,
  published boolean not null default false,
  published_at timestamptz,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
create index reports_org_year on institutional_reports(organization_id,year);

-- ---------------------------------------------------------------------------
-- FUNCIONES CUMPLIMIENTO
-- ---------------------------------------------------------------------------
create or replace function public.register_compliance_obligation(p_code text,p_title text,p_regulation_source text,p_regulation_version text default null,p_frequency text default null,p_due_date date default null,p_description text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();cid uuid;
begin
  if not has_permission('compliance.manage') then raise exception 'FORBIDDEN';end if;
  insert into compliance_obligations(organization_id,code,title,description,regulation_source,regulation_version,frequency,due_date,status,requires_validation,created_by)
  values(org,upper(trim(p_code)),trim(p_title),p_description,p_regulation_source,p_regulation_version,p_frequency,p_due_date,'pendiente',true,auth.uid()) returning id into cid;
  perform write_audit_event('create','compliance_obligation',cid::text,null,jsonb_build_object('code',p_code),'Registro de obligación regulatoria');
  return cid;
end$$;

create or replace function public.upsert_compliance_status(p_compliance_id uuid,p_status text,p_evidence text default null) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not has_permission('compliance.manage') then raise exception 'FORBIDDEN';end if;
  update compliance_obligations set status=(p_status)::compliance_status,evidence=coalesce(p_evidence,evidence),completed_at=case when p_status in('cumplido','requiere_validacion') then now() else completed_at end where id=p_compliance_id and organization_id=current_organization_id();
end$$;

create or replace function public.create_calendar_event(p_title text,p_event_date date,p_event_kind text default 'institucional',p_description text default null,p_compliance_ref text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();eid uuid;
begin
  if not has_permission('calendar.manage') then raise exception 'FORBIDDEN';end if;
  insert into calendar_events(organization_id,title,event_date,event_kind,description,compliance_ref,created_by)
  values(org,trim(p_title),p_event_date,(p_event_kind)::calendar_event_kind,p_description,p_compliance_ref,auth.uid()) returning id into eid;
  return eid;
end$$;

create or replace function public.list_calendar_events(p_year int default null) returns setof calendar_events
language sql stable security definer set search_path=public as $$
select * from calendar_events where organization_id=current_organization_id() and (p_year is null or extract(year from event_date)=p_year) order by event_date$$;

create or replace function public.list_compliance(p_status text default null) returns setof compliance_obligations
language sql stable security definer set search_path=public as $$
select * from compliance_obligations where organization_id=current_organization_id() and has_permission('compliance.read') and (p_status is null or status=(p_status)::compliance_status) order by due_date nulls last$$;

create or replace function public.get_transparency_report_v5(p_year int) returns jsonb
language sql stable security definer set search_path=public as $$
select jsonb_build_object(
  'resolutions',(select count(*) from resolutions where organization_id=current_organization_id() and extract(year from coalesce(approved_at,effective_date,created_at))=p_year and status in('aprobada','publicada')),
  'projects',(select count(*) from projects where organization_id=current_organization_id() and extract(year from created_at)=p_year),
  'reports',(select count(*) from institutional_reports where organization_id=current_organization_id() and year=p_year and published),
  'compliance',(select jsonb_agg(to_jsonb(c)) from compliance_obligations c where organization_id=current_organization_id())
)$$;

-- ---------------------------------------------------------------------------
-- RLS + permisos
-- ---------------------------------------------------------------------------
insert into permissions(code,description) values('compliance.read','Consultar cumplimiento'),('compliance.manage','Administrar cumplimiento'),('calendar.manage','Administrar calendario') on conflict(code) do update set description=excluded.description;
insert into role_permissions(role_id,permission_code) select r.id,p.code from roles r cross join permissions p where r.code='superadmin' and p.code in('compliance.read','compliance.manage','calendar.manage') on conflict do nothing;

alter table public.calendar_events enable row level security;
alter table public.compliance_obligations enable row level security;
alter table public.institutional_reports enable row level security;

create policy calendar_events_read on calendar_events for select using(organization_id=current_organization_id());
create policy compliance_read on compliance_obligations for select using(organization_id=current_organization_id() and has_permission('compliance.read'));
create policy institutional_reports_read on institutional_reports for select using(organization_id=current_organization_id() and has_permission('reports.read'));
revoke insert,update,delete on calendar_events,compliance_obligations,institutional_reports from authenticated;

commit;
