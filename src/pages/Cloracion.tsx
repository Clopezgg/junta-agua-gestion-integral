import {useCallback,useEffect,useState} from 'react';
import {Droplet,Plus,RefreshCw} from 'lucide-react';
import {listChlorinationLogs,listWaterSources,registerChlorination} from '../features/water/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {formatDateTime} from '../design-system/utils';

type Log={id:string;recorded_at:string;source_id:string|null;point:string;residual_chlorine:number;chlorine_dose:number|null};
type Source={id:string;name:string};
const POINTS=['entrada','salida','tanque','red'];

export function Cloracion(){
  const auth=useAuth();
  const [items,setItems]=useState<Log[]>([]);
  const [sources,setSources]=useState<Source[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({source_id:'',point:'salida',residual:'',dose:'',product:'',responsible:''});

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([listChlorinationLogs(),listWaterSources()])
      .then(([l,s])=>{setItems((l as Log[])??[]);setSources((s as Source[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    try{
      await registerChlorination({p_source_id:form.source_id||null,p_point:form.point,
        p_residual_clorine:Number(form.residual),p_chlorine_dose:form.dose?Number(form.dose):null});
      setForm({source_id:'',point:'salida',residual:'',dose:'',product:'',responsible:''});
      setOpen(false);setNotice('Cloración registrada.');load();
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Cloración</h1><p>Dosificación y cloro residual por punto de control.</p></div>
      {auth.has('water.manage')&&<Button icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>Registrar cloración</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&items.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<section className="ja-list">
      {items.length===0
        ?<EmptyState icon={<Droplet size={22}/>} title="Sin registros" description="Registre la cloración diaria por punto."/>
        :items.map(l=><article key={l.id} className="ja-list-row">
          <div>
            <strong>Cloro residual {l.residual_chlorine} mg/L</strong>
            <span className="ja-cell-sub">{formatDateTime(l.recorded_at)}{l.chlorine_dose?` · dosis ${l.chlorine_dose} mg/L`:''}</span>
          </div>
          <Badge tone="neutral">{l.point}</Badge>
        </article>)}
    </section>}

    <Dialog open={open} onClose={()=>setOpen(false)} title="Registrar cloración">
      <form className="ja-pos-fields" onSubmit={submit}>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Fuente</span><select className="ja-control" value={form.source_id} onChange={e=>setForm({...form,source_id:e.target.value})}><option value="">Sin fuente</option>{sources.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Punto</span><select className="ja-control" value={form.point} onChange={e=>setForm({...form,point:e.target.value})}>{POINTS.map(p=><option key={p} value={p}>{p}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Cloro residual (mg/L)</span><input className="ja-control" type="number" step="0.01" required value={form.residual} onChange={e=>setForm({...form,residual:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Dosis (mg/L)</span><input className="ja-control" type="number" step="0.01" value={form.dose} onChange={e=>setForm({...form,dose:e.target.value})}/></label>
        </div>
        <Button type="submit" icon={<Plus size={15}/>}>Registrar</Button>
      </form>
    </Dialog>
  </main>;
}
