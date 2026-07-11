import {useCallback,useEffect,useState} from 'react';
import {Cloud,GitBranch,History,Mail,MapPin,MessageCircle,RefreshCw,ScanText} from 'lucide-react';
import {appVersion} from '../lib/version';
import {checkSystemUpdate,getUpdateState,listIntegrationRuns,listIntegrations,saveIntegration,testIntegration} from '../features/integrations/service';

const catalog=[
 {key:'google_maps',name:'Google Maps',icon:MapPin,desc:'Mapa interactivo y ubicación de pegues.',secret:'Render: VITE_GOOGLE_MAPS_API_KEY y VITE_GOOGLE_MAPS_MAP_ID; Supabase: GOOGLE_MAPS_API_KEY_CONFIGURED=true.',fields:[['default_center','Centro predeterminado','14.7692,-87.9900']]},
 {key:'ocr',name:'OCR documental',icon:ScanText,desc:'Lectura de DNI, pasaporte y facturas en imagen.',secret:'Supabase Secret: GOOGLE_VISION_API_KEY',fields:[['provider','Proveedor','google_vision']]},
 {key:'whatsapp',name:'WhatsApp Cloud API',icon:MessageCircle,desc:'Mensajes, documentos y estados de entrega.',secret:'Supabase Secrets: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN',fields:[['country_code','Código de país','504']]},
 {key:'email',name:'Correo transaccional',icon:Mail,desc:'Recibos, informes e invitaciones.',secret:'Supabase Secrets: RESEND_API_KEY y EMAIL_FROM',fields:[['reply_to','Correo de respuesta','']]},
 {key:'backup',name:'Respaldo externo',icon:Cloud,desc:'Copias privadas, checksum y restauración integral.',secret:'Usa SUPABASE_SERVICE_ROLE_KEY y bucket privado system-backups',fields:[['retention_days','Retención en días','90']]},
 {key:'github_updates',name:'GitHub Releases',icon:GitBranch,desc:'Consulta versiones publicadas y detecta actualizaciones.',secret:'Supabase Secrets: GITHUB_RELEASE_TOKEN y GITHUB_REPOSITORY',fields:[['repository','Repositorio','Clopezgg/junta-agua-gestion-integral'],['cache_hours','Caché en horas','6']]}
] as const;

type Row=Record<string,any>;

export function Integrations(){
 const[rows,setRows]=useState<Row[]>([]);
 const[forms,setForms]=useState<Record<string,Record<string,string>>>({});
 const[runs,setRuns]=useState<Row[]>([]);
 const[update,setUpdate]=useState<Row>({});
 const[error,setError]=useState('');
 const[message,setMessage]=useState('');
 const load=useCallback(async()=>{
   try{
     const[integrationRows,runRows,updateState]=await Promise.all([listIntegrations(),listIntegrationRuns(undefined,50),getUpdateState()]);
     setRows(integrationRows);setRuns(runRows);setUpdate(updateState);
     const next:Record<string,Record<string,string>>={};
     for(const item of catalog){
       const row=integrationRows.find((value:Row)=>value.key===item.key);
       next[item.key]={};
       for(const[field,,defaultValue]of item.fields)next[item.key][field]=String(row?.public_config?.[field]??defaultValue);
     }
     setForms(next);setError('');
   }catch(e){setError((e as Error).message)}
 },[]);
 useEffect(()=>{void load()},[load]);

 async function save(key:string,name:string,enabled:boolean){
   try{await saveIntegration(key,forms[key]??{},enabled);setMessage(`${name}: configuración pública guardada.`);await load()}catch(e){setError((e as Error).message)}
 }
 async function test(key:string,name:string){
   try{
     setMessage(`Probando ${name}…`);
     const result=key==='github_updates'?await checkSystemUpdate(appVersion.version):await testIntegration(key);
     setMessage(result.message);await load();
   }catch(e){setError((e as Error).message)}
 }

 return <main className="content">
   <div className="titlebar"><div><h1>Integraciones y ejecuciones</h1><p>Configuración pública, secretos privados, pruebas reales y trazabilidad de cada conector.</p></div></div>
   {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}
   <div className="grid integration-grid">{catalog.map(item=>{
     const row=rows.find(value=>value.key===item.key);const Icon=item.icon;
     const isUpdate=item.key==='github_updates';
     return <section className="panel" key={item.key}>
       <div className="integration-head"><Icon/><div><h2>{item.name}</h2><p>{item.desc}</p></div></div>
       <span className={`pill ${row?.enabled?'':'danger'}`}>{row?.enabled?'Habilitada':'Pendiente'}</span>
       <p className="help">Última verificación: {row?.last_checked_at?new Date(row.last_checked_at).toLocaleString('es-HN'):'Sin ejecutar'}</p>
       {row?.last_error&&<div className="error">{row.last_error}</div>}
       {isUpdate&&update?.checked_at&&<div className={update.update_available?'notice':'readiness-inline'}>
         <strong>Actual: {update.current_version||appVersion.version}</strong><span>Última: {update.latest_version||'No disponible'}</span>
         <span>{update.update_available?'Hay actualización disponible.':'Esta instalación coincide con el último release consultado.'}</span>
       </div>}
       <div className="subform">{item.fields.map(([field,label])=><label key={field}>{label}<input value={forms[item.key]?.[field]??''} onChange={event=>setForms({...forms,[item.key]:{...(forms[item.key]??{}),[field]:event.target.value}})}/></label>)}</div>
       <p className="secret-note"><strong>Configuración privada:</strong> {item.secret}</p>
       <div className="actions"><button className="outline" onClick={()=>void save(item.key,item.name,Boolean(row?.enabled))}>Guardar</button><button onClick={()=>void test(item.key,item.name)}><RefreshCw size={16}/>{isUpdate?'Buscar actualización':'Probar conexión'}</button></div>
     </section>
   })}</div>
   <div className="notice">Los tokens y claves privadas se configuran en Supabase Secrets. Esta pantalla nunca solicita ni devuelve secretos permanentes.</div>

   <section className="panel" style={{marginTop:'1rem'}}>
     <div className="titlebar"><div><h2><History size={20}/>Historial de ejecuciones</h2><p>Éxitos, fallos, duración y mensajes normalizados de los conectores.</p></div></div>
     <div className="table-scroll"><table><thead><tr><th>Integración</th><th>Operación</th><th>Estado</th><th>Duración</th><th>Detalle</th><th>Fecha</th></tr></thead><tbody>{runs.map(run=><tr key={run.id}><td>{run.integration_key}</td><td>{run.operation}</td><td><span className={`status-badge ${run.status==='success'?'approved':run.status==='failed'?'critical':'fair'}`}>{run.status}</span></td><td>{run.duration_ms==null?'—':`${run.duration_ms} ms`}</td><td>{run.error_message??run.response_summary?.message??'Ejecución registrada'}</td><td>{new Date(run.started_at).toLocaleString('es-HN')}</td></tr>)}</tbody></table></div>
     {runs.length===0&&<div className="empty">Todavía no existen ejecuciones registradas.</div>}
   </section>
 </main>;
}
