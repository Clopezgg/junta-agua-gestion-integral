import {useCallback,useEffect,useState} from 'react';
import {Plus,RefreshCw,ShieldCheck} from 'lucide-react';
import {listCompliance,registerCompliance,upsertComplianceStatus} from '../features/compliance/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {formatDate} from '../design-system/utils';

type Obligation={id:string;code:string;title:string;description:string|null;regulation_source:string;regulation_version:string|null;due_date:string|null;status:string;requires_validation:boolean};
const STATUS_TONE:Record<string,'neutral'|'warning'|'success'|'danger'>={pendiente:'warning',en_proceso:'neutral',cumplido:'success',requiere_validacion:'warning',vencido:'danger'};

export function Ersaps(){
  const auth=useAuth();
  const manage=auth.has('compliance.manage');
  const [items,setItems]=useState<Obligation[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({code:'',title:'',regulation_source:'ERSAPS',regulation_version:'',due_date:''});

  const load=useCallback(()=>{
    setLoading(true);
    void listCompliance()
      .then(i=>{setItems((i as Obligation[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    try{
      await registerCompliance({p_code:form.code.trim(),p_title:form.title.trim(),p_regulation_source:form.regulation_source.trim(),
        p_regulation_version:form.regulation_version.trim()||null,p_due_date:form.due_date||null});
      setForm({code:'',title:'',regulation_source:'ERSAPS',regulation_version:'',due_date:''});
      setOpen(false);setNotice('Obligación registrada.');load();
    }catch(err){setError((err as Error).message);}
  }
  async function setStatus(o:Obligation,status:string){
    try{await upsertComplianceStatus(o.id,status);setNotice('Estado actualizado.');load();}
    catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>ERSAPS y cumplimiento regulatorio</h1><p>Obligaciones ante la ERSAPS con fuente y versión normativa configurables.</p></div>
      {manage&&<Button icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>Nueva obligación</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    <div className="ja-banner ja-banner-info">
      Las reglas de cumplimiento se modelan como <strong>configuración con fuente/versión</strong>. Registrar una obligación no implica cumplimiento legal: requiere validación institucional.
    </div>
    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&items.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<section className="ja-list">
      {items.length===0
        ?<EmptyState icon={<ShieldCheck size={22}/>} title="Sin obligaciones registradas" description="Registre las obligaciones regulatorias con su fuente normativa."/>
        :items.map(o=><article key={o.id} className="ja-list-row">
          <div>
            <strong>{o.code} · {o.title}</strong>
            <span className="ja-cell-sub">
              Fuente: {o.regulation_source}{o.regulation_version?` (v${o.regulation_version})`:''} · vence {o.due_date?formatDate(o.due_date):'sin plazo'}
              {o.requires_validation&&' · requiere validación institucional'}
            </span>
            {manage&&<div className="ja-row-actions">
              <Button variant="secondary" onClick={()=>setStatus(o,'cumplido')}>Marcar cumplido</Button>
              <Button variant="secondary" onClick={()=>setStatus(o,'requiere_validacion')}>Requerir validación</Button>
            </div>}
          </div>
          <Badge tone={STATUS_TONE[o.status]??'neutral'}>{o.status}</Badge>
        </article>)}
    </section>}

    <Dialog open={open} onClose={()=>setOpen(false)} title="Nueva obligación de cumplimiento">
      <form className="ja-pos-fields" onSubmit={submit}>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Código</span>
            <input className="ja-control" required value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/>
          </label>
          <label className="ja-field"><span className="ja-field-label">Vence</span>
            <input className="ja-control" type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/>
          </label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Título</span>
          <input className="ja-control" required minLength={3} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
        </label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Fuente normativa</span>
            <input className="ja-control" required value={form.regulation_source} onChange={e=>setForm({...form,regulation_source:e.target.value})}/>
          </label>
          <label className="ja-field"><span className="ja-field-label">Versión</span>
            <input className="ja-control" value={form.regulation_version} onChange={e=>setForm({...form,regulation_version:e.target.value})}/>
          </label>
        </div>
        <Button type="submit">Guardar</Button>
      </form>
    </Dialog>
  </main>;
}
