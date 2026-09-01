-- V5 · Lecturas de campo (Field PWA)
-- Captura en sitio por técnicos: GPS, foto del medidor, cola offline.
-- Cierra el loop: Incidentes → Órdenes → Captura en campo → Facturación.
create type public.field_reading_status as enum('captured','synced','validated','rejected');

create table public.field_readings(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references organizations(id) on delete cascade,
 connection_id uuid not null references water_connections(id),
 batch_id uuid references meter_reading_batches(id),
 technician_id uuid not null references profiles(id),
 reading_number text not null,
 previous_reading numeric(12,3) not null default 0,
 current_reading numeric(12,3) not null,
 consumption numeric(12,3) generated always as (current_reading - previous_reading) stored,
 status field_reading_status not null default 'captured',
 gps_lat double precision,
 gps_lng double precision,
 gps_accuracy_m numeric(8,2),
 photo_url text,
 photo_bucket text,
 notes text,
 anomaly_code text,
 captured_at timestamptz not null default now(),
 synced_at timestamptz,
 validated_at timestamptz,
 offline_id text,
 created_at timestamptz not null default now(),
 unique(organization_id,reading_number)
);

create index field_readings_status_idx on public.field_readings(organization_id,status);
create index field_readings_technician_idx on public.field_readings(organization_id,technician_id);
create index field_readings_connection_idx on public.field_readings(connection_id);
create index field_readings_batch_idx on public.field_readings(batch_id);
create index field_readings_offline_idx on public.field_readings(organization_id,offline_id) where offline_id is not null;

insert into permissions(code,description) values
 ('field.read','Capturar lecturas de campo'),
 ('field.manage','Validar y sincronizar lecturas de campo')
on conflict(code) do update set description=excluded.description;
insert into role_permissions(role_id,permission_code)
select r.id,p.code from roles r cross join permissions p
where r.code='superadmin' and p.code in('field.read','field.manage') on conflict do nothing;
insert into role_permissions(role_id,permission_code)
select r.id,p.code from roles r cross join permissions p
where r.code='technician' and p.code in('field.read','field.manage') on conflict do nothing;

alter table public.field_readings enable row level security;
create policy field_readings_read on public.field_readings
 for select using(organization_id=current_organization_id() and has_permission('field.read'));
create policy field_readings_manage on public.field_readings
 for insert with check(organization_id=current_organization_id() and has_permission('field.manage'));
create policy field_readings_update on public.field_readings
 for update using(organization_id=current_organization_id() and has_permission('field.manage'));
revoke delete on public.field_readings from authenticated;

create or replace function public.list_field_readings(p_status text default null,p_technician_id uuid default null,p_batch_id uuid default null)
returns setof jsonb language sql stable security definer set search_path=public as $$
select to_jsonb(fr) from field_readings fr
join water_connections wc on wc.id=fr.connection_id
join subscribers s on s.id=wc.subscriber_id
where fr.organization_id=current_organization_id() and has_permission('field.read')
and (p_status is null or fr.status::text=p_status)
and (p_technician_id is null or fr.technician_id=p_technician_id)
and (p_batch_id is null or fr.batch_id=p_batch_id)
order by fr.captured_at desc$$;

