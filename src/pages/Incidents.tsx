import {useCallback,useEffect,useMemo,useState} from 'react';
import {AlertTriangle,ArrowRight,CheckCircle2,Plus,RefreshCw} from 'lucide-react';
import {createIncident,createWorkOrder,listIncidents,listWorkOrders,updateIncident} from '../features/operations/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton,Tabs} from '../design-system/primitives';
import {formatDateTime} from '../design-system/utils';

type Row=Record<string,any>;
// Etiquetas §47 sobre el enum real incident_category (no se altera el backend).
const CATEGORIES:Record<string,string>={
  fuga:'Fuga',infraestructura:'Rotura / infraestructura',medidor:'Medidor',
  baja_presion:'Baja presión',calidad_agua:'Contaminación / calidad',
  corte:'Corte / desabastecimiento',saneamiento:'Saneamiento',facturacion:'Facturación',otro:'Otro',
};
const PRIORITY:Record<string,string>={low:'Baja',normal:'Normal',high:'Alta',urgent:'Urgente'};
const STATUS:Record<string,string>={nuevo:'Nueva',en_atencion:'En atención',en_espera:'En espera',resuelto:'Resuelta',cerrado:'Cerrada'};
const STATUS_TONE:Record<string,'neutral'|'warning'|'success'|'danger'>={nuevo:'warning',en_atencion:'neutral',en_espera:'neutral',resuelto:'success',cerrado:'success'};
const FILTERS=[{value:'',label:'Todas'},...Object.keys(STATUS).map(k=>({value:k,label:STATUS[k]}))];

