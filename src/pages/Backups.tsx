import {useCallback,useEffect,useState} from 'react';
import {DatabaseBackup,Download,RefreshCw,RotateCcw} from 'lucide-react';
import {createBackup,downloadBackup,listBackups,listRestoreSessions,restoreBackup} from '../features/backups/service';
import {Badge,Button,Dialog,ErrorState} from '../design-system/primitives';
import {formatDateTime} from '../design-system/utils';

type Row=Record<string,any>;

export function Backups(){
  const [rows,setRows]=useState<Row[]>([]);
  const [sessions,setSessions]=useState<Row[]>([]);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [restoreTarget,setRestoreTarget]=useState<Row|null>(null);
  const [phrase,setPhrase]=useState('');

  const load=useCallback(()=>{
    void Promise.all([listBackups(),listRestoreSessions().catch(()=>[])])
      .then(([b,s])=>{setRows((b as Row[])??[]);setSessions((s as Row[])??[]);setError('');})
      .catch(e=>setError((e as Error).message));
  },[]);
  useEffect(()=>{void load();},[load]);

  async function create(){
    try{setNotice('Creando respaldo…');await createBackup();setNotice('Respaldo creado.');load();}
    catch(e){setError((e as Error).message);}
  }
  async function confirmRestore(){
    if(!restoreTarget||phrase!=='RESTAURAR')return;
    try{await restoreBackup(restoreTarget.id,phrase);setRestoreTarget(null);setPhrase('');setNotice('Restauración iniciada con MFA.');load();}
    catch(e){setError((e as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Respaldos y restauración</h1><p>Copias cifradas y auditadas de la información de la organización.</p></div>
      <Button icon={<DatabaseBackup size={15}/>} onClick={()=>void create()}>Crear respaldo</Button>
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}

    <section className="ja-table-scroll">
      <div className="ja-list-heading">Respaldos</div>
      <table className="ja-table">
        <thead><tr><th>Fecha</th><th>Estado</th><th className="ja-td-num">Tamaño</th><th>Checksum</th><th>Acciones</th></tr></thead>
        <tbody>
          {rows.length===0
            ?<tr><td colSpan={5} className="ja-table-empty">Sin respaldos registrados.</td></tr>
            :rows.map(r=><tr key={r.id}>
              <td>{formatDateTime(r.created_at)}</td>
              <td><Badge tone={r.status==='completed'?'success':r.status==='pruned'?'neutral':'warning'}>{r.status==='pruned'?'Eliminado por retención':r.status}</Badge></td>
              <td className="ja-td-num">{r.size_bytes?`${Math.round(Number(r.size_bytes)/1024)} KB`:'—'}</td>
              <td><code style={{fontSize:'.7rem'}}>{r.checksum_sha256?.slice(0,16)??'—'}</code></td>
              <td>{r.status==='completed'&&<div className="ja-row-actions">
                <Button variant="secondary" icon={<Download size={13}/>} onClick={async()=>{const x=await downloadBackup(r.id);window.open(x.url,'_blank','noopener,noreferrer');}}>Descargar</Button>
                <Button variant="secondary" icon={<RotateCcw size={13}/>} onClick={()=>setRestoreTarget(r)}>Restaurar</Button>
              </div>}</td>
            </tr>)}
        </tbody>
      </table>
    </section>

    {sessions.length>0&&<section className="ja-table-scroll">
      <div className="ja-list-heading">Sesiones de restauración</div>
      <table className="ja-table">
        <thead><tr><th>Inicio</th><th>Estado</th><th className="ja-td-num">Filas</th><th className="ja-td-num">Archivos</th><th>Formato</th><th>Detalle</th></tr></thead>
        <tbody>
          {sessions.map(s=><tr key={s.id}>
            <td>{formatDateTime(s.started_at)}</td>
            <td><Badge tone={s.status==='completed'?'success':s.status==='failed'?'danger':'neutral'}>{s.status}</Badge></td>
            <td className="ja-td-num">{s.restored_rows}</td>
            <td className="ja-td-num">{s.restored_files}</td>
            <td><code style={{fontSize:'.7rem'}}>{s.restored_format??'—'}</code></td>
            <td>{s.error_message??(s.finished_at?formatDateTime(s.finished_at):'—')}</td>
          </tr>)}
        </tbody>
      </table>
    </section>}

    <div className="ja-banner ja-banner-info">
      La restauración de aplicación conserva IDs y relaciones. Para recuperación completa del servidor también debe activarse el respaldo administrado de Supabase. Descargar y restaurar requieren MFA (TOTP).
    </div>

    <Dialog open={!!restoreTarget} onClose={()=>{setRestoreTarget(null);setPhrase('');}} title="Confirmar restauración"
      description="La restauración reinserta datos del respaldo seleccionado. Escriba RESTAURAR para confirmar. Requiere MFA.">
      <form className="ja-pos-fields" onSubmit={e=>{e.preventDefault();void confirmRestore();}}>
        <label className="ja-field"><span className="ja-field-label">Confirmación</span>
          <input className="ja-control" value={phrase} onChange={e=>setPhrase(e.target.value)} placeholder="RESTAURAR"/>
        </label>
        <Button type="submit" disabled={phrase!=='RESTAURAR'}>Restaurar respaldo</Button>
      </form>
    </Dialog>
  </main>;
}
