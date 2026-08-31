-- ============================================================================
-- 034 — TRAZABILIDAD DE SESIONES DE RESTAURACIÓN
--
-- Cada restauración (respaldos junta-agua-backup-v5) queda registrada en
-- backup_restore_sessions: quién la solicitó, cuándo, desde qué respaldo,
-- cuántas filas/archivos se reinsertaron y el error si falló.
--
-- Solo la Edge Function backup-manager (service role) escribe; el RLS queda
-- sin políticas para que la API nunca exponga ni modifique este registro.
-- Una función de lectura restringe a la propia organización y al permiso
-- backups.read_metadata.
-- ============================================================================

begin;

create table if not exists public.backup_restore_sessions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  backup_run_id uuid not null references public.backup_runs(id),
  requested_by uuid references public.profiles(id),
  status text not null default 'running' check(status in('running','completed','failed')),
  restored_format text,
  restored_rows int not null default 0,
  restored_files int not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text
);

create index if not exists backup_restore_sessions_org_started_idx
  on public.backup_restore_sessions(organization_id,started_at desc);

alter table public.backup_restore_sessions enable row level security;
revoke all on public.backup_restore_sessions from public,anon,authenticated;

create or replace function public.get_backup_restore_sessions(p_limit int default 100)
returns table(
  id uuid,
  backup_run_id uuid,
  status text,
  restored_format text,
  restored_rows int,
  restored_files int,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text
)
language sql
stable
security definer
set search_path=public
as $$
  select s.id,s.backup_run_id,s.status,s.restored_format,s.restored_rows,s.restored_files,s.started_at,s.finished_at,s.error_message
  from public.backup_restore_sessions s
  where s.organization_id=public.current_organization_id()
    and public.has_permission('backups.read_metadata')
  order by s.started_at desc
  limit greatest(1,least(p_limit,500));
$$;

grant execute on function public.get_backup_restore_sessions(int) to authenticated;

commit;