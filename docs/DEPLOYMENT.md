# Despliegue seguro
1. Crear proyecto Supabase exclusivo de la Junta.
2. Configurar variables de `.env.example` en el proveedor de hosting.
3. Aplicar todas las migraciones en orden ascendente (`001` a `033`), preferentemente con `supabase db push` o el plan de migraciones sincronizado.
4. Crear el primer usuario en Supabase Auth y ejecutar la inicialización de organización.
5. Activar TOTP y verificar nivel AAL2.
6. Crear usuarios desde el administrador; no habilitar registro público.
7. Configurar buckets privados y comprobar políticas RLS.
8. Desplegar las Edge Functions y sus secretos (incluidos `WHATSAPP_APP_SECRET` y `WHATSAPP_VERIFY_TOKEN`).
9. Registros básicos, integraciones sin exponer secretos al navegador.
10. Ejecutar `npm ci`, `npm test`, `npm run lint` y `npm run build`.
11. Validar la base local con el flujo de CI de `db-validate.yml` (migraciones 001–033 + invariantes de integridad).
12. Probar restauración de respaldo antes de cargar los 600 abonados.
13. Migrar datos con validación de duplicados y revisión por muestra.
14. Operar temporalmente en paralelo con los libros físicos y firmar el cierre de migración.

## GitHub y Render

El repositorio incluye `render.yaml` para desplegar el frontend como Static Site.

Variables obligatorias en Render:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

El backend, la base de datos, las migraciones, Storage, Auth y la Edge Function pertenecen a Supabase y deben desplegarse allí. Render hospeda el frontend compilado.

La regla de reescritura `/* -> /index.html` es obligatoria para que las rutas de React funcionen al recargar una página interna.
