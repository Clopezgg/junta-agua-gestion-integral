# Notas técnicas V3

La rama `feature/platform-complete-v3` se construye sobre `main` y conserva los módulos existentes. Las nuevas rutas y funciones se integran sin eliminar medición, importaciones, presupuesto, activos, auditoría ni respaldos. La navegación principal oculta medición porque la operación vigente de El Achiotal no usa medidores, pero el código permanece disponible.

Las migraciones 026–029 deben aplicarse después de 001–025. Las Edge Functions nuevas requieren despliegue manual en Supabase. Render solo necesita variables públicas `VITE_*`.
