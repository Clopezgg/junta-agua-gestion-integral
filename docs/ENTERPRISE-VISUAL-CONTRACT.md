# ENTERPRISE VISUAL CONTRACT — Junta de Agua Operating System

> **Fuente de verdad visual.** No hay imágenes de referencia; esta especificación
> textual las sustituye por completo. Todo milestone de UI desde ahora la respeta.
> Complementa (no reemplaza) `ENTERPRISE-ARCHITECTURE.md` y la orden Enterprise Rebuild.

## 0. Principio

Un solo producto, una sola identidad — **varios lenguajes de experiencia según el trabajo**.
`LOGIN ≠ PORTAL ≠ ADMIN ≠ TESORERÍA ≠ OPERACIÓN ≠ JUNTA ≠ CONFIGURACIÓN`.
Comparten tokens, componentes e iconografía; **no** comparten el mismo layout funcional.

## 1. Tres lenguajes de experiencia

| Ref | Lenguaje | Cubre |
|---|---|---|
| **A** | Login administrativo — corporativo clásico, premium, sobrio, mucho aire, fondo muy claro | Login · MFA · Recuperación · Setup/Onboarding |
| **B** | Consulta privada del abonado — encabezado navy, proceso guiado por pasos, gran card blanca, mobile-first, **sin contraseña** | Portal del abonado (DNI → foto → nacimiento → consulta read-only) |
| **C** | Water Utility Command Center — **el mapa ES el producto** (70-75% ancho), tema oscuro, alta densidad, control room | Operación · GIS · Incidentes · Órdenes · Activos · Mantenimiento · Field · Fuentes · Calidad · Cloración · Continuidad · Microcuenca |

## 2. Paleta (tokens `--ja-*`)

| Rol | Valor |
|---|---|
| navy-950 / 900 / 800 | `#071B31` · `#0B2745` · `#103A63` |
| primary | `#155EEF` / `#2563EB` |
| water | `#0EA5E9` · teal accent técnico (escaso) `#0891B2` |
| bg / surface / muted / border | `#F6F8FB` · `#FFFFFF` · `#F2F4F7` · `#E4E7EC` |
| text / secondary / text-muted | `#101828` · `#475467` · `#667085` |
| success / warning / danger / info | `#067647` · `#B54708` · `#B42318` · `#175CD3` |
| command center | fondos `#07111D` `#0A1725` `#112234`; red por estado: azul órdenes · cyan red · verde activos · amber alertas · rojo crítico |

Prohibido: teal/gold dominante, gradientes decorativos, dark mode global del ERP.

## 3. Tipografía

Inter / Geist. Jerarquía muy consistente, sin títulos enormes, sin *marketing typography*.
Page title 28–32px · Section 18–22px · Body 14–16px · Data 13–14px · Metadata/tables 12–14px.

## 4. Densidad por experiencia

`LOGIN` baja · `PORTAL` baja-media · `ADMIN` media-alta · `TESORERÍA` alta · `OPERACIONES` muy alta · `FIELD` media touch-first.

## 5. Patrones del design system a crear (`src/design-system`)

No otro design system, no CSS por pantalla. Añadir: `AuthFrame` · `PortalVerificationFlow` ·
`OperationsMapShell` · `WorkspaceHeader` · `MasterDetail` · `MetricStrip` · `ActivityTimeline` ·
`EntityDrawer` · `OperationalSidebar` · `MapLayerControl` · `StatusQueue` · `SettingsShell`.

## 6. A — Login administrativo

- Fondo muy claro. Composición ambiental de agua/naturaleza **solo** como fondo secundario discreto; **nunca** stock empresarial (manos, call centers, laptops, rascacielos); fallback sin foto obligatorio.
- Logo centrado → nombre oficial (DB) → subtítulo "Gestión integral".
- Card centrada ~400–440px, mucho aire, bordes finos, radios discretos, sombra muy suave.
- `Acceso administrativo` / "Ingrese sus credenciales para continuar." / Correo / Contraseña ("mostrar") / `☐ Recordarme` · `¿Olvidó su contraseña?` / `→ Iniciar sesión` / divisor "o acceda con" / `Portal del abonado`.
- Zona discreta bajo la card: `Seguro · Confiable · Eficiente` (sin marketing, sin claims falsos — no "cifrado extremo a extremo" sin evidencia).
- Footer: "Acceso exclusivo para personal autorizado."
- **Móvil 390px:** logo + nombre + card + footer, centrado.
- **Sigue password + MFA TOTP.** Solo el portal elimina contraseña.
- **PROHIBIDO:** panel lateral de marketing, gradiente azul gigante, hero, múltiples cards, dark mode, teal/gold dominante.

