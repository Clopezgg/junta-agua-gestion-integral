# V6 — DOMAIN MODEL

> Modelo de dominio conceptual V6. El modelo técnico (tablas) vive en
> `supabase/migrations/` y en DATABASE.md. Este documento es la referencia
> conceptual de negocio.

## Principios de modelado

- PERSONA ≠ ABONADO ≠ USUARIO ≠ MIEMBRO DE JUNTA ≠ PROVEEDOR. Mantener
  separación en el backend. NUNCA mostrar el diagrama de entidades al usuario.
- No crear tabla solo porque existe una pantalla. Primero revisar si el dominio
  ya existe (existing table / existing RPC / existing service).
- Preservar invariantes financieras y de conexiones.

## Modelo mental

### USUARIO / SERVICIO

PERSONA → ABONADO → INMUEBLE/UBICACIÓN → CONTRATO → PEGUE → POLÍTICA/TARIFA →
OBLIGACIÓN → COBRO → PAGO → CAJA/BANCO → RECIBO → CONTABILIDAD → AUDITORÍA

### OPERACIÓN

SISTEMA DE AGUA → FUENTE → RED → ACTIVO → INCIDENTE → ORDEN DE TRABAJO →
TÉCNICO → MATERIALES → COSTO → MANTENIMIENTO → HISTORIAL

### GOBIERNO

ASAMBLEA → JUNTA DIRECTIVA → COMITÉS → REUNIONES → MOCIONES → ACUERDOS →
RESOLUCIONES → TAREAS → PROYECTOS → RENDICIÓN DE CUENTAS

### CUMPLIMIENTO

REQUISITO → PERIODO → RESPONSABLE → EVIDENCIA → REVISIÓN → APROBACIÓN →
PRESENTACIÓN → ARCHIVO

### ATENCIÓN

SOLICITUD/RECLAMO → CLASIFICACIÓN → RESPONSABLE → INVESTIGACIÓN → TRABAJO →
RESOLUCIÓN → NOTIFICACIÓN → CIERRE

## Entidades clave y reglas

### Persona
Registro maestro. Identidad (DNI/cédula), nombre, contacto. Compartida por
abonados, empleados, junta, proveedores. Duplicados detectados por DNI,
nombre aproximado, teléfono.

### Abonado / Servicio / Pegue
- Abonado: persona con servicio(s) contratado(s).
- Pegue/conexión: código seguro (sequence/counter, NO count(*)+1), ubicación,
  contrato, estado, instalación, tipo, medidor opcional, activo relacionado.
- NO duplicar código de conexión activo. Invariante: `unique` activo.
- Error de conflicto debe decir claramente que fue el código de conexión,
  no "duplicate meter" engañoso.

### Inmueble / Ubicación
sector, aldea, referencia, dirección, GPS, tipo, uso, propietario, ocupante,
fotos. Mapa integrado.

### Contrato
número, abonado, ubicación, servicio, inicio, estado, tarifa, condiciones,
documento, firmantes. Contrato ≠ pegue.

### Tarifa / Política (versionada)
concepto, monto, vigencia, fecha vencimiento, mora, beneficios,
resolución/aprobación, estado. Valores actuales (L400 etc.) SON configuración.

### Medición (opcional)
`metering_enabled`. Si FALSE → la tarifa es cuota fija, se oculta lecturas de
la navegación cotidiana, y Field Reading NO genera facturación automática. Si
TRUE → lecturas, consumo, bloques, facturación por consumo.

### Beneficio adulto mayor
UNA fuente de verdad configurable. Política inicial: edad mínima 60, descuento
25%, evidencia DNI. NO duplicar 60/25 en SQL/React. Fecha de elegibilidad
explícita (NO 31 dic automático si contradice cumpleaños/política).

### Mora
Política versionada configurable. Si mora = 0 → UI muestra claramente que no
existe cargo monetario configurado. NO inventar fórmula.

### Pago → Recibo
Atomicidad DB: payment + allocations + cash movement + ledger + financial doc
metadata. Recibo canónico INMUTABLE con snapshot completo (institución,
abonado, identidad enmascarada, conceptos, tarifa, descuento, mora, pago,
medio, cajero, fecha, número, QR/verificación). Reimpresión usa MISMO snapshot.
Storage create-once, NO upsert destructivo. Lifecycle:
PAYMENT_POSTED → RECEIPT_ARTIFACT_PENDING → RECEIPT_READY → RECEIPT_ERROR_RETRYABLE.

### Caja
Apertura (responsable, fecha/hora, fondo). Cierre (esperado, contado,
diferencia, motivo, evidencia). Sesión cerrada = INMUTABLE.

### Conciliación bancaria
Workspace split (Banco | Sistema), matching sugerido, audit trail.

### Convenio
saldo, anticipo, número cuotas, frecuencia, calendario, aprobación, estado,
historial. NO borrar deuda original.

### Compras
Necesidad → Requisición → Cotizaciones → Comparación → Aprobación → Orden →
Recepción → Bodega → Factura → Pago. NO reducir a "proveedor en gasto".

### Bodega
Kardex. Entrada/Salida/Devolución/Ajuste. Salidas vinculadas a orden/proyecto/
responsable. NO stock negativo salvo política.

### Incidente / Orden de trabajo
Tipos: fuga, rotura, bomba, electricidad, contaminación, baja presión,
desabastecimiento, otro. Estados claros, no 15 innecesarios.

### Activos
sistema → fuente → captación → tanque → red/sector → componente.
Mantenimiento preventivo/correctivo.

### Calidad del agua
Muestra + parámetros configurables (nombre, unidad, límite, norma, vigencia).
NO hardcodear límites sanitarios sin fuente. Alerta fuera de rango.

### Junta directiva
Periodo actual, miembros (persona, cargo, inicio, fin, acta elección, estado).
Cargos configurables: Presidente, Vicepresidente, Secretario, Tesorero, Fiscal,
Vocal I, Vocal II. Cargo institucional ≠ rol software.

### Resoluciones
Número correlativo (sequence/counter seguro). Relacionar: tarifa, presupuesto,
compra, proyecto, convenio, política.

### ERSAPS / Cumplimiento
Requisito vinculado a fuente regulatoria versionada
(`regulatory_sources`: nombre, URL/referencia, documento, versión, vigencia,
fecha revisión). NO afirmar "cumple" automáticamente.

### Documentos
Un único Centro Documental. Tipos: Recibo, Estado, Contrato, Convenio,
Factura, Orden, Cotización, Acta, Resolución, Informe, Análisis, Constancia,
Plano, Foto. Versionado. Storage privado.

### Comprobantes
nivel de trazabilidad: número, fecha, persona, identificación, concepto,
valor, medio, referencia, institución financiera, documento relacionado,
responsable, firma/evidencia.

## Roles software

- superadmin, admin, president, secretary, treasurer, auditor/fiscal, member,
  technician.

## Permisos

Granulares, patrón `domain.action`. Enforcement en RLS/RPC, NO solo UI.
AAL2 obligatorio para: usuarios/roles, tarifas, beneficios, reversos, restore,
integraciones sensibles, seguridad.

## Invariantes

- Financieros: no duplicate payment; allocations sum; cash balance; posted
  immutable; reversal formal; receipt unique; idempotency; audit.
- Conexiones: no duplicate active connection code; sequence/counter concurrency
  safe.
- Documentos: private storage; authenticated download; Content-Disposition;
  MIME safe; nosniff; no public financial docs.