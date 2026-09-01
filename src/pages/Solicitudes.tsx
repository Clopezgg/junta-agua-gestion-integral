import {useCallback,useEffect,useMemo,useState} from 'react';
import {ArrowRight,Clock,Headset,ListChecks,Plus,RefreshCw,UserCheck,X} from 'lucide-react';
import {assignServiceRequest,createServiceRequest,linkServiceRequestWorkOrder,listServiceRequests,setServiceRequestStatus} from '../features/requests/service';
import {listUsers} from '../features/users/service';
import {listWorkOrders} from '../features/operations/service';
import {useAuth} from '../contexts/AuthContext';

type Row=Record<string,any>;
const TYPES:Record<string,string>={solicitud:'Solicitud',reclamo:'Reclamo',consulta:'Consulta',felicitacion:'Felicitación'};
const CHANNELS:Record<string,string>={presencial:'Presencial',telefonico:'Teléfono',whatsapp:'WhatsApp',portal:'Portal',correo:'Correo'};
const STATUS:Record<string,string>={recibida:'Recibida',en_revision:'En revisión',en_proceso:'En proceso',resuelta:'Resuelta',cerrada:'Cerrada',rechazada:'Rechazada'};
const PRIORITY:Record<string,string>={baja:'Baja',normal:'Normal',alta:'Alta',urgente:'Urgente'};
const TRANSI:Record<string,string[]>={recibida:['en_revision','rechazada'],en_revision:['en_proceso','rechazada'],en_proceso:['resuelta'],resuelta:['cerrada'],cerrada:[],rechazada:['en_revision']};
const today=()=>new Date().toISOString().slice(0,10);

