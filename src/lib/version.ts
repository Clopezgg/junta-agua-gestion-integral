export const appVersion={
  version:__APP_VERSION__,
  commit:__APP_COMMIT_SHA__,
  buildDate:__APP_BUILD_DATE__,
  releaseUrl:__APP_RELEASE_URL__
};

export const releaseHighlights=[
  'Retención automática de respaldos vencidos: 90 días por defecto, ajustable en Integraciones → Respaldo externo.',
  'Respaldo eliminado por retención queda marcado y trazado (fecha, responsable y auditoría backup.prune) en el panel de respaldos.',
  'Validación E2E real del flujo completo: inicio de sesión con MFA TOTP, panel, navegación, búsqueda y cierre de sesión.',
  'Base de datos validada fin a fin en Supabase local: migraciones 001–035, integridad financiera y funciones de borde tipadas.',
  'Documentación de producción, plan de preparación y matriz de evidencia actualizados.'
];
