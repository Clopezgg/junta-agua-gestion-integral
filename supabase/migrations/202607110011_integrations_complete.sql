begin;

alter table public.payments add column if not exists receipt_path text;

create table if not exists public.communication_messages(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel text not null check(channel in('email','whatsapp')),
  recipient text not null,
  subject text,
  body_preview text,
  provider_message_id text,
  related_payment_id uuid references public.payments(id),
  status text not null default 'queued' check(status in('queued','sent','delivered','read','failed')),
  error_message text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ocr_extractions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  document_kind text not null check(document_kind in('identity','invoice')),
  raw_text text not null default '',
  extracted_data jsonb not null default '{}'::jsonb,
  confidence numeric(6,5),
  status text not null default 'completed' check(status in('completed','failed','reviewed')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.backup_runs(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'running' check(status in('running','completed','failed','restored')),
  storage_path text,
  checksum_sha256 text,
  size_bytes bigint,
  table_counts jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  restored_at timestamptz,
  restored_by uuid references public.profiles(id)
);

insert into public.permissions(code,description) values
('communications.send','Enviar correos y WhatsApp'),
('ocr.use','Procesar documentos con OCR'),
('backups.read','Consultar y descargar respaldos'),
('backups.manage','Crear y restaurar respaldos'),
('map.read','Consultar mapa de pegues')
on conflict(code) do update set description=excluded.description;

insert into public.role_permissions(role_id,permission_code)
select r.id,p.code
from public.roles r
cross join public.permissions p
where r.code='superadmin'
  and p.code in('communications.send','ocr.use','backups.read','backups.manage','map.read')
on conflict do nothing;

insert into public.roles(organization_id,code,name)
select o.id,v.code,v.name
from public.organizations o
cross join (values
 ('admin','Administrador'),
 ('secretary','Secretario'),
 ('treasurer','Tesorero'),
 ('auditor','Fiscal o auditor'),
 ('member','Miembro de Junta'),
 ('technician','Técnico o fontanero')
) as v(code,name)
on conflict(organization_id,code) do nothing;

insert into public.role_permissions(role_id,permission_code)
select r.id,p.code
from public.roles r
join public.permissions p on (
 (r.code='admin' and p.code not in('roles.manage','backups.manage')) or
 (r.code='secretary' and p.code in('subscribers.read','subscribers.create','subscribers.update','tariffs.read','obligations.read','payments.read','payments.create','cash.manage','expenses.read','expenses.create','reports.read','communications.send','ocr.use','map.read')) or
 (r.code='treasurer' and p.code in('subscribers.read','tariffs.read','obligations.read','payments.read','payments.create','cash.manage','expenses.read','expenses.create','expenses.approve','expenses.confirm','finance.read','bank.manage','reports.read','reports.export','communications.send','map.read')) or
 (r.code='auditor' and p.code in('subscribers.read','tariffs.read','obligations.read','payments.read','expenses.read','finance.read','reports.read','reports.export','audit.read','backups.read','map.read')) or
 (r.code='member' and p.code in('subscribers.read','tariffs.read','obligations.read','reports.read','map.read')) or
 (r.code='technician' and p.code in('subscribers.read','obligations.read','operations.read','operations.manage','inventory.read','inventory.manage','map.read'))
)
on conflict do nothing;

alter table public.communication_messages enable row level security;
alter table public.ocr_extractions enable row level security;
alter table public.backup_runs enable row level security;

create policy communication_read on public.communication_messages
for select
using(
  organization_id=public.current_organization_id()
  and (
    public.has_permission('integrations.read')
    or public.has_permission('payments.read')
  )
);

create policy ocr_read on public.ocr_extractions
for select
using(
  organization_id=public.current_organization_id()
  and public.has_permission('ocr.use')
);

create policy backup_read on public.backup_runs
for select
using(
  organization_id=public.current_organization_id()
  and public.has_permission('backups.read')
);

revoke insert,update,delete on public.communication_messages,public.ocr_extractions,public.backup_runs from authenticated;

do $$
begin
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values(
    'system-backups',
    'system-backups',
    false,
    104857600,
    array['application/json','application/gzip','application/octet-stream']
  )
  on conflict(id) do update set
    public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;
exception when undefined_table then
  null;
end
$$;

do $$
begin
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values(
    'receipt-documents',
    'receipt-documents',
    false,
    10485760,
    array['application/pdf']
  )
  on conflict(id) do update set
    public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;
exception when undefined_table then
  null;
end
$$;

create policy receipt_files_read on storage.objects
for select
using(
  bucket_id='receipt-documents'
  and (storage.foldername(name))[1]=public.current_organization_id()::text
  and public.has_permission('payments.read')
);

create policy receipt_files_insert on storage.objects
for insert
with check(
  bucket_id='receipt-documents'
  and (storage.foldername(name))[1]=public.current_organization_id()::text
  and public.has_permission('payments.create')
);

create or replace function public.attach_payment_receipt(
  p_payment_id uuid,
  p_storage_path text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  old_row public.payments%rowtype;
begin
  if not public.has_permission('payments.create') then
    raise exception 'FORBIDDEN';
  end if;

  select *
  into old_row
  from public.payments
  where id=p_payment_id
    and organization_id=public.current_organization_id()
  for update;

  if old_row.id is null then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  update public.payments
  set receipt_path=p_storage_path
  where id=old_row.id;

  perform public.write_audit_event(
    'payment.receipt.attach',
    'payments',
    old_row.id::text,
    to_jsonb(old_row),
    jsonb_build_object('receipt_path',p_storage_path),
    null
  );
end
$$;

create or replace function public.search_payable_accounts(
  p_query text,
  p_limit int default 50
)
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',s.id,
    'code',s.code,
    'full_name',s.full_name,
    'whatsapp',s.whatsapp,
    'email',s.email,
    'total_balance',sum(public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)),
    'obligations',jsonb_agg(
      jsonb_build_object(
        'id',o.id,
        'description',o.description,
        'due_date',o.due_date,
        'balance',public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)
      )
      order by o.due_date
    )
  )
  from public.subscribers s
  join public.obligations o
    on o.subscriber_id=s.id
   and o.cancelled_at is null
  where s.organization_id=public.current_organization_id()
    and public.has_permission('payments.read')
    and public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)>0
    and (
      coalesce(trim(p_query),'')=''
      or s.code ilike '%'||trim(p_query)||'%'
      or s.full_name ilike '%'||trim(p_query)||'%'
      or exists(
        select 1
        from public.subscriber_identities i
        where i.subscriber_id=s.id
          and i.normalized_number like '%'||public.normalize_identifier(p_query)||'%'
      )
    )
  group by s.id
  order by s.full_name
  limit least(greatest(p_limit,1),100)
