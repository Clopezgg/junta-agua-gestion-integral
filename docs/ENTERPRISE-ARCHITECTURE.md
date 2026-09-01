# ENTERPRISE ARCHITECTURE — Junta de Agua Operating System

> Arquitectura objetivo del rebuild. Un mismo senior (§126): mismas convenciones en todo.
> Estado actual vs objetivo, y reglas de capa. Se materializa progresivamente por milestone.

## 1. Principios (referencia NEXORA — principios, no dominio, §2)

- **Domain-driven:** el código se organiza por trabajo humano real, no por tablas (§8).
- **Capas explícitas:** UI compone; la lógica vive en servicios de dominio; los boundaries validan con Zod (§17).
- **Un solo sistema visual:** `src/design-system` es la única fuente (§18). Cero CSS por pantalla.
- **Seguridad en el servidor:** RLS + `security definer` con `search_path` fijo; la UI nunca es la autoridad (§95).
- **Trazabilidad:** toda operación sensible → audit con vista humana (§97).
- **La solución más simple que preserve seguridad, integridad, UX y auditoría (§154).**

## 2. Estructura objetivo (§16)

```
src/
  app/
    router/         # rutas por dominio, sin aliases legacy (§22)
    navigation/     # 6 universos (§21)
    providers/      # Auth, Toast, Org, Permissions
    permissions/    # mapa permiso→capacidad, hooks useCan()
    commands/       # command palette (Ctrl/Cmd+K, §28) + quick create (§29)
  design-system/    # ÚNICA fuente visual (§18-19)
    tokens/ primitives/ patterns/
  layouts/
    AppShell/  AuthShell/  PortalShell/  FieldShell/
  domains/
    identity/ subscribers/ service/ billing/ treasury/ banking/
    procurement/ inventory/ customer-service/ operations/ assets/
    field/ water-quality/ governance/ compliance/ documents/
    communications/ integrations/ administration/ portal/
  shared/
    hooks/ types/ errors/ schemas/ utils/
  pages/            # SOLO composición; sin lógica de negocio en JSX
```

Cada `domains/<x>/` contiene: `api.ts` (consultas Supabase tipadas), `types.ts`
(modelos de dominio), `schemas.ts` (Zod en boundaries), `hooks.ts`, y componentes
específicos del dominio. Las páginas (`src/pages`) sólo ensamblan.

## 3. Estado actual (2026-09-01) vs objetivo

| Capa | Hoy | Acción |
|---|---|---|
| Router | `src/App.tsx` monolítico (170 líneas, ~96 rutas, imports directos) | REBUILD → `src/app/router/*` por dominio (Milestone C) |
| Navegación | `src/layouts/navigation.tsx` (6 universos ✅) | REFACTOR menor (mover a `src/app/navigation`) |
| Shells | `src/layouts/AppShell.tsx` (V6, sólo referenciado por App.tsx) | REFACTOR + añadir `AuthShell`, `PortalShell`, `FieldShell` |
| Design system | `src/design-system/*` (tokens `--ja-*` ✅ = paleta §18; 7 primitivas) | KEEP como base, expandir primitivas + patterns |
| Dominios | `src/features/*` (26 dirs, mayoría 1 archivo — wrappers finos) | MIGRAR a `src/domains/*` por milestone; cada milestone mueve su feature |
| Tipos DB | (ninguno) → **`src/lib/database.types.ts`** generado de la BD real | Nuevo código de dominio importa `Database` y tipa sus consultas (§17) |
| Shared | disperso en `src/lib`, `src/design-system/utils` | Consolidar en `src/shared/*` progresivamente |
| Pages | 57 en `src/pages`, 49 con markup legacy | REBUILD por milestone; aisladas por el gate hasta entonces |
| CSS legacy | 12 archivos (~74KB) en `main.tsx` | AISLADO (gate). Borrado en Milestone V tras paridad |

## 4. Reglas de capa (enforced)

1. **`src/pages/**` no contiene lógica de negocio.** Sólo composición y estado de UI.
   (Se convierte en gate en Milestone F cuando existan páginas de referencia.)
2. **Ninguna pantalla nueva importa CSS legacy ni usa clases legacy.**
   Gate: `scripts/enterprise-gates.mjs` → `checkLegacyCssImports`, `checkLegacyClasses`.
3. **Cero UUID/ID técnico en formularios.** Gate: `checkUuidForms`. Pickers humanos obligatorios (§32).
4. **`import` del design system sólo por el barrel** `src/design-system` (no rutas profundas).
5. **Nav principal ≤ 6 entradas.** Gate: `design-system-v6.test.ts`.
6. **Migraciones:** sólo incrementales desde HEAD real; no una por UI (§132). HEAD: `202609010008`.

## 5. Aislamiento del legacy (Milestone B)

El legacy **no se borra todavía** (§124: sólo tras paridad). Se aísla:

- `docs/legacy-ui-allowlist.txt` — 53 archivos que aún pueden usar clases legacy. **No puede crecer.**
- `docs/legacy-uuid-allowlist.txt` — 2 archivos con UUID en formulario, a corregir en F/O.
- El gate falla si un archivo fuera de las listas incurre en deuda, o si una lista contiene
  una entrada ya saneada (fuerza a quitar entradas conforme avanza el rebuild).

Cada milestone de dominio: reconstruye la pantalla sobre `src/design-system`, la elimina de
la allowlist, y el gate confirma el progreso.

## 6. TypeScript (§17)

- `src/lib/database.types.ts`: tipos generados con `supabase gen types typescript --linked`.
  Regenerar tras cada migración nueva.
- El cliente compartido `supabase` sigue **sin** `createClient<Database>` porque ~10 call
  sites legacy dependen de retornos `Json` laxos. Cada milestone migra sus consultas a
  tipadas y, cuando no queden call sites laxos (Milestone V), se tipa el cliente global.
- Zod en boundaries críticos: pagos, subscribers, banking, governance, backup, portal.
