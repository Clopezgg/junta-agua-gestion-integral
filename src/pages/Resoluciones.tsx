import {useCallback,useEffect,useState} from 'react';
import {Plus,RefreshCw,Scale,ShieldAlert} from 'lucide-react';
import {createResolution,listResolutions} from '../features/governance/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {formatDate} from '../design-system/utils';

type Resolution={id:string;number:string;title:string;resolution_type:string;status:string;effective_date:string|null;requires_validation:boolean};
const TYPES=['tarifa','reglamento_interno','gobierno','financiera','operativa','sancion','otra'];
const TYPE_LABEL:Record<string,string>={tarifa:'Tarifa',reglamento_interno:'Reglamento interno',gobierno:'Gobierno',financiera:'Financiera',operativa:'Operativa',sancion:'Sanción',otra:'Otra'};
const STATUS_TONE:Record<string,'neutral'|'warning'|'success'>={borrador:'warning',vigente:'success',derogada:'neutral'};

export function Resoluciones(){
  const auth=useAuth();
  const manage=auth.has('governance.manage');
  const [items,setItems]=useState<Resolution[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({number:'',resolution_type:'gobierno',title:'',content:'',effective_date:'',source_regulation:''});

  const load=useCallback(()=>{
    setLoading(true);
    void listResolutions()
      .then(i=>{setItems((i as Resolution[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    try{
      await createResolution({p_number:form.number.trim(),p_resolution_type:form.resolution_type,p_title:form.title.trim(),
        p_content:form.content.trim(),p_effective_date:form.effective_date||null,p_source_regulation:form.source_regulation.trim()||null});
      setForm({number:'',resolution_type:'gobierno',title:'',content:'',effective_date:'',source_regulation:''});
      setOpen(false);setNotice('Resolución creada.');load();
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Resoluciones</h1><p>Documentos normativos con numeración correlativa y estado de vigencia.</p></div>
      {manage&&<Button icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>Nueva resolución</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&items.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<section className="ja-list">
      {items.length===0
        ?<EmptyState icon={<Scale size={22}/>} title="Sin resoluciones registradas" description="Registre las resoluciones de la Junta con su numeración."/>
        :items.map(r=><article key={r.id} className="ja-list-row">
          <div>
            <strong>{r.number} · {r.title}</strong>
            <span className="ja-cell-sub">
              {TYPE_LABEL[r.resolution_type]??r.resolution_type} · vigencia {r.effective_date?formatDate(r.effective_date):'por definir'}
              {r.requires_validation&&<> · <ShieldAlert size={12}/> requiere validación institucional</>}
            </span>
          </div>
          <Badge tone={STATUS_TONE[r.status]??'neutral'}>{r.status}</Badge>
        </article>)}
    </section>}

    <Dialog open={open} onClose={()=>setOpen(false)} title="Nueva resolución">
      <form className="ja-pos-fields" onSubmit={submit}>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Número</span>
            <input className="ja-control" required value={form.number} onChange={e=>setForm({...form,number:e.target.value})} placeholder="R-001-2026"/>
          </label>
          <label className="ja-field"><span className="ja-field-label">Tipo</span>
            <select className="ja-control" value={form.resolution_type} onChange={e=>setForm({...form,resolution_type:e.target.value})}>
              {TYPES.map(t=><option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Título</span>
          <input className="ja-control" required minLength={3} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
        </label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Vigencia</span>
            <input className="ja-control" type="date" value={form.effective_date} onChange={e=>setForm({...form,effective_date:e.target.value})}/>
          </label>
          <label className="ja-field"><span className="ja-field-label">Fuente normativa</span>
            <input className="ja-control" value={form.source_regulation} onChange={e=>setForm({...form,source_regulation:e.target.value})} placeholder="Art. Reglamento JAA…"/>
          </label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Contenido</span>
          <textarea className="ja-control" rows={5} required minLength={20} value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/>
        </label>
        <Button type="submit">Crear resolución</Button>
      </form>
    </Dialog>
  </main>;
}
