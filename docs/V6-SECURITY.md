# V6 — SECURITY

> Postura de seguridad V6. Enforcement en backend (RLS/RPC), NO solo UI.

## Fundamentos (se mantienen)

- Supabase Auth, MFA TOTP, AAL2, RLS, security definer controlado,
  storage privado, auditoría, idempotencia.

## Áreas de revisión

- search_path
- permission checks
- org scope (multi-org vía current_organization_id)
- role escalation
- mass assignment
- IDOR
- RLS bypass
- CORS
- CSRF según flujo
- XSS
- CSP
- rate limits

## MFA sensible (AAL2 obligatorio)

- usuarios/roles
- tarifas
- beneficios
- reversos
- restore
- integraciones sensibles
- seguridad

## Portal hardening

- Rate limit por cuenta, IP, dispositivo/ventana cuando aplique.
- Backoff.
- NO lockout que permita DoS trivial.
- CORS solo orígenes permitidos.
- Login portal: rate limiting, errores genéricos, NO account enumeration,
  sin lockout trivial.

## Receipt public verify

Solo: válido/no válido, número, fecha, monto, estado, identidad enmascarada.
NO: storage path, PII, IDs internos.

## Backup security

- Descarga de backup sensible requiere permiso específico + MFA AAL2
  (NO `backups.read` genérico).
- Artefacto protegido. NO URL pública.
- Auth en backup: documentar explícitamente que "public DB backup ≠ Supabase
  Auth backup". Estrategia de DR compatible con Supabase. NO afirmar que un
  backup DB puede recrear auth.users si no puede.

## Service worker

- Versionar por build SHA. No dejar caché antigua tras deploy.
- NO cachear agresivamente auth / datos financieros transaccionales.
- Limpiar caches viejos.

## Security headers (Render)

CSP, HSTS, Permissions-Policy, Referrer-Policy, X-Content-Type-Options,
frame protection. Verificar en CI/smoke.

## Segregación de funciones (SoD)

Operaciones sensibles (tarifa, presupuesto, compra grande, reversal, cierre,
restore) pueden requerir aprobación según política. NO aprobar propia acción
donde exista SoD.

## Auditoría (vista humana)

Quién, Qué, Entidad, Antes, Después, Cuándo, Motivo. Detalles técnicos
colapsables. NO JSON crudo como experiencia primaria.

## Human-in-the-loop

Ninguna automatización puede: registrar pago, reversar, cambiar tarifa,
aprobar compra, aprobar presupuesto, modificar deuda — sin acción humana
autorizada.

## Errores

NUNCA mostrar: PostgREST, JWT, constraint, RPC, UUID, Supabase error crudo.
Error mapping + Correlation ID técnico.

## Branch protection (BLOCKED_EXTERNAL)

Estado detectado: `main` NO tiene branch protection habilitado en GitHub
(no PR obligatorio, no required checks, no force-push protection). La disciplina
de V6 se mantiene por procedimiento: todo vive en `work/junta-os-v6-product-rebuild`,
Draft PR ejecuta CI, y el merge a main ocurre UNA sola vez tras aceptación.
Evidencia: `gh api repos/Clopezgg/junta-agua-gestion-integral/branches/main` →
`protected: false`.

## Secret hygiene

NUNCA imprimir en logs: service role, API keys, passwords, JWT, backup content.
Redactar.

## Restore

Dry run → validate → pre-restore snapshot → staging/test → dependency order →
integrity check → rollback strategy. NO restore automático a producción.