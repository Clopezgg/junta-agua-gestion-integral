import {useCallback,useEffect,useMemo,useState} from 'react';
import {ArrowRight,Headset,ListChecks,Plus,RefreshCw,UserCheck} from 'lucide-react';
import {assignServiceRequest,createServiceRequest,linkServiceRequestWorkOrder,listServiceRequests,setServiceRequestStatus} from '../features/requests/service';
import {createIncident,listWorkOrders} from '../features/operations/service';
import {listUsers} from '../features/users/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton,Tabs} from '../design-system/primitives';
import {formatDate,formatDateTime} from '../design-system/utils';

type Row=Record<string,any>;
const TYPES:Record<string,string>={solicitud:'Solicitud',reclamo:'Reclamo',consulta:'Consulta',felicitacion:'Felicitación'};
const CHANNELS:Record<string,string>={presencial:'Presencial',telefonico:'Teléfono',whatsapp:'WhatsApp',portal:'Portal',correo:'Correo'};
const STATUS:Record<string,string>={recibida:'Recibida',en_revision:'En revisión',en_proceso:'En proceso',resuelta:'Resuelta',cerrada:'Cerrada',rechazada:'Rechazada'};
const PRIORITY:Record<string,string>={baja:'Baja',normal:'Normal',alta:'Alta',urgente:'Urgente'};
const TRANSI:Record<string,string[]>={recibida:['en_revision','rechazada'],en_revision:['en_proceso','rechazada'],en_proceso:['resuelta'],resuelta:['cerrada'],cerrada:[],rechazada:['en_revision']};
const STATUS_TONE:Record<string,'neutral'|'warning'|'success'|'danger'>={recibida:'warning',en_revision:'neutral',en_proceso:'neutral',resuelta:'success',cerrada:'success',rechazada:'danger'};
const today=()=>new Date().toISOString().slice(0,10);
const FILTERS=[{value:'',label:'Todas'},...Object.keys(STATUS).map(s=>({value:s,label:STATUS[s]}))];

