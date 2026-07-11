# Plataforma 2.0 — instalación y aceptación

## Migraciones obligatorias
Ejecute después de las migraciones 001–013 y exactamente en este orden:

1. `supabase/migrations/202607110014_platform_v2_premium_budget_assets_ux.sql`
2. `supabase/migrations/202607110015_platform_v2_role_permissions.sql`

La 014 incorpora RLS, presupuesto, activos, mantenimiento, búsqueda universal, panel por rol y snapshot histórico del recibo. La 015 actualiza `seed_default_roles` para garantizar que instalaciones nuevas y organizaciones existentes reciban correctamente los permisos de presupuesto, activos y mantenimiento.

## Secuencia de despliegue
1. Ejecutar la migración 014 en Supabase SQL Editor.
2. Confirmar `Success. No rows returned`.
3. Ejecutar la migración 015.
4. Confirmar nuevamente `Success. No rows returned`.
5. Desplegar la rama aprobada en Render.
6. Entrar en Configuración y cargar logo, firma y sello.
7. Guardar nombre y cargo del firmante.
8. Crear el periodo fiscal y saldos iniciales.
9. Crear rubros y aprobar el presupuesto con MFA.
10. Registrar activos y coordenadas GIS.
11. Crear planes preventivos.
12. Ejecutar una operación completa con datos de prueba.

## Consultas de comprobación

```sql
select
  to_regclass('public.fiscal_periods') is not null as presupuesto,
  to_regclass('public.assets') is not null as activos,
  to_regclass('public.maintenance_plans') is not null as mantenimiento,
  to_regprocedure('public.global_search(text,integer)') is not null as busqueda,
  to_regprocedure('public.get_role_dashboard()') is not null as panel_roles,
  to_regprocedure('public.attach_payment_receipt_v2(uuid,text,jsonb)') is not null as recibo_historico,
  to_regprocedure('public.seed_default_roles(uuid)') is not null as roles_v2;
```

Todos los valores deben ser `true`.

## Criterios funcionales
- El recibo mide 5.5 × 8.5 pulgadas.
- La marca de agua diferencia `IMPRESIÓN` y `REIMPRESIÓN`.
- El sello de estado muestra `PAGADO`, `ANULADO`, `DEVUELTO` o `DEVOLUCIÓN PARCIAL`.
- La reimpresión conserva la identidad institucional histórica del pago.
- Logo, firma y sello se almacenan en bucket privado.
- El presupuesto muestra saldos iniciales, reserva, variación y ejecución.
- Los activos incluyen condición, criticidad, reposición y coordenadas.
- Los planes vencidos generan órdenes preventivas sin duplicarlas.
- Completar una orden usa un formulario institucional y crea historial del activo.
- La búsqueda universal respeta permisos.
- El inicio muestra pendientes y accesos del rol autenticado.
- La app muestra versión, commit, fecha y enlace al GitHub Release.

## Liberación
La versión del `package.json` debe coincidir con el tag. Para publicar la versión 2.0.0, cree el tag `v2.0.0`; GitHub Actions validará, compilará y generará el Release automáticamente.
