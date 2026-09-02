import {useCallback,useEffect,useState} from 'react';
import {FlaskConical,Plus,RefreshCw} from 'lucide-react';
import {listWaterSamples,listWaterSources,registerWaterSample} from '../features/water/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {formatDateTime} from '../design-system/utils';

type Sample={id:string;code:string;source_id:string|null;sample_date:string;chlorine_residual:number|null;turbidity:number|null;ph:number|null;status:string};
type Source={id:string;name:string};

export function Calidad(){
  const auth=useAuth();
  const [items,setItems]=useState<Sample[]>([]);
  const [sources,setSources]=useState<Source[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({source_id:'',chlorine_residual:'',turbidity:'',ph:'',laboratory:'',notes:''});

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([listWaterSamples(),listWaterSources()])
      .then(([s,src])=>{setItems((s as Sample[])??[]);setSources((src as Source[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    try{
      await registerWaterSample({source_id:form.source_id||null,
        chlorine_residual:form.chlorine_residual?Number(form.chlorine_residual):null,
        turbidity:form.turbidity?Number(form.turbidity):null,
        ph:form.ph?Number(form.ph):null,
        laboratory:form.laboratory||null,notes:form.notes||null,status:'resultado'});
      setForm({source_id:'',chlorine_residual:'',turbidity:'',ph:'',laboratory:'',notes:''});
      setOpen(false);setNotice('Muestra registrada.');load();
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Calidad del agua</h1><p>Muestras y parámetros medidos. Los límites regulatorios se configuran aparte, no se asumen.</p></div>
      {auth.has('water.manage')&&<Button icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>Registrar muestra</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&items.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<section className="ja-list">
      {items.length===0
        ?<EmptyState icon={<FlaskConical size={22}/>} title="Sin muestras" description="Registre una muestra para dar seguimiento a la calidad."/>
        :items.map(s=><article key={s.id} className="ja-list-row">
          <div>
            <strong>{s.code}</strong>
            <span className="ja-cell-sub">{formatDateTime(s.sample_date)} · Cloro {s.chlorine_residual??'—'} mg/L · Turbidez {s.turbidity??'—'} UNT · pH {s.ph??'—'}</span>
          </div>
          <Badge tone="neutral">{s.status}</Badge>
        </article>)}
    </section>}

    <Dialog open={open} onClose={()=>setOpen(false)} title="Registrar muestra" description="Sólo se guardan los valores medidos; no se emite un veredicto automático de cumplimiento.">
      <form className="ja-pos-fields" onSubmit={submit}>
        <label className="ja-field"><span className="ja-field-label">Fuente</span><select className="ja-control" value={form.source_id} onChange={e=>setForm({...form,source_id:e.target.value})}><option value="">Sin fuente específica</option>{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Cloro residual (mg/L)</span><input className="ja-control" type="number" step="0.01" value={form.chlorine_residual} onChange={e=>setForm({...form,chlorine_residual:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Turbidez (UNT)</span><input className="ja-control" type="number" step="0.01" value={form.turbidity} onChange={e=>setForm({...form,turbidity:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">pH</span><input className="ja-control" type="number" step="0.01" value={form.ph} onChange={e=>setForm({...form,ph:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Laboratorio</span><input className="ja-control" value={form.laboratory} onChange={e=>setForm({...form,laboratory:e.target.value})}/></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Observación / acción correctiva</span><textarea className="ja-control" rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
        <Button type="submit" icon={<Plus size={15}/>}>Registrar muestra</Button>
      </form>
    </Dialog>
  </main>;
}
