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
      'communications.send','ocr.use','map.read','budget.read','assets.read'
    )) or
    (r.code='treasurer' and p.code in(
      'subscribers.read','tariffs.read','obligations.read',
      'payments.read','payments.create','cash.manage',
      'expenses.read','expenses.create','expenses.approve','expenses.confirm',
      'finance.read','bank.manage','reports.read','reports.export',
      'communications.send','map.read','budget.read','budget.manage','assets.read'
    )) or
    (r.code='auditor' and p.code in(
      'subscribers.read','tariffs.read','obligations.read','payments.read',
      'expenses.read','finance.read','reports.read','reports.export',
      'audit.read','backups.read','map.read','budget.read','assets.read'
    )) or
    (r.code='member' and p.code in(
      'subscribers.read','tariffs.read','obligations.read','reports.read',
      'map.read','budget.read','assets.read'
    )) or
    (r.code='technician' and p.code in(
      'subscribers.read','obligations.read','operations.read','operations.manage',
      'inventory.read','inventory.manage','map.read',
      'assets.read','assets.manage','maintenance.manage'
    ))
  )
  where r.organization_id=p_organization_id
  on conflict do nothing;

  insert into public.role_permissions(role_id,permission_code)
  select r.id,p.code
  from public.roles r
  cross join public.permissions p
  where r.organization_id=p_organization_id
    and r.code='superadmin'
  on conflict do nothing;
end
$$;

revoke all on function public.seed_default_roles(uuid) from public,anon,authenticated;

DO $$
declare
  organization_row record;
begin
  for organization_row in select id from public.organizations loop
    perform public.seed_default_roles(organization_row.id);
  end loop;
end
$$;

commit;
