# V6 — ESTADO DE EJECUCIÓN

> Fuente de verdad operativa del rebuild V6. Actualizar después de CADA milestone real.

## Estado actual

| Clave | Valor |
| --- | --- |
| CURRENT_PHASE | MILESTONE B — Login / MFA / Setup |
| LAST_COMPLETED_TASK | MILESTONE A completo: tokens V6, 15+ primitivas, AppShell (sidebar 6 secciones, topbar búsqueda/crear/notificaciones/usuario, bottom nav móvil), rutas maestras con redirección-paridad, tests, build verde |
| CURRENT_BRANCH | `work/junta-os-v6-product-rebuild` |
| CURRENT_COMMIT | (*ver git*) |
| LAST_GREEN_COMMIT | (*ver git*) |
| CURRENT_TEST_COUNT | 155 |
| LAST_CI_RUN | Draft PR #21 — validate/db/functions/browser (monitorear tras push Milestone A) |
| MIGRATION_RANGE | 001–051 (aplicadas) |
| NEXT_MIGRATION | 052 (solo si 051 sigue siendo HEAD) |
| PRODUCTION_UNCHANGED | SÍ |
| KNOWN_BLOCKERS | Branch protection de main NO está habilitado en GitHub (PR obligatorio, required checks, no force push). Documentado en V6-SECURITY / V6-PRODUCTION-ACCEPTANCE como BLOCKED_EXTERNAL. |
| NEXT_ACTION | Crear documentos fuente de verdad V6 → Milestone A (Foundation / Design System / AppShell) |

## Hitazos por milestone

| Milestone | Estado |
| --- | --- |
| A · Foundation / Design System / AppShell | COMPLETE (155 tests, lint, tsc, build, smoke login OK) |
| B · Login / MFA / Setup | PENDIENTE |
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