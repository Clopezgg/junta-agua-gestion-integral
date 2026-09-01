import {useEffect,useState} from 'react';
import {Building2,Plus} from 'lucide-react';
import {createProject,listProjects} from '../features/governance/service';
import {useAuth} from '../contexts/AuthContext';

type Project={id:string;code:string;name:string;status:string;funding:string;budget:number;start_date:string|null;end_date:string|null};
const FUNDING=['fondo_propio','cooperacion','fideicomiso','municipal','mixto'];
const money=(v:unknown)=>`L ${Number(v??0).toLocaleString('es-HN',{minimumFractionDigits:2})}`;

export function Proyectos(){
 const auth=useAuth();
 const [items,setItems]=useState<Project[]>([]);
 const [error,setError]=useState('');
 const [form,setForm]=useState({code:'',name:'',funding:'fondo_propio',budget:'',description:''});
 const load=()=>{void listProjects().then(i=>setItems((i as Project[])??[])).catch(()=>setError('No se pudieron cargar los proyectos.'));};
 useEffect(load,[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();try{await createProject({p_code:form.code,p_name:form.name,p_funding:form.funding,p_budget:form.budget?Number(form.budget):0,p_description:form.description||null});setForm({code:'',name:'',funding:'fondo_propio',budget:'',description:''});load();}catch(err){setError((err as Error).message);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Gobierno</span><h1>Proyectos</h1><p>Proyectos de obra, mejoras y saneamiento de la JAA.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  {auth.has('governance.manage')&&<section className="panel"><div className="panel-heading"><h2><Plus size={18}/> Nuevo proyecto</h2></div>
   <form className="form-grid" onSubmit={submit}>
    <label>Código<input required value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="PROY-001"/></label>
    <label>Nombre<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label>Financiamiento<select value={form.funding} onChange={e=>setForm({...form,funding:e.target.value})}>{FUNDING.map(f=><option key={f} value={f}>{f}</option>)}</select></label>
    <label>Presupuesto (L)<input type="number" min="0" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})}/></label>
    <label className="span-2">Descripción<textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
    <button className="primary">Crear proyecto</button>
   </form></section>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {items.length===0&&<div className="panel"><div className="empty empty-state"><Building2 size={22}/><p>Sin proyectos registrados.</p></div></div>}
   {items.map(p=><article key={p.id} className="panel"><strong>{p.code} · {p.name}</strong><span>{p.status} · {p.funding}</span><small>Presupuesto {money(p.budget)}</small></article>)}
  </div>
 </main>;
}
