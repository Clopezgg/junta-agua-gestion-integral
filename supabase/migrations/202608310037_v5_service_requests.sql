-- V5-FASE3 · Solicitudes y reclamos (tickets de servicio al abonado).
begin;

create type public.request_channel as enum('presencial','telefonico','whatsapp','portal','correo');
create type public.request_type as enum('solicitud','reclamo','consulta','felicitacion');
create type public.request_status as enum('recibida','en_revision','en_proceso','resuelta','cerrada','rechazada');

create table public.service_requests(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  code text not null,
  request_type request_type not null default 'solicitud',
  channel request_channel not null default 'presencial',
  status request_status not null default 'recibida',
  abonado_id uuid references abonados(id),
  subscriber_id uuid references subscribers(id),
  connection_id uuid references water_connections(id),
  subject text not null,
  description text not null,
  priority text not null default 'normal' check(priority in('baja','normal','alta','urgente')),
  due_date date,
  resolution text,
  resolved_at timestamptz,
  resolved_by uuid references profiles(id),
  work_order_id uuid references work_orders(id),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);
create index service_requests_org_status on service_requests(organization_id,status);
create index service_requests_abonado on service_requests(organization_id,abonado_id);

create or replace function public.create_service_request(p_payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();rid uuid;n int;
begin
  if not has_permission('subscribers.create') then raise exception 'FORBIDDEN';end if;
  select count(*)+1 into n from service_requests where organization_id=org;
  insert into service_requests(organization_id,code,request_type,channel,status,abonado_id,subscriber_id,connection_id,subject,description,priority,due_date,created_by)
  values(org,'SOL-'||lpad(n::text,5,'0'),(p_payload->>'request_type')::request_type,(p_payload->>'channel')::request_channel,'recibida',
  nullif(p_payload->>'abonado_id','')::uuid,nullif(p_payload->>'subscriber_id','')::uuid,nullif(p_payload->>'connection_id','')::uuid,
  p_payload->>'subject',p_payload->>'description',coalesce(p_payload->>'priority','normal'),nullif(p_payload->>'due_date','')::date,auth.uid()) returning id into rid;
  perform write_audit_event('create','service_request',rid::text,null,jsonb_build_object('code','SOL-'||lpad(n::text,5,'0'),'type',p_payload->>'request_type'),'Nueva solicitud/reclamo');
  return rid;
end$$;

create or replace function public.resolve_service_request(p_request_id uuid,p_resolution text,p_status text default 'resuelta') returns void
language plpgsql security definer set search_path=public as $$
begin
  if not has_permission('operations.manage') then raise exception 'FORBIDDEN';end if;
  if length(trim(p_resolution))<10 then raise exception 'RESOLUTION_TOO_SHORT';end if;
  update service_requests set resolution=p_resolution,status=(p_status)::request_status,resolved_at=now(),resolved_by=auth.uid(),updated_at=now() where id=p_request_id and organization_id=current_organization_id();
  perform write_audit_event('update','service_request',p_request_id::text,null,jsonb_build_object('status',p_status),'Resolución de solicitud');
end$$;

create or replace function public.list_service_requests(p_limit int default 100,p_status text default null) returns setof service_requests
language sql stable security definer set search_path=public as $$
select * from service_requests where organization_id=current_organization_id() and has_permission('subscribers.read') and (p_status is null or status=(p_status)::request_status) order by created_at desc limit least(p_limit,200)$$;

alter table public.service_requests enable row level security;
create policy service_requests_read on service_requests for select using(organization_id=current_organization_id() and has_permission('subscribers.read'));
revoke insert,update,delete on service_requests from authenticated;

insert into permissions(code,description) values('communications.read','Consultar comunicaciones') on conflict(code) do update set description=excluded.description;
insert into role_permissions(role_id,permission_code) select r.id,p.code from roles r cross join permissions p where r.code='superadmin' and p.code in('communications.read') on conflict do nothing;

commit;
