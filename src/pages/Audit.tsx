import {useCallback,useEffect,useState} from 'react';
import {RefreshCw,Search} from 'lucide-react';
import {listAuditEvents} from '../features/audit/service';
import {ErrorState} from '../design-system/primitives';
import {formatDateTime} from '../design-system/utils';

type Row=Record<string,any>;

export function Audit(){
  const [rows,setRows]=useState<Row[]>([]);
  const [query,setQuery]=useState('');
  const [action,setAction]=useState('');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=useCallback(()=>{
    setLoading(true);
    void listAuditEvents({query,action,from:from||undefined,to:to||undefined})
      .then(r=>{setRows((r as Row[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[query,action,from,to]);
  useEffect(()=>{void load();},[load]);

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Auditoría</h1><p>Historial inalterable de accesos administrativos, cambios, pagos, gastos y decisiones.</p></div>
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {error&&<ErrorState error={error} onRetry={load}/>}

    <div className="ja-toolbar">
      <span className="ja-search-field"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Usuario, entidad o identificador"/></span>
      <input className="ja-control" style={{maxWidth:'12rem'}} value={action} onChange={e=>setAction(e.target.value)} placeholder="Acción"/>
      <input className="ja-control" style={{maxWidth:'10rem'}} type="date" value={from} onChange={e=>setFrom(e.target.value)}/>
      <input className="ja-control" style={{maxWidth:'10rem'}} type="date" value={to} onChange={e=>setTo(e.target.value)}/>
    </div>

    <section className="ja-table-scroll">
      <table className="ja-table">
        <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Motivo</th><th>Detalle</th></tr></thead>
        <tbody>
          {rows.length===0
            ?<tr><td colSpan={6} className="ja-table-empty">{loading?'Cargando…':'No hay eventos para los filtros seleccionados.'}</td></tr>
            :rows.map(r=><tr key={r.id}>
              <td>{formatDateTime(r.created_at)}</td>
              <td>{r.actor_name??'Sistema'}</td>
              <td>{r.action}</td>
              <td>{r.entity_type}{r.entity_id?` · ${r.entity_id}`:''}</td>
              <td>{r.reason??'—'}</td>
              <td><details><summary>Ver cambios</summary><pre style={{fontSize:'.7rem',whiteSpace:'pre-wrap',maxWidth:'32rem',overflow:'auto'}}>{JSON.stringify({anterior:r.old_data,nuevo:r.new_data},null,2)}</pre></details></td>
            </tr>)}
        </tbody>
      </table>
    </section>
  </main>;
}
