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

## Pendiente
- PR maestro a main → CI `validate.yml` + `db-validate.yml` (valida las 9 migraciones en Supabase real) + `e2e.yml`.
- Ajustar migraciones 036-044 si db-validate detecta errores SQL (referencias/casts/orden).
- Actualizar docs/DATABASE.md, ARCHITECTURE.md, EVIDENCE-MATRIX.md y tests estáticos de dominios V5.
- Merge → deploy Render LIVE → smoke E2E → verificación SHA final + URL final.
