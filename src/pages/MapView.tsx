import {useCallback,useEffect,useMemo,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {GoogleMapPicker} from '../components/maps/GoogleMapPicker';
import {listMapPoints} from '../features/integrations/service';
import {Badge,ErrorState} from '../design-system/primitives';

type Row=Record<string,any>;

export function MapView(){
  const [rows,setRows]=useState<Row[]>([]);
  const [sector,setSector]=useState('');
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');

  const load=useCallback(()=>{
    void listMapPoints(status,sector)
      .then(r=>{setRows((r as Row[])??[]);setError('');})
      .catch(e=>setError((e as Error).message));
  },[sector,status]);
  useEffect(()=>{void load();},[load]);

  const markers=useMemo(()=>rows.map(r=>({lat:Number(r.latitude),lng:Number(r.longitude),title:`${r.connection_code} · ${r.subscriber_name} · ${r.debt_status}`,status:r.status})),[rows]);

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Mapa de pegues</h1><p>Ubicación centralizada de conexiones registradas.</p></div>
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {error&&<ErrorState error={error} onRetry={load}/>}

    <div className="ja-toolbar">
      <label className="ja-field" style={{maxWidth:'12rem'}}><span className="ja-field-label">Sector</span>
        <input className="ja-control" value={sector} onChange={e=>setSector(e.target.value)} placeholder="Filtrar sector"/>
      </label>
      <label className="ja-field" style={{maxWidth:'12rem'}}><span className="ja-field-label">Estado</span>
        <select className="ja-control" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">Todos</option><option value="active">Activo</option><option value="suspended">Suspendido</option>
          <option value="pending">Pendiente</option><option value="cancelled">Cancelado</option>
        </select>
      </label>
    </div>

    <section className="ja-list">
      <GoogleMapPicker readonly markers={markers} onChange={()=>{}}/>
    </section>

    <section className="ja-table-scroll">
      <div className="ja-list-heading">Pegues geolocalizados: {rows.length}</div>
      <table className="ja-table">
        <thead><tr><th>Código</th><th>Abonado</th><th>Sector</th><th>Estado</th><th>Deuda</th></tr></thead>
        <tbody>
          {rows.length===0
            ?<tr><td colSpan={5} className="ja-table-empty">Sin pegues geolocalizados.</td></tr>
            :rows.map(r=><tr key={r.connection_id}>
              <td>{r.connection_code}</td><td>{r.subscriber_name}</td><td>{r.sector}</td>
              <td>{r.status}</td>
              <td><Badge tone={r.debt_status==='moroso'?'danger':'neutral'}>{r.debt_status}</Badge></td>
            </tr>)}
        </tbody>
      </table>
    </section>
  </main>;
}
