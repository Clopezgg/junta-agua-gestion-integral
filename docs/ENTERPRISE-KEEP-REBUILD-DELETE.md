# ENTERPRISE REBUILD — KEEP / REFACTOR / REBUILD / DELETE / ARCHIVE

Clasificación forense archivo por archivo. Estado: 2026-09-01, rama `work/junta-enterprise-rebuild`.
Verificado contra código actual, no contra documentación previa (§4).

## Evidencia clave del estado real

- **V6 es superficial.** Sólo **5 de 57** páginas (`src/pages/*.tsx`) importan `src/design-system`. **49 de 57** todavía usan clases legacy (`module-hero`, `titlebar`, `panel`).
- `src/layouts/AppShell.tsx` (V6) sólo se referencia desde `App.tsx`. `src/components/Layout.tsx` (legacy) ya no se usa en runtime pero **5 tests** lo referencian → tests legacy (§117).
- **12 archivos CSS** cargados en `src/main.tsx` (~74KB): 8 legacy + `src/styles/*` (4) + `src/design-system/*` (4). Frankenstein confirmado (§15).
- `src/features/*`: 26 dominios, la mayoría con **1 archivo** (wrappers de servicio finos). Base útil de organización, contenido a expandir.
- Backend (52 migraciones, 11 Edge Functions, RPCs V5) **más maduro que la UX** (§3 hipótesis confirmada).
- `App.tsx`: 170 líneas, ~96 `<Route>`, imports directos monolíticos → REBUILD (router por dominio, §22).

## MOTOR A PRESERVAR (KEEP / REFACTOR)

| Área | Archivos | Clasificación | Nota |
|---|---|---|---|
| Migraciones DB | `supabase/migrations/*` (52) | **KEEP** | Historial DB. No se borran (§14). Nuevas incrementales desde HEAD `202609010008`. |
| Edge Functions | `supabase/functions/*` (11) | **REFACTOR** | Auditar CORS/rate-limit/secrets (§85-89, §94). `subscriber-portal-login`, `backup-manager` prioritarios (§85, §90). |
| Auth core | `src/contexts/AuthContext.tsx` | **REFACTOR** | Flujo MFA primer admin (§24) funciona — endurecer, no reescribir. |
| RPC integridad de pago | `register_payment_with_document` + allocations/ledger/audit | **KEEP + HARDEN** | §44. Lifecycle de recibo. |
| Design system base | `src/design-system/{tokens,primitives}` | **REFACTOR → base del DS final** | Punto de partida del §18-19. Expandir primitivas. |
| Feature services | `src/features/*/` (wrappers Supabase) | **REFACTOR** | Reorganizar bajo `src/domains/*` (§16). |
| CI workflows | `.github/workflows/*` | **REFACTOR** | Añadir gates estáticos legacy (§125), a11y, RLS por rol. |
| Tests de dominio/DB válidos | `migrations.test.ts`, `data-model-invariants.test.ts`, `bancos.test.ts`, `abonado-360.test.ts`, `morosidad.test.ts`, `incidents.test.ts`, `solicitudes.test.ts`, `field-readings.test.ts` | **REFACTOR** | Actualizar aserciones al producto final; conservar invariantes reales. |
| Render config | `render.yaml` | **KEEP + REVIEW** | Headers de seguridad presentes; validar en §102. |
| PWA | `public/manifest*`, service worker (`scripts/bake-sw.mjs`) | **REFACTOR** | §101 versionado por SHA, purga de caches. |

## REBUILD (reconstruir sobre el motor)

