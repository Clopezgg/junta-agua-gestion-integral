import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {Activity,AlertTriangle,ArrowUpRight,ClipboardList,Droplets,Layers,MapPin,RefreshCw,Wrench,X} from 'lucide-react';
import {OperationsMap,type MapLayer,type OpsPoint} from '../components/maps/OperationsMap';
import {listAssets,listIncidents,listWorkOrders} from '../features/operations/service';
import {listMapPoints} from '../features/integrations/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {formatDate} from '../design-system/utils';

type Row=Record<string,any>;
const LAYERS:Array<{key:MapLayer;label:string;icon:typeof MapPin}>=[
  {key:'pegues',label:'Pegues',icon:MapPin},
  {key:'incidentes',label:'Incidencias',icon:AlertTriangle},
  {key:'ordenes',label:'Órdenes',icon:ClipboardList},
  {key:'activos',label:'Activos',icon:Wrench},
  {key:'tanques',label:'Tanques',icon:Droplets},
  {key:'fuentes',label:'Fuentes',icon:Activity},
];
const num=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:NaN;};

export function CentroOperativo(){
  const auth=useAuth();
  const [points,setPoints]=useState<Row[]>([]);
  const [assets,setAssets]=useState<Row[]>([]);
  const [orders,setOrders]=useState<Row[]>([]);
  const [incidents,setIncidents]=useState<Row[]>([]);
  const [active,setActive]=useState<Set<MapLayer>>(new Set<MapLayer>(['pegues','incidentes','ordenes','activos']));
  const [selected,setSelected]=useState<OpsPoint|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([
      listMapPoints().catch(()=>[]),
      listAssets().catch(()=>[]),
      listWorkOrders().catch(()=>[]),
      listIncidents().catch(()=>[]),
    ])
      .then(([p,a,o,i])=>{setPoints(p as Row[]);setAssets(a as Row[]);setOrders(o as Row[]);setIncidents(i as Row[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  const assetById=useMemo(()=>new Map(assets.map(a=>[a.id,a])),[assets]);
  const pointByConnection=useMemo(()=>new Map(points.map(p=>[p.connection_id,p])),[points]);

  const mapPoints=useMemo(()=>{
    const out:OpsPoint[]=[];
    if(active.has('pegues'))for(const p of points){
      out.push({id:`peg-${p.connection_id}`,layer:'pegues',lat:num(p.latitude),lng:num(p.longitude),
        title:`${p.connection_code} · ${p.subscriber_name}`,subtitle:`${p.sector??'—'} · ${p.debt_status}`,
        tone:p.debt_status==='moroso'?'warn':p.status!=='active'?'info':'ok'});
    }
    if(active.has('activos'))for(const a of assets){
      if(['tanque','pozo'].includes(a.asset_type))continue;
      out.push({id:`act-${a.id}`,layer:'activos',lat:num(a.latitude),lng:num(a.longitude),
        title:`${a.code} · ${a.name}`,subtitle:`${a.asset_type} · ${a.condition}`,
        tone:a.condition==='critical'||a.criticality==='critical'?'crit':a.condition==='poor'?'warn':'ok'});
    }
    if(active.has('tanques'))for(const a of assets.filter(x=>x.asset_type==='tanque')){
      out.push({id:`tan-${a.id}`,layer:'tanques',lat:num(a.latitude),lng:num(a.longitude),title:`${a.code} · ${a.name}`,subtitle:`Tanque · ${a.condition}`,tone:a.condition==='critical'?'crit':'info'});
    }
    if(active.has('fuentes'))for(const a of assets.filter(x=>x.asset_type==='pozo')){
      out.push({id:`fue-${a.id}`,layer:'fuentes',lat:num(a.latitude),lng:num(a.longitude),title:`${a.code} · ${a.name}`,subtitle:`Fuente · ${a.condition}`,tone:a.condition==='critical'?'crit':'info'});
    }
    if(active.has('ordenes'))for(const o of orders.filter(x=>!['completed','cancelled'].includes(x.status))){
      const a=o.asset_id?assetById.get(o.asset_id):undefined;
      if(!a)continue;
      out.push({id:`ord-${o.id}`,layer:'ordenes',lat:num(a.latitude),lng:num(a.longitude),
        title:`${o.order_number} · ${o.type}`,subtitle:`${o.priority} · ${o.status}`,tone:o.priority==='urgent'?'crit':o.priority==='high'?'warn':'info'});
    }
    if(active.has('incidentes'))for(const i of incidents.filter(x=>!['resuelto','cerrado'].includes(x.status))){
      const p=i.connection_id?pointByConnection.get(i.connection_id):undefined;
      if(!p)continue;
      out.push({id:`inc-${i.id}`,layer:'incidentes',lat:num(p.latitude),lng:num(p.longitude),
        title:`${i.incident_number} · ${i.title}`,subtitle:`${i.priority} · ${i.status}`,tone:i.priority==='urgent'?'crit':'warn'});
    }
    return out.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));
  },[active,points,assets,orders,incidents,assetById,pointByConnection]);

  const openIncidents=incidents.filter(i=>!['resuelto','cerrado'].includes(i.status));
  const openOrders=orders.filter(o=>!['completed','cancelled'].includes(o.status));
  const criticalAssets=assets.filter(a=>a.condition==='critical'||a.criticality==='critical');
  const affectedSectors=useMemo(()=>{
    const s=new Set<string>();
    for(const i of openIncidents){const p=i.connection_id?pointByConnection.get(i.connection_id):undefined;if(p?.sector)s.add(p.sector);}
    for(const o of openOrders){const a=o.asset_id?assetById.get(o.asset_id):undefined;if(a?.sector)s.add(a.sector);}
    return [...s];
  },[openIncidents,openOrders,pointByConnection,assetById]);

  function toggle(k:MapLayer){
    setActive(prev=>{const n=new Set(prev);if(n.has(k))n.delete(k);else n.add(k);return n;});
  }

  if(!auth.has('operations.read'))return <main className="ja-page"><EmptyState title="Sin acceso" description="No tiene permiso para el centro operativo."/></main>;

  return <main className="ja-cc" data-theme="dark">
    <header className="ja-cc-head">
      <div>
        <h1>Centro operativo</h1>
        <p>El mapa es el espacio de trabajo. Incidencias, órdenes y activos sobre el terreno real.</p>
      </div>
      <button type="button" className="ja-cc-refresh" onClick={load}><RefreshCw size={15}/> Actualizar</button>
    </header>

    {error&&<ErrorState error={error} onRetry={load}/>}

    <div className="ja-cc-body">
      <section className="ja-cc-mapwrap">
        {loading
          ?<Skeleton className="ja-cc-map"/>
          :<OperationsMap points={mapPoints} onSelect={setSelected}/>}
        <div className="ja-cc-layers" role="group" aria-label="Capas del mapa">
          <span className="ja-cc-layers-title"><Layers size={13}/> Capas</span>
          {LAYERS.map(({key,label,icon:Icon})=>
            <button key={key} type="button" className={`ja-cc-layer${active.has(key)?' is-on':''}`} aria-pressed={active.has(key)} onClick={()=>toggle(key)}>
              <Icon size={13}/> {label}
            </button>)}
        </div>
        {selected&&<aside className="ja-cc-inspect">
          <button type="button" className="ja-cc-inspect-close" aria-label="Cerrar" onClick={()=>setSelected(null)}><X size={16}/></button>
          <span className="ja-cc-inspect-kind">{LAYERS.find(l=>l.key===selected.layer)?.label}</span>
          <strong>{selected.title}</strong>
          <p>{selected.subtitle}</p>
          {selected.layer==='incidentes'&&<Link className="ja-cc-inspect-link" to="/incidencias">Ir a incidencias <ArrowUpRight size={13}/></Link>}
          {selected.layer==='ordenes'&&<Link className="ja-cc-inspect-link" to="/operaciones">Ir a órdenes <ArrowUpRight size={13}/></Link>}
          {(selected.layer==='activos'||selected.layer==='tanques'||selected.layer==='fuentes')&&<Link className="ja-cc-inspect-link" to="/activos">Ver activo <ArrowUpRight size={13}/></Link>}
          {selected.layer==='pegues'&&<Link className="ja-cc-inspect-link" to={`/abonados`}>Ver abonados <ArrowUpRight size={13}/></Link>}
        </aside>}
      </section>

      <aside className="ja-cc-side">
        <div className="ja-cc-stat"><AlertTriangle size={16}/><div><strong>{openIncidents.length}</strong><span>Incidencias abiertas</span></div></div>
        <div className="ja-cc-stat"><ClipboardList size={16}/><div><strong>{openOrders.length}</strong><span>Órdenes abiertas</span></div></div>
        <div className="ja-cc-stat"><Wrench size={16}/><div><strong>{criticalAssets.length}</strong><span>Activos críticos</span></div></div>
        <div className="ja-cc-stat"><MapPin size={16}/><div><strong>{affectedSectors.length}</strong><span>Sectores afectados</span></div></div>

        <h2 className="ja-cc-side-h">Prioridad ahora</h2>
        {openIncidents.length===0&&openOrders.length===0
          ?<EmptyState title="Sin pendientes" description="No hay incidencias ni órdenes abiertas."/>
          :<ul className="ja-cc-feed">
            {openIncidents.slice(0,6).map(i=><li key={i.id}>
              <Badge tone={i.priority==='urgent'?'danger':'warning'}>{i.priority}</Badge>
              <span>{i.incident_number} · {i.title}</span>
            </li>)}
            {openOrders.slice(0,6).map(o=><li key={o.id}>
              <Badge tone={o.priority==='urgent'?'danger':'neutral'}>{o.type}</Badge>
              <span>{o.order_number}{o.due_date?` · vence ${formatDate(o.due_date)}`:''}</span>
            </li>)}
          </ul>}

        {affectedSectors.length>0&&<>
          <h2 className="ja-cc-side-h">Sectores afectados</h2>
          <div className="ja-cc-sectors">{affectedSectors.map(s=><span key={s} className="ja-cc-sector">{s}</span>)}</div>
        </>}
      </aside>
    </div>
  </main>;
}
