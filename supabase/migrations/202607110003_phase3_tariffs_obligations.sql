begin;

insert into public.permissions(code,description) values
('tariffs.read','Consultar tarifas'),
('tariffs.manage','Crear y versionar tarifas'),
('obligations.read','Consultar obligaciones y estados de cuenta'),
('obligations.manage','Generar obligaciones y anualidades'),
('debt.override','Autorizar excepciones operativas por deuda')
on conflict(code) do update set description=excluded.description;

insert into public.role_permissions(role_id,permission_code)
select r.id,p.code from public.roles r cross join public.permissions p
where r.code='superadmin' and p.code in('tariffs.read','tariffs.manage','obligations.read','obligations.manage','debt.override')
on conflict do nothing;

create type public.tariff_category as enum('annual_fee','new_connection','reconnection','late_fee','repair','ownership_change','inspection','fine','other');
create type public.tariff_status as enum('active','inactive');
create type public.obligation_source as enum('annual_generation','manual','system_adjustment');
create type public.obligation_state as enum('pending','partial','paid','overdue','cancelled');
create type public.debt_operation as enum('solvency_certificate','reconnection','ownership_change','new_connection','general_consultation','receive_payment');

create table public.tariff_definitions(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 code text not null,
 name text not null,
 category public.tariff_category not null,
 description text,
 applies_to_service text check(applies_to_service is null or applies_to_service in('residential','commercial','community','institutional')),
 is_annual boolean not null default false,
 status public.tariff_status not null default 'active',
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,code)
);

create table public.tariff_versions(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 tariff_definition_id uuid not null references public.tariff_definitions(id) on delete cascade,
 version_number integer not null check(version_number>0),
 amount numeric(14,2) not null check(amount>=0),
 valid_from date not null,
 valid_to date,
 notes text,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 check(valid_to is null or valid_to>=valid_from),
 unique(tariff_definition_id,version_number)
);

create table public.obligations(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 subscriber_id uuid not null references public.subscribers(id),
 connection_id uuid references public.water_connections(id),
 tariff_definition_id uuid not null references public.tariff_definitions(id),
 tariff_version_id uuid not null references public.tariff_versions(id),
 source public.obligation_source not null,
 period_key text not null,
 description text not null,
 issue_date date not null default current_date,
 due_date date not null,
 original_amount numeric(14,2) not null check(original_amount>=0),
 adjustment_amount numeric(14,2) not null default 0,
 paid_amount numeric(14,2) not null default 0 check(paid_amount>=0),
 cancelled_at timestamptz,
 cancellation_reason text,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 check(due_date>=issue_date),
 check(paid_amount<=greatest(original_amount+adjustment_amount,0)),
 unique(organization_id,connection_id,tariff_definition_id,period_key)
);

create table public.debt_override_events(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 subscriber_id uuid not null references public.subscribers(id),
 operation public.debt_operation not null,
 reason text not null check(length(trim(reason))>=20),
 authorized_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);

create index tariff_versions_lookup on public.tariff_versions(tariff_definition_id,valid_from desc);
create index obligations_subscriber_due on public.obligations(subscriber_id,due_date);
create index obligations_connection_period on public.obligations(connection_id,period_key);

create or replace function public.obligation_balance(p_original numeric,p_adjustment numeric,p_paid numeric)
returns numeric language sql immutable as $$select greatest(coalesce(p_original,0)+coalesce(p_adjustment,0)-coalesce(p_paid,0),0)$$;

create or replace function public.obligation_computed_state(p_due date,p_original numeric,p_adjustment numeric,p_paid numeric,p_cancelled timestamptz)
returns public.obligation_state language sql stable as $$
 select case
  when p_cancelled is not null then 'cancelled'::public.obligation_state
  when obligation_balance(p_original,p_adjustment,p_paid)=0 then 'paid'::public.obligation_state
  when coalesce(p_paid,0)>0 and p_due>=current_date then 'partial'::public.obligation_state
  when p_due<current_date then 'overdue'::public.obligation_state
  else 'pending'::public.obligation_state end
$$;