| Área | Archivos | Nota |
|---|---|---|
| Router | `src/App.tsx` | Rutas por dominio, sin duplicados/aliases legacy (§22). |
| App shell / navegación | `src/layouts/AppShell.tsx`, `navigation.tsx`, `NotificationsMenu.tsx`, `QuickCreate.tsx`, `UserMenu.tsx` | 6 universos (§21), command palette (§28), quick create real (§29), notifications reales (§30). |
| Login administrativo | `src/pages/Login.tsx` | REBUILD TOTAL institucional (§23). |
| MFA / Setup | `src/pages/{Mfa,Setup}.tsx` | Setup wizard empresarial (§25); MFA conserva flujo (§24). |
| Inicio | `src/pages/Home.tsx` | Command center role-aware (§26-27). |
| Abonados | `src/pages/{Subscribers,Abonado360,SubscriberCards,PeguesContratos}.tsx` | Tabla profesional + 360 + Nuevo Servicio workflow (§33-37). |
| Tesorería | `src/pages/{Payments,Caja,Bancos,Morosidad,Compras,Expenses,Budget}.tsx` | POS, caja separada de payments, conciliación, cartera, convenios (§42-56). |
| Operación | `src/pages/{Operations,Incidents,MapView}.tsx` | Mapa OSM, incidentes, órdenes, activos, bodega (§57-63). |
| GIS | `src/components/maps/*`, `src/pages/MapView.tsx` | Centro operacional con capas (§60). |
| Field PWA | `src/pages/FieldReadings.tsx` | Ampliar a órdenes offline-safe (§61). |
| Calidad/Ambiente | `src/pages/{Calidad,Cloracion,Fuentes,Continuidad,Microcuenca}.tsx` | §64-68. |
| Solicitudes/Comunicaciones | `src/pages/{Solicitudes,Comunicaciones}.tsx` | Contextual, no sidebar (§69-70). |
| Junta | `src/pages/{Asamblea,JuntaDirectiva,Comites,Reuniones,Resoluciones,Proyectos,Calendario}.tsx` | §71-77. Pickers humanos, cero UUID (§32, §72). |
| Cumplimiento | `src/pages/{Ersaps,Transparencia}.tsx` | Centro regulatorio + annual pack + transparencia (§78-82). |
| Documentos | `src/pages/{FinancialDocuments,DocumentSettings}.tsx` | Centro documental único (§83). |
| Portal | `src/pages/{PortalLogin,SubscriberPortal}.tsx` | Mini-app real (§84-85). |
| Integraciones/Admin/Health | `src/pages/{Integrations,Admin,Settings,Security,Users,Audit}.tsx` | §86-99. |
| Backups | `src/pages/Backups.tsx` + `supabase/functions/backup-manager` | Reconstrucción crítica (§90-93). |
| Recibos | `src/pages/{ReceiptVisualStudio,VerifyReceipt}.tsx` | Snapshot inmutable (§45). |

## DELETE (tras paridad — Milestone V, §124)

| Archivo | Motivo |
|---|---|
| `src/styles.css` | Frankenstein V1/V2. Reemplazado por DS final. |
| `src/v2.css` | " |
| `src/v3.css` | " |
| `src/v3-card.css` | " |
| `src/portal.css` | Migrar a `PortalShell` (§16). |
| `src/workflows.css` | Migrar a patrones (§20). |
| `src/receipt-studio.css` | Migrar a componente recibo. |
| `src/responsive.css` | DS responsive por tokens (§105). |
| `src/styles/{base,components,layout,tokens}.css` | Generación intermedia; consolidar en `src/design-system`. |
| `src/components/Layout.tsx` | Layout legacy sin uso runtime. |
| `src/components/GlobalSearch.tsx` | Reemplazado por command palette (§28). |
| `src/ui/Toast.tsx` | Duplicado de `src/design-system/primitives/Toast.tsx`. |
| `src/pages/Progress.tsx` | Página de progreso interna, no producto. |
| Rutas/aliases legacy en `App.tsx` | §22 — no redirects a UI legacy como solución. |

## DELETE — tests legacy (§117, actualizar al producto final, no conservar por Playwright)

`src/tests/platform-complete-v3.test.ts`, `tests/platform-v2.test.ts`, `tests/ux-receipts-benefits-portal-v2.2.test.ts`, `tests/receipt-visual-v31.test.ts`, `tests/multisource-integration.test.ts`, `src/tests/phases4to9.test.ts`, `src/tests/phase3-*.test.ts`, `src/tests/final-audit-corrections.test.ts`, `src/tests/responsive-adaptation.test.ts` (asume orden de imports CSS legacy).

## ARCHIVE

Ramas históricas con commits únicos → `git tag archive/*` antes de borrar (ver ENTERPRISE-GIT-CLEANUP-PLAN.md).
`docs/AUDITORIA-*.md`, `docs/FASE*.md`, `docs/PLATAFORMA-V2.md`, `docs/VERSION-3.0.0.md`, `docs/V5-*.md`, `docs/IMPLEMENTATION-NOTES-V3.md` → mover a `docs/archive/` en Milestone V; la verdad viva son los docs `ENTERPRISE-*` (§118).

## Regla

Ningún archivo legacy se conserva "porque compila" (§13). Cada DELETE se ejecuta sólo tras paridad verificada de la pantalla equivalente.
