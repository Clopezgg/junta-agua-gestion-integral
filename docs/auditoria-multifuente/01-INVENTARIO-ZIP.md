# Inventario individual de los ZIP auditados

La auditoría recorrió **todos los archivos** de los ocho ZIP. El resumen verificable está en `ZIP-SUMMARY.md`. El detalle completo por ruta, tamaño, CRC32 y SHA-256 se incluye en el ZIP final como `ZIP-FILE-MANIFEST.csv`, junto con el resumen JSON original.

## Proyecto principal seleccionado

La base elegida es `Clopezgg/junta-agua-gestion-integral`, versión 2.0.0 al iniciar la auditoría. La selección no se basó en el nombre ni el tamaño: es la única fuente con React/TypeScript moderno, Supabase Auth, MFA, RLS, auditoría, migraciones ordenadas, buckets privados, funciones serverless, CI, Render, pagos transaccionales, presupuesto, activos y respaldo restaurable. Los ZIP se trataron como fuentes de ideas, implementaciones parciales y patrones comparativos.

## 1. FLOWFORGE-main(1).zip

- **Archivos:** 21.
- **Tamaño descomprimido:** 167 KB aproximadamente.
- **Stack:** React, Vite, TypeScript, Tailwind, almacenamiento local, importación/exportación tabular.
- **Licencia encontrada:** ninguna licencia formal dentro del ZIP. El README menciona MIT, pero sin archivo de licencia no se trasladó código.
- **Funciones útiles observadas:** asistente de importación, previsualización de hojas, agrupación territorial, búsqueda/paginación, libro auxiliar por miembro, facturación masiva y exportación.
- **Estado real:** prototipo local sin backend, autenticación, RLS ni persistencia multiusuario.
- **Riesgos:** `localStorage` como fuente de verdad, pagos eliminables, lógica no auditable, dependencia antigua de hojas de cálculo, datos de demostración.
- **Decisión:** **reconstruir conceptos**, no copiar código. Se incorporó importación segura XLSX/CSV/TSV, historial por lote, mapeo y resultado por fila.

## 2. sap-rdp-integration-accelerator-main(1).zip

- **Archivos:** 77.
- **Tamaño descomprimido:** 32.3 MB.
- **Stack:** objetos de transporte SAP, ABAP y documentación de Replication Data Pipeline.
- **Licencia:** Apache-2.0.
- **Funciones útiles observadas:** carga inicial, deltas, secuencia de ejecución, reintentos, reproceso y diagnóstico de integraciones.
- **Estado real:** acelerador específico para SAP ECC/BTP; requiere infraestructura SAP y objetos binarios de transporte.
- **Riesgos:** incompatibilidad total de runtime con React/Supabase; no es una aplicación de junta de agua.
- **Decisión:** **adaptar patrones**. Se añadió historial de ejecuciones, estados normalizados, duración, mensajes de error y trazabilidad de conectores.

## 3. SCA-water-control-system-administration--master(1).zip

- **Archivos:** 1,534, gran parte `node_modules` vendorizado.
- **Tamaño descomprimido:** 13.36 MB.
- **Stack:** React CRA/Electron, Express y SQLite.
- **Licencia del proyecto:** no encontrada; las licencias halladas pertenecen a dependencias vendorizadas.
- **Funciones útiles observadas:** menú operativo, generación de pagos, estado de usuarios, vista de corte, intención de importar mediciones.
- **Estado real:** proyecto en desarrollo; varias vistas son placeholders o listados sin la lógica anunciada.
- **Riesgos críticos:** SQL construido por concatenación, CORS abierto, `nodeIntegration:true`, localhost rígido, ausencia de RLS y seguridad multiusuario.
- **Decisión:** **descartar código y reconstruir funciones**. Se implementó medición real, lotes, anomalías y candidatos a corte calculados desde obligaciones vencidas.

## 4. open-payment-framework-integration-main(1).zip

