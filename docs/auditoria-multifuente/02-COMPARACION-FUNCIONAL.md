# Comparación cruzada de funcionalidades

| Capacidad | Proyecto principal 2.0 | FLOWFORGE | SCA Water | Cobranzas agua | SAP payment | SAP RDP | Fiori/BTP | SAP Devs CLI | Decisión 2.1 |
|---|---|---|---|---|---|---|---|---|---|
| Autenticación y MFA | Completa | Ausente | Login débil | Texto plano | Externa | N/A | XSUAA de muestra | Tokens CLI | Conservar Supabase MFA |
| RLS multiorganización | Completa | Ausente | Ausente | Ausente | No aplicable | SAP | XSUAA/destinos | N/A | Conservar y ampliar |
| Abonados/pegues | Completa | Miembros locales | Usuarios básicos | Socios/medidores | Ausente | Ausente | Demos | Ausente | Conservar |
| Importación de datos | Ausente | Asistente Excel | Placeholder | No estructurada | Postman | Replicación | Mocks | Importadores CLI | Reconstruir XLSX/CSV/TSV |
| Lecturas de medidor | Ausente | Ausente | Placeholder | Implementación antigua | Ausente | Datos delta | Demos | Ausente | Reconstruir |
| Tarifa escalonada | Ausente | Cuotas | Ausente | Sí, insegura | Ausente | Ausente | Ausente | Ausente | Reconstruir versionada |
| Facturación por consumo | Ausente | Lotes locales | Pago simple | Planilla | Sesiones de pago | Delta | Demos | Ausente | Integrar con obligaciones |
| Candidatos a corte | Ausente | Ausente | Vista incompleta | Implícito | Ausente | Ausente | Ausente | Ausente | Calcular por deuda real |
| Pagos y caja | Completa | Local | Parcial | Antigua | Patrones avanzados | Ausente | Demos | Ausente | Conservar; adaptar logs |
| PDF/recibos | Premium | Exportación | Básico | iTextSharp | Proveedor | Ausente | UI | Ausente | Conservar premium |
| Integraciones externas | Completa parcial | Ausente | Localhost | ODBC | Muy amplia SAP | Muy amplia SAP | Destinos SAP | APIs CLI | Añadir historial y diagnóstico |
| Actualizaciones | Release visible | Ausente | Ausente | Ausente | Ausente | Transporte | CI | Checker semver | Edge Function GitHub |
| Backup/restauración | v3 | localStorage | Copia SQLite | Dump informal | N/A | Transporte | Despliegue | Config files | Elevar a v4 |
| PWA | Incompleta | Vite web | Electron | WebForms | Next.js sample | N/A | Launchpad | N/A | Añadir shell instalable |
| CI/pruebas | GitHub Actions | Mínimas | Ausentes | Ausentes | Colecciones | Documentación | Varias muestras | Go tests | Conservar y ampliar |

## Correcciones recuperadas entre versiones

1. **Medición que se perdió o quedó incompleta:** SCA contiene la ruta de importación pero no su ejecución; Cobranzas sí contiene la lógica de consumo. Se reconstruyó sobre Supabase con transacciones, RLS y auditoría.
2. **Importación inteligente:** FLOWFORGE ofrece una experiencia útil, pero no persistencia segura. Se reconstruyó con SHA-256, mapeo, previsualización y resultado por fila.
3. **Integraciones observables:** SAP RDP y Open Payment Framework muestran la importancia de estados, reintentos y errores normalizados. Se añadió `integration_runs`.
4. **Actualización comprobable:** SAP Devs CLI compara releases con caché. Se adaptó a una Edge Function con token de solo lectura para repositorio privado.
5. **Shell por tareas:** BTP Launchpad agrupa aplicaciones por rol. El proyecto conserva una única SPA, pero agrupa navegación por trabajo, servicio, finanzas, operación y administración.

## Incompatibilidades detectadas

- SQLite/MySQL/ODBC frente a PostgreSQL/Supabase.
- Electron con Node integrado frente a navegador seguro.
- SAPUI5/CAP/XSUAA/MTA frente a React/Vite/Supabase/Render.
- Objetos SAP binarios y transportes frente a migraciones SQL.
- Persistencia local frente a base central con RLS.
- Sesiones de pago SAP frente al libro mayor y caja existentes.
- Licencias ausentes en FLOWFORGE, SCA y Cobranzas: no se copió código de esas fuentes.
