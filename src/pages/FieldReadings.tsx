import {useCallback,useEffect,useMemo,useState} from 'react';
import {AlertTriangle,Camera,CheckCircle2,CloudOff,MapPin,Plus,RefreshCw,Upload,X} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {listMeteringConnections} from '../features/metering/service';
import {captureFieldReading,generateOfflineId,getGeoLocation,listFieldReadings,loadOfflineQueue,removeFromOfflineQueue,saveOfflineQueue,syncFieldReadings,validateFieldReading,type FieldReadingPayload} from '../features/metering/fieldService';
import {Badge,Button,ErrorState,Tabs} from '../design-system/primitives';
import {formatDateTime} from '../design-system/utils';

type Row=Record<string,any>;
type Tab='capture'|'queue'|'list';
const STATUS_LABEL:Record<string,string>={captured:'Capturada',synced:'Sincronizada',validated:'Validada',rejected:'Rechazada'};
const statusTone=(s:string):'success'|'danger'|'warning'|'neutral'=>s==='validated'?'success':s==='rejected'?'danger':s==='synced'?'warning':'neutral';

export function FieldReadings(){
  const auth=useAuth();
  const manage=auth.has('field.manage');
  const [tab,setTab]=useState<Tab>('capture');
  const [rows,setRows]=useState<Row[]>([]);
  const [connections,setConnections]=useState<Row[]>([]);
  const [offlineQueue,setOfflineQueue]=useState<FieldReadingPayload[]>(loadOfflineQueue());
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [gps,setGps]=useState<{lat:number;lng:number;accuracy:number}|null>(null);
  const [gpsLoading,setGpsLoading]=useState(false);
  const [photoPreview,setPhotoPreview]=useState<string|null>(null);
  const [form,setForm]=useState({connection_id:'',previous_reading:'',current_reading:'',notes:'',anomaly_code:''});

  const load=useCallback(async()=>{
    try{
      const [readingRows,connRows]=await Promise.all([listFieldReadings(filter||null,null,null),listMeteringConnections(query)]);
      setRows(readingRows);setConnections(connRows);setError('');
    }catch(e){setError((e as Error).message);}
  },[query,filter]);
  useEffect(()=>{void load();},[load]);

  const connLabel=useCallback((id:string)=>{
    const c=connections.find(x=>x.id===id);
    return c?`${c.code} · ${c.meter_number}`:'Pegue seleccionado';
  },[connections]);

  const selectedConn=useMemo(()=>connections.find(c=>c.id===form.connection_id),[connections,form.connection_id]);
  useEffect(()=>{
    if(selectedConn)setForm(f=>({...f,previous_reading:String(selectedConn.last_reading??0)}));
  },[selectedConn]);

  const counts=useMemo(()=>({
    captured:rows.filter(r=>r.status==='captured').length,
    synced:rows.filter(r=>r.status==='synced').length,
    validated:rows.filter(r=>r.status==='validated').length,
    rejected:rows.filter(r=>r.status==='rejected').length,
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
  function resetForm(){
    setForm({connection_id:'',previous_reading:'',current_reading:'',notes:'',anomaly_code:''});
    setGps(null);setPhotoPreview(null);
  }
  async function submitCapture(e:React.FormEvent){
    e.preventDefault();
    const payload:FieldReadingPayload={
      connection_id:form.connection_id,previous_reading:Number(form.previous_reading),current_reading:Number(form.current_reading),
      notes:form.notes||undefined,anomaly_code:form.anomaly_code||undefined,
      gps_lat:gps?.lat,gps_lng:gps?.lng,gps_accuracy_m:gps?.accuracy,photo_url:photoPreview??undefined,
      offline_id:generateOfflineId(),captured_at:new Date().toISOString(),
    };
    if(navigator.onLine){
      try{await captureFieldReading(payload);setNotice('Lectura capturada y auditada.');resetForm();await load();}
      catch(e){setError((e as Error).message);}
    }else{
      const queue=[...offlineQueue,payload];saveOfflineQueue(queue);setOfflineQueue(queue);
      setNotice('Sin conexión — guardada en cola offline.');resetForm();setTab('queue');
    }
  }
  async function syncQueue(){
    if(offlineQueue.length===0){setNotice('Cola vacía.');return;}
    try{
      const result=await syncFieldReadings(offlineQueue);
      saveOfflineQueue([]);setOfflineQueue([]);
      setNotice(`Sincronizadas ${result?.synced??0} lecturas (${result?.dupes??0} duplicados).`);await load();setTab('list');
    }catch(e){setError((e as Error).message);}
  }
  async function validateReading(id:string,status:'validated'|'rejected'){
    try{await validateFieldReading(id,status);setNotice(`Lectura ${STATUS_LABEL[status]}.`);await load();}
    catch(e){setError((e as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Lecturas de campo</h1><p>Captura en sitio con GPS, foto y cola offline para técnicos.</p></div>
      <button type="button" className="ja-tab" onClick={()=>void load()}><RefreshCw size={14}/> Actualizar</button>
      {manage&&<Button icon={<Upload size={15}/>} disabled={offlineQueue.length===0} onClick={()=>void syncQueue()}>Sincronizar {offlineQueue.length>0?`(${offlineQueue.length})`:''}</Button>}
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={()=>void load()}/>}

    <div className="ja-home-metrics">
      <article className="ja-metric"><small>Capturadas</small><strong>{counts.captured}</strong></article>
      <article className="ja-metric"><small>Sincronizadas</small><strong>{counts.synced}</strong></article>
      <article className="ja-metric"><small>Validadas</small><strong>{counts.validated}</strong></article>
      <article className="ja-metric"><small>Rechazadas</small><strong>{counts.rejected}</strong></article>
    </div>

    <Tabs value={tab} onChange={v=>setTab(v as Tab)} tabs={[
      {value:'capture',label:'Capturar'},{value:'queue',label:`Cola offline (${offlineQueue.length})`},{value:'list',label:'Historial'},
    ]}/>

    {tab==='capture'&&manage&&<section className="ja-list">
      <h3 className="ja-list-heading"><Plus size={16}/> Nueva lectura de campo</h3>
      <form className="ja-pos-fields" onSubmit={submitCapture}>
        <label className="ja-field"><span className="ja-field-label">Buscar pegue</span><input className="ja-control" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, medidor o abonado"/></label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Pegue con medidor</span>
            <select className="ja-control" required value={form.connection_id} onChange={e=>setForm({...form,connection_id:e.target.value})}>
              <option value="">Seleccione</option>{connections.map(c=><option key={c.id} value={c.id}>{c.code} · {c.meter_number} · {c.subscriber_name}</option>)}
            </select>
          </label>
          <label className="ja-field"><span className="ja-field-label">Lectura anterior</span><input className="ja-control" type="number" min="0" step="0.001" required value={form.previous_reading} onChange={e=>setForm({...form,previous_reading:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Lectura actual</span><input className="ja-control" type="number" min="0" step="0.001" required value={form.current_reading} onChange={e=>setForm({...form,current_reading:e.target.value})}/></label>
        </div>
        <div className="ja-row-actions">
          <Button type="button" variant="secondary" icon={<MapPin size={14}/>} disabled={gpsLoading} onClick={requestGps}>{gps?'Ubicación obtenida':gpsLoading?'Obteniendo…':'Obtener ubicación'}</Button>
          {gps&&<span className="ja-cell-sub">{gps.lat.toFixed(6)}, {gps.lng.toFixed(6)} ±{gps.accuracy.toFixed(0)}m</span>}
        </div>
        <label className="ja-field"><span className="ja-field-label">Foto del medidor</span>
          <input className="ja-control" type="file" accept="image/*" capture="environment" onChange={handlePhoto}/>
          {photoPreview&&<img src={photoPreview} alt="Vista previa" style={{maxWidth:200,marginTop:'.5rem',borderRadius:8}}/>}
        </label>
        <label className="ja-field"><span className="ja-field-label">Observación</span><input className="ja-control" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Fuga, medidor dañado, etc."/></label>
        <Button type="submit" icon={<Camera size={15}/>}>Capturar lectura{navigator.onLine?'':' (offline)'}</Button>
      </form>
    </section>}

    {tab==='queue'&&<section className="ja-list">
      <h3 className="ja-list-heading"><CloudOff size={16}/> Cola offline</h3>
      {offlineQueue.length===0
        ?<p style={{color:'var(--ja-text-muted)',margin:0}}>No hay lecturas pendientes en la cola offline.</p>
        :offlineQueue.map((item,i)=><article key={item.offline_id} className="ja-list-row">
          <div>
            <strong>Lectura {i+1} — {connLabel(item.connection_id)}</strong>
            <span className="ja-cell-sub">
              Anterior {item.previous_reading} → actual {item.current_reading} ({(item.current_reading-item.previous_reading).toFixed(3)} m³)
              {item.gps_lat?` · GPS ${item.gps_lat.toFixed(4)}, ${item.gps_lng?.toFixed(4)}`:''} · {item.captured_at?formatDateTime(item.captured_at):'—'}
            </span>
          </div>
          <Button variant="secondary" icon={<X size={14}/>} onClick={()=>setOfflineQueue(removeFromOfflineQueue(i))}>Quitar</Button>
        </article>)}
    </section>}

    {tab==='list'&&<section className="ja-table-scroll">
      <div className="ja-list-heading">Historial de lecturas</div>
      <Tabs value={filter} onChange={setFilter} tabs={[{value:'',label:'Todas'},...Object.keys(STATUS_LABEL).map(s=>({value:s,label:STATUS_LABEL[s]}))]}/>
      <table className="ja-table">
        <thead><tr><th>Número</th><th>Pegue</th><th>Abonado</th><th className="ja-td-num">Anterior</th><th className="ja-td-num">Actual</th><th className="ja-td-num">Consumo</th><th>GPS</th><th>Estado</th>{manage&&<th>Acción</th>}</tr></thead>
        <tbody>
          {rows.length===0
            ?<tr><td colSpan={manage?9:8} className="ja-table-empty">No existen lecturas de campo.</td></tr>
            :rows.map(r=><tr key={r.id}>
              <td><strong>{r.reading_number}</strong></td>
              <td>{r.connection_code}<span className="ja-cell-sub">{r.meter_number}</span></td>
              <td>{r.subscriber_name}</td>
              <td className="ja-td-num">{r.previous_reading}</td>
              <td className="ja-td-num">{r.current_reading}</td>
              <td className="ja-td-num">{r.consumption} m³</td>
              <td>{r.gps_lat?`${r.gps_lat.toFixed(4)}, ${r.gps_lng?.toFixed(4)}`:'—'}</td>
              <td><Badge tone={statusTone(r.status)}>{STATUS_LABEL[r.status]??r.status}</Badge></td>
              {manage&&<td>{(r.status==='captured'||r.status==='synced')&&<div className="ja-row-actions">
                <Button variant="secondary" icon={<CheckCircle2 size={13}/>} onClick={()=>void validateReading(r.id,'validated')}>Validar</Button>
                <Button variant="secondary" icon={<X size={13}/>} onClick={()=>void validateReading(r.id,'rejected')}>Rechazar</Button>
              </div>}</td>}
            </tr>)}
        </tbody>
      </table>
    </section>}

    {counts.rejected>0&&<div className="ja-banner ja-banner-info"><AlertTriangle size={14}/> Hay lecturas rechazadas que requieren revisión antes de facturar.</div>}
  </main>;
}
