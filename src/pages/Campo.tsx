import {useCallback,useEffect,useMemo,useState} from 'react';
import {CheckCircle2,ChevronLeft,Clock,CloudOff,MapPin,Package,PlayCircle,RefreshCw,Upload} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {listInventory,listWorkOrders,registerInventoryMovement,updateWorkOrderDetails} from '../features/operations/service';
import {getGeoLocation} from '../features/metering/fieldService';
import {Badge,Button,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {formatDate} from '../design-system/utils';

type Row=Record<string,any>;
type FinishJob={order_id:string;order_number:string;actual_cost:number;notes:string;gps:string|null;at:string};
const QUEUE_KEY='junta-field-workorders-queue';
const OPEN=['open','scheduled','in_progress'];
const PRIO_TONE:Record<string,'neutral'|'warning'|'danger'>={low:'neutral',normal:'neutral',high:'warning',urgent:'danger'};

function loadQueue():FinishJob[]{
  try{return JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');}catch{return [];}
}
function saveQueue(q:FinishJob[]){try{localStorage.setItem(QUEUE_KEY,JSON.stringify(q));}catch{/* almacenamiento no disponible */}}

export function Campo(){
  const auth=useAuth();
  const me=auth.profile?.id;
  const [orders,setOrders]=useState<Row[]>([]);
  const [stock,setStock]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [openId,setOpenId]=useState<string|null>(null);
  const [queue,setQueue]=useState<FinishJob[]>(loadQueue());
  const [gps,setGps]=useState<{lat:number;lng:number;accuracy:number}|null>(null);
  const [material,setMaterial]=useState({item_id:'',quantity:'',reason:''});
  const [finish,setFinish]=useState({actual_cost:'',notes:''});

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([listWorkOrders(),listInventory().catch(()=>[])])
      .then(([w,s])=>{setOrders(w as Row[]);setStock(s as Row[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  const mine=useMemo(()=>orders.filter(o=>o.assigned_to===me&&OPEN.includes(o.status)),[orders,me]);
  const current=mine.find(o=>o.id===openId)??null;

  function requestGps(){
    getGeoLocation().then(setGps).catch(e=>setError((e as Error).message));
  }
  async function arrive(o:Row){
    try{
      const g=await getGeoLocation().catch(()=>null);
      await updateWorkOrderDetails(o.id,{status:'in_progress',notes:`Llegué al sitio${g?` · GPS ${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}`:''}`});
      setNotice(`Llegada registrada en ${o.order_number}.`);load();
    }catch(e){setError((e as Error).message);}
  }
  async function start(o:Row){
    try{await updateWorkOrderDetails(o.id,{status:'in_progress',notes:'Trabajo iniciado'});setNotice(`Orden ${o.order_number} iniciada.`);load();}
    catch(e){setError((e as Error).message);}
  }
  async function addMaterial(o:Row){
    if(!material.item_id||!material.quantity)return;
    try{
      await registerInventoryMovement({item_id:material.item_id,movement_type:'exit',quantity:Number(material.quantity),reason:material.reason||`Consumo en ${o.order_number}`,work_order_id:o.id});
      setMaterial({item_id:'',quantity:'',reason:''});setNotice('Material descontado del inventario.');load();
    }catch(e){setError((e as Error).message);}
  }
  async function complete(o:Row){
    const job:FinishJob={order_id:o.id,order_number:o.order_number,actual_cost:Number(finish.actual_cost||0),
      notes:finish.notes.trim(),gps:gps?`${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`:null,at:new Date().toISOString()};
    if(job.notes.length<5){setError('Describa el trabajo realizado antes de finalizar.');return;}
    if(!navigator.onLine){
      const q=[...queue,job];saveQueue(q);setQueue(q);setNotice('Sin conexión — cierre guardado en cola. Se enviará al reconectar.');
      setOpenId(null);setFinish({actual_cost:'',notes:''});setGps(null);
      return;
    }
    try{
      await updateWorkOrderDetails(o.id,{status:'completed',actual_cost:job.actual_cost,notes:`${job.notes}${job.gps?` · GPS ${job.gps}`:''}`});
      setNotice(`Orden ${o.order_number} finalizada.`);setOpenId(null);setFinish({actual_cost:'',notes:''});setGps(null);load();
    }catch(e){setError((e as Error).message);}
  }
  async function syncQueue(){
    if(queue.length===0)return;
    const remaining:FinishJob[]=[];
    for(const job of queue){
      try{await updateWorkOrderDetails(job.order_id,{status:'completed',actual_cost:job.actual_cost,notes:`${job.notes}${job.gps?` · GPS ${job.gps}`:''}`});}
      catch{remaining.push(job);}
    }
    saveQueue(remaining);setQueue(remaining);
    setNotice(`Sincronizadas ${queue.length-remaining.length} de ${queue.length} órdenes.`);load();
  }

  if(!auth.has('field.read')&&!auth.has('operations.read'))
    return <main className="ja-page"><EmptyState title="Sin acceso" description="Esta vista es para el personal de campo."/></main>;

  return <main className="ja-page ja-fw">
    <header className="ja-page-head">
      <div><h1>Campo</h1><p>Tus órdenes de trabajo asignadas. Registro de llegada, materiales y cierre.</p></div>
      {queue.length>0&&<Button variant="secondary" icon={<Upload size={15}/>} onClick={()=>void syncQueue()}>Sincronizar ({queue.length})</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {!navigator.onLine&&<div className="ja-banner ja-banner-warning"><CloudOff size={14}/> Sin conexión — los cierres se guardan y se envían al reconectar. No hay operaciones financieras en modo campo.</div>}
    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&mine.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&!current&&<section className="ja-fw-list">
      {mine.length===0
        ?<EmptyState icon={<CheckCircle2 size={22}/>} title="Sin órdenes asignadas" description="No tienes órdenes de trabajo abiertas."/>
        :mine.map(o=><button key={o.id} type="button" className="ja-fw-card" onClick={()=>{setOpenId(o.id);setGps(null);setFinish({actual_cost:String(o.estimated_cost??0),notes:''});}}>
          <div className="ja-fw-card-top">
            <strong>{o.order_number} · {o.type}</strong>
            <Badge tone={PRIO_TONE[o.priority]??'neutral'}>{o.priority}</Badge>
          </div>
          <p>{o.description}</p>
          <span className="ja-cell-sub">{o.asset_name?`${o.asset_code} · ${o.asset_name} · `:''}{o.status==='in_progress'?'En progreso':'Pendiente'}{o.due_date?` · vence ${formatDate(o.due_date)}`:''}</span>
        </button>)}
    </section>}

    {current&&<section className="ja-fw-detail">
      <button type="button" className="ja-tab" onClick={()=>setOpenId(null)}><ChevronLeft size={14}/> Mis órdenes</button>
      <div className="ja-fw-detail-head">
        <div><strong>{current.order_number} · {current.type}</strong><span className="ja-cell-sub">{current.description}</span></div>
        <Badge tone={current.status==='in_progress'?'warning':'neutral'}>{current.status==='in_progress'?'En progreso':'Pendiente'}</Badge>
      </div>

      <div className="ja-fw-steps">
        <Button variant="secondary" icon={<MapPin size={15}/>} onClick={()=>void arrive(current)}>Llegué</Button>
        <Button variant="secondary" icon={<PlayCircle size={15}/>} disabled={current.status==='in_progress'} onClick={()=>void start(current)}>Iniciar</Button>
        <Button variant="secondary" icon={<Clock size={15}/>} onClick={requestGps}>{gps?`GPS ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`:'Marcar GPS'}</Button>
      </div>

      <div className="ja-fw-block">
        <h3><Package size={14}/> Materiales usados</h3>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Material</span><select className="ja-control" value={material.item_id} onChange={e=>setMaterial({...material,item_id:e.target.value})}><option value="">Seleccione</option>{stock.map(s=><option key={s.id} value={s.id}>{s.name} ({s.quantity} {s.unit})</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Cantidad</span><input className="ja-control" type="number" min="0.001" step="0.001" value={material.quantity} onChange={e=>setMaterial({...material,quantity:e.target.value})}/></label>
        </div>
        <Button size="sm" disabled={!material.item_id||!material.quantity} onClick={()=>void addMaterial(current)}>Descontar del inventario</Button>
      </div>

      <div className="ja-fw-block">
        <h3><CheckCircle2 size={14}/> Finalizar</h3>
        <label className="ja-field"><span className="ja-field-label">Costo real (L)</span><input className="ja-control" type="number" min="0" step="0.01" value={finish.actual_cost} onChange={e=>setFinish({...finish,actual_cost:e.target.value})}/></label>
        <label className="ja-field"><span className="ja-field-label">Trabajo realizado</span><textarea className="ja-control" rows={3} value={finish.notes} onChange={e=>setFinish({...finish,notes:e.target.value})} placeholder="Detalle técnico, repuestos y resultado."/></label>
        <Button icon={<CheckCircle2 size={15}/>} onClick={()=>void complete(current)}>Finalizar orden{navigator.onLine?'':' (offline)'}</Button>
      </div>
    </section>}
  </main>;
}
