import {useCallback,useEffect,useMemo,useState} from 'react';
import {CheckCircle2,FileSpreadsheet,PlayCircle,UploadCloud} from 'lucide-react';
import {connectionSchema,subscriberSchema} from '../features/subscribers/validation';
import {importSubscriberWithConnection} from '../features/subscribers/service';
import {cellText,guessColumnMapping,parseDataFile,sha256File,type ParsedDataFile} from '../features/imports/parser';
import {completeImportBatch,createImportBatch,listImportBatches,listImportRows,setImportRowResult,stageImportRows,type ImportKind,type StagedImportRow} from '../features/imports/service';
import {listMeteringConnections,listReadingBatches,saveReading} from '../features/metering/service';
import {Badge,Button,ErrorState} from '../design-system/primitives';
import {formatDateTime} from '../design-system/utils';

type Row=Record<string,any>;
const subscriberFields=[
  ['full_name','Nombre completo',true],['document_type','Tipo de documento',false],['document_number','Identidad o pasaporte',true],
  ['issuing_country','País emisor',false],['whatsapp','WhatsApp',true],['email','Correo',false],
  ['address','Dirección del abonado',true],['sector','Sector',true],['service_type','Tipo de servicio',false],
  ['meter_number','Número de medidor',false],['connection_address','Dirección del pegue',false],
  ['connection_sector','Sector del pegue',false],['notes','Notas',false],
] as const;
const readingFields=[
  ['connection_code','Código del pegue',false],['meter_number','Número de medidor',false],
  ['previous_reading','Lectura anterior',false],['current_reading','Lectura actual',true],['notes','Notas',false],
] as const;
const rowTone=(s:string):'success'|'danger'|'warning'|'neutral'=>s==='imported'?'success':s==='error'?'danger':s==='skipped'?'warning':'neutral';

