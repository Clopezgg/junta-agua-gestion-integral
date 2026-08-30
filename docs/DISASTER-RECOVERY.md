# Recuperación ante desastres

## Alcance

Este documento describe procedimientos de recuperación coherentes con el código real y con la documentación existente (`OPERACION-SOPORTE-RECUPERACION.md`, `PASO-A-PASO-SUPABASE-RENDER-V3.md`). No declara mecanismos que no existen en el repositorio y respeta el flujo de respaldo de `backup-manager`.

## 1. Objetivos RTO / RPO recomendados

Los siguientes son **objetivos recomendados**, dependientes de la organización y de su operación de respaldos. `backup-manager` es manual y probado en staging; el RPO real corresponde a la frecuencia con que se genere un respaldo.

- **RTO (tiempo de recuperación)**: 4 horas para un restore completo desde el último respaldo válido (función `restore` + verificación). Este valor asume personal técnico preparado y respaldo reciente.
- **RPO (pérdida máxima admisible)**: 24 horas por defecto (respaldos diarios). Si se requiere un RPO menor, la organización debe ejecutar `create` con mayor frecuencia.

El sistema es **operacionalmente tolerante a pérdida de la base de datos persistente** (Postgres) y los archivos de storage, porque ambos residen en Supabase. Para datos financieros la Junta debe acordar la frecuencia de respaldo y dejar constancia en acta.

## 2. Procedimientos de recuperación

### 2.1 Restaurar Postgres desde el respaldo del sistema (backup-manager)

`backup-manager` restaura **filas** de todas las tablas de la organización, las **junctions** y los **archivos de storage** de los cuatro buckets (`subscriber-documents`, `expense-evidence`, `receipt-documents`, `organization-assets`). Pasos:

1. Crear un ambiente limpio: aplicar migraciones `001..034` desde cero con Supabase CLI (`supabase start` o `supabase db push` en el proyecto).
2. Desplegar `backup-manager` y configurar `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Iniciar sesión con un usuario `superadmin` con MFA nivel `aal2` (exigido por la función).
4. En la pantalla Respaldos (`src/pages/Backups.tsx`) seleccionar "Restaurar", escribir la frase `RESTAURAR` y confirmar.
5. La función valida `aal2`, permiso `backups.manage`, existencia del respaldo, checksum SHA-256 y alcance de org, y ejecuta el upsert en orden `restoreOrder` más las junctions.
6. Verificar la sesión en la UI: estado `completed`, `restored_rows`, `restored_files` y `restored_format`.

**Importante**: este mecanismo restaura datos dentro de un esquema ya existente y no borra filas sobrantes (usa `upsert`). No reconstruye esquema, roles de base, ni disparadores; eso se logra aplicando las migraciones.

### 2.2 Restaurar Postgres administrado por Supabase Cloud (alternativa)

Documentado en `PASO-A-PASO-SUPABASE-RENDER-V3.md` (sección 3 y nota "No ejecute migraciones en un proyecto con datos reales sin respaldo") y `OPERACION-SOPORTE-RECUPERACION.md` (sección Recuperación):

1. Congelar operaciones.
2. Exportar el backup actual para investigación.
3. Restaurar el último backup aprobado en ambiente limpio.
4. Comparar conteos por tabla, pagos, obligaciones y documentos.
5. Validar acceso de usuarios, recibos y QR.
6. Reabrir operación con acta interna.

Supabase Cloud ofrece backups administrados (Point-in-Time Recovery / restores de proyecto desde el panel); el proyecto debe confirmar la disponibilidad de PITR como mecanismo administrado externo a este repositorio.

## 3. Pérdida de storage y restauración de buckets

Buckets afectados: `subscriber-documents`, `expense-evidence`, `receipt-documents`, `organization-assets`. Restauración:

1. La herramienta nativa es el mismo respaldo: los archivos viajan embebidos (base64) dentro del JSON de `system-backups` y `backup-manager` los reinserta con `upsert:true` y su `content_type` (mientras el `path` empiece por `{organizationId}/`).
2. Como alternativa administrada, Supabase Storage permite restaurar un bucket desde sus snapshots/versiones en el panel; el proyecto debe confirmar la retención de versiones.
3. El bucket de respaldos `system-backups` guarda los JSON; su pérdida requiere el backup externo (ver `docs/PASO-A-PASO-SUPABASE-RENDER-V3.md` donde se menciona `backup-archives`; el código usa `system-backups`, por lo que `backup-archives` referencia un bucket externo de archivo del diagrama de despliegue, no usado por la función).

Nota: para no improvisar, validar primero el restore en ambiente limpio y en staging antes de producción.

## 4. Reconstrucción del entorno

1. **Migraciones**: aplicar `supabase/migrations/001..034` en orden desde cero (verificado en CI por `db-validate.yml` y `e2e.yml`, que ejecutan `supabase start` y aplican las 34 migraciones).
2. **Bootstrap**: `bootstrap_organization(p_name,p_full_name,p_username)` (migración `001` y versión reforzada en `013`) crea la primera organización, el perfil y el rol `superadmin` con todos los permisos. Solo es válida cuando no existen organizaciones y hay un solo usuario de auth.
3. **Roles y permisos**: `013` (bootstrap de roles) y `032` (permisos granulares `backups.%`).
4. **Referencia de datos**: `supabase/tests/e2e_seed.sql` (71 líneas) usa `bootstrap_organization('Junta de Agua Demo','E2E Administrator','admin')` y siembra un abonado con pegue; sirve como referencia para reconstruir un dataset mínimo de prueba.
5. **Funciones edge**: desplegar con Supabase CLI (`npx supabase functions deploy backup-manager`, etc., según `PASO-A-PASO`).

## 5. Comprobaciones post-recuperación

1. **Integridad de base**: ejecutar `supabase/tests/db_integrity.sql` (valida desde la sección 1 core, permisos `backups.%` en sección 6 y trazabilidad de restauraciones en sección 9).
2. **Tests**: `npm test` (incluye `backup-restore-hardening.test.ts`) y `npx playwright test` (E2E real del flujo con `e2e_seed.sql`, ver `e2e.yml`).
3. **Readiness**: función `get_system_readiness` (migración `025`) y pantalla `src/pages/Progress.tsx`. Revisar el check de área `Continuidad` (`key: 'backups'`) que reporta "Respaldos configurados" si la integración `backup` está `enabled`; una advertencia indica despliegue o credenciales pendientes.
4. Conteos financieros: pagos, obligaciones, `financial_documents`, caja y archivos de recibos (ver `OPERACION-SOPORTE-RECUPERACION.md`, paso 4 de Recuperación).

## 6. Roles, responsabilidades y runbook

### Responsables

- **Operador de plataforma (administrador técnico)**: ejecuta migraciones, despliegue de funciones y verificación de readiness.
- **Superadmin de la organización**: ejecuta `create` y `restore` (único rol con `backups.restore` y `backups.manage`).
- **Admin**: puede `create` y `download` (sin restaurar).
- **Auditor**: solo `read_metadata` (ver sesiones), no opera respaldos.
- **Dirección de la Junta**: aprueba frecuencia de respaldo, RTO/RPO e acta de reapertura.

### Runbook (borrador de checklist operativo)

- [ ] Confirmar útil: `supabase start` / proyecto accesible.
- [ ] Aplicar migraciones `001..034` desde cero en ambiente limpio.
- [ ] Desplegar `backup-manager` y verificar secretos.
- [ ] Login con superadmin + MFA `aal2`.
- [ ] Crear respaldo nuevo (`backup-manager`, acción `create`).
- [ ] Verificar `completed`, checksum y `storage_files`.
- [ ] En desastre: restaurar con frase `RESTAURAR`.
- [ ] Verificar sesión `completed` con `restored_rows`/`restored_files`.
- [ ] Comparar conteos por tabla y documentos.
- [ ] Correr `db_integrity.sql`, `npm test` y checks de readiness en `Progress.tsx`.
- [ ] Validar acceso de usuarios, recibos y QR.
- [ ] Anotar acta interna y reabrir operación.
