-- V5-FASE2 · Modelo de identidad separado: PERSONA ≠ ABONADO ≠ INMUEBLE ≠ CONTRATO ≠ PEGUE.
-- Se crea el maestro de personas, la relación abonado, los predios/ubicaciones de servicio y
-- los contratos de servicio. Se vincula a water_connections (pegue) conservando la integridad.
begin;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type public.person_gender as enum('femenino','masculino','otro');
create type public.property_type as enum('residencial','comercial','comunitaria','institucional');
create type public.contract_status as enum('activo','suspendido','cancelado','extinto');
create type public.contract_type as enum('servicio_agua','servicio_alcantarillado','ambos');

-- ---------------------------------------------------------------------------
-- PERSONAS (registro maestro de personas físicas y jurídicas de contacto)
-- ---------------------------------------------------------------------------
create table public.persons(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  kind text not null default 'fisica' check(kind in('fisica','juridica')),
  full_name text not null,
  normalized_name text not null,
  birth_date date,
  gender person_gender,
  document_type identity_document_type,
  issuing_country char(3),
  document_number text,
  normalized_document text,
  whatsapp text,
  email text,
  phone text,
  address text,
  sector text,
  notes text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index persons_name_trgm on persons using gin(normalized_name gin_trgm_ops);
create index persons_org_idx on persons(organization_id);
create unique index persons_identity_unique on persons(organization_id,document_type,issuing_country,normalized_document) where normalized_document is not null;

-- ---------------------------------------------------------------------------
-- ABONADOS (relación de cliente sobre una persona) — complementa subscribers
-- ---------------------------------------------------------------------------
create table public.abonados(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  person_id uuid not null references persons(id),
  subscriber_id uuid references subscribers(id) on delete set null,
  status text not null default 'activo' check(status in('activo','inactivo','suspendido','archivado')),
  category text default 'domestico' check(category in('domestico','comercial','comunitario','institucional')),
  since_date date,
  notes text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique(organization_id,person_id)
);
create unique index abonados_subscriber_idx on abonados(organization_id) where subscriber_id is not null;

-- ---------------------------------------------------------------------------
-- PREDIOS / UBICACIONES DE SERVICIO (INMUEBLE)
-- ---------------------------------------------------------------------------
create table public.service_locations(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  code text not null,
  property_type property_type not null default 'residencial',
  address text not null,
  sector text not null,
  cadastral_ref text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  notes text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique(organization_id,code)
);
create index service_locations_org_idx on service_locations(organization_id,sector);

-- ---------------------------------------------------------------------------
-- CONTRATOS DE SERVICIO (CONTRATO) — abonado ↔ predio ↔ pegue
-- ---------------------------------------------------------------------------
create table public.service_contracts(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  abonado_id uuid not null references abonados(id),
  location_id uuid references service_locations(id),
  connection_id uuid references water_connections(id),
  contract_type contract_type not null default 'servicio_agua',
  status contract_status not null default 'activo',
  start_date date not null,
  end_date date,
  tariff_definition_id uuid references tariff_definitions(id),
  notes text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,connection_id)
);
create index service_contracts_abonado_idx on service_contracts(organization_id,abonado_id);
create unique index one_active_contract_per_connection on service_contracts(connection_id) where status='activo' and connection_id is not null;

