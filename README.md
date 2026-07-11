# Sistema Integral de Junta de Agua

Aplicación privada para administrar abonados, pegues, identidad, medición, tarifas, obligaciones, pagos, caja, gastos, presupuesto, activos, mantenimiento, inventario, comunicaciones, auditoría, importaciones y respaldos.

## Seguridad

- Supabase Auth y MFA TOTP.
- Roles y permisos por tarea.
- Row Level Security.
- Escrituras sensibles mediante funciones auditadas.
- Buckets privados para documentos.
- Separación de variables públicas y secretos.
- Sin contraseñas propias ni datos demo como funciones reales.

## Capacidades

- Identidad única, control de homónimos y múltiples pegues.
- Importación XLSX, CSV y TSV con mapeo, SHA-256 y resultado por fila.
- Lecturas de medidor manuales o importadas.
- Tarifas por bloques, cargo fijo y versiones históricas.
- Facturación de consumo idempotente.
- Candidatos a corte calculados desde deuda vencida, sin suspensión automática.
- Tarifas fijas/anuales, morosidad y estados de cuenta.
- Pagos mixtos, caja, anulaciones, devoluciones y QR.
- Recibo media carta con logo, firma, sello e identidad histórica.
- Gastos, libro mayor, presupuesto y reservas.
- Activos GIS, órdenes y mantenimiento preventivo.
- Integraciones con historial, diagnóstico y búsqueda de GitHub Releases.
- PWA instalable con caché exclusiva del shell.
- Backup y restauración `junta-agua-backup-v4`.

## Requisitos

- Node.js 22.14.
- Proyecto Supabase.
- Cuenta Render o alojamiento estático compatible.
- Navegador moderno con HTTPS en producción.

## Instalación local

```bash
cp .env.example .env.local
npm install --include=dev --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run dev
```

## Validación

```bash
npm test
npm run lint
npm run build:render
```

## Base de datos

Ejecute las migraciones en orden `001` a `025`. Las nuevas capacidades multifuente corresponden a:

1. `202607110018_metering_enum_extensions.sql`
2. `202607110019_metering_imports_schema.sql`
3. `202607110020_import_functions.sql`
4. `202607110021_tariff_functions.sql`
5. `202607110022_metering_write_functions.sql`
6. `202607110023_metering_posting_functions.sql`
7. `202607110024_integrations_updates.sql`
8. `202607110025_readiness_roles_dashboard.sql`

La migración 018 debe confirmarse antes de ejecutar la 019 porque PostgreSQL debe hacer visibles los nuevos valores de enum.

## Edge Functions

```bash
npx supabase functions deploy admin-create-user
npx supabase functions deploy backup-manager
npx supabase functions deploy integration-test
npx supabase functions deploy check-system-update
npx supabase functions deploy ocr-document
npx supabase functions deploy send-email
npx supabase functions deploy send-whatsapp
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
```

Configure los secretos descritos en `supabase/.env.example`.

## Render

- Branch: `main`
- Build command: `npm install --include=dev --no-audit --no-fund --registry=https://registry.npmjs.org/ && npm run build:render`
- Publish directory: `dist`
- Rewrite: `/*` → `/index.html`

## Auditoría multifuente

La evidencia de los ocho ZIP está en `docs/auditoria-multifuente/`. El resumen verificable está en GitHub; el manifiesto completo de todos los archivos con SHA-256 se incluye en el ZIP final entregado. No se copió código de fuentes sin licencia; sus conceptos útiles fueron reconstruidos de forma compatible.

## Regla de producción

No use datos financieros reales hasta aplicar migraciones, desplegar Edge Functions, activar MFA, verificar RLS con al menos dos roles, probar una lectura y facturación, emitir/reimprimir un recibo, cerrar caja y restaurar un respaldo controlado.
