# V5 · Estado del Agua: Water Utility Operating System — Progreso

Rama: `work/junta-agua-v5-operating-system` (base `main @ 67754d7` trás merge de PR #13)
Objetivo: transformar la plataforma en un ERP/OS real de JAA de Honduras (Orden Maestra V5 §1-§138).

## Fase 0 — Auditoría y análisis de brecha ✅
- `docs/V5-GAP-ANALYSIS.md` creado y committed: CURRENT/TARGET/REUSE/CHANGE/NEW, detección automática, plan 12 fases.

## Fase 1 — Arquitectura de información + shell ✅
- `src/components/Layout.tsx`: 8 grupos objetivo (INICIO, Usuarios y servicio, Tesorería, Operación, Agua y ambiente, Gobierno, Cumplimiento, Administración) + `titleFor()` con todas las rutas V5.
- `src/styles/tokens.css`: paleta V5 §64 aplicada (brand-600 `#1D4ED8`, water-600 `#0284C7`, ink/text/border/surface con alias legacy conservados).
- `src/App.tsx`: rutas wired para los 8 grupos; sub-rutas de operación mapeadas al hub `Operations`; páginas V5 conectadas con `ProtectedRoute` + permiso.
- `src/lib/security.ts`: nuevas Permission en el union: `communications.read`, `water.*`, `governance.*`, `compliance.*`, `calendar.manage`.

## Fase 2-11 — Backend (migraciones 036-044) ✅
9 migraciones nuevas, todas con RLS, permisos, security-definer + RPCs + auditoría:
- `202608310036_v5_identity_model.sql` — identidad (PERSONA ≠ ABONADO ≠ INMUEBLE ≠ CONTRATO ≠ PEGUE)
- `202608310037_v5_service_requests.sql` — solicitudes y reclamos
- `202608310038_v5_payment_arrangements.sql` — morosidad / convenios
- `202608310039_v5_procurement.sql` — compras y proveedores
- `202608310040_v5_bank_reconciliation.sql` — bancos / conciliación
- `202608310041_v5_warehouse.sql` — bodega / inventario
- `202608310042_v5_governance.sql` — asamblea, junta, comités, reuniones, resoluciones, proyectos
- `202608310043_v5_water_environment.sql` — fuentes, calidad, cloración, continuidad, microcuenca
- `202608310044_v5_compliance_ersaps.sql` — ERSAPS, calendario, transparencia, informe anual

Servicios en `src/features/{identity,requests,arrears,procurement,treasury,inventory,governance,water,compliance}`.

## Fase 2-11 — UI (21 páginas nuevas) ✅
Asamblea, JuntaDirectiva, Comites, Reuniones, Resoluciones, Proyectos, Fuentes, Calidad, Cloracion, Continuidad, Microcuenca, Ersaps, Calendario, Transparencia, Bancos, Compras, Solicitudes, Morosidad, Bodega, Caja, PeguesContratos, Comunicaciones — todas conectadas a rutas.

## Verificación (evidencia real)
- `npm test` → 20 files / 113 tests passed ✅
- `npm run build:render` → build OK, SW `junta-agua-shell-v3.1.1-5da7663f` ✅
- `npx tsc -b` → sin errores ✅
- `npx eslint src/` → sin errores ✅
- Integridad RPCs: 0 funciones referenciadas sin definir en migraciones ✅
- Smoke E2E (H1 `gestión comunitaria del agua`, `Abonados y pegues`, `Presupuesto y sostenibilidad financiera`, `Pagos, recibos y contabilización` + placeholder `buscar por código`) intactos tras cambios FASE 1 ✅

## CI PR #14 (evidencia real)
- PR: https://github.com/Clopezgg/junta-agua-gestion-integral/pull/14 (head `work/junta-agua-v5-operating-system`).
- `validate` → **pass** (34s) · `functions` (edge functions deno) → **pass** (15s).
- Primera corrida: `db` (migraciones 001-044 en Supabase real) y `browser` (E2E) **fallaron por la misma causa raíz** SQL `42P13` en la migración 039:
  - `ERROR: input parameters after one with a default value must also have defaults` en `create_purchase_order`, cuya firma tenía `p_lines jsonb` (sin default) después de parámetros con `DEFAULT`.
- **Fix aplicado** en `202608310039_v5_procurement.sql`: se movió `p_lines jsonb` al inicio de la firma de `create_purchase_order` (ahora el 1er parámetro, sin default; el resto conserva DEFAULT). Seguro porque el frontend llama por argumentos **nombrados** (`db().rpc('create_purchase_order', {p_lines, p_supplier_id, ...})`), no posicionales.
- Auditoría del resto de firmas 036-044: todas cumplen la regla de que, una vez hay un parámetro con default, los siguientes deben tener default. Sin otros errores SQL latentes detectados (referencias, casts de enums, permisos `communications.*/water.*/governance.*/compliance.*/calendar.manage` y `expenses.*/finance/bank/inventory` todos definidos).

## CI PR #14 — estado FINAL ✅
- Re-corrida tras el fix (`a36f492`): **los 4 checks del PR están verdes**:
  - `validate` → **pass** (31s)
  - `db` (migraciones 001-044 en Supabase real) → **pass** (2m03s)
  - `functions` (edge functions deno) → **pass** (15s)
  - `browser` (E2E real) → **pass** (4m00s)
- `gh pr checks 14`: browser=PASS · db=PASS · functions=PASS · validate=PASS.

## Evidencia por fase (backend / UI / RLS / TEST)

| FASE | Backend | UI | RLS | Test |
|------|---------|----|-----|------|
| 0 | V5-GAP-ANALYSIS.md | — | — | Auditoría automática |
| 1 | security.ts union permisos | Layout 8 grupos + paleta §64 + rutas | ProtectedRoute+permiso | tsc/eslint/build |
| 2 (identity) | migración 036 + service | Asamblea/.. /PeguesContratos/.. | RLS + permisos | CI db ✅ |
| 3 (requests) | migración 037 + service | Solicitudes | RLS + permisos | CI db ✅ |
| 4 (arrears) | migración 038 + service | Morosidad | RLS + permisos | CI db ✅ |
| 5 (procurement) | migración 039 + service | Compras | RLS + permisos | CI db ✅ |
| 6 (treasury/banks) | migración 040 + service | Bancos/Caja | RLS + permisos | CI db ✅ |
| 7 (inventory/warehouse) | migración 041 + service | Bodega | RLS + permisos | CI db ✅ |
| 8 (governance) | migración 042 + service | Asamblea/JuntaDirectiva/Comites/Reuniones/Resoluciones/Proyectos | RLS + permisos | CI db ✅ |
| 9 (water/environment) | migración 043 + service | Fuentes/Calidad/Cloracion/Continuidad/Microcuenca | RLS + permisos | CI db ✅ |
| 10 (compliance/ERSAPS) | migración 044 + service | Ersaps/Calendario/Transparencia | RLS + permisos | CI db ✅ |
| 11 (comunicaciones) | RPC listMessages | Comunicaciones | `communications.read` | tsc/eslint ✅ |
| 12 (shell+deploy) | — | Layout/App/tokens | — | build:render + CI ✅ |

## PRODUCCIÓN (se completa al cierre)
- Supabase project: `ugbbwppcewyhlrnvqqvm` (junta-agua-gestion-integral, East US)
- Migraciones 036-044 aplicadas → (SHA a registrar)
- Edge Functions → (a registrar)
- Render deploy SHA → (a registrar)
- URL pública → (a registrar)
- Smoke prod → (resultados a registrar)
