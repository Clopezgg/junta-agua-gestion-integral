# V6 — INFORMATION ARCHITECTURE

> Navegación, rutas y estructura de experiencias V6.

## Navegación principal — MÁXIMO

INICIO · ABONADOS · TESORERÍA · OPERACIÓN · JUNTA · CUMPLIMIENTO

CONFIGURACIÓN se accede desde usuario/gear. NO convertir subdominios en links
permanentes del sidebar. El sidebar no muestra 40 entradas.

## Rutas maestras (objetivo)

### Públicas / auth
- `/login`
- `/portal`
- `/mi-cuenta`
- `/mfa`
- `/setup`
- `/verificar-recibo/:token`

### Inicio
- `/inicio` (mi trabajo, por rol)

### Abonados
- `/abonados`
- `/abonados/:id` (360)
- `/abonados/nuevo-servicio`

### Tesorería
- `/tesoreria`
- `/tesoreria/cobrar`
- `/tesoreria/caja`
- `/tesoreria/bancos`
- `/tesoreria/gastos`
- `/tesoreria/compras`
- `/tesoreria/presupuesto`
- `/tesoreria/cierres`

### Operación
- `/operacion`
- `/operacion/mapa`
- `/operacion/incidentes/:id`
- `/operacion/ordenes/:id`
- `/operacion/activos/:id`
- `/operacion/bodega`

### Junta
- `/junta`
- `/junta/reuniones/:id`
- `/junta/asambleas/:id`
- `/junta/resoluciones/:id`
- `/junta/proyectos/:id`

### Cumplimiento
- `/cumplimiento`
- `/cumplimiento/ersaps`
- `/cumplimiento/calidad`
- `/cumplimiento/informe-anual`

### Satélites
- `/configuracion/*`
- `/portal/*`
- `/verificar/*`

Las rutas secundarias pueden variar. NO explotar en 60 opciones visibles.

## Patrones de página (SÓLO estos)

- LIST PAGE
- DETAIL / 360 PAGE
- WORKSPACE
- TRANSACTION PAGE
- QUEUE
- MAP WORKSPACE
- SETTINGS PAGE
- REPORT PAGE

NO: hero + cards + panel + tabla en todas las rutas.

## Shell desktop

- AppShell nuevo con Sidebar sobrio y colapsable.
- Topbar: búsqueda global, crear, notificaciones, ayuda, usuario.
- Contenido: espaciado 24px desktop. Sin max-width estrecho artificial para
  tablas.

## Búsqueda global

Cmd+K / Ctrl+K. Buscar por: nombre, DNI, código abonado, número pegue,
dirección, recibo, pago, orden, incidente, activo, proveedor, factura, acta,
resolución, reclamo, proyecto, documento. Resultado: tipo, nombre, contexto,
estado. Respeta permisos. NO exponer PII sin autorización.

## Quick Create

Botón "+ Crear". Según permisos: nuevo abonado, nuevo servicio, cobro,
solicitud, incidente, orden, gasto, compra, reunión, muestra, proyecto.
Una acción primaria global.

## Mobile

Bottom nav (por rol):
- General: Inicio · Buscar · Trabajo · Mapa · Más
- Técnico: Mis órdenes · Incidentes · Mapa · Activos · Bodega · Lecturas ·
  Calidad
- Tesorero: Cobrar · Caja · Buscar · Pendientes · Más

Mobile NO es sidebar comprimido.

## Estructura de código

```
src/
  app/
    routes/
    navigation/
    providers/
    permissions/
  design-system/
    tokens/
    primitives/
    patterns/
  layouts/
    AppShell
    Sidebar
    Topbar
    MobileNav
    QuickCreate
  domains/
    subscribers/
    service/
    billing/
    treasury/
    customer-service/
    operations/
    assets/
    inventory/
    procurement/
    water-quality/
    governance/
    compliance/
    documents/
    communications/
    administration/
    portal/
  services/
  hooks/
  types/
  utils/
```

`pages/` SOLO compone experiencias. NO lógica enorme dentro de páginas.
NO páginas de 800–1500 líneas. NO `Record<string, any>` como arquitectura.
Tipos Supabase + Zod en límites críticos.