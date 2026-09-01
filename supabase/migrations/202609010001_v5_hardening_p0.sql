-- ============================================================================
-- 202609010001 — V5 HARDENING P0
-- Correcciones estructurales de seguridad, integridad y concurrencia detectadas
-- en la auditoría. Sin cambios destructivos; backward-safe.
-- ============================================================================
begin;

-- ----------------------------------------------------------------------------
-- A. P0 #1 — CORREGIR abonados_subscriber_idx
-- El índice original era UNIQUE global sobre organization_id con subscriber_id
-- not null, lo que impedía tener más de un abonado con subscriber dentro de una
-- misma organización. La unicidad correcta es por (organization_id, subscriber_id).
-- ----------------------------------------------------------------------------
drop index if exists public.abonados_subscriber_idx;
create unique index if not exists abonados_org_subscriber_unique
  on public.abonados(organization_id, subscriber_id)
  where subscriber_id is not null;

-- ----------------------------------------------------------------------------
-- B. P0 #3 — COMPROBACIÓN CENTRALIZADA DE PERMISO + AAL2
-- require_permission(p_code, require_aal2) lanza excepción si el usuario no
-- tiene el permiso o si require_aal2=true y la sesión no es AAL2.
-- require_aal2() lanza si la sesión no es AAL2.
-- ----------------------------------------------------------------------------
create or replace function public.require_aal2() returns void
language plpgsql security definer set search_path=public as $$
begin
  if coalesce(auth.jwt()->>'aal','aal1') <> 'aal2' then
    raise exception 'MFA_REQUIRED';
  end if;
end$$;

