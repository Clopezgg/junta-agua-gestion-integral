import {useCallback,useEffect,useState} from 'react';
import {Plus,RefreshCw,Trees} from 'lucide-react';
import {listWatersheds,registerWatershed} from '../features/water/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';

type Watershed={id:string;name:string;code:string|null;protection_status:string|null;description:string|null};
const PROTECTION=['declarada','en_tramite','sin_declarar','privada'];

export function Microcuenca(){
  const auth=useAuth();
  const [items,setItems]=useState<Watershed[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({name:'',code:'',protection_status:'sin_declarar',description:''});

  const load=useCallback(()=>{
    setLoading(true);
    void listWatersheds()
      .then(w=>{setItems((w as Watershed[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    try{
      await registerWatershed({p_name:form.name.trim(),p_code:form.code||null,
        p_protection_status:form.protection_status,p_description:form.description||null});
      setForm({name:'',code:'',protection_status:'sin_declarar',description:''});
      setOpen(false);setNotice('Microcuenca registrada.');load();
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Microcuenca</h1><p>Cuencas de recarga, estado de protección y monitoreo del recurso hídrico.</p></div>
      {auth.has('water.manage')&&<Button icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>Nueva microcuenca</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&items.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<section className="ja-list">
      {items.length===0
        ?<EmptyState icon={<Trees size={22}/>} title="Sin microcuencas" description="Registre las microcuencas que recargan las fuentes."/>
        :items.map(w=><article key={w.id} className="ja-list-row">
          <div>
            <strong>{w.name}</strong>
            <span className="ja-cell-sub">{w.code||'sin código'}{w.description?` · ${w.description}`:''}</span>
          </div>
          <Badge tone={w.protection_status==='declarada'?'success':'neutral'}>{w.protection_status||'sin estado'}</Badge>
        </article>)}
    </section>}

    <Dialog open={open} onClose={()=>setOpen(false)} title="Nueva microcuenca">
      <form className="ja-pos-fields" onSubmit={submit}>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Nombre</span><input className="ja-control" required minLength={3} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Código</span><input className="ja-control" value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Estado de protección</span><select className="ja-control" value={form.protection_status} onChange={e=>setForm({...form,protection_status:e.target.value})}>{PROTECTION.map(p=><option key={p} value={p}>{p}</option>)}</select></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Descripción</span><textarea className="ja-control" rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <Button type="submit" icon={<Plus size={15}/>}>Registrar</Button>
      </form>
    </Dialog>
  </main>;
}
