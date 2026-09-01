import {useEffect,useState} from 'react';
import {FlaskConical,Plus} from 'lucide-react';
import {listWaterSamples,registerWaterSample,listWaterSources} from '../features/water/service';
import {useAuth} from '../contexts/AuthContext';

type Sample={id:string;code:string;source_id:string|null;sample_date:string;chlorine_residual:number|null;turbidity:number|null;ph:number|null;status:string};
type Source={id:string;name:string};

export function Calidad(){
 const auth=useAuth();
 const [items,setItems]=useState<Sample[]>([]);
 const [sources,setSources]=useState<Source[]>([]);
 const [error,setError]=useState('');
 const [form,setForm]=useState({source_id:'',chlorine_residual:'',turbidity:'',ph:''});
 const load=()=>{void Promise.all([listWaterSamples(),listWaterSources()]).then(([s,src])=>{setItems((s as Sample[])??[]);setSources((src as Source[])??[])}).catch(()=>setError('No se pudieron cargar las muestras.'));};
 useEffect(load,[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();try{await registerWaterSample({source_id:form.source_id||null,chlorine_residual:form.chlorine_residual?Number(form.chlorine_residual):null,turbidity:form.turbidity?Number(form.turbidity):null,ph:form.ph?Number(form.ph):null,status:'resultado'});setForm({source_id:'',chlorine_residual:'',turbidity:'',ph:''});load();}catch(err){setError((err as Error).message);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Agua y ambiente</span><h1>Calidad del agua</h1><p>Muestras, parámetros y su cumplimiento frente a límites configurables.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  {auth.has('water.manage')&&<section className="panel"><div className="panel-heading"><h2><Plus size={18}/> Registrar muestra</h2></div>
   <form className="form-grid" onSubmit={submit}>
    <label>Fuente<select value={form.source_id} onChange={e=>setForm({...form,source_id:e.target.value})}><option value="">—</option>{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label>Cloro residual (mg/L)<input type="number" step="0.1" value={form.chlorine_residual} onChange={e=>setForm({...form,chlorine_residual:e.target.value})}/></label>
    <label>Turbidez (UNT)<input type="number" step="0.1" value={form.turbidity} onChange={e=>setForm({...form,turbidity:e.target.value})}/></label>
    <label>pH<input type="number" step="0.1" value={form.ph} onChange={e=>setForm({...form,ph:e.target.value})}/></label>
    <button className="primary">Registrar muestra</button>
   </form></section>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {items.length===0&&<div className="panel"><div className="empty empty-state"><FlaskConical size={22}/><p>Sin muestras registradas.</p></div></div>}
   {items.map(s=><article key={s.id} className="panel"><strong>{s.code}</strong><span>{s.status}</span><small>{new Date(s.sample_date).toLocaleString('es-HN')}</small><small>Cloro {s.chlorine_residual??'–'} · Turbidez {s.turbidity??'–'} · pH {s.ph??'–'}</small></article>)}
  </div>
 </main>;
}
