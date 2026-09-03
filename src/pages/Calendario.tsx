import {useCallback,useEffect,useState} from 'react';
import {CalendarDays,Plus,RefreshCw} from 'lucide-react';
import {createCalendarEvent,listCalendarEvents} from '../features/compliance/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {formatDate} from '../design-system/utils';

type Event={id:string;title:string;event_date:string;event_kind:string;description:string|null};
const KINDS=['regulatorio','institucional','operativo','financiero','social'];
const KIND_LABEL:Record<string,string>={regulatorio:'Regulatorio',institucional:'Institucional',operativo:'Operativo',financiero:'Financiero',social:'Social'};
const KIND_TONE:Record<string,'neutral'|'warning'|'success'>={regulatorio:'warning',financiero:'warning',institucional:'neutral',operativo:'neutral',social:'success'};

export function Calendario(){
  const auth=useAuth();
  const manage=auth.has('calendar.manage');
  const year=new Date().getFullYear();
  const [items,setItems]=useState<Event[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({title:'',event_date:'',event_kind:'institucional',description:''});

  const load=useCallback(()=>{
    setLoading(true);
    void listCalendarEvents(year)
      .then(i=>{setItems((i as Event[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[year]);
  useEffect(load,[load]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    try{
      await createCalendarEvent({p_title:form.title.trim(),p_event_date:form.event_date,p_event_kind:form.event_kind,
        p_description:form.description.trim()||null,p_compliance_ref:null});
      setForm({title:'',event_date:'',event_kind:'institucional',description:''});
      setOpen(false);setNotice('Evento agregado al calendario.');load();
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Calendario · {year}</h1><p>Calendario institucional, regulatorio y operativo de la Junta.</p></div>
      {manage&&<Button icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>Nuevo evento</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&items.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<section className="ja-list">
      {items.length===0
        ?<EmptyState icon={<CalendarDays size={22}/>} title={`Sin eventos para ${year}`} description="Registre las fechas regulatorias, institucionales y operativas del año."/>
        :items.map(ev=><article key={ev.id} className="ja-list-row">
          <div>
            <strong>{ev.title}</strong>
            <span className="ja-cell-sub">{formatDate(ev.event_date)}{ev.description?` · ${ev.description}`:''}</span>
          </div>
          <Badge tone={KIND_TONE[ev.event_kind]??'neutral'}>{KIND_LABEL[ev.event_kind]??ev.event_kind}</Badge>
        </article>)}
    </section>}

    <Dialog open={open} onClose={()=>setOpen(false)} title="Nuevo evento del calendario">
      <form className="ja-pos-fields" onSubmit={submit}>
        <label className="ja-field"><span className="ja-field-label">Título</span>
          <input className="ja-control" required minLength={3} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
        </label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Fecha</span>
            <input className="ja-control" type="date" required value={form.event_date} onChange={e=>setForm({...form,event_date:e.target.value})}/>
          </label>
          <label className="ja-field"><span className="ja-field-label">Tipo</span>
            <select className="ja-control" value={form.event_kind} onChange={e=>setForm({...form,event_kind:e.target.value})}>
              {KINDS.map(k=><option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Descripción</span>
          <input className="ja-control" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
        </label>
        <Button type="submit">Guardar</Button>
      </form>
    </Dialog>
  </main>;
}
