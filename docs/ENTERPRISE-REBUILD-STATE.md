# ENTERPRISE REBUILD — EXECUTION STATE

> Fuente de verdad viva del progreso. Se actualiza al cierre de cada milestone y en cada SHA verde.

| Campo | Valor |
|---|---|
| CURRENT_PHASE | Milestone P — Cumplimiento (ERSAPS/Calendario/Transparencia). A–O integrados en la rama. |
| CURRENT_BRANCH | `work/junta-enterprise-rebuild` |
| CURRENT_SHA | `6891a1b` (Milestone O completo) — pendiente de confirmación E2E en CI antes de push |
| LAST_GREEN_SHA | `978fe74` (CI PR #22 4/4 verde: validate, db, functions, browser/E2E) — 252 tests, lint OK, tsc OK, build OK |
| LAST_COMPLETED_MILESTONE | N — Solicitudes (service desk §61) + Comunicaciones (plantillas §62). Antes: M (Agua y Ambiente), L (Campo/PWA), K (GIS), J (Operación), I (Finanzas/Compras), H (Cartera/Convenios/Bancos). |
| NEXT_ACTION | Milestone P (Cumplimiento): ERSAPS, Calendario (§P), Annual Pack, Transparencia, Reporting sobre design system, sin claims sin evidencia. Draft PR: #22. |
| TEST_COUNT | 256 (vitest) — +service desk/comunicaciones (§61-62) +gobierno (persona-picker, DS, sin prompt) |
| E2E_COUNT | 9 tests Playwright (smoke.spec: login/MFA, navegación, búsqueda, responsive, POS+Caja, Nuevo servicio, 360, command palette, logout) + 1 sim |
| LEGACY_FILES_REMAINING | 0 CSS legacy en `src/` · **28** `.tsx` en `docs/legacy-ui-allowlist.txt` (−Asamblea, −JuntaDirectiva, −Solicitudes, −Comunicaciones, −Reuniones, −Resoluciones, −Proyectos, −Comités en este ciclo) · **0** en `docs/legacy-uuid-allowlist.txt`. Restan: Layout + Accounts/Admin/Audit/Backups/Bodega/Calendario/DocumentSettings/Ersaps/FieldReadings/FinancialDocuments/Imports/Integrations/MapView/Metering/PeguesContratos/Progress/ReceiptVisualStudio/Reports/Security/Settings/SubscriberCards/SubscriberPortal/Subscribers/Tariffs/Transparencia/Users/VerifyReceipt (milestones P/Q/R/S/V). El gate impide que las listas crezcan o queden entradas obsoletas. |
| MIGRATION_HEAD | `202609010015_v6_governance_persons.sql` (list_governance_persons: persona-picker de cargos §64; list_committees — sólo lectura). Prev: `202609010014_v6_portfolio.sql` (get_portfolio_overview; list_arrangements_workspace). Tipos DB: regenerar tras aplicar a cloud (post-merge, §141). |
| OPEN_BLOCKERS | Ninguno interno. Externos para el cierre total (merge→cloud→Render→smoke): requieren credenciales/permiso de escritura en Supabase Cloud, Render y GitHub merge — ver COMPLETION REPORT al pie. |
| STAGING_STATE | No configurado. Plan: Render PR Preview + Supabase local/CI. Sin servicios pagados nuevos. |
| PRODUCTION_UNCHANGED | SÍ. Prod (`junta-agua-gestion-integral.onrender.com`) sirve `main`/`c677335`. No se toca durante desarrollo. |

## Baseline capturado (2026-09-01)

- **Repo:** `Clopezgg/junta-agua-gestion-integral`, rama prod `main`, HEAD `c677335` (merge PR #21 V6).
- **Tag baseline:** `enterprise-rebuild-baseline-20260901` (pushed).
- **Supabase:** project ref `ugbbwppcewyhlrnvqqvm`, ACTIVE_HEALTHY, Postgres 17.6, linked.
- **CI:** últimos runs verdes (Validar aplicación / Validar base de datos / E2E real).
- **gh auth:** OK (cuenta Clopezgg, scopes repo/workflow/read:org/gist).
- **supabase CLI:** autenticado, proyecto listado.
- **Prod smoke HTTP:** 200, headers de seguridad presentes (CSP, HSTS, COOP, Permissions-Policy, nosniff, X-Frame-Options DENY).
- **package.json version:** `3.1.1` (inconsistente con narrativa V5/V6 — se define versión enterprise sólo en release, milestone Z).

## Skills disponibles (descubiertas)

Globales `~/.claude/skills`: `emil-design-eng`, `impeccable`.
Plugin Superpowers: `brainstorming`, `writing-plans`, `executing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `subagent-driven-development`, `dispatching-parallel-agents`, `using-git-worktrees`, `finishing-a-development-branch`, `writing-skills`.
Otras: `impeccable` (UX/UI), `dataviz`, `artifact-*`, `code-review`, `simplify`, `security-review`, `run`, `claude-in-chrome`.
No hay `.claude/` ni `skills/` dentro del repo. No hay MCP servers de dominio.

**Visual Contract:** `docs/ENTERPRISE-VISUAL-CONTRACT.md` (lenguajes A login / B portal / C command center). Aplicable a todo milestone de UI desde ahora.

**Uso previsto por milestone:** `brainstorming` antes de cada rediseño de dominio; `impeccable` + `emil-design-eng` para design system y pantallas; `test-driven-development` para servicios/RPC/UI; `systematic-debugging` para defectos; `security-review` + `code-review` en U; `claude-in-chrome` para Visual QA en W/X.

## Historial de milestones

| Milestone | Estado | SHA cierre | Notas |
|---|---|---|---|
| A — Skills + Forensics + Baseline + Git Cleanup Plan | ✅ COMPLETE | `4e8aa65` | Baseline + tag + branch + Draft PR #22 + branch protection + 4 docs de verdad. |
| B — Architecture + Design System + Legacy Isolation | ✅ COMPLETE | `62d55b0` | `ENTERPRISE-ARCHITECTURE.md`; tipos DB reales; DS barrel + README; gate estático legacy/UUID (`scripts/enterprise-gates.mjs` + test + CI). |
| C — Shell + Router + Search + Quick Create + Notifications | ✅ COMPLETE | `254b6c4` | Router por dominio (`src/app/router/*`, App.tsx 170→6). CommandPalette real (`src/app/commands/*`, Ctrl+K, teclado, permisos, entidades vía `global_search`). NotificationsCenter con avisos reales derivados de `get_role_dashboard` (`src/features/notifications/*`). QuickCreate → rutas reales. +5 suites de test, +1 E2E. |
| D — Login + MFA + Setup | ✅ COMPLETE | `2542a6a` | Login (§23) y MFA primer-admin (§24) ya sólidos desde V6 — verificados + E2E. Setup: asistente empresarial real de 5 pasos (§25) — Identidad/Ubicación/Legal/Servicio/Revisión sobre `bootstrap_organization` + nuevo `complete_setup`/`save_setup_progress`; migración `202609010009` añade el perfil institucional y corrige pérdida de datos en `update_organization_settings` (§152). Sin datos inventados. |
| E — Inicio (Command Center) | ✅ COMPLETE | `c534738` | `Home.tsx` reconstruido sobre `src/design-system` como command center (§26): "Requiere atención" (unificado con NotificationsCenter vía `deriveNotifications`, §133), Panorama y Acciones rápidas role-aware (§27) — lógica extraída a `src/features/dashboard/roleView.ts`. Sale de la allowlist legacy. §39: elimina "L 400" hardcodeado. +home-dashboard test. |
| F — Abonados + 360 + Nuevo Servicio | ✅ COMPLETE | `08d1420` | **§33** `AbonadosList` + RPC `list_subscribers` (mig. 010). **§34** `Abonado360.tsx` en `/abonados/:id` — 8 pestañas + barra de acciones desde 1 RPC `get_subscriber_expediente` (mig. 011). **§35** detección de duplicados en el alta. **§36** `NuevoServicio.tsx` en `/abonados/nuevo-servicio` — asistente de 4 pasos (Solicitante/Punto de servicio/Solicitud/Revisión) que orquesta abonado+pegue+solicitud con borrador local y bitácora del trámite hasta activación (`src/features/subscribers/nuevoServicio.ts`). **§32** sin UUID. **§37** ya OK (`next_connection_code` atómico). +3 suites de test, +3 E2E. |
| G — Cobro + Recibos + Caja | ✅ COMPLETE | `bbc834d` | **§46** `Caja.tsx` espacio propio (WORKSPACE: Estado/Cobros/Arqueo/Historial) + mig. `202609010012`. **§43** `Payments.tsx` POS sobre DS (patrón TRANSACTION): búsqueda, selección de obligaciones, 5 métodos + mixto, resumen, contabilización. **§44** integridad conservada y verificada (idempotencia, componentes, allocations, el fallo de PDF no revierte el pago; void/refund con AAL2 sin borrar original). **§45** recibo inmutable + reimpresión con snapshot de marca histórico. **§87** entrega por wa.me manual + correo. Consola de caja fuera de Pagos. Ambas salen de la allowlist. `ENTERPRISE-ARCHITECTURE.md §5b` documenta el lifecycle. |
| H — Cartera + Convenios + Bancos/Conciliación | ✅ COMPLETE | `c64acb3` | Banking backoffice §34-38, §49-50. `get_portfolio_overview` (mig. 014, siempre devuelve el objeto). Sin suspensión automática. |
| I — Gastos + Compras + Presupuesto | ✅ COMPLETE | `cfa45c1` | §40-42 sobre design system con workflows completos. |
| J — Operación + Incidentes + Órdenes | ✅ COMPLETE | `51b662f` | §46-48 como workspace operativo. |
| K — Centro operativo / GIS command center | ✅ COMPLETE | `91a2851` | §49-50, lenguaje visual C (dark map). |
| L — Campo (PWA técnico de órdenes) | ✅ COMPLETE | `5d4a79a` | §53. Offline seguro; sin pagos/aprobaciones/tarifas offline. |
| M — Agua y Ambiente | ✅ COMPLETE | `978fe74` | §54-58: Calidad/Cloración/Fuentes/Continuidad/Microcuenca sobre design system, sin `window.prompt`. |
| N — Solicitudes + Comunicaciones | ✅ COMPLETE | `pending-push` | §61 service desk (SLA, asignación, estados, derivación a incidencia/orden) + §62 plantillas contextuales (8) por 3 canales. Ambas fuera del allowlist. |
| O — Junta / Gobierno | ✅ COMPLETE | `6891a1b` | JuntaDirectiva: persona-picker del registro maestro (mig. 015 `list_governance_persons` + alta inline) — allowlist UUID vacío (§64). Asamblea/Reuniones/Resoluciones/Proyectos/Comités sobre design system, actas y comités en Dialog (sin `window.prompt`). Cargo institucional ≠ rol del sistema. Suite `governance-milestone-o`. |
