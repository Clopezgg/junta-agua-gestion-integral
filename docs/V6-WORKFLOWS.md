# V6 — WORKFLOWS

> Flujos humanos maestros. La UI debe implementar estos recorridos, no listas
> de entidades.

## Nuevo abonado (wizard humano)

1. Buscar persona existente (detecta duplicados por DNI, nombre aproximado,
   teléfono)
2. Datos personales
3. Contacto
4. Identidad
5. Confirmar

## Nuevo servicio / pegue (wizard + timeline, con borrador y plantilla
simplificada según política)

1. Persona / abonado
2. Ubicación
3. Solicitud
4. Inspección
5. Condiciones
6. Aprobación
7. Contrato
8. Derecho/cobro
9. Orden instalación
10. Materiales
11. Instalación
12. Activación

Mostrar timeline. Guardar borrador. Permitir workflows simplificados según
política.

## Cobrar (POS)

1. Buscar abonado (nombre/DNI/código/pegue/dirección)
2. Mostrar: saldo, obligaciones, beneficios, convenios
3. Seleccionar conceptos
4. Resumen derecho: Subtotal, Descuento, Mora, Ajustes, Total
5. Método: Efectivo/Transferencia/Depósito/Cheque/Mixto
6. Efectivo → Recibido / Cambio
7. CONFIRMAR COBRO (botón principal)
8. Pago confirmado → Recibo # → Imprimir/PDF/WhatsApp/Email/Nuevo cobro

Cero IDs técnicos.

## Caja

Estado actual → Apertura (responsable, fondo) → Movimientos → Arqueo → Cierre
(esperado, contado, diferencia, motivo, evidencia). Sesión cerrada = inmutable.

## Conciliación bancaria (workspace split)

IZQUIERDA: Banco | DERECHA: Sistema. Matching sugerido. Acciones: conciliar,
dividir, excluir, desvincular, investigar. Audit trail.

## Cartera / morosidad

Estados: Al día, Próximo, Vencido, En gestión, Convenio, Suspendible,
Suspendido, Cerrado. Timeline de gestión. NO automatizar suspensión sin
política.

## Compras

Necesidad → Requisición → Cotizaciones → Comparación → Aprobación → Orden →
Recepción → Bodega → Factura → Pago.

## Incidente → Orden de trabajo

Reporte → triaje → orden → ejecución (técnico) → resolución → cierre.
Timeline, comunicación, evidencia.

## Campo (Field PWA)

Mis órdenes → Llegué → Iniciar trabajo → Agregar foto → Agregar material →
Agregar nota → GPS → Finalizar. Offline: órdenes, checklists, notas, fotos
pendientes, lecturas permitidas. NO offline: pagos, caja, tarifas,
aprobaciones financieras.

## Mantenimiento

Preventivo / Correctivo. Plan: activo, actividad, frecuencia, checklist,
responsable, próxima fecha. Puede generar orden.

## Calidad del agua

Muestra (fecha, punto, fuente, responsable, laboratorio, documento,
resultados) + parámetros configurables. Alerta fuera de rango → acción
correctiva.

## Cloración

fecha/hora, punto, responsable, producto, dosis, residual, observación,
evidencia. Tendencias.

## Continuidad / racionamiento

Evento programado/emergencia: inicio, fin, sector, motivo, estado,
comunicación. Portal ve aviso relevante.

## Service desk

Caso: número, tipo, categoría, abonado, pegue, canal, fecha, SLA, responsable,
estado, evidencia, resolución. Timeline. Puede generar incidente, orden o
comunicación.

## Junta directiva

Periodo actual. Miembros con cargo institucional. Junta Directiva nueva = flujo
de registro con acta de elección. Cargo institucional ≠ rol software.

## Asamblea

Convocatoria → Agenda → Asistencia → Quórum → Mociones → Votaciones →
Resoluciones → Acta → Firmas → Anexos.

## Reuniones

Agenda item: tema, responsable, documentos, discusión, decisión, acción.
Generar acta.

## Resoluciones

Número correlativo. Órgano, fecha, tipo, contenido, vigencia, firmantes,
documento. Relacionar con tarifa/presupuesto/compra/proyecto/convenio/política.

## ERSAPS / paquete anual

Checklist/wizard: Estados financieros, Constancia bancaria, Calidad del agua,
Informe de actividades, Fotografías, Datos Junta, Junta Directiva, Usuarios,
Operación, otros configurados. Estados: Incompleto, En revisión, Aprobado
internamente, Presentado, Observado, Aceptado.

## Cierre mensual

Checklist real: cajas cerradas, cobros, reversos, gastos, banco, conciliación,
documentos, inventario, anomalías. Generar snapshot.

## Cierre anual / paquete

Caja, Banco, Cartera, Ingresos, Gastos, Presupuesto, Inventario, Activos,
Calidad, Actividades, Documentos, Cumplimiento. Generar paquete.

## Configuración inicial (setup wizard)

1. Identidad de la Junta
2. Ubicación y contacto
3. Datos legales
4. Junta Directiva
5. Servicio
6. Tarifa vigente
7. Beneficios / mora
8. Caja y bancos
9. Documentos
10. Integraciones opcionales
11. Revisión
12. Activar

Guardar progreso. Permitir omitir datos desconocidos. NO inventarlos.

## Importación

Configuración > Datos > Importar. Wizard: archivo → mapping → validación →
preview → duplicados → commit → resultado.

## Recibo

Pago confirmado → recibo canónico inmutable (snapshot) → imprimir/PDF/
WhatsApp/Email. Reimpresión usa MISMO snapshot. Storage create-once.

## Verificación de recibo (público)

Solo: válido/no válido, número, fecha, monto, estado, identidad enmascarada.
NO: storage path, PII, IDs internos.