export function Incidents(){
  const auth=useAuth();
  const manage=auth.has('incidents.manage');
  const manageOps=auth.has('operations.manage');
  const [rows,setRows]=useState<Row[]>([]);
  const [orders,setOrders]=useState<Row[]>([]);
  const [filter,setFilter]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [creating,setCreating]=useState(false);
  const [detail,setDetail]=useState<Row|null>(null);
  const [linkOrder,setLinkOrder]=useState('');
  const [draft,setDraft]=useState({title:'',description:'',category:'fuga',priority:'normal',reporter_name:'',reporter_phone:''});

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([listIncidents(),listWorkOrders()])
      .then(([inc,ord])=>{setRows(inc as Row[]);setOrders(ord as Row[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  const counts=useMemo(()=>({
    nuevo:rows.filter(r=>r.status==='nuevo').length,
    atencion:rows.filter(r=>r.status==='en_atencion').length,
    resuelto:rows.filter(r=>r.status==='resuelto').length,
    urgent:rows.filter(r=>r.priority==='urgent'&&!['resuelto','cerrado'].includes(r.status)).length,
  }),[rows]);
  const visible=rows.filter(r=>!filter||r.status===filter);

  async function refreshDetail(id:string){
    const fresh=await listIncidents();
    setRows(fresh as Row[]);setDetail((fresh as Row[]).find(r=>r.id===id)??null);
  }
  async function save(e:React.FormEvent){
    e.preventDefault();
    try{
      await createIncident({...draft,title:draft.title.trim(),description:draft.description.trim(),reporter_name:draft.reporter_name.trim()||null,reporter_phone:draft.reporter_phone.trim()||null});
      setCreating(false);setDraft({title:'',description:'',category:'fuga',priority:'normal',reporter_name:'',reporter_phone:''});
      setNotice('Incidencia registrada y auditada.');load();
    }catch(err){setError((err as Error).message);}
  }
  async function patch(payload:Record<string,unknown>){
    if(!detail)return;
    try{await updateIncident(detail.id,payload);setNotice(`Incidencia ${detail.incident_number} actualizada.`);await refreshDetail(detail.id);}
    catch(err){setError((err as Error).message);}
  }
  async function linkWorkOrder(e:React.FormEvent){
    e.preventDefault();
    if(!detail||!linkOrder)return;
    try{await updateIncident(detail.id,{work_order_id:linkOrder});setLinkOrder('');setNotice(`Incidencia ${detail.incident_number} vinculada a la orden.`);await refreshDetail(detail.id);}
    catch(err){setError((err as Error).message);}
  }
  async function convertToOrder(){
    if(!detail)return;
    try{
      const order=await createWorkOrder({type:'incidencia',description:detail.description,priority:detail.priority||'normal'});
      if(order?.id)await updateIncident(detail.id,{work_order_id:order.id});
      setNotice(`Orden ${order?.order_number??''} creada y vinculada a ${detail.incident_number}.`);
      await refreshDetail(detail.id);
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div>
        <h1>Incidencias y reportes</h1>
        <p>Reportes de la comunidad, triaje y vinculación con órdenes de trabajo.</p>
      </div>
      {manage&&<Button icon={<Plus size={15}/>} onClick={()=>setCreating(true)}>Nueva incidencia</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&rows.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<>
      <div className="ja-home-metrics">
        <article className="ja-metric ja-metric-warning"><small>Nuevas</small><strong>{counts.nuevo}</strong><span>Pendientes de triaje</span></article>
        <article className="ja-metric"><small>En atención</small><strong>{counts.atencion}</strong><span>Asignadas a equipo</span></article>
        <article className="ja-metric ja-metric-success"><small>Resueltas</small><strong>{counts.resuelto}</strong><span>Con resolución</span></article>
        <article className="ja-metric ja-metric-danger"><small>Urgentes</small><strong>{counts.urgent}</strong><span>Atención prioritaria</span></article>
      </div>

      <Tabs tabs={FILTERS} value={filter} onChange={setFilter}/>

      <section className="ja-list">
        {visible.length===0
          ?<EmptyState icon={<AlertTriangle size={22}/>} title="Sin incidencias" description="No hay incidencias con este filtro."/>
          :visible.map(row=><article key={row.id} className="ja-list-row">
            <div>
              <strong>{row.incident_number} · {row.title}</strong>
              <span className="ja-cell-sub">{CATEGORIES[row.category]??row.category} · {row.reporter_name??'Anónimo'}{row.reporter_phone?` · ${row.reporter_phone}`:''} · {formatDateTime(row.reported_at)}{row.work_order_id?' · orden vinculada':''}</span>
            </div>
            <Badge tone={row.priority==='urgent'?'danger':row.priority==='high'?'warning':'neutral'}>{PRIORITY[row.priority]??row.priority}</Badge>
            <Badge tone={STATUS_TONE[row.status]??'neutral'}>{STATUS[row.status]??row.status}</Badge>
            <Button size="sm" variant="secondary" onClick={()=>{setDetail(row);setLinkOrder('');}}>Ver <ArrowRight size={13}/></Button>
          </article>)}
      </section>
    </>}

    <Dialog open={creating} onClose={()=>setCreating(false)} title="Nueva incidencia" description="Reporte de la comunidad o del equipo técnico.">
      <form className="ja-pos-fields" onSubmit={save}>
        <label className="ja-field"><span className="ja-field-label">Título</span><input className="ja-control" required minLength={3} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="Fuga en la línea principal…"/></label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Categoría</span><select className="ja-control" value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}>{Object.keys(CATEGORIES).map(c=><option key={c} value={c}>{CATEGORIES[c]}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Prioridad</span><select className="ja-control" value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})}>{Object.keys(PRIORITY).map(p=><option key={p} value={p}>{PRIORITY[p]}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Nombre del reportante</span><input className="ja-control" value={draft.reporter_name} onChange={e=>setDraft({...draft,reporter_name:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Teléfono</span><input className="ja-control" value={draft.reporter_phone} onChange={e=>setDraft({...draft,reporter_phone:e.target.value})}/></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Descripción</span><textarea className="ja-control" required minLength={5} rows={3} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
        <Button type="submit" icon={<Plus size={15}/>}>Registrar incidencia</Button>
      </form>
    </Dialog>

    <Dialog open={Boolean(detail)} onClose={()=>setDetail(null)}
      title={detail?`Incidencia ${detail.incident_number}`:''}
      description={detail?`${CATEGORIES[detail.category]??detail.category} · reportada ${formatDateTime(detail.reported_at)}`:''}>
      {detail&&<div className="ja-pos-fields">
        <p><strong>{detail.title}</strong></p>
        <p className="ja-cell-sub">{detail.description}</p>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Estado</span>
            <select className="ja-control" value={detail.status} disabled={!manage} onChange={e=>void patch({status:e.target.value})}>
              {Object.keys(STATUS).map(s=><option key={s} value={s}>{STATUS[s]}</option>)}
            </select></label>
          <label className="ja-field"><span className="ja-field-label">Prioridad</span>
            <select className="ja-control" value={detail.priority} disabled={!manage} onChange={e=>void patch({priority:e.target.value})}>
              {Object.keys(PRIORITY).map(p=><option key={p} value={p}>{PRIORITY[p]}</option>)}
            </select></label>
          <label className="ja-field"><span className="ja-field-label">Reportante</span><input className="ja-control" readOnly value={`${detail.reporter_name??'Anónimo'}${detail.reporter_phone?` · ${detail.reporter_phone}`:''}`}/></label>
          <label className="ja-field"><span className="ja-field-label">Resuelta</span><input className="ja-control" readOnly value={detail.resolved_at?formatDateTime(detail.resolved_at):'—'}/></label>
        </div>

        {manageOps&&<form className="ja-pos-fields" onSubmit={linkWorkOrder}>
          <label className="ja-field"><span className="ja-field-label">Vincular a orden de trabajo</span>
            <select className="ja-control" value={linkOrder} onChange={e=>setLinkOrder(e.target.value)}>
              <option value="">Seleccione una orden abierta</option>
              {orders.filter(o=>!['completed','cancelled'].includes(o.status)).map(o=><option key={o.id} value={o.id}>{o.order_number} — {o.type}</option>)}
            </select></label>
          <div className="ja-row-actions">
            <Button type="submit" size="sm" disabled={!linkOrder}>Vincular orden</Button>
            <Button type="button" size="sm" variant="secondary" icon={<ArrowRight size={13}/>} onClick={()=>void convertToOrder()}>Crear y vincular orden</Button>
          </div>
        </form>}
        {detail.work_order_id&&<p className="ja-hint"><CheckCircle2 size={13}/> Esta incidencia ya tiene una orden de trabajo vinculada.</p>}
      </div>}
    </Dialog>
  </main>;
}