## 7. B — Portal (consulta privada, sin contraseña)

**Flujo:** DNI → fotografía en tiempo real → fecha de nacimiento → consulta read-only.

- Encabezado navy/agua ~30–35% de alto: logo + nombre; luego título "Consulta privada de su ficha y pagos" + descripción.
- Stepper `① DNI ─ ② Fotografía ─ ③ Fecha de nacimiento`.
- Gran card blanca flotante ~700–850px máx desktop; mobile-first excelente a 390px.
- **DNI:** ej. `0801-1990-12345` · normalización server-side · **no** revelar si existe · errores genéricos · `Cancelar` / `Continuar →` · card compacta "¿Cómo funciona?".
- **Foto:** cámara real (no file upload primario) · "Activar cámara" → preview → "Tomar fotografía" → `Repetir` / `Usar fotografía` · móvil cámara frontal.
- **Nacimiento:** `DD/MM/AAAA` · comparación server-side · respuesta genérica única: "No fue posible verificar la identidad con los datos proporcionados."
- **Biometría — NO FINGIR:** `IdentityVerificationProvider` con `face_match` / `manual_review` / `reference_photo_verification`. Sin engine real → `OPTIONAL_NOT_CONFIGURED_FACE_MATCH`, construir toda la arquitectura/UI/session/rate-limits/tests igual. Nunca OCR para fingir facial. Nunca volver a contraseña.
- **Sesión privada temporal** tras verificación: token corto, expira, RLS/server-side, lee **solo su propia** información, sin privilegios admin, sin exposición cross-subscriber.
- **READ-ONLY.** Consultar: ficha, DNI enmascarado, contacto, dirección, pegues, contratos, estado, obligaciones, saldo, pagos, recibos (+ descarga PDF inmutable), beneficios, avisos de su servicio. **No** editar nada, ni crear usuarios, ni service desk.
- **PortalShell** propio: header "Junta de Agua / Consulta privada" + nombre + código; nav `Inicio · Mi ficha · Mis pegues · Estado de cuenta · Pagos · Recibos`; arriba: saldo, estado, pegues, último pago, próximo vencimiento. **No** sidebar admin, **no** tablas de backoffice. Bottom nav móvil.

## 8. C — Operación / Command Center

- Topbar claro; workspace: **~70–75% MAPA · ~25–30% panel derecho**.
- Mapa **tema oscuro** (`#07111D`/`#0A1725`/`#112234`), solo capas con datos reales; no inventar red (arquitectura preparada para `network segments`).
- Control de capas flotante izq: `Red de agua · Pegues · Incidentes · Órdenes · Tanques · Fuentes · Sectores` — solo activables con datos; guardar preferencia.
- Click en incidente → drawer/popover oscuro (`IN-00023` / descripción / sector / "Afecta: N abonados" / prioridad / `Ver detalle` → orden, comunicación, afectados, activo).
- Panel derecho "Resumen operativo": incidentes activos + críticos · órdenes en proceso + urgentes · órdenes hoy · personal en campo · sectores afectados (reales).
- Debajo del mapa (alta densidad): tabla **Incidentes activos** (`ID·Tipo·Ubicación·Afectados·Prioridad·Estado·Asignado`) · resumen **Órdenes** + "Ver todas" · **Actividad reciente** (timeline; si es polling → "actualización automática", no "tiempo real") · **Activos críticos** con estado real.
- **Responsive:** desktop map+sidebar+panels · tablet map + bottom detail sheet · móvil full-screen map + bottom sheet.

## 9. Shell administrativo

Sidebar navy profundo, ancho contenido, **6 universos** (`Inicio · Abonados · Tesorería · Operación · Junta · Cumplimiento`) + Configuración abajo. Topbar clara: búsqueda global · `+ Crear` · notificaciones · avatar. Contenido sobre `#F6F8FB`. Nunca 30 módulos.

