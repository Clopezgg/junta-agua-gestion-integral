-- V5 · Incidencias (semántica de incidencia para Operación)
-- Cierra el hueco del GAP V5 §4.1: ausencia de "incidencia" como entidad.
-- Una incidencia (reporte de un problema de servicio) es el origen del
-- flujo: reporte → triaje → orden de trabajo → resolución.
create type public.incident_category as enum('fuga','calidad_agua','corte','facturacion','baja_presion','medidor','infraestructura','saneamiento','otro');

create table public.incidents(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references organizations(id) on delete cascade,
 incident_number text not null,
 category incident_category not null default 'otro',
 title text not null,
 description text not null,
 status text not null default 'nuevo' check(status in('nuevo','en_atencion','en_espera','resuelto','cerrado')),
 priority text not null default 'normal' check(priority in('low','normal','high','urgent')),
 reporter_name text,
 reporter_phone text,
 subscriber_id uuid references subscribers(id),
 connection_id uuid references water_connections(id),
 work_order_id uuid references work_orders(id),
 reported_at timestamptz not null default now(),
 resolved_at timestamptz,
 created_by uuid not null references profiles(id),
 created_at timestamptz not null default now(),
 unique(organization_id,incident_number)
);
create index incidents_status_idx on public.incidents(organization_id,status);
create index incidents_category_idx on public.incidents(organization_id,category);
create index incidents_work_order_idx on public.incidents(work_order_id);

insert into permissions(code,description) values
 ('incidents.read','Consultar incidencias'),
 ('incidents.manage','Atender y tramitar incidencias')
on conflict(code) do update set description=excluded.description;
insert into role_permissions(role_id,permission_code)
select r.id,p.code from roles r cross join permissions p
where r.code='superadmin' and p.code in('incidents.read','incidents.manage') on conflict do nothing;

alter table public.incidents enable row level security;
create policy incidents_read on public.incidents for select using(organization_id=current_organization_id() and has_permission('incidents.read'));
create policy incidents_manage on public.incidents for update using(organization_id=current_organization_id() and has_permission('incidents.manage'));
revoke insert,update,delete on public.incidents from authenticated;

create or replace function public.list_incidents(p_status text default null,p_category text default null)
returns setof jsonb language sql stable security definer set search_path=public as $$
select to_jsonb(i) from incidents i
where organization_id=current_organization_id() and has_permission('incidents.read')
and (p_status is null or i.status=p_status)
and (p_category is null or i.category::text=p_category)
order by (i.status='nuevo') desc, i.reported_at desc$$;

create or replace function public.get_incident(p_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
select to_jsonb(i) from incidents i
where i.id=p_id and organization_id=current_organization_id() and has_permission('incidents.read')$$;

create or replace function public.create_incident(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r incidents;
begin
 if not has_permission('incidents.manage') then raise exception 'FORBIDDEN'; end if;
 if length(trim(coalesce(p_payload->>'title','')))<3 then raise exception 'TITLE_REQUIRED'; end if;
 if length(trim(coalesce(p_payload->>'description','')))<5 then raise exception 'DESCRIPTION_REQUIRED'; end if;
 insert into incidents(organization_id,incident_number,category,title,description,status,priority,reporter_name,reporter_phone,subscriber_id,connection_id,work_order_id,reported_at,created_by)
 values(current_organization_id(),next_document_number('incident','INC',5),coalesce((p_payload->>'category')::incident_category,'otro'),trim(p_payload->>'title'),trim(p_payload->>'description'),'nuevo',coalesce((p_payload->>'priority')::text,'normal'),nullif(p_payload->>'reporter_name',''),nullif(p_payload->>'reporter_phone',''),nullif(p_payload->>'subscriber_id','')::uuid,nullif(p_payload->>'connection_id','')::uuid,nullif(p_payload->>'work_order_id','')::uuid,now(),auth.uid())
 returning * into r;
 perform write_audit_event('incident.create','incidents',r.id::text,null,to_jsonb(r),null);
 return to_jsonb(r);
end$$;

create or replace function public.update_incident(p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare old incidents; r incidents;
begin
 if not has_permission('incidents.manage') then raise exception 'FORBIDDEN'; end if;
 select * into old from incidents where id=p_id and organization_id=current_organization_id() for update;
 if old.id is null then raise exception 'NOT_FOUND'; end if;
 update incidents set
  status=coalesce(nullif(p_payload->>'status',''),old.status),
  category=coalesce((p_payload->>'category')::incident_category,old.category),
  priority=coalesce((p_payload->>'priority')::text,old.priority),
  work_order_id=coalesce(nullif(p_payload->>'work_order_id','')::uuid,old.work_order_id),
  resolved_at=case when (p_payload->>'status')='resuelto' then now() when (p_payload->>'status') in('nuevo','en_atencion','en_espera','cerrado') then null else old.resolved_at end
 where id=p_id returning * into r;
 perform write_audit_event('incident.update','incidents',r.id::text,to_jsonb(old),to_jsonb(r),p_payload->>'note');
 return to_jsonb(r);
end$$;

grant execute on function public.list_incidents(text,text) to authenticated;
grant execute on function public.get_incident(uuid) to authenticated;
grant execute on function public.create_incident(jsonb) to authenticated;
grant execute on function public.update_incident(uuid,jsonb) to authenticated;