$$;

create or replace function public.list_payments(p_limit int default 100)
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',p.id,
    'receipt_number',p.receipt_number,
    'subscriber_name',s.full_name,
    'subscriber_whatsapp',s.whatsapp,
    'subscriber_email',s.email,
    'created_at',p.created_at,
    'total',p.total,
    'received_amount',p.received_amount,
    'change_amount',p.change_amount,
    'method',p.method,
    'status',p.status,
    'receipt_path',p.receipt_path,
    'verification_token',p.verification_token
  )
  from public.payments p
  join public.subscribers s on s.id=p.subscriber_id
  where p.organization_id=public.current_organization_id()
    and public.has_permission('payments.read')
  order by p.created_at desc
  limit least(greatest(p_limit,1),500)
$$;

create or replace function public.save_integration_public_config(
  p_key text,
  p_public_config jsonb,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  integration_row public.integrations%rowtype;
begin
  if not public.has_permission('integrations.manage')
     or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;

  if p_key not in('google_maps','ocr','whatsapp','email','backup') then
    raise exception 'INVALID_INTEGRATION';
  end if;

  insert into public.integrations(
    organization_id,key,enabled,public_config,updated_by
  )
  values(
    public.current_organization_id(),
    p_key,
    p_enabled,
    coalesce(p_public_config,'{}'::jsonb),
    auth.uid()
  )
  on conflict(organization_id,key) do update set
    enabled=excluded.enabled,
    public_config=excluded.public_config,
    updated_by=auth.uid(),
    updated_at=now()
  returning * into integration_row;

  perform public.write_audit_event(
    'integration.public_config',
    'integrations',
    integration_row.id::text,
    null,
    jsonb_build_object(
      'key',integration_row.key,
      'enabled',integration_row.enabled,
      'public_config',integration_row.public_config
    ),
    null
  );

  return jsonb_build_object(
    'key',integration_row.key,
    'enabled',integration_row.enabled,
    'secret_configured',integration_row.secret_configured
  );
end
$$;

create or replace function public.list_connection_map_points(
  p_status text default null,
  p_sector text default null
)
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'connection_id',c.id,
    'connection_code',c.code,
    'subscriber_id',s.id,
    'subscriber_code',s.code,
    'subscriber_name',s.full_name,
    'sector',c.sector,
    'address',c.address,
    'status',c.status,
    'latitude',c.latitude,
    'longitude',c.longitude,
    'meter_number',c.meter_number,
    'debt_status',case
      when exists(
        select 1
        from public.obligations o
        where o.connection_id=c.id
          and o.cancelled_at is null
          and public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)>0
          and o.due_date<current_date
      ) then 'moroso'
      else 'solvente'
    end
  )
  from public.water_connections c
  join public.subscribers s on s.id=c.subscriber_id
  where c.organization_id=public.current_organization_id()
    and public.has_permission('map.read')
    and c.latitude is not null
    and c.longitude is not null
    and (p_status is null or c.status::text=p_status)
    and (
      p_sector is null
      or trim(p_sector)=''
      or c.sector ilike '%'||trim(p_sector)||'%'
    )
  order by c.sector,s.full_name
$$;

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
    'organization',o.name
  )
  from public.payments p
  join public.subscribers s on s.id=p.subscriber_id
  join public.organizations o on o.id=p.organization_id
  where p.verification_token=p_token
  limit 1
$$;

grant execute on function public.verify_receipt_public(uuid) to anon,authenticated;

create or replace function public.list_communication_messages(p_limit int default 50)
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select to_jsonb(m)
  from public.communication_messages m
  where m.organization_id=public.current_organization_id()
    and (
      public.has_permission('integrations.read')
      or public.has_permission('payments.read')
    )
  order by m.created_at desc
  limit least(greatest(p_limit,1),200)
$$;

create or replace function public.list_ocr_extractions(p_limit int default 50)
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select to_jsonb(x)
  from public.ocr_extractions x
  where x.organization_id=public.current_organization_id()
    and public.has_permission('ocr.use')
  order by x.created_at desc
  limit least(greatest(p_limit,1),200)
$$;

create or replace function public.list_backup_runs()
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select to_jsonb(b)
  from public.backup_runs b
  where b.organization_id=public.current_organization_id()
    and public.has_permission('backups.read')
  order by b.created_at desc
  limit 100
$$;

create index if not exists communication_messages_org_created_idx
on public.communication_messages(organization_id,created_at desc);

create index if not exists ocr_extractions_org_created_idx
on public.ocr_extractions(organization_id,created_at desc);

create index if not exists backup_runs_org_created_idx
on public.backup_runs(organization_id,created_at desc);

create index if not exists water_connections_map_idx
on public.water_connections(organization_id,sector)
where latitude is not null and longitude is not null;

commit;