create or replace function public.list_tariffs()
returns table(definition_id uuid,code text,name text,category text,description text,applies_to_service text,is_annual boolean,status text,version_id uuid,version_number integer,amount numeric,valid_from date,valid_to date)
language sql stable security definer set search_path=public as $$
 select d.id,d.code,d.name,d.category::text,d.description,d.applies_to_service,d.is_annual,d.status::text,
 v.id,v.version_number,v.amount,v.valid_from,v.valid_to
 from tariff_definitions d
 left join lateral(
  select x.* from tariff_versions x where x.tariff_definition_id=d.id
  order by x.valid_from desc,x.version_number desc limit 1
 )v on true
 where d.organization_id=current_organization_id() and has_permission('tariffs.read')
 order by d.name
$$;

create or replace function public.create_tariff(p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();did uuid;begin
 if not has_permission('tariffs.manage') then raise exception 'FORBIDDEN';end if;
 if auth.jwt()->>'aal'<>'aal2' then raise exception 'MFA_REQUIRED';end if;
 if coalesce((p_payload->>'amount')::numeric,-1)<0 then raise exception 'INVALID_AMOUNT';end if;
 insert into tariff_definitions(organization_id,code,name,category,description,applies_to_service,is_annual,created_by)
 values(org,upper(trim(p_payload->>'code')),trim(p_payload->>'name'),(p_payload->>'category')::tariff_category,nullif(trim(p_payload->>'description'),''),nullif(p_payload->>'applies_to_service',''),coalesce((p_payload->>'is_annual')::boolean,false),auth.uid()) returning id into did;
 insert into tariff_versions(organization_id,tariff_definition_id,version_number,amount,valid_from,valid_to,notes,created_by)
 values(org,did,1,(p_payload->>'amount')::numeric,(p_payload->>'valid_from')::date,nullif(p_payload->>'valid_to','')::date,nullif(trim(p_payload->>'notes'),''),auth.uid());
 perform write_audit_event('create','tariff_definition',did::text,null,p_payload,'Creación de tarifa y primera versión');return did;
exception when unique_violation then raise exception 'DUPLICATE_TARIFF_CODE';end$$;

create or replace function public.create_tariff_version(p_definition_id uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();vid uuid;next_version integer;last_from date;begin
 if not has_permission('tariffs.manage') then raise exception 'FORBIDDEN';end if;
 if auth.jwt()->>'aal'<>'aal2' then raise exception 'MFA_REQUIRED';end if;
 if not exists(select 1 from tariff_definitions where id=p_definition_id and organization_id=org) then raise exception 'TARIFF_NOT_FOUND';end if;
 select coalesce(max(version_number),0)+1,max(valid_from) into next_version,last_from from tariff_versions where tariff_definition_id=p_definition_id;
 if last_from is not null and (p_payload->>'valid_from')::date<=last_from then raise exception 'VERSION_DATE_MUST_ADVANCE';end if;
 update tariff_versions set valid_to=(p_payload->>'valid_from')::date-1 where tariff_definition_id=p_definition_id and valid_to is null;
 insert into tariff_versions(organization_id,tariff_definition_id,version_number,amount,valid_from,valid_to,notes,created_by)
 values(org,p_definition_id,next_version,(p_payload->>'amount')::numeric,(p_payload->>'valid_from')::date,nullif(p_payload->>'valid_to','')::date,nullif(trim(p_payload->>'notes'),''),auth.uid()) returning id into vid;
 perform write_audit_event('version','tariff_definition',p_definition_id::text,null,p_payload,'Nueva versión de tarifa');return vid;
end$$;

create or replace function public.generate_annual_obligations(p_tariff_definition_id uuid,p_year integer,p_due_date date)
returns jsonb language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();def tariff_definitions%rowtype;ver tariff_versions%rowtype;inserted_count integer:=0;begin
 if not has_permission('obligations.manage') then raise exception 'FORBIDDEN';end if;
 if auth.jwt()->>'aal'<>'aal2' then raise exception 'MFA_REQUIRED';end if;
 if p_year<2000 or p_year>2100 then raise exception 'INVALID_YEAR';end if;
 select * into def from tariff_definitions where id=p_tariff_definition_id and organization_id=org and status='active';
 if not found or not def.is_annual then raise exception 'ANNUAL_TARIFF_NOT_FOUND';end if;
 select * into ver from tariff_versions where tariff_definition_id=def.id and valid_from<=make_date(p_year,12,31) and (valid_to is null or valid_to>=make_date(p_year,1,1)) order by valid_from desc limit 1;
 if not found then raise exception 'NO_TARIFF_VERSION_FOR_YEAR';end if;
 insert into obligations(organization_id,subscriber_id,connection_id,tariff_definition_id,tariff_version_id,source,period_key,description,issue_date,due_date,original_amount,created_by)
 select org,w.subscriber_id,w.id,def.id,ver.id,'annual_generation','ANUAL-'||p_year,def.name||' '||p_year,current_date,p_due_date,ver.amount,auth.uid()
 from water_connections w join subscribers s on s.id=w.subscriber_id
 where w.organization_id=org and w.status='active' and s.status='active' and (def.applies_to_service is null or def.applies_to_service=w.service_type)
 on conflict(organization_id,connection_id,tariff_definition_id,period_key) do nothing;
 get diagnostics inserted_count=row_count;
 perform write_audit_event('generate','annual_obligations',def.id::text,null,jsonb_build_object('year',p_year,'count',inserted_count,'due_date',p_due_date),'Generación anual');
 return jsonb_build_object('created',inserted_count,'year',p_year,'tariff',def.name,'amount',ver.amount);
end$$;

create or replace function public.create_manual_obligation(p_subscriber_id uuid,p_connection_id uuid,p_tariff_definition_id uuid,p_due_date date,p_description text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();ver tariff_versions%rowtype;oid uuid;period text;begin
 if not has_permission('obligations.manage') then raise exception 'FORBIDDEN';end if;
 if not exists(select 1 from subscribers where id=p_subscriber_id and organization_id=org) then raise exception 'SUBSCRIBER_NOT_FOUND';end if;
 if p_connection_id is not null and not exists(select 1 from water_connections where id=p_connection_id and subscriber_id=p_subscriber_id and organization_id=org) then raise exception 'CONNECTION_NOT_FOUND';end if;
 select v.* into ver from tariff_versions v join tariff_definitions d on d.id=v.tariff_definition_id where d.id=p_tariff_definition_id and d.organization_id=org and v.valid_from<=current_date and (v.valid_to is null or v.valid_to>=current_date) order by v.valid_from desc limit 1;
 if not found then raise exception 'ACTIVE_TARIFF_VERSION_NOT_FOUND';end if;
 period:='MANUAL-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS');
 insert into obligations(organization_id,subscriber_id,connection_id,tariff_definition_id,tariff_version_id,source,period_key,description,due_date,original_amount,created_by)
 values(org,p_subscriber_id,p_connection_id,p_tariff_definition_id,ver.id,'manual',period,coalesce(nullif(trim(p_description),''),(select name from tariff_definitions where id=p_tariff_definition_id)),p_due_date,ver.amount,auth.uid()) returning id into oid;
 perform write_audit_event('create','obligation',oid::text,null,jsonb_build_object('subscriber_id',p_subscriber_id,'amount',ver.amount),'Obligación manual');return oid;
end$$;

create or replace function public.get_subscriber_account(p_subscriber_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
 with items as(
  select o.*,d.name tariff_name,w.code connection_code,
   obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount) balance,
   obligation_computed_state(o.due_date,o.original_amount,o.adjustment_amount,o.paid_amount,o.cancelled_at)::text computed_state
  from obligations o join tariff_definitions d on d.id=o.tariff_definition_id left join water_connections w on w.id=o.connection_id
  where o.organization_id=current_organization_id() and o.subscriber_id=p_subscriber_id and has_permission('obligations.read')
 ), totals as(
  select coalesce(sum(balance) filter(where computed_state<>'cancelled'),0) total_pending,
   coalesce(sum(balance) filter(where computed_state='overdue'),0) overdue_amount,
   count(*) filter(where computed_state='overdue') overdue_count,
   min(due_date) filter(where computed_state='overdue') oldest_due_date from items
 )
 select jsonb_build_object(
  'subscriber',(select to_jsonb(s) from subscribers s where s.id=p_subscriber_id and s.organization_id=current_organization_id()),
  'summary',(select to_jsonb(t)||jsonb_build_object('solvent',t.overdue_amount=0 and t.total_pending=0,'days_overdue',case when t.oldest_due_date is null then 0 else current_date-t.oldest_due_date end) from totals t),
  'obligations',coalesce((select jsonb_agg(to_jsonb(i) order by i.due_date desc) from items i),'[]'::jsonb),
  'connections',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'code',w.code,'address',w.address,'status',w.status)) from water_connections w where w.subscriber_id=p_subscriber_id and w.organization_id=current_organization_id()),'[]'::jsonb)
 )
