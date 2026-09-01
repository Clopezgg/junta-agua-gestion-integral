# V6 — PRODUCTION ACCEPTANCE

> Gates y criterios para liberar V6 a producción. Nada de esto se ejecuta
> antes de que todos los milestones estén completos.

## Regla general

- Producción (main + Render) queda congelada durante el rebuild.
- V6 llega a main UNA VEZ, cuando la experiencia integrada completa pase todos
  los criterios.
- Draft PR hacia main ejecuta CI. NO mergear hasta aceptación integral.

## Build gates (cada milestone)

- `npm test`
- `npm run lint`
- `npx tsc -b`
- `npm run build:render`
- `git diff --check`
- Tests dirigidos del milestone.

NO continuar con gate rojo si la causa es del milestone.

## CI del Draft PR

Cada push: validate, db-validate, functions, browser, security. Corregir antes
del siguiente milestone. PERO NO MERGE.

## Release candidate

Cuando todos los milestones estén completos: feature freeze. Solo bugs,
security, migration, accessibility, performance, tests, docs.

## Acceptance gate

NO merge si falla cualquiera: Login, MFA, Setup, Inicio, Abonado, Nuevo
servicio, Cobrar, Recibo, Caja, Banco, Solicitud, Incidente, Orden, Field,
Bodega, Junta, Cumplimiento, Portal.

## Visual acceptance

La app debe dejar de parecer template / landing / dashboard genérico /
lista de cards. Debe parecer software institucional operativo de uso diario:
densidad profesional, datos primero, acciones claras. Percepción: "esto fue
reconstruido", no "le cambiaron el tema".

## Release a producción

1. Todo verde → convertir Draft PR a Ready.
2. Revisar: mergeable, CI, migrations, security, screenshots, E2E, docs.
3. Merge a main UNA sola vez.
4. `supabase migration list` → aplicar solo pendientes: `supabase db push`.
   NO db reset. Verificar HEAD Local = Remote.
5. Deploy solo Edge Functions cambiadas. Verificar status/auth/secrets/smoke.
6. Render: usar servicio EXISTENTE (junta-agua-gestion-integral). NO crear
   otro. Esperar LIVE. Confirmar deploy = SHA final de main.
7. Producción smoke REAL: / login MFA inicio abonados tesorería operación
   Junta cumplimiento portal. Sin transacciones financieras destructivas.
8. Smoke autenticado con cuenta autorizada cuando sea posible (auth, dashboard,
   search, read subscriber, permissions, navigation). NO pagos reales de prueba.
9. Crear release V6 (workflow NO puede quedar verde saltándose tests/build).

## Backup antes del release

- Verificar backup actual.
- Crear backup pre-V6 seguro según herramientas existentes.
- Checksum / manifest. NO almacenar secretos/PII en Git.

## Branch protection

Estado detectado: main NO tiene branch protection (PR obligatorio, required
checks, no force push, no branch deletion) en GitHub actualmente. Ver
`docs/V6-SECURITY.md` → BLOCKED_EXTERNAL con evidencia. La disciplina se
mantiene por procedimiento.

## Documentación final (actualizar)

README, DATABASE, ARCHITECTURE, SECURITY, BACKUP-RESTORE,
PRODUCTION-READINESS, EVIDENCE-MATRIX, V6-PRODUCT-CONTRACT, V6-DOMAIN-MODEL,
V6-WORKFLOWS, V6-DESIGN-SYSTEM, V6-INTEGRATIONS, V6-USER-ACCEPTANCE,
V6-PROGRESS.

## Final report

Entregar hechos: BASELINE SHA, V6 BRANCH, PR, COMMITS, FILES, MIGRATIONS,
TABLES, RPC, EDGE FUNCTIONS, ROUTES, REMOVED LEGACY, TEST COUNTS, E2E,
ACCESSIBILITY, PERFORMANCE, SUPABASE HEAD, MAIN SHA, RENDER DEPLOY SHA, URL,
OPTIONAL_NOT_CONFIGURED, INSTITUTIONAL_DATA_PENDING.

## Ambiguos/bloqueos

Solo detener por: credencial obligatoria inexistente; acción con costo; dato
institucional que no puede inferirse; decisión legal; acción destructiva
irreversible; permiso externo necesario. Formato:
BLOCKER / WHY / EXACT DATA NEEDED / WHERE TO GET IT / WORK CONTINUED ELSEWHERE.