create or replace function public.require_permission(p_code text, p_require_aal2 boolean default false) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not has_permission(p_code) then
    raise exception 'FORBIDDEN';
  end if;
  if p_require_aal2 then
    perform require_aal2();
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- C. P0 #2 — VALIDACIÓN CROSS-ORGANIZACIÓN PARA RPCs
-- assert_org_scope(p_table, p_entity_id) verifica que la entidad pertenezca a
-- la organización actual; si no, lanza NOT_FOUND (no filtra información).
-- ----------------------------------------------------------------------------
create or replace function public.assert_org_scope(p_table text, p_entity_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare org uuid := current_organization_id();
        v int;
begin
  if p_entity_id is null then
    return;
  end if;
  begin
    execute format('select 1 from %I where id = %L and organization_id = %L limit 1', p_table, p_entity_id, org) into v;
    if v is null then
      raise exception 'NOT_FOUND';
    end if;
  exception when undefined_table then
    raise exception 'INVALID_TARGET';
  end;
end$$;

-- ----------------------------------------------------------------------------
-- D. P0 #4 — REVOKE EXECUTE DE PUBLIC EN FUNCIONES SECURITY DEFINER
-- Asegura que ninguna función RPC quede ejecutable sin autenticación.
-- ----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname not in ('current_organization_id','has_permission','user_has_role','require_aal2','require_permission','assert_org_scope','normalize_identifier','normalize_person_name')
  loop
    execute format('revoke all on function %s from public', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
end$$;

-- ----------------------------------------------------------------------------
-- E. P0 #6 — SEMÁNTICA CORRECTA DE requires_validation EN RESOLUCIONES
-- Una resolución sin fuente legal NO debe marcarse como "no requiere validación".
-- requires_validation = NOT (tiene fuente legal). Devuelve TRUE si falta fuente.
-- ----------------------------------------------------------------------------
create or replace function public.create_resolution(p_number text,p_resolution_type text,p_title text,p_content text,p_effective_date date,p_meeting_id uuid default null,p_source_regulation text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();rid uuid;
begin
  perform require_permission('governance.manage', true);
  if length(trim(p_title))<5 or length(trim(p_content))<10 then raise exception 'RESOLUTION_INCOMPLETE';end if;
  if p_meeting_id is not null then perform assert_org_scope('meetings', p_meeting_id); end if;
  insert into resolutions(organization_id,number,resolution_type,status,title,content,meeting_id,effective_date,source_regulation,requires_validation,created_by)
  values(org,p_number,(p_resolution_type)::resolution_type,'aprobada',trim(p_title),trim(p_content),p_meeting_id,p_effective_date,p_source_regulation,
    (p_source_regulation is null or trim(p_source_regulation)=''),auth.uid()) returning id into rid;
  perform write_audit_event('create','resolution',rid::text,null,jsonb_build_object('number',p_number,'requires_validation',(p_source_regulation is null or trim(p_source_regulation)='')),'Nueva resolución');
  return rid;
end$$;

-- ----------------------------------------------------------------------------
-- F. P0 #7 — CORRELATIVOS SEGUROS FRENTE A CONCURRENCIA
-- Elimina el patrón count(*)+1 (riesgo de duplicados bajo inserción concurrente)
-- usando un advisory lock transaccional por (organización + dominio).
-- ----------------------------------------------------------------------------

-- F1. service_requests (037)
create or replace function public.create_service_request(p_payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();rid uuid;n int;
begin
  perform require_permission('subscribers.create');
  perform pg_advisory_xact_lock(hashtext(org::text||':service_request'));
  select count(*)+1 into n from service_requests where organization_id=org;
  insert into service_requests(organization_id,code,request_type,channel,status,abonado_id,subscriber_id,connection_id,subject,description,priority,due_date,created_by)
  values(org,'SOL-'||lpad(n::text,5,'0'),(p_payload->>'request_type')::request_type,(p_payload->>'channel')::request_channel,'recibida',
  nullif(p_payload->>'abonado_id','')::uuid,nullif(p_payload->>'subscriber_id','')::uuid,nullif(p_payload->>'connection_id','')::uuid,
  p_payload->>'subject',p_payload->>'description',coalesce(p_payload->>'priority','normal'),nullif(p_payload->>'due_date','')::date,auth.uid()) returning id into rid;
  perform write_audit_event('create','service_request',rid::text,null,jsonb_build_object('code','SOL-'||lpad(n::text,5,'0'),'type',p_payload->>'request_type'),'Nueva solicitud/reclamo');
  return rid;
end$$;

-- F2. payment_arrangements (038)
create or replace function public.create_payment_arrangement(p_subscriber_id uuid,p_total_debt numeric,p_installment_amount numeric,p_frequency text,p_first_due_date date,p_obligation_ids uuid[],p_notes text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();aid uuid;n int;numb int;d date;amt numeric;i int;
begin
  perform require_permission('obligations.manage', true);
  if p_subscriber_id is not null then perform assert_org_scope('subscribers', p_subscriber_id); end if;
  if p_installment_amount<=0 or p_total_debt<=0 then raise exception 'INVALID_AMOUNTS';end if;
  numb:=ceil(p_total_debt/p_installment_amount);
  perform pg_advisory_xact_lock(hashtext(org::text||':payment_arrangement'));
  select count(*)+1 into n from payment_arrangements where organization_id=org;
  insert into payment_arrangements(organization_id,code,subscriber_id,status,frequency,total_debt,installment_amount,num_installments,first_due_date,notes,approved_by,created_by)
  values(org,'CONV-'||lpad(n::text,4,'0'),p_subscriber_id,'activo',(p_frequency)::frequency_enum,p_total_debt,p_installment_amount,numb,p_first_due_date,p_notes,auth.uid(),auth.uid()) returning id into aid;
  foreach i in array p_obligation_ids loop
    insert into arrangement_obligations(organization_id,arrangement_id,obligation_id,original_amount)
    select org,aid,i,o.original_amount from obligations o where o.id=i and o.organization_id=org
    on conflict do nothing;
  end loop;
  d:=p_first_due_date;i:=1;
  while i<=numb loop
    amt:=case when i=numb then p_total_debt-((i-1)*p_installment_amount) else p_installment_amount end;
    insert into arrangement_installments(organization_id,arrangement_id,installment_no,due_date,amount) values(org,aid,i,d,amt);
    i:=i+1;d:=d+case p_frequency when 'semanal' then interval '7 days' when 'quincenal' then interval '15 days' else interval '1 month' end;
  end loop;
  perform write_audit_event('create','payment_arrangement',aid::text,null,jsonb_build_object('code','CONV-'||lpad(n::text,4,'0'),'installments',numb),'Convenio de pago');
  return aid;
end$$;

-- F3. purchase_orders (039)
create or replace function public.create_purchase_order(p_lines jsonb,p_supplier_id uuid,p_requisition_id uuid default null,p_expected_date date default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();oid uuid;n int;total numeric(14,2):=0;ln jsonb;
begin
  perform require_permission('expenses.create', true);
  if p_supplier_id is not null then perform assert_org_scope('suppliers', p_supplier_id); end if;
  if p_requisition_id is not null then perform assert_org_scope('requisitions', p_requisition_id); end if;
  perform pg_advisory_xact_lock(hashtext(org::text||':purchase_order'));
  select count(*)+1 into n from purchase_orders where organization_id=org;
  for ln in select * from jsonb_array_elements(p_lines) loop
    total:=total+((ln->>'quantity')::numeric*(ln->>'unit_price')::numeric);
  end loop;
  insert into purchase_orders(organization_id,code,requisition_id,supplier_id,status,expected_date,total_amount,created_by)
  values(org,'PO-'||lpad(n::text,5,'0'),p_requisition_id,p_supplier_id,'aprobada',p_expected_date,total,auth.uid()) returning id into oid;
  for ln in select * from jsonb_array_elements(p_lines) loop
    insert into purchase_order_lines(organization_id,purchase_order_id,description,quantity,unit_price,inventory_item_id)
    values(org,oid,ln->>'description',(ln->>'quantity')::numeric,(ln->>'unit_price')::numeric,nullif(ln->>'inventory_item_id','')::uuid);
  end loop;
  perform write_audit_event('create','purchase_order',oid::text,null,jsonb_build_object('code','PO-'||lpad(n::text,5,'0')),'Nueva orden de compra');
  return oid;
end$$;

-- F4. water_samples (043)
create or replace function public.register_water_sample(p_payload jsonb,p_parameters jsonb default '[]') returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();sid uuid;n int;par jsonb;
begin
  perform require_permission('water.manage');
  perform pg_advisory_xact_lock(hashtext(org::text||':water_sample'));
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

-- F5. water_connections (pegues) — 002
create or replace function public.create_water_connection(p_subscriber_id uuid,p_payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();cid uuid;seq int;ccode text;
begin
  perform require_permission('subscribers.update', true);
  perform assert_org_scope('subscribers', p_subscriber_id);
  perform pg_advisory_xact_lock(hashtext(org::text||':connection:'||p_subscriber_id::text));
  select count(*)+1 into seq from water_connections where subscriber_id=p_subscriber_id and organization_id=org;
  select code||'-'||lpad(seq::text,2,'0') into ccode from subscribers where id=p_subscriber_id and organization_id=org;
  insert into water_connections(organization_id,subscriber_id,code,service_type,meter_number,normalized_meter,address,sector,installation_date,latitude,longitude,notes,created_by)
  values(org,p_subscriber_id,ccode,p_payload->>'service_type',nullif(p_payload->>'meter_number',''),nullif(normalize_identifier(p_payload->>'meter_number'),''),p_payload->>'address',p_payload->>'sector',nullif(p_payload->>'installation_date','')::date,nullif(p_payload->>'latitude','')::numeric,nullif(p_payload->>'longitude','')::numeric,p_payload->>'notes',auth.uid()) returning id into cid;
  perform write_audit_event('create','water_connection',cid::text,null,jsonb_build_object('code',ccode),'Nuevo pegue');
  return cid;
exception when unique_violation then raise exception 'DUPLICATE_ACTIVE_METER';
end$$;

commit;
