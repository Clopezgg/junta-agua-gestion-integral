# ENTERPRISE REBUILD — EXECUTION STATE

> Fuente de verdad viva del progreso. Se actualiza al cierre de cada milestone y en cada SHA verde.

| Campo | Valor |
|---|---|
| CURRENT_PHASE | Milestone A — Skills + Forensics + Baseline + Git Cleanup Plan |
| CURRENT_BRANCH | `work/junta-enterprise-rebuild` |
| CURRENT_SHA | (pendiente primer commit del milestone) |
| LAST_GREEN_SHA | `c677335` (main, baseline) — 159 tests, lint OK, tsc OK |
| LAST_COMPLETED_MILESTONE | — (A en curso) |
| NEXT_ACTION | Cerrar A: publicar Draft PR + validar plan de limpieza de ramas. Luego Milestone B (Architecture + Design System + Legacy Isolation). |
| TEST_COUNT | 159 (vitest) |
| E2E_COUNT | 1 spec Playwright (`tests/e2e/smoke.spec.ts`) + 1 sim (`src/tests/e2e/commercial-flow-simulation.test.ts`) |
| MIGRATION_HEAD | `202609010008_v6_public_institution.sql` (52 archivos en `supabase/migrations`) |
| LEGACY_FILES_REMAINING | 8 CSS legacy (`styles.css`, `v2.css`, `v3.css`, `v3-card.css`, `portal.css`, `workflows.css`, `receipt-studio.css`, `responsive.css`) + `src/styles/*` (4) — total ~74KB. 57 páginas en `src/pages` (mezcla V3/V5/V6). |
| OPEN_BLOCKERS | Ninguno interno. Externo: `main` sin branch protection (repo lo reporta 404 "Branch not protected") — ver ENTERPRISE-GIT-CLEANUP-PLAN.md §Main Protection. |
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
| A — Skills + Forensics + Baseline + Git Cleanup Plan | EN CURSO | — | Baseline + tag + branch + Draft PR + docs de verdad. |
