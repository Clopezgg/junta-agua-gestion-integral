# Sistema Integral de Junta de Agua

Aplicación privada para administrar abonados, pegues, identidad, cuotas anuales, beneficios, tarifas, obligaciones, pagos, caja, gastos, presupuesto, activos, mantenimiento, inventario, documentos, comunicaciones, auditoría, importaciones y respaldos.

## Seguridad

- Supabase Auth y MFA TOTP.
- Roles y permisos por tarea (RBAC granular, incluidos respaldos).
- Row Level Security.
- Escrituras sensibles mediante funciones auditadas `security definer`.
- Inmutabilidad en base de datos de documentos financieros, pagos y auditoría.
- Verificación de firma `X-Hub-Signature-256` en el webhook de Meta.
- Idempotencia por clave en pagos y gastos; alta de usuarios sin duplicados.
- Pagos, documentos y auditoría solo se registran mediante funciones; no hay
  escrituras directas desde el cliente.
- Superadministrador protegido contra inactivación o bloqueo.
- Buckets privados para documentos.
- Separación de variables públicas y secretos.
- Sin contraseñas propias ni datos demo como funciones reales.

## Capacidades

- Identidad única, control de homónimos y múltiples pegues.
- Códigos de pegue emitidos por secuencia segura por abonado (sin `COUNT+1`).
- Cuota anual por pegue determinada por el motor único de tarifas (versiones y
  catálogo de servicios), sin montos fijos en el código.
- Descuento automático del 25% para titulares desde los 60 años con DNI,
  evaluado por un motor único de beneficios con captura de la evidencia.
- Los descuentos se congelan en el pegue generado (snapshot) y se aplican a los
  documentos financieros sin doble descuento.
- Vigencia anual hasta el 30 de noviembre y mora desde el 1 de diciembre;
  el monto de mora se administra por políticas versionadas y, mientras no exista
  configuración, se exhibe como pendant sin inventar importes.
- Plantillas de recibo versionadas y configurables sin modificar código.
- Catálogo de nuevo pegue, reconexión, cambio de tubería, reparaciones, materiales, mora y aportes.
- Importación XLSX, CSV y TSV con mapeo, SHA-256 y resultado por fila.
- Lecturas de medidor manuales o importadas para organizaciones que sí utilicen medición.
- Tarifas por bloques, cargo fijo y versiones históricas.
- Candidatos a corte calculados desde deuda vencida, sin suspensión automática.
- Pagos mixtos, caja formal con movimientos, anulaciones, devoluciones y QR.
- Cierre de caja con registro de diferencias y trazabilidad por sesión.
- Recibo media carta con logo, firma, sello e identidad histórica.
- Gastos, libro mayor, presupuesto y reservas.
- Activos GIS, órdenes y mantenimiento preventivo.
- Ficha digital del abonado y preparación de portal con campos editables limitados.
- Integraciones con historial, diagnóstico y búsqueda de GitHub Releases.
- PWA instalable: caché exclusiva del shell, versionada por compilación.
- Backup y restauración `junta-agua-backup-v5`.
- Validación automática de la base de datos en CI sobre una instancia Supabase
  real (migraciones 001–033 desde cero).

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
git diff --check
```

En CI además se valida la base de datos sobre una instancia Supabase real
(`.github/workflows/db-validate.yml`): aplica las migraciones 001–033 desde cero
y verifica los invariantes de integridad (`supabase/tests/db_integrity.sql`).

## Base de datos

Ejecute las migraciones en orden `001` a `033` (la 032 es el núcleo de
integridad financiera y la 033 fija los invariantes del modelo, la corrección
auditada de abonados/pegues y la protección contra fuerza bruta; ambas deben
aplicarse después de todas las anteriores):

1. `001`–`011`: seguridad, abonados, tarifas/obligaciones, pagos, gastos/balance y
   funciones de escritura auditadas.
2. `012`–`017`: caja con `cash_movements`, roles por defecto, registros de metering,
   permisos públicos, auditoría, respaldo y correcciones finales.
3. `018`–`025`: capacidades multifuente (medición, importaciones, tarifas,
   integraciones y actualizaciones).
4. `026`: recibos anuales institucionales, beneficios de adulto mayor y portal.
5. `027`–`029`: tarjeta segura del abonado, gestión de activos/órdenes y
   emisión/reversión de documentos financieros con `register_payment_with_document`.
6. `030`–`031`: atomicidad certificado en un solo RPC y correcciones de preparación
   productiva (snapshot de descuentos, vencimiento fijo al 30 de noviembre).
7. `032` (`erp_financial_integrity_core`): secuencias seguras por abonado,
   idempotencia de pagos y gastos, motor único de beneficios, mora versionada,
   caja con movimientos formales, artefactos documentales inmutables, bloqueo de
   escrituras directas e `verify_receipt_public` sin exponer rutas internas.

La migración 018 debe confirmarse antes de ejecutar la 019 porque PostgreSQL debe
hacer visibles los nuevos valores de enum. La 026 y la 032 deben ejecutarse
después de todas las anteriores.

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

El webhook de Meta verifica la firma `X-Hub-Signature-256` con el secreto
`WHATSAPP_APP_SECRET`; la suscripción requiere `WHATSAPP_VERIFY_TOKEN`.
`admin-create-user` es idempotente: un correo ya invitado devuelve el usuario
existente sin duplicar perfil, rol ni auditoría.

Configure los secretos descritos en `supabase/.env.example`. La sintaxis y los
tipos de todas las funciones edge se comprueban en CI con Deno
(`db-validate.yml`).

## Render

- Branch: `main`
- Build command: `npm ci --include=dev --no-audit --no-fund --registry=https://registry.npmjs.org/ && npm run build:render`
- Publish directory: `dist`
- Rewrite: `/*` → `/index.html`
- Encabezados de seguridad incluidos en `render.yaml`: CSP, HSTS,
  `Permissions-Policy`, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy` y `Cross-Origin-Opener-Policy`.
- Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_GOOGLE_MAPS_API_KEY` y `VITE_GOOGLE_MAPS_MAP_ID`.

## Configuración inicial

1. Ejecute las migraciones en orden hasta la `032`.
2. Despliegue las Edge Functions y configure los secretos.
3. Abra **Documentos y recibos**.
4. Complete RTN, personería jurídica, teléfono, correo y nombre legal de la secretaria cuando estén disponibles.
5. Cargue logo, firma y sello desde Configuración.
6. Revise la vista previa y active una versión de plantilla con MFA.
7. Confirme la tarifa anual vigente desde el motor de tarifas (catálogo de servicios anuale).
8. Configure la política de mora vigente si cobra recargos por tardanza.
9. Verifique fecha de nacimiento y DNI de los beneficiarios de adulto mayor.
10. Pruebe un abonado con varios pegues y confirme el descuento sobre todos.
11. Genere, pague, reimprima y anule documentos de prueba antes de usar información real.
12. Cierre una caja de prueba y restaure un respaldo controlado.

## Regla de producción

No use datos financieros reales hasta aplicar migraciones, desplegar Edge Functions, activar MFA, verificar RLS con al menos dos roles, probar la cuota anual y el descuento de adulto mayor, emitir/reimprimir un recibo, cerrar caja y restaurar un respaldo controlado.
