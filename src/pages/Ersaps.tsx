import {useEffect,useState} from 'react';
import {ShieldCheck,Plus} from 'lucide-react';
import {listCompliance,registerCompliance,upsertComplianceStatus} from '../features/compliance/service';
import {useAuth} from '../contexts/AuthContext';

type Obligation={id:string;code:string;title:string;description:string|null;regulation_source:string;regulation_version:string|null;due_date:string|null;status:string;requires_validation:boolean};

export function Ersaps(){
 const auth=useAuth();
 const [items,setItems]=useState<Obligation[]>([]);
 const [error,setError]=useState('');
 const [form,setForm]=useState({code:'',title:'',regulation_source:'ERSAPS',regulation_version:'',due_date:''});
 const load=()=>{void listCompliance().then(i=>setItems((i as Obligation[])??[])).catch(()=>setError('No se pudieron cargar las obligaciones.'));};
 useEffect(load,[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();try{await registerCompliance({p_code:form.code,p_title:form.title,p_regulation_source:form.regulation_source,p_regulation_version:form.regulation_version||null,p_due_date:form.due_date||null});setForm({code:'',title:'',regulation_source:'ERSAPS',regulation_version:'',due_date:''});load();}catch(err){setError((err as Error).message);}};
 const setStatus=async(o:Obligation,status:string)=>{try{await upsertComplianceStatus(o.id,status);load();}catch(err){setError((err as Error).message);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Cumplimiento</span><h1>ERSAPS y cumplimiento regulatorio</h1><p>Obligaciones ante la ERSAPS con fuente y versión normativa configurables.</p></div></div>
  <div className="notice">Las reglas de cumplimiento se modelan como <strong>configuración con fuente/versión</strong>. Registrar una obligación no implica cumplimiento legal: requiere validación institucional.</div>
  {error&&<div className="notice danger">{error}</div>}
  {auth.has('compliance.manage')&&<section className="panel"><div className="panel-heading"><h2><Plus size={18}/> Nueva obligación</h2></div>
   <form className="form-grid" onSubmit={submit}>
    <label>Código<input required value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></label>
    <label>Título<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
    <label>Fuente normativa<input required value={form.regulation_source} onChange={e=>setForm({...form,regulation_source:e.target.value})}/></label>
    <label>Versión<input value={form.regulation_version} onChange={e=>setForm({...form,regulation_version:e.target.value})}/></label>
    <label>Vence<input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></label>
    <button className="primary">Guardar</button>
   </form></section>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {items.length===0&&<div className="panel"><div className="empty empty-state"><ShieldCheck size={22}/><p>Sin obligaciones registradas.</p></div></div>}
   {items.map(o=><article key={o.id} className="panel">
    <strong>{o.code} · {o.title}</strong><span>{o.status} · {o.due_date||'sin plazo'}</span><small>Fuente: {o.regulation_source} {o.regulation_version?`(v${o.regulation_version})`:''}</small>
    {o.requires_validation&&<span className="status-badge draft">Requiere validación institucional</span>}
    {auth.has('compliance.manage')&&<div style={{marginTop:'0.5rem',display:'flex',gap:'0.5rem'}}><button className="outline" onClick={()=>setStatus(o,'cumplido')}>Marcar cumplido</button><button className="outline" onClick={()=>setStatus(o,'requiere_validacion')}>Requerir validación</button></div>}
   </article>)}
  </div>
 </main>;
}
