-- Retención automática de respaldos.
-- 035: el backup-manager ahora poda los respaldos vencidos según la retención
-- configurada en la integración 'backup' (public_config.retention_days,
-- predeterminado 90). Esta migración amplía el esquema y mantiene la traza de
-- cada poda en la propia fila (pruned_at/pruned_by) además del registro en
-- audit_events.

alter table public.backup_runs
  drop constraint backup_runs_status_check;

alter table public.backup_runs
  add constraint backup_runs_status_check
  check (status in ('running','completed','failed','restored','pruned'));

alter table public.backup_runs
  add column retention_days int not null default 90
  check (retention_days between 1 and 3650);

alter table public.backup_runs
  add column pruned_at timestamptz;

alter table public.backup_runs
  add column pruned_by uuid references public.profiles(id);

create index if not exists backup_runs_org_completed_idx
on public.backup_runs(organization_id, completed_at)
where status in ('completed','restored');