begin;

insert into public.permissions(code,description) values
  ('document_templates.read','Consultar plantillas documentales'),
  ('document_templates.manage','Administrar plantillas documentales'),
  ('benefits.read','Consultar beneficios'),
  ('benefits.manage','Administrar beneficios'),
  ('portal.manage','Administrar portal de abonados'),
  ('service_catalog.read','Consultar catálogo de servicios'),
  ('service_catalog.manage','Administrar catálogo de servicios')
on conflict(code) do update set description=excluded.description;

insert into public.role_permissions(role_id,permission_code)
select r.id,p.code
from public.roles r
cross join public.permissions p
where
  (r.code='superadmin') or
  (r.code='admin' and p.code in('document_templates.read','document_templates.manage','benefits.read','benefits.manage','portal.manage','service_catalog.read','service_catalog.manage')) or
  (r.code='secretary' and p.code in('document_templates.read','benefits.read','service_catalog.read')) or
  (r.code='treasurer' and p.code in('document_templates.read','benefits.read','service_catalog.read')) or
  (r.code='auditor' and p.code in('document_templates.read','benefits.read','service_catalog.read'))
on conflict do nothing;

alter table public.subscribers
  add column if not exists birth_date date,
  add column if not exists photo_path text,
  add column if not exists portal_enabled boolean not null default false,
  add column if not exists portal_last_access_at timestamptz,
  add column if not exists portal_profile_updated_at timestamptz;

create table if not exists public.benefit_definitions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  minimum_age int check(minimum_age is null or minimum_age between 0 and 120),
  percentage numeric(6,3) not null default 0 check(percentage between 0 and 100),
  applies_to_all_connections boolean not null default true,
  applies_to_annual_fee_only boolean not null default true,
  excludes_late_fees boolean not null default true,
  evidence_type text not null default 'dni',
  authority_basis text,
  active boolean not null default true,
  valid_from date not null default current_date,
  valid_to date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);

create table if not exists public.subscriber_benefits(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  benefit_definition_id uuid not null references public.benefit_definitions(id),
  status text not null default 'eligible' check(status in('eligible','active','suspended','expired','rejected')),
  detected_automatically boolean not null default true,
  evidence_identity_id uuid references public.subscriber_identities(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  valid_from date not null default current_date,
  valid_to date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(subscriber_id,benefit_definition_id)
);

create table if not exists public.service_catalog(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  category text not null check(category in('annual_fee','new_connection','reconnection','pipe_change','pipe_repair','leak_repair','labor','materials','late_fee','extraordinary_contribution','ownership_change','inspection','adjustment','other')),
  calculation_type text not null default 'fixed' check(calculation_type in('fixed','per_connection','quantity','percentage')),
  unit text not null default 'servicio',
  default_amount numeric(14,2) not null default 0 check(default_amount>=0),
  discount_eligible boolean not null default false,
  requires_approval boolean not null default false,
  requires_evidence boolean not null default false,
  generates_obligation boolean not null default true,
  active boolean not null default true,
  valid_from date not null default current_date,
  valid_to date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);

create table if not exists public.document_template_versions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_type text not null check(document_type in('annual_invoice','payment_receipt','credit_note','void_document','refund_document')),
  version_number int not null,
  status text not null default 'draft' check(status in('draft','active','retired')),
  name text not null,
  configuration jsonb not null default '{}'::jsonb,
  change_reason text,
  activated_by uuid references public.profiles(id),
  activated_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(organization_id,document_type,version_number)
);

create table if not exists public.financial_documents(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_number text not null,
  document_type text not null check(document_type in('annual_invoice','payment_receipt','credit_note','void_document','refund_document','adjustment_document')),
  status text not null default 'posted' check(status in('draft','posted','paid','partially_paid','voided','refunded','partially_refunded')),
  subscriber_id uuid references public.subscribers(id),
  connection_id uuid references public.water_connections(id),
  obligation_id uuid references public.obligations(id),
  payment_id uuid references public.payments(id),
  reversal_of_document_id uuid references public.financial_documents(id),
  fiscal_year int check(fiscal_year is null or fiscal_year between 2000 and 2100),
  posting_date date not null default current_date,
  due_date date,
  base_amount numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  late_fee_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  currency text not null default 'HNL',
  template_snapshot jsonb not null default '{}'::jsonb,
  calculation_snapshot jsonb not null default '{}'::jsonb,
  posted_by uuid references public.profiles(id),
  posted_at timestamptz not null default now(),
  void_reason text,
  created_at timestamptz not null default now(),
  unique(organization_id,document_number)
);

