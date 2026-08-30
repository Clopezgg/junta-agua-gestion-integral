# Base de datos del ERP "Junta de Agua"

Inventario real del esquema `public` de las migraciones 001..034
(`supabase/migrations/*.sql`). Solo se documentan tablas, enums, funciones e invariantes
que existen; nada se inventa.

## 1. Tablas por dominio

**Seguridad/org (001-013):** `organizations`, `profiles`, `roles`, `permissions`,
`role_permissions`, `user_roles`, `audit_events` (`001:3-9`); `system_health_checks`
(`009:7`); `system_update_state` (`024:32`).

**Abonados (002/032):** `organization_sequences`, `subscribers`, `subscriber_identities`,
`water_connections`, `duplicate_reviews` (`002:4-10`); `subscriber_connection_sequences`
(`032:24`).

**Tarifas/deuda (003):** `tariff_definitions`, `tariff_versions`, `obligations`,
`debt_override_events` (`003:22-77`).

**Pagos/caja/documentos (004/012/026/028/032):** `document_sequences`, `cash_sessions`,
`payments`, `payment_allocations`, `payment_events` (`004:7-57`); `payment_components`
(`012:18`); `financial_documents`, `document_template_versions` (`026:110,94`);
`cash_movements` (`032:513`); `document_artifacts` (`032:677`); `late_fee_policies`
(`032:459`).

**Gastos/balance (005):** `suppliers`, `expenses`, `bank_accounts`, `ledger_entries`
(`005:3-6`).

**Operaciones/budget/activos (008/014):** `work_orders`, `inventory_items`,
`inventory_movements` (`008:3-5`); `fiscal_periods`, `budget_categories`, `budget_lines`,
`assets`, `maintenance_plans`, `asset_maintenance_log` (`014:35-116`).

**Integraciones/mensajería (007/011/024):** `integrations` (`007:3`);
`communication_messages`, `ocr_extractions`, `backup_runs` (`011:5,21,37`);
`integration_runs` (`024:16`).

**Medición/beneficios/portal (019/026/027):** `data_import_batches`, `data_import_rows`,
`consumption_tariff_schemes`, `consumption_tariff_blocks`, `meter_reading_batches`,
`meter_readings` (`019:31-121`); `benefit_definitions`, `subscriber_benefits`,
`service_catalog`, `portal_update_requests` (`026:32-138`); `subscriber_portal_accounts`
(`027:3`).

**Seguridad/trazabilidad (033/034):** `login_attempt_cooldowns` (`033:254`);
`backup_restore_sessions` (`034:16`).

## 2. Enums y valores reales (`create type public...`)

- `subscriber_status`: `active, inactive, suspended, archived` (`002:3`).
- `identity_document_type`: `dni, passport, other` (`002:3`).
- `connection_status`: `active, suspended, cancelled, pending` (`002:3`).
- `tariff_category`: `annual_fee, new_connection, reconnection, late_fee, repair,
  ownership_change, inspection, fine, other` (`003:16`), + `consumption` (`018:2`).
- `tariff_status`: `active, inactive` (`003:17`).
- `obligation_source`: `annual_generation, manual, system_adjustment` (`003:18`),
  + `meter_reading` (`018:3`).
- `obligation_state`: `pending, partial, paid, overdue, cancelled` (`003:19`).
- `debt_operation`: `solvency_certificate, reconnection, ownership_change,
  new_connection, general_consultation, receive_payment` (`003:20`).
- `payment_method`: `cash, transfer, deposit, check, mixed` (`004:3`).
- `payment_status`: `confirmed, voided, partially_refunded, refunded` (`004:4`).
- `cash_session_status`: `open, closed` (`004:5`).
- `expense_status`: `requested, approved, rejected, confirmed, voided` (`005:2`).
- `work_order_status`: `open, scheduled, in_progress, completed, cancelled` (`008:2`).
- Medición/importación (`019:25-29`): `data_import_kind`
  (`subscribers, meter_readings`); `data_import_status`
  (`draft, validated, completed, failed, cancelled`); `import_row_status`
  (`pending, valid, imported, skipped, error`); `reading_batch_status`
  (`draft, validated, posted, cancelled`); `meter_reading_status`
  (`valid, warning, error, posted`).

