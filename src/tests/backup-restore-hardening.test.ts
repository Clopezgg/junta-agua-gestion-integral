import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const backup=fs.readFileSync('supabase/functions/backup-manager/index.ts','utf8');
const backupsPage=fs.readFileSync('src/pages/Backups.tsx','utf8');
const backupsService=fs.readFileSync('src/features/backups/service.ts','utf8');
const m034=fs.readFileSync('supabase/migrations/202607110034_backup_restore_sessions.sql','utf8');
const dbIntegrity=fs.readFileSync('supabase/tests/db_integrity.sql','utf8');
const readme=fs.readFileSync('README.md','utf8');

describe('respaldo y restauración (migración 034 + backup-manager)',()=>{
 it('respaldos, descargas y restauraciones exigen MFA en todos los casos',()=>{
  expect(backup).toContain('MFA_REQUIRED');
  expect(backup).not.toContain("body.action!=='download'");
  expect(backup).toContain("getAuthenticatorAssuranceLevel()");
  expect(backup).toContain('aal2');
 });
 it('cada restauración abre una sesión trazable con filas, archivos y errores',()=>{
  expect(backup).toContain('backup_restore_sessions');
  expect(backup).toContain("action:'backup.restore'");
  expect(backup).toContain('restore_session_id');
  expect(backup).toContain('restored_rows');
  expect(backup).toContain('restored_files');
  expect(backup).toContain('failRestore');
 });
 it('la migración 034 crea la traza con RLS sin políticas y lectura restringida',()=>{
  expect(m034).toContain('backup_restore_sessions');
  expect(m034).toContain('enable row level security');
  expect(m034).toContain('revoke all on public.backup_restore_sessions');
  expect(m034).toContain('get_backup_restore_sessions');
  expect(m034).toContain("has_permission('backups.read_metadata')");
 });
 it('la pantalla de respaldos muestra las sesiones de restauración',()=>{
  expect(backupsService).toContain("rpc('get_backup_restore_sessions')");
  expect(backupsPage).toContain('Sesiones de restauración');
  expect(backupsPage).toContain('restored_rows');
  expect(backupsPage).toContain('requieren MFA');
 });
   it('la validación en CI comprueba la traza y la documentación llega a la 047',()=>{
    expect(dbIntegrity).toContain("to_regclass('public.backup_restore_sessions')");
    expect(dbIntegrity).toContain("to_regprocedure('public.get_backup_restore_sessions(int)')");
    expect(fs.existsSync('supabase/migrations/202607110034_backup_restore_sessions.sql')).toBe(true);
    expect(readme).toContain('001` a `047');
   });
});