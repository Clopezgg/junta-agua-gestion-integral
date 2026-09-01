# V6 — MIGRATION MAP

> Mapa de paridad y estrategia de migración de experiencia V4/V5 → V6.

## Regla de paridad

Antes de eliminar una página/feature V4/V5: mapear capacidad existente → nueva
experiencia V6. Si la capacidad funciona y no tiene equivalente V6 validado →
NO borrarla. Después de equivalencia validada: retirar ruta antigua, retirar
CSS antiguo, retirar componente antiguo. NO Frankenstein final.

## Mapa de paridad (V5 → V6)

| Capacidad V5 (página/ruta) | Equivalente V6 |
| --- | --- |
| Home (dashboard) | /inicio · "Mi trabajo" por rol |
| Centro operativo / Operations | /operacion (workspace) |
| Subscribers | /abonados · LIST PAGE profesional |
| Abonado360 | /abonados/:id · 360 real con tabs |
| Fichas digitales (SubscriberCards) | drawer rápido dentro de Abonados |
| PeguesContratos | dominio de pegue/contrato dentro de Abonado 360 / nuevo servicio |
| Solicitudes | Service Desk (cola de trabajo + dentro de Abonado 360) |
| Morosidad | Cartera workspace (Tesorería) |
| Comunicaciones | Centro de comunicación contextual |
| Metering | oculto si metering_enabled=false; si true, dentro de Tesorería/Operación |
| Pagos | /tesoreria/cobrar · POS |
| Caja | /tesoreria/caja |
| Estados de cuenta / Bancos | /tesoreria/bancos + conciliación |
| Gastos | /tesoreria/gastos |
| Presupuesto | /tesoreria/presupuesto |
| Compras | /tesoreria/compras (+ proveedores) |
| FinancialDocuments | Centro Documental |
| Tarifas | Configuración > Tarifas (políticas versionadas) |
| Intidencias | /operacion/incidentes/:id |
| Ordenes de trabajo | /operacion/ordenes/:id |
| Activos | /operacion/activos/:id |
| Mantenimiento | Mantenimiento dentro de Operación |
| Bodega | /operacion/bodega |
| Lecturas de campo | Field PWA (mantener 051; no auto-factura si metering off) |
| MapView | /operacion/mapa · GIS workspace |
| Fuentes / Calidad / Cloración / Continuidad / Microcuenca | tabs contextuales dentro de Operación |
| Asamblea / JuntaDirectiva / Comites / Reuniones / Resoluciones / Proyectos | /junta workspace |
| Ersaps | /cumplimiento/ersaps |
| Informes / Transparencia | /cumplimiento + reportes contextuales |
| Audit | Seguridad/Auditoría (detalles colapsables) |
| Admin / Users / Security / Backups / Integrations / Settings | /configuracion/* |
| Imports | Configuración > Datos > Importar |
| Progress / Avance | System Health (admin) |
| DocumentSettings / ReceiptVisualStudio | Centro Documental + plantillas |
| VerifyReceipt | /verificar/recibo/:token (validator público mínimo) |

## Estrategia de base de datos

- NO tocar migraciones aplicadas (001–051).
- Nueva migración para V6: 052+ (solo si 051 sigue siendo HEAD).
- Fresh DB debe aplicar 001 → HEAD. CI debe probarlo.
- Antes de NEW: revisar existing table / existing RPC / existing service.
- Preservar datos reales. NINGUNA migración V6 destruye abonados, pagos,
  obligaciones, recibos, usuarios, auditoría, documentos, operación.
- Backfill explícito cuando haga falta.

## Producción durante el build

- NO aplicar cada migración V6 a producción mientras se desarrolla.
- Probar migraciones en CI/local/staging. Si no hay staging Cloud gratuito:
  usar CI Postgres/Supabase local compatible. NO crear proyecto pagado.
- Producción Cloud se actualiza SOLO en release final.

## V6-PROGRESS

Ver `docs/V6-PROGRESS.md` para el estado por feature (EXPERIENCE, DOMAIN, DB,
RLS, SERVICE, UI, UX, TEST, E2E, RESPONSIVE, PROD, EVIDENCE).