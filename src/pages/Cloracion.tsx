import {useEffect,useState} from 'react';
import {FlaskConical,Plus} from 'lucide-react';
import {listChlorinationLogs,registerChlorination,listWaterSources} from '../features/water/service';
import {useAuth} from '../contexts/AuthContext';

type Log={id:string;recorded_at:string;source_id:string|null;point:string;residual_chlorine:number;chlorine_dose:number|null};
type Source={id:string;name:string};
const POINTS=['entrada','salida','tanque','red'];

export function Cloracion(){
 const auth=useAuth();
 const [items,setItems]=useState<Log[]>([]);
 const [sources,setSources]=useState<Source[]>([]);
 const [error,setError]=useState('');
 const [form,setForm]=useState({source_id:'',point:'salida',residual:'',dose:''});
 const load=()=>{void Promise.all([listChlorinationLogs(),listWaterSources()]).then(([l,s])=>{setItems((l as Log[])??[]);setSources((s as Source[])??[])}).catch(()=>setError('No se pudieron cargar los registros.'));};
 useEffect(load,[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();try{await registerChlorination({p_source_id:form.source_id||null,p_point:form.point,p_residual_clorine:Number(form.residual),p_chlorine_dose:form.dose?Number(form.dose):null});setForm({source_id:'',point:'salida',residual:'',dose:''});load();}catch(err){setError((err as Error).message);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Agua y ambiente</span><h1>Cloración</h1><p>Registro de dosificación y cloro residual por punto de control.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  {auth.has('water.manage')&&<section className="panel"><div className="panel-heading"><h2><Plus size={18}/> Registrar cloración</h2></div>
   <form className="form-grid" onSubmit={submit}>
    <label>Fuente<select value={form.source_id} onChange={e=>setForm({...form,source_id:e.target.value})}><option value="">—</option>{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label>Punto<select value={form.point} onChange={e=>setForm({...form,point:e.target.value})}>{POINTS.map(p=><option key={p} value={p}>{p}</option>)}</select></label>
    <label>Cloro residual (mg/L)<input type="number" step="0.1" required value={form.residual} onChange={e=>setForm({...form,residual:e.target.value})}/></label>
    <label>Dosis (mg/L)<input type="number" step="0.1" value={form.dose} onChange={e=>setForm({...form,dose:e.target.value})}/></label>
    <button className="primary">Registrar</button>
   </form></section>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {items.length===0&&<div className="panel"><div className="empty empty-state"><FlaskConical size={22}/><p>Sin registros de cloración.</p></div></div>}
   {items.map(l=><article key={l.id} className="panel"><strong>Cloro residual {l.residual_chlorine} mg/L</strong><span>Punto {l.point}</span><small>{new Date(l.recorded_at).toLocaleString('es-HN')}{l.chlorine_dose?` · Dosis ${l.chlorine_dose}`:''}</small></article>)}
  </div>
 </main>;
}
