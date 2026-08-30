# Preparación para producción — ERP Comunitario "Junta de Agua"

Versión de referencia: **3.1.0** · Rama `work/junta-agua-erp-production-v2` · PR #11.

## 1. Estado de listo para producción (pruebas reales ejecutables)

| Capa | Mecanismo de validación real | Estado |
|---|---|---|
| Unidad/contrato | `npx vitest run` (19 archivos, 106 pruebas, suites `src/tests/*.test.ts`) | Verde |
| Estática | `eslint .` y `tsc -b` | Verde |
| Render/empaquetado | `npm run build:render` (bake-sw versionado `junta-agua-shell-v3.1.0-<sha>`) | Verde |
| Base de datos real | `.github/workflows/db-validate.yml`: `supabase start` aplica migraciones 001..034; `db_integrity.sql` valida integridad financiera, invariantes 033 y trazabilidad 034 | Pendiente de último run |
| Edge functions | `deno check --no-config --no-lock` sobre las 11 funciones en `supabase/functions/*` | Verde |
| E2E de navegador real | `.github/workflows/e2e.yml`: Playwright (Chromium desktop + móvil) contra la pila local de Supabase sembrada (`supabase/tests/e2e_seed.sql`) | Sediento de un run completo |
| Comercial offline | `npm run readiness:offline` (13 checks de artefactos y flujos) | Verde |
| Dependencias | `npm audit` | 0 vulnerabilidades |

## 2. Seguridad de extremo a extremo (resumen)

- RLS por organización en todas las tablas (`current_organization_id()`), escrituras
  exclusivamente vía funciones `security definer` con `has_permission()`.
- MFA `aal2` en operaciones financieras, administrativas y de respaldo (incluye
  descarga y restauración de respaldos en la edge function `backup-manager`).
- Protección contra fuerza bruta en el login (migración 033).
- Inmutabilidad de registros financieros (triggers `forbid_delete_*`), cooldown de
  caja y artefactos documentales inmutables.
- Secretos solo en Supabase Secrets; la configuración pública nunca contiene tokens.
- Detalle completo: `docs/SECURITY.md`.

## 3. Despliegue

- Frontend estático en Render: `render.yaml` sirve `dist/` con CSP, HSTS y
  Permissions-Policy; el SPA redirige rutas vía `_redirects`.
- Base de datos: Supabase Cloud + migraciones 001..034.
- Release automático en GitHub Actions (`release.yml`) dependiendo de `validate`.
- Pasos operativos en `docs/DEPLOYMENT.md` y `docs/PASO-A-PASO-SUPABASE-RENDER-V3.md`.

## 4. Recuperación

- respaldos integrales y restauración con sesiones trazables en
  `docs/BACKUP-RESTORE.md`; runbook y RTO/RPO en `docs/DISASTER-RECOVERY.md`.

## 5. Comprobaciones post-recuperación y post-despliegue

1. `supabase db reset` en local y `psql ... -f supabase/tests/db_integrity.sql`.
2. `npx vitest run` + `npm run lint` + `npm run build:render`.
3. `npm run test:playwright` contra una pila local sembrada.
4. En producción: pantalla `/avance` (readiness `get_system_readiness`) y `/integraciones`
   hasta que los conectores estén habilitados y sin errores.
5. Verificación de recibos públicos: abrir `/verificar-recibo/<token>`.

## 6. Huecos intencionalmente documentados (no accidentales)

- Retención/limpieza automática de respaldos vencidos: no automatizada.
- La vista `ReceiptVisualStudio` es una herramienta de diseño (solo preview local).
- El portal de abonados requiere habilitar MFA y configuraciones SMTP/WhatsApp del
  entorno de despliegue.