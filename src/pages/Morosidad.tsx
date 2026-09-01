import {useEffect,useState} from 'react';
import {HandCoins,Plus} from 'lucide-react';
import {listPaymentArrangements,createPaymentArrangement,getArrangementDetail} from '../features/arrears/service';
import {useAuth} from '../contexts/AuthContext';

type Arrangement={id:string;code:string;status:string;frequency:string;total_debt:number;installment_amount:number;num_installments:number;first_due_date:string};
const money=(v:unknown)=>`L ${Number(v??0).toLocaleString('es-HN',{minimumFractionDigits:2})}`;

export function Morosidad(){
 const auth=useAuth();
 const [items,setItems]=useState<Arrangement[]>([]);
 const [error,setError]=useState('');
 const [form,setForm]=useState({subscriber_id:'',total_debt:'',installment_amount:'',frequency:'mensual',first_due_date:''});
 const load=()=>{void listPaymentArrangements().then(i=>setItems((i as Arrangement[])??[])).catch(()=>setError('No se pudieron cargar los convenios.'));};
 useEffect(load,[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();try{await createPaymentArrangement({p_subscriber_id:form.subscriber_id,p_total_debt:Number(form.total_debt),p_installment_amount:Number(form.installment_amount),p_frequency:form.frequency,p_first_due_date:form.first_due_date,p_obligation_ids:[],p_notes:null});setForm({subscriber_id:'',total_debt:'',installment_amount:'',frequency:'mensual',first_due_date:''});load();}catch(err){setError((err as Error).message);}};
 const detail=async(id:string)=>{const d=await getArrangementDetail(id);const installs:unknown[]=d?.installments??[];alert(`Convenio: ${installs.length} cuotas.`);};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Usuarios y servicio</span><h1>Morosidad y convenios</h1><p>Planes de pago y convenios para regularizar la cartera del abonado.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  {auth.has('obligations.manage')&&<section className="panel"><div className="panel-heading"><h2><Plus size={18}/> Nuevo convenio</h2></div>
   <form className="form-grid" onSubmit={submit}>
    <label>Abonado (ID)<input required value={form.subscriber_id} onChange={e=>setForm({...form,subscriber_id:e.target.value})} placeholder="UUID del abonado"/></label>
    <label>Deuda total (L)<input type="number" min="0" required value={form.total_debt} onChange={e=>setForm({...form,total_debt:e.target.value})}/></label>
    <label>Cuota (L)<input type="number" min="0" required value={form.installment_amount} onChange={e=>setForm({...form,installment_amount:e.target.value})}/></label>
    <label>Frecuencia<select value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})}><option>semanal</option><option>quincenal</option><option>mensual</option></select></label>
    <label>Primer vencimiento<input type="date" required value={form.first_due_date} onChange={e=>setForm({...form,first_due_date:e.target.value})}/></label>
    <button className="primary">Crear convenio</button>
   </form></section>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {items.length===0&&<div className="panel"><div className="empty empty-state"><HandCoins size={22}/><p>Sin convenios de pago.</p></div></div>}
   {items.map(a=><article key={a.id} className="panel"><strong>{a.code}</strong><span>{a.status} · {a.frequency}</span><small>Deuda {money(a.total_debt)} · {a.num_installments} cuotas de {money(a.installment_amount)}</small><button className="outline" style={{marginTop:'0.5rem'}} onClick={()=>detail(a.id)}>Ver cuotas</button></article>)}
  </div>
 </main>;
}
