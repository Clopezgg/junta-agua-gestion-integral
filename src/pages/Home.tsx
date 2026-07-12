import {useEffect,useMemo,useState} from 'react';
import {AlertTriangle,ArrowRight,BadgeDollarSign,Boxes,ClipboardList,FileSpreadsheet,Files,IdCard,Landmark,ReceiptText,Users,Wrench} from 'lucide-react';
import {Link} from 'react-router-dom';
import {getFinancialDashboard,getRoleDashboard} from '../features/finance/service';
import {useAuth} from '../contexts/AuthContext';

const money=(value:unknown)=>`L ${Number(value??0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
type DashboardData={overdue_debt?:number|null;pending_expenses?:number|null;open_work_orders?:number|null;urgent_work_orders?:number|null;overdue_maintenance?:number|null;critical_assets?:number|null;low_stock?:number|null;budget_status?:string|null;active_cash_session?:boolean|null;import_errors?:number|null;};

export function Home(){
 const auth=useAuth();const[financial,setFinancial]=useState<any>(null);const[tasks,setTasks]=useState<DashboardData>({});const[error,setError]=useState('');const year=new Date().getFullYear();
 useEffect(()=>{void Promise.all([getFinancialDashboard(`${year}-01-01`,`${year}-12-31`).catch(()=>null),getRoleDashboard()]).then(([finance,role])=>{setFinancial(finance);setTasks(role);setError('')}).catch(error=>setError((error as Error).message))},[year]);
 const quickActions=useMemo(()=>[
   auth.has('subscribers.create')&&{to:'/abonados',icon:<Users size={20}/>,title:'Registrar abonado',text:'Crear persona, identidad y sus pegues.'},
   auth.has('subscribers.read')&&{to:'/fichas-abonados',icon:<IdCard size={20}/>,title:'Abrir ficha digital',text:'Fotografía, beneficios, historial y portal.'},
   auth.has('imports.manage')&&{to:'/importaciones',icon:<FileSpreadsheet size={20}/>,title:'Importar abonados',text:'Validar registros y pegues por lote.'},
   auth.has('obligations.manage')&&{to:'/tarifas',icon:<BadgeDollarSign size={20}/>,title:'Generar cuota anual',text:'L 400 por pegue, sin duplicados.'},
   auth.has('payments.create')&&{to:'/pagos',icon:<ReceiptText size={20}/>,title:'Registrar pago',text:'Seleccionar deuda, contabilizar y emitir recibo.'},
   auth.has('payments.read')&&{to:'/documentos-financieros',icon:<Files size={20}/>,title:'Consultar documentos',text:'Facturas, recibos, anulaciones y devoluciones.'},
   auth.has('operations.manage')&&{to:'/operaciones',icon:<Wrench size={20}/>,title:'Crear orden',text:'Nuevo pegue, reparación o cambio de tubería.'},
   auth.has('budget.read')&&{to:'/presupuesto',icon:<Landmark size={20}/>,title:'Ver presupuesto',text:'Saldos, ejecución y reservas.'}
 ].filter(Boolean) as {to:string;icon:React.ReactNode;title:string;text:string}[],[auth]);
 const taskCards=[
   tasks.pending_expenses!=null&&{label:'Gastos pendientes',value:tasks.pending_expenses,to:'/gastos',tone:Number(tasks.pending_expenses)>0?'warning':'success'},
   tasks.import_errors!=null&&{label:'Errores de importación',value:tasks.import_errors,to:'/importaciones',tone:Number(tasks.import_errors)>0?'danger':'success'},
   tasks.open_work_orders!=null&&{label:'Órdenes abiertas',value:tasks.open_work_orders,to:'/operaciones',tone:Number(tasks.urgent_work_orders)>0?'danger':'normal'},
   tasks.overdue_maintenance!=null&&{label:'Mantenimientos vencidos',value:tasks.overdue_maintenance,to:'/operaciones',tone:Number(tasks.overdue_maintenance)>0?'danger':'success'},
   tasks.critical_assets!=null&&{label:'Activos críticos',value:tasks.critical_assets,to:'/operaciones',tone:Number(tasks.critical_assets)>0?'danger':'success'},
   tasks.low_stock!=null&&{label:'Materiales bajo mínimo',value:tasks.low_stock,to:'/operaciones',tone:Number(tasks.low_stock)>0?'warning':'success'},
   tasks.budget_status!=null&&{label:'Presupuesto anual',value:tasks.budget_status==='approved'?'Aprobado':'Pendiente',to:'/presupuesto',tone:tasks.budget_status==='approved'?'success':'warning'}
 ].filter(Boolean) as {label:string;value:string|number;to:string;tone:string}[];
 return <main className="content"><div className="titlebar module-hero"><div><span className="eyebrow">Centro de control</span><h1>Gestión comunitaria del agua</h1><p>Hola, {auth.profile?.full_name}. Prioridades, finanzas y operaciones según su rol.</p></div><span className={`status-badge ${tasks.active_cash_session?'approved':'draft'}`}>{tasks.active_cash_session?'Caja abierta':'Caja cerrada'}</span></div>{error&&<div className="notice">No se pudo completar todo el resumen: {error}</div>}
 <div className="cards financial-overview"><article><small>Saldo disponible</small><h3>{money(financial?.balance)}</h3><span>Libro mayor confirmado</span></article><article><small>Ingresos del año</small><h3>{money(financial?.income)}</h3><span>{year}</span></article><article><small>Gastos del año</small><h3>{money(financial?.expense)}</h3><span>{year}</span></article><article><small>Cartera vencida</small><h3>{money(tasks.overdue_debt)}</h3><span>Cuotas y obligaciones vencidas</span></article></div>
 <section className="panel task-center"><div className="titlebar"><div><h2>Centro de pendientes</h2><p>Elementos que requieren atención dentro de sus permisos.</p></div>{Number(tasks.urgent_work_orders??0)>0&&<span className="urgent-chip"><AlertTriangle size={15}/>{tasks.urgent_work_orders} urgentes</span>}</div>{taskCards.length===0?<div className="empty">No existen pendientes visibles para este rol.</div>:<div className="task-grid">{taskCards.map(card=><Link className={`task-card ${card.tone}`} to={card.to} key={card.label}><span>{card.label}</span><strong>{card.value}</strong><ArrowRight size={17}/></Link>)}</div>}</section>
 <section className="panel" style={{marginTop:'1rem'}}><div className="panel-heading"><div><h2>Acciones rápidas</h2><p>Flujos frecuentes conectados de extremo a extremo.</p></div></div><div className="quick-action-grid">{quickActions.map(action=><Link to={action.to} className="quick-action" key={`${action.to}-${action.title}`}><span className="quick-icon">{action.icon}</span><span><strong>{action.title}</strong><small>{action.text}</small></span><ArrowRight size={18}/></Link>)}</div></section>
 {(Number(tasks.open_work_orders??0)>0||Number(tasks.low_stock??0)>0)&&<section className="panel operational-callout" style={{marginTop:'1rem'}}><ClipboardList size={24}/><div><h3>Operación conectada</h3><p>Órdenes, activos, materiales y costos comparten el mismo flujo técnico.</p></div><Link to="/operaciones"><Boxes size={17}/>Abrir operaciones</Link></section>}
 </main>;
}
