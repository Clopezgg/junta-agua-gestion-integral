# Instalación, ejecución y despliegue 2.1

## 1. Preparar Supabase

1. Cree un proyecto exclusivo.
2. Configure la URL y la clave pública en `.env.local`.
3. Aplique migraciones 001–025 en orden.
4. No combine 018 y 019 en una sola transacción.
5. Compruebe:

```sql
select
  to_regclass('public.meter_readings') is not null as lecturas,
  to_regclass('public.data_import_batches') is not null as importaciones,
  to_regclass('public.integration_runs') is not null as ejecuciones,
  to_regprocedure('public.post_meter_reading_batch(uuid)') is not null as facturacion_consumo,
  to_regprocedure('public.get_system_readiness()') is not null as diagnostico;
```

Todos deben ser `true`.

## 2. Configurar secretos

Copie los nombres de `supabase/.env.example`. No use el prefijo `VITE_` para tokens privados.

```bash
npx supabase secrets set GITHUB_RELEASE_TOKEN=...
npx supabase secrets set GITHUB_REPOSITORY=Clopezgg/junta-agua-gestion-integral
```

El token de GitHub debe ser de solo lectura y limitarse al repositorio.

## 3. Desplegar funciones

```bash
npx supabase functions deploy backup-manager
npx supabase functions deploy integration-test
npx supabase functions deploy check-system-update
npx supabase functions deploy ocr-document
npx supabase functions deploy send-email
npx supabase functions deploy send-whatsapp
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
npx supabase functions deploy admin-create-user
```

## 4. Ejecución local

```bash
cp .env.example .env.local
npm install --include=dev --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run dev
```

Abra la URL indicada por Vite.

## 5. Compilación

```bash
npm test
npm run lint
npm run build:render
```

Debe existir:

- `dist/index.html`
- `dist/health.txt`
- `dist/_redirects`
- `dist/manifest.webmanifest`
- `dist/sw.js`

## 6. GitHub

1. Trabaje en una rama.
2. Abra Pull Request contra `main`.
3. Espere pruebas, lint, build y verificación de publicación.
4. Fusione por squash.
5. Al cambiar `package.json` a 2.1.0, el workflow genera `v2.1.0` si no existe.

## 7. Render

Variables públicas:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_GOOGLE_MAPS_MAP_ID`

No coloque service role, token de GitHub, WhatsApp, Resend ni Google Vision en Render como `VITE_*`.

## 8. Prueba de aceptación

1. Inicie sesión y complete MFA.
2. Cree una tarifa por consumo con dos bloques.
3. Cree un lote mensual.
4. Registre una lectura normal y una anómala.
5. Corrija errores y facture el lote.
6. Compruebe la obligación del abonado.
7. Importe un CSV de prueba.
8. Verifique resultado por fila.
9. Ejecute pruebas de integraciones.
10. Consulte GitHub Releases.
11. Abra Diagnóstico.
12. Cree y restaure un respaldo en un entorno controlado.
