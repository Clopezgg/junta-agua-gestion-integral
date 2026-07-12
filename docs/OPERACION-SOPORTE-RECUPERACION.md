# Operación, soporte y recuperación

## Objetivo

Este documento define la operación mínima para usar la plataforma con datos reales: validación previa, despliegue, monitoreo, soporte, respaldos y recuperación.

## Ambientes obligatorios

1. **Local:** desarrollo y pruebas unitarias.
2. **Staging Supabase:** migraciones desde cero, datos semilla y pruebas E2E.
3. **Staging Render:** despliegue con variables reales de staging.
4. **Producción:** solo después de aprobar la lista de salida.

## Validación técnica antes de producción

Ejecutar:

```bash
npm ci
npm test
npm run lint
npm run build:render
npm run test:e2e
npm run readiness:offline
npm run readiness:staging
```

`readiness:staging` requiere:

- `SUPABASE_STAGING_URL`
- `SUPABASE_STAGING_ANON_KEY`
- `SUPABASE_STAGING_SERVICE_ROLE_KEY`
- `RENDER_SERVICE_ID`
- `RENDER_API_KEY`
- Supabase CLI
- `psql`
- `curl`

## Pruebas mínimas en staging

1. Aplicar migraciones desde cero.
2. Crear dos organizaciones.
3. Crear superadmin, admin, secretaria, tesorero, auditor y abonado de portal.
4. Crear abonados con 1, 2, 4 y 20 pegues.
5. Generar anualidad y verificar L 400 por pegue.
6. Verificar adulto mayor: 60 años, 25%, con DNI primario, aplicado a todos los pegues.
7. Registrar pagos en efectivo, transferencia, cheque, depósito y mixto.
8. Cerrar caja y validar arqueo.
9. Anular pago y registrar devolución parcial.
10. Generar PDF, reimprimir y abrir QR público.
11. Validar que el abonado solo edite celular, correo, dirección y foto.
12. Validar RLS entre organizaciones.
13. Crear backup, descargarlo y restaurarlo en base limpia.
14. Ejecutar smoke test de Render staging.

## Soporte

- Incidente crítico: pérdida de acceso, pago duplicado, fuga de datos, restore fallido.
- Incidente alto: recibo incorrecto, QR inválido, caja descuadrada.
- Incidente medio: correo/imagen/mapa fallido.
- Incidente bajo: problema visual no financiero.

## Recuperación

1. Congelar operaciones.
2. Exportar backup actual para investigación.
3. Restaurar último backup aprobado en ambiente limpio.
4. Comparar conteos por tabla, pagos, obligaciones y documentos.
5. Validar acceso de usuarios.
6. Validar recibos y QR.
7. Reabrir operación con acta interna.

## Criterio de salida comercial

No se autoriza uso comercial hasta que staging apruebe migraciones, pagos, RLS, portal, backups, restore, Render y documentación legal.
