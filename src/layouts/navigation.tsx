import type {ReactNode} from 'react';
import {ClipboardCheck,FileText,Gavel,HandCoins,Hammer,Home,Map,Search,Users} from 'lucide-react';
import type {Permission} from '../lib/security';

export type NavItem={
  to:string;
  label:string;
  icon:ReactNode;
  permission?:Permission;
};

export const primaryNav:ReadonlyArray<NavItem>=[
  {to:'/inicio',label:'Inicio',icon:<Home size={19}/>},
  {to:'/abonados',label:'Abonados',icon:<Users size={19}/>,permission:'subscribers.read'},
  {to:'/tesoreria',label:'Tesorería',icon:<HandCoins size={19}/>,permission:'payments.read'},
  {to:'/operacion',label:'Operación',icon:<ClipboardCheck size={19}/>,permission:'operations.read'},
  {to:'/junta',label:'Junta',icon:<Gavel size={19}/>,permission:'governance.read'},
  {to:'/cumplimiento',label:'Cumplimiento',icon:<FileText size={19}/>,permission:'compliance.read'},
];

export const mobileNav:ReadonlyArray<{key:string;label:string;icon:ReactNode;to?:string;action?:'search'}>=[
  {key:'inicio',label:'Inicio',icon:<Home size={20}/>,to:'/inicio'},
  {key:'buscar',label:'Buscar',icon:<Search size={20}/>,action:'search'},
  {key:'trabajo',label:'Trabajo',icon:<Hammer size={20}/>,to:'/operacion'},
  {key:'mapa',label:'Mapa',icon:<Map size={20}/>,to:'/mapa'},
];

export function visibleNav(items:ReadonlyArray<NavItem>,has:(p:Permission)=>boolean):NavItem[]{
  return items.filter(item=>!item.permission||has(item.permission));
}