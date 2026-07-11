# Auditoría integral y corrección

## Objetivo original reconstruido
Sistema web global para la Junta de Agua con abonados únicos, documentos de identidad, pegues georreferenciados, pagos, morosidad, caja, ingresos, gastos con factura obligatoria, balance, informes transparentes, usuarios individuales, MFA, roles, permisos, auditoría, respaldos e integraciones.

## Problemas críticos encontrados
1. Las migraciones 4 a 8 usaban columnas inexistentes (`permissions.name`, `role_permissions.permission_id`) y una estructura de secuencias incompatible. Una instalación limpia habría fallado.
2. El acceso MFA no permitía enrolar un factor nuevo; solo intentaba verificar uno existente.
3. No existía interfaz ni backend administrativo real para crear usuarios.
4. El pago seleccionaba automáticamente todas las obligaciones del abonado y solo manejaba efectivo.
5. Anulaciones y devoluciones no corregían el libro mayor.
6. La ruta de carga de facturas no cumplía la política de almacenamiento por organización.
7. Las integraciones guardaban un supuesto secreto en JSON de base de datos, contradiciendo la seguridad declarada.
8. Gastos, inventario y órdenes dependían de ventanas `prompt()` y carecían de formularios completos.
9. No existía creación de materiales de inventario.
10. La carga de DNI/pasaporte existía en almacenamiento, pero no estaba conectada a la ficha del abonado.
11. Varias pruebas verificaban presencia de palabras, no coherencia entre esquemas.
12. La página inicial afirmaba que solo estaban activas las fases 1 y 2, contradiciendo la entrega.

## Correcciones realizadas
- Reescritura completa de migraciones 4 a 9 usando el contrato real de las fases 1 a 3.
- Nueva secuencia documental anual para recibos y órdenes.
- Pago transaccional con selección de obligaciones, métodos, referencia y caja.
- Anulación y devolución con contrapartida automática en libro mayor.
- Gastos con MFA, separación de solicitante/aprobador, factura y ruta privada correcta.
- Informes ampliados con detalle de gastos y categorías.
- Integraciones separan configuración pública de secretos del servidor.
- Inventario permite crear materiales y bloquea stock negativo.
- Administración de usuarios mediante Edge Function con service role solo en servidor.
- Enrolamiento y verificación TOTP para usuarios nuevos.
- Carga de documentos de identidad desde la ficha del abonado.
- Formularios reales para pagos, gastos, órdenes e inventario.
- Pruebas estructurales actualizadas para detectar inconsistencias de permisos.

## Estado verificable
- Compilación TypeScript y Vite: aprobada.
- ESLint: 0 errores, 0 advertencias.
- Pruebas: 25/25 aprobadas.
- Auditoría npm de producción: 0 vulnerabilidades.
- Búsqueda de datos demo, mocks y TODO: sin resultados relevantes.

## Límites que permanecen
No se ejecutaron migraciones ni pruebas end-to-end contra una instancia real de Supabase porque no se proporcionó una instancia, credenciales ni URL de despliegue. Por tanto, la base remota, correo de invitación, WhatsApp, OCR, Maps y respaldos externos siguen pendientes de configuración y validación real. El código ya no los presenta como conectados si no lo están.

## Criterio de aceptación pendiente de producción
Antes del uso con dinero real deben completarse: despliegue de migraciones, despliegue de Edge Function, creación del primer administrador, prueba de enrolamiento MFA, prueba de RLS con dos roles, pago y anulación de prueba, cierre de caja, gasto con factura, restauración de respaldo y revisión legal/contable local del formato de recibo.
