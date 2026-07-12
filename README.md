# Sistema Integral de Junta de Agua

Aplicación privada para administrar abonados, pegues, identidad, cuotas anuales, beneficios, tarifas, obligaciones, pagos, caja, gastos, presupuesto, activos, mantenimiento, inventario, documentos, comunicaciones, auditoría, importaciones y respaldos.

## Seguridad

- Supabase Auth y MFA TOTP.
- Roles y permisos por tarea.
- Row Level Security.
- Escrituras sensibles mediante funciones auditadas.
- Superadministrador protegido contra inactivación o bloqueo.
- Buckets privados para documentos.
- Separación de variables públicas y secretos.
- Sin contraseñas propias ni datos demo como funciones reales.

## Capacidades

- Identidad única, control de homónimos y múltiples pegues.
- Cuota anual predeterminada de L 400 por pegue.
- Descuento automático del 25% para titulares desde los 60 años con DNI.
- Vigencia anual hasta el 30 de noviembre y mora desde el 1 de diciembre.
- Plantillas de recibo versionadas y configurables sin modificar código.
- Catálogo de nuevo pegue, reconexión, cambio de tubería, reparaciones, materiales, mora y aportes.
- Importación XLSX, CSV y TSV con mapeo, SHA-256 y resultado por fila.
- Lecturas de medidor manuales o importadas para organizaciones que sí utilicen medición.
- Tarifas por bloques, cargo fijo y versiones históricas.
- Candidatos a corte calculados desde deuda vencida, sin suspensión automática.
- Pagos mixtos, caja, anulaciones, devoluciones y QR.
- Recibo media carta con logo, firma, sello e identidad histórica.
- Gastos, libro mayor, presupuesto y reservas.
- Activos GIS, órdenes y mantenimiento preventivo.
- Ficha digital del abonado y preparación de portal con campos editables limitados.
- Integraciones con historial, diagnóstico y búsqueda de GitHub Releases.
- PWA instalable con caché exclusiva del shell.
- Backup y restauración `junta-agua-backup-v5`.

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

Ejecute las migraciones en orden `001` a `026`.

Las capacidades multifuente corresponden a:

1. `202607110018_metering_enum_extensions.sql`
2. `202607110019_metering_imports_schema.sql`
3. `202607110020_import_functions.sql`
4. `202607110021_tariff_functions.sql`
5. `202607110022_metering_write_functions.sql`
6. `202607110023_metering_posting_functions.sql`
7. `202607110024_integrations_updates.sql`
8. `202607110025_readiness_roles_dashboard.sql`

La experiencia institucional y documental corresponde a:

9. `202607110026_annual_service_receipts_benefits_portal.sql`

La migración 018 debe confirmarse antes de ejecutar la 019 porque PostgreSQL debe hacer visibles los nuevos valores de enum. La migración 026 debe ejecutarse después de todas las anteriores.

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

Después de aplicar la migración 026, vuelva a desplegar `backup-manager` para activar el formato v5.

Configure los secretos descritos en `supabase/.env.example`.

## Render

- Branch: `main`
- Build command: `npm install --include=dev --no-audit --no-fund --registry=https://registry.npmjs.org/ && npm run build:render`
- Publish directory: `dist`
- Rewrite: `/*` → `/index.html`

## Configuración inicial de versión 2.2

1. Ejecute la migración 026.
2. Despliegue nuevamente `backup-manager`.
3. Abra **Documentos y recibos**.
4. Complete RTN, personería jurídica, teléfono, correo y nombre legal de la secretaria cuando estén disponibles.
5. Cargue logo, firma y sello desde Configuración.
6. Revise la vista previa y active una versión de plantilla con MFA.
7. Confirme la tarifa anual de L 400.
8. Verifique fecha de nacimiento y DNI de los beneficiarios de adulto mayor.
9. Pruebe un abonado con varios pegues y confirme el descuento sobre todos.
10. Genere, pague, reimprima y anule documentos de prueba antes de usar información real.

## Regla de producción

No use datos financieros reales hasta aplicar migraciones, desplegar Edge Functions, activar MFA, verificar RLS con al menos dos roles, probar la cuota anual y el descuento de adulto mayor, emitir/reimprimir un recibo, cerrar caja y restaurar un respaldo controlado.
