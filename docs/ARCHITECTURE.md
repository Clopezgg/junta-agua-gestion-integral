# Arquitectura — ERP Comunitario "Junta de Agua"

## 1. Visión general

Aplicación de una sola página (SPA) construida con React 18 y Vite, con backend
como servicio de Supabase Cloud:

- **Auth**: Supabase Auth (correo/contraseña, MFA TOTP).
- **Base de datos**: Postgres con políticas de seguridad a nivel de fila (RLS),
  la mayoría de escrituras vía funciones `security definer`.
- **Storage**: buckets `subscriber-documents`, `expense-evidence`,
  `receipt-documents`, `organization-assets`.
- **Edge Functions**: funciones serverless en Deno para operaciones que no
  pueden ejecutarse con el anon key (envío de correos/WhatsApp, OCR,
  administración de usuarios, respaldos, portal de abonados, webhooks).
- **Despliegue**: frontend estático en Render (SPA con `_redirects`), Supabase
  Cloud como backend. La versión se inyecta en el build como `__APP_VERSION__`
  (`vite.config.ts`) y se lee desde `src/lib/version.ts`.

PWA con service worker versionado por build: `scripts/bake-sw.mjs` reemplaza
el nombre de caché `junta-agua-shell-v<version>-<sha>` en `dist/sw.js` a partir
del template `public/sw.js`. Se registra en `src/main.tsx` solo en producción.
El shell (HTML, manifiesto, iconos, health) queda en caché, pero las
operaciones financieras requieren conexión.

## 2. Modelo de datos

Esquemas aplicados en migraciones `supabase/migrations/202607110001`..
`202607110034`, todas en orden incremental. Enfoque **single-tenant**: una
organización por instalación; todo lo demás cuelga de `organizations`.

### Identidad y seguridad
- `organizations`, `profiles` (uno por `auth.users`), `roles`, `permissions`,
  `role_permissions`, `user_roles`, `audit_events`, `organization_sequences`.
- `bootstrap_organization` crea la primera organización, perfil
  `superadmin` y sus permisos (solo válido si aún no existe ninguna).

### Abonados
- `subscribers` (código de 4-6 dígitos, único por organización),
  `subscriber_identities` (documentos de identidad, normalizados y únicos),
  `water_connections` (pegues). Tablas auxiliares: `duplicate_reviews`,
  `subscriber_connection_sequences`, `subscriber_portal_accounts`,
  `subscriber_benefits`, `benefit_definitions`, `portal_update_requests`.

### Tarifas y obligaciones
- `tariff_definitions`, `tariff_versions`, `service_catalog`, `obligations`,
  `debt_override_events`, `late_fee_policies`, `consumption_tariff_schemes`,
  `consumption_tariff_blocks`, `fiscal_periods`, `document_sequences`.

### Pagos y caja
- `payments`, `payment_allocations`, `payment_components`, `payment_events`,
  `cash_sessions`, `cash_movements`, `ledger_entries`, `bank_accounts`.

### Finanzas y presupuesto
- `expenses`, `suppliers`, `financial_documents`,
  `financial_document_items`, `document_artifacts`,
  `document_template_versions`, `budget_categories`, `budget_lines`,
  `receipt_brand_snapshot` (en `payments`).

### Operaciones y activos
- `work_orders`, `inventory_items`, `inventory_movements`, `assets`,
  `maintenance_plans`, `asset_maintenance_log`.

### Medición y métricas
- `metering`: `meter_readings`, `meter_reading_batches`.

### Integraciones, importaciones y respaldos
- `integrations`, `integration_runs`, `communication_messages`,
  `ocr_extractions`, `system_update_state`, `system_health_checks`,
  `data_import_batches`, `data_import_rows`, `backup_runs`.

### Otros
- `login_attempt_cooldowns` (cooldown de fuerza bruta).

### Invariantes (migración 033)
- **Prohibido borrar** (`forbid_delete_on_financial_records`): los registros
  financieros y de identidad son inmutables; los cancelados se representan con
  estados (`cancelled`/`voided`/`refunded`/`archived`).
- **Formato del código de pegue** fijado a nivel de BD:
  `water_connections_code_format` = `^[0-9]{4,6}-[0-9]{1,6}$`.
