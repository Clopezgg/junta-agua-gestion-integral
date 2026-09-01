import {useEffect,useState} from 'react';
import {Scale,Plus,ShieldAlert} from 'lucide-react';
import {createResolution,listResolutions} from '../features/governance/service';
import {useAuth} from '../contexts/AuthContext';

type Resolution={id:string;number:string;title:string;resolution_type:string;status:string;effective_date:string|null;requires_validation:boolean};
const TYPES=['tarifa','reglamento_interno','gobierno','financiera','operativa','sancion','otra'];

export function Resoluciones(){
 const auth=useAuth();
 const [items,setItems]=useState<Resolution[]>([]);
 const [error,setError]=useState('');
 const [form,setForm]=useState({number:'',resolution_type:'gobierno',title:'',content:'',effective_date:'',source_regulation:''});
 const load=()=>{void listResolutions().then(i=>setItems((i as Resolution[])??[])).catch(()=>setError('No se pudieron cargar las resoluciones.'));};
 useEffect(load,[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();try{await createResolution({p_number:form.number,p_resolution_type:form.resolution_type,p_title:form.title,p_content:form.content,p_effective_date:form.effective_date||null,p_source_regulation:form.source_regulation||null});setForm({number:'',resolution_type:'gobierno',title:'',content:'',effective_date:'',source_regulation:''});load();}catch(err){setError((err as Error).message);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Gobierno</span><h1>Resoluciones</h1><p>Documentos normativos con numeración correlativa y estado de vigencia.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  {auth.has('governance.manage')&&<section className="panel"><div className="panel-heading"><h2><Plus size={18}/> Nueva resolución</h2></div>
   <form className="form-grid" onSubmit={submit}>
    <label>Número<input required value={form.number} onChange={e=>setForm({...form,number:e.target.value})} placeholder="R-001-2026"/></label>
    <label>Tipo<select value={form.resolution_type} onChange={e=>setForm({...form,resolution_type:e.target.value})}>{TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></label>
    <label>Título<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
    <label>Vigencia<input type="date" value={form.effective_date} onChange={e=>setForm({...form,effective_date:e.target.value})}/></label>
    <label>Fuente normativa<input value={form.source_regulation} onChange={e=>setForm({...form,source_regulation:e.target.value})} placeholder="Art. Reglamento JAA…"/></label>
    <label className="span-2">Contenido<textarea rows={4} required value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/></label>
    <button className="primary">Crear resolución</button>
   </form></section>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {items.length===0&&<div className="panel"><div className="empty empty-state"><Scale size={22}/><p>Sin resoluciones registradas.</p></div></div>}
   {items.map(r=><article key={r.id} className="panel"><strong>{r.number} · {r.title}</strong><span>{r.resolution_type} · {r.status}</span><small>Vigencia {r.effective_date||'por definir'}</small>{r.requires_validation&&<span className="status-badge draft"><ShieldAlert size={13}/>Requiere validación institucional</span>}</article>)}
  </div>
 </main>;
}
