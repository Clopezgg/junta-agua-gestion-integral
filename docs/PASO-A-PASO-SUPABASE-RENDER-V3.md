# Paso a paso final: Supabase y Render

Esta guía comienza cuando la rama V3 ya fue fusionada en `main`.

## A. Supabase

### 1. Respaldar antes de migrar

1. Abra el proyecto Supabase correcto.
2. Entre a **Database → Backups**.
3. Confirme que existe un respaldo reciente o genere uno según su plan.
4. No ejecute migraciones en un proyecto que contenga datos reales sin respaldo.

### 2. Aplicar migraciones

Ejecute todos los archivos de `supabase/migrations` en orden ascendente. Para una instalación que ya tiene 001–025, aplique solamente:

1. `202607110026_annual_service_receipts_benefits_portal.sql`
2. `202607110027_subscriber_card_secure_portal.sql`
3. `202607110028_financial_document_posting_reversal.sql`
4. `202607110029_secure_subscriber_portal_access.sql`

No cambie el orden. Cada archivo debe terminar sin error antes de continuar.

### 3. Verificar tablas y funciones

En **SQL Editor**, confirme:

```sql
select to_regclass('public.benefit_definitions');
select to_regclass('public.subscriber_benefits');
select to_regclass('public.service_catalog');
select to_regclass('public.document_template_versions');
select to_regclass('public.financial_documents');
select to_regclass('public.subscriber_portal_accounts');
```

Todos deben devolver el nombre de la tabla, no `null`.

Confirme las funciones:

```sql
select to_regprocedure('public.sync_senior_benefit(uuid,date)');
select to_regprocedure('public.calculate_annual_charge(uuid,integer,numeric)');
select to_regprocedure('public.get_my_subscriber_card()');
select to_regprocedure('public.update_my_subscriber_profile(jsonb)');
select to_regprocedure('public.post_payment_financial_document(uuid)');
select to_regprocedure('public.reverse_financial_document(uuid,text,text)');
select to_regprocedure('public.get_my_portal_account_state()');
```

### 4. Crear buckets privados

En **Storage**, confirme que existen y son privados:

- `subscriber-documents`
- `receipt-documents`
- `expense-evidence`
- `organization-assets`
- `backup-archives`

No convierta estos buckets en públicos.

### 5. Desplegar Edge Functions

Desde una terminal con Supabase CLI autenticado:

```bash
npx supabase link --project-ref SU_PROJECT_REF
npx supabase functions deploy admin-create-user
npx supabase functions deploy admin-create-subscriber-portal
npx supabase functions deploy subscriber-portal-login --no-verify-jwt
npx supabase functions deploy subscriber-portal-profile
npx supabase functions deploy backup-manager
npx supabase functions deploy integration-test
npx supabase functions deploy check-system-update
npx supabase functions deploy ocr-document
npx supabase functions deploy send-email
```

`subscriber-portal-login` acepta una solicitud sin sesión porque valida DNI y contraseña dentro de la función. Las demás funciones deben conservar verificación JWT.

No despliegue `send-whatsapp` ni muestre WhatsApp en el recibo mientras esa integración no forme parte del alcance operativo aprobado.

### 6. Secretos de funciones

Supabase proporciona internamente:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Configure solamente los secretos externos que realmente utilizará:

```bash
npx supabase secrets set RESEND_API_KEY=VALOR_REAL
npx supabase secrets set EMAIL_FROM=correo@dominio-real
npx supabase secrets set GITHUB_TOKEN=TOKEN_REAL
npx supabase secrets set GITHUB_REPOSITORY=Clopezgg/junta-agua-gestion-integral
```

No coloque `SUPABASE_SERVICE_ROLE_KEY` en Render ni en variables `VITE_*`.

### 7. Configurar autenticación

En **Authentication → URL Configuration**:

- Site URL: dominio final de Render.
- Redirect URLs: agregue el dominio final y rutas necesarias.

En **Authentication → Providers → Email**:

- Mantenga email/password habilitado para usuarios internos.
- Las cuentas del portal se crean administrativamente y usan DNI como identificador visible más contraseña.

### 8. Crear o revisar el primer administrador

1. Inicie sesión con la cuenta interna.
2. Complete MFA TOTP.
3. Abra **Usuarios**.
4. Confirme que la cuenta superadministradora aparece como **Siempre activo**.
5. Intente inactivarla desde otra cuenta autorizada: el servidor debe rechazarlo.

### 9. Cargar identidad institucional

En **Configuración** y **Documentos y recibos**, cargue:

- Logo definitivo.
- Escudo oficial de Honduras autorizado.
- Firma definitiva de la secretaria.
- Sello institucional.
- RTN.
- Personería jurídica.
- Teléfono.
- Correo.
- Nombre legal completo de Deisy Rivas.
- Texto legal definitivo.
- Monto o fórmula de multa por mora.

No deje valores `PENDIENTE` antes de emitir documentos oficiales.

### 10. Activar plantillas

1. Abra **Documentos y recibos**.
2. Revise la vista previa.
3. Guarde una nueva versión.
4. Active la versión con MFA.
5. Verifique por separado:
   - Factura anual.
   - Recibo de pago.
   - Nota de crédito.
   - Anulación.
   - Devolución.

### 11. Prueba funcional mínima en Supabase

Use datos de prueba claramente identificados:

1. Cree un abonado de menos de 60 años con 2 pegues.
2. Cree un abonado de 60 años o más con DNI y 4 pegues.
3. Genere la anualidad de L 400.
4. Confirme:
   - 2 pegues = L 800 sin descuento.
   - 4 pegues = L 1,600 base.
   - Adulto mayor = L 400 de descuento.
   - Total = L 1,200.
5. Abra caja.
6. Registre un pago.
7. Descargue el recibo.
8. Escanee el QR.
9. Reimprima el recibo.
10. Registre una devolución de prueba.
11. Confirme que el original no fue eliminado.
12. Revise auditoría.

### 12. Probar portal del abonado

1. Abra **Fichas digitales**.
2. Seleccione el abonado.
3. Pulse **Crear o restablecer acceso**.
4. Copie la contraseña temporal.
5. Abra `/portal` en una ventana privada.
6. Ingrese DNI y contraseña temporal.
7. Cambie la contraseña.
8. Actualice celular, correo, dirección y fotografía.
9. Confirme que no puede cambiar nombre, DNI, pegues, tarifas ni pagos.

### 13. Probar respaldo y restauración

1. Genere un respaldo desde **Respaldos**.
2. Descargue el archivo.
3. Verifique que incluya las nuevas tablas.
4. Ejecute una restauración controlada en un proyecto Supabase de prueba, no directamente sobre producción.
5. Compare conteos y relaciones.

## B. Render

### 1. Servicio

- Repositorio: `Clopezgg/junta-agua-gestion-integral`
- Rama: `main`
- Build command:

```bash
npm install --include=dev --no-audit --no-fund --registry=https://registry.npmjs.org/ && npm run build:render
```

- Publish directory: `dist`

### 2. Variables públicas

Configure:

```text
VITE_SUPABASE_URL=https://SU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=SU_ANON_KEY_REAL
VITE_APP_VERSION=3.0.0
VITE_APP_RELEASE_URL=URL_DEL_RELEASE
VITE_GOOGLE_MAPS_API_KEY=
VITE_GOOGLE_MAPS_MAP_ID=
```

Las claves de Google Maps pueden quedar vacías cuando el mapa no esté contratado. La aplicación debe mostrar el estado de configuración sin simular el servicio.

Nunca configure en Render:

- `SUPABASE_SERVICE_ROLE_KEY`
- contraseñas de usuarios
- tokens privados dentro de `VITE_*`

### 3. Reescritura SPA

Confirme la regla:

```text
/*  →  /index.html
```

### 4. Despliegue

1. Pulse **Manual Deploy → Deploy latest commit** solamente después de que GitHub Actions esté verde.
2. Espere estado **Live**.
3. Confirme el SHA desplegado.
4. Abra la aplicación en modo privado.
5. Fuerce actualización para evitar caché del service worker.

### 5. Verificación final en Render

Compruebe:

- `/login`
- `/portal`
- `/mi-cuenta` después de iniciar sesión
- `/abonados`
- `/fichas-abonados`
- `/tarifas`
- `/estados-cuenta`
- `/pagos`
- `/documentos-financieros`
- `/operaciones`
- `/configuracion-documental`
- `/auditoria`
- `/respaldos`
- `/verificar-recibo/TOKEN_REAL`

Pruebe en iPhone, computadora y una ventana privada.

## C. Criterio de salida a producción

No utilice dinero real hasta completar:

- Migraciones sin errores.
- Edge Functions desplegadas.
- MFA confirmado.
- RLS probado con al menos dos roles.
- Cuota anual y descuento probados.
- Pago, QR, reimpresión, anulación y devolución probados.
- Portal probado.
- Cierre de caja probado.
- Respaldo y restauración controlada probados.
- Datos institucionales definitivos cargados.
