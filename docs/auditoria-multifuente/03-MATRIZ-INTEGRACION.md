# Matriz de integración

| Requisito | Estado previo | Fuente de referencia | Implementación elegida | Riesgo | Cambios | Pruebas |
|---|---|---|---|---|---|---|
| Importar XLSX/CSV/TSV | Ausente | FLOWFORGE | Parser nuevo + lotes Supabase | Medio | dependencia `read-excel-file`, tablas de importación | parser, rutas, RLS, build |
| Importar abonados | Manual | FLOWFORGE | mismos esquemas Zod y RPC existentes | Alto | página Importaciones | duplicados, homónimos, resultado por fila |
| Importar lecturas | Ausente | SCA/Cobranzas | lote de lectura + matching por pegue/medidor | Alto | medición + importaciones | errores, rollback, idempotencia |
| Tarifas por consumo | Ausente | Cobranzas | esquema versionado y bloques contiguos | Alto | enums, tablas, RPC | bloques, cálculo, vigencias |
| Lecturas manuales | Ausente | Cobranzas | anterior/actual/consumo, anomalías | Alto | tablas y página Medición | retroceso, alto consumo |
| Facturar consumo | Ausente | Cobranzas | obligación por lectura, `ON CONFLICT` | Crítico | enum source, función de posteo | no duplicación, MFA |
| Candidatos a corte | Ausente | SCA/Cobranzas | consulta sobre deuda vencida | Alto | RPC de solo lectura | días, deuda, conexión activa |
| Historial de integraciones | Parcial | SAP RDP/OPF | tabla `integration_runs` | Medio | migración + Edge Functions | éxito/fallo/duración |
| Buscar actualizaciones | Parcial visual | SAP Devs CLI | GitHub Releases + TTL | Medio | Edge Function + estado | semver, caché, token ausente |
| Diagnóstico | Estático | SAP Devs CLI/Fiori | RPC dinámico + checks cliente | Medio | reemplazo de Avance | RLS, MFA, objetos, PWA |
| PWA | Ausente | shell BTP / prácticas web | manifest + SW de shell | Medio | public + main | no cachear requests remotas |
| Backup de módulos nuevos | v3 | proyecto principal | backup v4 | Crítico | función backup-manager | presencia y restore order |
| Variables de entorno | Documentación dispersa | todas | ejemplos separados | Bajo | `.env.example` | ausencia de secretos |
| Navegación por tareas | Buena | BTP | integrar Medición/Importaciones | Bajo | App/Layout | permisos y rutas |

## Decisiones finales

- **Integrar:** medición, importaciones, historial de integraciones, actualización, diagnóstico, PWA y backup v4.
- **Adaptar:** patrones SAP de reintentos, observabilidad y agrupación por rol.
- **Reconstruir:** toda función proveniente de fuentes sin licencia o con seguridad incompatible.
- **Descartar:** binarios, credenciales, SQL concatenado, localStorage como fuente financiera, mocks, demos y plataformas SAP no contratadas.
