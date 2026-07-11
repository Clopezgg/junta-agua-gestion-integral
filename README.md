# Sistema Integral de Junta de Agua

Plataforma privada para administrar abonados, pegues, tarifas, obligaciones, pagos, caja, gastos, presupuesto, activos, mantenimiento, inventario, comunicaciones, auditoría y respaldos.

## Seguridad
- Supabase Auth y MFA TOTP obligatorio.
- Roles y permisos por tarea.
- Row Level Security.
- Escrituras sensibles mediante funciones auditadas.
- Archivos institucionales y documentos en buckets privados.
- Sin datos demo ni acceso simulado.

## Capacidades principales
- Abonados con identidad normalizada, homónimos controlados y múltiples pegues.
- Tarifas versionadas, anualidades, morosidad y estados de cuenta.
- Pagos mixtos, caja, anulaciones, devoluciones y QR de verificación.
- Recibo institucional media carta con logo, firma, sello, marca de impresión y estado PAGADO.
- Identidad histórica inmutable para reimpresiones.
- Gastos con separación de funciones y factura obligatoria.
- Presupuesto anual, saldos iniciales, reservas y presupuesto vs. ejecutado sin doble conteo.
- Activos georreferenciados, órdenes de trabajo y mantenimiento preventivo sin saltos de calendario.
- Inventario vinculado a órdenes.
- Búsqueda universal y dashboard de pendientes por rol.
- WhatsApp, correo, OCR, Google Maps y respaldos mediante integraciones configurables.

## Puesta en marcha
1. Crear un proyecto Supabase exclusivo.
2. Ejecutar las migraciones en orden 001–017.
3. Crear el primer usuario y completar `/setup`.
4. Activar MFA.
5. Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Render.
6. Desplegar las Edge Functions.
7. Cargar logo, firma y sello en Configuración.
8. Ejecutar las pruebas end-to-end antes de usar dinero real.

## Comandos
```bash
npm install
npm run dev
npm run build
npm test
npm run lint
```

## Versión 2.0.0
Las migraciones `202607110014_platform_v2_premium_budget_assets_ux.sql` a `202607110017_preventive_schedule_integrity.sql` incorporan las cinco mejoras mayores, garantizan sus permisos, evitan doble conteo financiero y protegen el calendario preventivo. Consulte `docs/PLATAFORMA-V2.md` y `CHANGELOG.md`.

La aplicación muestra versión, commit y fecha de compilación. Los tags `v*` activan el workflow de GitHub Releases, que valida el tag contra `package.json`, ejecuta pruebas, compila y publica el artefacto.

## Integraciones externas
Las credenciales privadas se configuran como Supabase Secrets. Las claves públicas de mapas se configuran en Render. Nunca coloque `service_role`, tokens de WhatsApp o claves privadas en variables `VITE_`.

## Regla de producción
No operar con datos financieros reales hasta completar migraciones, MFA, RLS con dos roles, pago y reimpresión de prueba, cierre de caja, gasto con factura, presupuesto, orden preventiva, respaldo y restauración controlada.
