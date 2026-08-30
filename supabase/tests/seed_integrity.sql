-- Semilla idempotente para la validación de integridad (db_integrity.sql).
-- Emula el estado posterior al bootstrap real (bootstrap_organization): una
-- organización con sus roles por defecto y el rol superadmin con todo el
-- catálogo de permisos (incluidos los 6 códigos backups.*).
begin;

insert into public.organizations(name)
select 'Integridad'
where not exists (select 1 from public.organizations);

insert into public.roles(organization_id,code,name)
select o.id,v.code,v.name
from public.organizations o
cross join (values
  ('superadmin','Administrador principal'),
  ('admin','Administrador'),
  ('auditor','Fiscal o auditor')
) as v(code,name)
on conflict(organization_id,code) do nothing;

insert into public.role_permissions(role_id,permission_code)
select r.id,p.code
from public.roles r
cross join public.permissions p
where r.code='superadmin'
on conflict do nothing;

commit;