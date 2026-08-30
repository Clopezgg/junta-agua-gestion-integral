-- ============================================================================
-- 033 — INVARIANTES DEL MODELO DE DATOS, CORRECCIÓN CON AUDITORÍA Y
--        PROTECCIÓN CONTRA FUERZA BRUTA
--
-- Cierra los huecos de integridad que quedaron tras el núcleo 032:
--   B) Nada de lo publicado se puede borrar; códigos de pegue con formato fijo;
--      historial y corrección de abonados/pegues mediante funciones auditadas.
--   C/D) Caja sellada tras el cierre; movimientos bloqueados en sesiones cerradas;
--      componentes económicos del pegue no negativos.
--   F) Enfriamiento de intentos de inicio de sesión por fuerza bruta con
--      funciones servidoras (se aplica incluso antes de la autenticación).
--
-- La 033 debe ejecutarse después de la 032. No muta datos existentes: añade
-- garantías que se aplican a partir de esta versión.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. NADA DE LO PUBLICADO SE BORRA (B/D)
--    Eliminación física prohibida, incluida la vía service_role. Los cancelados
--    se representan con estados (cancelled/voided/refunded/archived).
-- ---------------------------------------------------------------------------
create or replace function public.forbid_delete_on_financial_records()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  raise exception 'DELETE_NOT_ALLOWED: los registros financieros y de identidad son inmutables; use el flujo de anulación o cancelación.';
end$$;

do $$
declare t text;
begin
  foreach t in array array[
    'organizations','subscribers','subscriber_identities','water_connections','obligations',
    'payments','payment_allocations','payment_components','payment_events','cash_sessions',
    'cash_movements','financial_documents','document_artifacts','expenses','audit_events',
    'subscriber_benefits','organization_sequences','duplicate_reviews'
  ]::text[]
  loop
    execute format(
      'drop trigger if exists forbid_delete_%s on public.%I;
       create trigger forbid_delete_%s before delete on public.%I for each row execute function public.forbid_delete_on_financial_records();',
      t,t,t,t
    );
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- 2. FORMATO Y GARANTÍAS DEL CÓDIGO DE PEGUE (B)
--    Código = secuencia por abonado: dígitos del abonado (4-6) '-' consecutivo (1-6).
--    A partir de esta versión el formato queda fijado a nivel de base de datos.
-- ---------------------------------------------------------------------------
alter table public.water_connections add constraint water_connections_code_format
  check (code ~ '^[0-9]{4,6}-[0-9]{1,6}$');

-- ---------------------------------------------------------------------------
-- 3. COMPONENTES ECONÓMICOS NO NEGATIVOS (C/E)
--    base/discount/late_fee del pegue nunca negativos; ventanas de beneficio válidas.
-- ---------------------------------------------------------------------------
alter table public.obligations add constraint obligations_nonnegative_components
  check (coalesce(base_amount,0)>=0 and coalesce(discount_amount,0)>=0 and coalesce(late_fee_amount,0)>=0);

alter table public.subscriber_benefits add constraint benefits_window_valid
  check (valid_to is null or valid_to>=valid_from);

-- ---------------------------------------------------------------------------
-- 4. CAJA SELLADA TRAS EL CIERRE (D)
--    Una sesión cerrada no se vuelve a tocar; los movimientos posteriores al
--    cierre exigen abrir una sesión nueva. La diferencia de arqueo del cierre
--    (escrita por cash_movements_close justo después de sellar) queda exenta.
-- ---------------------------------------------------------------------------
create or replace function public.cash_session_closed_guard()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if tg_op='UPDATE' and old.status='closed' then
    raise exception 'CASH_SESSION_CLOSED: las sesiones cerradas son inmutables.';
  end if;
  if tg_op='INSERT' and new.status='closed' then
    raise exception 'CASH_SESSION_INVALID_TRANSITION: una sesión se abre abierta.';
  end if;
  return new;
end$$;
drop trigger if exists cash_session_closed_guard on public.cash_sessions;
create trigger cash_session_closed_guard
  before insert or update on public.cash_sessions
  for each row execute function public.cash_session_closed_guard();

create or replace function public.cash_movement_session_guard()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare st public.cash_session_status;
begin
  if new.movement_type='closing_difference' then return new; end if;
  select status into st from public.cash_sessions where id=new.cash_session_id;
  if st='closed' then
    raise exception 'CASH_SESSION_CLOSED: los movimientos posteriores al cierre requieren abrir una nueva sesión.';
  end if;
  if new.created_by is null then new.created_by:=auth.uid(); end if;
  if new.organization_id is null then new.organization_id:=public.current_organization_id(); end if;
  return new;