- **Componentes económicos no negativos** (`obligations_nonnegative_components`).
- **Ventanas de beneficio válidas** (`benefits_window_valid`, `valid_to >= valid_from`).
- **Caja sellada**: una sesión cerrada es inmutable; los movimientos posteriores
  al cierre requieren abrir una sesión nueva (excepto `closing_difference`).
- Las correcciones de abonado/pegue pasan únicamente por
  `update_subscriber`/`update_water_connection`, ambas `security definer`, con
  permiso, MFA (`aal2`) y auditoría.

### Trazabilidad de restauraciones (migración 034)
- `backup_restore_sessions` registra cada restauración: quién la solicitó
  (`requested_by`), cuándo, desde qué `backup_run`, número de filas/archivos
  restaurados y error si falló. Sin RLS de escritura (solo `backup-manager` vía
  service role); lectura restringida por `get_backup_restore_sessions` al
  permiso `backups.read_metadata`.

## 3. Seguridad

- **RLS por organización**: toda consulta de filas pasa por
  `current_organization_id()` (origen desde `profiles` del usuario autenticado).
- **Permisos**: `has_permission(code)` deriva los permisos a través de
  `user_roles` -> `role_permissions` -> `roles`. Las funciones de escritura
  críticas son `security definer` y comprueban simultáneamente el permiso, la
  organización y el nivel MFA.
- **JWT custom claims**: se valida el claim `aat`/`aal` desde `auth.jwt()`
  (`coalesce(auth.jwt()->>'aal','aal1')`).
- **MFA (aal2) obligatorio** para acciones críticas: pagos
  (`register_payment`), corrección de abonados/pegues, posteo y reversión de
  documentos financieros, gestión de usuarios y respaldos.
- **Cooldown de fuerza bruta (033)**: `login_attempt_cooldowns` con
  `record_login_attempt` y `get_login_cooldown_seconds`; bloqueo progresivo
  (5 y 10 intentos) aplicado incluso antes de la autenticación.
- **Secretos**: la tabla `integrations` separa `public_config` (nunca se
  guardan claves secretas) de los secretos que viven solo en variables de
  entorno de las Edge Functions.
- **Edge Functions**: usan `verify_jwt = true` y validan el usuario con
  `auth.getUser()` además de `has_permission`. La excepción es
  `whatsapp-webhook` con `verify_jwt = false` porque valida la firma HMAC
  `x-hub-signature-256` contra `WHATSAPP_APP_SECRET`.
- **backup-manager**: exige `aal2` para TODAS sus acciones (crear, descargar y
  restaurar); opera con service role y registra cada restauración en
  `backup_restore_sessions`.

## 4. Flujo de datos financieros

1. **Obligación anual**: `generate_annual_obligations(tariff_definition, año,
   fecha_vencimiento)` genera las obligaciones por abonado/pegue. La cuota se
   calcula con `calculate_annual_charge` y los beneficios (p. ej. `SENIOR_60`)
   se aplican vía `subscriber_benefits`.
2. **Pago**: `register_payment(p_payload)` (o el flujo atómico
   `register_payment_with_document`) valida el permiso `payments.create` y el
   nivel `aal2`. Asigna montos a obligaciones, exige una sesión de caja abierta
   para efectivo, y es **idempotente** mediante `idempotency_key` con candado
   transaccional (`pg_advisory_xact_lock`) contra replicación concurrente.
3. **Recibo**: cada pago genera `receipt_number` (`REC` + secuencia) y un
   `verification_token`. `verify_receipt_public(p_token)` permite verificar un
   recibo sin autenticación (route `/verificar-recibo/<token>`), enmascarando
   el nombre del abonado y la identidad. `get_payment_receipt_data` devuelve
   los datos enriquecidos del recibo al usuario con permiso `payments.read`.
4. **Documento financiero**: `post_annual_financial_document`/
   `post_payment_financial_document` fijan `financial_documents` (facturas,
   recibos) contra el original, de forma idempotente.
