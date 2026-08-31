# Respaldo y restauración

## Alcance

Este documento describe el comportamiento real del subsistema de respaldo y restauración implementado en la Edge Function `supabase/functions/backup-manager/index.ts` y en las migraciones `011` (`backup_runs`), `032` (permisos granulares) y `034` (`backup_restore_sessions`). Todo lo aquí escrito se verifica leyendo esos archivos.

## 1. Arquitectura del respaldo

- **Edge Function Deno**: `backup-manager` corre en Deno (`Deno.serve`) y usa el cliente oficial `@supabase/supabase-js@2`.
- **Bucket privado**: escrita con el service role en `storage.buckets` `system-backups` (migración `011`, línea 129). Es `public=false`, limitado a 100 MiB y MIME `application/json`, `application/gzip`, `application/octet-stream`. No se convierte en público.
- **Tablas respaldadas (arrays `direct`)**: `profiles, roles, subscribers, subscriber_identities, water_connections, duplicate_reviews, benefit_definitions, subscriber_benefits, portal_update_requests, tariff_definitions, tariff_versions, service_catalog, obligations, debt_override_events, consumption_tariff_schemes, consumption_tariff_blocks, meter_reading_batches, meter_readings, document_template_versions, financial_documents, document_sequences, cash_sessions, payments, payment_events, suppliers, expenses, bank_accounts, ledger_entries, fiscal_periods, budget_categories, budget_lines, integrations, integration_runs, system_update_state, assets, maintenance_plans, work_orders, asset_maintenance_log, inventory_items, inventory_movements, system_health_checks, communication_messages, ocr_extractions, data_import_batches, data_import_rows`.
- **Tablas de unión (junctions)**, filtradas por id de la org: `role_permissions` (por `role_id`), `user_roles` (por `user_id`), `payment_allocations` y `payment_components` (por `payment_id`). No se respaldan tablas de otras organizaciones: cada tabla con `organization_id` se filtra con `.eq('organization_id', organizationId)`.
- **Buckets de archivos (`fileBuckets`)**: `subscriber-documents`, `expense-evidence`, `receipt-documents`, `organization-assets`, recorridos en árbol bajo `root = String(organizationId)`.
- **Agrupación por lotes de 1000**: solo en la lectura de storage. `collectFiles` itera `list(path, {limit:1000, offset, sortBy...})` y avanza de a 1000 por página. Esto **no** aplica a la ejecución de un backup (ocurre en creación) ni a la restauración.
- **Compresión/checksum**: no hay compresión; el payload es `JSON.stringify`. Se calcula checksum **SHA-256** sobre el JSON completo (`sha256`) y se guarda en `backup_runs.checksum_sha256`.
- **Path por organización**: cada archivo se sube a `system-backups/{organizationId}/{timestamp}-{run.id}.json` con `upsert:false`. `timestamp` es el ISO con `:` y `.` reemplazados por `-`.
- **Formato del payload**: `format: 'junta-agua-backup-v5'` con `created_at`, `organization_id`, `organization` (fila completa), `tables`, `junctions` y `files` (cada archivo con `path`, `content_type`, `size`, `base64`). Se acepta restaurar formatos `v1` a `v5`.
- **Estados de `backup_runs`**: `running`, `completed`, `failed`, `restored` (migración `011`, línea 40).

## 2. Acciones y MFA

- **Nombres de acción reales** en la Edge Function: `create`, `download`, `restore` (NO existen `backup` ni `list` como acciones de la función). El `list` de respaldos se hace por RPC `list_backup_runs` (migración `011`, lectura con `backups.read`), fuera de la función.
- **MFA obligatorio en todas las acciones de la función**: antes de despachar cualquier acción, `getAuthenticatorAssuranceLevel()` debe devolver `aal2`, si no lanza `MFA_REQUIRED` (línea 100). Esto cubre `create`, `download` y `restore`.
- **Permiso por acción**: `needed = body.action==='download' ? 'backups.read' : 'backups.manage'` (línea 96) verificado vía `has_permission`. `restore` y `create` exigen `backups.manage`.
- **Autenticación**: `auth.getUser()` obligatorio (`AUTH_REQUIRED`). La org se obtiene del perfil del llamante (`profiles.organization_id`).
- **Trazabilidad en `audit_events`**: se inserta el evento `backup.restore` (línea 226) con `entity_type: 'backup_runs'`, `entity_id` y `new_data` con formato y conteos. No hay evento explícito para `create`/`download`.
- **Sesión de restauración (migración 034)**: cada `restore` abre una fila en `backup_restore_sessions` con trazabilidad de quién, cuándo, desde qué respaldo y resultados.

## 3. Flujo de restauración

