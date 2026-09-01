import {useEffect,useState} from 'react';
import {Droplets,Plus} from 'lucide-react';
import {listWaterSources,listWatersheds,registerWaterSource} from '../features/water/service';
import {useAuth} from '../contexts/AuthContext';

type Source={id:string;code:string;name:string;source_type:string;status:string;location:string|null;estimated_flow:number|null};
type Watershed={id:string;name:string;code:string|null};
const STYPES=['manantial','pozo','rio','quebrada','naciente','toma_superficial'];

export function Fuentes(){
 const auth=useAuth();
 const [sources,setSources]=useState<Source[]>([]);
 const [watersheds,setWatersheds]=useState<Watershed[]>([]);
 const [error,setError]=useState('');
 const [form,setForm]=useState({code:'',name:'',source_type:'manantial',location:''});
 const load=()=>{void Promise.all([listWaterSources(),listWatersheds()]).then(([s,w])=>{setSources((s as Source[])??[]);setWatersheds((w as Watershed[])??[])}).catch(()=>setError('No se pudieron cargar las fuentes.'));};
 useEffect(load,[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();try{await registerWaterSource({p_code:form.code,p_name:form.name,p_source_type:form.source_type,p_location:form.location||null});setForm({code:'',name:'',source_type:'manantial',location:''});load();}catch(err){setError((err as Error).message);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Agua y ambiente</span><h1>Fuentes de agua</h1><p>Registro de fuentes, captaciones y su caudal estimado.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  {auth.has('water.manage')&&<section className="panel"><div className="panel-heading"><h2><Plus size={18}/> Registrar fuente</h2></div>
   <form className="form-grid" onSubmit={submit}>
    <label>Código<input required value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></label>
    <label>Nombre<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <label>Tipo<select value={form.source_type} onChange={e=>setForm({...form,source_type:e.target.value})}>{STYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></label>
    <label>Ubicación<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label>
    <button className="primary">Guardar fuente</button>
   </form></section>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {sources.length===0&&<div className="panel"><div className="empty empty-state"><Droplets size={22}/><p>Sin fuentes registradas.</p></div></div>}
   {sources.map(s=><article key={s.id} className="panel"><strong>{s.code} · {s.name}</strong><span>{s.source_type} · {s.status}</span><small>{s.location||'Sin ubicación'}{s.estimated_flow?` · Caudal ${s.estimated_flow} L/s`:''}</small></article>)}
  </div>
  {watersheds.length>0&&<section className="panel" style={{marginTop:'1rem'}}><h2>Microcuencas asociadas</h2><ul>{watersheds.map(w=><li key={w.id}>{w.name} ({w.code||'sin código'})</li>)}</ul></section>}
 </main>;
}
