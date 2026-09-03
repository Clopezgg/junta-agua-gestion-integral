import {useCallback,useEffect,useMemo,useState} from 'react';
import {AlertTriangle,FileCheck2,Plus,RefreshCw,Scissors} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {createReadingBatch,listConsumptionSchemes,listCutCandidates,listMeteringConnections,listReadingBatches,listReadings,postReadingBatch,saveConsumptionScheme,saveReading,type TariffBlock} from '../features/metering/service';
import {Badge,Button,ErrorState,Tabs} from '../design-system/primitives';
import {formatMoney} from '../design-system/utils';

type Row=Record<string,any>;
type Tab='readings'|'tariffs'|'cuts';
const today=new Date().toISOString().slice(0,10);
const month=new Date().toISOString().slice(0,7);
const M=(v:unknown)=>formatMoney(typeof v==='number'||typeof v==='string'?v:0);

export function Metering(){
  const auth=useAuth();
  const manage=auth.has('metering.manage');
  const [tab,setTab]=useState<Tab>('readings');
  const [schemes,setSchemes]=useState<Row[]>([]);
  const [batches,setBatches]=useState<Row[]>([]);
  const [connections,setConnections]=useState<Row[]>([]);
  const [readings,setReadings]=useState<Row[]>([]);
  const [cuts,setCuts]=useState<Row[]>([]);
  const [selectedBatchId,setSelectedBatchId]=useState('');
  const [query,setQuery]=useState('');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [cutDays,setCutDays]=useState(30);
  const [batchForm,setBatchForm]=useState({period_key:month,reading_date:today,due_date:today,scheme_id:'',notes:''});
  const [readingForm,setReadingForm]=useState({connection_id:'',previous_reading:'',current_reading:'',notes:''});
  const [schemeForm,setSchemeForm]=useState({code:'',name:'',service_type:'residential',fixed_charge:'0',effective_from:today,description:'',notes:''});
  const [blocks,setBlocks]=useState<TariffBlock[]>([
    {block_order:1,from_volume:0,to_volume:15,unit_price:0},
    {block_order:2,from_volume:15,to_volume:null,unit_price:0},
  ]);

  const load=useCallback(async()=>{
    try{
      const [schemeRows,batchRows,connectionRows]=await Promise.all([listConsumptionSchemes(),listReadingBatches(),listMeteringConnections(query)]);
      setSchemes(schemeRows);setBatches(batchRows);setConnections(connectionRows);setError('');
      if(selectedBatchId)setReadings(await listReadings(selectedBatchId));else setReadings([]);
    }catch(e){setError((e as Error).message);}
  },[query,selectedBatchId]);
  useEffect(()=>{void load();},[load]);

  const selectedBatch=useMemo(()=>batches.find(r=>r.id===selectedBatchId)??null,[batches,selectedBatchId]);
  const selectedConnection=useMemo(()=>connections.find(r=>r.id===readingForm.connection_id),[connections,readingForm.connection_id]);
  useEffect(()=>{
    if(selectedConnection)setReadingForm(cur=>({...cur,previous_reading:String(selectedConnection.last_reading??0)}));
  },[selectedConnection]);

  async function saveScheme(e:React.FormEvent){
    e.preventDefault();
    try{
      await saveConsumptionScheme({...schemeForm,fixed_charge:Number(schemeForm.fixed_charge),blocks});
      setNotice('Tarifa escalonada versionada y guardada con MFA.');
      setSchemeForm({code:'',name:'',service_type:'residential',fixed_charge:'0',effective_from:today,description:'',notes:''});
      setBlocks([{block_order:1,from_volume:0,to_volume:15,unit_price:0},{block_order:2,from_volume:15,to_volume:null,unit_price:0}]);
      await load();
    }catch(e){setError((e as Error).message);}
  }
  async function saveBatch(e:React.FormEvent){
    e.preventDefault();
    try{const created=await createReadingBatch(batchForm);setSelectedBatchId(created.id);setNotice('Lote de lecturas creado.');await load();}
    catch(e){setError((e as Error).message);}
  }
  async function submitReading(e:React.FormEvent){
    e.preventDefault();
    if(!selectedBatch)return;
    try{
      const result=await saveReading(selectedBatch.id,{connection_id:readingForm.connection_id,previous_reading:Number(readingForm.previous_reading),current_reading:Number(readingForm.current_reading),notes:readingForm.notes});
      setNotice(result.status==='warning'?'Lectura guardada con alerta de consumo inusual.':'Lectura validada.');
      setReadingForm({connection_id:'',previous_reading:'',current_reading:'',notes:''});
      await load();
    }catch(e){setError((e as Error).message);}
  }
  async function postBatch(){
    if(!selectedBatch)return;
    try{const result=await postReadingBatch(selectedBatch.id);setNotice(`${result.posted} lecturas facturadas para ${result.period_key}.`);await load();}
    catch(e){setError((e as Error).message);}
  }
  async function loadCuts(){
    try{setCuts(await listCutCandidates(cutDays));setError('');}catch(e){setError((e as Error).message);}
  }
  function updateBlock(index:number,patch:Partial<TariffBlock>){
    setBlocks(cur=>cur.map((b,i)=>i===index?{...b,...patch}:b).map((b,i)=>({...b,block_order:i+1})));
  }
  function addBlock(){
    const last=blocks[blocks.length-1];
    const start=last?.to_volume??last?.from_volume??0;
    setBlocks(cur=>[...cur.slice(0,-1),{...last,to_volume:start},{block_order:cur.length+1,from_volume:start,to_volume:null,unit_price:0}]);
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Medición, consumo y cortes</h1><p>Lecturas trazables, tarifas por bloques, facturación idempotente y candidatos a suspensión.</p></div>
      <button type="button" className="ja-tab" onClick={()=>void load()}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={()=>void load()}/>}

    <Tabs value={tab} onChange={v=>setTab(v as Tab)} tabs={[
      {value:'readings',label:'Lecturas'},{value:'tariffs',label:'Tarifas por consumo'},{value:'cuts',label:'Candidatos a corte'},
    ]}/>

    {tab==='readings'&&<>
      {manage&&<section className="ja-list">
        <h3 className="ja-list-heading"><Plus size={16}/> Nuevo lote</h3>
        <form className="ja-pos-fields" onSubmit={saveBatch}>
          <div className="ja-pos-grid">
            <label className="ja-field"><span className="ja-field-label">Periodo</span><input className="ja-control" required value={batchForm.period_key} onChange={e=>setBatchForm({...batchForm,period_key:e.target.value})} placeholder="2026-07"/></label>
            <label className="ja-field"><span className="ja-field-label">Tarifa</span>
              <select className="ja-control" required value={batchForm.scheme_id} onChange={e=>setBatchForm({...batchForm,scheme_id:e.target.value})}>
                <option value="">Seleccione</option>{schemes.filter(r=>r.status==='active').map(r=><option key={r.id} value={r.id}>{r.code} v{r.version_number} — {r.name}</option>)}
              </select>
            </label>
            <label className="ja-field"><span className="ja-field-label">Fecha de lectura</span><input className="ja-control" type="date" required value={batchForm.reading_date} onChange={e=>setBatchForm({...batchForm,reading_date:e.target.value})}/></label>
            <label className="ja-field"><span className="ja-field-label">Vencimiento</span><input className="ja-control" type="date" required value={batchForm.due_date} onChange={e=>setBatchForm({...batchForm,due_date:e.target.value})}/></label>
          </div>
          <Button type="submit">Crear lote</Button>
        </form>
      </section>}

      <section className="ja-list">
        <h3 className="ja-list-heading">Lotes de lectura</h3>
        {batches.length===0
          ?<p style={{color:'var(--ja-text-muted)',margin:0}}>No existen lotes.</p>
          :batches.map(r=><button key={r.id} type="button" className={`ja-list-row ja-row-click${selectedBatchId===r.id?' ja-row-selected':''}`} style={{width:'100%',textAlign:'left',border:'none',background:'none'}} onClick={async()=>{setSelectedBatchId(r.id);setReadings(await listReadings(r.id));}}>
            <div><strong>{r.period_key} — {r.scheme_name}</strong><span className="ja-cell-sub">{r.status} · {r.total_readings} lecturas · {r.error_readings} errores</span></div>
          </button>)}
      </section>

      {selectedBatch&&<section className="ja-table-scroll">
        <div className="ja-list-heading" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>Lote {selectedBatch.period_key} — {selectedBatch.scheme_name}</span>
          <Badge tone={selectedBatch.status==='posted'?'success':selectedBatch.error_readings>0?'danger':'warning'}>{selectedBatch.status}</Badge>
        </div>
        {manage&&selectedBatch.status!=='posted'&&<form className="ja-pos-fields" onSubmit={submitReading} style={{marginBottom:'1rem'}}>
          <div className="ja-pos-grid">
            <label className="ja-field"><span className="ja-field-label">Buscar pegue</span><input className="ja-control" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, medidor o abonado"/></label>
            <label className="ja-field"><span className="ja-field-label">Pegue con medidor</span>
              <select className="ja-control" required value={readingForm.connection_id} onChange={e=>setReadingForm({...readingForm,connection_id:e.target.value})}>
                <option value="">Seleccione</option>{connections.map(r=><option key={r.id} value={r.id}>{r.code} · {r.meter_number} · {r.subscriber_name}</option>)}
              </select>
            </label>
            <label className="ja-field"><span className="ja-field-label">Lectura anterior</span><input className="ja-control" type="number" min="0" step="0.001" required value={readingForm.previous_reading} onChange={e=>setReadingForm({...readingForm,previous_reading:e.target.value})}/></label>
            <label className="ja-field"><span className="ja-field-label">Lectura actual</span><input className="ja-control" type="number" min="0" step="0.001" required value={readingForm.current_reading} onChange={e=>setReadingForm({...readingForm,current_reading:e.target.value})}/></label>
          </div>
          <Button type="submit">Guardar lectura</Button>
        </form>}
        <table className="ja-table">
          <thead><tr><th>Pegue</th><th>Abonado</th><th className="ja-td-num">Anterior</th><th className="ja-td-num">Actual</th><th className="ja-td-num">Consumo</th><th>Estado</th></tr></thead>
          <tbody>
            {readings.length===0
              ?<tr><td colSpan={6} className="ja-table-empty">Sin lecturas registradas.</td></tr>
              :readings.map(r=><tr key={r.id}>
                <td>{r.connection_code}<span className="ja-cell-sub">{r.meter_number}</span></td>
                <td>{r.subscriber_name}</td>
                <td className="ja-td-num">{r.previous_reading}</td>
                <td className="ja-td-num">{r.current_reading}</td>
                <td className="ja-td-num">{r.consumption} m³</td>
                <td><Badge tone={r.status==='error'?'danger':r.status==='warning'?'warning':'success'}>{r.status}</Badge></td>
              </tr>)}
          </tbody>
        </table>
        {manage&&selectedBatch.status==='validated'&&<div style={{marginTop:'.75rem'}}><Button icon={<FileCheck2 size={15}/>} onClick={()=>void postBatch()}>Facturar lote con MFA</Button></div>}
      </section>}
    </>}

    {tab==='tariffs'&&<>
      {manage&&<section className="ja-list">
        <h3 className="ja-list-heading"><Plus size={16}/> Nueva versión de tarifa</h3>
        <form className="ja-pos-fields" onSubmit={saveScheme}>
          <div className="ja-pos-grid">
            <label className="ja-field"><span className="ja-field-label">Código</span><input className="ja-control" required value={schemeForm.code} onChange={e=>setSchemeForm({...schemeForm,code:e.target.value})}/></label>
            <label className="ja-field"><span className="ja-field-label">Nombre</span><input className="ja-control" required value={schemeForm.name} onChange={e=>setSchemeForm({...schemeForm,name:e.target.value})}/></label>
            <label className="ja-field"><span className="ja-field-label">Servicio</span>
              <select className="ja-control" value={schemeForm.service_type} onChange={e=>setSchemeForm({...schemeForm,service_type:e.target.value})}>
                <option value="">Todos</option><option value="residential">Residencial</option><option value="commercial">Comercial</option><option value="community">Comunitario</option><option value="institutional">Institucional</option>
              </select>
            </label>
            <label className="ja-field"><span className="ja-field-label">Cargo fijo</span><input className="ja-control" type="number" min="0" step="0.01" value={schemeForm.fixed_charge} onChange={e=>setSchemeForm({...schemeForm,fixed_charge:e.target.value})}/></label>
            <label className="ja-field"><span className="ja-field-label">Vigente desde</span><input className="ja-control" type="date" required value={schemeForm.effective_from} onChange={e=>setSchemeForm({...schemeForm,effective_from:e.target.value})}/></label>
          </div>
          <span className="ja-field-label">Bloques de consumo</span>
          {blocks.map((block,index)=><div key={index} className="ja-pos-grid">
            <label className="ja-field"><span className="ja-field-label">#{index+1} Desde</span><input className="ja-control" type="number" min="0" step="0.001" value={block.from_volume} onChange={e=>updateBlock(index,{from_volume:Number(e.target.value)})}/></label>
            <label className="ja-field"><span className="ja-field-label">Hasta</span><input className="ja-control" type="number" min="0" step="0.001" disabled={index===blocks.length-1} value={block.to_volume??''} onChange={e=>updateBlock(index,{to_volume:e.target.value===''?null:Number(e.target.value)})}/></label>
            <label className="ja-field"><span className="ja-field-label">Precio por m³</span><input className="ja-control" type="number" min="0" step="0.0001" value={block.unit_price} onChange={e=>updateBlock(index,{unit_price:Number(e.target.value)})}/></label>
          </div>)}
          <Button type="button" variant="secondary" icon={<Plus size={14}/>} onClick={addBlock}>Agregar bloque</Button>
          <Button type="submit">Guardar versión con MFA</Button>
        </form>
      </section>}

      <section className="ja-list">
        <h3 className="ja-list-heading">Tarifas vigentes e históricas</h3>
        {schemes.map(r=><article key={r.id} className="ja-list-row">
          <div>
            <strong>{r.code} v{r.version_number} — {r.name}</strong>
            <span className="ja-cell-sub">{r.service_type||'Todos los servicios'} · cargo fijo {M(r.fixed_charge)} · desde {r.effective_from} · {(r.blocks??[]).map((b:Row)=>`${b.from_volume}–${b.to_volume??'∞'} m³: ${M(b.unit_price)}/m³`).join(' · ')}</span>
          </div>
          <Badge tone={r.status==='active'?'success':'neutral'}>{r.status}</Badge>
        </article>)}
      </section>
    </>}

    {tab==='cuts'&&<section className="ja-table-scroll">
      <div className="ja-list-heading" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem'}}>
        <span>Candidatos a suspensión por mora</span>
        <span className="ja-toolbar">
          <input className="ja-control" style={{maxWidth:'6rem'}} type="number" min="0" value={cutDays} onChange={e=>setCutDays(Number(e.target.value))}/>
          <Button variant="secondary" icon={<Scissors size={14}/>} onClick={()=>void loadCuts()}>Calcular</Button>
        </span>
      </div>
      <div className="ja-banner ja-banner-info"><AlertTriangle size={14}/> La lista es informativa; no ejecuta cortes automáticos. Antes de emitir una orden valide pagos recientes, excepciones autorizadas y normativa local.</div>
      <table className="ja-table">
        <thead><tr><th>Abonado</th><th>Pegue</th><th>Sector</th><th className="ja-td-num">Deuda vencida</th><th className="ja-td-num">Días</th></tr></thead>
        <tbody>
          {cuts.length===0
            ?<tr><td colSpan={5} className="ja-table-empty">Ejecute el cálculo para consultar candidatos.</td></tr>
            :cuts.map(r=><tr key={`${r.subscriber_id}-${r.connection_id}`}>
              <td><strong>{r.subscriber_code}</strong><span className="ja-cell-sub">{r.subscriber_name}</span></td>
              <td>{r.connection_code}<span className="ja-cell-sub">{r.meter_number}</span></td>
              <td>{r.sector}</td>
              <td className="ja-td-num">{M(r.overdue_amount)}</td>
              <td className="ja-td-num">{r.days_overdue}</td>
            </tr>)}
        </tbody>
      </table>
    </section>}
  </main>;
}
