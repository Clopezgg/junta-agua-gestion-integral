import {useCallback,useEffect,useState} from 'react';
import {CalendarDays,FileText,Plus,RefreshCw} from 'lucide-react';
import {createMeeting,listMeetings,saveMinutes} from '../features/governance/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {formatDateTime} from '../design-system/utils';

type Meeting={id:string;reunion_type:string;status:string;title:string;scheduled_at:string;place:string|null};
const TYPES=['asamblea_general','junta_directiva','comite','informe'];
const TYPE_LABEL:Record<string,string>={asamblea_general:'Asamblea general',junta_directiva:'Junta directiva',comite:'Comité',informe:'Informe'};
const STATUS_TONE:Record<string,'neutral'|'warning'|'success'>={programada:'warning',realizada:'success',cancelada:'neutral'};

export function Reuniones(){
  const auth=useAuth();
  const manage=auth.has('governance.manage');
  const [items,setItems]=useState<Meeting[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({title:'',reunion_type:'junta_directiva',scheduled_at:'',place:''});
  const [acta,setActa]=useState<{meeting:Meeting;content:string}|null>(null);

  const load=useCallback(()=>{
    setLoading(true);
    void listMeetings()
      .then(d=>{setItems((d as Meeting[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    try{
      await createMeeting({p_reunion_type:form.reunion_type,p_title:form.title.trim(),p_scheduled_at:form.scheduled_at,p_place:form.place.trim()||null});
      setForm({title:'',reunion_type:'junta_directiva',scheduled_at:'',place:''});
      setOpen(false);setNotice('Reunión programada.');load();
    }catch(err){setError((err as Error).message);}
  }
  async function submitActa(e:React.FormEvent){
    e.preventDefault();
    if(!acta)return;
    try{
      await saveMinutes(acta.meeting.id,acta.content.trim());
      setActa(null);setNotice('Acta guardada.');load();
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Reuniones y actas</h1><p>Registro de reuniones y sus actas (borrador → aprobada → firmada).</p></div>
      {manage&&<Button icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>Programar reunión</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&items.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<section className="ja-list">
      {items.length===0
        ?<EmptyState icon={<CalendarDays size={22}/>} title="Sin reuniones registradas" description="Programe la próxima reunión de la Junta."/>
        :items.map(m=><article key={m.id} className="ja-list-row">
          <div>
            <strong>{m.title}</strong>
            <span className="ja-cell-sub">{TYPE_LABEL[m.reunion_type]??m.reunion_type} · {formatDateTime(m.scheduled_at)}{m.place?` · ${m.place}`:''}</span>
          </div>
          <div className="ja-row-actions">
            <Badge tone={STATUS_TONE[m.status]??'neutral'}>{m.status}</Badge>
            {manage&&<Button variant="secondary" icon={<FileText size={14}/>} onClick={()=>setActa({meeting:m,content:''})}>Redactar acta</Button>}
          </div>
        </article>)}
    </section>}

    <Dialog open={open} onClose={()=>setOpen(false)} title="Programar reunión">
      <form className="ja-pos-fields" onSubmit={submit}>
        <label className="ja-field"><span className="ja-field-label">Título</span>
          <input className="ja-control" required minLength={3} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
        </label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Tipo</span>
            <select className="ja-control" value={form.reunion_type} onChange={e=>setForm({...form,reunion_type:e.target.value})}>
              {TYPES.map(t=><option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </label>
          <label className="ja-field"><span className="ja-field-label">Fecha y hora</span>
            <input className="ja-control" type="datetime-local" required value={form.scheduled_at} onChange={e=>setForm({...form,scheduled_at:e.target.value})}/>
          </label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Lugar</span>
          <input className="ja-control" value={form.place} onChange={e=>setForm({...form,place:e.target.value})}/>
        </label>
        <Button type="submit">Programar</Button>
      </form>
    </Dialog>

    <Dialog open={!!acta} onClose={()=>setActa(null)} title={acta?`Acta — ${acta.meeting.title}`:'Acta'}
      description="El acta nace como borrador y luego se aprueba y firma.">
      <form className="ja-pos-fields" onSubmit={submitActa}>
        <label className="ja-field"><span className="ja-field-label">Contenido del acta</span>
          <textarea className="ja-control" rows={8} required minLength={20} value={acta?.content??''} onChange={e=>setActa(a=>a&&{...a,content:e.target.value})}/>
        </label>
        <Button type="submit">Guardar acta</Button>
      </form>
    </Dialog>
  </main>;
}
