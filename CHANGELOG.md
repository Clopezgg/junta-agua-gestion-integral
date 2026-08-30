# Historial de versiones

## 3.1.1 — Núcleo de integridad financiera y endurecimiento de producción

### Integridad financiera (migración 032)
- Códigos de pegue generados por secuencia segura por abonado (sin `COUNT+1`): `subscriber_connection_sequences` y `next_connection_code`, con códigos existentes incorporados y errores explícitos de duplicado.
- Pagos y gastos idempotentes por `idempotency_key` y bloqueo de asesoría; envíos repetidos devuelven el pago original en lugar de duplicarlo.
- Motor único de beneficios alimentado por `benefit_definitions`: eligibilidad, captura de evidencia y descuentos de adulto mayor centralizados.
- Los descuentos y montos de mora se congelan en el pegue generado; los documentos financieros postean desde el snapshot, eliminando el doble descuento.
- Mora versionada (`late_fee_policies` + `obligations.late_fee_pending`): mientras no haya política, se exhibe como pendiente de configuración sin inventar importes.
- Caja formal con `cash_movements` (apertura, ingresos, devoluciones, anulaciones y diferencias de cierre) trazados por sesión.
- Inmutabilidad en base de datos para documentos financieros, pagos y auditoría; transiciones de estado legales únicamente.
- `document_artifacts`: asociación de PDFs con checksum y rutas irreemplazables.
- `verify_receipt_public` ya no expone rutas internas de almacenamiento.
- Permisos granulares de respaldo (`backups.read_metadata/create/download/restore`).
- El frontend deriva la clave de idempotencia por borrador de pago, sube recibos de forma inmutable (ruta única, sin sobrescritura) y confirma la cuota anual por el motor de tarifas.

### Seguridad
- Errores de contexto tipados (`NETWORK_ERROR`, `AUTH_ERROR`, `ACCOUNT_CONTEXT_NOT_FOUND`): una falla real ya no se confunde con un abonado.
- Rutas `/avance` y `/seguridad` protegidas por permiso.
- Webhook de Meta verifica `X-Hub-Signature-256` (HMAC SHA-256).
- Alta de usuarios idempotente y con MFA obligatorio.

### Despliegue y CI
- `release.yml` separa validación y creación del Release; la validación nunca se omite aunque el tag exista.
- `db-validate.yml` aplica migraciones 001–032 sobre una instancia Supabase real y verifica invariantes estructurales.
- Encabezados de seguridad en `render.yaml` (CSP, HSTS, Permissions-Policy, COOP).
- Service worker versionado por compilación (hash del shell) en lugar de quedar clavado a una versión.
- Documentación operativa actualizada (README, despliegue, checklist y soporte).

## 2.2.0 — Experiencia institucional, recibos y beneficios

### Seguridad y usuarios
- El superadministrador queda protegido en servidor e interfaz y no puede pasar a inactivo o bloqueado.
- Gestión de usuarios con controles visuales por estado, roles y cuenta maestra protegida.
- Login institucional rediseñado con explicación de MFA, privacidad y cuentas individuales.

### Cuota anual y adulto mayor
- Cuota anual predeterminada de L 400 por cada pegue activo.
- Vigencia anual desde el 1 de enero y vencimiento el 30 de noviembre.
- Mora aplicable desde el 1 de diciembre mediante concepto configurable.
- Beneficio automático de adulto mayor desde los 60 años.
- Descuento del 25% sobre la cuota anual de todos los pegues del titular.
- DNI como evidencia requerida y cálculo auditado.

### Recibos y configuración documental
- Plantillas documentales versionadas con estados borrador, activa y retirada.
- Edición de título, ubicación, concepto, textos, fechas, colores, estados, marca de agua, firma, sello, escudo y QR sin tocar código.
- Vista previa institucional con original, reimpresión, pagado y descuento de adulto mayor.
- Modelo de documentos financieros relacionados para factura, recibo, anulación, devolución y ajustes.

### Catálogo de servicios
- Códigos automáticos para tarifas y servicios.
- Catálogo editable para nuevo pegue, reconexión, cambio o reparación de tubería, fuga, mano de obra, materiales, mora y aportes extraordinarios.
- Configuración de cálculo, unidad, valor, aprobación, evidencia y elegibilidad de descuento.

### Ficha y portal
- Datos de ficha digital: fotografía, identidad protegida, pegues, beneficios e historial anual.
- Preparación de solicitudes de actualización limitadas a teléfono, correo, dirección y fotografía.
- Nombre, DNI, códigos, tarifa, estado y finanzas permanecen bloqueados para el abonado.

### Respaldo
- Formato `junta-agua-backup-v5` con beneficios, plantillas, catálogo, documentos financieros y actualizaciones del portal.

## 2.1.0 — Consolidación multifuente

### Medición y facturación
- Lecturas manuales e importadas por lote.
- Tarifas escalonadas por bloques de consumo y cargo fijo.
- Detección de retroceso de medidor y consumo inusualmente alto.
- Facturación idempotente con obligación vinculada a cada lectura.
- Candidatos a corte por antigüedad y deuda real, sin ejecución automática.

### Importaciones
- Lectura de XLSX, CSV y TSV.
- Mapeo de columnas y vista previa.
- Validación con los mismos esquemas del registro manual.
- Control de identidad duplicada y homónimos.
- Historial por lote, SHA-256 y resultado por fila.

### Integraciones y operación
- Historial de ejecuciones con duración, estado y error normalizado.
- Verificador de GitHub Releases con caché y soporte para repositorios privados.
- Diagnóstico dinámico de RLS, MFA, migraciones y conectores.
- PWA instalable con caché de shell, sin almacenar transacciones financieras fuera de línea.
- Respaldo `junta-agua-backup-v4`.

## 2.0.0 — Plataforma institucional

### Recibos
- Formato media carta 5.5 × 8.5 pulgadas.
- Logo, firma y sello institucional configurables mediante archivos privados e inmutables.
- Marca de agua dinámica `IMPRESIÓN` o `REIMPRESIÓN`.
- Sello profesional `PAGADO`, `ANULADO`, `DEVUELTO` o `DEVOLUCIÓN PARCIAL`.
- QR de verificación, detalle de conceptos, cambio, responsable y versión de plantilla.
- Snapshot de identidad documental por pago para conservar el diseño histórico.

### Finanzas
- Presupuesto anual por rubro.
- Saldos iniciales de caja y banco.
- Meta de reserva.
- Presupuesto vs. ejecutado, variación, porcentaje y semáforo.
- Coincidencia contable controlada para evitar doble conteo.
- Aprobación con MFA y auditoría.

### Operaciones
- Catastro de activos con condición, criticidad, costo de reposición y coordenadas GIS.
- Planes de mantenimiento preventivo.
- Generación de órdenes preventivas vencidas sin duplicar ni saltar ciclos abiertos.
- Órdenes vinculadas a activos, costos estimados y reales.
- Historial automático de mantenimiento al completar órdenes.
- Cierre profesional de órdenes sin cuadros nativos del navegador.

### Experiencia
- Búsqueda universal de abonados, recibos, órdenes y activos.
- Panel de pendientes por rol.
- Navegación agrupada y accesos rápidos.
- Versión, commit y fecha de compilación visibles.

### Respaldo
- Formato `junta-agua-backup-v3`.
- Incluye presupuesto, activos, planes, órdenes, historial de mantenimiento e identidad institucional histórica.
- Restauración ordenada por dependencias y checksum SHA-256.

## 1.1.0 — Auditoría final
- Pagos mixtos, devoluciones, caja, configuración institucional, respaldos y auditoría reforzada.
