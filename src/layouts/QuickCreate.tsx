import {useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  Barcode,FileText,Gavel,HandCoins,PackagePlus,PencilRuler,Plus,ReceiptText,ShoppingCart,Sparkles,Users,Wrench,
} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {useOnClickOutside} from '../design-system/hooks';
import type {Permission} from '../lib/security';

type CreateAction={label:string;to:string;permission:Permission;icon:ReactNode};

const actions:CreateAction[]=[
  {label:'Nuevo abonado',to:'/abonados?crear=1',permission:'subscribers.create',icon:<Users size={16}/>},
  {label:'Nuevo servicio',to:'/abonados/nuevo-servicio',permission:'subscribers.create',icon:<PencilRuler size={16}/>},
  {label:'Cobro',to:'/tesoreria/cobrar',permission:'payments.create',icon:<ReceiptText size={16}/>},
  {label:'Solicitud',to:'/solicitudes',permission:'subscribers.create',icon:<FileText size={16}/>},
  {label:'Incidente',to:'/operacion',permission:'incidents.manage',icon:<Wrench size={16}/>},
  {label:'Orden de trabajo',to:'/operacion',permission:'operations.manage',icon:<Barcode size={16}/>},
  {label:'Gasto',to:'/tesoreria/gastos',permission:'expenses.create',icon:<ShoppingCart size={16}/>},
  {label:'Compra',to:'/tesoreria/compras',permission:'expenses.create',icon:<PackagePlus size={16}/>},
  {label:'Reunión',to:'/junta',permission:'governance.manage',icon:<Gavel size={16}/>},
  {label:'Muestra de calidad',to:'/operacion',permission:'water.manage',icon:<Sparkles size={16}/>},
  {label:'Proyecto',to:'/junta',permission:'governance.manage',icon:<HandCoins size={16}/>},
];

export function QuickCreate(){
  const auth=useAuth();
  const navigate=useNavigate();
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useOnClickOutside(ref,()=>setOpen(false));
  const allowed=actions.filter(action=>auth.has(action.permission));
  return <div className="ja-quick-create" ref={ref}>
    <button type="button" className="ja-quick-create-trigger" aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>
      <Plus size={16}/><span>Crear</span>
    </button>
    {open&&<div className="ja-menu ja-quick-menu" role="menu">
      <div className="ja-menu-title">Crear registro</div>
      {allowed.map(action=><button key={action.label} type="button" role="menuitem" className="ja-menu-item" onClick={()=>{setOpen(false);void navigate(action.to)}}>
        <span className="ja-quick-plus">{action.icon}</span>{action.label}
      </button>)}
    </div>}
  </div>;
}