$$;

create or replace function public.search_subscriber_accounts(p_query text default '',p_limit integer default 50)
returns table(subscriber_id uuid,subscriber_code text,full_name text,total_pending numeric,overdue_amount numeric,overdue_count bigint,debt_status text)
language sql stable security definer set search_path=public as $$
 select s.id,s.code,s.full_name,
 coalesce(sum(obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)) filter(where o.cancelled_at is null),0),
 coalesce(sum(obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)) filter(where o.cancelled_at is null and o.due_date<current_date),0),
 count(o.id) filter(where o.cancelled_at is null and o.due_date<current_date and obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)>0),
 case when coalesce(sum(obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)) filter(where o.cancelled_at is null and o.due_date<current_date),0)>0 then 'moroso'
      when coalesce(sum(obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)) filter(where o.cancelled_at is null),0)>0 then 'pendiente'
      else 'solvente' end
 from subscribers s left join obligations o on o.subscriber_id=s.id
 where s.organization_id=current_organization_id() and has_permission('obligations.read') and (coalesce(trim(p_query),'')='' or s.code ilike '%'||p_query||'%' or s.full_name ilike '%'||p_query||'%')
 group by s.id order by s.full_name limit least(p_limit,100)
$$;

create or replace function public.check_debt_operation(p_subscriber_id uuid,p_operation public.debt_operation)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare overdue numeric;pending numeric;blocked boolean;reason text;begin
 if not has_permission('obligations.read') then raise exception 'FORBIDDEN';end if;
 select coalesce(sum(obligation_balance(original_amount,adjustment_amount,paid_amount)) filter(where cancelled_at is null and due_date<current_date),0),coalesce(sum(obligation_balance(original_amount,adjustment_amount,paid_amount)) filter(where cancelled_at is null),0) into overdue,pending from obligations where subscriber_id=p_subscriber_id and organization_id=current_organization_id();
 blocked:=p_operation in('solvency_certificate','reconnection','ownership_change','new_connection') and overdue>0;
 reason:=case when blocked then 'Operación bloqueada por morosidad vencida.' else null end;
 return jsonb_build_object('allowed',not blocked,'blocked',blocked,'operation',p_operation,'overdue_amount',overdue,'total_pending',pending,'reason',reason);
