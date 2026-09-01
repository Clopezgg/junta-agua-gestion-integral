import type {Permission} from '../../lib/security';

export type NavCommand={
  id:string;
  label:string;
  group:string;
  to:string;
  keywords:string;
  permission?:Permission;
};

/**
 * Destinos navegables del command palette (§28). Cada uno apunta a una ruta REAL
 * declarada en `appRoutes`, con el permiso que la protege. `visibleCommands`
 * los recorta a los permisos del usuario.
 */
export const navCommands:ReadonlyArray<NavCommand>=[
  {id:'inicio',label:'Inicio',group:'General',to:'/inicio',keywords:'home tablero panel centro'},

  {id:'abonados',label:'Abonados',group:'Abonados',to:'/abonados',keywords:'clientes usuarios pegues directorio',permission:'subscribers.read'},
  {id:'abonado-360',label:'Abonado 360',group:'Abonados',to:'/abonado-360',keywords:'ficha expediente historial',permission:'subscribers.read'},
  {id:'fichas',label:'Fichas digitales',group:'Abonados',to:'/fichas-abonados',keywords:'tarjeta carnet foto',permission:'subscribers.read'},
  {id:'solicitudes',label:'Solicitudes y reclamos',group:'Abonados',to:'/solicitudes',keywords:'reclamo queja service desk sla',permission:'subscribers.read'},
  {id:'morosidad',label:'Morosidad y convenios',group:'Abonados',to:'/morosidad',keywords:'deuda cartera mora convenio plan',permission:'obligations.read'},
  {id:'comunicaciones',label:'Comunicaciones',group:'Abonados',to:'/comunicaciones',keywords:'whatsapp correo aviso mensaje',permission:'communications.read'},

  {id:'cobrar',label:'Cobrar / Pagos',group:'Tesorería',to:'/pagos',keywords:'pago recibo pos caja cobro',permission:'payments.read'},
  {id:'caja',label:'Caja',group:'Tesorería',to:'/caja',keywords:'arqueo apertura cierre efectivo',permission:'payments.read'},
  {id:'bancos',label:'Bancos y conciliación',group:'Tesorería',to:'/bancos',keywords:'cuenta transferencia conciliacion extracto',permission:'finance.read'},
  {id:'gastos',label:'Gastos',group:'Tesorería',to:'/gastos',keywords:'egreso factura proveedor pago',permission:'expenses.read'},
  {id:'compras',label:'Compras',group:'Tesorería',to:'/compras',keywords:'orden requisicion cotizacion proveedor',permission:'expenses.read'},
  {id:'presupuesto',label:'Presupuesto',group:'Tesorería',to:'/presupuesto',keywords:'plan ejecucion partida reserva',permission:'budget.read'},
  {id:'tarifas',label:'Tarifas',group:'Tesorería',to:'/tarifas',keywords:'cuota precio version beneficio',permission:'tariffs.read'},
  {id:'estados-cuenta',label:'Estados de cuenta',group:'Tesorería',to:'/estados-cuenta',keywords:'saldo obligacion abonado',permission:'obligations.read'},

  {id:'operaciones',label:'Operación',group:'Operación',to:'/operaciones',keywords:'ordenes trabajo activos mantenimiento',permission:'operations.read'},
  {id:'incidencias',label:'Incidencias',group:'Operación',to:'/incidencias',keywords:'fuga rotura bomba emergencia',permission:'incidents.read'},
  {id:'bodega',label:'Bodega',group:'Operación',to:'/bodega',keywords:'inventario material kardex stock',permission:'inventory.read'},
  {id:'mapa',label:'Mapa',group:'Operación',to:'/mapa',keywords:'gis capas ubicacion sector',permission:'map.read'},
  {id:'lecturas-campo',label:'Lecturas de campo',group:'Operación',to:'/lecturas-campo',keywords:'medidor consumo pwa gps',permission:'field.read'},

  {id:'calidad',label:'Calidad del agua',group:'Agua y ambiente',to:'/calidad',keywords:'muestra laboratorio parametro norma',permission:'water.read'},
  {id:'cloracion',label:'Cloración',group:'Agua y ambiente',to:'/cloracion',keywords:'cloro dosis residual',permission:'water.read'},
  {id:'fuentes',label:'Fuentes',group:'Agua y ambiente',to:'/fuentes',keywords:'captacion pozo manantial',permission:'water.read'},
  {id:'continuidad',label:'Continuidad del servicio',group:'Agua y ambiente',to:'/continuidad',keywords:'racionamiento interrupcion sector',permission:'water.read'},
  {id:'microcuenca',label:'Microcuenca',group:'Agua y ambiente',to:'/microcuenca',keywords:'reforestacion inspeccion riesgo',permission:'water.read'},

  {id:'junta-directiva',label:'Junta Directiva',group:'Junta',to:'/junta-directiva',keywords:'cargo periodo miembro',permission:'governance.read'},
  {id:'asamblea',label:'Asamblea',group:'Junta',to:'/asamblea',keywords:'convocatoria quorum votacion acta',permission:'governance.read'},
  {id:'reuniones',label:'Reuniones',group:'Junta',to:'/reuniones',keywords:'agenda acta acuerdo',permission:'governance.read'},
  {id:'resoluciones',label:'Resoluciones',group:'Junta',to:'/resoluciones',keywords:'acuerdo numero vigencia firmante',permission:'governance.read'},
  {id:'proyectos',label:'Proyectos',group:'Junta',to:'/proyectos',keywords:'obra ampliacion cronograma avance',permission:'governance.read'},

  {id:'ersaps',label:'ERSAPS y cumplimiento',group:'Cumplimiento',to:'/ersaps',keywords:'regulador requisito informe deadline',permission:'compliance.read'},
  {id:'transparencia',label:'Transparencia',group:'Cumplimiento',to:'/transparencia',keywords:'publico ingresos gastos rendicion',permission:'reports.read'},
  {id:'informes',label:'Informes',group:'Cumplimiento',to:'/informes',keywords:'reporte anual financiero excel',permission:'reports.read'},
  {id:'auditoria',label:'Auditoría',group:'Cumplimiento',to:'/auditoria',keywords:'bitacora evento quien cambio',permission:'audit.read'},

  {id:'usuarios',label:'Usuarios y roles',group:'Administración',to:'/usuarios',keywords:'permiso acceso cuenta',permission:'users.manage'},
  {id:'configuracion',label:'Configuración',group:'Administración',to:'/configuracion',keywords:'institucion ajustes parametros',permission:'settings.manage'},
  {id:'integraciones',label:'Integraciones',group:'Administración',to:'/integraciones',keywords:'whatsapp email ocr maps backup',permission:'integrations.read'},
  {id:'respaldos',label:'Respaldos',group:'Administración',to:'/respaldos',keywords:'backup restauracion disaster recovery',permission:'backups.read'},
  {id:'importaciones',label:'Importaciones',group:'Administración',to:'/importaciones',keywords:'carga lote excel migracion',permission:'imports.read'},
];

const norm=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

export function visibleCommands(has:(p:Permission)=>boolean):NavCommand[]{
  return navCommands.filter(c=>!c.permission||has(c.permission));
}

export function filterCommands(list:NavCommand[],query:string):NavCommand[]{
  const q=norm(query.trim());
  if(!q)return list;
  return list
    .map(c=>{
      const hay=norm(`${c.label} ${c.group} ${c.keywords}`);
      const idx=hay.indexOf(q);
      return {c,score:idx<0?-1:(norm(c.label).startsWith(q)?0:1)+idx/1000};
    })
    .filter(x=>x.score>=0)
    .sort((a,b)=>a.score-b.score)
    .map(x=>x.c);
}
