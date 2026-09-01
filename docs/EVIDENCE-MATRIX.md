# Matriz de evidencia — ERP Comunitario "Junta de Agua"

Versión 3.1.0 · Rama `work/junta-agua-erp-production-v2` · PR #11 (OPEN).
Cada fila indica el área, el estado de validación, la evidencia concreta y el
compromiso (commit) que la respalda.

| ÁREA | STATUS | EVIDENCE | COMMIT |
|---|---|---|---|
| Núcleo financiero (secuencias, idempotencia, beneficios, caja, artefactos, mora) | ✅ | Migración 032 · `supabase/tests/db_integrity.sql` secciones 1–5 · tests `src/tests/*` | `076e30b` |
| Invariantes del modelo + corrección auditada + login cooldown | ✅ | Migración 033 (anti-delete, formato código, no negativos, guards de caja, `record_login_attempt`/`get_login_cooldown_seconds`) · `data-model-invariants.test.ts` | `7222af3` |
| Fuerza bruta conectado al login | ✅ | `src/pages/Login.tsx` consume cooldown + registro de intentos | `16e605a` |
| MFA en todas las acciones de respaldo + sesiones de restauración | ✅ | Migración 034 (`backup_restore_sessions`) · `backup-manager` (aal2 en backup/download/restore) · `Backups.tsx` panel de sesiones · `backup-restore-hardening.test.ts` | `c12e201` |
| Retención automática de respaldos vencidos | ✅ | Migración 035 (`retention_days`/`pruned_at`/`pruned_by` + estado `pruned`) · `backup-manager` poda por `retention_days` de la integración `backup` (default 90) · traza `backup.prune` en `audit_events` · `db_integrity.sql` sección 10 | `202608300035` (rama/ci) |
| Integridad validada en Supabase real (001..034) | ✅ | `db-validate.yml`: `supabase start` aplica 001..034 · `db_integrity.sql` (Secciones 1–9) · seed post-bootstrap `seed_integrity.sql` | `8e51b15` + `f5c9538` |
| Edge functions tipadas por Deno (11 funciones) | ✅ | `deno check` verde en CI (todas `supabase/functions/*`) | `ab316df` |
| Sin RPC fantasma: pantallas 100% respaldadas por backend | ✅ | `phase-g-real-rpcs.test.ts` (0 fantasma · 104 RPC verificadas contra migraciones) | `c386ab4` |
| Contrato de CI sincronizado con la validación real | ✅ | `production-hardening.test.ts` (start + integridad 032–034) | `15ee3e6` |
| E2E real de navegador (Playwright + Supabase local + seed) | ✅ | `tests/e2e/smoke.spec.ts` (5 pruebas: login+panel, navegación, búsqueda, responsivo, logout; MFA TOTP real vía enrolamiento GoTrue) · `e2e_seed.sql` · `e2e.yml` · 5 passed en Chromium real | `4e9ab66` → `f5c9538` |
| Vitest y Playwright aislados (sin colisión) | ✅ | `vitest.config.ts` (include/exclude) · 19 archivos / 106 pruebas | `a9d1525` |
| UI sin emojis funcionales + dependencias sin vulnerabilidades | ✅ | `Layout.tsx` con lucide `Check` · `npm audit` = 0 | `f5c89b0` |
| Arranque de Supabase aplica migraciones (sin paso db reset intermedio) | ✅ | `db-validate.yml` flujo real superado (start→integridad→migration list) | `5794b57` |
| Despliegue validado hasta el release | ✅ | `release.yml` con `needs: [validate]` · `render.yaml` CSP/HSTS/Permissions-Policy · SW versionado | `113ecd5` (`884bd4a`) |
| Documentación final de producción | ✅ | `docs/ARCHITECTURE.md` · `docs/SECURITY.md` · `docs/DATABASE.md` · `docs/BACKUP-RESTORE.md` · `docs/DISASTER-RECOVERY.md` · `docs/PRODUCTION-READINESS.md` | `c8ff131` (docs en rama) |
| Readiness comercial offline | ✅ | `npm run readiness:offline` → 13 checks OK | preexistente + `5bafdf5` |

Leyenda: ✅ verificado por CI/contratos locales · 🔄 pipeline activo en la rama
(curso de último run) o pendiente de despliegue con credenciales reales.

Riesgos observados, no bloqueantes para el código:
- Despliegue real a Render/Supabase requiere credenciales externas (bloqueado externamente).

---

# V5 · Water Utility Operating System — Matriz de evidencia

Rama `work/junta-agua-v5-operating-system` → PR #14 (base `main`). Fuente verdad `main`.

| ÁREA | STATUS | EVIDENCE | COMMIT |
|---|---|---|---|
| Fase 0 — Auditoría + gap analysis (12 fases) | ✅ | `docs/V5-GAP-ANALYSIS.md` | `d33f63b` |
| Fase 1 — IA 8 grupos + shell + paleta §64 | ✅ | `Layout.tsx` (8 grupos + `titleFor`), `tokens.css` (brand-600 `#1D4ED8`), `App.tsx` (rutas V5 + `ProtectedRoute`), `security.ts` (union `communications/water/governance/compliance/calendar.manage`) | `ec94b09` |
| Fase 2-11 Backend — 9 migraciones 036-044 | ✅ | `202608310036..044_v5_*.sql` (identidad, solicitudes, morosidad, compras, banca, bodega, gobierno, agua, cumplimiento) todas con RLS + permisos + RPCs `security definer` + auditoría | `ec94b09` + fix `a36f492` |
| Fase 2-11 UI — 22 páginas V5 | ✅ | `src/pages/{Asamblea,JuntaDirectiva,Comites,Reuniones,Resoluciones,Proyectos,Fuentes,Calidad,Cloracion,Continuidad,Microcuenca,Ersaps,Calendario,Transparencia,Bancos,Compras,Solicitudes,Morosidad,Bodega,PeguesContratos,Caja,Comunicaciones}` | `ec94b09` |
| Validación local (tsc/eslint/build/test) | ✅ | `npx tsc -b` OK · `npx eslint src/` 0 errores · `npm run build:render` OK · `npm test` 20 files/113 pass | `ec94b09` |
| Integridad RPCs V5 (0 fantasma) | ✅ | `comm -23` referencias vs definidos = 0 | `ec94b09` |
| CI PR #14 — 4 checks verdes | ✅ | `gh pr checks 14`: validate=PASS, db=PASS (001-044 real), functions=PASS, browser=E2E PASS | `a36f492` |
| Fix SQL 42P13 (firma create_purchase_order) | ✅ | `202608310039_v5_procurement.sql` param `p_lines` al inicio; frontend llama por argumentos nombrados | `a36f492` |
| Smoke E2E H1 niveles 1 intactos | ✅ | `tests/e2e/smoke.spec.ts` (gestión comunitaria del agua, abonados, presupuesto, pagos) | `ec94b09` |

Producción (al cierre): Supabase `ugbbwppcewyhlrnvqqvm`, migraciones 036-044 aplicadas,
Edge Functions, Render deploy SHA + URL pública + smoke prod — ver `docs/V5-PROGRESS.md`.