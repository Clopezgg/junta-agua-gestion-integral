import {useEffect,useState} from 'react';
import {CalendarDays,Plus} from 'lucide-react';
import {createMeeting,listMeetings,saveMinutes} from '../features/governance/service';
import {useAuth} from '../contexts/AuthContext';

type Meeting={id:string;reunion_type:string;status:string;title:string;scheduled_at:string;place:string|null};
const TYPES=['asamblea_general','junta_directiva','comite','informe'];

export function Reuniones(){
 const auth=useAuth();
 const [items,setItems]=useState<Meeting[]>([]);
 const [error,setError]=useState('');
 const [form,setForm]=useState({title:'',reunion_type:'junta_directiva',scheduled_at:'',place:''});
 const load=()=>{void listMeetings().then(setItems).catch(()=>setError('No se pudieron cargar las reuniones.'));};
 useEffect(load,[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();try{await createMeeting({p_reunion_type:form.reunion_type,p_title:form.title,p_scheduled_at:form.scheduled_at,p_place:form.place||null});setForm({title:'',reunion_type:'junta_directiva',scheduled_at:'',place:''});load();}catch(err){setError((err as Error).message);}};
 const acta=async(m:Meeting)=>{const content=prompt('Contenido del acta');if(!content)return;try{await saveMinutes(m.id,content);load();}catch(err){setError((err as Error).message);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Gobierno</span><h1>Reuniones y actas</h1><p>Registro de reuniones y sus actas (borrador → aprobada → firmada).</p></div></div>
  {error&&<div className="notice">{error}</div>}
  {auth.has('governance.manage')&&<section className="panel"><div className="panel-heading"><h2><Plus size={18}/> Programar reunión</h2></div>
   <form className="form-grid" onSubmit={submit}>
    <label>Título<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
    <label>Tipo<select value={form.reunion_type} onChange={e=>setForm({...form,reunion_type:e.target.value})}>{TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></label>
    <label>Fecha y hora<input type="datetime-local" required value={form.scheduled_at} onChange={e=>setForm({...form,scheduled_at:e.target.value})}/></label>
    <label>Lugar<input value={form.place} onChange={e=>setForm({...form,place:e.target.value})}/></label>
    <button className="primary">Programar</button>
   </form></section>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {items.length===0&&<div className="panel"><div className="empty empty-state"><CalendarDays size={22}/><p>Sin reuniones registradas.</p></div></div>}
   {items.map(m=><article key={m.id} className="panel"><strong>{m.title}</strong><span>{m.reunion_type} · {m.status}</span><small>{new Date(m.scheduled_at).toLocaleString('es-HN')}{m.place?` · ${m.place}`:''}</small>{auth.has('governance.manage')&&<button className="outline" style={{marginTop:'0.5rem'}} onClick={()=>acta(m)}>Redactar acta</button>}</article>)}
  </div>
 </main>;
}
