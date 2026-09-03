# Design System — Junta de Agua Operating System

**Fuente única de verdad visual.** Toda pantalla reconstruida se compone exclusivamente con
esto. Prohibido crear CSS nuevo por pantalla o reusar clases legacy (`module-hero`, `titlebar`,
`panel`, `cards`) — el gate `scripts/enterprise-gates.mjs` lo impide.

## Estructura

| Ruta | Contenido |
|---|---|
| `tokens.css` | **Única** paleta/espaciado/tipografía. Prefijo `--ja-*`. Cargado en `main.tsx`. |
| `system.css` | Clases utilitarias del sistema (`.ja-btn`, `.ja-control`, `.ja-field`…). |
| `shell.css` | Estilos de `AppShell` / navegación. |
| `auth.css` | Estilos de `AuthShell` (login, MFA, setup, recuperación). |
| `primitives/` | Componentes React base. Importar vía `src/design-system/index.ts`. |
| `utils.ts` | `cn`, `formatMoney` (Lempiras), `formatDate`, `maskIdentity`, `initials`. |
| `hooks.ts` | `useOnClickOutside`, `useEsc`. |

## Uso

```tsx
import { Button, Field, StatusBadge, formatMoney } from '../design-system';
```

## Estética (§18)

Corporativa, institucional, sobria, densa, funcional. **No**: glassmorphism, gradientes
grandes, hero decorativo, rounded 24px, cards enormes, emojis, estética marketing SaaS.
Iconos: `lucide-react`. Tipografía: Inter.

## Primitivas disponibles hoy

`Button`, `IconButton`, form controls (`Field`, `Input`, `Select`, `Textarea`), `Feedback`
(`Banner`, `EmptyState`, `ErrorState`, `Skeleton`), `Overlay` (`Dialog`, `Drawer`),
`Toast`, `Navigation`, `Table`.

## Primitivas por construir (§19 — se añaden en su milestone)

`Combobox`, `SearchInput`, `Switch`, `Tooltip`, `Popover`, `Tabs`, `DataGrid`, `Pagination`,
`ConfirmDialog`, `Stepper`, `CommandPalette`, `DatePicker`, `MoneyInput`, `FileUploader`,
`DocumentViewer`, `Timeline`, `AuditTrail`, `Metric`, y los pickers humanos
(`SubscriberPicker`, `PersonPicker`, `ConnectionPicker`, `SupplierPicker`, `AssetPicker`,
`UserPicker`) que reemplazan todo input de UUID (§32).

## Patrones de experiencia (§20)

Cada pantalla pertenece a exactamente un patrón: `LIST`, `DETAIL/360`, `WORKSPACE`,
`TRANSACTION`, `QUEUE`, `MAP`, `SETTINGS`, `REPORT`.
