
begin;

insert into public.permissions(code,description) values
  ('updates.read','Consultar versiones y actualizaciones del sistema')
on conflict(code) do update set description=excluded.description;

insert into public.role_permissions(role_id,permission_code)
select r.id,p.code
from public.roles r
cross join public.permissions p
where
  (r.code in('superadmin','admin','auditor') and p.code='updates.read')
on conflict do nothing;

create table public.integration_runs(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_key text not null,
  operation text not null,
  status text not null check(status in('running','success','warning','failed')),
  request_summary jsonb not null default '{}'::jsonb,
  response_summary jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_ms integer check(duration_ms is null or duration_ms>=0),
  actor_id uuid references public.profiles(id)
);

create table public.system_update_state(
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  current_version text not null,
  latest_version text,
  update_available boolean not null default false,
  release_url text,
  release_name text,
  release_notes text,
  published_at timestamptz,
  checked_at timestamptz not null default now(),
  status text not null check(status in('success','warning','failed')),
  error_message text,
  details jsonb not null default '{}'::jsonb,
  checked_by uuid references public.profiles(id)
);

create index integration_runs_org_date_idx on public.integration_runs(organization_id,started_at desc);
create index integration_runs_key_status_idx on public.integration_runs(organization_id,integration_key,status,started_at desc);

alter table public.integration_runs enable row level security;
alter table public.system_update_state enable row level security;

create policy integration_runs_read on public.integration_runs
for select using(
  organization_id=public.current_organization_id()
  and public.has_permission('integrations.read')
);

create policy system_update_state_read on public.system_update_state
for select using(
  organization_id=public.current_organization_id()
  and public.has_permission('updates.read')
);

revoke insert,update,delete on public.integration_runs,public.system_update_state from authenticated;

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

  if p_key not in('google_maps','ocr','whatsapp','email','backup','github_updates') then
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

create or replace function public.list_integration_runs(
  p_key text default null,
  p_limit integer default 100
)
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',r.id,'integration_key',r.integration_key,'operation',r.operation,
    'status',r.status,'request_summary',r.request_summary,'response_summary',r.response_summary,
    'error_code',r.error_code,'error_message',r.error_message,
    'started_at',r.started_at,'completed_at',r.completed_at,'duration_ms',r.duration_ms,
    'actor_id',r.actor_id,'actor_name',p.full_name
  )
  from public.integration_runs r
  left join public.profiles p on p.id=r.actor_id
  where r.organization_id=public.current_organization_id()
    and public.has_permission('integrations.read')
    and (coalesce(trim(p_key),'')='' or r.integration_key=p_key)
  order by r.started_at desc
  limit least(greatest(p_limit,1),500)
$$;

create or replace function public.get_update_state()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(
    (select to_jsonb(s) from public.system_update_state s
     where s.organization_id=public.current_organization_id()
       and public.has_permission('updates.read')),
    jsonb_build_object(
      'organization_id',public.current_organization_id(),
      'current_version',null,'latest_version',null,'update_available',false,
      'status','warning','checked_at',null,'error_message','Todavía no se ha consultado GitHub Releases.'
    )
  )
$$;


commit;
