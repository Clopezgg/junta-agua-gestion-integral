# ENTERPRISE REBUILD — EXECUTION STATE

> Fuente de verdad viva del progreso. Se actualiza al cierre de cada milestone y en cada SHA verde.

| Campo | Valor |
|---|---|
| CURRENT_PHASE | Milestone D — Login + MFA + Setup (pendiente de arranque) |
| CURRENT_BRANCH | `work/junta-enterprise-rebuild` |
| CURRENT_SHA | (pendiente commit C) |
| LAST_GREEN_SHA | (pendiente commit C) — 180 tests, lint OK, tsc OK, build OK |
| LAST_COMPLETED_MILESTONE | C — Shell + Router + Search + Quick Create + Notifications |
| NEXT_ACTION | Milestone D: rebuild total del login administrativo (§23), AuthShell, verificar flujo MFA primer admin (§24), Setup wizard empresarial (§25). Draft PR: #22. |
| TEST_COUNT | 180 (vitest) — gates: `enterprise-legacy-gate`, `router-map`, `command-palette`, `notifications`, `quick-create` |
| E2E_COUNT | 6 tests Playwright (`tests/e2e/smoke.spec.ts`, +command palette) + 1 sim |
| LEGACY_FILES_REMAINING | 12 CSS legacy (~74KB, aislados por gate) + 53 archivos `.tsx` en `docs/legacy-ui-allowlist.txt` + 2 en `docs/legacy-uuid-allowlist.txt`. El gate impide que las listas crezcan. |
| MIGRATION_HEAD | `202609010008_v6_public_institution.sql`. Tipos DB generados → `src/lib/database.types.ts` (7874 líneas). |
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
| C — Shell + Router + Search + Quick Create + Notifications | ✅ COMPLETE | (commit C) | Router por dominio (`src/app/router/*`, App.tsx 170→6). CommandPalette real (`src/app/commands/*`, Ctrl+K, teclado, permisos, entidades vía `global_search`). NotificationsCenter con avisos reales derivados de `get_role_dashboard` (`src/features/notifications/*`). QuickCreate → rutas reales. +5 suites de test, +1 E2E. |
| D — Login + MFA + Setup | PENDIENTE | — | — |
