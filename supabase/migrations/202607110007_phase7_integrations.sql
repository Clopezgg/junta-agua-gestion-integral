begin;

create table public.integrations(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  enabled boolean not null default false,
  public_config jsonb not null default '{}'::jsonb,
  secret_configured boolean not null default false,
  last_checked_at timestamptz,
  last_error text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique(organization_id,key)
);

insert into public.permissions(code,description) values
('integrations.read','Consultar integraciones'),
('integrations.manage','Administrar integraciones')
on conflict(code) do update set description=excluded.description;

insert into public.role_permissions(role_id,permission_code)
select r.id,p.code
from public.roles r
cross join public.permissions p
where r.code='superadmin'
  and p.code in('integrations.read','integrations.manage')
on conflict do nothing;

alter table public.integrations enable row level security;

create policy integrations_read on public.integrations
for select
using(
  organization_id=public.current_organization_id()
  and public.has_permission('integrations.read')
);

revoke insert,update,delete on public.integrations from authenticated;

create or replace function public.list_integrations()
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'key',i.key,
    'enabled',i.enabled,
    'public_config',i.public_config,
    'secret_configured',i.secret_configured,
    'last_checked_at',i.last_checked_at,
    'last_error',i.last_error
  )
  from public.integrations i
  where i.organization_id=public.current_organization_id()
    and public.has_permission('integrations.read')
  order by i.key
$$;

create or replace function public.save_integration(
  p_key text,
  p_public_config jsonb,
  p_enabled boolean,
  p_secret_configured boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  r public.integrations%rowtype;
begin
  if not public.has_permission('integrations.manage')
     or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;

  if p_key not in('google_maps','ocr','whatsapp','email','backup') then
    raise exception 'INVALID_INTEGRATION';
  end if;

  insert into public.integrations(
    organization_id,key,enabled,public_config,
    secret_configured,last_checked_at,updated_by
  )
  values(
    public.current_organization_id(),
    p_key,
    p_enabled,
    coalesce(p_public_config,'{}'::jsonb),
    p_secret_configured,
    now(),
    auth.uid()
  )
  on conflict(organization_id,key) do update set
    enabled=excluded.enabled,
    public_config=excluded.public_config,
    secret_configured=excluded.secret_configured,
    last_checked_at=now(),
    updated_by=auth.uid(),
    updated_at=now()
  returning * into r;

  perform public.write_audit_event(
    'integration.save',
    'integrations',
    r.id::text,
    null,
    jsonb_build_object(
      'key',r.key,
      'enabled',r.enabled,
      'secret_configured',r.secret_configured
    ),
    null
  );

  return jsonb_build_object(
    'key',r.key,
    'enabled',r.enabled,
    'secret_configured',r.secret_configured
  );
end
$$;

commit;