create table if not exists public.portal_update_requests(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  field_name text not null check(field_name in('whatsapp','email','address','photo_path')),
  old_value text,
  new_value text,
  status text not null default 'applied' check(status in('applied','rejected','review_required')),
  source text not null default 'subscriber_portal',
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.benefit_definitions enable row level security;
alter table public.subscriber_benefits enable row level security;
alter table public.service_catalog enable row level security;
alter table public.document_template_versions enable row level security;
alter table public.financial_documents enable row level security;
alter table public.portal_update_requests enable row level security;

create policy benefit_definitions_read on public.benefit_definitions for select
using(organization_id=public.current_organization_id() and public.has_permission('benefits.read'));
create policy subscriber_benefits_read on public.subscriber_benefits for select
using(organization_id=public.current_organization_id() and public.has_permission('benefits.read'));
create policy service_catalog_read on public.service_catalog for select
using(organization_id=public.current_organization_id() and public.has_permission('service_catalog.read'));
create policy document_templates_read on public.document_template_versions for select
using(organization_id=public.current_organization_id() and public.has_permission('document_templates.read'));
create policy financial_documents_read on public.financial_documents for select
using(organization_id=public.current_organization_id() and (public.has_permission('payments.read') or public.has_permission('obligations.read') or public.has_permission('audit.read')));
create policy portal_update_requests_read on public.portal_update_requests for select
using(organization_id=public.current_organization_id() and public.has_permission('portal.manage'));

revoke insert,update,delete on public.benefit_definitions,public.subscriber_benefits,public.service_catalog,public.document_template_versions,public.financial_documents,public.portal_update_requests from authenticated;

insert into public.benefit_definitions(
  organization_id,code,name,minimum_age,percentage,applies_to_all_connections,
  applies_to_annual_fee_only,excludes_late_fees,evidence_type,authority_basis,created_by
)
select o.id,'SENIOR_60','Descuento de adulto mayor',60,25,true,true,true,'dni','Beneficio de adulto mayor aplicable desde los 60 años.',p.id
from public.organizations o
left join lateral(
  select id from public.profiles where organization_id=o.id order by created_at limit 1
) p on true
on conflict(organization_id,code) do update set
  minimum_age=60,percentage=25,applies_to_all_connections=true,
  applies_to_annual_fee_only=true,excludes_late_fees=true,evidence_type='dni',active=true,updated_at=now();

insert into public.service_catalog(organization_id,code,name,description,category,calculation_type,unit,default_amount,discount_eligible,requires_approval,requires_evidence,generates_obligation,created_by)
select o.id,v.code,v.name,v.description,v.category,v.calculation_type,v.unit,v.amount,v.discount_eligible,v.requires_approval,v.requires_evidence,true,p.id
from public.organizations o
left join lateral(select id from public.profiles where organization_id=o.id order by created_at limit 1) p on true
cross join(values
 ('ANUAL','Cuota anual del servicio comunitario de agua potable','Prestación y sostenimiento anual del servicio comunitario de agua potable.','annual_fee','per_connection','pegue',400::numeric,true,false,false),
 ('PEGUE_NUEVO','Instalación de nuevo pegue','Creación e instalación de una nueva conexión al sistema comunitario.','new_connection','fixed','servicio',0::numeric,false,true,true),
 ('RECONEXION','Reconexión del servicio','Restablecimiento autorizado de una conexión suspendida.','reconnection','fixed','servicio',0::numeric,false,true,true),
 ('CAMBIO_TUBERIA','Cambio de tubería','Sustitución autorizada de tubería de la conexión.','pipe_change','quantity','metro',0::numeric,false,true,true),
 ('REPARACION_TUBERIA','Reparación de tubería','Reparación de tubería o accesorios de la conexión.','pipe_repair','fixed','servicio',0::numeric,false,true,true),
 ('FUGA','Reparación de fuga','Atención y reparación de fuga.','leak_repair','fixed','servicio',0::numeric,false,true,true),
 ('MANO_OBRA','Mano de obra','Mano de obra asociada a trabajos autorizados.','labor','quantity','hora',0::numeric,false,true,false),
 ('MATERIALES','Materiales utilizados','Materiales consumidos en una orden de trabajo.','materials','quantity','unidad',0::numeric,false,true,true),
 ('MORA','Multa por mora','Cargo aplicado desde el 1 de diciembre a obligaciones anuales pendientes.','late_fee','fixed','obligación',0::numeric,false,false,false),
 ('APORTE_EXTRA','Aporte extraordinario','Aporte aprobado por la Junta para inversión o contingencia.','extraordinary_contribution','per_connection','pegue',0::numeric,false,true,false)
) as v(code,name,description,category,calculation_type,unit,amount,discount_eligible,requires_approval,requires_evidence)
on conflict(organization_id,code) do nothing;

create or replace function public.age_on_date(p_birth_date date,p_reference date default current_date)
returns int language sql immutable as $$
  select case when p_birth_date is null then null else extract(year from age(p_reference,p_birth_date))::int end
$$;

create or replace function public.sync_senior_benefit(p_subscriber_id uuid,p_reference_date date default current_date)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  subscriber_row public.subscribers%rowtype;
  benefit_row public.benefit_definitions%rowtype;
  identity_id uuid;
  calculated_age int;
  benefit_status text;
begin
  select * into subscriber_row from public.subscribers
  where id=p_subscriber_id and organization_id=public.current_organization_id();
  if subscriber_row.id is null then raise exception 'SUBSCRIBER_NOT_FOUND'; end if;

  select * into benefit_row from public.benefit_definitions
  where organization_id=subscriber_row.organization_id and code='SENIOR_60' and active limit 1;
  if benefit_row.id is null then raise exception 'BENEFIT_NOT_CONFIGURED'; end if;

  calculated_age:=public.age_on_date(subscriber_row.birth_date,p_reference_date);
  select id into identity_id from public.subscriber_identities
  where subscriber_id=subscriber_row.id and organization_id=subscriber_row.organization_id and is_primary limit 1;

  benefit_status:=case when calculated_age>=benefit_row.minimum_age and identity_id is not null then 'active' else 'rejected' end;

  insert into public.subscriber_benefits(
    organization_id,subscriber_id,benefit_definition_id,status,detected_automatically,
    evidence_identity_id,approved_at,valid_from,notes
  ) values(
    subscriber_row.organization_id,subscriber_row.id,benefit_row.id,benefit_status,true,
    identity_id,case when benefit_status='active' then now() else null end,
    greatest(coalesce(subscriber_row.birth_date,current_date)+make_interval(years=>benefit_row.minimum_age),benefit_row.valid_from),
    case when benefit_status='active' then 'Beneficio detectado automáticamente por edad y DNI registrado.' else 'No cumple edad mínima o falta DNI validado.' end
  )
  on conflict(subscriber_id,benefit_definition_id) do update set
    status=excluded.status,evidence_identity_id=excluded.evidence_identity_id,
    approved_at=excluded.approved_at,valid_from=excluded.valid_from,notes=excluded.notes,updated_at=now();

  return jsonb_build_object('subscriber_id',subscriber_row.id,'age',calculated_age,'status',benefit_status,'percentage',benefit_row.percentage);
end
$$;

create or replace function public.calculate_annual_charge(p_subscriber_id uuid,p_year int,p_unit_amount numeric default 400)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  connection_count int;
  birth_date_value date;
  age_value int;
  benefit_percentage numeric:=0;
  base_total numeric;
  discount_total numeric;
begin
  if p_year<2000 or p_year>2100 or p_unit_amount<0 then raise exception 'INVALID_ANNUAL_CHARGE'; end if;
  select count(*) into connection_count from public.water_connections
  where subscriber_id=p_subscriber_id and organization_id=public.current_organization_id() and status='active';
  select birth_date into birth_date_value from public.subscribers
  where id=p_subscriber_id and organization_id=public.current_organization_id();
  if birth_date_value is null and not exists(select 1 from public.subscribers where id=p_subscriber_id and organization_id=public.current_organization_id()) then raise exception 'SUBSCRIBER_NOT_FOUND'; end if;

  age_value:=public.age_on_date(birth_date_value,make_date(p_year,12,31));
  if age_value>=60 and exists(select 1 from public.subscriber_identities where subscriber_id=p_subscriber_id and organization_id=public.current_organization_id() and is_primary) then
    benefit_percentage:=25;
  end if;
  base_total:=connection_count*p_unit_amount;
  discount_total:=round(base_total*benefit_percentage/100,2);
  return jsonb_build_object(
    'year',p_year,'connections',connection_count,'unit_amount',p_unit_amount,
    'base_amount',base_total,'senior_age',age_value,'senior_percentage',benefit_percentage,
    'discount_amount',discount_total,'total_amount',base_total-discount_total,
    'valid_from',make_date(p_year,1,1),'due_date',make_date(p_year,11,30),'late_from',make_date(p_year,12,1)
  );
end
$$;

create or replace function public.list_service_catalog()
returns setof jsonb language sql stable security definer set search_path=public as $$
  select to_jsonb(s) from public.service_catalog s
  where s.organization_id=public.current_organization_id()
    and public.has_permission('service_catalog.read')
  order by s.active desc,s.category,s.name
$$;

create or replace function public.save_service_catalog_item(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare row_value public.service_catalog%rowtype; code_value text;
begin
  if not public.has_permission('service_catalog.manage') or coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'MFA_REQUIRED_OR_FORBIDDEN'; end if;
  code_value:=upper(regexp_replace(trim(coalesce(p_payload->>'code','')),'[^A-Za-z0-9]+','_','g'));
  if code_value='' then code_value:='SRV_'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS'); end if;
  insert into public.service_catalog(organization_id,code,name,description,category,calculation_type,unit,default_amount,discount_eligible,requires_approval,requires_evidence,generates_obligation,active,valid_from,created_by)
  values(public.current_organization_id(),code_value,trim(p_payload->>'name'),nullif(trim(p_payload->>'description'),''),p_payload->>'category',coalesce(nullif(p_payload->>'calculation_type',''),'fixed'),coalesce(nullif(p_payload->>'unit',''),'servicio'),coalesce((p_payload->>'default_amount')::numeric,0),coalesce((p_payload->>'discount_eligible')::boolean,false),coalesce((p_payload->>'requires_approval')::boolean,false),coalesce((p_payload->>'requires_evidence')::boolean,false),coalesce((p_payload->>'generates_obligation')::boolean,true),coalesce((p_payload->>'active')::boolean,true),coalesce((p_payload->>'valid_from')::date,current_date),auth.uid())
  on conflict(organization_id,code) do update set name=excluded.name,description=excluded.description,category=excluded.category,calculation_type=excluded.calculation_type,unit=excluded.unit,default_amount=excluded.default_amount,discount_eligible=excluded.discount_eligible,requires_approval=excluded.requires_approval,requires_evidence=excluded.requires_evidence,generates_obligation=excluded.generates_obligation,active=excluded.active,valid_from=excluded.valid_from,updated_at=now()
  returning * into row_value;
  perform public.write_audit_event('service_catalog.save','service_catalog',row_value.id::text,null,to_jsonb(row_value),null);
  return to_jsonb(row_value);
end
$$;

create or replace function public.list_document_templates()
returns setof jsonb language sql stable security definer set search_path=public as $$
  select to_jsonb(t) from public.document_template_versions t
  where t.organization_id=public.current_organization_id() and public.has_permission('document_templates.read')
  order by t.document_type,t.version_number desc
$$;

create or replace function public.save_document_template(p_document_type text,p_name text,p_configuration jsonb,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare next_version int; result public.document_template_versions%rowtype;
begin
  if not public.has_permission('document_templates.manage') or coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'MFA_REQUIRED_OR_FORBIDDEN'; end if;
  if p_document_type not in('annual_invoice','payment_receipt','credit_note','void_document','refund_document') then raise exception 'INVALID_DOCUMENT_TYPE'; end if;
  select coalesce(max(version_number),0)+1 into next_version from public.document_template_versions where organization_id=public.current_organization_id() and document_type=p_document_type;
  insert into public.document_template_versions(organization_id,document_type,version_number,status,name,configuration,change_reason,created_by)
  values(public.current_organization_id(),p_document_type,next_version,'draft',trim(p_name),coalesce(p_configuration,'{}'::jsonb),nullif(trim(p_reason),''),auth.uid()) returning * into result;
  perform public.write_audit_event('document_template.create','document_template_versions',result.id::text,null,to_jsonb(result),p_reason);
  return to_jsonb(result);
end
$$;

create or replace function public.activate_document_template(p_template_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result public.document_template_versions%rowtype;
begin
  if not public.has_permission('document_templates.manage') or coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'MFA_REQUIRED_OR_FORBIDDEN'; end if;
  select * into result from public.document_template_versions where id=p_template_id and organization_id=public.current_organization_id() for update;
  if result.id is null then raise exception 'TEMPLATE_NOT_FOUND'; end if;
  update public.document_template_versions set status='retired' where organization_id=result.organization_id and document_type=result.document_type and status='active';
  update public.document_template_versions set status='active',activated_by=auth.uid(),activated_at=now() where id=result.id returning * into result;
  perform public.write_audit_event('document_template.activate','document_template_versions',result.id::text,null,to_jsonb(result),'Plantilla activada con MFA');
  return to_jsonb(result);
end
$$;

create or replace function public.set_user_status(p_user_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$
declare old_row public.profiles%rowtype; is_superadmin boolean;
begin
  if not public.has_permission('users.manage') or coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then raise exception 'FORBIDDEN_OR_MFA'; end if;
  if p_status not in('active','inactive','blocked') then raise exception 'INVALID_STATUS'; end if;
  select * into old_row from public.profiles where id=p_user_id and organization_id=public.current_organization_id();
  if old_row.id is null then raise exception 'NOT_FOUND'; end if;
  select exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=p_user_id and r.code='superadmin') into is_superadmin;
  if is_superadmin and p_status<>'active' then raise exception 'SUPERADMIN_MUST_REMAIN_ACTIVE'; end if;
  if old_row.id=auth.uid() and p_status<>'active' then raise exception 'SELF_DISABLE_FORBIDDEN'; end if;
  update public.profiles set status=p_status,updated_at=now() where id=p_user_id;
  perform public.write_audit_event('user.status','profiles',p_user_id::text,to_jsonb(old_row),jsonb_build_object('status',p_status),null);
end
$$;

create or replace function public.get_subscriber_digital_card(p_subscriber_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.has_permission('subscribers.read') then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'id',s.id,'code',s.code,'full_name',s.full_name,'birth_date',s.birth_date,'age',public.age_on_date(s.birth_date,current_date),
    'photo_path',s.photo_path,'whatsapp',s.whatsapp,'email',s.email,'address',s.address,'status',s.status,
    'identity_masked',(select left(i.normalized_number,4)||repeat('*',greatest(length(i.normalized_number)-8,2))||right(i.normalized_number,4) from public.subscriber_identities i where i.subscriber_id=s.id and i.is_primary limit 1),
    'connections',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'code',c.code,'sector',c.sector,'address',c.address,'status',c.status) order by c.code),'[]'::jsonb) from public.water_connections c where c.subscriber_id=s.id),
    'active_connections',(select count(*) from public.water_connections c where c.subscriber_id=s.id and c.status='active'),
    'benefits',(select coalesce(jsonb_agg(jsonb_build_object('code',bd.code,'name',bd.name,'percentage',bd.percentage,'status',sb.status)),'[]'::jsonb) from public.subscriber_benefits sb join public.benefit_definitions bd on bd.id=sb.benefit_definition_id where sb.subscriber_id=s.id),
    'annual_status',(select coalesce(jsonb_agg(jsonb_build_object('year',extract(year from o.due_date)::int,'balance',public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount),'status',case when public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)<=0 then 'paid' when o.due_date<current_date then 'overdue' else 'pending' end) order by extract(year from o.due_date) desc),'[]'::jsonb) from public.obligations o where o.subscriber_id=s.id and o.cancelled_at is null)
  ) into result from public.subscribers s where s.id=p_subscriber_id and s.organization_id=public.current_organization_id();
  if result is null then raise exception 'SUBSCRIBER_NOT_FOUND'; end if;
  return result;
end
$$;

create index if not exists subscriber_birth_date_idx on public.subscribers(organization_id,birth_date);
create index if not exists subscriber_benefits_org_status_idx on public.subscriber_benefits(organization_id,status);
create index if not exists service_catalog_org_category_idx on public.service_catalog(organization_id,category,active);
create index if not exists financial_documents_org_posting_idx on public.financial_documents(organization_id,posting_date desc);
create index if not exists portal_update_requests_org_created_idx on public.portal_update_requests(organization_id,created_at desc);

commit;
