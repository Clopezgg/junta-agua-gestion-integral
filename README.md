# Sistema Integral de Junta de Agua

Proyecto nuevo creado desde cero para la Junta de Agua. No deriva ni contiene carpetas, componentes, pruebas, nombres, servicios o datos de los ZIP de referencia.

## Fases incluidas

### Fase 1
- Supabase Auth.
- Contraseña individual.
- MFA TOTP obligatorio.
- Administrador principal único durante el arranque.
- Roles y permisos.
- Protección de rutas.
- Row Level Security.
- Auditoría inalterable desde la interfaz.
- Almacenamiento privado.

### Fase 2
- Abonados con código correlativo de seis dígitos.
- Identidad única normalizada.
- Búsqueda avanzada.
- Bloqueo de duplicados exactos.
- Detección de nombres similares.
- Aclaratoria obligatoria para homónimos.
- Varios pegues por abonado.
- Prevención de medidor activo duplicado.
- Ficha técnica y documentos privados.

## Puesta en marcha
1. Cree un proyecto Supabase.
2. Ejecute las migraciones en orden.
3. Cree el primer usuario en Supabase Auth.
4. Copie `.env.example` a `.env` y agregue las claves públicas.
5. Inicie sesión con el primer usuario y ejecute `bootstrap_organization` una sola vez desde una herramienta administrativa segura.
6. Configure TOTP para el usuario.

## Comandos
```bash
npm install
npm run dev
npm run build
npm test
npm run lint
```

No contiene datos demo ni acceso simulado. Sin Supabase configurado, el sistema se bloquea de forma explícita.

## Fase 3 incorporada
La versión 0.3.0 añade tarifas versionadas, anualidades idempotentes, obligaciones manuales, estados de cuenta, morosidad automática y bloqueos operativos por deuda. Consulte `docs/FASE-3.md`.


## Estado actual
Fases 1 a 9 integradas. Visor interno: `/avance`. La validación remota requiere desplegar las migraciones en Supabase.

## Integraciones externas
La implementación completa en código está documentada en `docs/INTEGRACIONES-COMPLETAS.md`. Las credenciales privadas deben configurarse como Supabase Secrets y las claves públicas del mapa como variables de Render.

## Auditoría final 1.1.0
La migración `202607110012_final_audit_corrections.sql` corrige devoluciones, caja, pagos mixtos, configuración institucional, auditoría visible, reimpresiones y reportes detallados. Consulte `docs/AUDITORIA-FINAL-OBJETIVO.md` antes de desplegar.

Para el webhook de WhatsApp, despliegue respetando `supabase/config.toml`; esta función debe aceptar llamadas de Meta sin JWT de usuario y valida su propio token de verificación.
