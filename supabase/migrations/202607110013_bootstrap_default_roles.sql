begin;

create or replace function public.seed_default_roles(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_organization_id is null then
    raise exception 'ORGANIZATION_REQUIRED';
  end if;

  insert into public.roles(organization_id,code,name)
  values
    (p_organization_id,'admin','Administrador'),
    (p_organization_id,'secretary','Secretario'),
    (p_organization_id,'treasurer','Tesorero'),
    (p_organization_id,'auditor','Fiscal o auditor'),
    (p_organization_id,'member','Miembro de Junta'),
    (p_organization_id,'technician','Técnico o fontanero')
  on conflict(organization_id,code) do update set name=excluded.name;

  insert into public.role_permissions(role_id,permission_code)
  select r.id,p.code
  from public.roles r
  join public.permissions p on (
    (r.code='admin' and p.code not in('roles.manage','backups.manage')) or
    (r.code='secretary' and p.code in(
      'subscribers.read','subscribers.create','subscribers.update',
      'tariffs.read','obligations.read','payments.read','payments.create',
      'cash.manage','expenses.read','expenses.create','reports.read',
      'communications.send','ocr.use','map.read'
    )) or
    (r.code='treasurer' and p.code in(
      'subscribers.read','tariffs.read','obligations.read',
      'payments.read','payments.create','cash.manage',
      'expenses.read','expenses.create','expenses.approve','expenses.confirm',
      'finance.read','bank.manage','reports.read','reports.export',
      'communications.send','map.read'
    )) or
    (r.code='auditor' and p.code in(
      'subscribers.read','tariffs.read','obligations.read','payments.read',
      'expenses.read','finance.read','reports.read','reports.export',
      'audit.read','backups.read','map.read'
    )) or
    (r.code='member' and p.code in(
      'subscribers.read','tariffs.read','obligations.read','reports.read','map.read'
    )) or
    (r.code='technician' and p.code in(
      'subscribers.read','obligations.read','operations.read','operations.manage',
      'inventory.read','inventory.manage','map.read'
    ))
  )
  where r.organization_id=p_organization_id
  on conflict do nothing;
end
$$;

revoke all on function public.seed_default_roles(uuid) from public,anon,authenticated;

create or replace function public.bootstrap_organization(
  p_name text,
  p_full_name text,
  p_username text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  org uuid;
  superadmin_role uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if exists(select 1 from public.organizations)
     or (select count(*) from auth.users)>1 then
    raise exception 'BOOTSTRAP_DENIED';
  end if;

  if length(trim(coalesce(p_name,'')))<3
     or length(trim(coalesce(p_full_name,'')))<3
     or length(trim(coalesce(p_username,'')))<3 then
    raise exception 'INVALID_BOOTSTRAP_DATA';
  end if;

  insert into public.organizations(name)
  values(trim(p_name))
  returning id into org;

  insert into public.profiles(id,organization_id,full_name,username,status)
  values(
    auth.uid(),
    org,
    trim(p_full_name),
    lower(trim(p_username)),
    'active'
  );

  insert into public.roles(organization_id,code,name)
  values(org,'superadmin','Administrador principal')
  returning id into superadmin_role;

  insert into public.role_permissions(role_id,permission_code)
  select superadmin_role,code
  from public.permissions
  on conflict do nothing;

  insert into public.user_roles(user_id,role_id)
  values(auth.uid(),superadmin_role)
  on conflict do nothing;

  perform public.seed_default_roles(org);

  perform public.write_audit_event(
    'bootstrap',
    'organization',
    org::text,
    null,
    jsonb_build_object('name',trim(p_name)),
    'Inicialización segura con roles predeterminados'
  );

  return org;
end
$$;

revoke all on function public.bootstrap_organization(text,text,text) from public,anon;
grant execute on function public.bootstrap_organization(text,text,text) to authenticated;

do $$
declare
  organization_row record;
begin
  for organization_row in select id from public.organizations loop
    perform public.seed_default_roles(organization_row.id);
  end loop;
end
$$;

commit;
