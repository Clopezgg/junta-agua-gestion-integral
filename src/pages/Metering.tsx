import {useCallback,useEffect,useMemo,useState} from 'react';
import {AlertTriangle,Droplets,FileCheck2,Gauge,Plus,RefreshCw,Scissors} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {createReadingBatch,listConsumptionSchemes,listCutCandidates,listMeteringConnections,listReadingBatches,listReadings,postReadingBatch,saveConsumptionScheme,saveReading,type TariffBlock} from '../features/metering/service';

type Row=Record<string,any>;
type Tab='readings'|'tariffs'|'cuts';
const today=new Date().toISOString().slice(0,10);
const month=new Date().toISOString().slice(0,7);
const money=(value:unknown)=>`L ${Number(value??0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export function Metering(){
  const auth=useAuth();
  const[tab,setTab]=useState<Tab>('readings');
  const[schemes,setSchemes]=useState<Row[]>([]);
  const[batches,setBatches]=useState<Row[]>([]);
  const[connections,setConnections]=useState<Row[]>([]);
  const[readings,setReadings]=useState<Row[]>([]);
  const[cuts,setCuts]=useState<Row[]>([]);
  const[selectedBatchId,setSelectedBatchId]=useState('');
  const[query,setQuery]=useState('');
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');
  const[cutDays,setCutDays]=useState(30);
  const[batchForm,setBatchForm]=useState({period_key:month,reading_date:today,due_date:today,scheme_id:'',notes:''});
  const[readingForm,setReadingForm]=useState({connection_id:'',previous_reading:'',current_reading:'',notes:''});
  const[schemeForm,setSchemeForm]=useState({code:'',name:'',service_type:'residential',fixed_charge:'0',effective_from:today,description:'',notes:''});
  const[blocks,setBlocks]=useState<TariffBlock[]>([
    {block_order:1,from_volume:0,to_volume:15,unit_price:0},
    {block_order:2,from_volume:15,to_volume:null,unit_price:0}
  ]);

  const load=useCallback(async()=>{
    try{
      const[schemeRows,batchRows,connectionRows]=await Promise.all([
        listConsumptionSchemes(),listReadingBatches(),listMeteringConnections(query)
      ]);
      setSchemes(schemeRows);setBatches(batchRows);setConnections(connectionRows);setError('');
      if(selectedBatchId)setReadings(await listReadings(selectedBatchId));else setReadings([]);
    }catch(e){setError((e as Error).message)}
  },[query,selectedBatchId]);

  useEffect(()=>{void load()},[load]);
  const selectedBatch=useMemo(()=>batches.find(row=>row.id===selectedBatchId)??null,[batches,selectedBatchId]);

  const selectedConnection=useMemo(()=>connections.find(row=>row.id===readingForm.connection_id),[connections,readingForm.connection_id]);
  useEffect(()=>{
    if(selectedConnection)setReadingForm(current=>({...current,previous_reading:String(selectedConnection.last_reading??0)}));
  },[selectedConnection]);

  async function saveScheme(event:React.FormEvent){
    event.preventDefault();
    try{
      await saveConsumptionScheme({...schemeForm,fixed_charge:Number(schemeForm.fixed_charge),blocks});
      setMessage('Tarifa escalonada versionada y guardada con MFA.');
      setSchemeForm({code:'',name:'',service_type:'residential',fixed_charge:'0',effective_from:today,description:'',notes:''});
      setBlocks([{block_order:1,from_volume:0,to_volume:15,unit_price:0},{block_order:2,from_volume:15,to_volume:null,unit_price:0}]);
      await load();
    }catch(e){setError((e as Error).message)}
  }

  async function saveBatch(event:React.FormEvent){
    event.preventDefault();
    try{
      const created=await createReadingBatch(batchForm);
      setSelectedBatchId(created.id);setMessage('Lote de lecturas creado.');
      await load();
    }catch(e){setError((e as Error).message)}
  }

  async function submitReading(event:React.FormEvent){
    event.preventDefault();
    if(!selectedBatch)return;
    try{
      const result=await saveReading(selectedBatch.id,{
        connection_id:readingForm.connection_id,
        previous_reading:Number(readingForm.previous_reading),
        current_reading:Number(readingForm.current_reading),
        notes:readingForm.notes
      });
      setMessage(result.status==='warning'?'Lectura guardada con alerta de consumo inusual.':'Lectura validada.');
      setReadingForm({connection_id:'',previous_reading:'',current_reading:'',notes:''});
      await load();
    }catch(e){setError((e as Error).message)}
  }

  async function postBatch(){
    if(!selectedBatch)return;
    try{
      const result=await postReadingBatch(selectedBatch.id);
      setMessage(`${result.posted} lecturas facturadas para ${result.period_key}.`);
      await load();
    }catch(e){setError((e as Error).message)}
  }

  async function loadCuts(){
    try{setCuts(await listCutCandidates(cutDays));setError('')}catch(e){setError((e as Error).message)}
  }

  function updateBlock(index:number,patch:Partial<TariffBlock>){
    setBlocks(current=>{
      const next=current.map((block,i)=>i===index?{...block,...patch}:block);
      return next.map((block,i)=>({...block,block_order:i+1}));
    });
  }
  function addBlock(){
    const last=blocks[blocks.length-1];
    const start=last?.to_volume??last?.from_volume??0;
    setBlocks(current=>[...current.slice(0,-1),{...last,to_volume:start},{block_order:current.length+1,from_volume:start,to_volume:null,unit_price:0}]);
  }

  return <main className="content">
    <div className="titlebar"><div><h1>Medición, consumo y cortes</h1><p>Lecturas trazables, tarifas por bloques, facturación idempotente y candidatos a suspensión.</p></div><button className="outline" onClick={()=>void load()}><RefreshCw size={17}/>Actualizar</button></div>
    {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}
    <div className="module-tabs">
      <button className={tab==='readings'?'active outline':'outline'} onClick={()=>setTab('readings')}><Gauge size={17}/>Lecturas</button>
      <button className={tab==='tariffs'?'active outline':'outline'} onClick={()=>setTab('tariffs')}><Droplets size={17}/>Tarifas por consumo</button>
      <button className={tab==='cuts'?'active outline':'outline'} onClick={()=>setTab('cuts')}><Scissors size={17}/>Candidatos a corte</button>
    </div>

    {tab==='readings'&&<>
      <div className="subscriber-layout">
        {auth.has('metering.manage')&&<section className="panel"><h2><Plus size={19}/>Nuevo lote</h2>
          <form className="subform" onSubmit={saveBatch}>
            <label>Periodo<input required value={batchForm.period_key} onChange={e=>setBatchForm({...batchForm,period_key:e.target.value})} placeholder="2026-07"/></label>
            <label>Tarifa<select required value={batchForm.scheme_id} onChange={e=>setBatchForm({...batchForm,scheme_id:e.target.value})}><option value="">Seleccione</option>{schemes.filter(row=>row.status==='active').map(row=><option key={row.id} value={row.id}>{row.code} v{row.version_number} — {row.name}</option>)}</select></label>
            <label>Fecha de lectura<input type="date" required value={batchForm.reading_date} onChange={e=>setBatchForm({...batchForm,reading_date:e.target.value})}/></label>
            <label>Vencimiento<input type="date" required value={batchForm.due_date} onChange={e=>setBatchForm({...batchForm,due_date:e.target.value})}/></label>
            <label>Notas<textarea value={batchForm.notes} onChange={e=>setBatchForm({...batchForm,notes:e.target.value})}/></label>
            <button>Crear lote</button>
          </form>
        </section>}
        <section className="panel"><h2>Lotes de lectura</h2>{batches.length===0?<div className="empty">No existen lotes.</div>:batches.map(row=><button className={`list-button ${selectedBatchId===row.id?'selected':''}`} key={row.id} onClick={async()=>{setSelectedBatchId(row.id);setReadings(await listReadings(row.id))}}><strong>{row.period_key} — {row.scheme_name}</strong><small>{row.status} · {row.total_readings} lecturas · {row.error_readings} errores</small></button>)}</section>
      </div>

      {selectedBatch&&<section className="panel" style={{marginTop:'1rem'}}>
        <div className="titlebar"><div><h2>Lote {selectedBatch.period_key}</h2><p>{selectedBatch.scheme_name} · lectura {selectedBatch.reading_date} · vence {selectedBatch.due_date}</p></div><span className={`status-badge ${selectedBatch.status==='posted'?'approved':selectedBatch.error_readings>0?'critical':'draft'}`}>{selectedBatch.status}</span></div>
        {auth.has('metering.manage')&&selectedBatch.status!=='posted'&&<form className="form-grid reading-entry" onSubmit={submitReading}>
          <label>Buscar pegue<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, medidor o abonado"/></label>
          <label>Pegue con medidor<select required value={readingForm.connection_id} onChange={e=>setReadingForm({...readingForm,connection_id:e.target.value})}><option value="">Seleccione</option>{connections.map(row=><option key={row.id} value={row.id}>{row.code} · {row.meter_number} · {row.subscriber_name}</option>)}</select></label>
          <label>Lectura anterior<input type="number" min="0" step="0.001" required value={readingForm.previous_reading} onChange={e=>setReadingForm({...readingForm,previous_reading:e.target.value})}/></label>
          <label>Lectura actual<input type="number" min="0" step="0.001" required value={readingForm.current_reading} onChange={e=>setReadingForm({...readingForm,current_reading:e.target.value})}/></label>
          <label className="span-2">Observación<input value={readingForm.notes} onChange={e=>setReadingForm({...readingForm,notes:e.target.value})}/></label>
          <button>Guardar lectura</button>
        </form>}
        <div className="table-scroll"><table><thead><tr><th>Pegue</th><th>Abonado</th><th>Anterior</th><th>Actual</th><th>Consumo</th><th>Estado</th></tr></thead><tbody>{readings.map(row=><tr key={row.id}><td>{row.connection_code}<small>{row.meter_number}</small></td><td>{row.subscriber_name}</td><td>{row.previous_reading}</td><td>{row.current_reading}</td><td>{row.consumption} m³</td><td><span className={`status-badge ${row.status==='error'?'critical':row.status==='warning'?'fair':'approved'}`}>{row.status}</span>{row.anomaly_code&&<small>{row.anomaly_code}</small>}</td></tr>)}</tbody></table></div>
        {auth.has('metering.manage')&&selectedBatch.status==='validated'&&<button onClick={()=>void postBatch()}><FileCheck2 size={18}/>Facturar lote con MFA</button>}
      </section>}
    </>}

    {tab==='tariffs'&&<div className="subscriber-layout">
      {auth.has('metering.manage')&&<section className="panel"><h2><Plus size={19}/>Nueva versión de tarifa</h2>
        <form className="subform" onSubmit={saveScheme}>
          <div className="form-grid"><label>Código<input required value={schemeForm.code} onChange={e=>setSchemeForm({...schemeForm,code:e.target.value})}/></label><label>Nombre<input required value={schemeForm.name} onChange={e=>setSchemeForm({...schemeForm,name:e.target.value})}/></label>
          <label>Servicio<select value={schemeForm.service_type} onChange={e=>setSchemeForm({...schemeForm,service_type:e.target.value})}><option value="">Todos</option><option value="residential">Residencial</option><option value="commercial">Comercial</option><option value="community">Comunitario</option><option value="institutional">Institucional</option></select></label>
          <label>Cargo fijo<input type="number" min="0" step="0.01" value={schemeForm.fixed_charge} onChange={e=>setSchemeForm({...schemeForm,fixed_charge:e.target.value})}/></label>
          <label>Vigente desde<input type="date" required value={schemeForm.effective_from} onChange={e=>setSchemeForm({...schemeForm,effective_from:e.target.value})}/></label></div>
          <h3>Bloques de consumo</h3>{blocks.map((block,index)=><div className="tariff-block" key={index}><strong>#{index+1}</strong><label>Desde<input type="number" min="0" step="0.001" value={block.from_volume} onChange={e=>updateBlock(index,{from_volume:Number(e.target.value)})}/></label><label>Hasta<input type="number" min="0" step="0.001" disabled={index===blocks.length-1} value={block.to_volume??''} onChange={e=>updateBlock(index,{to_volume:e.target.value===''?null:Number(e.target.value)})}/></label><label>Precio por m³<input type="number" min="0" step="0.0001" value={block.unit_price} onChange={e=>updateBlock(index,{unit_price:Number(e.target.value)})}/></label></div>)}
          <button type="button" className="outline" onClick={addBlock}><Plus size={16}/>Agregar bloque</button>
          <label>Notas<textarea value={schemeForm.notes} onChange={e=>setSchemeForm({...schemeForm,notes:e.target.value})}/></label><button>Guardar versión con MFA</button>
        </form>
      </section>}
      <section className="panel"><h2>Tarifas vigentes e históricas</h2>{schemes.map(row=><div className="scheme-card" key={row.id}><div><strong>{row.code} v{row.version_number} — {row.name}</strong><small>{row.service_type||'Todos los servicios'} · cargo fijo {money(row.fixed_charge)} · desde {row.effective_from}</small></div><span className={`status-badge ${row.status==='active'?'approved':'draft'}`}>{row.status}</span><div className="scheme-blocks">{(row.blocks??[]).map((block:Row)=><span key={block.id}>{block.from_volume}–{block.to_volume??'∞'} m³: {money(block.unit_price)}/m³</span>)}</div></div>)}</section>
    </div>}

    {tab==='cuts'&&<section className="panel"><div className="titlebar"><div><h2>Candidatos a suspensión por mora</h2><p>La lista es informativa; no ejecuta cortes automáticos.</p></div><div className="actions"><label>Días mínimos<input className="compact-search" type="number" min="0" value={cutDays} onChange={e=>setCutDays(Number(e.target.value))}/></label><button onClick={()=>void loadCuts()}><Scissors size={17}/>Calcular</button></div></div>
      <div className="notice"><AlertTriangle size={16}/>Antes de emitir una orden de corte, valide pagos recientes, excepciones autorizadas y normativa local.</div>
      <div className="table-scroll"><table><thead><tr><th>Abonado</th><th>Pegue</th><th>Sector</th><th>Deuda vencida</th><th>Días</th></tr></thead><tbody>{cuts.map(row=><tr key={`${row.subscriber_id}-${row.connection_id}`}><td><strong>{row.subscriber_code}</strong><small>{row.subscriber_name}</small></td><td>{row.connection_code}<small>{row.meter_number}</small></td><td>{row.sector}</td><td>{money(row.overdue_amount)}</td><td>{row.days_overdue}</td></tr>)}</tbody></table></div>
      {cuts.length===0&&<div className="empty">Ejecute el cálculo para consultar candidatos.</div>}
    </section>}
  </main>;
}
