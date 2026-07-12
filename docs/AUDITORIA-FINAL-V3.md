# Auditoría acumulativa y finalización V3

## Objetivo reconstruido

La plataforma administra de forma privada y auditable la Junta Patronal de Agua Potable El Achiotal: abonados, identidad, fotografía, múltiples pegues, cuota anual, beneficios, pagos, caja, documentos financieros, gastos, presupuesto, activos, órdenes, inventario, comunicaciones configurables, seguridad, auditoría, respaldos y portal del abonado.

## Reglas consolidadas

- Cuota anual ordinaria: L 400 por cada pegue activo.
- Vigencia anual: 1 de enero al 30 de noviembre.
- Mora: inicia el 1 de diciembre; el importe permanece configurable y no se inventa.
- Adulto mayor: desde 60 años cumplidos, 25% sobre la cuota anual ordinaria, aplicado a todos los pegues del titular, con DNI principal registrado.
- No existe micromedición en la operación actual de El Achiotal. El módulo heredado de medición se conserva técnicamente, pero queda fuera de la navegación principal.
- El portal permite modificar únicamente celular, correo, dirección y fotografía.
- Nombre, DNI, fecha de nacimiento, pegues, tarifas, obligaciones, pagos y estados permanecen bloqueados para el abonado.
- El acceso del abonado utiliza DNI como identificador y contraseña obligatoria. Nunca se permite acceso únicamente con DNI.
- El superadministrador no puede ser inactivado, bloqueado o eliminado mediante controles ordinarios.
- Los movimientos contabilizados no se eliminan: se anulan o devuelven mediante documentos relacionados.
- Los códigos de tarifas y servicios son automáticos.
- El QR del recibo abre la verificación digital del mismo documento.
- No se muestra un canal de WhatsApp en el recibo ni en la experiencia de cobro.

## Hallazgos corregidos en la rama V3

1. El módulo de documentos financieros existía, pero no estaba conectado a una ruta ni a la navegación.
2. La ficha visual tenía pestañas y un botón de fotografía sin flujo completo.
3. El portal del abonado tenía tablas y RPC, pero no tenía interfaz, inicio de sesión por DNI ni actualización segura de fotografía.
4. La navegación principal priorizaba medición por consumo, incompatible con la operación anual sin medidores.
5. Pagos utilizaba una interfaz básica y mostraba envío por WhatsApp contrario a la decisión funcional.
6. Apertura y cierre de caja dependían de búsquedas manuales en el DOM.
7. La creación de acceso de portal no tenía una acción administrativa de extremo a extremo.
8. Faltaba bloqueo temporal por intentos fallidos y cambio obligatorio de contraseña temporal.

## Implementación realizada

- Expediente profesional de abonado con fotografía, identidad protegida, edad, beneficio, contacto y tarjetas de pegues.
- Pestañas funcionales de resumen, pagos, documentos y auditoría.
- Captura o carga de fotografía conectada al almacenamiento privado.
- Ficha digital institucional con creación o restablecimiento de acceso.
- Portal público `/portal` y cuenta privada `/mi-cuenta`.
- Inicio mediante DNI y contraseña, bloqueo después de cinco fallos y cambio obligatorio de contraseña temporal.
- Actualización restringida de celular, correo, dirección y fotografía.
- Ruta y navegación de documentos financieros.
- Navegación ajustada a cuota anual y servicios comunitarios.
- Flujo visual de caja, selección de obligaciones, método de pago, resumen y contabilización.
- Acciones compactas con iconos, etiquetas accesibles y tooltips.
- Eliminación del botón de WhatsApp del módulo de pagos.
- Estilos responsive para portal, pagos, fichas, documentos y expedientes.

## Pendientes externos autorizados por el propietario

### Supabase

Se deben aplicar las migraciones 001 a 030 en orden y desplegar las Edge Functions documentadas. Las funciones nuevas no se simulan cuando Supabase no está configurado.

### Render

Se debe desplegar la rama fusionada en `main`, configurar las variables públicas y comprobar el dominio final.

## Datos institucionales todavía pendientes

- RTN.
- Personería jurídica.
- Teléfono institucional.
- Correo institucional.
- Nombre legal completo de Deisy Rivas.
- Logo definitivo.
- Firma definitiva.
- Sello definitivo.
- Escudo oficial de Honduras en archivo autorizado.
- Monto o fórmula de la multa por mora.

Estos datos permanecen configurables; no se sustituyen por información inventada.

## Criterios de aceptación

- Instalación limpia.
- TypeScript sin errores.
- ESLint sin errores.
- Pruebas automatizadas aprobadas.
- Build de producción aprobado.
- Rutas públicas y protegidas compiladas.
- Ningún botón visible sin acción real.
- Ninguna integración externa presentada como exitosa sin credenciales.
- Migraciones y funciones documentadas para ejecución manual.
- Pruebas reales de RLS, MFA, pagos, recibos, portal, backup y restauración después de desplegar Supabase.
