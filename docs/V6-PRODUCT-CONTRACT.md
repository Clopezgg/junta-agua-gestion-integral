# V6 — PRODUCT CONTRACT

> Contrato de producto del rebuild V6. Define QUÉ es el producto y QUÉ NO es.

## Identidad del producto

**Junta de Agua Operating System.** Un único sistema donde la institución (Junta
Administradora de Agua) puede gobernar, administrar, cobrar, pagar, controlar,
operar, mantener, atender, documentar, comunicar, auditar, reportar, cumplir y
planificar.

Stack oficial (IMMUTABLE):

- React
- TypeScript
- Vite
- Supabase Auth
- Supabase PostgreSQL
- RLS
- Edge Functions
- Storage
- Render
- PWA

Repositorio: `Clopezgg/junta-agua-gestion-integral`
Rama de producción: `main`
URL producción: `https://junta-agua-gestion-integral.onrender.com`
Referencia ingeniería (READ-ONLY): `Clopezgg/nexora-group`

## Principio fundamental

NO diseñar por módulos. Diseñar por TRABAJO REAL.

- "quiero instalar un nuevo pegue" ≠ "entrar a service_contracts"
- "quiero saber cuánto debe este abonado" ≠ "ver financial_documents"
- "quiero registrar la nueva Junta Directiva" ≠ "crear board_membership"
- "hay una fuga y necesito resolverla" ≠ "abrir operational_incidents"

La interfaz habla el idioma del usuario. El modelo técnico vive debajo.

## Qué NO es V6

- NO es "una versión con más módulos".
- NO es una página por concepto.
- NO es otro sidebar más grande.
- NO es una capa de CSS sobre frontend heredado.
- NO es dashboard de cards + lista de módulos que responden HTTP 200.
- NO expone IDs técnicos (UUID) al usuario.
- NO muestra conceptos del modelo de datos al usuario.
- NO usa producción como laboratorio de diseño.
- NO despliega slices incompletos a main.

## Qué ES V6

ES el producto que debió existir desde el principio. Cuando una secretaria,
tesorero, presidente, fiscal o fontanero lo abra, debe sentir que está operando
la Junta, no navegando una base de datos.

## Criterios de características (PRODUCT CONTRACT)

Cada feature V6 requiere completar TODAS las dimensiones aplicables:

1. DOMAIN — dominio de negocio correcto
2. DB — esquema/migraciones
3. AUTHORIZATION — permisos y RLS
4. SERVICE — lógica de servicio (TS/RPC)
5. UI — interfaz con el nuevo design system
6. AUDIT — trazabilidad
7. TEST — pruebas unitarias/integración
8. UX — flujo humano real, cero UUID, cero dead end
9. RESPONSIVE — 1440 / 1024 / 768 / 390
10. ERROR STATE — loading/success/failure/retry mapeados
11. DOCUMENTATION — actualizada

Si falta una dimensión aplicable → NO está COMPLETE.

## Prohibido declarar COMPLETE si

- existe botón falso;
- hay UUID visible;
- hay mock;
- hay TODO;
- hay "próximamente";
- hay ruta duplicada;
- hay error crudo (PostgREST/JWT/constraint/RPC/UUID);
- no hay mobile;
- no hay permission enforcement;
- no hay test;
- no hay empty/loading/error states;
- no hay backend real;
- la operación no termina de punta a punta.

## Huéspedes de producto (ver V6-PROGRESS)

Criterio: las rutas maestras deben ser: Inicio, Abonados, Tesorería, Operación,
Junta, Cumplimiento. Configuración accesible desde usuario/gear.

## No-hardcode

Prohibido en UI como reglas de código:

- L400
- 25%
- 60 años
- 30 Nov / 1 Dec
- "El Achiotal"
- RTN
- teléfono
- email institucional
- firmantes
- cuentas bancarias

Valores actuales vienen de DB/configuración. El seeding inicial PUEDE crear
valores, la UI SIEMPRE lee configuración.