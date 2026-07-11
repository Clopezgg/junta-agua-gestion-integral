# Recuperaciones, integraciones y descartes

## Recuperado y reconstruido

### Desde FLOWFORGE
- Experiencia de selección de archivo.
- Detección inicial de columnas.
- Vista previa tabular.
- Importación por lote.
- Exportación/organización como patrón conceptual.

### Desde SCA Water
- Separación de operación de mediciones.
- Vista específica de potenciales cortes.
- Agrupación de funciones operativas.

### Desde Cobranzas Agua Potable
- Lectura anterior y actual.
- Consumo calculado.
- Tarifa por rangos.
- Relación socio–medidor–planilla.
- Informe de morosidad orientado al servicio.

### Desde Open Payment Framework
- Resultado normalizado de conectores.
- Separación de configuración pública y secreto.
- Registro de operación, duración y error.
- Idempotencia como requisito de posteo.

### Desde SAP RDP
- Separación de carga, validación y posteo.
- Historial de corrida.
- Estado parcial/fallido y reprocesable.
- Delta como inspiración para lecturas periódicas.

### Desde Fiori Tools y BTP Launchpad
- Navegación por dominios y tareas.
- Mocks separados de producción.
- Diagnóstico visible.
- Configuración por ambiente.

### Desde SAP Devs CLI
- Comparación semántica de versión.
- Caché temporal.
- Diagnóstico `doctor`.
- Estado de actualización y changelog.

## Errores corregidos o prevenidos

- El visor de avance ya no afirma estáticamente que todo está al 100%.
- No se acepta retroceso de medidor como consumo negativo.
- Un lote ya facturado no vuelve a generar obligaciones.
- Las importaciones guardan hash y estado por fila.
- Los homónimos no se crean automáticamente en importación.
- Los candidatos a corte no ejecutan suspensiones.
- Los secretos de GitHub no se exponen al frontend.
- El service worker no intercepta operaciones remotas ni métodos distintos de GET.
- Backup v4 incluye las tablas nuevas.
- Las tarifas por bloques deben ser contiguas y tener un único bloque abierto final.

## Descartado y razón

- `node_modules`, instaladores, EXE/DLL y transportes SAP: generados, binarios o incompatibles.
- Código sin licencia de FLOWFORGE/SCA/Cobranzas: riesgo legal; solo se reconstruyeron conceptos.
- SQL concatenado y credenciales embebidas: inseguro.
- Contraseñas en texto plano: incompatible con Supabase Auth.
- Electron `nodeIntegration:true`: amplía superficie de ataque.
- `localStorage` como contabilidad: no multiusuario ni auditable.
- SAPUI5/CAP/XSUAA/MTA: duplicaría infraestructura sin aportar al objetivo.
- Sesiones de proveedor SAP: requieren contratos y no sustituyen caja/obligaciones.
- Mocks/demos/placeholders: no se trasladaron.
- Botones sin backend: no se consideran funcionalidad.
