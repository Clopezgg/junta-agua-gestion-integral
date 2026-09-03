import {useCallback,useEffect,useState} from 'react';
import {Droplets,Plus,RefreshCw} from 'lucide-react';
import {listWaterSources,listWatersheds,registerWaterSource} from '../features/water/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';

type Source={id:string;code:string;name:string;source_type:string;status:string;location:string|null;estimated_flow:number|null};
type Watershed={id:string;name:string;code:string|null};
const STYPES=['manantial','pozo','rio','quebrada','naciente','toma_superficial'];

export function Fuentes(){
  const auth=useAuth();
  const [sources,setSources]=useState<Source[]>([]);
  const [watersheds,setWatersheds]=useState<Watershed[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({code:'',name:'',source_type:'manantial',location:'',risks:''});

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([listWaterSources(),listWatersheds()])
      .then(([s,w])=>{setSources((s as Source[])??[]);setWatersheds((w as Watershed[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    try{
      await registerWaterSource({p_code:form.code,p_name:form.name,p_source_type:form.source_type,p_location:form.location||null});
      setForm({code:'',name:'',source_type:'manantial',location:'',risks:''});
      setOpen(false);setNotice('Fuente registrada.');load();
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Fuentes de agua</h1><p>Captaciones, tipo, ubicación y caudal estimado.</p></div>
      {auth.has('water.manage')&&<Button icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>Registrar fuente</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&sources.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<>
      <section className="ja-list">
        {sources.length===0
          ?<EmptyState icon={<Droplets size={22}/>} title="Sin fuentes" description="Registre las fuentes que abastecen el sistema."/>
          :sources.map(s=><article key={s.id} className="ja-list-row">
            <div>
              <strong>{s.code} · {s.name}</strong>
              <span className="ja-cell-sub">{s.source_type} · {s.location||'sin ubicación'}{s.estimated_flow?` · ${s.estimated_flow} L/s`:''}</span>
            </div>
            <Badge tone={s.status==='active'||s.status==='activa'?'success':'neutral'}>{s.status}</Badge>
          </article>)}
      </section>
      {watersheds.length>0&&<section className="ja-list">
        <h3 className="ja-list-heading">Microcuencas asociadas</h3>
        {watersheds.map(w=><article key={w.id} className="ja-list-row"><div><strong>{w.name}</strong><span className="ja-cell-sub">{w.code||'sin código'}</span></div></article>)}
      </section>}
    </>}

    <Dialog open={open} onClose={()=>setOpen(false)} title="Registrar fuente">
      <form className="ja-pos-fields" onSubmit={submit}>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Código</span><input className="ja-control" required value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Nombre</span><input className="ja-control" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Tipo</span><select className="ja-control" value={form.source_type} onChange={e=>setForm({...form,source_type:e.target.value})}>{STYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Ubicación</span><input className="ja-control" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Riesgos observados</span><textarea className="ja-control" rows={2} value={form.risks} onChange={e=>setForm({...form,risks:e.target.value})}/></label>
        <Button type="submit" icon={<Plus size={15}/>}>Guardar fuente</Button>
      </form>
    </Dialog>
  </main>;
}
