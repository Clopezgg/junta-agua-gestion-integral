import {useCallback,useEffect,useMemo,useState} from 'react';
import {AlertTriangle,ArrowRight,CheckCircle2,ClipboardList,Flag,Plus,RefreshCw,X} from 'lucide-react';
import {createIncident,listIncidents,listWorkOrders,updateIncident,createWorkOrder} from '../features/operations/service';
import {useAuth} from '../contexts/AuthContext';

type Row=Record<string,any>;

const CATEGORIES:Record<string,string>={
 fuga:'Fuga','calidad_agua':'Calidad del agua',corte:'Corte de servicio',facturacion:'Facturación','baja_presion':'Baja presión',medidor:'Medidor',infraestructura:'Infraestructura',saneamiento:'Saneamiento',otro:'Otro'
};
const PRIORITY:Record<string,string>={low:'Baja',normal:'Normal',high:'Alta',urgent:'Urgente'};
const STATUS:Record<string,string>={nuevo:'Nueva','en_atencion':'En atención','en_espera':'En espera',resuelto:'Resuelta',cerrado:'Cerrada'};
const time=(v:unknown)=>v?new Date(String(v)).toLocaleString('es-HN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';

export function Incidents(){
 const auth=useAuth();
 const manage=auth.has('incidents.manage');
 const manageOps=auth.has('operations.manage');
 const[rows,setRows]=useState<Row[]>([]);
 const[orders,setOrders]=useState<Row[]>([]);
 const[filter,setFilter]=useState<string>('');
 const[error,setError]=useState('');
 const[message,setMessage]=useState('');
 const[creating,setCreating]=useState(false);
 const[draft,setDraft]=useState({title:'',description:'',category:'fuga',priority:'normal',reporter_name:'',reporter_phone:''});
 const[detail,setDetail]=useState<Row|null>(null);
 const[linkOrder,setLinkOrder]=useState('');

 const load=useCallback(async()=>{
  try{
   const[incRows,ordRows]=await Promise.all([listIncidents(),listWorkOrders()]);
   setRows(incRows);setOrders(ordRows);setError('');
  }catch(e){setError((e as Error).message)}
 },[]);
 useEffect(()=>{void load()},[load]);

 const counts=useMemo(()=>({
  nuevo:rows.filter(r=>r.status==='nuevo').length,
  atencion:rows.filter(r=>r.status==='en_atencion').length,
  resuelto:rows.filter(r=>r.status==='resuelto').length,
  urgent:rows.filter(r=>r.priority==='urgent'&&!['resuelto','cerrado'].includes(r.status)).length
 }),[rows]);
 const visible=useMemo(()=>rows.filter(r=>!filter||r.status===filter),[rows,filter]);

 async function save(event:React.FormEvent){
  event.preventDefault();
  try{
   await createIncident({...draft,title:draft.title.trim(),description:draft.description.trim(),reporter_name:draft.reporter_name.trim()||null,reporter_phone:draft.reporter_phone.trim()||null});
   setCreating(false);setDraft({title:'',description:'',category:'fuga',priority:'normal',reporter_name:'',reporter_phone:''});
   setMessage('Incidencia registrada y auditada.');await load();
  }catch(e){setError((e as Error).message)}
 }
 async function transition(target:string){
  if(!detail)return;
  try{
   await updateIncident(detail.id,{status:target});
   setMessage(`Incidencia ${detail.incident_number} → ${STATUS[target]}.`);
   const fresh=await listIncidents();
   setDetail(fresh.find((r: Row)=>r.id===detail.id)??null);
   setRows(fresh);
  }catch(e){setError((e as Error).message)}
 }
 async function linkWorkOrder(event:React.FormEvent){
  event.preventDefault();
  if(!detail||!linkOrder)return;
  try{
   await updateIncident(detail.id,{work_order_id:linkOrder});
   setMessage(`Incidencia ${detail.incident_number} vinculada a la orden.`);setLinkOrder('');await load();
   const fresh=await listIncidents();setDetail(fresh.find((r: Row)=>r.id===detail.id)??null);
  }catch(e){setError((e as Error).message)}
 }
 async function convertToOrder(){
  if(!detail)return;
  try{
   const order=await createWorkOrder({type:'incidencia',description:detail.description,priority:detail.priority||'normal'});
   if(order?.id){await updateIncident(detail.id,{work_order_id:order.id});}
   setMessage(`Se creó la orden ${order?.order_number??''} y se vinculó a la incidencia ${detail.incident_number}.`);
   const fresh=await listIncidents();setRows(fresh);setDetail(fresh.find((r: Row)=>r.id===detail.id)??null);
  }catch(e){setError((e as Error).message)}
 }
 async function changePriority(value:string){
  if(!detail)return;
  try{
   await updateIncident(detail.id,{priority:value});
   const fresh=await listIncidents();setRows(fresh);setDetail(fresh.find((r: Row)=>r.id===detail.id)??null);
  }catch(e){setError((e as Error).message)}
 }

 return <main className="content">
  <div className="titlebar"><div><h1>Incidencia y reportes</h1><p>Reportes de la comunidad, triaje y vinculación con órdenes de trabajo.</p></div><div style={{display:'flex',gap:'0.5rem'}}><button className="outline" onClick={()=>void load()}><RefreshCw size={17}/>Actualizar</button>{manage&&<button className="" onClick={()=>setCreating(true)}><Plus size={17}/>Nueva incidencia</button>}</div></div>
  {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}

  <div className="cards operational-cards">
   <article><AlertTriangle size={20}/><small>Nuevas</small><h3>{counts.nuevo}</h3><span>Pendientes de triaje</span></article>
   <article><ClipboardList size={20}/><small>En atención</small><h3>{counts.atencion}</h3><span>Asignadas a equipo</span></article>
   <article><CheckCircle2 size={20}/><small>Resueltas</small><h3>{counts.resuelto}</h3><span>Con resolución</span></article>
   <article><Flag size={20}/><small>Urgentes</small><h3>{counts.urgent}</h3><span>Atención prioritaria</span></article>
  </div>

  <div className="module-tabs">
   <button className={!filter?'active outline':'outline'} onClick={()=>setFilter('')}>Todas</button>
   {Object.keys(STATUS).map(code=><button key={code} className={filter===code?'active outline':'outline'} onClick={()=>setFilter(code)}>{STATUS[code]}</button>)}
  </div>

  <section className="panel"><h2>Cola de incidencias</h2>
   {visible.length===0?<div className="empty">No existen incidencias con este filtro.</div>:visible.map(row=><div className={`work-order priority-${row.priority}`} key={row.id}>
    <div><strong>{row.incident_number} — {row.title}</strong><small>{CATEGORIES[row.category]??row.category} · reportado por {row.reporter_name??'anonimo'}{row.reporter_phone?` · ${row.reporter_phone}`:''}</small><span>{STATUS[row.status]??row.status}{row.work_order_id?' · vinculada a orden':''} · reportado {time(row.reported_at)}</span></div>
    <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><span className={`status-badge ${row.priority}`}>{PRIORITY[row.priority]??row.priority}</span><button className="compact" onClick={()=>setDetail(row)}>Ver <ArrowRight size={14}/></button></div>
   </div>)}
  </section>

  {(creating||detail)&&<div className="modal" role="dialog" aria-modal="true">
   <form className="modal-card" onSubmit={creating?save:linkWorkOrder}>
    <div className="titlebar"><div><h2>{creating?'Nueva incidencia':`Incidencia ${detail?.incident_number??''}`}</h2><p>{creating?'Reporte de la comunidad o del equipo técnico.':'Detalle, estado y vinculación con órdenes de trabajo.'}</p></div><button type="button" className="outline" onClick={()=>{setCreating(false);setDetail(null)}}><X size={18}/>Cerrar</button></div>

    {creating?<>
     <div className="form-grid">
      <label className="span-2">Título<input required minLength={3} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Fuga en la línea principal…"/></label>
      <label>Categoría<select value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}>{Object.keys(CATEGORIES).map(c=><option key={c} value={c}>{CATEGORIES[c]}</option>)}</select></label>
      <label>Prioridad<select value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})}>{Object.keys(PRIORITY).map(p=><option key={p} value={p}>{PRIORITY[p]}</option>)}</select></label>
      <label>Nombre del reportante<input value={draft.reporter_name} onChange={e=>setDraft({...draft,reporter_name:e.target.value})}/></label>
      <label>Teléfono<input value={draft.reporter_phone} onChange={e=>setDraft({...draft,reporter_phone:e.target.value})}/></label>
      <label className="span-2">Descripción<textarea required minLength={5} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
     </div>
     <button>Registrar incidencia</button>
    </>:<>
     <p><strong>{detail?.description}</strong></p>
     <div className="form-grid">
      <label>Estado<select value={detail?.status??''} onChange={e=>e.target.value&&transition(e.target.value)}>{Object.keys(STATUS).map(s=><option key={s} value={s}>{STATUS[s]}</option>)}</select></label>
      <label>Prioridad<select value={detail?.priority??''} onChange={e=>e.target.value&&void changePriority(e.target.value)}>{Object.keys(PRIORITY).map(p=><option key={p} value={p}>{PRIORITY[p]}</option>)}</select></label>
      <label>Reportante<input value={`${detail?.reporter_name??'Anónimo'}${detail?.reporter_phone?` · ${detail.reporter_phone}`:''}`} readOnly/></label>
      <label>Reportada<input value={time(detail?.reported_at)} readOnly/></label>
      <label className="span-2">Categoría<input value={CATEGORIES[detail?.category]??detail?.category??''} readOnly/></label>
     </div>

     {manageOps&&<div className="link-row">
      <label className="span-2">Vincular a orden de trabajo<select value={linkOrder} onChange={e=>setLinkOrder(e.target.value)}><option value="">Seleccione una orden abierta</option>{orders.filter(o=>!['completed','cancelled'].includes(o.status)).map(o=><option key={o.id} value={o.id}>{o.order_number} — {o.type}</option>)}</select></label>
      <div style={{display:'flex',gap:'0.5rem',marginTop:'0.5rem'}}><button disabled={!linkOrder}>Vincular orden</button><button type="button" className="outline" onClick={()=>void convertToOrder()}><ArrowRight size={16}/>Crear y vincular orden</button></div>
     </div>}
    </>}
   </form>
  </div>}
 </main>;
}
