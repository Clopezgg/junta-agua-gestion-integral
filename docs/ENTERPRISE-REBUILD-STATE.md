# ENTERPRISE REBUILD — EXECUTION STATE

> Fuente de verdad viva del progreso. Se actualiza al cierre de cada milestone y en cada SHA verde.

| Campo | Valor |
|---|---|
| CURRENT_PHASE | Milestone G — Cobro + Recibos + Caja (EN CURSO — Caja §46 ✅; POS §43 + recibo §45 pendientes) |
| CURRENT_BRANCH | `work/junta-enterprise-rebuild` |
| CURRENT_SHA | (pendiente commit G.1) |
| LAST_GREEN_SHA | (pendiente commit G.1) — 206 tests, lint OK, tsc OK, build OK |
| LAST_COMPLETED_MILESTONE | F — Abonados + 360 + Nuevo Servicio |
| NEXT_ACTION | Milestone G (resto): rebuild `Payments.tsx` como POS profesional sobre DS (§43) — quitar la consola de caja embebida (ya vive en `/caja`), añadir recibo por WhatsApp (§87). Payment integrity (§44) y recibo (§45) ya sólidos en backend — verificar y documentar lifecycle. Draft PR: #22. |
| TEST_COUNT | 206 (vitest) — +caja |
| E2E_COUNT | 6 tests Playwright (`tests/e2e/smoke.spec.ts`, +command palette) + 1 sim |
| LEGACY_FILES_REMAINING | 12 CSS legacy (~74KB, aislados por gate) + 49 `.tsx` en `docs/legacy-ui-allowlist.txt` (−App, −Home, −Abonado360, −Caja) + **1** en `docs/legacy-uuid-allowlist.txt`. El gate impide que las listas crezcan. |
| MIGRATION_HEAD | `202609010012_v6_caja.sql` (`get_cash_session_report` + `list_cash_sessions` — arqueo, diferencias, historial). Tipos DB: regenerar tras aplicar a cloud (post-merge, §141). |
| OPEN_BLOCKERS | Ninguno. Branch protection en `main` ACTIVA (checks requeridos: "Validar aplicación", "Validar base de datos (Supabase local)"; sin force-push ni delete). |
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
| G — Cobro + Recibos + Caja | 🔶 EN CURSO | (commit G.1) | **§46 Caja ✅**: `Caja.tsx` reconstruida sobre DS como espacio propio (patrón WORKSPACE) — pestañas Estado/Cobros/Arqueo/Historial; migración `202609010012` (`get_cash_session_report`: efectivo esperado = fondo + cobros cash − devoluciones, cobros por método; `list_cash_sessions`: historial con cajero y diferencia). Sin `prompt()`. Sale de la allowlist. **Pendiente**: POS §43 (`Payments.tsx`), recibo WhatsApp §87. |
| H — Cartera + Convenios + Bancos | PENDIENTE | — | — |