export function Imports(){
  const [kind,setKind]=useState<ImportKind>('subscribers');
  const [file,setFile]=useState<File|null>(null);
  const [parsed,setParsed]=useState<ParsedDataFile|null>(null);
  const [mapping,setMapping]=useState<Record<string,string>>({});
  const [batch,setBatch]=useState<Row|null>(null);
  const [rows,setRows]=useState<Row[]>([]);
  const [history,setHistory]=useState<Row[]>([]);
  const [readingBatches,setReadingBatches]=useState<Row[]>([]);
  const [readingBatchId,setReadingBatchId]=useState('');
  const [connections,setConnections]=useState<Row[]>([]);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');

  const fields=kind==='subscribers'?subscriberFields:readingFields;
  const refresh=useCallback(async()=>{
    try{
      const [h,b,c]=await Promise.all([listImportBatches(),listReadingBatches(),listMeteringConnections()]);
      setHistory(h);setReadingBatches(b);setConnections(c);setError('');
    }catch(e){setError((e as Error).message);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);

  async function chooseFile(next?:File){
    if(!next)return;
    setBusy(true);
    try{
      const result=await parseDataFile(next);
      setFile(next);setParsed(result);setBatch(null);setRows([]);
      setMapping(guessColumnMapping(result.headers,fields.map(f=>f[0])));
      setNotice(`${result.rows.length} filas leídas. Revise el mapeo antes de validar.`);setError('');
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function mapped(row:Record<string,unknown>,field:string){
    const header=mapping[field];
    return header?cellText(row[header] as any):'';
  }

  async function validate(){
    if(!file||!parsed)return;
    if(kind==='meter_readings'&&!readingBatchId){setError('Seleccione el lote de lecturas que recibirá la importación.');return;}
    setBusy(true);
    try{
      const created=await createImportBatch({kind,file_name:file.name,file_type:file.type||parsed.sourceType,file_size:file.size,source_sha256:await sha256File(file),mapping});
      const staged:StagedImportRow[]=parsed.rows.map((raw,index)=>{
        if(kind==='subscribers'){
          const normalized={
            full_name:mapped(raw,'full_name'),
            document_type:(mapped(raw,'document_type')||'dni').toLowerCase(),
            document_number:mapped(raw,'document_number'),
            issuing_country:(mapped(raw,'issuing_country')||'HND').toUpperCase().slice(0,3),
            whatsapp:mapped(raw,'whatsapp'),email:mapped(raw,'email'),
            address:mapped(raw,'address'),sector:mapped(raw,'sector'),
            service_type:(mapped(raw,'service_type')||'residential').toLowerCase(),
            meter_number:mapped(raw,'meter_number'),
            connection_address:mapped(raw,'connection_address')||mapped(raw,'address'),
            connection_sector:mapped(raw,'connection_sector')||mapped(raw,'sector'),
            notes:mapped(raw,'notes'),
          };
          const result=subscriberSchema.safeParse(normalized);
          const connectionResult=normalized.connection_address?connectionSchema.safeParse({
            service_type:normalized.service_type,address:normalized.connection_address,sector:normalized.connection_sector,
            meter_number:normalized.meter_number||undefined,notes:normalized.notes||undefined,
          }):{success:true} as const;
          const errors=[
            ...(result.success?[]:result.error.issues.map(issue=>`SUBSCRIBER_${issue.path.join('_').toUpperCase()}`)),
            ...(connectionResult.success?[]:(connectionResult as any).error.issues.map((issue:any)=>`CONNECTION_${issue.path.join('_').toUpperCase()}`)),
          ];
          return{row_number:index+2,raw_data:raw,normalized_data:normalized,status:errors.length?'error':'valid',error_codes:errors,message:errors.length?'Revise los campos obligatorios.':undefined};
        }
        const normalized={
          connection_code:mapped(raw,'connection_code'),meter_number:mapped(raw,'meter_number'),
          previous_reading:mapped(raw,'previous_reading'),current_reading:mapped(raw,'current_reading'),notes:mapped(raw,'notes'),
        };
        const current=Number(normalized.current_reading);
        const errors:string[]=[];
        if(!normalized.connection_code&&!normalized.meter_number)errors.push('CONNECTION_REFERENCE_REQUIRED');
        if(!Number.isFinite(current)||current<0)errors.push('CURRENT_READING_INVALID');
        if(normalized.previous_reading&&(!Number.isFinite(Number(normalized.previous_reading))||Number(normalized.previous_reading)<0))errors.push('PREVIOUS_READING_INVALID');
        return{row_number:index+2,raw_data:raw,normalized_data:normalized,status:errors.length?'error':'valid',error_codes:errors,message:errors.length?'No se puede importar esta fila.':undefined};
      });
      await stageImportRows(created.id,staged);
      const serverRows=await listImportRows(created.id);
      setBatch(created);setRows(serverRows);
      setNotice(`Validación registrada: ${serverRows.filter((r:Row)=>r.status==='valid').length} válidas y ${serverRows.filter((r:Row)=>r.status==='error').length} con error.`);
      await refresh();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  async function execute(){
    if(!batch)return;
    setBusy(true);
    let fatal='';
    try{
      for(const row of rows){
        if(row.status!=='valid')continue;
        const data=row.normalized_data as Record<string,string>;
        try{
          if(kind==='subscribers'){
            const subscriberInput=subscriberSchema.parse(data);
            const connectionInput=data.connection_address?connectionSchema.parse({
              service_type:data.service_type||'residential',address:data.connection_address,
              sector:data.connection_sector||data.sector,meter_number:data.meter_number||undefined,notes:data.notes||undefined,
            }):undefined;
            const result=await importSubscriberWithConnection(subscriberInput,connectionInput);
            await setImportRowResult(row.id,'imported',result.subscriber_id,'Abonado y pegue importados en una transacción.');
          }else{
            const connection=connections.find(item=>
              (data.connection_code&&item.code.toLowerCase()===data.connection_code.toLowerCase())||
              (data.meter_number&&String(item.meter_number??'').replace(/\W/g,'').toLowerCase()===data.meter_number.replace(/\W/g,'').toLowerCase())
            );
            if(!connection){
              await setImportRowResult(row.id,'error',undefined,'No se encontró un pegue activo con esa referencia.',['CONNECTION_NOT_FOUND']);
              continue;
            }
            const saved=await saveReading(readingBatchId,{
              connection_id:connection.id,
              previous_reading:data.previous_reading===''?connection.last_reading:Number(data.previous_reading),
              current_reading:Number(data.current_reading),notes:data.notes,
            });
            await setImportRowResult(row.id,'imported',saved.id,saved.status==='warning'?'Lectura importada con alerta.':'Lectura importada.');
          }
        }catch(e){
          const detail=(e as Error).message;
          const duplicate=detail.includes('IMPORT_DUPLICATE_IDENTITY')||detail.includes('IMPORT_HOMONYM_REVIEW_REQUIRED');
          await setImportRowResult(row.id,duplicate?'skipped':'error',undefined,detail,[duplicate?'MANUAL_DUPLICATE_REVIEW':'ROW_IMPORT_FAILED']);
        }
      }
      await completeImportBatch(batch.id);
      const finalRows=await listImportRows(batch.id);setRows(finalRows);
      setNotice(`Importación terminada: ${finalRows.filter((r:Row)=>r.status==='imported').length} importadas, ${finalRows.filter((r:Row)=>r.status==='skipped').length} omitidas y ${finalRows.filter((r:Row)=>r.status==='error').length} con error.`);
      await refresh();
    }catch(e){fatal=(e as Error).message;setError(fatal);await completeImportBatch(batch.id,fatal).catch(()=>undefined);}finally{setBusy(false);}
  }

  const canValidate=Boolean(file&&parsed&&fields.filter(f=>f[2]).every(f=>mapping[f[0]]));
  const canExecute=Boolean(batch&&rows.some(r=>r.status==='valid'));
  const preview=useMemo(()=>parsed?.rows.slice(0,20)??[],[parsed]);

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Importación controlada</h1><p>XLSX, CSV o TSV con previsualización, mapeo, validación por fila y trazabilidad completa.</p></div>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={()=>setError('')}/>}

    <section className="ja-list">
      <h3 className="ja-list-heading">Origen</h3>
      <div className="ja-pos-grid">
        <label className="ja-field"><span className="ja-field-label">Tipo de importación</span>
          <select className="ja-control" value={kind} onChange={e=>{setKind(e.target.value as ImportKind);setParsed(null);setFile(null);setBatch(null);setRows([]);setMapping({});}}>
            <option value="subscribers">Abonados y pegues</option><option value="meter_readings">Lecturas de medidor</option>
          </select>
        </label>
        {kind==='meter_readings'&&<label className="ja-field"><span className="ja-field-label">Lote de lecturas</span>
          <select className="ja-control" required value={readingBatchId} onChange={e=>setReadingBatchId(e.target.value)}>
            <option value="">Seleccione lote borrador</option>
            {readingBatches.filter(r=>r.status!=='posted'&&r.status!=='cancelled').map(r=><option key={r.id} value={r.id}>{r.period_key} — {r.scheme_name}</option>)}
          </select>
        </label>}
        <label className="ja-field"><span className="ja-field-label">Archivo XLSX, CSV o TSV</span>
          <input className="ja-control" type="file" accept=".xlsx,.csv,.tsv,text/csv,text/tab-separated-values" onChange={e=>void chooseFile(e.target.files?.[0])}/>
        </label>
      </div>
      {file&&<p style={{color:'var(--ja-text-muted)',fontSize:'.8rem'}}><FileSpreadsheet size={13}/> {file.name} · {(file.size/1024).toFixed(1)} KB · SHA-256 calculado al registrar el lote.</p>}
    </section>

    {parsed&&<section className="ja-table-scroll">
      <div className="ja-list-heading"><UploadCloud size={16}/> Mapeo de columnas</div>
      <div className="ja-pos-grid">
        {fields.map(([field,label,required])=><label key={field} className="ja-field">
          <span className="ja-field-label">{label}{required&&' *'}</span>
          <select className="ja-control" value={mapping[field]??''} onChange={e=>setMapping({...mapping,[field]:e.target.value})}>
            <option value="">No importar</option>{parsed.headers.map(h=><option key={h} value={h}>{h}</option>)}
          </select>
        </label>)}
      </div>
      <div className="ja-row-actions">
        <Button icon={<CheckCircle2 size={14}/>} disabled={!canValidate||busy} onClick={()=>void validate()}>Validar y registrar lote</Button>
        {batch&&<Button icon={<PlayCircle size={14}/>} disabled={!canExecute||busy} onClick={()=>void execute()}>Ejecutar importación válida</Button>}
      </div>
      <div className="ja-list-heading">Vista previa</div>
      <table className="ja-table">
        <thead><tr>{parsed.headers.map(h=><th key={h}>{h}</th>)}</tr></thead>
        <tbody>{preview.map((row,index)=><tr key={index}>{parsed.headers.map(h=><td key={h}>{cellText(row[h] as any)}</td>)}</tr>)}</tbody>
      </table>
    </section>}

    {rows.length>0&&<section className="ja-table-scroll">
      <div className="ja-list-heading">Resultado por fila</div>
      <table className="ja-table">
        <thead><tr><th>Fila</th><th>Estado</th><th>Mensaje</th><th>Errores</th></tr></thead>
        <tbody>{rows.map(row=><tr key={row.id}>
          <td>{row.row_number}</td>
          <td><Badge tone={rowTone(row.status)}>{row.status}</Badge></td>
          <td>{row.message??'—'}</td>
          <td>{(row.error_codes??[]).join(', ')||'—'}</td>
        </tr>)}</tbody>
      </table>
    </section>}

    <section className="ja-table-scroll">
      <div className="ja-list-heading">Historial de lotes</div>
      <table className="ja-table">
        <thead><tr><th>Archivo</th><th>Tipo</th><th>Estado</th><th className="ja-td-num">Filas</th><th className="ja-td-num">Importadas</th><th className="ja-td-num">Errores</th><th>Fecha</th></tr></thead>
        <tbody>
          {history.length===0
            ?<tr><td colSpan={7} className="ja-table-empty">Sin lotes de importación.</td></tr>
            :history.map(row=><tr key={row.id}>
              <td>{row.file_name}</td><td>{row.kind}</td><td>{row.status}</td>
              <td className="ja-td-num">{row.total_rows}</td><td className="ja-td-num">{row.imported_rows}</td><td className="ja-td-num">{row.error_rows}</td>
              <td>{formatDateTime(row.created_at)}</td>
            </tr>)}
        </tbody>
      </table>
    </section>
  </main>;
}