1. El usuario escribe la frase de confirmación `RESTAURAR` (`confirm_phrase`), si no se lanza `CONFIRMATION_REQUIRED`.
2. Se busca el `backup_runs` con `status in ('completed','restored')` de la misma org (`BACKUP_NOT_FOUND` en caso contrario).
3. Se descarga el JSON desde storage y se valida `sha256 == checksum_sha256` (`CHECKSUM_MISMATCH`).
4. Validaciones de alcance: `payload.organization_id === organizationId` y `format` en `v1..v5` (`BACKUP_SCOPE_INVALID`).
5. Se inserta la sesión `status:'running'`.
6. Reinserción en orden `restoreOrder` (migraciones dependientes primero: `roles`, `profiles`, luego abonados, tarifas, pagos, etc. hasta `data_import_rows`). Cada tabla se restaura con **un único `upsert(rows)`** (no por lotes). Se usa `upsert` para `organizations` y para las junctions `role_permissions`, `user_roles`, `payment_allocations`, `payment_components`.
7. Archivos: para cada bucket, cada item se sube con `upsert:true` y su `content_type`; se valida `item.path` empiece por `{organizationId}/` (`FILE_SCOPE_INVALID`).
8. Conteos: `restored_rows` (filas + 1 por `organizations`) y `restored_files` (número de archivos subidos).
9. Éxito: la sesión pasa a `completed` con `restored_format`, `restored_rows`, `restored_files`; el `backup_runs` pasa a `restored` con `restored_at` y `restored_by`; se inserta `audit_events` `backup.restore`.
10. Falla: `failRestore` marca la sesión y el `backup_runs` como `failed` con `error_message`.
- **Estados de sesión**: `running`, `completed`, `failed` (check en migración 034).

## 4. Retención y limpieza

- **Limpieza automática implementada (migración 035 + `backup-manager`)**: al crear un respaldo, la Edge Function resuelve la retención de la integración `backup` (`public_config.retention_days`; predeterminado `90` días) y la guarda como `retention_days` en la fila del respaldo (rango `[1,3650]`).
- Cada corrida en estado `completed` o `restored` con `completed_at` anterior al corte (`now() - retention_days`) se poda: se elimina el archivo de `system-backups`, la fila pasa a `status='pruned'` con `storage_path=null`, `pruned_at` y `pruned_by`, y se escribe `audit_events` (`backup.prune`) con ruta, checksum, tamaño y retención aplicada. Así las filas eliminadas conservan su traza en la lista.
- `list_backup_runs()` no filtra por estado: los respaldos podados aparecen como `Eliminado por retención` en la pantalla y **no ofrecen descarga/restauración** (la lógica de descarga/restauración solo acepta `completed`/`restored`). La poda es idempotente y por organización.
- Si un borrado de storage falla, la fila no se marca y el directorio se reporta en `prune_failed`; la siguiente corrida reintentará.

## 5. Restricciones y seguridad

- `backup_runs` (migración 011): RLS habilitado con política `backup_read` que exige `organization_id = current_organization_id()` y `has_permission('backups.read')`. Se revoca `insert, update, delete` a `authenticated`.
- `backup_restore_sessions` (migración 034): **RLS sin políticas** (`enable row level security` + `revoke all ... from public, anon, authenticated`). Solo la Edge Function (service role) escribe.
- Función `get_backup_restore_sessions(p_limit default 100)`: `security definer`, limita a la org actual con `current_organization_id()` y exige `backups.read_metadata`. Devuelve id, `backup_run_id`, `status`, `restored_format`, `restored_rows`, `restored_files`, `started_at`, `finished_at`, `error_message`; orden descendente y límite `[1,500]`.
- `list_backup_runs()` (migración 011): `security definer`, restringida a la org y a `backups.read`.
- **Permisos por rol (migración 032, líneas 1103-1111)**:
  - `superadmin`: `backups.read_metadata`, `backups.create`, `backups.download`, `backups.restore`.
  - `admin`: `backups.read_metadata`, `backups.create`, `backups.download` (sin restaurar).
  - `auditor`: `backups.read_metadata`.
  - Permisos ya definidos en 011: `backups.read` (superadmin, admin, auditor) y `backups.manage` (solo superadmin). En total 6 códigos `backups.%` verificados por `db_integrity.sql` (sección 6, `n<>6`).

## 6. Validación

- **Tests vitest**: `src/tests/backup-restore-hardening.test.ts` comprueba MFA en todas las acciones (`MFA_REQUIRED`, `aal2`, ausencia de excepción para download), la apertura de sesión con filas/archivos y `restore_session_id`, la migración 034 con RLS sin políticas y lectura restringida, la pantalla que muestra las sesiones, y la validación en CI hasta la migración 034.
- **db_integrity.sql** (sección 9): verifica existencia de `backup_restore_sessions` (migración 034) y de `get_backup_restore_sessions(int)`; la sección 6 verifica los 6 permisos `backups.%`.
- **CI local**: `.github/workflows/db-validate.yml` levanta Postgres local, aplica migraciones 001..034 y corre `db_integrity.sql`; además valida sintaxis de la función con `deno check`.
- **Prueba manual de extremo a extremo** (según `docs/OPERACION-SOPORTE-RECUPERACION.md`): crear respaldo, descargarlo y restaurarlo sobre base limpia, comparando conteos por tabla.
