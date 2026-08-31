# Seguridad del ERP "Junta de Agua"

Seguridad en capas: RLS organizacional, escrituras solo por funciones `security definer`
con permisos y MFA, edge functions que validan al llamador, y endurecimiento del
navegador. Referencias a código real (`supabase/migrations/*.sql`, edge functions, `src/`).

---

## 1. RLS: aislamiento organizacional obligatorio

Cada tabla protegida lleva RLS y políticas con `current_organization_id()`.

- `current_organization_id()` devuelve el org del perfil activo
  (`202607110001_phase1_security.sql:11`).
- Las 6 tablas de seguridad se habilitan en 001: `organizations`, `profiles`, `roles`,
  `role_permissions`, `user_roles`, `audit_events` (`001:16`).
- Políticas típicas: `subscribers_read`/`identities_read`/`connections_read` con
  `organization_id=current_organization_id()` + permiso
  (`202607110002_phase2_subscribers.sql:22`). En capas posteriores: `cash_movements_read`
  (`202607110032_...:526`), `document_artifacts_read` (`032:696`),
  `integration_runs_read` (`202607110024_...:56`).

Excepciones: `bootstrap_organization` solo con org vacío y un único usuario
(`001:15,23`); `verify_receipt_public` para anon (sección 7); tablas "selladas" sin
políticas (`login_attempt_cooldowns` `033:262`, `backup_restore_sessions` `034:34`),
escritas solo por `service_role`.

---

## 2. Escrituras por funciones `security definer`

Las mutaciones no van por escritura directa; se exponen funciones `security definer`
con `set search_path=public` (evita suplantación de esquema).

- `has_permission(p_code text)` resuelve roles->permisos del perfil activo (`001:12`).
- `create_subscriber`, `create_water_connection`, `next_subscriber_code` piden permiso y
  lanzan `FORBIDDEN` (`002:15,17,18`).
- Corrección solo por `update_subscriber(uuid,jsonb)` / `update_water_connection(uuid,jsonb)`
  (no hay UPDATE directo a abonados) (`202607110033_data_model_invariants.sql:123,181`).
- Núcleo 032: `register_payment(jsonb)` pide `payments.create` (`032:153`);
  `create_expense_request` pide `expenses.create` (`032:253`).
- Al ser `security definer`, la RLS no aplica dentro; el control real es el permiso más la
  coherencia que cada función restablece con `org := current_organization_id()`.

---

## 3. MFA: `aal2` exigido en operaciones sensibles

El frontend exige TOTP (`aal?.currentLevel==='aal2'`, `src/contexts/AuthContext.tsx:36`);
la BD lo re-exige en servidor:

- `create_subscriber` (`002:17`); `create_tariff`, `create_tariff_version`,
  `generate_annual_obligations` (`003:122,135,149`); `register_payment` (`032:154`);
  `create_water_connection` (032); `update_subscriber`/`update_water_connection` (033).
- Edge `admin-create-user`: `mfa.getAuthenticatorAssuranceLevel()` y rechaza si no es
  `aal2` (`supabase/functions/admin-create-user/index.ts:22`).
- Edge `backup-manager` exige `aal2` en TODAS sus acciones — incluidas download y restore —
  antes de derivar por `body.action` (`supabase/functions/backup-manager/index.ts:99-100`).

---

## 4. Protección contra fuerza bruta en el login

Ventana deslizante servidora previa a la autenticación (`033`):

- Tabla `login_attempt_cooldowns` con hash SHA-256 del correo (`033:254`).
- Reglas: >=5 fallos/15 min -> bloqueo 5 min; >=10 fallos/60 min -> bloqueo 15 min
  (`033:294-298`).
- `record_login_attempt(text,boolean)` y `get_login_cooldown_seconds(text)`
  (`033:264,305`).
- `Login.tsx` consulta el enfriamiento antes de intentar y registra cada intento
  (`src/pages/Login.tsx:20-22`).

---

## 5. Inmutabilidad de registros financieros y de identidad

Lo posteado no se edita ni borra; los cancelados se representan con estados.

