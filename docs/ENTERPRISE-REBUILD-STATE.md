# ENTERPRISE REBUILD — EXECUTION STATE

> Fuente de verdad viva del progreso. Se actualiza al cierre de cada milestone y en cada SHA verde.

| Campo | Valor |
|---|---|
| CURRENT_PHASE | Milestone F — Abonados + 360 + Nuevo Servicio (EN CURSO — lista §33 ✅ + Abonado 360 §34 ✅; Nuevo Servicio §36 pendiente) |
| CURRENT_BRANCH | `work/junta-enterprise-rebuild` |
| CURRENT_SHA | `cda307e` |
| LAST_GREEN_SHA | `cda307e` — 195 tests, lint OK, tsc OK, build OK |
| LAST_COMPLETED_MILESTONE | E — Inicio (Command Center) |
| NEXT_ACTION | Milestone F (resto): workflow Nuevo Servicio (§36) — Persona→Abonado→Ubicación→Solicitud→Inspección→Aprobación→Contrato→Cobro→Orden→Materiales→Instalación→Activación con borrador y timeline. Luego Milestone G. Draft PR: #22. |
| TEST_COUNT | 195 (vitest) — gates: legacy · router-map · command-palette · notifications · quick-create · setup-wizard · home-dashboard · subscriber-list · abonado-360 |
| E2E_COUNT | 6 tests Playwright (`tests/e2e/smoke.spec.ts`, +command palette) + 1 sim |
| LEGACY_FILES_REMAINING | 12 CSS legacy (~74KB, aislados por gate) + 50 `.tsx` en `docs/legacy-ui-allowlist.txt` (−App, −Home, −Abonado360) + **1** en `docs/legacy-uuid-allowlist.txt` (solo JuntaDirectiva). El gate impide que las listas crezcan. |
| MIGRATION_HEAD | `202609010011_v6_abonado_expediente.sql` (`get_subscriber_expediente` — un RPC arma las 8 pestañas del 360). Tipos DB: regenerar tras aplicar a cloud (post-merge, §141). |
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
| F — Abonados + 360 + Nuevo Servicio | 🔶 EN CURSO | `cda307e` | **Lista §33 ✅** (`AbonadosList` + RPC `list_subscribers`, mig. 010). **Abonado 360 §34 ✅**: `Abonado360.tsx` sobre DS en `/abonados/:id` — 8 pestañas (Resumen·Servicio·Cuenta·Pagos·Atención·Trabajo·Documentos·Historial) + barra de acciones (Cobrar/Nuevo servicio/Solicitud/Orden/Estado de cuenta/Comunicar), todo desde 1 RPC `get_subscriber_expediente` (mig. 011), permisos por sección. **§32 corregido** (sin UUID). §37 ya OK. **Pendiente**: workflow Nuevo Servicio (§36). |
| G — Cobro + Recibos + Caja | PENDIENTE | — | — |
