import {useCallback,useEffect,useMemo,useState} from 'react';
import {Camera,CheckCircle2,Cloud,CloudOff,AlertTriangle,Gauge,MapPin,Plus,RefreshCw,Upload,X} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {listMeteringConnections} from '../features/metering/service';
import {captureFieldReading,listFieldReadings,syncFieldReadings,validateFieldReading,getGeoLocation,generateOfflineId,loadOfflineQueue,saveOfflineQueue,removeFromOfflineQueue,type FieldReadingPayload} from '../features/metering/fieldService';

type Row=Record<string,any>;
type Tab='capture'|'queue'|'list';

const STATUS_LABEL:Record<string,string>={captured:'Capturada',synced:'Sincronizada',validated:'Validada',rejected:'Rechazada'};
const STATUS_CLS:Record<string,string>={captured:'draft',synced:'fair',validated:'approved',rejected:'critical'};

export function FieldReadings(){
 const auth=useAuth();
 const manage=auth.has('field.manage');
 const[tab,setTab]=useState<Tab>('capture');
 const[rows,setRows]=useState<Row[]>([]);
 const[connections,setConnections]=useState<Row[]>([]);
 const[offlineQueue,setOfflineQueue]=useState<FieldReadingPayload[]>(loadOfflineQueue());
 const[query,setQuery]=useState('');
 const[filter,setFilter]=useState('');
 const[error,setError]=useState('');
 const[message,setMessage]=useState('');
 const[gps,setGps]=useState<{lat:number;lng:number;accuracy:number}|null>(null);
 const[gpsLoading,setGpsLoading]=useState(false);
 const[photoPreview,setPhotoPreview]=useState<string|null>(null);
 const[form,setForm]=useState({
  connection_id:'',previous_reading:'',current_reading:'',notes:'',anomaly_code:''
 });

 const load=useCallback(async()=>{
  try{
   const[readingRows,connRows]=await Promise.all([
    listFieldReadings(filter||null,null,null),
    listMeteringConnections(query)
   ]);
   setRows(readingRows);setConnections(connRows);setError('');
  }catch(e){setError((e as Error).message)}
 },[query,filter]);
 useEffect(()=>{void load()},[load]);

 const selectedConn=useMemo(()=>connections.find(c=>c.id===form.connection_id),[connections,form.connection_id]);
 useEffect(()=>{
  if(selectedConn)setForm(f=>({...f,previous_reading:String(selectedConn.last_reading??0)}));
 },[selectedConn]);

 const counts=useMemo(()=>({
  captured:rows.filter(r=>r.status==='captured').length,
  synced:rows.filter(r=>r.status==='synced').length,
  validated:rows.filter(r=>r.status==='validated').length,
  rejected:rows.filter(r=>r.status==='rejected').length
 }),[rows]);

 function requestGps(){
  setGpsLoading(true);
  getGeoLocation().then(g=>{setGps(g);setGpsLoading(false);}).catch(e=>{setError((e as Error).message);setGpsLoading(false);});
 }

 function handlePhoto(event:React.ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>setPhotoPreview(reader.result as string);
  reader.readAsDataURL(file);
 }

 async function submitCapture(e:React.FormEvent){
  e.preventDefault();
  const payload:FieldReadingPayload={
   connection_id:form.connection_id,
   previous_reading:Number(form.previous_reading),
   current_reading:Number(form.current_reading),
   notes:form.notes||undefined,
   anomaly_code:form.anomaly_code||undefined,
   gps_lat:gps?.lat,gps_lng:gps?.lng,gps_accuracy_m:gps?.accuracy,
   photo_url:photoPreview??undefined,
   offline_id:generateOfflineId(),
   captured_at:new Date().toISOString()
  };
  if(navigator.onLine){
   try{
    await captureFieldReading(payload);
    setMessage('Lectura capturada y auditada.');resetForm();await load();
   }catch(e){setError((e as Error).message);}
  }else{
   const queue=[...offlineQueue,payload];saveOfflineQueue(queue);setOfflineQueue(queue);
   setMessage('Sin conexión — guardada en cola offline.');resetForm();setTab('queue');
  }
 }

 function resetForm(){
  setForm({connection_id:'',previous_reading:'',current_reading:'',notes:'',anomaly_code:''});
  setGps(null);setPhotoPreview(null);
 }

 async function syncQueue(){
  if(offlineQueue.length===0){setMessage('Cola vacía.');return;}
  try{
   const result=await syncFieldReadings(offlineQueue);
   saveOfflineQueue([]);setOfflineQueue([]);
   setMessage(`Sincronizadas ${result?.synced??0} lecturas (${result?.dupes??0} duplicados).`);await load();setTab('list');
  }catch(e){setError((e as Error).message);}
 }

 async function validateReading(id:string,status:'validated'|'rejected'){
  try{
   await validateFieldReading(id,status);
   setMessage(`Lectura ${STATUS_LABEL[status]}.`);await load();
  }catch(e){setError((e as Error).message);}
 }

 return <main className="content">
  <div className="titlebar"><div><h1>Lecturas de campo</h1><p>Captura en sitio con GPS, foto y cola offline para técnicos.</p></div><div style={{display:'flex',gap:'0.5rem'}}><button className="outline" onClick={()=>void load()}><RefreshCw size={17}/>Actualizar</button>{manage&&<button onClick={()=>void syncQueue()} disabled={offlineQueue.length===0}><Upload size={17}/>Sincronizar {offlineQueue.length>0?`(${offlineQueue.length})`:''}</button>}</div></div>
  {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}

  <div className="cards operational-cards">
   <article><Camera size={20}/><small>Capturadas</small><h3>{counts.captured}</h3><span>En campo</span></article>
   <article><Cloud size={20}/><small>Sincronizadas</small><h3>{counts.synced}</h3><span>Enviadas</span></article>
   <article><CheckCircle2 size={20}/><small>Validadas</small><h3>{counts.validated}</h3><span>Aprobadas</span></article>
   <article><AlertTriangle size={20}/><small>Rechazadas</small><h3>{counts.rejected}</h3><span>Requieren revisión</span></article>
  </div>

  <div className="module-tabs">
   <button className={tab==='capture'?'active outline':'outline'} onClick={()=>setTab('capture')}><Plus size={17}/>Capturar</button>
   <button className={tab==='queue'?'active outline':'outline'} onClick={()=>setTab('queue')}><CloudOff size={17}/>Cola offline ({offlineQueue.length})</button>
   <button className={tab==='list'?'active outline':'outline'} onClick={()=>setTab('list')}><Gauge size={17}/>Historial</button>
  </div>

  {tab==='capture'&&manage&&<section className="panel"><h2><Plus size={19}/>Nueva lectura de campo</h2>
   <form className="subform" onSubmit={submitCapture}>
    <div className="form-grid">
     <label className="span-2">Buscar pegue<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, medidor o abonado"/></label>
     <label>Pegue con medidor<select required value={form.connection_id} onChange={e=>setForm({...form,connection_id:e.target.value})}><option value="">Seleccione</option>{connections.map(c=><option key={c.id} value={c.id}>{c.code} · {c.meter_number} · {c.subscriber_name}</option>)}</select></label>
     <label>Lectura anterior<input type="number" min="0" step="0.001" required value={form.previous_reading} onChange={e=>setForm({...form,previous_reading:e.target.value})}/></label>
     <label>Lectura actual<input type="number" min="0" step="0.001" required value={form.current_reading} onChange={e=>setForm({...form,current_reading:e.target.value})}/></label>
     <label>GPS<button type="button" className="outline" onClick={requestGps} disabled={gpsLoading}>{gps?<MapPin size={16}/>:(gpsLoading?'Obteniendo…':'Obtener ubicación')}</button>{gps&&<small>{gps.lat.toFixed(6)}, {gps.lng.toFixed(6)} ±{gps.accuracy.toFixed(0)}m</small>}</label>
     <label>Foto del medidor<input type="file" accept="image/*" capture="environment" onChange={handlePhoto}/>{photoPreview&&<img src={photoPreview} alt="Vista previa" style={{maxWidth:200,marginTop:'0.5rem',borderRadius:8}}/>}</label>
     <label className="span-2">Observación<input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Fuga, medidor dañado, etc."/></label>
    </div>
    <button><Camera size={17}/>Capturar lectura{navigator.onLine?'':' (offline)'}</button>
   </form>
  </section>}

  {tab==='queue'&&<section className="panel">
   <div className="titlebar"><div><h2>Cola offline</h2><p>Lecturas pendientes de sincronización. Conéctese a internet para enviar.</p></div>{offlineQueue.length>0&&<button onClick={()=>void syncQueue()}><Upload size={17}/>Sincronizar todo</button>}</div>
   {offlineQueue.length===0?<div className="empty">No hay lecturas pendientes en la cola offline.</div>:
    offlineQueue.map((item,i)=><div className="work-order" key={item.offline_id}>
     <div><strong>Lectura {i+1} — {item.connection_id.slice(0,8)}…</strong>
     <small>Anterior: {item.previous_reading} → Actual: {item.current_reading} ({(item.current_reading-item.previous_reading).toFixed(3)} m³){item.gps_lat?` · GPS ${item.gps_lat.toFixed(4)}, ${item.gps_lng?.toFixed(4)}`:''}</small>
     <span>Capturada {item.captured_at?new Date(item.captured_at).toLocaleString('es-HN'):'—'}</span></div>
     <button className="outline compact" onClick={()=>{const q=removeFromOfflineQueue(i);setOfflineQueue(q);}}><X size={16}/></button>
    </div>)}
  </section>}

  {tab==='list'&&<section className="panel">
   <div className="titlebar"><div><h2>Historial de lecturas</h2><p>Lecturas capturadas en campo, sincronizadas y validadas.</p></div></div>
   <div className="module-tabs" style={{marginBottom:'1rem'}}>
    <button className={!filter?'active outline':'outline'} onClick={()=>setFilter('')}>Todas</button>
    {Object.keys(STATUS_LABEL).map(s=><button key={s} className={filter===s?'active outline':'outline'} onClick={()=>setFilter(s)}>{STATUS_LABEL[s]}</button>)}
   </div>
   {rows.length===0?<div className="empty">No existen lecturas de campo.</div>:
    <div className="table-scroll"><table><thead><tr><th>Número</th><th>Pegue</th><th>Abonado</th><th>Anterior</th><th>Actual</th><th>Consumo</th><th>GPS</th><th>Estado</th>{manage&&<th>Acción</th>}</tr></thead><tbody>{rows.map(r=><tr key={r.id}>
     <td><strong>{r.reading_number}</strong></td>
     <td>{r.connection_code}<small>{r.meter_number}</small></td>
     <td>{r.subscriber_name}</td>
     <td>{r.previous_reading}</td>
     <td>{r.current_reading}</td>
     <td>{r.consumption} m³</td>
     <td>{r.gps_lat?`${r.gps_lat.toFixed(4)}, ${r.gps_lng?.toFixed(4)}`:'—'}</td>
     <td><span className={`status-badge ${STATUS_CLS[r.status]??'draft'}`}>{STATUS_LABEL[r.status]??r.status}</span></td>
     {manage&&<td>{(r.status==='captured'||r.status==='synced')&&<div style={{display:'flex',gap:'0.25rem'}}>
      <button className="compact" onClick={()=>void validateReading(r.id,'validated')}><CheckCircle2 size={14}/></button>
      <button className="compact outline" onClick={()=>void validateReading(r.id,'rejected')}><X size={14}/></button>
     </div>}</td>}
    </tr>)}</tbody></table></div>}
  </section>}
 </main>;
}
