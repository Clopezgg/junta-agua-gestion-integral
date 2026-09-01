# V6 — ESTADO DE EJECUCIÓN

> Fuente de verdad operativa del rebuild V6. Actualizar después de CADA milestone real.

## Estado actual

| Clave | Valor |
| --- | --- |
| CURRENT_PHASE | MILESTONE C — Inicio / búsqueda / Quick Create / notificaciones |
| LAST_COMPLETED_TASK | MILESTONE B completo: Login REBUILD TOTAL (card 400px, nombre dinámico vía migración 052, cooldown conservado), MFA mínimo (enrolamiento intacto), Setup conservado, Recuperar acceso + Restablecer (reset real Supabase), PasswordField primitiva, auth.css |
| CURRENT_BRANCH | `work/junta-os-v6-product-rebuild` |
| CURRENT_COMMIT | (*ver git*) |
| LAST_GREEN_COMMIT | (*ver git*) |
| CURRENT_TEST_COUNT | 159 |
| LAST_CI_RUN | Draft PR #21 — validate/db/functions/browser (monitorear tras push Milestone B) |
| MIGRATION_RANGE | 001–052 (052 = identidad pública solo-lectura para login) |
| NEXT_MIGRATION | 053 (solo si 052 sigue siendo HEAD) |
| PRODUCTION_UNCHANGED | SÍ |
| KNOWN_BLOCKERS | Branch protection de main NO está habilitado en GitHub (PR obligatorio, required checks, no force push). Documentado en V6-SECURITY / V6-PRODUCTION-ACCEPTANCE como BLOCKED_EXTERNAL. |
| NEXT_ACTION | Milestone C — Inicio / búsqueda / Quick Create / notificaciones (AppShell ya provee search/crear/notificaciones; ahora reconstruir la Home V6 y el centro de notificaciones real) |

## Hitazos por milestone

| Milestone | Estado |
| --- | --- |
| A · Foundation / Design System / AppShell | COMPLETE (155 tests, lint, tsc, build, smoke login OK) |
| B · Login / MFA / Setup | COMPLETE (159 tests, lint, tsc, build, smoke /login /recuperar /restablecer OK) |
| C · Inicio / búsqueda / Quick Create / notificaciones | PENDIENTE |
| D · Abonados / 360 / nuevo servicio | PENDIENTE |
| E · Cobro / caja / recibos / cartera | PENDIENTE |
| F · Bancos / gastos / compras / presupuesto | PENDIENTE |
| G · Operación / GIS / incidentes / órdenes / activos | PENDIENTE |
| H · Field PWA / bodega / mantenimiento | PENDIENTE |
| I · Calidad / cloro / fuentes / continuidad | PENDIENTE |
| J · Junta / Asamblea / reuniones / resoluciones / tareas / proyectos | PENDIENTE |
| K · Cumplimiento / ERSAPS / annual pack / transparencia | PENDIENTE |
| L · Documentos / comunicaciones / integraciones | PENDIENTE |
| M · Portal | PENDIENTE |
| N · Admin / security / backup / import / health | PENDIENTE |
| O · Usability / responsive / performance / accessibility | PENDIENTE |
| P · Full E2E / production certification | PENDIENTE |

## Reglas operativas

- Producción (main + Render) queda CONGELADA hasta aceptación integral.
- NO micro-merges a main.
- Todo V6 vive en `work/junta-os-v6-product-rebuild`.
- Draft PR ejecuta CI. NO mergear.
- Este documento se actualiza después de cada milestone real.