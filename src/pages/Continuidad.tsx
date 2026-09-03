import {useCallback,useEffect,useState} from 'react';
import {CalendarDays,Plus,RefreshCw} from 'lucide-react';
import {createRationalization,listRationalizations} from '../features/water/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {formatDateTime} from '../design-system/utils';

type Rational={id:string;rational_type:string;status:string;title:string;description:string|null;zones:string[]|null;starts_at:string;ends_at:string|null};
const TYPES=[
  {value:'racionamiento',label:'Racionamiento'},
  {value:'corte_planificado',label:'Corte planificado'},
  {value:'horario_restriccion',label:'Restricción horaria'},
];

export function Continuidad(){
  const auth=useAuth();
  const [items,setItems]=useState<Rational[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({rational_type:'racionamiento',title:'',starts_at:'',ends_at:'',description:'',zones:''});

  const load=useCallback(()=>{
    setLoading(true);
    void listRationalizations()
      .then(i=>{setItems((i as Rational[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    try{
      await createRationalization({
        p_rational_type:form.rational_type,p_title:form.title.trim(),
        p_starts_at:form.starts_at,p_ends_at:form.ends_at||null,
        p_description:form.description||null,
        p_zones:form.zones.trim()?form.zones.split(',').map(z=>z.trim()).filter(Boolean):null,
      });
      setForm({rational_type:'racionamiento',title:'',starts_at:'',ends_at:'',description:'',zones:''});
      setOpen(false);setNotice('Racionamiento programado.');load();
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Continuidad y racionamientos</h1><p>Horarios de servicio, racionamientos y cortes planificados por zona.</p></div>
      {auth.has('water.manage')&&<Button icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>Nuevo racionamiento</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&items.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<section className="ja-list">
      {items.length===0
        ?<EmptyState icon={<CalendarDays size={22}/>} title="Sin racionamientos" description="No hay cortes ni racionamientos programados."/>
        :items.map(r=><article key={r.id} className="ja-list-row">
          <div>
            <strong>{r.title}</strong>
            <span className="ja-cell-sub">{formatDateTime(r.starts_at)}{r.ends_at?` → ${formatDateTime(r.ends_at)}`:''}{r.zones&&r.zones.length>0?` · ${r.zones.join(', ')}`:''}</span>
          </div>
          <Badge tone="neutral">{r.rational_type}</Badge>
          <Badge tone={r.status==='activo'?'warning':'neutral'}>{r.status}</Badge>
        </article>)}
    </section>}

    <Dialog open={open} onClose={()=>setOpen(false)} title="Nuevo racionamiento">
      <form className="ja-pos-fields" onSubmit={submit}>
        <label className="ja-field"><span className="ja-field-label">Título</span><input className="ja-control" required minLength={3} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Tipo</span><select className="ja-control" value={form.rational_type} onChange={e=>setForm({...form,rational_type:e.target.value})}>{TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Inicio</span><input className="ja-control" type="datetime-local" required value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Fin (opcional)</span><input className="ja-control" type="datetime-local" value={form.ends_at} onChange={e=>setForm({...form,ends_at:e.target.value})}/></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Zonas afectadas (separadas por coma)</span><input className="ja-control" value={form.zones} onChange={e=>setForm({...form,zones:e.target.value})} placeholder="Centro, El Achiotal, La Loma"/></label>
        <label className="ja-field"><span className="ja-field-label">Descripción</span><textarea className="ja-control" rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <Button type="submit" icon={<Plus size={15}/>}>Programar</Button>
      </form>
    </Dialog>
  </main>;
}
