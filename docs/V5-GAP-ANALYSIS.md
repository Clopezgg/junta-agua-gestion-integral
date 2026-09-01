# V5 — ANÁLISIS DE BRECHA: WATER UTILITY OPERATING SYSTEM

> **Objetivo:** Transformar el producto "Junta de Agua Gestión Integral" en un **sistema operativo financiero, regulatorio, institucional y de campo** para una JAA de Honduras (ORDEN MAESTRA V5). No es una colección de módulos/cards: es un ERP real.
>
> **Base:** `main @ 67754d7` (merge PR #13 — MFA primer admin). Rama de trabajo: `work/junta-agua-v5-operating-system`.
>
> **Principios V5:** no migrar tecnología; no hardcodear montos/fechas/porcentajes en React; no mock data; preservar y endurecer Supabase/RLS/Auth/MFA/Storage/Edge Functions/React/TS/Vite/Render/PWA/auditoría/ledger/idempotencia/tarifas versionadas. Reorganizar la información y navegación por dominio. No afirmar cumplimiento legal solo por pintar pantallas.

---

## 1. CONCLUSIONES EJECUTIVAS

El núcleo actual es **sólido y bien endurecido** en los dominios financieros y de abonado:
61 tablas, 26 enums, 0 vistas (todo por funciones security-definer), 100+ funciones RPC,
RLS org-scoped + MFA (AAL2) en escrituras sensibles, triggers de inmutabilidad,
ledger, idempotencia financiera, tarifas versionadas, beneficios, respaldos, portal.

**Las principales brechas V5 se concentran en dominios hoy inexistentes:**

| Dominio V5 | Estado | Brecha principal |
|---|---|---|
| **GOBIERNO** (Asamblea, Junta, Comités, Reuniones/actas, Resoluciones, Proyectos) | ❌ Ninguna tabla | El mayor hueco: cero tablas de gobierno; la "Junta" es solo un rol de auth |
| **TESORERÍA – Bancos/Conciliación** | ❌ Ninguna tabla | Solo `bank_accounts` + `ledger.account` texto; sin estados de cuenta ni conciliación |
| **COMPRAS / PROVEEDORES / BODEGA** | ⚠️ Parcial | `suppliers`, `expenses` y `inventory_items` delgados; sin PO/RFQ/historial de costos/ubicación |
| **AGUA Y AMBIENTE** (Fuentes, Calidad, Cloración, Continuidad, Microcuenca) | ❌ Ninguna tabla | Solo `asset_type='clorador'`; sin registros de cloro/laboratorio/microcuenca |
| **CUMPLIMIENTO ERSAPS** | ❌ Ninguna tabla | Solo `system_health_checks`; sin registros/indicadores/calendario regulatorio |
| **SOLICITUDES Y RECLAMOS** | ❌ Ninguna tabla | No hay tickets; solo `portal_update_requests` (estrecho) |
| **MOROSIDAD Y CONVENIOS** | ⚠️ Parcial | `late_fee_policies`/`debt_override_events`/`list_cut_candidates`; **sin tablas de convenios/planes de pago** |
| **OPERACIÓN** (Incidencias, Órdenes, Activos, Mantenimiento) | ⚠️ Parcial | `work_orders`/`assets`/`maintenance_plans` existen; falta semántica de "incidencia" y "bodega"/"mapa" integrada vía IA |
| **ABONADO 360 / PERSONA / INMUEBLE / CONTRATO / PEGUE** | ⚠️ Parcial | `subscribers`+`water_connections` (pegue) existen; **falta** `PERSONA` (maestro) separada, registro de INMUEBLE/inmobiliario, y `service_contracts` explícitos |

**La mayor deuda técnica de información arquitectónica V5:** la IA actual tiene **5 grupos**
(Trabajo/Abonados y servicio/Finanzas/Operación/Administración) vs los **8 grupos objetivo**
(INICIO / USUARIOS Y SERVICIO / TESORERÍA / OPERACIÓN / AGUA Y AMBIENTE / GOBIERNO /
CUMPLIMIENTO / ADMINISTRACIÓN), y hay rutas/páginas duplicadas y mal ubicadas (Diagnóstico,
Importaciones, DocumentSettings/ReceiptVisualStudio separados, estados de cuenta dispersos).

---

## 2. INVENTARIO ACTUAL (CURRENT)

### 2.1 Base tecnológica (preservar)
- **Frontend:** React 18 + TS + Vite 8 + react-router-dom 7 SPA; PWA SW versionada (`junta-agua-shell-v<ver>-<sha>`); `jspdf`, `lucide-react`, `recharts`, `zod`, `qrcode`, `read-excel-file`.
- **Backend:** Supabase (Auth + MFA TOTP, Postgres RLS + `security definer`, Storage privado, Edge Functions Deno).
- **Deploy:** Render static (`junta-agua-gestion-integral.onrender.com`), autoDeploy por commit, headers de seguridad + CSP.
- **Migraciones:** 001–035 (`202607110001` … `202608300035`).

### 2.2 Páginas / rutas actuales (`src/pages/` + `src/App.tsx`)
Véase la tabla de brechas §4 para el mapeo dominio→página. Resumen de páginas existentes:
`Home`, `Subscribers`, `SubscriberCards`, `Payments`, `Expenses`, `Budget`, `Reports`,
`Operations`, `Metering`, `Tariffs`, `Accounts`, `FinancialDocuments`, `MapView`,
`Integrations`, `Backups`, `Imports`, `DocumentSettings`, `ReceiptVisualStudio`,
`Security`, `Settings`, `Users`, `Audit`, `Admin`, `Setup`, `Login`, `Mfa`, `Progress`,
`PortalLogin`, `SubscriberPortal`, `VerifyReceipt`.

**Problemas de IA detectados:**
- 5 grupos vs 8 objetivo (Layout.tsx:20-54).
- **Diagnóstico** (`/avance`, `/admin/progreso`, `/admin/readiness`) → debe moverse a Admin>Sistema como "Diagnóstico"; hoy son 3 rutas (2 duplicadas).
- **Importaciones** (`/importaciones`) → debe ir a Administración>Datos>Importar.
- **DocumentSettings** (`/configuracion-documental`) y **ReceiptVisualStudio** (`/estudio-recibo`) son 2 páginas duplicadas en rutas `/x` y `/admin/x` → un solo **Centro de Documentos**.
- **Estados de cuenta** dispersos: `Accounts`, `Tariffs`, `FinancialDocuments` bajo grupos distintos; la caja está mezclada con pagos.
- **Medición** tiene ruta pero no entrada en la nav actual.
- Operación: los 5 submódulos V5 colapsados en un solo `Operations.tsx` con tabs.
- No hay grupos TESORERÍA/OPERACIÓN extendidos/AGUA/GOBIERNO/CUMPLIMIENTO.

### 2.3 Servicios de features (`src/features/*/service.ts`)
`audit, backups, billing, budget, communications, configuration, finance, imports,
integrations, metering, operations, portal, search, settings, subscribers, users`.

### 2.4 Modelo de datos actual (resumen por dominio)
Véase inventario completo en **docs/DATABASE.md** (001–034) y el auditor de esquema. Dominios:
security/multi-tenant, subscribers/identities/water_connections (pegues), tariffs
versionadas/obligations/benefits, payments/cash_sessions/cash_movements/financial_documents/
document_artifacts, expenses/suppliers/bank_accounts/ledger/fiscal_periods/budget,
work_orders/assets/maintenance_plans, inventory_items/inventory_movements,
metering (tariff blocks, batches, readings), imports, integrations/communications/backups.

### 2.5 Roles y permisos actuales
`roles`, `permissions` (códigos `<dominio>.<accion>`), `role_permissions`, `user_roles`,
`get_my_authorization()`, `has_permission()`. Roles: superadmin, admin, secretary, treasurer,
auditor, member, technician. **El rol "Junta Directiva" como cargo institucional NO existe como
registro de PERSONA; solo roles de software.**

### 2.6 Login / MFA / Portal / Setup (V5 §62-63)
- Login (Login.tsx) ya des-hardcodeado de "El Achiotal". `Acceso administrativo` / `Iniciar sesión` / `Recuperar acceso` / `Portal del abonado`.
- MFA (Mfa.tsx): `Segundo factor: verificación de seguridad` / `Introduce el código de 6 dígitos de tu aplicación autenticadora`.
- Setup: bootstrapping primer administrador.
- Portal: `PortalLogin` (DNI+contraseña), `SubscriberPortal` (`/mi-cuenta`), `VerifyReceipt`.
- Flujo pre-bootstrap A–F ya corregido (PR #13).

---

## 3. OBJETIVO V5 (TARGET)

### 3.1 Nueva IA (ORDEN §4) — 8 grupos
1. **INICIO**
2. **USUARIOS Y SERVICIO** — Abonados · Pegues y contratos · Solicitudes y reclamos · Morosidad y convenios · Comunicaciones
3. **TESORERÍA** — Cobrar · Caja · Facturación/obligaciones · Bancos · Gastos · Presupuesto · Compras y proveedores
4. **OPERACIÓN** — Centro operativo · Incidencias · Órdenes de trabajo · Red y activos · Mantenimiento · Bodega · Mapa
5. **AGUA Y AMBIENTE** — Fuentes · Calidad · Cloración · Continuidad/racionamientos · Microcuenca
6. **GOBIERNO** — Asamblea · Junta Directiva · Comités · Reuniones y actas · Resoluciones · Proyectos
7. **CUMPLIMIENTO** — ERSAPS · Calendario · Informe anual · Estados financieros · Transparencia · Auditoría
8. **ADMINISTRACIÓN** — (Usuarios y roles · Configuración · Documentos (Centro de Doc.) · Datos>Importar · Sistema>Diagnóstico · Integraciones · Respaldos · Seguridad · Auditoría)

**Movimientos obligatorios:** Diagnóstico→Admin>Sistema; Importaciones→Admin>Datos>Importar;
DocumentSettings+ReceiptVisualStudio→ un solo Centro de Documentos; Mediciones→Operación o
USUARIOS Y SERVICIO (consumo); Estados de cuenta → TESORERÍA>Facturación/obligaciones.

### 3.2 Modelo de identidad (ORDEN V5)
**PERSONA** (registro maestro) ≠ **ABONADO** ≠ **INMUEBLE**/ubicación de servicio ≠
**CONTRATO** (`service_contracts`) ≠ **PEGUE**. Cargos institucionales
(Presidente/Vice/Presidente/Secretario/Tesorero/Fiscal/Vocal) = registro de gobierno, NO roles de software.

### 3.3 Paleta V5 (ORDEN §64) — nuevo sistema de tokens
INK `#111827`, MIDNIGHT `#102A43`, PRIMARY `#1D4ED8`, WATER `#0284C7`, SURFACE `#F7F9FC`,
CARD `#FFFFFF`, BORDER `#E5E7EB`, TEXT `#111827`, SECONDARY TEXT `#667085`, SUCCESS `#15803D`,
WARNING `#B45309`, DANGER `#B42318`. 90% interfaz blanco/gris/tinta; color solo estado/acción.
No gold como acento global.

### 3.4 Prioridad de negocio (§124) y criterios de éxito por rol (§125-131)
Flujos: encontrar abonado → cobrar → recibo → ver deuda → solicitud → orden → cerrar caja →
gasto → conciliar banco → reunión/resolución → operación → informe. Abonado <10s; tesorero,
presidente, secretario, fiscal, fontanero, abonado con criterios definidos en docs/product.

---

## 4. MATRIZ DE BRECHA POR DOMINIO (CURRENT → TARGET → REUSE/CHANGE/NEW)

### 4.1 DOMINIOS A **NUEVO** (NEW) — sin soporte actual
| Página V5 | Estado | Acción | Notas |
|---|---|---|---|
| **Gobierno: Asamblea** | ❌ FALTA | NEW | Tablas asambleas/asistentes; actas de asamblea; resolución tipo |
| **Gobierno: Junta Directiva** | ❌ FALTA | NEW | Registro de miembros (PERSONA + cargo institucional + período); actas |
| **Gobierno: Comités** | ❌ FALTA | NEW | Comité de agua/alcantarillado/ambiente/control; miembros; funciones |
| **Gobierno: Reuniones y actas** | ❌ FALTA | NEW | meetings + actas (contenido firmado, versionado, aprobación) |
| **Gobierno: Resoluciones** | ❌ FALTA | NEW | resoluciones con número correlativo, tipo, estado, referencias |
| **Gobierno: Proyectos** | ❌ FALTA | NEW | proyectos de obra/mejoras, presupuesto, avance, actas de entrega |
| **Cumplimiento: ERSAPS** | ❌ FALTA | NEW | registros de reportes, indicadores, reglas configurables con fuente |
| **Cumplimiento: Calendario** | ❌ FALTA | NEW | calendario institucional/regulatorio/operativo (fechas, tipo, responsable) |
| **Bancos / Conciliación** | ❌ FALTA | NEW | `bank_accounts` existe; NEW `bank_transactions`/`bank_statements`/conciliación |
| **Solicitudes y reclamos** | ❌ FALTA | NEW | tickets/solicitudes con tipo, estado, SLA, resolución; vincular a abonado |
| **Compras y proveedores** | ⚠️ PARCIAL | NEW (bases) | `suppliers` existe; NEW requisiciones/órdenes de compra/RFQ/historial |
| **Agua: Fuentes** | ❌ FALTA | NEW | fuentes/captaciones/pozos/manantiales con caudal |
| **Agua: Calidad** | ❌ FALTA | NEW | muestras, parámetros, límites, resultados, normativa |
| **Agua: Cloración** | ❌ FALTA | NEW | dosis, puntos, registros de cloro residual |
| **Agua: Continuidad/racionamientos** | ❌ FALTA | NEW | racionamientos/horarios/cortes planificados |
| **Agua: Microcuenca** | ❌ FALTA | NEW | microcuenca/zonas de recarga, monitoreo, acta de protección |
| **Morosidad y convenios** | ⚠️ PARCIAL | CHANGE/NEW | NEW convenios/planes de pago con cuotas; conservar late_fee/cut |
| **Bodega / Inventario** | ⚠️ PARCIAL | CHANGE | `inventory_items/movements` existe; NEW ubicación/bodega, proveedor por entrada, UOM, reorden |

### 4.2 DOMINIOS A **REUSAR/REESTRUCTURAR** (CHANGE / REUSE)
| Página V5 | Estado | Acción | Notas |
|---|---|---|---|
| **Cobrar** (TESORERÍA) | EXISTE (Payments) | CHANGE/REUSE | Reenfocar "Cobrar" como flujo primario tesorero (quick find → cobrar → recibo) |
| **Caja** | EXISTE (cash_sessions) | CHANGE/REUSE | Separar Caja de Pagos en la IA; mover/agrupar en TESORERÍA |
| **Facturación/obligaciones** | EXISTE (Accounts/Tariffs/FinancialDocuments) | CHANGE | Consolidar estados de cuenta/obligaciones bajo TESORERÍA>Facturación |
| **Gastos** | EXISTE | REUSE/CHANGE | Mover a TESORERÍA; integrar con compras |
| **Presupuesto** | EXISTE | REUSE | Presupuesto → TESORERÍA |
| **Órdenes de trabajo** | EXISTE | CHANGE | De `Operations.tsx` tabs → página dedicada; semántica incidencia |
| **Activos / Mantenimiento** | EXISTE | REUSE/CHANGE | Red y activos + mantenimiento como páginas del grupo OPERACIÓN |
| **Mapa** | EXISTE (MapView) | REUSE | Mapa → OPERACIÓN |
| **Abonados (360)** | EXISTE | CHANGE | Ver §4.3 identidad; enriquecer con contratos/inmueble/solicitudes/deuda |
| **Pegues y contratos** | EXISTE (water_connections) | CHANGE | Añadir `service_contracts` + separar PERSONA/ABONADO/INMUEBLE |
| **Comunicaciones** | EXISTE (communication_messages + email/whatsapp) | REUSE | Grupo USUARIOS Y SERVICIO>Comunicaciones |
| **Informes / Transparencia** | EXISTE | CHANGE | Informe anual/transparencia → CUMPLIMIENTO |
| **Auditoría** | EXISTE (Audit) | REUSE | Auditoría → CUMPLIMIENTO (y Admin) |
| **Centro operativo / Home** | EXISTE (Home) | CHANGE | Home = centro operativo con prioridad de negocio |

### 4.3 IDENTIDAD → REFACTOR TIER-1 (CHANGE) — Persona / Abonado / Inmueble / Contrato / Pegue
- **NUEVO** `persons` (maestro de persona: datos personales, contactos).
- **CHANGE** `subscribers` → **abonado** como rol/relación sobre `persons` (o vista/relación), conservando `subscriber_identities`, `organization_sequences`, `subscriber_benefits`.
- **NUEVO** `properties`/`service_locations` (INMUEBLE: catastral, coordenadas, sector) — hoy parcial en `water_connections`.
- **NUEVO** `service_contracts` (CONTRATO: abonado↔inmueble↔tarifa, vigencia, estado).
- **REUSE** `water_connections` = PEGUE (medidor, instalación, servicio), ahora vinculado al contrato.
- Conservar e integridad: `subscriber_connection_sequences`, `duplicate_reviews`, `forbid_delete`, MFA.

### 4.4 Cambios transversales (CHANGE)
- **IA/shell (Layout.tsx + App.tsx + rutas):** 8 grupos objetivo; rutas nuevas; eliminar duplicados; mover Diagnóstico/Importaciones/Documentos.
- **Design tokens V5 (§64):** nueva paleta en `src/styles/tokens.css` (sustituye acento gold).
- **Log in/MFA refinado (§62-63)** ya correcto en gran parte; revisar copy si difiere del objetivo.
- **Regulación:** reglas configurables con fuente/versión; marcar "requiere validación institucional/legal" en ERSAPS/compliance.
- **CENTRO DE DOCUMENTOS:** fusionar `DocumentSettings` + `ReceiptVisualStudio` en una sola sección.

### 4.5 Migraciones nuevas (orientativas, por dominio) — SECCIÓN 7
`036 person/abonado/inmueble/contrato`, `037 solicitudes_reclamos`, `038 convenios_planes_pago`,
`039 compras_proveedores_requisiciones`, `040 banco_conciliacion`, `041 bodega_inventario`,
`042 gobierno(asamblea_junta_comites_reuniones_actas_resoluciones_proyectos)`,
`043 agua(fuentes_calidad_cloracion_continuidad_microcuenca)`, `044 cumplimiento_ersaps_calendario`.

> Regla: **detectar automáticamente la última migración** (no asumir 035); numerar nuevas después de la última; no reescribir históricas; idempotentes; validar en Supabase local CI. Actualizar DATABASE.md/ARCHITECTURE.md/EVIDENCE-MATRIX/README con el nuevo rango.

---

## 5. DOCUMENTACIÓN REQUERIDA (docs/product/*) — NEW
`DOMAIN-MODEL.md`, `CUSTOMER-LIFECYCLE.md`, `BILLING-COLLECTIONS.md`, `TREASURY.md`,
`PROCUREMENT.md`, `GOVERNANCE.md`, `OPERATIONS.md`, `WATER-QUALITY.md`,
`COMPLIANCE-ERSAPS.md`, `PORTAL.md`, `ROLE-HANDBOOK.md`. Además `docs/V5-PROGRESS.md`.

---

## 6. PLAN DE EJECUCIÓN (vertical slices por dominio) — NUEVA RAMA
1. **FASE 0 (esta):** auditoría + `V5-GAP-ANALYSIS.md` + rama `work/junta-agua-v5-operating-system`.
2. **FASE 1 – IA y shell V5:** Layout 8 grupos, rutas, centro de documentos, paleta de tokens, home=centro operativo. (REUSE/CHANGE)
3. **FASE 2 – Identidad:** persons/abonado/inmueble/contrato/pegue (migración 036 + RPC + UI 360).
4. **FASE 3 – Solicitudes y reclamos** (037).
5. **FASE 4 – Morosidad y convenios** (038).
6. **FASE 5 – Tesorería/Caja/Cobrar/Facturación** (reuso + consistencia; nueva UI de flujo).
7. **FASE 6 – Compras y proveedores** (039).
8. **FASE 7 – Bancos y conciliación** (040).
9. **FASE 8 – Bodega/inventario** (041).
10. **FASE 9 – Gobierno** (042): asamblea, junta, comités, reuniones/actas, resoluciones, proyectos, cargos institucionales.
11. **FASE 10 – Agua y ambiente** (043): fuentes, calidad, cloración, continuidad, microcuenca.
12. **FASE 11 – Cumplimiento** (044): ERSAPS + calendario + informe anual/transparencia.
13. **FASE 12 – Integración, tests, CI, docs, PR maestro a main, merge, deploy, verificación.**

>Cada fase es un vertical slice (DB→RPC→RLS→UI→tests→migración→CI) con commit por dominio.
>Un PR maestro al final. CI valida `validate.yml` + `db-validate.yml` (supabase start 001..NN) + `e2e.yml`.

---

## 7. REGLAS DE VERIFICACIÓN V5
- Las migraciones nuevas deben pasar `supabase start` en `db-validate.yml` (extender el rango de "001..034" según lo que cambie, vía detección automática).
- Playwright `smoke.spec.ts` exige H1 exactos y placeholders; **SI la nueva IA cambia esos H1, actualizar los tests y los placeholders de forma coordinada** (e.g. `Abonados y pegues`, `Presupuesto y sostenibilidad financiera`, `Pagos, recibos y contabilización`).
- Vitest: mantener assertions estáticas por dominio; actualizar las que referencian texto/placeholders que cambien.
- 0 ghost RPCs: cada `rpc('...')` del frontend debe existir (se comprueba en `phase-g-real-rpcs.test.ts`).
- No hardcodear en React montos/fechas/porcentajes institucionales; leer de configuraciones/versiones/resoluciones.

---

## 8. RIESGOS / BLOQUEOS POTENCIALES
- **Datos institucionales reales** (miembros de Junta, resoluciones, convenios, parámetros de calidad, proveedores): no se inventan; se diseña la estructura y se deja la captura. Formato BLOQUEO si se necesita un dato real.
- **Reglas legales (ERSAPS / Ley Marco APS / Reglamento JAA / Manual Contable y de Tarifas):** se modelan como configuración con fuente/versión; sin afirmar cumplimiento legal por UI.
- **Test count/CI:** la base actual fija "001..034"/"19 archivos/106 pruebas"; al sumar migraciones 036+ y páginas nuevas habrá que actualizar tests/README/EVIDENCE-MATRIX.
- **No validación E2E local:** Docker/Supabase no instalados localmente → validar vía CI en el PR a main.

---

*Documento de planificación V5. El detalle de esquema actual completo está en `docs/DATABASE.md`; la arquitectura en `docs/ARCHITECTURE.md`.*