end$$;

create or replace function public.authorize_debt_override(p_subscriber_id uuid,p_operation public.debt_operation,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$declare oid uuid;begin
 if not has_permission('debt.override') then raise exception 'FORBIDDEN';end if;
 if auth.jwt()->>'aal'<>'aal2' then raise exception 'MFA_REQUIRED';end if;
 if length(trim(coalesce(p_reason,'')))<20 then raise exception 'REASON_TOO_SHORT';end if;
 insert into debt_override_events(organization_id,subscriber_id,operation,reason,authorized_by) values(current_organization_id(),p_subscriber_id,p_operation,trim(p_reason),auth.uid()) returning id into oid;
 perform write_audit_event('authorize_override','subscriber',p_subscriber_id::text,null,jsonb_build_object('operation',p_operation,'reason',p_reason),'Excepción por deuda');return oid;end$$;

alter table tariff_definitions enable row level security;
alter table tariff_versions enable row level security;
alter table obligations enable row level security;
alter table debt_override_events enable row level security;
create policy tariff_definitions_read on tariff_definitions for select using(organization_id=current_organization_id() and has_permission('tariffs.read'));
create policy tariff_versions_read on tariff_versions for select using(organization_id=current_organization_id() and has_permission('tariffs.read'));
create policy obligations_read on obligations for select using(organization_id=current_organization_id() and has_permission('obligations.read'));
create policy debt_overrides_read on debt_override_events for select using(organization_id=current_organization_id() and (has_permission('obligations.read') or has_permission('audit.read')));
revoke insert,update,delete on tariff_definitions,tariff_versions,obligations,debt_override_events from authenticated;

commit;
