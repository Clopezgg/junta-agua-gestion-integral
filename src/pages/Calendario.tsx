import {useEffect,useState} from 'react';
import {CalendarDays,Plus} from 'lucide-react';
import {listCalendarEvents,createCalendarEvent} from '../features/compliance/service';
import {useAuth} from '../contexts/AuthContext';

type Event={id:string;title:string;event_date:string;event_kind:string;description:string|null};
const KINDS=['regulatorio','institucional','operativo','financiero','social'];

export function Calendario(){
 const auth=useAuth();
 const [items,setItems]=useState<Event[]>([]);
 const [error,setError]=useState('');
 const year=new Date().getFullYear();
 const [form,setForm]=useState({title:'',event_date:'',event_kind:'institucional',description:''});
 const load=()=>{void listCalendarEvents(year).then(i=>setItems((i as Event[])??[])).catch(()=>setError('No se pudo cargar el calendario.'));};
 useEffect(load,[year]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();try{await createCalendarEvent({p_title:form.title,p_event_date:form.event_date,p_event_kind:form.event_kind,p_description:form.description||null,p_compliance_ref:null});setForm({title:'',event_date:'',event_kind:'institucional',description:''});load();}catch(err){setError((err as Error).message);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Cumplimiento</span><h1>Calendario</h1><p>Calendario institucional, regulatorio y operativo de la JAA · {year}.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  {auth.has('calendar.manage')&&<section className="panel"><div className="panel-heading"><h2><Plus size={18}/> Nuevo evento</h2></div>
   <form className="form-grid" onSubmit={submit}>
    <label>Título<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
    <label>Fecha<input type="date" required value={form.event_date} onChange={e=>setForm({...form,event_date:e.target.value})}/></label>
    <label>Tipo<select value={form.event_kind} onChange={e=>setForm({...form,event_kind:e.target.value})}>{KINDS.map(k=><option key={k} value={k}>{k}</option>)}</select></label>
    <label>Descripción<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
    <button className="primary">Guardar</button>
   </form></section>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {items.length===0&&<div className="panel"><div className="empty empty-state"><CalendarDays size={22}/><p>Sin eventos para {year}.</p></div></div>}
   {items.map(ev=><article key={ev.id} className="panel"><strong>{ev.title}</strong><span>{ev.event_kind}</span><small>{new Date(ev.event_date+'T00:00:00').toLocaleDateString('es-HN')}</small>{ev.description&&<small>{ev.description}</small>}</article>)}
  </div>
 </main>;
}