## 3. Funciones principales por dominio (firmas exactas)

**Seguridad (001/033):** `current_organization_id() returns uuid` (`001:11`);
`has_permission(p_code text) returns boolean` (`001:12`); `get_my_authorization()
returns jsonb` (`001:13`); `write_audit_event(p_action text, p_entity_type text,
p_entity_id text, p_old jsonb, p_new jsonb, p_reason text) returns void` (`001:14`);
`record_login_attempt(p_email text, p_success boolean) returns void` y
`get_login_cooldown_seconds(p_email text) returns int` (`033:264,305`).

**Abonados/pegues (002/032/033):** `create_subscriber(p_payload jsonb, p_homonym_note
text, p_matched_subscriber_id uuid) returns uuid` (`002:17`); `create_water_connection(
p_subscriber_id uuid, p_payload jsonb) returns uuid` (`032:67`); `search_subscribers(
p_query text, p_limit int) returns table(...)` (`002:19`); `get_subscriber_detail(
p_subscriber_id uuid) returns jsonb` (`002:20`); `next_connection_code(
p_subscriber_id uuid) returns text` (`032:31`); `update_subscriber(p_subscriber_id uuid,
p_payload jsonb) returns jsonb` y `update_water_connection(p_connection_id uuid,
p_payload jsonb) returns jsonb` (`033:123,181`).

**Tarifas/obligaciones (003/021/032):** `create_tariff(p_payload jsonb)` y
`create_tariff_version(p_definition_id uuid, p_payload jsonb)` (`003:118,131`);
`generate_annual_obligations(p_tariff_definition_id uuid, p_year integer,
p_due_date date) returns jsonb` (`032:818`); `create_manual_obligation(...)` (`003:165`);
`check_debt_operation(p_subscriber_id uuid, p_operation public.debt_operation)` y
`authorize_debt_override(...)` (`003:216`); `save_consumption_tariff_scheme(...)`,
`calculate_consumption_charge(...)` (`021`).

**Pagos/caja (004/030/032):** `register_payment(p_payload jsonb) returns uuid`
(`032:131`, primera versión `004:131`); `open_cash_session(p_opening_amount numeric,
p_location text)` y `close_cash_session(p_session_id uuid, p_counted_amount numeric,
p_notes text)` (`004:99,160`; cierre corregido `012:164`); `void_payment(...)`,
`refund_payment(...)` (`004`); `register_payment_with_document`,
`reverse_payment_financial_document`, `void_payment_with_document`,
`refund_payment_with_document` (`030`).

**Beneficios/gastos (026/032):** `evaluate_benefit_eligibility(p_subscriber_id uuid,
p_benefit_code text, p_reference_date date)` (`032:281`); `sync_senior_benefit(
p_subscriber_id uuid, p_reference_date date)` (`032:408`); `calculate_annual_charge(
p_subscriber_id uuid, p_year integer)` (`032:348`); `create_expense_request(p_payload
jsonb)` (`032:241`).

**Medición (020/022/023):** `create_import_batch`, `stage_import_rows`,
`set_import_row_result`, `complete_import_batch` (`020`); `create_meter_reading_batch`,
`upsert_meter_reading` (`022`); `post_meter_reading_batch`, `list_cut_candidates`,
`import_subscriber_with_connection` (`023`).

**Documentos/verificación (028/032):** `post_annual_financial_document(
p_obligation_id uuid) returns jsonb` (`032:914`); `post_payment_financial_document(
p_payment_id uuid)` (`028:138`); `reverse_financial_document(...)` (`028:201`);
`list_financial_documents(...)` (`028:259`); `verify_receipt_public(p_token uuid)
returns jsonb` (`032:1027`); `get_payment_receipt_data(p_payment_id uuid) returns jsonb`
(`032:1055`); artefactos `register_document_artifact`/`complete_document_artifact`/
`fail_document_artifact`/`list_document_artifacts` (`032:720`+).

