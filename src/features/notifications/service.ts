import {getRoleDashboard} from '../finance/service';

export type NotificationSeverity='danger'|'warning'|'info';

export type AppNotification={
  id:string;
  severity:NotificationSeverity;
  title:string;
  detail:string;
  to:string;
};

export type RoleDashboard={
  overdue_debt?:number|null;
  pending_expenses?:number|null;
  open_work_orders?:number|null;
  urgent_work_orders?:number|null;
  overdue_maintenance?:number|null;
  critical_assets?:number|null;
  low_stock?:number|null;
  import_errors?:number|null;
  reading_errors?:number|null;
  active_cash_session?:boolean|null;
  budget_status?:string|null;
};

const money=(v:unknown)=>`L ${Number(v??0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

/**
 * Deriva notificaciones accionables (§30) del tablero por rol.
 * No inventa datos: cada aviso corresponde a un contador real devuelto por
 * `get_role_dashboard`, filtrado por umbral y ya recortado a los permisos del usuario
 * en el backend. Devuelve [] si el backend no está configurado.
 */
export function deriveNotifications(d:RoleDashboard):AppNotification[]{
  const out:AppNotification[]=[];
  const n=(v:unknown)=>Number(v??0);

  if(n(d.urgent_work_orders)>0)out.push({
    id:'urgent-work-orders',severity:'danger',
    title:`${n(d.urgent_work_orders)} orden${n(d.urgent_work_orders)===1?'':'es'} urgente${n(d.urgent_work_orders)===1?'':'s'}`,
    detail:'Requieren atención inmediata en Operación.',to:'/operaciones',
  });
  if(n(d.import_errors)>0)out.push({
    id:'import-errors',severity:'danger',
    title:`${n(d.import_errors)} registro${n(d.import_errors)===1?'':'s'} con error de importación`,
    detail:'Revíselos antes de confirmar el lote.',to:'/importaciones',
  });
  if(n(d.reading_errors)>0)out.push({
    id:'reading-errors',severity:'danger',
    title:`${n(d.reading_errors)} lectura${n(d.reading_errors)===1?'':'s'} de campo con error`,
    detail:'Corríjalas antes de facturar el consumo.',to:'/lecturas-campo',
  });
  if(n(d.overdue_debt)>0)out.push({
    id:'overdue-debt',severity:'warning',
    title:`Cartera vencida: ${money(d.overdue_debt)}`,
    detail:'Gestione cobro o convenios de pago.',to:'/morosidad',
  });
  if(n(d.pending_expenses)>0)out.push({
    id:'pending-expenses',severity:'warning',
    title:`${n(d.pending_expenses)} gasto${n(d.pending_expenses)===1?'':'s'} pendiente${n(d.pending_expenses)===1?'':'s'} de aprobación`,
    detail:'Esperan su revisión en Tesorería.',to:'/gastos',
  });
  if(n(d.overdue_maintenance)>0)out.push({
    id:'overdue-maintenance',severity:'warning',
    title:`${n(d.overdue_maintenance)} mantenimiento${n(d.overdue_maintenance)===1?'':'s'} atrasado${n(d.overdue_maintenance)===1?'':'s'}`,
    detail:'Planes preventivos fuera de fecha.',to:'/operaciones',
  });
  if(n(d.critical_assets)>0)out.push({
    id:'critical-assets',severity:'warning',
    title:`${n(d.critical_assets)} activo${n(d.critical_assets)===1?'':'s'} en estado crítico`,
    detail:'Verifique su condición y órdenes asociadas.',to:'/operaciones',
  });
  if(n(d.low_stock)>0)out.push({
    id:'low-stock',severity:'warning',
    title:`${n(d.low_stock)} material${n(d.low_stock)===1?'':'es'} bajo el mínimo`,
    detail:'Programe compra o traslado de bodega.',to:'/bodega',
  });
  if(d.active_cash_session===false)out.push({
    id:'cash-closed',severity:'info',
    title:'Caja cerrada',
    detail:'Ábrala para registrar cobros del día.',to:'/caja',
  });
  if(d.budget_status&&d.budget_status!=='approved')out.push({
    id:'budget-pending',severity:'info',
    title:'Presupuesto anual sin aprobar',
    detail:'Requiere resolución de la Junta Directiva.',to:'/presupuesto',
  });

  return out;
}

export async function loadNotifications():Promise<AppNotification[]>{
  const dashboard=await getRoleDashboard().catch(()=>({} as RoleDashboard));
  return deriveNotifications(dashboard as RoleDashboard);
}
