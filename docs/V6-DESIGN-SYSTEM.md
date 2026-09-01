# V6 — DESIGN SYSTEM

> Sistema de diseño real de Junta de Agua (V6). Sustituye CSS histórico
> apilado (V2/V3/V4/V5).

## Principios

- 90% de la interfaz: blanco / gris / tinta.
- Color solo para: acciones, estado, información.
- NO teal dominante. NO dorado global. NO gradientes grandes.
- NO glassmorphism. NO sombras fuertes. NO cards gigantes.
- NO `rounded 24px` por todas partes. NO emoji como iconos.
- Lucide icons. Tipografía: Inter / Geist / system font equivalente.

## Tokens

```css
--ja-bg: #F6F8FB
--ja-surface: #FFFFFF
--ja-surface-muted: #F2F4F7
--ja-border: #E4E7EC
--ja-border-strong: #D0D5DD

--ja-text: #101828
--ja-text-secondary: #475467
--ja-text-muted: #667085

--ja-navy: #0B1F33
--ja-navy-soft: #173A5E

--ja-primary: #2563EB
--ja-primary-hover: #1D4ED8
--ja-water: #0284C7

--ja-success: #027A48
--ja-warning: #B54708
--ja-danger: #B42318
--ja-info: #175CD3
```

## Primitivas (implementar y usar consistentemente)

Button, IconButton, Input, Textarea, Select, Combobox, SearchInput, Checkbox,
Radio, Switch, Badge, StatusBadge, Tooltip, Popover, Dropdown, Menu, Tabs,
Table, DataGrid, Pagination, Drawer, Dialog, Sheet, Toast, Banner, Skeleton,
EmptyState, ErrorState, Metric, Timeline, ActivityFeed, Breadcrumb, Stepper,
CommandPalette, DatePicker, MoneyInput, FileUploader, DocumentViewer,
EntityPicker, PersonPicker, SubscriberPicker.

NO formularios improvisados.

## Preguntas de cierre de design system

- Estados de carga, vacíos, errores en TODA acción importante.
- Mensajes de error mapeados (nunca PostgREST/JWT/UUID crudo).
- Empty states descriptivos con acción contextual (solo si hay permiso):
  - "No hay órdenes pendientes. Cuando se registre una incidencia o
    mantenimiento, aparecerá aquí."

## Login — REBUILD TOTAL

Eliminar el login tipo landing page (MÁS):
- NO "Plataforma institucional segura"
- NO "Datos privados"
- NO "Cuenta individual"
- NO 3 tarjetas de marketing
- NO panel gigante de color

Diseño:
- fondo claro/neutro
- logo institucional pequeño
- nombre dinámico desde configuración
- card 380–440px, espacio limpio

Texto: nombre de la Junta solo si viene de configuración. Subtítulo:
"Acceso administrativo". Correo, Contraseña, "Iniciar sesión", "Recuperar
acceso", separador discreto "Portal del abonado". Footer: "Acceso exclusivo
para personal autorizado."

NO hardcodear nombre institucional en componente.

## MFA (mínimo)

"Verificación de seguridad" / código 6 dígitos / Verificar.

## Portal del abonado (otro producto)

Shell móvil limpio. Inicio: saldo, estado, pegues, último pago, próximo
vencimiento, avisos. Nav: Inicio, Mi servicio, Pagos, Solicitudes, Perfil.
Permite descargar recibos, estado de cuenta, crear solicitud, ver seguimiento,
actualizar contacto, preferencias. NO editar: nombre, DNI, fecha nacimiento,
tarifa, deuda, pagos, pegue.