import {useCallback,useEffect,useState} from 'react';
import {Building2,Plus,RefreshCw} from 'lucide-react';
import {createProject,listProjects} from '../features/governance/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {formatMoney} from '../design-system/utils';

type Project={id:string;code:string;name:string;status:string;funding:string;budget:number;start_date:string|null;end_date:string|null};
const FUNDING=['fondo_propio','cooperacion','fideicomiso','municipal','mixto'];
const FUNDING_LABEL:Record<string,string>={fondo_propio:'Fondo propio',cooperacion:'Cooperación',fideicomiso:'Fideicomiso',municipal:'Municipal',mixto:'Mixto'};
const STATUS_TONE:Record<string,'neutral'|'warning'|'success'>={planificado:'warning',en_ejecucion:'neutral',finalizado:'success'};

export function Proyectos(){
  const auth=useAuth();
  const manage=auth.has('governance.manage');
  const [items,setItems]=useState<Project[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({code:'',name:'',funding:'fondo_propio',budget:'',description:''});

  const load=useCallback(()=>{
    setLoading(true);
    void listProjects()
      .then(i=>{setItems((i as Project[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    try{
      await createProject({p_code:form.code.trim(),p_name:form.name.trim(),p_funding:form.funding,
        p_budget:form.budget?Number(form.budget):0,p_description:form.description.trim()||null});
      setForm({code:'',name:'',funding:'fondo_propio',budget:'',description:''});
      setOpen(false);setNotice('Proyecto creado.');load();
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Proyectos</h1><p>Proyectos de obra, mejoras y saneamiento de la Junta.</p></div>
      {manage&&<Button icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>Nuevo proyecto</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&items.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<section className="ja-list">
      {items.length===0
        ?<EmptyState icon={<Building2 size={22}/>} title="Sin proyectos registrados" description="Registre los proyectos de obra y mejora del sistema."/>
        :items.map(p=><article key={p.id} className="ja-list-row">
          <div>
            <strong>{p.code} · {p.name}</strong>
            <span className="ja-cell-sub">{FUNDING_LABEL[p.funding]??p.funding} · presupuesto {formatMoney(p.budget)}</span>
          </div>
          <Badge tone={STATUS_TONE[p.status]??'neutral'}>{p.status}</Badge>
        </article>)}
    </section>}

    <Dialog open={open} onClose={()=>setOpen(false)} title="Nuevo proyecto">
      <form className="ja-pos-fields" onSubmit={submit}>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Código</span>
            <input className="ja-control" required value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="PROY-001"/>
          </label>
          <label className="ja-field"><span className="ja-field-label">Financiamiento</span>
            <select className="ja-control" value={form.funding} onChange={e=>setForm({...form,funding:e.target.value})}>
              {FUNDING.map(f=><option key={f} value={f}>{FUNDING_LABEL[f]}</option>)}
            </select>
          </label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Nombre</span>
          <input className="ja-control" required minLength={3} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        </label>
        <label className="ja-field"><span className="ja-field-label">Presupuesto (L)</span>
          <input className="ja-control" type="number" min="0" step="0.01" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})}/>
        </label>
        <label className="ja-field"><span className="ja-field-label">Descripción</span>
          <textarea className="ja-control" rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
        </label>
        <Button type="submit">Crear proyecto</Button>
      </form>
    </Dialog>
  </main>;
}
