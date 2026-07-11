# Plataforma 2.0 — instalación y aceptación

## Migración obligatoria
Ejecute después de las migraciones 001–013:

`supabase/migrations/202607110014_platform_v2_premium_budget_assets_ux.sql`

La migración es transaccional e incorpora permisos, RLS, presupuesto, activos, mantenimiento, búsqueda universal, panel por rol y snapshot histórico del recibo.

## Secuencia de despliegue
1. Ejecutar la migración 014 en Supabase SQL Editor.
2. Confirmar `Success. No rows returned`.
3. Desplegar la rama aprobada en Render.
4. Entrar en Configuración y cargar logo, firma y sello.
5. Guardar nombre y cargo del firmante.
6. Crear el periodo fiscal y saldos iniciales.
7. Crear rubros y aprobar el presupuesto con MFA.
8. Registrar activos y coordenadas GIS.
9. Crear planes preventivos.
10. Ejecutar una operación completa con datos de prueba.

## Consultas de comprobación

```sql
select
  to_regclass('public.fiscal_periods') is not null as presupuesto,
  to_regclass('public.assets') is not null as activos,
  to_regclass('public.maintenance_plans') is not null as mantenimiento,
  to_regprocedure('public.global_search(text,integer)') is not null as busqueda,
  to_regprocedure('public.get_role_dashboard()') is not null as panel_roles,
  to_regprocedure('public.attach_payment_receipt_v2(uuid,text,jsonb)') is not null as recibo_historico;
```

Todos los valores deben ser `true`.

## Criterios funcionales
- El recibo mide 5.5 × 8.5 pulgadas y muestra marca dinámica de estado.
- La reimpresión conserva la identidad institucional histórica del pago.
- Logo, firma y sello se almacenan en bucket privado.
- El presupuesto muestra saldos iniciales, reserva, variación y ejecución.
- Los activos incluyen condición, criticidad, reposición y coordenadas.
- Los planes vencidos generan órdenes preventivas sin duplicarlas.
- Completar una orden asociada crea historial del activo.
- La búsqueda universal respeta permisos.
- El inicio muestra pendientes y accesos del rol autenticado.
- La app muestra versión, commit, fecha y enlace al GitHub Release.

## Liberación
La versión del `package.json` debe coincidir con el tag. Para publicar la versión 2.0.0, cree el tag `v2.0.0`; GitHub Actions validará, compilará y generará el Release automáticamente.
