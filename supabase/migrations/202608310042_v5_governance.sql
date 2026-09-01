-- V5-FASE9 · GOBIERNO: cargos institucionales, Junta Directiva, Comités, Reuniones/Actas,
-- Resoluciones, Proyectos y Asamblea. Los cargos son registro de PERSONA (no roles de software).
begin;

-- ---------------------------------------------------------------------------
-- Cargos institucionales de la JAA (Reglamento de Juntas Administradoras de Agua)
-- ---------------------------------------------------------------------------
create type public.institutional_position as enum('presidente','vicepresidente','secretario','tesorero','fiscal','vocal');
create type public.position_period_status as enum('vigente','finalizado','revocado');

create table public.position_terms(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  position institutional_position not null,
  person_id uuid not null references persons(id),
  term_start date not null,
  term_end date not null,
  status position_period_status not null default 'vigente',
  notes text,
  elected_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index position_terms_org_pos on position_terms(organization_id,position,status);
create unique index one_vigente_per_position on position_terms(organization_id,position) where status='vigente';

-- ---------------------------------------------------------------------------
-- Junta directiva (instancia)
-- ---------------------------------------------------------------------------
create table public.boards(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null default 'Junta Directiva',
  term_label text,
  period_start date,
  period_end date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.board_members(
  board_id uuid not null references boards(id) on delete cascade,
  person_id uuid not null references persons(id),
  position institutional_position not null,
  active boolean not null default true,
  primary key(board_id,person_id)
);

-- ---------------------------------------------------------------------------
-- Comités
-- ---------------------------------------------------------------------------
create type public.committee_type as enum('agua','saneamiento','ambiente','control_fiscal','compras','protocolo','otro');
create table public.committees(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  committee_type committee_type not null default 'otro',
  purpose text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.committee_members(
  committee_id uuid not null references committees(id) on delete cascade,
  person_id uuid not null references persons(id),
  role text,
  active boolean not null default true,
  primary key(committee_id,person_id)
);

-- ---------------------------------------------------------------------------
-- Reuniones y actas
-- ---------------------------------------------------------------------------
create type public.reunion_type as enum('asamblea_general','junta_directiva','comite','informe');
create type public.reunion_status as enum('programada','en_curso','celebrada','cancelada');
create type public.acta_status as enum('borrador','aprobada','firmada','enmendada');

create table public.meetings(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  reunion_type reunion_type not null default 'junta_directiva',
  status reunion_status not null default 'programada',
  title text not null,
  scheduled_at timestamptz not null,
  place text,
  quorum_reached boolean,
  board_id uuid references boards(id),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
create table public.meeting_attendees(
  meeting_id uuid not null references meetings(id) on delete cascade,
  person_id uuid not null references persons(id),
  present boolean not null default false,
  primary key(meeting_id,person_id)
);

create table public.minutes(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  meeting_id uuid not null unique references meetings(id),
  acta_status acta_status not null default 'borrador',
  content text not null,
  version int not null default 1,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Resoluciones (documentos normativos con numeración correlativa)
-- ---------------------------------------------------------------------------
create type public.resolution_status as enum('borrador','aprobada','publicada','revocada');
create type public.resolution_type as enum('tarifa','reglamento_interno','gobierno','financiera','operativa','sancion','otra');
create table public.resolutions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  number text not null,
  resolution_type resolution_type not null default 'otra',
  status resolution_status not null default 'borrador',
  title text not null,
  content text not null,
  meeting_id uuid references meetings(id),
  approved_at timestamptz,
  effective_date date,
  source_regulation text,
  requires_validation boolean not null default true,
  version int not null default 1,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,number)
);
create index resolutions_org_status on resolutions(organization_id,status);

-- ---------------------------------------------------------------------------
-- Proyectos
-- ---------------------------------------------------------------------------
create type public.project_status as enum('propuesta','aprobado','en_ejecucion','finalizado','suspendido');
create type public.project_funding as enum('fondo_propio','cooperacion','fideicomiso','municipal','mixto');
create table public.projects(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  code text not null,
  name text not null,
  status project_status not null default 'propuesta',
  funding project_funding not null default 'fondo_propio',
  description text,
  budget numeric(14,2) not null default 0 check(budget>=0),
  location_id uuid references service_locations(id),
  start_date date,
  end_date date,
  responsible_person_id uuid references persons(id),
  resolution_id uuid references resolutions(id),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);
create index projects_org_status on projects(organization_id,status);

-- ---------------------------------------------------------------------------
-- Funciones GOBIERNO
-- ---------------------------------------------------------------------------
create or replace function public.set_institutional_position(p_position text,p_person_id uuid,p_term_start date,p_term_end date,p_notes text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();tid uuid;
begin
  if not has_permission('governance.manage') then raise exception 'FORBIDDEN';end if;
  if auth.jwt()->>'aal'<>'aal2' then raise exception 'MFA_REQUIRED';end if;
  insert into position_terms(organization_id,position,person_id,term_start,term_end,notes,elected_by)
  values(org,(p_position)::institutional_position,p_person_id,p_term_start,p_term_end,p_notes,auth.uid()) returning id into tid;
  perform write_audit_event('create','position_term',tid::text,null,jsonb_build_object('position',p_position),'Nombramiento de cargo institucional');
  return tid;
end$$;

create or replace function public.get_board_members() returns jsonb
language sql stable security definer set search_path=public as $$
select coalesce(jsonb_agg(jsonb_build_object('term',to_jsonb(t),'person',to_jsonb(p)) order by t.position),'[]'::jsonb)
from position_terms t join persons p on p.id=t.person_id
where t.organization_id=current_organization_id() and t.status='vigente' and has_permission('governance.read')$$;

create or replace function public.create_resolution(p_number text,p_resolution_type text,p_title text,p_content text,p_effective_date date,p_meeting_id uuid default null,p_source_regulation text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();rid uuid;
begin
  if not has_permission('governance.manage') then raise exception 'FORBIDDEN';end if;
  if length(trim(p_title))<5 or length(trim(p_content))<10 then raise exception 'RESOLUTION_INCOMPLETE';end if;
  insert into resolutions(organization_id,number,resolution_type,status,title,content,meeting_id,effective_date,source_regulation,requires_validation,created_by)
  values(org,p_number,(p_resolution_type)::resolution_type,'aprobada',trim(p_title),trim(p_content),p_meeting_id,p_effective_date,p_source_regulation,coalesce(p_source_regulation is not null,true),auth.uid()) returning id into rid;
  perform write_audit_event('create','resolution',rid::text,null,jsonb_build_object('number',p_number),'Nueva resolución');
  return rid;
end$$;

create or replace function public.create_meeting(p_reunion_type text,p_title text,p_scheduled_at timestamptz,p_place text default null,p_board_id uuid default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();mid uuid;
begin
  if not has_permission('governance.manage') then raise exception 'FORBIDDEN';end if;
  insert into meetings(organization_id,reunion_type,status,title,scheduled_at,place,board_id,created_by)
  values(org,(p_reunion_type)::reunion_type,'programada',trim(p_title),p_scheduled_at,p_place,p_board_id,auth.uid()) returning id into mid;
  perform write_audit_event('create','meeting',mid::text,null,jsonb_build_object('title',p_title),'Nueva reunión');
  return mid;
end$$;

create or replace function public.save_minutes(p_meeting_id uuid,p_content text) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();mid uuid;
begin
  if not has_permission('governance.manage') then raise exception 'FORBIDDEN';end if;
  if exists(select 1 from minutes where meeting_id=p_meeting_id and organization_id=org) then
    update minutes set content=p_content,version=version+1,updated_at=now() where meeting_id=p_meeting_id returning id into mid;
  else
    insert into minutes(organization_id,meeting_id,content,created_by) values(org,p_meeting_id,p_content,auth.uid()) returning id into mid;
  end if;
  perform write_audit_event('update','minutes',mid::text,null,jsonb_build_object('meeting',p_meeting_id),'Acta de reunión');
  return mid;
end$$;

create or replace function public.create_committee(p_name text,p_type text default 'otro',p_purpose text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();cid uuid;
begin
  if not has_permission('governance.manage') then raise exception 'FORBIDDEN';end if;
  insert into committees(organization_id,name,committee_type,purpose,created_at)
  values(org,trim(p_name),(p_type)::committee_type,p_purpose,now()) returning id into cid;
  perform write_audit_event('create','committee',cid::text,null,jsonb_build_object('name',p_name),'Nuevo comité');
  return cid;
end$$;

create or replace function public.create_project(p_code text,p_name text,p_funding text default 'fondo_propio',p_description text default null,p_budget numeric default 0,p_resolution_id uuid default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();prid uuid;
begin
  if not has_permission('governance.manage') then raise exception 'FORBIDDEN';end if;
  insert into projects(organization_id,code,name,funding,description,budget,resolution_id,created_by)
  values(org,upper(trim(p_code)),trim(p_name),(p_funding)::project_funding,p_description,coalesce(p_budget,0),p_resolution_id,auth.uid()) returning id into prid;
  perform write_audit_event('create','project',prid::text,null,jsonb_build_object('code',p_code),'Nuevo proyecto');
  return prid;
end$$;

create or replace function public.get_governance_summary() returns jsonb
language sql stable security definer set search_path=public as $$
select jsonb_build_object(
  'positions',(select count(*) from position_terms where organization_id=current_organization_id() and status='vigente'),
  'meetings',(select count(*) from meetings where organization_id=current_organization_id() and status<>'cancelada'),
  'resolutions',(select count(*) from resolutions where organization_id=current_organization_id() and status in('aprobada','publicada')),
  'projects',(select count(*) from projects where organization_id=current_organization_id() and status in('aprobado','en_ejecucion'))
)$$;

-- ---------------------------------------------------------------------------
-- RLS + permisos
-- ---------------------------------------------------------------------------
insert into permissions(code,description) values('governance.read','Consultar gobierno institucional'),('governance.manage','Administrar gobierno institucional') on conflict(code) do update set description=excluded.description;
insert into role_permissions(role_id,permission_code) select r.id,p.code from roles r cross join permissions p where r.code='superadmin' and p.code in('governance.read','governance.manage') on conflict do nothing;

alter table public.position_terms enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.committees enable row level security;
alter table public.committee_members enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_attendees enable row level security;
alter table public.minutes enable row level security;
alter table public.resolutions enable row level security;
alter table public.projects enable row level security;

create policy position_terms_read on position_terms for select using(organization_id=current_organization_id() and has_permission('governance.read'));
create policy boards_read on boards for select using(organization_id=current_organization_id() and has_permission('governance.read'));
create policy board_members_read on board_members for select using(exists(select 1 from boards b where b.id=board_id and b.organization_id=current_organization_id()) and has_permission('governance.read'));
create policy committees_read on committees for select using(organization_id=current_organization_id() and has_permission('governance.read'));
create policy committee_members_read on committee_members for select using(exists(select 1 from committees c where c.id=committee_id and c.organization_id=current_organization_id()) and has_permission('governance.read'));
create policy meetings_read on meetings for select using(organization_id=current_organization_id() and has_permission('governance.read'));
create policy meeting_attendees_read on meeting_attendees for select using(exists(select 1 from meetings m where m.id=meeting_id and m.organization_id=current_organization_id()) and has_permission('governance.read'));
create policy minutes_read on minutes for select using(organization_id=current_organization_id() and has_permission('governance.read'));
create policy resolutions_read on resolutions for select using(organization_id=current_organization_id() and has_permission('governance.read'));
create policy projects_read on projects for select using(organization_id=current_organization_id() and has_permission('governance.read'));

revoke insert,update,delete on position_terms,boards,board_members,committees,committee_members,meetings,meeting_attendees,minutes,resolutions,projects from authenticated;

commit;
