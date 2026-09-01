import {useEffect,useState} from 'react';
import {MessagesSquare,Plus} from 'lucide-react';
import {createServiceRequest,listServiceRequests,resolveServiceRequest} from '../features/requests/service';
import {useAuth} from '../contexts/AuthContext';

type Request={id:string;code:string;request_type:string;status:string;subject:string;priority:string;created_at:string};
const TYPES=['solicitud','reclamo','consulta','felicitacion'];
const PRIORITIES=['baja','normal','alta','urgente'];

export function Solicitudes(){
 const auth=useAuth();
 const [items,setItems]=useState<Request[]>([]);
 const [error,setError]=useState('');
 const [form,setForm]=useState({request_type:'solicitud',subject:'',description:'',priority:'normal'});
 const load=()=>{void listServiceRequests().then(i=>setItems((i as Request[])??[])).catch(()=>setError('No se pudieron cargar las solicitudes.'));};
 useEffect(load,[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();try{await createServiceRequest({request_type:form.request_type,channel:'presencial',subject:form.subject,description:form.description,priority:form.priority});setForm({request_type:'solicitud',subject:'',description:'',priority:'normal'});load();}catch(err){setError((err as Error).message);}};
 const resolve=async(id:string)=>{const resolution=prompt('Resolución / seguimiento');if(!resolution)return;try{await resolveServiceRequest(id,resolution);load();}catch(err){setError((err as Error).message);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Usuarios y servicio</span><h1>Solicitudes y reclamos</h1><p>Ventana única de solicitudes, reclamos y consultas del abonado.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  {auth.has('subscribers.create')&&<section className="panel"><div className="panel-heading"><h2><Plus size={18}/> Registrar solicitud</h2></div>
   <form className="form-grid" onSubmit={submit}>
    <label>Tipo<select value={form.request_type} onChange={e=>setForm({...form,request_type:e.target.value})}>{TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></label>
    <label>Prioridad<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>{PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}</select></label>
    <label className="span-2">Asunto<input required value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label>
    <label className="span-2">Descripción<textarea rows={3} required value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
    <button className="primary">Registrar</button>
   </form></section>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {items.length===0&&<div className="panel"><div className="empty empty-state"><MessagesSquare size={22}/><p>Sin solicitudes registradas.</p></div></div>}
   {items.map(r=><article key={r.id} className="panel"><strong>{r.code} · {r.subject}</strong><span>{r.request_type} · {r.status} · {r.priority}</span><small>{new Date(r.created_at).toLocaleString('es-HN')}</small>{r.status==='recibida'&&<button className="outline" style={{marginTop:'0.5rem'}} onClick={()=>resolve(r.id)}>Resolver</button>}</article>)}
  </div>
 </main>;
}
