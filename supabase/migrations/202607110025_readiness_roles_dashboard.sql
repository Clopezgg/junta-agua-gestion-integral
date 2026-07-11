begin;

create or replace function public.get_system_readiness()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  checks jsonb:='[]'::jsonb;
  org uuid:=public.current_organization_id();
  aal text:=coalesce(auth.jwt()->>'aal','aal1');
begin
  if auth.uid() is null or org is null then raise exception 'AUTH_REQUIRED'; end if;

  checks:=checks||jsonb_build_array(jsonb_build_object(
    'key','auth_mfa','area','Seguridad','label','Sesión con MFA',
    'status',case when aal='aal2' then 'pass' else 'fail' end,
    'detail',case when aal='aal2' then 'La sesión actual alcanzó AAL2.' else 'La sesión no alcanzó AAL2.' end
  ));
  checks:=checks||jsonb_build_array(jsonb_build_object(
    'key','rls_core','area','Seguridad','label','RLS en tablas principales',
    'status',case when not exists(
      select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in(
        'profiles','subscribers','water_connections','obligations','payments','expenses',
        'assets','meter_readings','data_import_batches'
      ) and not c.relrowsecurity
    ) then 'pass' else 'fail' end,
    'detail','Verificación directa de relrowsecurity en tablas críticas.'
  ));
  checks:=checks||jsonb_build_array(jsonb_build_object(
    'key','metering_schema','area','Facturación','label','Lecturas y consumo',
    'status',case when to_regclass('public.meter_readings') is not null
      and to_regprocedure('public.post_meter_reading_batch(uuid)') is not null then 'pass' else 'fail' end,
    'detail','Esquema de lecturas, tarifas escalonadas y facturación idempotente.'
  ));
  checks:=checks||jsonb_build_array(jsonb_build_object(
    'key','imports_schema','area','Datos','label','Importaciones auditadas',
    'status',case when to_regclass('public.data_import_batches') is not null
      and to_regprocedure('public.stage_import_rows(uuid,jsonb)') is not null then 'pass' else 'fail' end,
    'detail','Lotes y filas con resultado individual, errores y trazabilidad.'
  ));
  checks:=checks||jsonb_build_array(jsonb_build_object(
    'key','backups','area','Continuidad','label','Respaldos configurados',
    'status',case when exists(
      select 1 from public.integrations i where i.organization_id=org and i.key='backup' and i.enabled
    ) then 'pass' else 'warning' end,
    'detail','El código incluye backup v4; la disponibilidad remota depende del despliegue de la función.'
  ));
  checks:=checks||jsonb_build_array(jsonb_build_object(
    'key','external_integrations','area','Integraciones','label','Conectores externos',
    'status',case when exists(
      select 1 from public.integrations i
      where i.organization_id=org and i.key in('email','whatsapp','ocr')
        and i.enabled and i.last_error is null
    ) then 'pass' else 'warning' end,
    'detail','Correo, WhatsApp y OCR requieren secretos externos y una prueba reciente.'
  ));
  checks:=checks||jsonb_build_array(jsonb_build_object(
    'key','updates','area','Despliegue','label','GitHub Releases',
    'status',case when exists(
      select 1 from public.system_update_state s
      where s.organization_id=org and s.status='success'
        and s.checked_at>now()-interval '24 hours'
    ) then 'pass' else 'warning' end,
    'detail','La verificación requiere GITHUB_RELEASE_TOKEN para repositorios privados.'
  ));

  return jsonb_build_object(
    'generated_at',now(),
    'checks',checks,
    'summary',jsonb_build_object(
      'pass',(select count(*) from jsonb_array_elements(checks) x where x->>'status'='pass'),
      'warning',(select count(*) from jsonb_array_elements(checks) x where x->>'status'='warning'),
      'fail',(select count(*) from jsonb_array_elements(checks) x where x->>'status'='fail')
    )
  );
end
$$;

