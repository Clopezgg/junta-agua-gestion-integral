-- ============================================================================
-- Migración 032 — ERP: integridad financiera, secuencias seguras, idempotencia,
-- motor único de beneficios, caja formal, documentos inmutables y mora pendiente.
--
-- Esta migración:
--   1. Elimina la generación de códigos de pegue basada en COUNT(*)+1.
--   2. Añade claves de idempotencia para pagos y gastos.
--   3. Centraliza el beneficio de adulto mayor en benefit_definitions
--      (edad, porcentaje, evidencia, vigencia) evitando 60/25 dispersos.
--   4. Elimina el doble descuento en la contabilización anual.
--   5. Introduce late_fee_policies con estado PENDING (nunca se inventa mora).
--   6. Crea cash_movements como libro de caja formal.
--   7. Crea document_artifacts con inmutabilidad y regeneración idempotente.
--   8. Aplica inmutabilidad a nivel de base de datos sobre
--      financial_documents, payments y audit_events.
--   9. No expone rutas internas en la verificación pública de recibos.
--  10. Separa permisos del subsistema de respaldos.
-- ============================================================================
begin;

-- ---------------------------------------------------------------------------
-- 1. SECUENCIAS SEGURAS PARA PEGUES (elimina COUNT(*)+1 en create_water_connection)
-- ---------------------------------------------------------------------------
create table if not exists public.subscriber_connection_sequences(
  subscriber_id uuid primary key references public.subscribers(id) on delete cascade,
  last_connection_number integer not null default 0 check(last_connection_number between 0 and 999999)
);
alter table public.subscriber_connection_sequences enable row level security;
revoke all on public.subscriber_connection_sequences from public;

create or replace function public.next_connection_code(p_subscriber_id uuid)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  org uuid:=public.current_organization_id();
  subscriber_code text;
  seq_value int;
begin
  if org is null then raise exception 'FORBIDDEN'; end if;
  select code into subscriber_code from public.subscribers
  where id=p_subscriber_id and organization_id=org;
  if subscriber_code is null then raise exception 'SUBSCRIBER_NOT_FOUND'; end if;
  insert into public.subscriber_connection_sequences(subscriber_id,last_connection_number)
  values(p_subscriber_id,1)
  on conflict(subscriber_id)
  do update set last_connection_number=public.subscriber_connection_sequences.last_connection_number+1
  returning last_connection_number into seq_value;
  if seq_value>999999 then raise exception 'SEQUENCE_EXHAUSTED'; end if;
  return trim(subscriber_code)||'-'||lpad(seq_value::text,2,'0');
end$$;

-- Copia de seguridad: los pegues creados antes de esta migración usaban COUNT(*)+1.
-- Resincronizamos la secuencia de cada abonado con el número ya emitido.
insert into public.subscriber_connection_sequences(subscriber_id,last_connection_number)
select w.subscriber_id, max(coalesce(nullif(regexp_replace(substring(w.code from '%-[0-9]+$'),'[^0-9]','','g'),'')::int,0))
from public.water_connections w
where w.code like '%-%'
group by w.subscriber_id
on conflict(subscriber_id) do update set last_connection_number=greatest(
  public.subscriber_connection_sequences.last_connection_number,
  excluded.last_connection_number
);

create or replace function public.create_water_connection(p_subscriber_id uuid,p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  org uuid:=public.current_organization_id();
  cid uuid;
  ccode text;
  meter_check text;
  meter_dup boolean;
begin
  if not public.has_permission('subscribers.update') then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.subscribers where id=p_subscriber_id and organization_id=org) then
    raise exception 'SUBSCRIBER_NOT_FOUND';
  end if;
  meter_check:=nullif(public.normalize_identifier(p_payload->>'meter_number'),'');
  if meter_check is not null then
    select exists(
      select 1 from public.water_connections w
      where w.organization_id=org and w.normalized_meter=meter_check and w.status<>'cancelled'
    ) into meter_dup;
    if meter_dup then raise exception 'DUPLICATE_ACTIVE_METER'; end if;
  end if;
  ccode:=public.next_connection_code(p_subscriber_id);
  insert into public.water_connections(
    organization_id,subscriber_id,code,service_type,meter_number,normalized_meter,
    address,sector,installation_date,latitude,longitude,notes,created_by
  ) values(
    org,p_subscriber_id,ccode,p_payload->>'service_type',nullif(p_payload->>'meter_number',''),
    meter_check,p_payload->>'address',p_payload->>'sector',
    nullif(p_payload->>'installation_date','')::date,
    nullif(p_payload->>'latitude','')::numeric,
    nullif(p_payload->>'longitude','')::numeric,
    nullif(trim(p_payload->>'notes'),''),auth.uid()
  ) returning id into cid;
  perform public.write_audit_event('create','water_connection',cid::text,null,jsonb_build_object('code',ccode),'Nuevo pegue');
  return cid;
exception
  when unique_violation then
    if exists(select 1 from public.water_connections w where w.organization_id=org and w.code=ccode) then
      raise exception 'DUPLICATE_CONNECTION_CODE';
    end if;
    raise exception 'DUPLICATE_ACTIVE_METER';
end$$;

