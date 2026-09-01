import type {Permission} from '../../lib/security';

type Has=(p:Permission)=>boolean;

/** Etiqueta legible del perfil operativo del usuario (§27), derivada de permisos. */
export function roleLabel(has:Has):string{
  if(has('settings.manage')&&has('roles.manage'))return 'Administración';
  if(has('bank.manage')&&has('payments.read'))return 'Tesorería';
  if(has('governance.manage'))return 'Junta Directiva';
  if(has('audit.read')&&!has('payments.create'))return 'Fiscalía / Auditoría';
  if(has('operations.manage')||has('field.manage'))return 'Operación técnica';
  if(has('subscribers.create'))return 'Secretaría';
  return 'Consulta';
}

/** Qué secciones del Inicio ve cada rol (§27). */
export function homeSections(has:Has){
  return {
    finance:has('payments.read')||has('finance.read')||has('reports.read'),
    operations:has('operations.read'),
    portfolio:has('obligations.read'),
  };
}

export type HomeQuickAction={to:string;permission:Permission;title:string};

export const homeQuickActions:ReadonlyArray<HomeQuickAction>=[
  {to:'/abonados',permission:'subscribers.create',title:'Registrar abonado'},
  {to:'/fichas-abonados',permission:'subscribers.read',title:'Abrir ficha digital'},
  {to:'/pagos',permission:'payments.create',title:'Registrar cobro'},
  {to:'/tarifas',permission:'obligations.manage',title:'Generar cuota anual'},
  {to:'/operaciones',permission:'operations.manage',title:'Crear orden de trabajo'},
  {to:'/compras',permission:'expenses.create',title:'Registrar compra'},
  {to:'/presupuesto',permission:'budget.read',title:'Revisar presupuesto'},
  {to:'/importaciones',permission:'imports.manage',title:'Importar abonados'},
];

export function visibleQuickActions(has:Has):HomeQuickAction[]{
  return homeQuickActions.filter(a=>has(a.permission));
}
