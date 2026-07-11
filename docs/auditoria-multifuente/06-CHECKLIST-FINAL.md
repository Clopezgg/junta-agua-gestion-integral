# Lista de comprobación final

## Implementado y verificable por código/CI

- [x] Proyecto principal identificado por arquitectura y seguridad.
- [x] Ocho ZIP recorridos y manifestados.
- [x] Comparación cruzada.
- [x] Importación XLSX/CSV/TSV.
- [x] Hash SHA-256 de archivo.
- [x] Mapeo y vista previa.
- [x] Resultado de importación por fila.
- [x] Control de duplicados y homónimos.
- [x] Lotes de lectura.
- [x] Lectura anterior/actual y consumo.
- [x] Tarifa escalonada versionada.
- [x] Anomalías de retroceso y consumo alto.
- [x] Facturación idempotente.
- [x] Candidatos a corte sin ejecución automática.
- [x] Historial de integraciones.
- [x] Búsqueda de actualizaciones.
- [x] Diagnóstico dinámico.
- [x] PWA shell.
- [x] Backup v4.
- [x] `.env.example` sin secretos.
- [x] Documentación de instalación y despliegue.

## Requiere entorno o credenciales externas

- [ ] Aplicar migraciones 018–025 en el Supabase de producción.
- [ ] Desplegar `check-system-update`, `integration-test` y `backup-manager`.
- [ ] Configurar token GitHub de solo lectura.
- [ ] Probar Resend con dominio verificado.
- [ ] Probar WhatsApp Cloud API con número aprobado.
- [ ] Probar Google Vision con facturación habilitada.
- [ ] Probar Maps con restricciones de dominio.
- [ ] Ejecutar restauración en proyecto de ensayo.
- [ ] Validar reglas legales locales para cortes.
- [ ] Realizar prueba responsive en dispositivos físicos.

## No integrado

- [x] SAP ECC/BTP/Open Payment Framework: incompatibilidad de plataforma y falta de tenant.
- [x] Electron/SQLite y WebForms/MySQL: arquitectura insegura/obsoleta.
- [x] Código sin licencia: no copiado.
- [x] Mocks, placeholders, ejecutables y dependencias vendorizadas: descartados.
