# V6 — USER ACCEPTANCE

> Criterios de aceptación centrados en trabajo real. Se ejecutan ANTES de
> declarar V6 terminado. No es solo Playwright técnico: son pruebas basadas
> en tareas.

## Escenarios (personas)

### Secretario/a
"Registra a María, crea una solicitud de nuevo servicio y déjala lista para
inspección." Medir: pasos, errores, campos, confusión. No UUID. No lenguaje
técnico.

### Tesorero
"Busca un abonado con dos pegues, cobra sus obligaciones con beneficio,
entrega recibo y cierra caja." Debe ser natural.

### Fontanero
Móvil: "Te asignaron una fuga. Encuentra dónde es, inicia trabajo, registra
material, fotos y GPS, y ciérrala."

### Presidente
"Prepara reunión, registra acuerdo, asigna tarea y consulta situación
financiera."

### Fiscal
"Identifica diferencias, anulaciones, gastos sin evidencia y pendientes
regulatorios."

### Abonado
Desde teléfono: "Consulta saldo, descarga último recibo y registra un reclamo."

## Criterios UX (tareas maestras)

- cero UUID visibles;
- cero error técnico;
- cero dead end;
- cero botón falso;
- cero placeholder "próximamente".

Cada acción importante tiene: loading, success, failure, retry.

## Visual QA (Playwright screenshots obligatorios)

Pantallas: login, MFA, setup, inicio, abonados, abonado 360, nuevo servicio,
cobrar, caja, bancos, operación, mapa, orden, Junta, reunión, cumplimiento,
portal. Resoluciones: 1440, 768, 390. Inspeccionar: overflow, alignment,
density, typography, empty states, modal, drawer.

## Test data

Ficticios SOLO en CI/staging/local. NO dataset demo permanente en producción.
Producción: datos reales creados por usuarios.

## Success criteria por rol

### Abonado (expediente)
En segundos: quién es; dónde recibe servicio; cuántos pegues; cuánto debe;
qué pagó; qué recibos; qué solicitudes; qué trabajo; qué documentos.

### Tesorero
cuánto hay en caja; cuánto debería haber; bancos; conciliación; ingresos;
gastos; cartera; presupuesto; documentos faltantes.

### Presidente
qué requiere decisión; próxima reunión; resoluciones; proyectos; finanzas;
cumplimiento; problemas operativos.

### Secretario
agenda; actas; resoluciones; solicitudes; comunicaciones; tareas; informe
anual.

### Fiscal
diferencias; anulaciones; gastos; compras; evidencias; auditoría; morosidad;
cumplimiento.

### Técnico (móvil)
qué trabajo tengo; dónde; qué activo; qué materiales; qué hacer; fotos; GPS;
cerrar orden.

### Portal
saldo; servicios; pagos; recibos; avisos; solicitudes; perfil.

## Accesibilidad y responsive

- WCAG AA objetivo. Keyboard, focus visible, labels, dialog focus trap, aria,
  contraste, reduced motion.
- Certificar 1440 / 1024 / 768 / 390. Sin horizontal overflow. Estrategia
  responsive de tablas (drawer/cards donde aplique).

## Inicio "Mi trabajo" por rol (mismo producto, composición)

SUPERADMIN: visión integral + excepciones.
PRESIDENTE: aprobaciones, Junta, presupuesto, proyectos, cumplimiento.
TESORERO: cobros, caja, bancos, gastos, cartera, conciliación.
SECRETARIO: reuniones, actas, solicitudes, comunicaciones, cumplimiento.
FISCAL: excepciones, auditoría, diferencias, anulaciones, evidencias.
TÉCNICO: órdenes, incidentes, mapa, activos, bodega.
MIEMBRO: información autorizada.

Cada número en el inicio debe ser REAL y con drilldown. NO gráfico decorativo.