- **Archivos:** 466.
- **Tamaño descomprimido:** 47.15 MB.
- **Stack:** ejemplos de Open Payment Framework, Postman, Next.js, SAP Commerce.
- **Licencia:** Apache-2.0.
- **Funciones útiles observadas:** sesión de pago neutral al proveedor, estados de autorización, callback, reintentos, taxonomía de errores y separación entre configuración pública/privada.
- **Estado real:** muestras dependientes de productos y cuentas SAP; no sustituyen el flujo contable del proyecto.
- **Riesgos:** ejemplos con logging excesivo y ejecución dinámica; proveedores externos no contratados.
- **Decisión:** **adaptar arquitectura, no el producto SAP**. El sistema conserva sus pagos Supabase y adopta historial de ejecuciones, respuestas normalizadas y errores visibles.

## 5. cobranzas_agua_potable-master(1).zip

- **Archivos:** 76.
- **Tamaño descomprimido:** 17.73 MB.
- **Stack:** ASP.NET WebForms, C#, MySQL/ODBC, iTextSharp y binarios Windows.
- **Licencia:** no encontrada.
- **Funciones útiles observadas:** socios, asignación de medidor, planilla de consumo, tarifas por rangos, PDF, Excel e inactivos.
- **Estado real:** aplicación antigua de escritorio/web con esquema básico.
- **Riesgos críticos:** credenciales y contraseñas en texto plano, SQL injection, rutas absolutas, binarios no auditables, sin migraciones ni separación de organizaciones.
- **Decisión:** **reconstrucción independiente**. Se incorporaron lecturas, tarifa escalonada versionada, obligación por consumo y lista segura de candidatos a corte.

## 6. fiori-tools-samples-main(1).zip

- **Archivos:** 760.
- **Tamaño descomprimido:** 27.09 MB.
- **Stack:** SAPUI5/Fiori Elements, CAP/OData, múltiples aplicaciones de muestra.
- **Licencia:** Apache-2.0.
- **Funciones útiles observadas:** interfaz guiada por metadatos, i18n, separación de mocks, pruebas y despliegues por ambiente.
- **Estado real:** colección educativa, no un producto único; contiene numerosos mocks y demos.
- **Riesgos:** adoptar SAPUI5/CAP duplicaría el stack y rompería React/Supabase.
- **Decisión:** **descartar integración directa**. Se retuvieron los principios de diagnóstico, separación de configuración y navegación por tareas.

## 7. btp-launchpad-ui-samples-main(1).zip

- **Archivos:** 633.
- **Tamaño descomprimido:** 8.33 MB.
- **Stack:** SAP BTP Launchpad, MTA, XSUAA, destinos y aplicaciones SAPUI5.
- **Licencia:** Apache-2.0.
- **Funciones útiles observadas:** agrupación por roles, mosaicos por tarea, separación de destinos y shell de múltiples aplicaciones.
- **Estado real:** muestras para Cloud Foundry/BTP.
- **Riesgos:** dependencia de XSUAA, destinos SAP y despliegues MTA incompatibles.
- **Decisión:** **adaptar experiencia**. Se reforzó navegación por dominio, módulos de medición/importación y diagnóstico por rol.

## 8. sap-devs-cli-main(1).zip

- **Archivos:** 572.
- **Tamaño descomprimido:** 8.99 MB.
- **Stack:** Go CLI, documentación y frontend auxiliar.
- **Licencia:** Apache-2.0.
- **Funciones útiles observadas:** comprobación de nuevas versiones, comparación semántica, caché con TTL, changelog, comandos de diagnóstico y prioridad segura de credenciales.
- **Estado real:** CLI para desarrolladores SAP, incompatible como módulo directo.
- **Riesgos:** binario y almacenamiento de credenciales no aplicables al navegador.
- **Decisión:** **reconstruir patrón**. Se creó un verificador de GitHub Releases en Edge Function, caché configurable, historial y diagnóstico dinámico.

## Conclusión del inventario

Ningún ZIP supera al proyecto principal como plataforma completa. Dos ZIP contienen funciones de negocio hídrico valiosas, pero presentan riesgos que impiden reutilizar su código. Los repositorios SAP aportan patrones maduros de integración, lanzamiento y diagnóstico; se adaptaron sin introducir SAP como dependencia.