-- ---------------------------------------------------------------------------
-- FUNCIONES
-- ---------------------------------------------------------------------------
create or replace function public.create_person(p_full_name text,p_document_type text,p_document_number text,p_issuing_country text default 'HND',p_kind text default 'fisica',p_birth_date date default null,p_whatsapp text default null,p_email text default null,p_phone text default null,p_address text default null,p_sector text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();pid uuid;doc_type identity_document_type:=(p_document_type)::identity_document_type;norm text:=normalize_identifier(p_document_number);
begin
  if not has_permission('subscribers.create') then raise exception 'FORBIDDEN';end if;
  if p_document_number is not null and p_document_type is not null then
    if exists(select 1 from persons where organization_id=org and document_type=doc_type and issuing_country=upper(p_issuing_country) and normalized_document=norm) then
      raise exception 'DUPLICATE_IDENTITY';
    end if;
  end if;
  insert into persons(organization_id,kind,full_name,normalized_name,birth_date,document_type,issuing_country,document_number,normalized_document,whatsapp,email,phone,address,sector,created_by)
  values(org,p_kind,trim(p_full_name),normalize_person_name(p_full_name),p_birth_date,doc_type,upper(p_issuing_country),p_document_number,norm,nullif(p_whatsapp,''),nullif(p_email,''),nullif(p_phone,''),p_address,p_sector,auth.uid()) returning id into pid;
  perform write_audit_event('create','person',pid::text,null,jsonb_build_object('full_name',p_full_name),'Registro de persona');
  return pid;
exception when unique_violation then raise exception 'DUPLICATE_IDENTITY';
end$$;

create or replace function public.register_service_contract(p_abonado_id uuid,p_location_id uuid,p_connection_id uuid,p_contract_type text default 'servicio_agua',p_start_date date default current_date,p_tariff_definition_id uuid default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();cid uuid;
begin
  if not has_permission('subscribers.update') then raise exception 'FORBIDDEN';end if;
  if not exists(select 1 from abonados where id=p_abonado_id and organization_id=org) then raise exception 'ABONADO_NOT_FOUND';end if;
  if p_connection_id is not null and not exists(select 1 from water_connections where id=p_connection_id and organization_id=org) then raise exception 'CONNECTION_NOT_FOUND';end if;
  insert into service_contracts(organization_id,abonado_id,location_id,connection_id,contract_type,start_date,tariff_definition_id,created_by)
  values(org,p_abonado_id,p_location_id,p_connection_id,(p_contract_type)::contract_type,p_start_date,p_tariff_definition_id,auth.uid()) returning id into cid;
  perform write_audit_event('create','service_contract',cid::text,null,jsonb_build_object('abonado_id',p_abonado_id),'Nuevo contrato de servicio');
  return cid;
exception when unique_violation then raise exception 'DUPLICATE_ACTIVE_CONTRACT';
end$$;

create or replace function public.get_abonado_360(p_abonado_id uuid) returns jsonb
language sql stable security definer set search_path=public as $$
select jsonb_build_object(
  'abonado',to_jsonb(a),
  'persona',(select to_jsonb(p) from persons p where p.id=a.person_id),
  'subscriber',(select to_jsonb(s2) from subscribers s2 where s2.id=a.subscriber_id),
  'locations',coalesce((select jsonb_agg(to_jsonb(sl)) from service_locations sl join service_contracts sc on sc.location_id=sl.id where sc.abonado_id=a.id),'[]'::jsonb),
  'contracts',coalesce((select jsonb_agg(to_jsonb(sc)) from service_contracts sc where sc.abonado_id=a.id),'[]'::jsonb),
  'connections',coalesce((select jsonb_agg(to_jsonb(w)) from water_connections w join service_contracts sc on sc.connection_id=w.id where sc.abonado_id=a.id),'[]'::jsonb)
) from abonados a where a.id=p_abonado_id and a.organization_id=current_organization_id() and has_permission('subscribers.read')$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.persons enable row level security;
alter table public.abonados enable row level security;
alter table public.service_locations enable row level security;
alter table public.service_contracts enable row level security;
create policy persons_read on persons for select using(organization_id=current_organization_id() and has_permission('subscribers.read'));
create policy abonados_read on abonados for select using(organization_id=current_organization_id() and has_permission('subscribers.read'));
create policy locations_read on service_locations for select using(organization_id=current_organization_id() and has_permission('subscribers.read'));
create policy contracts_read on service_contracts for select using(organization_id=current_organization_id() and has_permission('subscribers.read'));
revoke insert,update,delete on persons,abonados,service_locations,service_contracts from authenticated;

commit;