**Respaldos/portal (027/034):** `get_backup_restore_sessions(p_limit int default 100)
returns table(...)` (`034:36`); `link_subscriber_portal_account`,
`get_my_subscriber_card`, `get_my_portal_account_state` (`027`).

## 4. Invariantes (migración 033)

- `water_connections_code_format`: `code ~ '^[0-9]{4,6}-[0-9]{1,6}$'` (`033:57`).
- `obligations_nonnegative_components`: `base_amount`/`discount_amount`/`late_fee_amount`
  nunca negativos (`033:64`).
- `benefits_window_valid`: `valid_to is null or valid_to>=valid_from` (`033:67`).
- Triggers `forbid_delete_%` sobre 18 tablas (ver SECURITY.md §5) -> `DELETE_NOT_ALLOWED`
  (`033:24-49`).
- Guards de caja: `cash_session_closed_guard` (sesión cerrada inmutable; no se abre en
  `closed`) y `cash_movement_session_guard` (bloquea movimientos sobre sesión cerrada
  salvo `closing_difference`) (`033:76-116`).
- Inmutabilidad de documentos/pagos (032): ver SECURITY.md §5.

## 5. Trazabilidad de restauraciones (migración 034)

- `backup_restore_sessions` registra cada restauración: `organization_id`, `backup_run_id`,
  `requested_by`, `status` (`running|completed|failed`), `restored_format`,
  `restored_rows`, `restored_files`, `started_at`, `finished_at`, `error_message`
  (`034:16`).
- La escribe solo la edge function `backup-manager` con `service_role` (inserta la sesión
  al iniciar y la marca `completed`/`failed`,
  `supabase/functions/backup-manager/index.ts:185,224,230`). RLS sin políticas y revocado
  a la API (`034:33-34`); lectura vía `get_backup_restore_sessions` con
  `backups.read_metadata` (`034:36-59`).

## 6. Migraciones 001..034 (resumen)

| # | Foco |
|---|------|
| 001 | RLS, org, roles, permisos, auditoría, bootstrap |
| 002 | Abonados, identidades, conexiones, duplicados |
| 003 | Tarifas, obligaciones, deuda |
| 004 | Pagos, caja, métodos, secuencias |
| 005 | Gastos, proveedores, banco, libro mayor |
| 006 | Reportes |
| 007 | Integraciones (config pública) |
| 008 | Órdenes de trabajo e inventario |
| 009 | Health checks |
| 010 | Reparación de auditoría/usuarios |
| 011 | Comunicación, OCR, respaldos, verificación |
| 012 | Correcciones de auditoría, cierre de caja |
| 013 | Roles por defecto |
| 014 | Presupuesto, activos, UX premium |
| 015 | Permisos de rol |
| 016 | Ajuste presupuesto/real |
| 017 | Integridad de programación |
| 018 | Enum `consumption`/`meter_reading` |
| 019 | Esquema de importación/medición |
| 020 | Funciones de importación |
| 021 | Tarifas de consumo |
| 022 | Escritura de lecturas |
| 023 | Posteos y cortes |
| 024 | Ejecuciones e integraciones MFA |
| 025 | Roles y readiness |
| 026 | Beneficios, catálogo, documentos |
| 027 | Tarjeta y portal del abonado |
| 028 | Posteo/reversión de documentos |
| 029 | Acceso seguro al portal |
| 030 | Atomicidad pago-documento |
| 031 | Correcciones de producción |
| 032 | Núcleo financiero, caja formal, inmutabilidad |
| 033 | Invariantes, anti-delete, fuerza bruta |
| 034 | Trazabilidad de restauraciones |

## Nota de validación

Ejecute `psql "$DATABASE_URL" -f supabase/tests/db_integrity.sql` (valida tablas 032,
columnas, índices, firmas, triggers, enums y constraints) y la suite de contract tests con
`npm test` (vitest, incluye `src/tests/migrations.test.ts`,
`src/tests/data-model-invariants.test.ts` y `src/tests/backup-restore-hardening.test.ts`).
Automatizado en `.github/workflows/db-validate.yml` y `e2e.yml`.