- 033 instala trigger `forbid_delete_%` sobre 18 tablas: `organizations`, `subscribers`,
  `subscriber_identities`, `water_connections`, `obligations`, `payments`,
  `payment_allocations`, `payment_components`, `payment_events`, `cash_sessions`,
  `cash_movements`, `financial_documents`, `document_artifacts`, `expenses`,
  `audit_events`, `subscriber_benefits`, `organization_sequences`, `duplicate_reviews`
  (`033:37-49`).
- 032: `financial_documents_immutable` (no borra ni cambia campos económicos, `032:609-633`),
  `payments_immutable` (solo transiciones legales, `032:636-662`),
  `audit_events_append_only` (append-only incluso para roles, `032:665-672`),
  `document_artifacts_immutable` (`032:704-718`).
- Documentos posteados sin re-edición: el flujo 028 revierte creando un documento de
  anulación (`reverse_financial_document`, `void/refund/credit_note`,
  `202607110028_financial_document_posting_reversal.sql:201-254`), nunca sobre el original.

---

## 6. Secretos y edge functions

- La configuración pública no guarda tokens: modelo con `public_config` + flag
  `secret_configured` (`202607110007_phase7_integrations.sql:9`); `list_integrations` /
  `save_integration` devuelven solo config pública y estado. En 024 la escritura es
  `save_integration_public_config` con MFA (`202607110024_...:67`).
- `Integrations.tsx`: "nunca solicita ni devuelve secretos permanentes" y apunta dónde
  viven (Supabase/Render Secrets) (`src/pages/Integrations.tsx:66,70`).
- Supabase Secrets (~/.env de edge functions) alojan los tokens:
  - `whatsapp-webhook` valida firma HMAC-SHA-256 contra `WHATSAPP_APP_SECRET` con
    comparación de tiempo constante (`safeEqual`) -> `401` si no; la suscripción GET
    verifica `hub.verify_token`
    (`supabase/functions/whatsapp-webhook/index.ts:8-13,18-19,27-29`); `verify_jwt=false`
    porque Meta firma el request (`supabase/config.toml:2`).
  - `ocr-document` lee `GOOGLE_VISION_API_KEY` y comprueba `ocr.use`.
  - `send-email` lee `RESEND_API_KEY`/`EMAIL_FROM` y comprueba `communications.send`.
  - `admin-create-user` exige `aal2` + `users.manage` y es idempotente:
    `idempotent_replay:true` si el correo ya existe, sin duplicar auditoría
    (`supabase/functions/admin-create-user/index.ts:21-22,29,40-43`).

---

## 7. Verificación pública sin fuga de datos internos

- `verify_receipt_public(uuid)` es `security definer`, estable, expuesta a
  `anon, authenticated` (`032:1027`). Devuelve solo recibo, fechas, total, método,
  estado, abonado **enmascarado**, organización e ítems; no expone rutas internas,
  tokens, emails ni números completos (`032:1034-1050`).
- CI lo garantiza: `db_integrity.sql` falla si devuelve `decision_path` ni otra ruta
  interna (`supabase/tests/db_integrity.sql:56-57`).

---

## 8. Endurecimiento del navegador (frontend estático)

- Headers en `render.yaml` para todo `/*`: `Content-Security-Policy`
  (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`,
  `script-src 'self'`, `upgrade-insecure-requests`), `Strict-Transport-Security`
  (`max-age=63072000; includeSubDomains; preload`), `Permissions-Policy`
  (`camera=(), microphone=(), geolocation=(self), payment=(), usb=()...`), más
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Cross-Origin-Opener-Policy: same-origin` (`render.yaml:23-47`).
- Service worker versionado: `bake-sw.mjs` inyecta `junta-agua-shell-v${version}-${sha}`;
  el SW cachea el shell y excluye `/rest/`, `/auth/`, `/functions/`
  (`scripts/bake-sw.mjs`; `public/sw.js:1,9`).

---

## Nota de validación

Verifique todo con `psql "$DATABASE_URL" -f supabase/tests/db_integrity.sql` (firmas,
triggers, constraints, enums) y la suite de contract tests con `npm test` (vitest, p. ej.
`src/tests/data-model-invariants.test.ts` y `src/tests/backup-restore-hardening.test.ts`).
Automatizado en `.github/workflows/db-validate.yml` y `e2e.yml`.