create or replace function public.seed_default_roles(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_organization_id is null then raise exception 'ORGANIZATION_REQUIRED'; end if;

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
      'communications.send','ocr.use','map.read','budget.read','assets.read',
      'metering.read','imports.read','imports.manage'
    )) or
    (r.code='treasurer' and p.code in(
      'subscribers.read','tariffs.read','obligations.read',
      'payments.read','payments.create','cash.manage',
      'expenses.read','expenses.create','expenses.approve','expenses.confirm',
      'finance.read','bank.manage','reports.read','reports.export',
      'communications.send','map.read','budget.read','budget.manage','assets.read',
      'metering.read','metering.manage','imports.read'
    )) or
    (r.code='auditor' and p.code in(
      'subscribers.read','tariffs.read','obligations.read','payments.read',
      'expenses.read','finance.read','reports.read','reports.export',
      'audit.read','backups.read','map.read','budget.read','assets.read',
      'metering.read','imports.read','integrations.read','updates.read'
    )) or
    (r.code='member' and p.code in(
      'subscribers.read','tariffs.read','obligations.read','reports.read',
      'map.read','budget.read','assets.read','metering.read'
    )) or
    (r.code='technician' and p.code in(
      'subscribers.read','obligations.read','operations.read','operations.manage',
      'inventory.read','inventory.manage','map.read',
      'assets.read','assets.manage','maintenance.manage',
      'metering.read','metering.manage','imports.read','imports.manage'
    ))
  )
  where r.organization_id=p_organization_id
  on conflict do nothing;

  insert into public.role_permissions(role_id,permission_code)
  select r.id,p.code
  from public.roles r cross join public.permissions p
  where r.organization_id=p_organization_id and r.code='superadmin'
  on conflict do nothing;
end
$$;

revoke all on function public.seed_default_roles(uuid) from public,anon,authenticated;

do $$
declare organization_row record;
begin
  for organization_row in select id from public.organizations loop
    perform public.seed_default_roles(organization_row.id);
  end loop;
end
$$;


create or replace function public.get_role_dashboard()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'overdue_debt',case when public.has_permission('obligations.read') then (
      select coalesce(sum(public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)),0)
      from public.obligations o
      where o.organization_id=public.current_organization_id() and o.cancelled_at is null and o.due_date<current_date
    ) else null end,
    'pending_expenses',case when public.has_permission('expenses.read') then (
      select count(*) from public.expenses e
      where e.organization_id=public.current_organization_id() and e.status in('requested','approved')
    ) else null end,
    'open_work_orders',case when public.has_permission('operations.read') then (
      select count(*) from public.work_orders w
      where w.organization_id=public.current_organization_id() and w.status not in('completed','cancelled')
    ) else null end,
    'urgent_work_orders',case when public.has_permission('operations.read') then (
      select count(*) from public.work_orders w
      where w.organization_id=public.current_organization_id() and w.status not in('completed','cancelled') and w.priority='urgent'
    ) else null end,
    'overdue_maintenance',case when public.has_permission('assets.read') then (
      select count(*) from public.maintenance_plans mp
      where mp.organization_id=public.current_organization_id() and mp.active and mp.next_due_date<current_date
    ) else null end,
    'critical_assets',case when public.has_permission('assets.read') then (
      select count(*) from public.assets a
      where a.organization_id=public.current_organization_id() and a.status<>'retired'
        and (a.condition='critical' or a.criticality='critical')
    ) else null end,
    'low_stock',case when public.has_permission('inventory.read') then (
      select count(*) from public.inventory_items i
      where i.organization_id=public.current_organization_id() and i.active and i.quantity<=i.minimum_stock
    ) else null end,
    'reading_batches_pending',case when public.has_permission('metering.read') then (
      select count(*) from public.meter_reading_batches b
      where b.organization_id=public.current_organization_id() and b.status in('draft','validated')
    ) else null end,
    'reading_errors',case when public.has_permission('metering.read') then (
      select coalesce(sum(b.error_readings),0) from public.meter_reading_batches b
      where b.organization_id=public.current_organization_id() and b.status in('draft','validated')
    ) else null end,
    'import_errors',case when public.has_permission('imports.read') then (
      select coalesce(sum(b.error_rows),0) from public.data_import_batches b
      where b.organization_id=public.current_organization_id() and b.status in('draft','validated','failed')
    ) else null end,
    'budget_status',case when public.has_permission('budget.read') then (
      select fp.status from public.fiscal_periods fp
      where fp.organization_id=public.current_organization_id()
        and fp.fiscal_year=extract(year from current_date)::int limit 1
    ) else null end,
    'active_cash_session',case when public.has_permission('cash.manage') then exists(
      select 1 from public.cash_sessions cs
      where cs.organization_id=public.current_organization_id() and cs.user_id=auth.uid() and cs.status='open'
    ) else null end
  )
$$;


commit;