export function Solicitudes(){
 const auth=useAuth();
 const manage=auth.has('operations.manage');
 const create=auth.has('subscribers.create');
 const[rows,setRows]=useState<Row[]>([]);
 const[users,setUsers]=useState<Row[]>([]);
 const[orders,setOrders]=useState<Row[]>([]);
 const[filter,setFilter]=useState('');
 const[error,setError]=useState('');
 const[message,setMessage]=useState('');
 const[creating,setCreating]=useState(false);
 const[detail,setDetail]=useState<Row|null>(null);
 const[assignTo,setAssignTo]=useState('');
 const[linkOrder,setLinkOrder]=useState('');
 const[resolution,setResolution]=useState('');
 const[draft,setDraft]=useState({request_type:'solicitud',subject:'',description:'',priority:'normal',channel:'presencial',due_date:''});

 const load=useCallback(async()=>{
  try{
   const[r,u,o]=await Promise.all([listServiceRequests(),listUsers(),listWorkOrders()]);
   setRows(r as Row[]);setUsers(u as Row[]);setOrders(o as Row[]);setError('');
  }catch(e){setError((e as Error).message)}
 },[]);
 useEffect(()=>{void load()},[load]);

 const counts=useMemo(()=>({
  recibida:rows.filter(r=>r.status==='recibida').length,
  proceso:rows.filter(r=>r.status==='en_proceso').length,
  urgente:rows.filter(r=>r.priority==='urgente'&&!['resuelta','cerrada','rechazada'].includes(r.status)).length,
  atrasada:rows.filter(r=>r.due_date&&r.due_date<today()&&!['resuelta','cerrada','rechazada'].includes(r.status)).length
 }),[rows]);
 const visible=useMemo(()=>rows.filter(r=>!filter||r.status===filter),[rows,filter]);
 const userLabel=(id:string)=>{const u=users.find(x=>x.id===id);return u?`${u.full_name||u.name||u.email||'Usuario'}`:'Sin asignar';};

 async function save(event:React.FormEvent){
  event.preventDefault();
  try{
   await createServiceRequest({...draft,subject:draft.subject.trim(),description:draft.description.trim(),due_date:draft.due_date||null});
   setCreating(false);setDraft({request_type:'solicitud',subject:'',description:'',priority:'normal',channel:'presencial',due_date:''});
   setMessage('Solicitud registrada y auditada.');await load();
  }catch(e){setError((e as Error).message)}
 }
 async function refreshDetail(){
  const fresh=await listServiceRequests();setRows(fresh as Row[]);setDetail(fresh.find((r: Row)=>r.id===detail?.id)??null);
 }
 async function assign(){
  if(!detail||!assignTo)return;
  try{await assignServiceRequest(detail.id,assignTo);setAssignTo('');setMessage('Solicitud asignada.');await refreshDetail();}catch(e){setError((e as Error).message)}
 }
 async function changeStatus(target:string){
  if(!detail)return;
  try{
   const note=target==='resuelta'||target==='cerrada'?resolution.trim().slice(0,500):null;
   await setServiceRequestStatus(detail.id,target,note);
   setMessage(`Solicitud ${detail.code} → ${STATUS[target]}.`);setResolution('');await refreshDetail();
  }catch(e){setError((e as Error).message)}
 }
 async function applyLinkOrder(){
  if(!detail||!linkOrder)return;
  try{await linkServiceRequestWorkOrder(detail.id,linkOrder);setLinkOrder('');setMessage('Solicitud vinculada a la orden.');await refreshDetail();}catch(e){setError((e as Error).message)}
 }

 return <main className="content">
  <div className="titlebar"><div><h1>Solicitudes y reclamos</h1><p>Service desk: registro, asignación, SLA y resolución.</p></div><div style={{display:'flex',gap:'0.5rem'}}>{create&&<button className="" onClick={()=>setCreating(true)}><Plus size={17}/>Registrar</button>}<button className="outline" onClick={()=>void load()}><RefreshCw size={17}/>Actualizar</button></div></div>
  {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}

  <div className="cards operational-cards">
   <article><Headset size={20}/><small>Recibidas</small><h3>{counts.recibida}</h3><span>Pendientes de triaje</span></article>
   <article><ListChecks size={20}/><small>En proceso</small><h3>{counts.proceso}</h3><span>En atención</span></article>
   <article><Clock size={20}/><small>Atrasadas (SLA)</small><h3>{counts.atrasada}</h3><span>Fuera de fecha compromiso</span></article>
   <article><ArrowRight size={20}/><small>Urgentes</small><h3>{counts.urgente}</h3><span>Prioridad máxima</span></article>
  </div>

  <div className="module-tabs">
   <button className={!filter?'active outline':'outline'} onClick={()=>setFilter('')}>Todas</button>
   {Object.keys(STATUS).map(s=><button key={s} className={filter===s?'active outline':'outline'} onClick={()=>setFilter(s)}>{STATUS[s]}</button>)}
  </div>

  <section className="panel"><h2>Bandeja de solicitudes</h2>
   {visible.length===0?<div className="empty">Sin solicitudes con este filtro.</div>:visible.map(r=><div className={`work-order priority-${r.priority}`} key={r.id}>
    <div><strong>{r.code} — {r.subject}</strong><small>{TYPES[r.request_type]??r.request_type} · por {CHANNELS[r.channel]??r.channel} · {userLabel(r.assigned_to)}</small>
     <span>{STATUS[r.status]??r.status}{r.due_date?` · compromiso ${r.due_date}${r.due_date<today()&&!['resuelta','cerrada','rechazada'].includes(r.status)?' (atrasada)':''}`:''} · creada {new Date(r.created_at).toLocaleString('es-HN')}</span></div>
    <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><span className={`status-badge ${r.priority}`}>{PRIORITY[r.priority]??r.priority}</span><button className="compact" onClick={()=>setDetail(r)}>Ver <ArrowRight size={14}/></button></div>
   </div>)}
  </section>

  {creating&&<div className="modal" role="dialog" aria-modal="true"><form className="modal-card" onSubmit={save}>
   <div className="titlebar"><div><h2>Registrar solicitud</h2><p>Ventana única de solicitudes, reclamos y consultas.</p></div><button type="button" className="outline" onClick={()=>setCreating(false)}><X size={18}/>Cerrar</button></div>
   <div className="form-grid">
    <label className="span-2">Asunto<input required minLength={3} value={draft.subject} onChange={e=>setDraft({...draft,subject:e.target.value})}/></label>
    <label>Tipo<select value={draft.request_type} onChange={e=>setDraft({...draft,request_type:e.target.value})}>{Object.keys(TYPES).map(t=><option key={t} value={t}>{TYPES[t]}</option>)}</select></label>
    <label>Canal<select value={draft.channel} onChange={e=>setDraft({...draft,channel:e.target.value})}>{Object.keys(CHANNELS).map(c=><option key={c} value={c}>{CHANNELS[c]}</option>)}</select></label>
    <label>Prioridad<select value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})}>{Object.keys(PRIORITY).map(p=><option key={p} value={p}>{PRIORITY[p]}</option>)}</select></label>
    <label>Fecha compromiso (SLA)<input type="date" value={draft.due_date} onChange={e=>setDraft({...draft,due_date:e.target.value})}/></label>
    <label className="span-2">Descripción<textarea rows={4} required minLength={5} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
   </div>
   <button>Registrar solicitud</button>
  </form></div>}

  {detail&&<div className="modal" role="dialog" aria-modal="true"><div className="modal-card">
   <div className="titlebar"><div><h2>{detail.code} — {detail.subject}</h2><p>{TYPES[detail.request_type]??detail.request_type} · {STATUS[detail.status]??detail.status} · prioridad {PRIORITY[detail.priority]??detail.priority}</p></div><button className="outline" onClick={()=>setDetail(null)}><X size={18}/>Cerrar</button></div>
   <p><strong>{detail.description}</strong></p>
   <div className="form-grid">
    <label>Creada<input value={new Date(detail.created_at).toLocaleString('es-HN')} readOnly/></label>
    <label>Compromiso (SLA)<input value={detail.due_date?`${detail.due_date}${detail.due_date<today()&&!['resuelta','cerrada','rechazada'].includes(detail.status)?' ⚠ atrasada':''}`:'—'} readOnly/></label>
    <label>Canal<input value={CHANNELS[detail.channel]??detail.channel} readOnly/></label>
    <label>Asignación<input value={userLabel(detail.assigned_to)} readOnly/></label>
    {detail.work_order_id&&<label className="span-2">Orden vinculada<input value={orders.find(o=>o.id===detail.work_order_id)?.order_number??detail.work_order_id} readOnly/></label>}
   </div>
   {manage&&<>
    <div className="link-row" style={{marginTop:'0.75rem'}}>
     <label className="span-2">Asignar a técnico<select value={assignTo} onChange={e=>setAssignTo(e.target.value)}><option value="">Seleccione</option>{users.map(u=><option key={u.id} value={u.id}>{u.full_name||u.name||u.email}</option>)}</select></label>
     <button className="outline" onClick={()=>void assign()} disabled={!assignTo}><UserCheck size={15}/> Asignar</button>
    </div>
    {['resuelta','cerrada'].includes(detail.status)&&<div className="link-row" style={{marginTop:'0.75rem'}}>
     <label className="span-2">Resolución<textarea rows={2} value={resolution} onChange={e=>setResolution(e.target.value)} placeholder="Detalle de la resolución / seguimiento"/></label>
    </div>}
    <div className="module-tabs" style={{marginTop:'0.75rem'}}>
     {(TRANSI[detail.status]??[]).map(s=><button key={s} className="outline" onClick={()=>void changeStatus(s)}>{STATUS[s]}</button>)}
    </div>
    <div className="link-row" style={{marginTop:'0.5rem'}}>
     <select value={linkOrder} onChange={e=>setLinkOrder(e.target.value)}><option value="">Vincular a orden de trabajo…</option>{orders.filter(o=>!['completed','cancelled'].includes(o.status)).map(o=><option key={o.id} value={o.id}>{o.order_number} — {o.type}</option>)}</select>
     <button className="outline" onClick={()=>void applyLinkOrder()} disabled={!linkOrder}>Vincular orden</button>
    </div>
   </>}
  </div></div>}
 </main>;
}
