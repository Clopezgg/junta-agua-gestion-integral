import {useCallback,useEffect,useState} from 'react';
import {Cloud,GitBranch,History,Mail,MapPin,MessageCircle,RefreshCw,ScanText} from 'lucide-react';
import {appVersion} from '../lib/version';
import {checkSystemUpdate,getUpdateState,listIntegrationRuns,listIntegrations,saveIntegration,testIntegration} from '../features/integrations/service';
import {Badge,Button,ErrorState} from '../design-system/primitives';
import {formatDateTime} from '../design-system/utils';

const catalog=[
  {key:'google_maps',name:'Google Maps',icon:MapPin,desc:'Mapa interactivo y ubicación de pegues.',secret:'Render: VITE_GOOGLE_MAPS_API_KEY y VITE_GOOGLE_MAPS_MAP_ID; Supabase: GOOGLE_MAPS_API_KEY_CONFIGURED=true.',fields:[['default_center','Centro predeterminado','14.7692,-87.9900']]},
  {key:'ocr',name:'OCR documental',icon:ScanText,desc:'Lectura de DNI, pasaporte y facturas en imagen.',secret:'Supabase Secret: GOOGLE_VISION_API_KEY',fields:[['provider','Proveedor','google_vision']]},
  {key:'whatsapp',name:'WhatsApp Cloud API',icon:MessageCircle,desc:'Mensajes, documentos y estados de entrega.',secret:'Supabase Secrets: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN',fields:[['country_code','Código de país','504']]},
  {key:'email',name:'Correo transaccional',icon:Mail,desc:'Recibos, informes e invitaciones.',secret:'Supabase Secrets: RESEND_API_KEY y EMAIL_FROM',fields:[['reply_to','Correo de respuesta','']]},
  {key:'backup',name:'Respaldo externo',icon:Cloud,desc:'Copias privadas, checksum y restauración integral.',secret:'Usa SUPABASE_SERVICE_ROLE_KEY y bucket privado system-backups',fields:[['retention_days','Retención en días','90']]},
  {key:'github_updates',name:'GitHub Releases',icon:GitBranch,desc:'Consulta versiones publicadas y detecta actualizaciones.',secret:'Supabase Secrets: GITHUB_RELEASE_TOKEN y GITHUB_REPOSITORY',fields:[['repository','Repositorio','Clopezgg/junta-agua-gestion-integral'],['cache_hours','Caché en horas','6']]},
] as const;

type Row=Record<string,any>;

export function Integrations(){
  const [rows,setRows]=useState<Row[]>([]);
  const [forms,setForms]=useState<Record<string,Record<string,string>>>({});
  const [runs,setRuns]=useState<Row[]>([]);
  const [update,setUpdate]=useState<Row>({});
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const load=useCallback(async()=>{
    try{
      const [integrationRows,runRows,updateState]=await Promise.all([listIntegrations(),listIntegrationRuns(undefined,50),getUpdateState()]);
      setRows(integrationRows);setRuns(runRows);setUpdate(updateState);
      const next:Record<string,Record<string,string>>={};
      for(const item of catalog){
        const row=integrationRows.find((v:Row)=>v.key===item.key);
        next[item.key]={};
        for(const [field,,defaultValue] of item.fields)next[item.key][field]=String(row?.public_config?.[field]??defaultValue);
      }
      setForms(next);setError('');
    }catch(e){setError((e as Error).message);}
  },[]);
  useEffect(()=>{void load();},[load]);

  async function save(key:string,name:string,enabled:boolean){
    try{await saveIntegration(key,forms[key]??{},enabled);setNotice(`${name}: configuración pública guardada.`);await load();}
    catch(e){setError((e as Error).message);}
  }
  async function test(key:string,name:string){
    try{
      setNotice(`Probando ${name}…`);
      const result=key==='github_updates'?await checkSystemUpdate(appVersion.version):await testIntegration(key);
      setNotice(result.message);await load();
    }catch(e){setError((e as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Integraciones y ejecuciones</h1><p>Configuración pública, secretos privados, pruebas reales y trazabilidad de cada conector.</p></div>
      <button type="button" className="ja-tab" onClick={()=>void load()}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={()=>void load()}/>}

    {catalog.map(item=>{
      const row=rows.find(v=>v.key===item.key);
      const Icon=item.icon;
      const isUpdate=item.key==='github_updates';
      return <section className="ja-list" key={item.key}>
        <div className="ja-list-heading" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem'}}>
          <span style={{display:'flex',gap:'.5rem',alignItems:'center'}}><Icon size={16}/> {item.name}</span>
          <Badge tone={row?.enabled?'success':'warning'}>{row?.enabled?'Habilitada':'Pendiente'}</Badge>
        </div>
        <p style={{color:'var(--ja-text-muted)',margin:'0 0 .5rem'}}>{item.desc}</p>
        <p style={{color:'var(--ja-text-muted)',fontSize:'.8rem',margin:'0 0 .5rem'}}>
          Última verificación: {row?.last_checked_at?formatDateTime(row.last_checked_at):'sin ejecutar'}
        </p>
        {row?.last_error&&<div className="ja-banner ja-banner-info">{row.last_error}</div>}
        {isUpdate&&update?.checked_at&&<div className="ja-banner ja-banner-info">
          Actual: {update.current_version||appVersion.version} · Última: {update.latest_version||'no disponible'} · {update.update_available?'hay actualización disponible.':'coincide con el último release consultado.'}
        </div>}
        <div className="ja-pos-grid">
          {item.fields.map(([field,label])=><label key={field} className="ja-field">
            <span className="ja-field-label">{label}</span>
            <input className="ja-control" value={forms[item.key]?.[field]??''} onChange={e=>setForms({...forms,[item.key]:{...(forms[item.key]??{}),[field]:e.target.value}})}/>
          </label>)}
        </div>
        <p style={{color:'var(--ja-text-muted)',fontSize:'.8rem'}}><strong>Configuración privada:</strong> {item.secret}</p>
        <div className="ja-row-actions">
          <Button variant="secondary" onClick={()=>void save(item.key,item.name,Boolean(row?.enabled))}>Guardar</Button>
          <Button icon={<RefreshCw size={14}/>} onClick={()=>void test(item.key,item.name)}>{isUpdate?'Buscar actualización':'Probar conexión'}</Button>
        </div>
      </section>;
    })}

    <div className="ja-banner ja-banner-info">
      Los tokens y claves privadas se configuran en Supabase Secrets. Esta pantalla nunca solicita ni devuelve secretos permanentes.
    </div>

    <section className="ja-table-scroll">
      <div className="ja-list-heading"><History size={16}/> Historial de ejecuciones</div>
      <table className="ja-table">
        <thead><tr><th>Integración</th><th>Operación</th><th>Estado</th><th className="ja-td-num">Duración</th><th>Detalle</th><th>Fecha</th></tr></thead>
        <tbody>
          {runs.length===0
            ?<tr><td colSpan={6} className="ja-table-empty">Todavía no existen ejecuciones registradas.</td></tr>
            :runs.map(run=><tr key={run.id}>
              <td>{run.integration_key}</td>
              <td>{run.operation}</td>
              <td><Badge tone={run.status==='success'?'success':run.status==='failed'?'danger':'warning'}>{run.status}</Badge></td>
              <td className="ja-td-num">{run.duration_ms==null?'—':`${run.duration_ms} ms`}</td>
              <td>{run.error_message??run.response_summary?.message??'Ejecución registrada'}</td>
              <td>{formatDateTime(run.started_at)}</td>
            </tr>)}
        </tbody>
      </table>
    </section>
  </main>;
}