5. **Anulación/reembolso**: `void_payment`/`refund_payment` y sus variantes
   atómicas con documento (`void_payment_with_document`,
   `refund_payment_with_document`); `reverse_financial_document` emite reversos
   (`void_document`/`refund_document`/`credit_note`) exigiendo `payments.void`
   y `aal2`. Nada publicado se borra físicamente (invariante 033).

## 5. Integraciones y Edge Functions

Edge Functions reales en `supabase/functions`:

- `admin-create-user`: crea usuarios internos; exige `users.manage` y `aal2`.
- `backup-manager`: crear/descargar/restaurar respaldos; exige `aal2` siempre.
- `whatsapp-webhook`: verificación y delivery status de WhatsApp Business; sin
  JWT (HMAC).
- `ocr-document`: OCR de identidad/factura con Google Vision; exige `ocr.use`.
- `send-email` / `send-whatsapp`: envío de correos (Resend) y WhatsApp (Graph
  API); exigen `communications.send`.
- `integration-test`: prueba de integraciones; exige `integrations.manage` y
  `aal2`.
- `check-system-update`: consulta de actualizaciones; exige `updates.read`.
- `subscriber-portal-login` / `subscriber-portal-profile`: autenticación y
  perfil del portal de abonados.
- `admin-create-subscriber-portal`: crea cuentas de portal; exige
  `portal.manage` y `aal2`.

## 6. CI/CD

Workflows en `.github/workflows`:

- **validate.yml**: `vitest` (`npm test`), lint y `build:render` (que ejecuta
  `scripts/bake-sw.mjs`), con verificación de artefactos publicables
  (`index.html`, `health.txt`, `_redirects`, `manifest.webmanifest`, `sw.js`).
- **db-validate.yml**: `supabase start` aplica las migraciones 001..044 desde
  cero y ejecuta `supabase/tests/db_integrity.sql` (integridad financiera de
  032-034 e invariantes); valida con `deno check` cada Edge Function y la
  configuración (`verify_jwt = false` para `whatsapp-webhook`).
- **e2e.yml**: Playwright en Chromium contra Supabase local con seed
  (`supabase/tests/e2e_seed.sql`), exportando anon key al entorno.
- **release.yml**: sobre push a `main`/manual; resuelve la versión desde
  `package.json`, compila inyectando `VITE_APP_VERSION`/`VITE_APP_BUILD_DATE`/
  `VITE_APP_RELEASE_URL`, y crea un GitHub Release con el `dist` empaquetado
  (no vuelve a publicar si el tag ya existe).

La versión se inyecta en el build (`__APP_VERSION__`) y el service worker se
versiona por build (`bake-sw.mjs`), de modo que cada release genera una caché
del shell nueva e invalidable.

## 7. V5 · Water Utility Operating System

Convierte la plataforma en un ERP/OS real de JAA de Honduras (Orden Maestra V5).

**Shell e IA (Fase 1):** 8 grupos objetivo en `Layout.tsx` (INICIO, Usuarios y
servicio, Tesorería, Operación, Agua y ambiente, Gobierno, Cumplimiento,
Administración) con `titleFor()` para todas las rutas, paleta `tokens.css` §64
(brand-600 `#1D4ED8`, water-600 `#0284C7`), y rutas en `App.tsx` protegidas con
`ProtectedRoute` + permiso. `src/lib/security.ts` amplía el union de permisos con
`communications.read`, `water.*`, `governance.*`, `compliance.*`, `calendar.manage`.

**Dominios nuevos (migraciones 036-044):** identidad (PERSONA ≠ ABONADO ≠
INMUEBLE ≠ CONTRATO ≠ PEGUE), solicitudes/reclamos, morosidad/convenios, compras,
banca/conciliación, bodega, gobierno institucional, agua y ambiente,
cumplimiento/ERSAPS. Cada dominio es un feature service en
`src/features/{identity,requests,arrears,procurement,treasury,inventory,governance,water,compliance}/service.ts`
con páginas en `src/pages/*`. Backend `security definer` + RLS + permisos de rol +
auditoría, sin escrituras directas desde el cliente.

**CI actualizado:** `db-validate.yml` aplica las migraciones 001..044 desde cero
(ahora incluye las 9 V5) + `db_integrity.sql` + `seed_integrity.sql`. `validate` y
`e2e` cubren build y navegador.