end$$;
drop trigger if exists cash_movement_session_guard on public.cash_movements;
create trigger cash_movement_session_guard
  before insert on public.cash_movements
  for each row execute function public.cash_movement_session_guard();

-- ---------------------------------------------------------------------------
-- 5. CORRECCIÓN DE ABONADOS CON AUDITORÍA (B)
--    No hay escrituras directas: únicamente update_subscriber/update_water_connection,
--    ambas security definer, con permiso, MFA y auditoría.
-- ---------------------------------------------------------------------------
create or replace function public.update_subscriber(p_subscriber_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  org uuid:=public.current_organization_id();
  row public.subscribers%rowtype;
  previous_birth date;
  status_value public.subscriber_status;
  changes jsonb:=jsonb_build_object();
begin
  if not public.has_permission('subscribers.update') then raise exception 'FORBIDDEN'; end if;
  if coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'MFA_REQUIRED'; end if;
  select * into row from public.subscribers where id=p_subscriber_id and organization_id=org;
  if row.id is null then raise exception 'SUBSCRIBER_NOT_FOUND'; end if;
  previous_birth:=row.birth_date;

  if p_payload ? 'whatsapp' and trim(coalesce(p_payload->>'whatsapp',''))='' then raise exception 'WHATSAPP_REQUIRED'; end if;
  if p_payload ? 'address' and trim(coalesce(p_payload->>'address',''))='' then raise exception 'ADDRESS_REQUIRED'; end if;
  if p_payload ? 'sector' and trim(coalesce(p_payload->>'sector',''))='' then raise exception 'SECTOR_REQUIRED'; end if;

  update public.subscribers set
    whatsapp=coalesce(nullif(trim(p_payload->>'whatsapp'),''),row.whatsapp),
    email=coalesce(nullif(trim(p_payload->>'email'),''),row.email),
    address=coalesce(nullif(trim(p_payload->>'address'),''),row.address),
    sector=coalesce(nullif(trim(p_payload->>'sector'),''),row.sector),
    birth_date=coalesce(nullif(p_payload->>'birth_date','')::date,row.birth_date),
    notes=coalesce(nullif(p_payload->>'notes',''),row.notes),
    updated_at=now()
  where id=row.id and organization_id=org
  returning * into row;

  status_value := ((p_payload->>'status'))::public.subscriber_status;
  if p_payload ? 'status' and status_value is not null and status_value<>row.status then
    if status_value<>'active' and row.status<>'active' then
      raise exception 'INVALID_STATUS_TRANSITION: para reactivar use active.';
    end if;
    update public.subscribers set status=status_value,updated_at=now()
    where id=row.id and organization_id=org returning * into row;
  end if;

  if row.birth_date is distinct from previous_birth and row.birth_date is not null then
    perform public.sync_senior_benefit(row.id,current_date);
  end if;

  changes:=jsonb_build_object(
    'whatsapp',row.whatsapp,'email',row.email,'address',row.address,'sector',row.sector,
    'birth_date',row.birth_date,'status',row.status,'notes',row.notes
  );
  perform public.write_audit_event(
    'update','subscribers',row.id::text,null,changes,
    'Corrección de abonado con MFA'
  );
  return to_jsonb(row);
end$$;

create or replace function public.update_water_connection(p_connection_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  org uuid:=public.current_organization_id();
  row public.water_connections%rowtype;
  new_status public.connection_status;
  changes jsonb:=jsonb_build_object();
begin
  if not public.has_permission('subscribers.update') then raise exception 'FORBIDDEN'; end if;
  if coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'MFA_REQUIRED'; end if;
  select * into row from public.water_connections where id=p_connection_id and organization_id=org;
  if row.id is null then raise exception 'CONNECTION_NOT_FOUND'; end if;

  new_status := ((p_payload->>'status'))::public.connection_status;
  if p_payload ? 'status' and new_status is not null and new_status<>row.status then
    if row.status='cancelled' then
      raise exception 'CANCELLED_CONNECTION_LOCKED: usa el flujo de reconexión.';
    end if;
    if length(trim(coalesce(p_payload->>'reason','')))<15 then
      raise exception 'REASON_REQUIRED: indique el motivo del cambio de estado.';
    end if;
    if not ((row.status='active' and new_status in('suspended','cancelled'))
        or (row.status='suspended' and new_status in('active','cancelled'))
        or (row.status='pending' and new_status in('active','cancelled'))) then
      raise exception 'INVALID_STATUS_TRANSITION';
    end if;
  end if;

  update public.water_connections set
    service_type=coalesce(nullif(trim(p_payload->>'service_type'),''),row.service_type),
    meter_number=case when p_payload ? 'meter_number' then nullif(trim(p_payload->>'meter_number'),'') else row.meter_number end,
    normalized_meter=case when p_payload ? 'meter_number' then nullif(normalize_identifier(p_payload->>'meter_number'),'') else row.normalized_meter end,
    address=coalesce(nullif(trim(p_payload->>'address'),''),row.address),
    sector=coalesce(nullif(trim(p_payload->>'sector'),''),row.sector),
    latitude=case when p_payload ? 'latitude' then nullif(p_payload->>'latitude','')::numeric else row.latitude end,
    longitude=case when p_payload ? 'longitude' then nullif(p_payload->>'longitude','')::numeric else row.longitude end,
    status=coalesce(new_status,row.status),
    notes=case when p_payload ? 'notes' then coalesce(nullif(trim(p_payload->>'notes'),''),row.notes) else row.notes end
  where id=row.id and organization_id=org
  returning * into row;

  changes:=jsonb_build_object(
    'code',row.code,'service_type',row.service_type,'meter_number',row.meter_number,
    'address',row.address,'sector',row.sector,'status',row.status
  );
  perform public.write_audit_event(
    'update','water_connections',row.id::text,null,
    changes||case when p_payload ? 'status' and p_payload->>'status'<>'' then
      jsonb_build_object('reason',p_payload->>'reason') else '{}'::jsonb end,
    'Corrección de pegue con MFA'
  );
  return to_jsonb(row);
exception when unique_violation then
  raise exception 'DUPLICATE_ACTIVE_METER';
end$$;

grant execute on function public.update_subscriber(uuid,jsonb) to authenticated;
grant execute on function public.update_water_connection(uuid,jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. PROTECCIÓN CONTRA FUERZA BRUTA EN EL LOGIN (F)
--    Ventana deslizante servidora previa a la autenticación (mailto hash SHA-256).
--      * >=5 fallos en 15 minutos  -> bloqueo 5 minutos.
--      * >=10 fallos en 60 minutos -> bloqueo 15 minutos.
--    La aplicación llama a record_login_attempt tras cada signIn y a
--    get_login_cooldown_seconds antes de intentarlo.
-- ---------------------------------------------------------------------------
create table if not exists public.login_attempt_cooldowns(
  email_hash text primary key,
  failed_attempts int not null default 0,
  first_failed_at timestamptz,
  last_failed_at timestamptz,
  blocked_until timestamptz
);
alter table public.login_attempt_cooldowns enable row level security;
revoke all on public.login_attempt_cooldowns from public,anon,authenticated;

create or replace function public.record_login_attempt(p_email text, p_success boolean)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  email_lower text:=lower(trim(p_email));
  h text:=encode(digest(email_lower,'sha256'),'hex');
  row public.login_attempt_cooldowns%rowtype;
begin
  if coalesce(email_lower,'')='' then return; end if;
  select * into row from public.login_attempt_cooldowns where email_hash=h;
  if p_success then
    if row.email_hash is not null then
      delete from public.login_attempt_cooldowns where email_hash=h;
    end if;
    return;
  end if;
  if row.email_hash is null then
    insert into public.login_attempt_cooldowns(email_hash,failed_attempts,first_failed_at,last_failed_at,blocked_until)
    values(h,1,now(),now(),null);
    return;
  end if;
  row.failed_attempts := row.failed_attempts+1;
  row.last_failed_at := now();
  if row.first_failed_at < now()-interval '60 minutes' then
    row.first_failed_at := now();
    row.failed_attempts := 1;
  end if;
  if row.failed_attempts>=10 then
    row.blocked_until := now()+interval '15 minutes';
  elsif row.failed_attempts>=5 then
    row.blocked_until := now()+interval '5 minutes';
  end if;
  update public.login_attempt_cooldowns set
    failed_attempts=row.failed_attempts, first_failed_at=row.first_failed_at,
    last_failed_at=row.last_failed_at, blocked_until=row.blocked_until
  where email_hash=h;
end$$;

create or replace function public.get_login_cooldown_seconds(p_email text)
returns int
language sql
stable
security definer
set search_path=public
as $$
  select case
    when blocked_until is not null and blocked_until>now() then greatest(1,ceil(extract(epoch from (blocked_until-now())))::int)
    else 0 end
  from public.login_attempt_cooldowns
  where email_hash=encode(digest(lower(trim(p_email)),'sha256'),'hex');
$$;

create index if not exists login_attempt_cooldowns_expiry_idx
  on public.login_attempt_cooldowns(blocked_until);

grant execute on function public.record_login_attempt(text,boolean) to public;
grant execute on function public.get_login_cooldown_seconds(text) to public;

commit;