create or replace function public.get_field_reading(p_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
select to_jsonb(fr) from field_readings fr
where fr.id=p_id and fr.organization_id=current_organization_id() and has_permission('field.read')$$;

create or replace function public.capture_field_reading(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r field_readings;
begin
 if not has_permission('field.manage') then raise exception 'FORBIDDEN'; end if;
 if length(trim(coalesce(p_payload->>'connection_id','')))=0 then raise exception 'CONNECTION_REQUIRED'; end if;
 if (p_payload->>'current_reading') is null then raise exception 'READING_REQUIRED'; end if;
 if (p_payload->>'previous_reading')::numeric > (p_payload->>'current_reading')::numeric then raise exception 'READING_DECREASE'; end if;
 insert into field_readings(organization_id,connection_id,batch_id,technician_id,reading_number,previous_reading,current_reading,status,gps_lat,gps_lng,gps_accuracy_m,photo_url,photo_bucket,notes,anomaly_code,captured_at,offline_id)
 values(current_organization_id(),(p_payload->>'connection_id')::uuid,nullif(p_payload->>'batch_id','')::uuid,auth.uid(),next_document_number('field_reading','FLD',5),(p_payload->>'previous_reading')::numeric,(p_payload->>'current_reading')::numeric,'captured',nullif(p_payload->>'gps_lat','')::double precision,nullif(p_payload->>'gps_lng','')::double precision,nullif(p_payload->>'gps_accuracy_m','')::numeric,nullif(p_payload->>'photo_url',''),nullif(p_payload->>'photo_bucket',''),nullif(p_payload->>'notes',''),nullif(p_payload->>'anomaly_code',''),coalesce((p_payload->>'captured_at')::timestamptz,now()),nullif(p_payload->>'offline_id',''))
 returning * into r;
 perform write_audit_event('field_reading.capture','field_readings',r.id::text,null,to_jsonb(r),null);
 return to_jsonb(r);
end$$;

create or replace function public.sync_field_readings(p_readings jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare item jsonb; r field_readings; synced int := 0; dupes int := 0;
begin
 if not has_permission('field.manage') then raise exception 'FORBIDDEN'; end if;
 for item in select * from jsonb_array_elements(p_readings)
 loop
  if exists(select 1 from field_readings where offline_id=item->>'offline_id' and organization_id=current_organization_id()) then
   dupes := dupes + 1;
  else
   insert into field_readings(organization_id,connection_id,batch_id,technician_id,reading_number,previous_reading,current_reading,status,gps_lat,gps_lng,gps_accuracy_m,photo_url,photo_bucket,notes,anomaly_code,captured_at,offline_id,synced_at)
   values(current_organization_id(),(item->>'connection_id')::uuid,nullif(item->>'batch_id','')::uuid,coalesce(nullif(item->>'technician_id','')::uuid,auth.uid()),next_document_number('field_reading','FLD',5),(item->>'previous_reading')::numeric,(item->>'current_reading')::numeric,'synced',nullif(item->>'gps_lat','')::double precision,nullif(item->>'gps_lng','')::double precision,nullif(item->>'gps_accuracy_m','')::numeric,nullif(item->>'photo_url',''),nullif(item->>'photo_bucket',''),nullif(item->>'notes',''),nullif(item->>'anomaly_code',''),coalesce((item->>'captured_at')::timestamptz,now()),item->>'offline_id',now())
   returning * into r;
   synced := synced + 1;
  end if;
 end loop;
 perform write_audit_event('field_reading.sync','field_readings',null,null,jsonb_build_object('synced',synced,'dupes',dupes),null);
 return jsonb_build_object('synced',synced,'dupes',dupes);
end$$;

create or replace function public.validate_field_reading(p_id uuid,p_status text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare old field_readings; r field_readings;
begin
 if not has_permission('field.manage') then raise exception 'FORBIDDEN'; end if;
 if p_status not in('validated','rejected') then raise exception 'INVALID_STATUS'; end if;
 select * into old from field_readings where id=p_id and organization_id=current_organization_id() for update;
 if old.id is null then raise exception 'NOT_FOUND'; end if;
 if old.status not in('captured','synced') then raise exception 'ALREADY_VALIDATED'; end if;
 update field_readings set status=p_status::field_reading_status,
   validated_at=now(),
   anomaly_code=case when p_status='rejected' then coalesce(nullif(old.anomaly_code,''),'rejected') else old.anomaly_code end
 where id=p_id returning * into r;
 perform write_audit_event('field_reading.validate','field_readings',r.id::text,to_jsonb(old),to_jsonb(r),null);
 return to_jsonb(r);
end$$;

create or replace function public.upload_field_photo(p_reading_id uuid,p_bucket text,p_path text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r field_readings;
begin
 if not has_permission('field.manage') then raise exception 'FORBIDDEN'; end if;
 update field_readings set photo_url=p_path,photo_bucket=p_bucket
 where id=p_reading_id and organization_id=current_organization_id() returning * into r;
 if r.id is null then raise exception 'NOT_FOUND'; end if;
 perform write_audit_event('field_reading.photo','field_readings',r.id::text,null,to_jsonb(r),null);
 return to_jsonb(r);
end$$;

grant execute on function public.list_field_readings(text,uuid,uuid) to authenticated;
grant execute on function public.get_field_reading(uuid) to authenticated;
grant execute on function public.capture_field_reading(jsonb) to authenticated;
grant execute on function public.sync_field_readings(jsonb) to authenticated;
grant execute on function public.validate_field_reading(uuid,text) to authenticated;
grant execute on function public.upload_field_photo(uuid,text,text) to authenticated;
