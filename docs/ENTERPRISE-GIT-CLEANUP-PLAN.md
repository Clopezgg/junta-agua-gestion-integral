# ENTERPRISE REBUILD — GIT FORENSICS & CLEANUP PLAN

Estado capturado: 2026-09-01, contra `origin` tras `git fetch --all --prune`.
Regla: **no se ejecuta ningún borrado en Milestone A.** Este documento es el plan aprobable.
Los borrados se ejecutan en Milestone V (Legacy Eradication) / §146 tras confirmación.

## Ramas locales

| Rama local | ¿En remoto? | Acción |
|---|---|---|
| `main` | sí | KEEP (protegida) |
| `work/junta-enterprise-rebuild` | sí (nueva) | KEEP (rama de trabajo) |
| `fix/mfa-first-admin-bootstrap` | sí | DELETE local+remote — PR #13 MERGED, 0 commits ahead de main |
| `v5/field-readings-pwa` | sí | DELETE local+remote — PR #20 MERGED, 0 ahead |
| `work/junta-agua-uiux-v4` | sí | DELETE local+remote — PR #12 MERGED, 0 ahead |
| `work/junta-agua-v5-operating-system` | sí | DELETE local+remote — PR #14 MERGED, 0 ahead |
| `work/junta-os-v6-product-rebuild` | sí | DELETE local+remote — PR #21 MERGED, 1 ahead/1 behind (merge commit); sin commits únicos de valor |

## Ramas remotas — clasificación

`git rev-list --left-right --count origin/main...origin/<branch>` → `<ahead-de-main> <detrás-de-main>` (ahead = commits en la rama que no están en main).

| Rama remota | ahead/behind | Última fecha | PR | Merged | Acción | Justificación |
|---|---|---|---|---|---|---|
| `origin/main` | — | 2026-09-01 | — | — | KEEP | producción |
| `origin/work/junta-enterprise-rebuild` | nueva | 2026-09-01 | (draft) | no | KEEP | rebuild |
| `origin/work/junta-os-v6-product-rebuild` | 1/1 | 2026-09-01 | #21 | ✅ | DELETE | absorbida en `c677335` |
| `origin/v5/field-readings-pwa` | 6/0 | 2026-09-01 | #20 | ✅ | DELETE | los 6 commits ya están en main vía merge |
| `origin/work/junta-agua-v5-operating-system` | 27/0 | 2026-08-31 | #14 | ✅ | DELETE | contenida en main |
| `origin/work/junta-agua-uiux-v4` | 34/0 | 2026-08-30 | #12 | ✅ | DELETE | contenida en main |
| `origin/fix/mfa-first-admin-bootstrap` | 32/0 | 2026-08-30 | #13 | ✅ | DELETE | contenida en main |
| `origin/codex/realizar-auditoria-tecnica-y-funcional` | 42/0 | 2026-07-12 | #10 | ✅ | DELETE | contenida en main |
| `origin/hotfix/release-v3-clean` | 50/2 | 2026-07-11 | #7 | ✅ | DELETE | histórica V3, mergeada; 2 commits divergentes triviales de release |
| `origin/fix/release-automation-v2` | 54/2 | 2026-07-11 | #2 | ✅ | DELETE | histórica V3, mergeada |
| `origin/audit/multifuente-integracion-total` | 53/7 | 2026-07-11 | #3 | ✅ | ARCHIVE→DELETE | mergeada; 7 commits divergentes → tag `archive/audit-multifuente` antes de borrar |
| `origin/feature/plataforma-v2-cinco-mejoras` | 55/48 | 2026-07-11 | #1 | ✅ | ARCHIVE→DELETE | 48 commits únicos (V2); tag `archive/plataforma-v2` |
| `origin/feature/platform-complete-v3` | 51/36 | 2026-07-11 | #5 (merged), #6 (OPEN) | parcial | ARCHIVE→DELETE + cerrar PR #6 | 36 commits únicos; tag `archive/platform-complete-v3` |
| `origin/feature/platform-complete-v3-copy` | 51/26 | 2026-07-11 | — | no | ARCHIVE→DELETE | copia; 26 commits únicos; tag `archive/platform-v3-copy` |
| `origin/feature/receipt-visual-studio-v3-1` | 45/11 | 2026-07-11 | #9 | ✅ | ARCHIVE→DELETE | 11 commits únicos; tag `archive/receipt-visual-v31` |
| `origin/feature/ux-recibos-beneficios-portal-v3` | 52/31 | 2026-07-11 | #4 | ✅ | ARCHIVE→DELETE | 31 commits únicos; tag `archive/ux-recibos-v3` |
| `origin/fix/version-3.0.0` | 49/3 | 2026-07-11 | #8 (OPEN) | no | cerrar PR #8 + ARCHIVE→DELETE | 3 commits; conflicto; obsoleto |
| `origin/audit-finalization-temp` | 51/23 | 2026-07-11 | — | no | ARCHIVE→DELETE | rama temporal; tag `archive/audit-finalization-temp` |

Antes de cada borrado con commits divergentes: `git tag archive/<slug> origin/<branch> && git push origin archive/<slug>`.
Ningún borrado sin verificar `git log origin/main..origin/<branch>` una última vez.

## PRs a cerrar (obsoletos, versiones antiguas)

- **#6** "Hotfix final de liberación V3" — OPEN, CONFLICTING, base V3. Cerrar sin merge.
- **#8** "Corregir versión visible a 3.0.0" — OPEN, CONFLICTING. Cerrar; la versión enterprise se define en release (§119).

## Tags

KEEP todos los tags de versión (`v2.0.0`, `v2.1.0`, `v2.2.0`, `v3.1.0`, `v3.1.1`, `v5-baseline-before-v6`) — historial de release.
NUEVO: `enterprise-rebuild-baseline-20260901` (creado).
NUEVOS de archivo: `archive/*` según tabla anterior (Milestone V).

## Estado final deseado de ramas

```
main
work/junta-enterprise-rebuild
```
más tags `v*`, `v5-baseline-before-v6`, `enterprise-rebuild-baseline-20260901`, y `archive/*` de recuperación.

## Main Protection (§12)

`GET /repos/Clopezgg/junta-agua-gestion-integral/branches/main/protection` → **404 "Branch not protected"**.
Acción Milestone A: intentar habilitar vía API (`repo` scope disponible):
- prohibir force-push y borrado
- requerir PR
- requerir checks: `Validar aplicación`, `Validar base de datos (Supabase local)`, `E2E real`
Si el plan del repo lo impide → registrar `BLOCKED_EXTERNAL` con evidencia y proteger vía convención + CI.