export function Solicitudes(){
  const auth=useAuth();
  const manage=auth.has('operations.manage');
  const canCreate=auth.has('subscribers.create');
  const [rows,setRows]=useState<Row[]>([]);
  const [users,setUsers]=useState<Row[]>([]);
  const [orders,setOrders]=useState<Row[]>([]);
  const [filter,setFilter]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [creating,setCreating]=useState(false);
  const [detail,setDetail]=useState<Row|null>(null);
  const [assignTo,setAssignTo]=useState('');
  const [linkOrder,setLinkOrder]=useState('');
  const [resolution,setResolution]=useState('');
  const [draft,setDraft]=useState({request_type:'solicitud',subject:'',description:'',priority:'normal',channel:'presencial',due_date:''});

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([listServiceRequests(),listUsers(),listWorkOrders()])
      .then(([r,u,o])=>{setRows(r as Row[]);setUsers(u as Row[]);setOrders(o as Row[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  const counts=useMemo(()=>({
    recibida:rows.filter(r=>r.status==='recibida').length,
    proceso:rows.filter(r=>r.status==='en_proceso').length,
    urgente:rows.filter(r=>r.priority==='urgente'&&!['resuelta','cerrada','rechazada'].includes(r.status)).length,
    atrasada:rows.filter(r=>r.due_date&&r.due_date<today()&&!['resuelta','cerrada','rechazada'].includes(r.status)).length,
  }),[rows]);
  const visible=rows.filter(r=>!filter||r.status===filter);
  const userLabel=(id:string)=>{const u=users.find(x=>x.id===id);return u?(u.full_name||u.name||u.email||'Usuario'):'Sin asignar';};

  async function refreshDetail(id:string){
    const fresh=await listServiceRequests();
    setRows(fresh as Row[]);setDetail((fresh as Row[]).find(r=>r.id===id)??null);
  }
  async function save(e:React.FormEvent){
    e.preventDefault();
    try{
      await createServiceRequest({...draft,subject:draft.subject.trim(),description:draft.description.trim(),due_date:draft.due_date||null});
      setCreating(false);setDraft({request_type:'solicitud',subject:'',description:'',priority:'normal',channel:'presencial',due_date:''});
      setNotice('Solicitud registrada y auditada.');load();
    }catch(err){setError((err as Error).message);}
  }
  async function assign(){
    if(!detail||!assignTo)return;
    try{await assignServiceRequest(detail.id,assignTo);setAssignTo('');setNotice('Solicitud asignada.');await refreshDetail(detail.id);}
    catch(err){setError((err as Error).message);}
  }
  async function changeStatus(target:string){
    if(!detail)return;
    try{
      const note=target==='resuelta'||target==='cerrada'?resolution.trim().slice(0,500):null;
      await setServiceRequestStatus(detail.id,target,note);
      setNotice(`Solicitud ${detail.code} → ${STATUS[target]}.`);setResolution('');await refreshDetail(detail.id);
    }catch(err){setError((err as Error).message);}
  }
  async function applyLinkOrder(){
    if(!detail||!linkOrder)return;
    try{await linkServiceRequestWorkOrder(detail.id,linkOrder);setLinkOrder('');setNotice('Solicitud vinculada a la orden.');await refreshDetail(detail.id);}
    catch(err){setError((err as Error).message);}
  }
  async function deriveIncident(){
    if(!detail)return;
    try{
      await createIncident({title:detail.subject,description:detail.description,category:'otro',priority:detail.priority==='urgente'?'urgent':'normal'});
      setNotice(`Se creó una incidencia a partir de ${detail.code}.`);await refreshDetail(detail.id);
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Solicitudes y reclamos</h1><p>Service desk: registro, asignación, SLA y resolución. Deriva a incidencia u orden.</p></div>
      {canCreate&&<Button icon={<Plus size={15}/>} onClick={()=>setCreating(true)}>Registrar</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&rows.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<>
      <div className="ja-home-metrics">
        <article className="ja-metric ja-metric-warning"><small>Recibidas</small><strong>{counts.recibida}</strong><span>Pendientes de triaje</span></article>
        <article className="ja-metric"><small>En proceso</small><strong>{counts.proceso}</strong><span>En atención</span></article>
        <article className={`ja-metric${counts.atrasada?' ja-metric-danger':''}`}><small>Atrasadas (SLA)</small><strong>{counts.atrasada}</strong><span>Fuera de compromiso</span></article>
        <article className={`ja-metric${counts.urgente?' ja-metric-danger':''}`}><small>Urgentes</small><strong>{counts.urgente}</strong><span>Prioridad máxima</span></article>
      </div>

      <Tabs tabs={FILTERS} value={filter} onChange={setFilter}/>

      <section className="ja-list">
        {visible.length===0
          ?<EmptyState icon={<Headset size={22}/>} title="Sin solicitudes" description="No hay solicitudes con este filtro."/>
          :visible.map(r=>{
            const late=r.due_date&&r.due_date<today()&&!['resuelta','cerrada','rechazada'].includes(r.status);
            return <article key={r.id} className="ja-list-row">
              <div>
                <strong>{r.code} · {r.subject}</strong>
                <span className="ja-cell-sub">{TYPES[r.request_type]??r.request_type} · {CHANNELS[r.channel]??r.channel} · {userLabel(r.assigned_to)}{r.due_date?` · compromiso ${formatDate(r.due_date)}${late?' (atrasada)':''}`:''}</span>
              </div>
              <Badge tone={r.priority==='urgente'?'danger':r.priority==='alta'?'warning':'neutral'}>{PRIORITY[r.priority]??r.priority}</Badge>
              <Badge tone={STATUS_TONE[r.status]??'neutral'}>{STATUS[r.status]??r.status}</Badge>
              <Button size="sm" variant="secondary" onClick={()=>{setDetail(r);setAssignTo('');setLinkOrder('');setResolution('');}}>Ver <ArrowRight size={13}/></Button>
            </article>;
          })}
      </section>
    </>}

    <Dialog open={creating} onClose={()=>setCreating(false)} title="Registrar solicitud" description="Ventana única de solicitudes, reclamos y consultas.">
      <form className="ja-pos-fields" onSubmit={save}>
        <label className="ja-field"><span className="ja-field-label">Asunto</span><input className="ja-control" required minLength={3} value={draft.subject} onChange={e=>setDraft({...draft,subject:e.target.value})}/></label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Tipo</span><select className="ja-control" value={draft.request_type} onChange={e=>setDraft({...draft,request_type:e.target.value})}>{Object.keys(TYPES).map(t=><option key={t} value={t}>{TYPES[t]}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Canal</span><select className="ja-control" value={draft.channel} onChange={e=>setDraft({...draft,channel:e.target.value})}>{Object.keys(CHANNELS).map(c=><option key={c} value={c}>{CHANNELS[c]}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Prioridad</span><select className="ja-control" value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})}>{Object.keys(PRIORITY).map(p=><option key={p} value={p}>{PRIORITY[p]}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Fecha compromiso (SLA)</span><input className="ja-control" type="date" value={draft.due_date} onChange={e=>setDraft({...draft,due_date:e.target.value})}/></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Descripción</span><textarea className="ja-control" rows={4} required minLength={5} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
        <Button type="submit" icon={<Plus size={15}/>}>Registrar solicitud</Button>
      </form>
    </Dialog>

    <Dialog open={Boolean(detail)} onClose={()=>setDetail(null)}
      title={detail?`${detail.code} · ${detail.subject}`:''}
      description={detail?`${TYPES[detail.request_type]??detail.request_type} · ${STATUS[detail.status]??detail.status} · prioridad ${PRIORITY[detail.priority]??detail.priority}`:''}>
      {detail&&<div className="ja-pos-fields">
        <p className="ja-cell-sub">{detail.description}</p>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Creada</span><input className="ja-control" readOnly value={formatDateTime(detail.created_at)}/></label>
          <label className="ja-field"><span className="ja-field-label">Compromiso (SLA)</span><input className="ja-control" readOnly value={detail.due_date?formatDate(detail.due_date):'—'}/></label>
          <label className="ja-field"><span className="ja-field-label">Canal</span><input className="ja-control" readOnly value={CHANNELS[detail.channel]??detail.channel}/></label>
          <label className="ja-field"><span className="ja-field-label">Asignación</span><input className="ja-control" readOnly value={userLabel(detail.assigned_to)}/></label>
        </div>
        {detail.work_order_id&&<p className="ja-hint"><ListChecks size={13}/> Vinculada a la orden {orders.find(o=>o.id===detail.work_order_id)?.order_number??detail.work_order_id}.</p>}

        {manage&&<>
          <div className="ja-pos-grid">
            <label className="ja-field"><span className="ja-field-label">Asignar a</span><select className="ja-control" value={assignTo} onChange={e=>setAssignTo(e.target.value)}><option value="">Seleccione</option>{users.map(u=><option key={u.id} value={u.id}>{u.full_name||u.name||u.email}</option>)}</select></label>
            <label className="ja-field"><span className="ja-field-label">Vincular a orden</span><select className="ja-control" value={linkOrder} onChange={e=>setLinkOrder(e.target.value)}><option value="">Orden abierta…</option>{orders.filter(o=>!['completed','cancelled'].includes(o.status)).map(o=><option key={o.id} value={o.id}>{o.order_number} — {o.type}</option>)}</select></label>
          </div>
          <div className="ja-row-actions">
            <Button size="sm" variant="secondary" icon={<UserCheck size={13}/>} disabled={!assignTo} onClick={()=>void assign()}>Asignar</Button>
            <Button size="sm" variant="secondary" disabled={!linkOrder} onClick={()=>void applyLinkOrder()}>Vincular orden</Button>
            <Button size="sm" variant="secondary" onClick={()=>void deriveIncident()}>Derivar a incidencia</Button>
          </div>
          {['en_proceso','resuelta'].includes(detail.status)&&<label className="ja-field"><span className="ja-field-label">Resolución</span><textarea className="ja-control" rows={2} value={resolution} onChange={e=>setResolution(e.target.value)} placeholder="Detalle de la resolución / seguimiento"/></label>}
          <div className="ja-row-actions">
            {(TRANSI[detail.status]??[]).map(s=><Button key={s} size="sm" onClick={()=>void changeStatus(s)}>{STATUS[s]}</Button>)}
          </div>
        </>}
      </div>}
    </Dialog>
  </main>;
}