## 10. Home ejecutivo

Responde "¿qué tengo que atender hoy?". **No** copia el command center, **no** es cuadrícula de 12 tarjetas. Header compacto ("Buenos días, <usuario>" + fecha) → **REQUIERE ATENCIÓN** → **PANORAMA** (caja, cobros, cartera, órdenes, presupuesto) → actividad reciente → acciones rápidas. Solo datos reales.

## 11. Abonados / Abonado 360

- **Directorio** = CIS/CRM empresarial. Toolbar (buscar + filtros + `Nuevo abonado`) → tabla `Código·Abonado·Ubicación·Pegues·Saldo·Estado·Último pago`. Click → drawer preview. Enter/abrir → 360. Empty state compacto.
- **360** = expediente empresarial. Header compacto (← Volver · nombre · código · estado · DNI enmascarado · acciones), tabs (`Resumen·Servicio·Cuenta·Pagos·Solicitudes·Trabajo·Documentos·Historial`). **No hero, no card soup.** Summary blocks + data tables + timeline + documents.

## 12. Tesorería

Banking backoffice. **Cobro** = POS 3 columnas (`ABONADO·CONCEPTOS·RESUMEN`) + stepper `Buscar → Seleccionar → Pago → Confirmar`, métodos visibles, "Confirmar cobro". **Caja** workspace separado. **Bancos** reconciliation workspace. **Cartera** data queue. No dashboard genérico.

## 13. Junta

Board-management software. **Reunión:** agenda izq · contenido central · tareas/acciones der. **Actas** document-oriented. **Junta Directiva:** periodos + miembros. Sin UUID, sin cards gigantes.

## 14. Cumplimiento

Compliance software. Tabla `Obligación·Periodo·Fecha límite·Estado·Responsable·Evidencia`. Calendar/deadline view. Documentos. ERSAPS. Sin marketing visual.

## 15. Configuración

Enterprise settings. Sidebar local (`General·Identidad·Servicio·Tarifas·Documentos·Usuarios·Roles·Integraciones·Seguridad·Backup`) + contenido a la derecha. Uploads compactos — **no** tres upload cards gigantes.

## 16. Reglas visuales absolutas

**PROHIBIDO:** `module-hero` legacy · card soup · glassmorphism · gradientes decorativos ·
border-radius gigantes · SaaS landing · emojis · colores arbitrarios entre módulos ·
UUID visible · errores crudos · claims de marketing/IA/biometría/tiempo-real sin evidencia ·
exceso de espacio vacío · dark mode en todo el ERP.

**OBLIGATORIO:** datos y acción primero · densidad adecuada · jerarquía · respuesta rápida ·
teclado · WCAG AA · tablet · móvil · profesionalismo institucional.

## 17. Validación

Ninguna pantalla se declara terminada solo por JSX: abrirla en navegador, screenshot a
**1440 / 768 / 390**, comparar contra este contrato. Si vuelve a parecer V3/V5 → **FAIL**.
Skills: `impeccable`, `emil-design-eng`, `brainstorming`, `test-driven-development`,
`verification-before-completion`, `claude-in-chrome`.

## 18. Visual Gap Review — A–G

Clasificación `PASS` / `MINOR_ALIGNMENT` / `MAJOR_ALIGNMENT`. Corregir solo divergencias;
no destruir backend funcional. (Tabla viva en `ENTERPRISE-REBUILD-STATE.md`.)

| Pantalla | Estado | Notas |
|---|---|---|
| Login | **PASS** | Recordarme + ¿Olvidó su contraseña? + "o acceda con" + zona Seguro/Confiable/Eficiente + fondo agua sutil + botón navy. Screenshots 1440/390 OK. |
| MFA | **MINOR** → hecho | + enlace "Volver". Misma familia visual que login. |
| Setup | _pendiente review_ | |
| Inicio | _pendiente review_ | |
| Abonados (lista) | _pendiente review_ | añadir drawer preview al click |
| Abonado 360 | _pendiente review_ | separar pestaña "Solicitudes" de "Atención" |
| Nuevo Servicio | _pendiente review_ | |
| Cobro (POS) | _pendiente review_ | |
| Caja | _pendiente review_ | |