grant execute on function public.next_connection_code(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. IDEMPOTENCIA DE PAGOS Y GASTOS
-- ---------------------------------------------------------------------------
alter table public.payments
  add column if not exists idempotency_key text;
create unique index if not exists payments_idempotency_unique
  on public.payments(organization_id,idempotency_key) where idempotency_key is not null;

alter table public.expenses
  add column if not exists idempotency_key text;
create unique index if not exists expenses_idempotency_unique
  on public.expenses(organization_id,idempotency_key) where idempotency_key is not null;

-- register_payment con replay idempotente y candado transaccional.
-- Un mismo idempotency_key jamás produce dos cobros, incluso bajo concurrencia.
create or replace function public.register_payment(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  org uuid:=public.current_organization_id();
  pay public.payments%rowtype;
  item jsonb;
  obl public.obligations%rowtype;
  sum_alloc numeric:=0;
  sum_components numeric:=0;
  cash_total numeric:=0;
  receipt text;
  session public.cash_sessions%rowtype;
  components jsonb;
  component jsonb;
  received numeric;
  method_value public.payment_method;
  idem_key text;
begin
  if not public.has_permission('payments.create') then raise exception 'FORBIDDEN'; end if;
  if coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then raise exception 'MFA_REQUIRED'; end if;
  idem_key:=nullif(trim(coalesce(p_payload->>'idempotency_key','')),'');
  if idem_key is not null then
    perform pg_advisory_xact_lock(hashtext(org::text||'|payment|'||idem_key));
    select * into pay from public.payments
    where organization_id=org and idempotency_key=idem_key;
    if pay.id is not null then
      return jsonb_build_object(
        'id',pay.id,'receipt_number',pay.receipt_number,
        'verification_token',pay.verification_token,
        'verification_url','/verificar-recibo/'||pay.verification_token,
        'idempotent_replay',true
      );
    end if;
  end if;
  if jsonb_array_length(coalesce(p_payload->'allocations','[]'::jsonb))=0 then raise exception 'ALLOCATIONS_REQUIRED'; end if;
  for item in select * from jsonb_array_elements(p_payload->'allocations') loop
    select * into obl from public.obligations
    where id=(item->>'obligation_id')::uuid and organization_id=org and cancelled_at is null
    for update;
    if obl.id is null then raise exception 'OBLIGATION_NOT_FOUND'; end if;
    if (item->>'amount')::numeric<=0
       or (item->>'amount')::numeric>public.obligation_balance(obl.original_amount,obl.adjustment_amount,obl.paid_amount) then
      raise exception 'INVALID_ALLOCATION';
    end if;
    sum_alloc:=sum_alloc+(item->>'amount')::numeric;
  end loop;
  method_value:=(p_payload->>'method')::public.payment_method;
  components:=coalesce(p_payload->'components','[]'::jsonb);
  if jsonb_array_length(components)=0 then
    components:=jsonb_build_array(jsonb_build_object(
      'method',case when method_value='mixed' then 'cash' else method_value::text end,
      'amount',sum_alloc,'reference',nullif(trim(p_payload->>'reference'),'')
    ));
  end if;
  for component in select * from jsonb_array_elements(components) loop
    if (component->>'method') not in('cash','transfer','deposit','check') or (component->>'amount')::numeric<=0 then
      raise exception 'INVALID_PAYMENT_COMPONENT';
    end if;
    if (component->>'method')<>'cash' and coalesce(trim(component->>'reference'),'')='' then
      raise exception 'REFERENCE_REQUIRED';
    end if;
    sum_components:=sum_components+(component->>'amount')::numeric;
    if (component->>'method')='cash' then cash_total:=cash_total+(component->>'amount')::numeric; end if;
  end loop;
  if sum_components<>sum_alloc then raise exception 'COMPONENT_TOTAL_MISMATCH'; end if;
  if cash_total>0 then
    select * into session from public.cash_sessions
    where id=nullif(p_payload->>'cash_session_id','')::uuid
      and organization_id=org and user_id=auth.uid() and status='open'
    for update;
    if session.id is null then raise exception 'ACTIVE_CASH_SESSION_REQUIRED'; end if;
  end if;
  received:=coalesce(nullif(p_payload->>'received_amount','')::numeric,sum_alloc);
  if received<sum_alloc then raise exception 'INSUFFICIENT_RECEIVED_AMOUNT'; end if;
  receipt:=public.next_document_number('receipt','REC',6);
  insert into public.payments(
    organization_id,subscriber_id,cash_session_id,receipt_number,method,total,
    received_amount,reference,idempotency_key,created_by
  ) values(
    org,(p_payload->>'subscriber_id')::uuid,
    case when cash_total>0 then session.id else null end,
    receipt,method_value,sum_alloc,received,
    nullif(trim(p_payload->>'reference'),''),idem_key,auth.uid()
  ) returning * into pay;
  for item in select * from jsonb_array_elements(p_payload->'allocations') loop
    insert into public.payment_allocations(payment_id,obligation_id,amount)
    values(pay.id,(item->>'obligation_id')::uuid,(item->>'amount')::numeric);
    update public.obligations set paid_amount=paid_amount+(item->>'amount')::numeric
    where id=(item->>'obligation_id')::uuid;
  end loop;
  for component in select * from jsonb_array_elements(components) loop
    insert into public.payment_components(payment_id,method,amount,reference)
    values(pay.id,(component->>'method')::public.payment_method,(component->>'amount')::numeric,nullif(trim(component->>'reference'),''));
  end loop;
  perform public.write_audit_event(
    'payment.create','payments',pay.id::text,null,
    to_jsonb(pay)||jsonb_build_object('components',components,'idempotency_key',idem_key),null
  );
  return jsonb_build_object(
    'id',pay.id,'receipt_number',pay.receipt_number,
    'verification_token',pay.verification_token,
    'verification_url','/verificar-recibo/'||pay.verification_token
  );
end$$;

-- create_expense_request con idempotencia (doble envío no crea gastos duplicados).
create or replace function public.create_expense_request(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  org uuid:=public.current_organization_id();
  existing_row public.expenses%rowtype;
  result public.expenses%rowtype;
  idem_key text;
begin
  if not public.has_permission('expenses.create') then raise exception 'FORBIDDEN'; end if;
  idem_key:=nullif(trim(coalesce(p_payload->>'idempotency_key','')),'');
  if idem_key is not null then
    perform pg_advisory_xact_lock(hashtext(org::text||'|expense|'||idem_key));
    select * into existing_row from public.expenses
    where organization_id=org and idempotency_key=idem_key;
    if existing_row.id is not null then return to_jsonb(existing_row)||jsonb_build_object('idempotent_replay',true); end if;
  end if;
  if length(trim(coalesce(p_payload->>'description','')))<3 or (p_payload->>'amount')::numeric<=0 then
    raise exception 'INVALID_EXPENSE';
  end if;
  insert into public.expenses(
    organization_id,description,reason,category,supplier,amount,idempotency_key,requested_by
  ) values(
    org,trim(p_payload->>'description'),
    trim(coalesce(nullif(p_payload->>'reason',''),p_payload->>'description')),
    trim(p_payload->>'category'),nullif(trim(p_payload->>'supplier'),''),
    (p_payload->>'amount')::numeric,idem_key,auth.uid()
  ) returning * into result;
  perform public.write_audit_event('expense.request','expenses',result.id::text,null,to_jsonb(result),null);
  return to_jsonb(result);
end$$;

-- ---------------------------------------------------------------------------
-- 3. MOTOR ÚNICO DE BENEFICIOS (fuente: benefit_definitions)
--    Edad, porcentaje, tipo de evidencia y vigencia se evalúan aquí.
--    Regla funcional: "desde los 60 años cumplidos" contra la fecha de referencia.
-- ---------------------------------------------------------------------------
create or replace function public.evaluate_benefit_eligibility(
  p_subscriber_id uuid,
  p_benefit_code text,
  p_reference_date date default current_date
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  sub public.subscribers%rowtype;
  benefit public.benefit_definitions%rowtype;
  age_value int;
  evidence_type text;
  has_evidence boolean;
begin
  select * into sub from public.subscribers
  where id=p_subscriber_id and organization_id=public.current_organization_id();
  if sub.id is null then
    return jsonb_build_object('eligible',false,'reason','SUBSCRIBER_NOT_FOUND');
  end if;
  select * into benefit from public.benefit_definitions
  where organization_id=sub.organization_id and code=p_benefit_code and active limit 1;
  if benefit.id is null then
    return jsonb_build_object('eligible',false,'reason','BENEFIT_NOT_CONFIGURED');
  end if;
  if benefit.valid_from is not null and p_reference_date<benefit.valid_from then
    return jsonb_build_object('eligible',false,'reason','BENEFIT_NOT_YET_VALID');
  end if;
  if benefit.valid_to is not null and p_reference_date>benefit.valid_to then
    return jsonb_build_object('eligible',false,'reason','BENEFIT_EXPIRED');
  end if;
  if sub.birth_date is null then
    return jsonb_build_object('eligible',false,'reason','BIRTH_DATE_MISSING');
  end if;
  age_value:=public.age_on_date(sub.birth_date,p_reference_date);
  if coalesce(benefit.minimum_age,0)>0 and age_value<benefit.minimum_age then
    return jsonb_build_object(
      'eligible',false,'reason','UNDER_MINIMUM_AGE',
      'age',age_value,'minimum_age',benefit.minimum_age
    );
  end if;
  evidence_type:=lower(coalesce(nullif(benefit.evidence_type,''),''));
  select exists(
    select 1 from public.subscriber_identities i
    where i.subscriber_id=sub.id and i.organization_id=sub.organization_id and i.is_primary
      and (evidence_type='' or evidence_type='any' or i.document_type::text=evidence_type)
  ) into has_evidence;
  if not has_evidence then
    return jsonb_build_object(
      'eligible',false,'reason','REQUIRED_EVIDENCE_MISSING',
      'evidence_type',coalesce(benefit.evidence_type,'dni'),'age',age_value
    );
  end if;
  return jsonb_build_object(
    'eligible',true,'percentage',benefit.percentage,
    'age',age_value,'minimum_age',benefit.minimum_age,
    'evidence_type',benefit.evidence_type,'name',benefit.name,
    'valid_from',benefit.valid_from,'valid_to',benefit.valid_to
  );
end$$;

-- calculate_annual_charge: presupuesto anual sin números mágicos.
-- El monto unitario proviene de la tarifa anual vigente (tariff_versions) o del
-- catálogo de servicios; el descuento exclusivamente del motor de beneficios.
create or replace function public.calculate_annual_charge(
  p_subscriber_id uuid,
  p_year int,
  p_unit_amount numeric default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  connection_count int;
  benefit_eval jsonb;
  unit_value numeric;
  assigned_date date;
  base_total numeric;
  discount_total numeric;
  benefit_pct numeric:=0;
begin
  if p_year<2000 or p_year>2100 then raise exception 'INVALID_ANNUAL_CHARGE'; end if;
  if not exists(select 1 from public.subscribers
                where id=p_subscriber_id and organization_id=public.current_organization_id()) then
    raise exception 'SUBSCRIBER_NOT_FOUND';
  end if;
  select count(*) into connection_count from public.water_connections
  where subscriber_id=p_subscriber_id and organization_id=public.current_organization_id() and status='active';
  if p_unit_amount is null then
    select v.amount into unit_value
    from public.tariff_definitions d
    join public.tariff_versions v on v.tariff_definition_id=d.id
    where d.organization_id=public.current_organization_id() and d.is_annual and d.status='active'
      and v.valid_from<=make_date(p_year,12,31) and (v.valid_to is null or v.valid_to>=make_date(p_year,1,1))
    order by v.valid_from desc limit 1;
    if unit_value is null then
      select sc.default_amount into unit_value from public.service_catalog sc
      where sc.organization_id=public.current_organization_id() and sc.code='ANUAL' and sc.active
      limit 1;
    end if;
    if unit_value is null then raise exception 'ANNUAL_TARIFF_NOT_CONFIGURED'; end if;
  else
    unit_value:=p_unit_amount;
  end if;
  if unit_value<0 then raise exception 'INVALID_ANNUAL_CHARGE'; end if;
  assigned_date:=make_date(p_year,11,30);
  benefit_eval:=public.evaluate_benefit_eligibility(p_subscriber_id,'SENIOR_60',assigned_date);
  base_total:=connection_count*unit_value;
  if (benefit_eval->>'eligible')::boolean then benefit_pct:=(benefit_eval->>'percentage')::numeric; end if;
  discount_total:=round(base_total*benefit_pct/100,2);
  return jsonb_build_object(
    'year',p_year,'connections',connection_count,'unit_amount',unit_value,
    'base_amount',base_total,'senior_age',(benefit_eval->>'age')::int,
    'senior_percentage',benefit_pct,'senior_reason',benefit_eval->>'reason',
    'discount_amount',discount_total,'total_amount',base_total-discount_total,
    'benefit_reference_date',assigned_date,
    'valid_from',make_date(p_year,1,1),'due_date',assigned_date,'late_from',make_date(p_year,12,1)
  );
end$$;

-- sync_senior_benefit: reelaborado sobre el motor de beneficios.
create or replace function public.sync_senior_benefit(p_subscriber_id uuid,p_reference_date date default current_date)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  subscriber_row public.subscribers%rowtype;
  benefit_row public.benefit_definitions%rowtype;
  eval_row jsonb;
  identity_id uuid;
  benefit_status text;
begin
  select * into subscriber_row from public.subscribers
  where id=p_subscriber_id and organization_id=public.current_organization_id();
  if subscriber_row.id is null then raise exception 'SUBSCRIBER_NOT_FOUND'; end if;
  select * into benefit_row from public.benefit_definitions
  where organization_id=subscriber_row.organization_id and code='SENIOR_60' and active limit 1;
  if benefit_row.id is null then raise exception 'BENEFIT_NOT_CONFIGURED'; end if;
  eval_row:=public.evaluate_benefit_eligibility(subscriber_row.id,'SENIOR_60',p_reference_date);
  select id into identity_id from public.subscriber_identities
  where subscriber_id=subscriber_row.id and organization_id=subscriber_row.organization_id and is_primary limit 1;
  benefit_status:=case when (eval_row->>'eligible')::boolean then 'active' else 'rejected' end;
  insert into public.subscriber_benefits(
    organization_id,subscriber_id,benefit_definition_id,status,detected_automatically,
    evidence_identity_id,approved_at,valid_from,notes
  ) values(
    subscriber_row.organization_id,subscriber_row.id,benefit_row.id,benefit_status,true,
    identity_id,case when benefit_status='active' then now() else null end,
    greatest(coalesce(subscriber_row.birth_date,current_date)+make_interval(years=>coalesce(benefit_row.minimum_age,0)),benefit_row.valid_from),
    case when benefit_status='active'
      then 'Beneficio detectado automáticamente según '||(eval_row->>'evidence_type')||' y edad de '||coalesce((eval_row->>'age')::text,'?')||' años.'
      else 'No cumple requisitos: '||coalesce(eval_row->>'reason','desconocido') end
  )
  on conflict(subscriber_id,benefit_definition_id) do update set
    status=excluded.status,evidence_identity_id=excluded.evidence_identity_id,
    approved_at=excluded.approved_at,valid_from=excluded.valid_from,notes=excluded.notes,updated_at=now();
  return jsonb_build_object(
    'subscriber_id',subscriber_row.id,'age',(eval_row->>'age')::int,
    'status',benefit_status,'percentage',benefit_row.percentage,'reason',eval_row->>'reason'
  );
end$$;

grant execute on function public.evaluate_benefit_eligibility(uuid,text,date) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. MORA VERSIONADA Y PENDIENTE (nunca se inventa el monto)
-- ---------------------------------------------------------------------------
alter table public.obligations
  add column if not exists late_fee_pending boolean not null default true;

create table if not exists public.late_fee_policies(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null default 'LATE_FEE',
  name text not null default 'Multa por mora',
  formula_type text check(formula_type in('fixed_amount','percentage','periodic_percentage') or formula_type is null),
  fixed_amount numeric(14,2) check(fixed_amount is null or fixed_amount>=0),
  percentage numeric(6,3) check(percentage is null or percentage between 0 and 100),
  period_days int check(period_days is null or period_days>0),
  grace_days int not null default 0 check(grace_days>=0),
  applies_from date,
  applies_to date,
  status text not null default 'pending' check(status in('pending','active','retired')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);
alter table public.late_fee_policies enable row level security;
create policy late_fee_policies_read on public.late_fee_policies for select
  using(organization_id=public.current_organization_id()
        and (public.has_permission('obligations.read') or public.has_permission('tariffs.manage')));
revoke insert,update,delete on public.late_fee_policies from authenticated;

create or replace function public.get_late_fee_policy()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'configured',count(*) filter(where status='active')>0,
    'status',min(status),
    'formula_type',nullif(min(coalesce(formula_type,'')),''),
    'message',case when count(*) filter(where status='active')=0 then 'CONFIGURACIÓN PENDIENTE' else 'POLÍTICA VIGENTE' end
  )
  from public.late_fee_policies
  where organization_id=public.current_organization_id()
$$;

create or replace function public.obligation_late_fee_label(p_amount numeric,p_pending boolean)
returns text
language sql
immutable
as $$
  select case when coalesce(p_pending,true) then 'CONFIGURACIÓN PENDIENTE' else coalesce(p_amount,0)::text end
$$;

grant execute on function public.get_late_fee_policy() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. CAJA FORMAL: cash_movements (apertura, ingresos, devoluciones, anulaciones, diferencias)
-- ---------------------------------------------------------------------------
create table if not exists public.cash_movements(
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cash_session_id uuid not null references public.cash_sessions(id) on delete cascade,
  movement_type text not null check(movement_type in('opening','income','refund','void','closing_difference')),
  amount numeric(14,2) not null,
  reference text,
  linked_source_type text,
  linked_source_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.cash_movements enable row level security;
create policy cash_movements_read on public.cash_movements for select
  using(organization_id=public.current_organization_id()
        and (public.has_permission('payments.read') or public.has_permission('cash.manage')));
revoke insert,update,delete on public.cash_movements from authenticated;

create or replace function public.cash_movement_opening_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.cash_movements(organization_id,cash_session_id,movement_type,amount,reference,created_by)
  values(new.organization_id,new.id,'opening',new.opening_amount,'Apertura de caja',new.user_id);
  return new;
end$$;
create trigger cash_movements_opening
  after insert on public.cash_sessions for each row execute function public.cash_movement_opening_trigger();

create or replace function public.cash_movement_payment_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
declare cash_amt numeric:=0;
begin
  if new.cash_session_id is not null then
    select coalesce(sum(c.amount),0) into cash_amt
    from public.payment_components c where c.payment_id=new.id and c.method='cash';
    if cash_amt<=0 and new.method='cash' then cash_amt:=new.total; end if;
    if cash_amt>0 then
      insert into public.cash_movements(organization_id,cash_session_id,movement_type,amount,reference,linked_source_type,linked_source_id,created_by)
      values(new.organization_id,new.cash_session_id,'income',cash_amt,'Pago '||new.receipt_number,'payment',new.id,new.created_by);
    end if;
  end if;
  return new;
end$$;
create trigger cash_movements_payment
  after insert on public.payments for each row execute function public.cash_movement_payment_trigger();

create or replace function public.cash_movement_payment_status_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
declare cash_amt numeric:=0;
begin
  if new.status='voided' and old.status is distinct from 'voided' and new.cash_session_id is not null then
    select coalesce(sum(c.amount),0) into cash_amt
    from public.payment_components c where c.payment_id=new.id and c.method='cash';
    if cash_amt<=0 and new.method='cash' then cash_amt:=new.total; end if;
    if cash_amt>0 then
      insert into public.cash_movements(organization_id,cash_session_id,movement_type,amount,reference,linked_source_type,linked_source_id,created_by)
      values(new.organization_id,new.cash_session_id,'void',-cash_amt,'Anulación de '||new.receipt_number,'payment',new.id,new.created_by);
    end if;
  end if;
  return new;
end$$;
create trigger cash_movements_payment_status
  after update on public.payments for each row execute function public.cash_movement_payment_status_trigger();

create or replace function public.cash_movement_event_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
declare p public.payments%rowtype;
begin
  if new.event_type='refund' and new.cash_amount>0 then
    select * into p from public.payments where id=new.payment_id;
    if p.cash_session_id is not null then
      insert into public.cash_movements(organization_id,cash_session_id,movement_type,amount,reference,linked_source_type,linked_source_id,created_by)
      values(new.organization_id,p.cash_session_id,'refund',-new.cash_amount,'Reembolso de '||p.receipt_number,'payment_event',new.id,p.created_by);
    end if;
  end if;
  return new;
end$$;
create trigger cash_movements_event
  after insert on public.payment_events for each row execute function public.cash_movement_event_trigger();

create or replace function public.cash_movement_close_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='closed' and old.status is distinct from 'closed' and coalesce(new.difference,0)<>0 then
    insert into public.cash_movements(organization_id,cash_session_id,movement_type,amount,reference,created_by)
    values(new.organization_id,new.id,'closing_difference',new.difference,'Diferencia de arqueo al cierre',new.user_id);
  end if;
  return new;
end$$;
create trigger cash_movements_close
  after update on public.cash_sessions for each row execute function public.cash_movement_close_trigger();

-- ---------------------------------------------------------------------------
-- 6. INMUTABILIDAD A NIVEL DE BASE DE DATOS
-- ---------------------------------------------------------------------------
-- financial_documents: no se borran; los campos económicos del original no cambian.
create or replace function public.financial_documents_immutable_trigger()
returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then
    raise exception 'FINANCIAL_DOCUMENT_IMMUTABLE';
  end if;
  if new.document_number is distinct from old.document_number
     or new.document_type is distinct from old.document_type
     or new.subscriber_id is distinct from old.subscriber_id
     or new.connection_id is distinct from old.connection_id
     or new.obligation_id is distinct from old.obligation_id
     or new.payment_id is distinct from old.payment_id
     or new.fiscal_year is distinct from old.fiscal_year
     or new.base_amount is distinct from old.base_amount
     or new.discount_amount is distinct from old.discount_amount
     or new.late_fee_amount is distinct from old.late_fee_amount
     or new.total_amount is distinct from old.total_amount
     or new.currency is distinct from old.currency then
    raise exception 'FINANCIAL_DOCUMENT_FIELDS_IMMUTABLE';
  end if;
  return new;
end$$;
create trigger financial_documents_immutable
  before update or delete on public.financial_documents
  for each row execute function public.financial_documents_immutable_trigger();

-- payments: las transacciones financieras no se borran; solo transiciones de estado legales.
create or replace function public.payments_immutable_trigger()
returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then
    raise exception 'PAYMENTS_ARE_NOT_DELETED';
  end if;
  if new.total is distinct from old.total
     or new.received_amount is distinct from old.received_amount
     or new.subscriber_id is distinct from old.subscriber_id
     or new.receipt_number is distinct from old.receipt_number
     or new.verification_token is distinct from old.verification_token
     or new.method is distinct from old.method
     or new.created_by is distinct from old.created_by then
    raise exception 'PAYMENT_FIELDS_IMMUTABLE';
  end if;
  if new.status is distinct from old.status
     and not (
          (old.status='confirmed' and new.status in('voided','refunded','partially_refunded'))
       or (old.status='partially_refunded' and new.status='refunded')
     ) then
    raise exception 'INVALID_PAYMENT_STATUS_TRANSITION';
  end if;
  return new;
end$$;
create trigger payments_immutable
  before update or delete on public.payments
  for each row execute function public.payments_immutable_trigger();

-- audit_events: APPEND-ONLY incluso para roles privilegiados.
create or replace function public.audit_events_append_only_trigger()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception 'AUDIT_EVENTS_ARE_APPEND_ONLY';
end$$;
create trigger audit_events_append_only
  before update or delete on public.audit_events
  for each row execute function public.audit_events_append_only_trigger();

-- ---------------------------------------------------------------------------
-- 7. DOCUMENT_ARTIFACTS: artefactos de recibo con regeneración idempotente
-- ---------------------------------------------------------------------------
create table if not exists public.document_artifacts(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  financial_document_id uuid not null references public.financial_documents(id),
  artifact_type text not null default 'receipt_pdf'
    check(artifact_type in('receipt_pdf','reprint_pdf','verification_artifact')),
  status text not null default 'pending' check(status in('pending','generated','error','archived')),
  storage_path text,
  checksum_sha256 text,
  document_version text,
  mime_type text,
  size_bytes bigint check(size_bytes is null or size_bytes>=0),
  generated_at timestamptz,
  generated_by uuid references public.profiles(id),
  was_replacement boolean not null default false,
  created_at timestamptz not null default now(),
  unique(financial_document_id,artifact_type,storage_path)
);
alter table public.document_artifacts enable row level security;
create policy document_artifacts_read on public.document_artifacts for select
  using(organization_id=public.current_organization_id()
        and (public.has_permission('payments.read') or public.has_permission('audit.read')));
revoke insert,update,delete on public.document_artifacts from authenticated;
create index if not exists document_artifacts_document_idx on public.document_artifacts(financial_document_id,artifact_type);
create index if not exists cash_movements_session_idx on public.cash_movements(cash_session_id,created_at);

-- Un artefacto emitido es inmutable: no se sustituye su ruta ni su hash.
create or replace function public.document_artifacts_immutable_trigger()
returns trigger language plpgsql set search_path=public as $$
begin
  if tg_op='DELETE' then raise exception 'DOCUMENT_ARTIFACT_IMMUTABLE'; end if;
  if old.status='generated' then
    if new.storage_path is distinct from old.storage_path
       or new.checksum_sha256 is distinct from old.checksum_sha256 then
      raise exception 'DOCUMENT_ARTIFACT_IMMUTABLE';
    end if;
  end if;
  return new;
end$$;
create trigger document_artifacts_immutable
  before update or delete on public.document_artifacts
  for each row execute function public.document_artifacts_immutable_trigger();

create or replace function public.register_document_artifact(
  p_financial_document_id uuid,
  p_artifact_type text default 'receipt_pdf'
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  org uuid:=public.current_organization_id();
  artifact_id uuid;
begin
  if not public.has_permission('payments.read') then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.financial_documents d
                where d.id=p_financial_document_id and d.organization_id=org) then
    raise exception 'DOCUMENT_NOT_FOUND';
  end if;
  insert into public.document_artifacts(organization_id,financial_document_id,artifact_type,created_by)
  values(org,p_financial_document_id,p_artifact_type,auth.uid()) returning id into artifact_id;
  return artifact_id;
end$$;

create or replace function public.complete_document_artifact(
  p_artifact_id uuid,
  p_checksum text,
  p_storage_path text,
  p_document_version text default null,
  p_mime_type text default 'application/pdf'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  org uuid:=public.current_organization_id();
  artifact_row public.document_artifacts%rowtype;
  existing_row public.document_artifacts%rowtype;
  normalized_checksum text:=lower(trim(p_checksum));
  normalized_path text:=trim(p_storage_path);
begin
  if not public.has_permission('payments.read') then raise exception 'FORBIDDEN'; end if;
  if coalesce(p_checksum,'')='' or coalesce(p_storage_path,'')='' then raise exception 'CHECKSUM_AND_PATH_REQUIRED'; end if;
  update public.document_artifacts
  set status='generated',checksum_sha256=normalized_checksum,storage_path=normalized_path,
      document_version=p_document_version,mime_type=p_mime_type,generated_at=now(),generated_by=auth.uid()
  where id=p_artifact_id and organization_id=org and status in('pending','error')
  returning * into artifact_row;
  if artifact_row.id is null then
    select * into existing_row from public.document_artifacts
    where id=p_artifact_id and organization_id=org;
    if existing_row.id is not null and existing_row.status='generated'
       and existing_row.storage_path=normalized_path and existing_row.checksum_sha256=normalized_checksum then
      return to_jsonb(existing_row);
    end if;
    raise exception 'ARTIFACT_NOT_EDITABLE';
  end if;
  perform public.write_audit_event('document_artifact.generated','document_artifacts',artifact_row.id::text,null,to_jsonb(artifact_row),null);
  return to_jsonb(artifact_row);
end$$;

create or replace function public.fail_document_artifact(p_artifact_id uuid,p_reason text default null)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.has_permission('payments.read') then raise exception 'FORBIDDEN'; end if;
  update public.document_artifacts set status='error'
  where id=p_artifact_id and organization_id=public.current_organization_id() and status='pending';
  if not found then raise exception 'ARTIFACT_NOT_FOUND'; end if;
end$$;

create or replace function public.list_document_artifacts(p_financial_document_id uuid)
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select to_jsonb(a) from public.document_artifacts a
  where a.financial_document_id=p_financial_document_id
    and a.organization_id=public.current_organization_id()
    and (public.has_permission('payments.read') or public.has_permission('audit.read'))
  order by a.created_at
$$;

grant execute on function public.register_document_artifact(uuid,text) to authenticated;
grant execute on function public.complete_document_artifact(uuid,text,text,text,text) to authenticated;
grant execute on function public.fail_document_artifact(uuid,text) to authenticated;
grant execute on function public.list_document_artifacts(uuid) to authenticated;
grant execute on function public.obligation_late_fee_label(numeric,boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. GENERACIÓN ANUAL: eligibilidad por fecha real (vencimiento) y motor único
-- ---------------------------------------------------------------------------
create or replace function public.generate_annual_obligations(p_tariff_definition_id uuid,p_year integer,p_due_date date)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  org uuid:=public.current_organization_id();
  def public.tariff_definitions%rowtype;
  ver public.tariff_versions%rowtype;
  inserted_count integer:=0;
  due_expected date;
  late_from date;
begin
  if not public.has_permission('obligations.manage') then raise exception 'FORBIDDEN'; end if;
  if coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'MFA_REQUIRED'; end if;
  if p_year<2000 or p_year>2100 then raise exception 'INVALID_YEAR'; end if;
  due_expected:=make_date(p_year,11,30);
  late_from:=make_date(p_year,12,1);
  if p_due_date<>due_expected then raise exception 'ANNUAL_DUE_DATE_MUST_BE_NOVEMBER_30'; end if;

  select * into def from public.tariff_definitions where id=p_tariff_definition_id and organization_id=org and status='active';
  if not found or not def.is_annual then raise exception 'ANNUAL_TARIFF_NOT_FOUND'; end if;
  select * into ver from public.tariff_versions
  where tariff_definition_id=def.id and valid_from<=make_date(p_year,12,31) and (valid_to is null or valid_to>=make_date(p_year,1,1))
  order by valid_from desc limit 1;
  if not found then raise exception 'NO_TARIFF_VERSION_FOR_YEAR'; end if;

  insert into public.obligations(
    organization_id,subscriber_id,connection_id,tariff_definition_id,tariff_version_id,source,period_key,description,
    issue_date,due_date,original_amount,base_amount,discount_amount,late_fee_amount,late_fee_pending,calculation_snapshot,created_by
  )
  select
    org,
    w.subscriber_id,
    w.id,
    def.id,
    ver.id,
    'annual_generation',
    'ANUAL-'||p_year,
    def.name||' '||p_year,
    make_date(p_year,1,1),
    p_due_date,
    greatest(0,ver.amount - coalesce(discount_val.amount,0)),
    ver.amount,
    coalesce(discount_val.amount,0),
    0,
    true,
    jsonb_build_object(
      'rule','annual_fee_per_active_connection',
      'year',p_year,
      'period_from',make_date(p_year,1,1),
      'period_to',p_due_date,
      'late_from',late_from,
      'late_fee_pending',true,
      'connection_code',w.code,
      'unit_amount',ver.amount,
      'base_amount',ver.amount,
      'benefit_reference_date',p_due_date,
      'senior_discount_applied',coalesce((benefit.view->>'eligible')::boolean,false),
      'senior_age',(benefit.view->>'age'),
      'senior_percentage',coalesce((benefit.view->>'percentage')::numeric,0),
      'senior_reason',benefit.view->>'reason',
      'discount_amount',coalesce(discount_val.amount,0),
      'total_amount',greatest(0,ver.amount - coalesce(discount_val.amount,0)),
      'identity_required',true,
      'generated_at',now()
    ),
    auth.uid()
  from public.water_connections w
  join public.subscribers s on s.id=w.subscriber_id
  left join lateral (
    select public.evaluate_benefit_eligibility(w.subscriber_id,'SENIOR_60',p_due_date) as view
  ) benefit on true
  left join lateral (
    select case when coalesce((benefit.view->>'eligible')::boolean,false)
      then round(ver.amount*coalesce((benefit.view->>'percentage')::numeric,0)/100,2)
      else 0 end as amount
  ) discount_val on true
  where w.organization_id=org and w.status='active' and s.status='active'
    and (def.applies_to_service is null or def.applies_to_service=w.service_type)
  on conflict(organization_id,connection_id,tariff_definition_id,period_key) do nothing;
  get diagnostics inserted_count=row_count;

  perform public.write_audit_event(
    'generate','annual_obligations',def.id::text,null,
    jsonb_build_object('year',p_year,'count',inserted_count,'due_date',p_due_date,'discounts','snapshotted','late_fee_pending',true),
    'Generación anual con descuento histórico por pegue'
  );
  return jsonb_build_object('created',inserted_count,'year',p_year,'tariff',def.name,'amount',ver.amount,'due_date',p_due_date,'late_from',late_from,'late_fee','CONFIGURACIÓN PENDIENTE');
end
$$;

-- ---------------------------------------------------------------------------
-- 9. CONTABILIZACIÓN ANUAL: sin doble descuento, usando el snapshot de la obligación
-- ---------------------------------------------------------------------------
create or replace function public.post_annual_financial_document(p_obligation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  obligation_row public.obligations%rowtype;
  subscriber_row public.subscribers%rowtype;
  connection_row public.water_connections%rowtype;
  existing_row public.financial_documents%rowtype;
  document_row public.financial_documents%rowtype;
  template_row public.document_template_versions%rowtype;
  base_amount numeric:=0;
  discount_amount numeric:=0;
  late_fee numeric:=0;
  balance_amount numeric:=0;
  total_amount numeric:=0;
  year_value int;
begin
  if not public.has_permission('obligations.manage')
     or coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;

  select * into obligation_row
  from public.obligations
  where id=p_obligation_id
    and organization_id=public.current_organization_id()
    and cancelled_at is null
  for update;
  if obligation_row.id is null then raise exception 'OBLIGATION_NOT_FOUND'; end if;

  select * into existing_row
  from public.financial_documents
  where obligation_id=obligation_row.id
    and document_type='annual_invoice'
    and status<>'voided'
  order by created_at desc limit 1;
  if existing_row.id is not null then return to_jsonb(existing_row); end if;

  select * into subscriber_row from public.subscribers where id=obligation_row.subscriber_id;
  if obligation_row.connection_id is not null then
    select * into connection_row from public.water_connections where id=obligation_row.connection_id;
  end if;
  year_value:=coalesce(
    nullif(regexp_replace(coalesce(obligation_row.period_key,''),'[^0-9]','','g'),'')::int,
    extract(year from obligation_row.due_date)::int
  );

  base_amount:=coalesce(obligation_row.base_amount,obligation_row.original_amount+obligation_row.adjustment_amount);
  discount_amount:=coalesce(obligation_row.discount_amount,0);
  late_fee:=coalesce(obligation_row.late_fee_amount,0);
  balance_amount:=public.obligation_balance(obligation_row.original_amount,obligation_row.adjustment_amount,obligation_row.paid_amount);
  total_amount:=greatest(0,base_amount-discount_amount+late_fee);

  select * into template_row
  from public.document_template_versions
  where organization_id=obligation_row.organization_id
    and document_type='annual_invoice'
    and status='active'
  order by version_number desc limit 1;

  insert into public.financial_documents(
    organization_id,document_number,document_type,status,subscriber_id,connection_id,
    obligation_id,fiscal_year,posting_date,due_date,base_amount,discount_amount,
    late_fee_amount,total_amount,currency,template_snapshot,calculation_snapshot,posted_by
  ) values(
    obligation_row.organization_id,
    public.next_document_number('annual_invoice','FAC',6),
    'annual_invoice',
    case when balance_amount<=0 then 'paid' else 'posted' end,
    obligation_row.subscriber_id,
    obligation_row.connection_id,
    obligation_row.id,
    year_value,
    current_date,
    obligation_row.due_date,
    base_amount,
    discount_amount,
    late_fee,
    total_amount,
    'HNL',
    coalesce(template_row.configuration,'{}'::jsonb)||jsonb_build_object('template_id',template_row.id,'version_number',template_row.version_number),
    (coalesce(obligation_row.calculation_snapshot,'{}'::jsonb))||jsonb_build_object(
      'subscriber_code',subscriber_row.code,
      'subscriber_name',subscriber_row.full_name,
      'connection_code',connection_row.code,
      'concept',obligation_row.description,
      'base_amount',base_amount,
      'discount_amount',discount_amount,
      'late_fee_amount',late_fee,
      'late_fee_pending',coalesce(obligation_row.late_fee_pending,true),
      'balance_at_posting',balance_amount,
      'due_date',obligation_row.due_date
    ),
    auth.uid()
  ) returning * into document_row;

  perform public.write_audit_event(
    'financial_document.post',
    'financial_documents',
    document_row.id::text,
    null,
    to_jsonb(document_row),
    'Documento anual contabilizado con MFA'
  );
  return to_jsonb(document_row);
end$$;

-- ---------------------------------------------------------------------------
-- 10. VERIFICACIÓN PÚBLICA: sin rutas internas ni datos innecesarios
-- ---------------------------------------------------------------------------
create or replace function public.verify_receipt_public(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'valid',true,
    'receipt_number',p.receipt_number,
    'created_at',p.created_at,
    'total',p.total,
    'method',p.method,
    'status',p.status,
    'subscriber',left(s.full_name,1)||repeat('*',greatest(length(s.full_name)-2,1))||right(s.full_name,1),
    'organization',o.name,
    'items',(select coalesce(jsonb_agg(jsonb_build_object('description',ob.description,'amount',pa.amount) order by ob.due_date),'[]'::jsonb) from public.payment_allocations pa join public.obligations ob on ob.id=pa.obligation_id where pa.payment_id=p.id)
  )
  from public.payments p
  join public.subscribers s on s.id=p.subscriber_id
  join public.organizations o on o.id=p.organization_id
  where p.verification_token=p_token
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- 11. DATOS DE RECIBO ENRIQUECIDOS (estado de mora y ruta del original)
-- ---------------------------------------------------------------------------
create or replace function public.get_payment_receipt_data(p_payment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare result jsonb;
begin
  if not public.has_permission('payments.read') then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'id',p.id,'receipt_number',p.receipt_number,'created_at',p.created_at,'total',p.total,
    'received_amount',p.received_amount,'change_amount',p.change_amount,'method',p.method,'status',p.status,
    'verification_token',p.verification_token,'subscriber_name',s.full_name,'subscriber_code',s.code,
    'subscriber_email',s.email,'subscriber_address',s.address,'subscriber_sector',s.sector,
    'receipt_path',p.receipt_path,
    'masked_identity',(select left(i.normalized_number,4)||repeat('*',greatest(length(i.normalized_number)-8,2))||right(i.normalized_number,4) from public.subscriber_identities i where i.subscriber_id=s.id and i.is_primary limit 1),
    'brand_snapshot',p.receipt_brand_snapshot,
    'annual_year',(select max((o.calculation_snapshot->>'year')::int) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id and o.calculation_snapshot ? 'year'),
    'period_from',(select min(o.issue_date) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id),
    'period_to',(select max(o.due_date) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id),
    'late_from',(select max((o.calculation_snapshot->>'late_from')::date) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id and o.calculation_snapshot ? 'late_from'),
    'late_fee_pending',(select bool_and(coalesce(o.late_fee_pending,true)) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id),
    'connection_count',(select count(distinct o.connection_id) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id and o.connection_id is not null),
    'connection_codes',(select coalesce(jsonb_agg(distinct c.code),'[]'::jsonb) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id left join public.water_connections c on c.id=o.connection_id where pa.payment_id=p.id and c.code is not null),
    'base_amount',(select coalesce(sum(coalesce(o.base_amount,o.original_amount)),0) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id),
    'discount_amount',(select coalesce(sum(o.discount_amount),0) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id),
    'late_fee_amount',(select coalesce(sum(o.late_fee_amount),0) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id where pa.payment_id=p.id),
    'items',(select coalesce(jsonb_agg(jsonb_build_object('code',coalesce(c.code,'SRV'),'description',o.description,'quantity',1,'unitPrice',coalesce(o.base_amount,o.original_amount),'amount',pa.amount) order by o.due_date),'[]'::jsonb) from public.payment_allocations pa join public.obligations o on o.id=pa.obligation_id left join public.water_connections c on c.id=o.connection_id where pa.payment_id=p.id),
    'components',(select coalesce(jsonb_agg(jsonb_build_object('method',c.method,'amount',c.amount,'reference',c.reference)),'[]'::jsonb) from public.payment_components c where c.payment_id=p.id)
  ) into result
  from public.payments p join public.subscribers s on s.id=p.subscriber_id
  where p.id=p_payment_id and p.organization_id=public.current_organization_id();
  if result is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
  return result;
end
$$;

-- ---------------------------------------------------------------------------
-- 12. PERMISOS GRANULARES PARA RESPALDOS
-- ---------------------------------------------------------------------------
insert into public.permissions(code,description) values
  ('backups.read_metadata','Consultar metadatos de respaldos'),
  ('backups.create','Crear respaldos'),
  ('backups.download','Descargar respaldos'),
  ('backups.restore','Restaurar respaldos')
on conflict(code) do update set description=excluded.description;

insert into public.role_permissions(role_id,permission_code)
select r.id,p.code
from public.roles r
cross join public.permissions p
where
  (r.code='superadmin' and p.code in('backups.read_metadata','backups.create','backups.download','backups.restore')) or
  (r.code='admin' and p.code in('backups.read_metadata','backups.create','backups.download')) or
  (r.code='auditor' and p.code in('backups.read_metadata'))
on conflict do nothing;

commit;