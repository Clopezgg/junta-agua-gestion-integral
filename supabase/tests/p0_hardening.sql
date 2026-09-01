-- ============================================================================
-- P0 hardening test (migración 202609010001)
-- Verifica con dos organizaciones reales:
--   P0#1  múltiples abonados por organización (índice corregido)
--   P0#2  aislamiento cross-org en RPCs (assert_org_scope)
--   P0#3  MFA / AAL2 centralizado (require_permission + require_aal2)
-- Falla (exit != 0) ante cualquier invariante roto. Mutación solo en orgs de
-- prueba dedicadas (sufijo _p0t), no toca la organización de la semilla.
-- ============================================================================
\set ON_ERROR_STOP on

do $$
declare
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  oa uuid; ob uuid; ra uuid; rb uuid;
 begin
  -- organizaciones aisladas de prueba
  insert into public.organizations(name) select 'P0TestA '||to_char(now(),'YYYYMMDDHH24MISS') where not exists (select 1 from public.organizations where name like 'P0TestA %');
  insert into public.organizations(name) select 'P0TestB '||to_char(now(),'YYYYMMDDHH24MISS') where not exists (select 1 from public.organizations where name like 'P0TestB %');
  select id into oa from public.organizations where name like 'P0TestA %' order by created_at desc limit 1;
  select id into ob from public.organizations where name like 'P0TestB %' order by created_at desc limit 1;
  -- usuarios auth
  insert into auth.users(id) values(ua),(ub) on conflict do nothing;
  insert into public.profiles(id,organization_id,full_name,username) values(ua,oa,'P0UserA','p0usera'),(ub,ob,'P0UserB','p0userb')
    on conflict do nothing;
  insert into public.roles(organization_id,code,name) values(oa,'superadmin','P0A'),(ob,'superadmin','P0B')
    on conflict(organization_id,code) do nothing;
  select id into ra from public.roles where organization_id=oa and code='superadmin';
  select id into rb from public.roles where organization_id=ob and code='superadmin';
  insert into public.role_permissions(role_id,permission_code)
    select r.id, p.code from public.roles r cross join public.permissions p where r.id in (ra,rb)
    on conflict do nothing;
  insert into public.user_roles(user_id,role_id) values(ua,ra),(ub,rb) on conflict do nothing;
  -- P0#1: múltiples abonados en la misma organización
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ua::text, 'role','authenticated','aal','aal2')::text, true);
  -- dos subscribes (relación cliente) y dos personas, cada una con su abonado
  perform public.create_subscriber('{"document_type":"dni","document_number":"0801-1990-10001","issuing_country":"HND","full_name":"P0 Persona Uno","whatsapp":"11111111","address":"a1","sector":"norte"}');
  perform public.create_subscriber('{"document_type":"dni","document_number":"0801-1990-10002","issuing_country":"HND","full_name":"P0 Persona Dos","whatsapp":"22222222","address":"a2","sector":"norte"}');
  perform public.create_person('P0 Persona Uno','dni','0801-1990-10001','HND');
  perform public.create_person('P0 Persona Dos','dni','0801-1990-10002','HND');
  -- enlazar persona->subscriber->abonado
  insert into public.abonados(organization_id,person_id,subscriber_id,created_by)
  select oa, pp.id, s.id, ua
  from public.persons pp
  join public.subscribers s on s.organization_id=pp.organization_id
  where pp.organization_id=oa and s.normalized_name=pp.normalized_name
  on conflict do nothing;
  if (select count(*) from public.abonados where organization_id=oa) < 2 then
    raise exception 'P0#1 FAIL: no permite múltiples abonados por organización';
  end if;
  raise notice 'P0#1 OK: múltiples abonados por org';
  -- abonado en org B para pruebas cross-org
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ub::text, 'role','authenticated','aal','aal2')::text, true);
  perform public.create_subscriber('{"document_type":"dni","document_number":"0801-1990-20001","issuing_country":"HND","full_name":"P0 Persona OrgB","whatsapp":"33333333","address":"b1","sector":"sur"}');
end$$;

-- P0#2: cross-org isolation (OrgA usa subscriber real de OrgB)
do $$
declare ua uuid; sub_b uuid;
begin
  select id into ua from public.profiles where username='p0usera';
  select s.id into sub_b
    from public.subscribers s
    join public.profiles p on p.organization_id = s.organization_id
    where p.username='p0userb' order by s.created_at desc limit 1;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ua::text, 'role','authenticated','aal','aal2')::text, true);
  if sub_b is null then
    raise exception 'P0#2 SETUP: sin subscriber en org B';
  end if;
  begin
    perform public.create_water_connection(sub_b, '{"service_type":"residential","address":"x","sector":"norte"}');
    raise exception 'P0#2 FAIL: permitió acceso cross-org';
  exception when others then
    if not (sqlerrm like 'NOT_FOUND%') then
      raise exception 'P0#2 FAIL: error inesperado %', sqlerrm;
    end if;
  end;
  raise notice 'P0#2 OK: cross-org rechazado (NOT_FOUND)';
end$$;

-- P0#2b: control positivo mismo-org debe funcionar
do $$
declare ua uuid; sa uuid; cid uuid;
begin
  select id into ua from public.profiles where username='p0usera';
  select id into sa from public.subscribers
    where organization_id=(select organization_id from public.profiles where id=ua)
    order by created_at desc limit 1;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ua::text, 'role','authenticated','aal','aal2')::text, true);
  if sa is null then raise exception 'P0#2b SETUP: sin subscriber en org A'; end if;
  cid := public.create_water_connection(sa, '{"service_type":"residential","address":"calle 1","sector":"norte"}');
  if cid is null then raise exception 'P0#2b FAIL: mismo-org no conectó'; end if;
  raise notice 'P0#2b OK: mismo-org conectado';
end$$;

-- P0#3: AAL2 — sesión aal1 con permiso válido debe rechazarse en mutación sensible
do $$
declare ua uuid;
begin
  select id into ua from public.profiles where username='p0usera';
  perform set_config('request.jwt.claims', jsonb_build_object('sub', ua::text, 'role','authenticated','aal','aal1')::text, true);
  begin
    perform public.create_water_connection(
      (select id from public.subscribers where organization_id=(select organization_id from public.profiles where id=ua) order by created_at desc limit 1),
      '{"service_type":"residential","address":"x","sector":"norte"}');
    raise exception 'P0#3 FAIL: mutación sensible permitida con AAL1';
  exception when others then
    if not (sqlerrm like 'MFA_REQUIRED%') then
      raise exception 'P0#3 FAIL: error inesperado %', sqlerrm;
    end if;
  end;
  raise notice 'P0#3 OK: AAL1 rechazado (MFA_REQUIRED), AAL2 requerido';
end$$;
