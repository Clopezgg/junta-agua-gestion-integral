-- ============================================================================
-- 202609010002 — V5 ABONADO 360
-- Conecta el modelo de identidad V5 (persona -> abonado -> contrato -> pegue)
-- con la operación cotidiana: RPC para crear el abonado y para buscarlo, lo que
-- habilita la ficha "Abonado 360" en el frontend. Sin cambios destructivos.
-- ============================================================================
begin;

-- ----------------------------------------------------------------------------
-- create_abonado — crea la relación de cliente (ABONADO) sobre una PERSONA y
-- opcionalmente la vincula a un ABONADO legacy (subscriber) ya existente.
-- ----------------------------------------------------------------------------
create or replace function public.create_abonado(p_person_id uuid,p_subscriber_id uuid default null,p_category text default 'domestico',p_since_date date default null,p_notes text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();aid uuid;
begin
  if not has_permission('subscribers.create') then raise exception 'FORBIDDEN';end if;
  if not exists(select 1 from persons where id=p_person_id and organization_id=org) then raise exception 'PERSON_NOT_FOUND';end if;
  if p_subscriber_id is not null and not exists(select 1 from subscribers where id=p_subscriber_id and organization_id=org) then raise exception 'SUBSCRIBER_NOT_FOUND';end if;
  insert into abonados(organization_id,person_id,subscriber_id,status,category,since_date,notes,created_by)
  values(org,p_person_id,p_subscriber_id,'activo',p_category,p_since_date,p_notes,auth.uid()) returning id into aid;
  perform write_audit_event('create','abonado',aid::text,null,jsonb_build_object('person_id',p_person_id,'category',p_category),'Nuevo abonado');
  return aid;
exception when unique_violation then raise exception 'DUPLICATE_ABONADO';
end$$;

-- ----------------------------------------------------------------------------
-- search_abonados — búsqueda (nombre, documento, código de abonado/subscriber,
-- sector) sobre el maestro de abonados para alimentar el selector de la ficha 360.
-- ----------------------------------------------------------------------------
create or replace function public.search_abonados(p_query text default '',p_limit integer default 50) returns table(
  abonado_id uuid,
  person_id uuid,
  subscriber_id uuid,
  full_name text,
  masked_document text,
  category text,
  status text,
  subscriber_code text,
  sector text,
  connection_count bigint
)
language sql stable security definer set search_path=public as $$
select
  a.id::uuid,
  a.person_id::uuid,
  a.subscriber_id::uuid,
  p.full_name::text,
  case
    when p.document_number is null then null
    else left(p.document_number,1)||'***'||right(p.document_number,3)
  end::text as masked_document,
  a.category::text,
  a.status::text,
  s.code::text as subscriber_code,
  coalesce(p.sector,s.sector)::text as sector,
  (select count(*)::bigint from water_connections w
     join service_contracts c on c.connection_id=w.id
    where c.abonado_id=a.id)::bigint as connection_count
from abonados a
join persons p on p.id=a.person_id
left join subscribers s on s.id=a.subscriber_id
where a.organization_id=current_organization_id()
  and has_permission('subscribers.read')
  and (
    p.full_name ilike '%'||coalesce(p_query,'')||'%'
    or upper(p.normalized_document)=upper(coalesce(p_query,''))
    or s.code ilike '%'||coalesce(p_query,'')||'%'
    or p.sector ilike '%'||coalesce(p_query,'')||'%'
    or s.sector ilike '%'||coalesce(p_query,'')||'%'
  )
order by p.full_name
limit greatest(1,p_limit);
$$;

commit;
