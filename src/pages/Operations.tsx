import {useCallback,useEffect,useMemo,useState} from 'react';
import {ClipboardList,Gauge,MapPinned,Plus,RefreshCw} from 'lucide-react';
import {GoogleMapPicker} from '../components/maps/GoogleMapPicker';
import {
  createAsset,createInventoryItem,createMaintenancePlan,createWorkOrder,generatePreventiveWorkOrders,
  listAssets,listInventory,listMaintenancePlans,listWorkOrders,registerInventoryMovement,updateWorkOrderDetails,
} from '../features/operations/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton,Tabs} from '../design-system/primitives';
import {cn,formatDate,formatMoney} from '../design-system/utils';

type Row=Record<string,any>;
const TABS=[
  {value:'orders',label:'Órdenes'},
  {value:'assets',label:'Activos y GIS'},
  {value:'maintenance',label:'Mantenimiento'},
  {value:'inventory',label:'Inventario'},
] as const;
type Tab=typeof TABS[number]['value'];
const today=new Date().toISOString().slice(0,10);
const M=(v:unknown)=>formatMoney(typeof v==='number'||typeof v==='string'?v:0);
const PRIO_TONE:Record<string,'neutral'|'warning'|'danger'>={low:'neutral',normal:'neutral',high:'warning',urgent:'danger'};

export function Operations(){
  const auth=useAuth();
  const [tab,setTab]=useState<Tab>('orders');
  const [orders,setOrders]=useState<Row[]>([]);
  const [assets,setAssets]=useState<Row[]>([]);
  const [plans,setPlans]=useState<Row[]>([]);
  const [stock,setStock]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [assetFilter,setAssetFilter]=useState('');
  const [dialog,setDialog]=useState<'order'|'asset'|'plan'|'item'|'movement'|null>(null);
  const [completion,setCompletion]=useState<{row:Row;actual_cost:string;notes:string}|null>(null);

  const [order,setOrder]=useState({type:'fuga',description:'',priority:'normal',asset_id:'',due_date:'',estimated_cost:'0'});
  const [asset,setAsset]=useState({code:'',name:'',asset_type:'bomba',status:'active',condition:'good',criticality:'medium',sector:'',address:'',latitude:'',longitude:'',installed_at:'',expected_life_years:'',replacement_cost:'0',serial_number:'',notes:''});
  const [plan,setPlan]=useState({asset_id:'',name:'',frequency_days:'30',next_due_date:today,estimated_cost:'0',checklist:''});
  const [item,setItem]=useState({code:'',name:'',unit:'unidad',minimum_stock:'0',unit_cost:'0'});
  const [movement,setMovement]=useState({item_id:'',movement_type:'entry',quantity:'',reason:'',work_order_id:''});

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([listWorkOrders(),listAssets(),listMaintenancePlans(),listInventory()])
      .then(([w,a,p,s])=>{setOrders(w as Row[]);setAssets(a as Row[]);setPlans(p as Row[]);setStock(s as Row[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  const filteredAssets=useMemo(()=>assets.filter(r=>{
    const q=assetFilter.trim().toLowerCase();
    return !q||`${r.code} ${r.name} ${r.asset_type} ${r.sector??''}`.toLowerCase().includes(q);
  }),[assets,assetFilter]);
  const mapMarkers=useMemo(()=>filteredAssets.filter(r=>r.latitude!=null&&r.longitude!=null).map(r=>({lat:Number(r.latitude),lng:Number(r.longitude),title:`${r.code} · ${r.name}`,status:r.status})),[filteredAssets]);
  const openOrders=orders.filter(r=>!['completed','cancelled'].includes(r.status));
  const overduePlans=plans.filter(r=>r.overdue);
  const criticalAssets=assets.filter(r=>r.condition==='critical'||r.criticality==='critical');
  const lowStock=stock.filter(r=>Number(r.quantity)<=Number(r.minimum_stock));

  function reset(){
    setOrder({type:'fuga',description:'',priority:'normal',asset_id:'',due_date:'',estimated_cost:'0'});
    setAsset({code:'',name:'',asset_type:'bomba',status:'active',condition:'good',criticality:'medium',sector:'',address:'',latitude:'',longitude:'',installed_at:'',expected_life_years:'',replacement_cost:'0',serial_number:'',notes:''});
    setPlan({asset_id:'',name:'',frequency_days:'30',next_due_date:today,estimated_cost:'0',checklist:''});
    setItem({code:'',name:'',unit:'unidad',minimum_stock:'0',unit_cost:'0'});
    setMovement({item_id:'',movement_type:'entry',quantity:'',reason:'',work_order_id:''});
  }
  async function run(fn:()=>Promise<unknown>,msg:string){
    try{await fn();setDialog(null);reset();setNotice(msg);load();}
    catch(e){setError((e as Error).message);}
  }
  async function confirmCompletion(e:React.FormEvent){
    e.preventDefault();
    if(!completion)return;
    const actualCost=Number(completion.actual_cost);
    if(!Number.isFinite(actualCost)||actualCost<0){setError('El costo real no es válido.');return;}
    if(completion.notes.trim().length<5){setError('Describa el trabajo realizado.');return;}
    try{
      await updateWorkOrderDetails(completion.row.id,{status:'completed',actual_cost:actualCost,notes:completion.notes.trim()});
      setCompletion(null);setNotice('Orden completada y agregada al historial técnico del activo.');load();
    }catch(e){setError((e as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div>
        <h1>Operación</h1>
        <p>Órdenes de trabajo, catastro de activos, prevención e inventario en un solo espacio.</p>
      </div>
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&orders.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<>
      <div className="ja-home-metrics">
        <article className="ja-metric"><small>Órdenes abiertas</small><strong>{openOrders.length}</strong><span>{orders.filter(r=>r.priority==='urgent'&&!['completed','cancelled'].includes(r.status)).length} urgentes</span></article>
        <article className={cn('ja-metric',overduePlans.length>0&&'ja-metric-warning')}><small>Mantenimientos vencidos</small><strong>{overduePlans.length}</strong><span>Requieren planificación</span></article>
        <article className={cn('ja-metric',criticalAssets.length>0&&'ja-metric-danger')}><small>Activos críticos</small><strong>{criticalAssets.length}</strong><span>Por condición o criticidad</span></article>
        <article className={cn('ja-metric',lowStock.length>0&&'ja-metric-warning')}><small>Stock bajo</small><strong>{lowStock.length}</strong><span>Materiales en mínimo</span></article>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={v=>setTab(v as Tab)}/>

      {tab==='orders'&&<section className="ja-list">
        <div className="ja-list-heading" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>Cola de trabajo</span>
          {auth.has('operations.manage')&&<Button size="sm" icon={<Plus size={14}/>} onClick={()=>setDialog('order')}>Nueva orden</Button>}
        </div>
        {orders.length===0
          ?<EmptyState icon={<ClipboardList size={22}/>} title="Sin órdenes" description="Cree una orden de trabajo para el equipo técnico."/>
          :orders.map(r=><article key={r.id} className="ja-list-row">
            <div>
              <strong>{r.order_number} · {r.type}</strong>
              <span className="ja-cell-sub">{r.description} · {r.asset_name?`${r.asset_code} · ${r.asset_name}`:'sin activo'}{r.due_date?` · vence ${formatDate(r.due_date)}`:''}</span>
            </div>
            <div className="ja-td-num">{M(r.actual_cost||r.estimated_cost)}</div>
            <Badge tone={PRIO_TONE[r.priority]??'neutral'}>{r.priority}</Badge>
            <Badge tone={['completed','cancelled'].includes(r.status)?'success':'neutral'}>{r.status}</Badge>
            {auth.has('operations.manage')&&!['completed','cancelled'].includes(r.status)&&
              <Button size="sm" variant="secondary" onClick={()=>setCompletion({row:r,actual_cost:String(r.estimated_cost??0),notes:''})}>Completar</Button>}
          </article>)}
      </section>}

      {tab==='assets'&&<>
        <section className="ja-list">
          <div className="ja-list-heading" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'.5rem'}}>
            <span>Catastro técnico · {filteredAssets.length}</span>
            <span style={{display:'flex',gap:'.4rem'}}>
              <input className="ja-control" style={{maxWidth:'12rem'}} value={assetFilter} onChange={e=>setAssetFilter(e.target.value)} placeholder="Buscar activo"/>
              {auth.has('assets.manage')&&<Button size="sm" icon={<Plus size={14}/>} onClick={()=>setDialog('asset')}>Registrar activo</Button>}
            </span>
          </div>
          <div className="ja-table-scroll">
            <table className="ja-table">
              <thead><tr><th>Activo</th><th>Tipo</th><th>Condición</th><th>Criticidad</th><th>Próximo mant.</th></tr></thead>
              <tbody>
                {filteredAssets.length===0
                  ?<tr><td colSpan={5} className="ja-table-empty">Sin activos.</td></tr>
                  :filteredAssets.map(r=><tr key={r.id}>
                    <td><strong>{r.code}</strong><span className="ja-cell-sub">{r.name}</span></td>
                    <td>{r.asset_type}</td>
                    <td><Badge tone={r.condition==='critical'||r.condition==='poor'?'danger':r.condition==='fair'?'warning':'success'}>{r.condition}</Badge></td>
                    <td>{r.criticality}</td>
                    <td className="ja-cell-sub">{r.next_maintenance?formatDate(r.next_maintenance):'Sin plan'}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </section>
        <section className="ja-table-scroll">
          <h3 className="ja-list-heading"><MapPinned size={14}/> Mapa de infraestructura</h3>
          <GoogleMapPicker readonly markers={mapMarkers} onChange={()=>{}}/>
        </section>
      </>}

      {tab==='maintenance'&&<section className="ja-list">
        <div className="ja-list-heading" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>Calendario preventivo</span>
          {auth.has('maintenance.manage')&&<span style={{display:'flex',gap:'.4rem'}}>
            <Button size="sm" variant="secondary" icon={<RefreshCw size={13}/>} onClick={()=>void run(()=>generatePreventiveWorkOrders(today),'Órdenes preventivas generadas.')}>Generar vencidas</Button>
            <Button size="sm" icon={<Plus size={14}/>} onClick={()=>setDialog('plan')}>Plan preventivo</Button>
          </span>}
        </div>
        {plans.length===0
          ?<EmptyState icon={<Gauge size={22}/>} title="Sin planes" description="Cree un plan preventivo para un activo."/>
          :plans.map(r=><article key={r.id} className={cn('ja-list-row')}>
            <div>
              <strong>{r.asset_code} · {r.asset_name}</strong>
              <span className="ja-cell-sub">{r.name} · cada {r.frequency_days} días · próxima {formatDate(r.next_due_date)}</span>
            </div>
            <div className="ja-td-num">{M(r.estimated_cost)}</div>
            {r.overdue&&<Badge tone="warning">Vencido</Badge>}
          </article>)}
      </section>}

      {tab==='inventory'&&<section className="ja-list">
        <div className="ja-list-heading" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>Inventario</span>
          {auth.has('inventory.manage')&&<span style={{display:'flex',gap:'.4rem'}}>
            <Button size="sm" variant="secondary" icon={<Plus size={13}/>} onClick={()=>setDialog('movement')}>Movimiento</Button>
            <Button size="sm" icon={<Plus size={14}/>} onClick={()=>setDialog('item')}>Nuevo material</Button>
          </span>}
        </div>
        <div className="ja-table-scroll">
          <table className="ja-table">
            <thead><tr><th>Material</th><th className="ja-td-num">Existencia</th><th className="ja-td-num">Mínimo</th><th className="ja-td-num">Valor</th></tr></thead>
            <tbody>
              {stock.length===0
                ?<tr><td colSpan={4} className="ja-table-empty">Sin materiales.</td></tr>
                :stock.map(r=><tr key={r.id}>
                  <td>{r.name}</td>
                  <td className="ja-td-num">{r.quantity} {r.unit}</td>
                  <td className="ja-td-num" style={{color:Number(r.quantity)<=Number(r.minimum_stock)?'var(--ja-warning)':undefined}}>{r.minimum_stock}</td>
                  <td className="ja-td-num">{M(Number(r.quantity)*Number(r.unit_cost))}</td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </section>}
    </>}

    {/* ── Diálogos ── */}
    <Dialog open={dialog==='order'} onClose={()=>setDialog(null)} title="Nueva orden de trabajo" description="La orden entra a la cola del equipo técnico.">
      <form className="ja-pos-fields" onSubmit={e=>{e.preventDefault();void run(()=>createWorkOrder({...order,estimated_cost:Number(order.estimated_cost)}),'Orden de trabajo creada y auditada.');}}>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Tipo</span><select className="ja-control" value={order.type} onChange={e=>setOrder({...order,type:e.target.value})}>{['fuga','instalacion','inspeccion','suspension','reconexion','medidor','reparacion','mantenimiento_preventivo'].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Activo relacionado</span><select className="ja-control" value={order.asset_id} onChange={e=>setOrder({...order,asset_id:e.target.value})}><option value="">Sin activo específico</option>{assets.map(a=><option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Prioridad</span><select className="ja-control" value={order.priority} onChange={e=>setOrder({...order,priority:e.target.value})}>{['low','normal','high','urgent'].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Fecha límite</span><input className="ja-control" type="date" value={order.due_date} onChange={e=>setOrder({...order,due_date:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Costo estimado (L)</span><input className="ja-control" type="number" min="0" step="0.01" value={order.estimated_cost} onChange={e=>setOrder({...order,estimated_cost:e.target.value})}/></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Descripción</span><textarea className="ja-control" required minLength={5} rows={3} value={order.description} onChange={e=>setOrder({...order,description:e.target.value})}/></label>
        <Button type="submit">Crear orden</Button>
      </form>
    </Dialog>

    <Dialog open={dialog==='asset'} onClose={()=>setDialog(null)} title="Registrar activo" description="Catastro técnico de la infraestructura.">
      <form className="ja-pos-fields" onSubmit={e=>{e.preventDefault();void run(()=>createAsset({...asset,latitude:asset.latitude||null,longitude:asset.longitude||null,expected_life_years:asset.expected_life_years||null,replacement_cost:Number(asset.replacement_cost)}),'Activo registrado en el catastro técnico.');}}>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Código</span><input className="ja-control" required value={asset.code} onChange={e=>setAsset({...asset,code:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Nombre</span><input className="ja-control" required value={asset.name} onChange={e=>setAsset({...asset,name:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Tipo</span><select className="ja-control" value={asset.asset_type} onChange={e=>setAsset({...asset,asset_type:e.target.value})}>{['pozo','tanque','bomba','motor','tuberia','valvula','medidor','macromedidor','clorador','edificio','vehiculo','herramienta','otro'].map(v=><option key={v}>{v}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Estado</span><select className="ja-control" value={asset.status} onChange={e=>setAsset({...asset,status:e.target.value})}><option value="active">Activo</option><option value="inactive">Inactivo</option><option value="maintenance">En mantenimiento</option><option value="retired">Retirado</option></select></label>
          <label className="ja-field"><span className="ja-field-label">Condición</span><select className="ja-control" value={asset.condition} onChange={e=>setAsset({...asset,condition:e.target.value})}>{['excellent','good','fair','poor','critical'].map(v=><option key={v}>{v}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Criticidad</span><select className="ja-control" value={asset.criticality} onChange={e=>setAsset({...asset,criticality:e.target.value})}>{['low','medium','high','critical'].map(v=><option key={v}>{v}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Sector</span><input className="ja-control" value={asset.sector} onChange={e=>setAsset({...asset,sector:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Dirección</span><input className="ja-control" value={asset.address} onChange={e=>setAsset({...asset,address:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Costo de reposición (L)</span><input className="ja-control" type="number" min="0" step="0.01" value={asset.replacement_cost} onChange={e=>setAsset({...asset,replacement_cost:e.target.value})}/></label>
        </div>
        <GoogleMapPicker latitude={asset.latitude?Number(asset.latitude):undefined} longitude={asset.longitude?Number(asset.longitude):undefined} onChange={(lat,lng)=>setAsset(c=>({...c,latitude:String(lat),longitude:String(lng)}))}/>
        <Button type="submit">Guardar activo</Button>
      </form>
    </Dialog>

    <Dialog open={dialog==='plan'} onClose={()=>setDialog(null)} title="Plan preventivo">
      <form className="ja-pos-fields" onSubmit={e=>{e.preventDefault();void run(()=>createMaintenancePlan({...plan,frequency_days:Number(plan.frequency_days),estimated_cost:Number(plan.estimated_cost)}),'Plan preventivo creado.');}}>
        <label className="ja-field"><span className="ja-field-label">Activo</span><select className="ja-control" required value={plan.asset_id} onChange={e=>setPlan({...plan,asset_id:e.target.value})}><option value="">Seleccione</option>{assets.filter(a=>a.status!=='retired').map(a=><option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}</select></label>
        <label className="ja-field"><span className="ja-field-label">Actividad</span><input className="ja-control" required value={plan.name} onChange={e=>setPlan({...plan,name:e.target.value})} placeholder="Lubricación, inspección, limpieza…"/></label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Frecuencia (días)</span><input className="ja-control" type="number" min="1" max="3650" value={plan.frequency_days} onChange={e=>setPlan({...plan,frequency_days:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Próxima fecha</span><input className="ja-control" type="date" required value={plan.next_due_date} onChange={e=>setPlan({...plan,next_due_date:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Costo estimado (L)</span><input className="ja-control" type="number" min="0" step="0.01" value={plan.estimated_cost} onChange={e=>setPlan({...plan,estimated_cost:e.target.value})}/></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Lista de verificación</span><textarea className="ja-control" rows={2} value={plan.checklist} onChange={e=>setPlan({...plan,checklist:e.target.value})} placeholder="Pasos, parámetros y criterios de aceptación."/></label>
        <Button type="submit">Crear plan</Button>
      </form>
    </Dialog>

    <Dialog open={dialog==='item'} onClose={()=>setDialog(null)} title="Nuevo material">
      <form className="ja-pos-fields" onSubmit={e=>{e.preventDefault();void run(()=>createInventoryItem({...item,minimum_stock:Number(item.minimum_stock),unit_cost:Number(item.unit_cost)}),'Material creado.');}}>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Código</span><input className="ja-control" required value={item.code} onChange={e=>setItem({...item,code:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Nombre</span><input className="ja-control" required value={item.name} onChange={e=>setItem({...item,name:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Unidad</span><input className="ja-control" required value={item.unit} onChange={e=>setItem({...item,unit:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Mínimo</span><input className="ja-control" type="number" min="0" step="0.001" value={item.minimum_stock} onChange={e=>setItem({...item,minimum_stock:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Costo unitario (L)</span><input className="ja-control" type="number" min="0" step="0.01" value={item.unit_cost} onChange={e=>setItem({...item,unit_cost:e.target.value})}/></label>
        </div>
        <Button type="submit">Crear material</Button>
      </form>
    </Dialog>

    <Dialog open={dialog==='movement'} onClose={()=>setDialog(null)} title="Movimiento de inventario">
      <form className="ja-pos-fields" onSubmit={e=>{e.preventDefault();void run(()=>registerInventoryMovement({...movement,quantity:Number(movement.quantity)}),'Movimiento de inventario registrado.');}}>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Material</span><select className="ja-control" required value={movement.item_id} onChange={e=>setMovement({...movement,item_id:e.target.value})}><option value="">Seleccione</option>{stock.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Tipo</span><select className="ja-control" value={movement.movement_type} onChange={e=>setMovement({...movement,movement_type:e.target.value})}><option value="entry">Entrada</option><option value="exit">Salida</option><option value="adjustment">Ajuste</option></select></label>
          <label className="ja-field"><span className="ja-field-label">Cantidad</span><input className="ja-control" required type="number" min="0.001" step="0.001" value={movement.quantity} onChange={e=>setMovement({...movement,quantity:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Orden asociada</span><select className="ja-control" value={movement.work_order_id} onChange={e=>setMovement({...movement,work_order_id:e.target.value})}><option value="">Sin orden</option>{orders.map(o=><option key={o.id} value={o.id}>{o.order_number}</option>)}</select></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Motivo</span><input className="ja-control" required value={movement.reason} onChange={e=>setMovement({...movement,reason:e.target.value})}/></label>
        <Button type="submit">Registrar movimiento</Button>
      </form>
    </Dialog>

    <Dialog open={Boolean(completion)} onClose={()=>setCompletion(null)}
      title={completion?`Completar orden ${completion.row.order_number}`:''}
      description="El cierre se guarda en auditoría y en el historial técnico del activo.">
      {completion&&<form className="ja-pos-fields" onSubmit={confirmCompletion}>
        <p><strong>{completion.row.description}</strong></p>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Costo estimado</span><input className="ja-control" readOnly value={Number(completion.row.estimated_cost??0).toFixed(2)}/></label>
          <label className="ja-field"><span className="ja-field-label">Costo real (L)</span><input className="ja-control" type="number" required min="0" step="0.01" value={completion.actual_cost} onChange={e=>setCompletion({...completion,actual_cost:e.target.value})}/></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Trabajo realizado</span><textarea className="ja-control" required minLength={5} rows={3} value={completion.notes} onChange={e=>setCompletion({...completion,notes:e.target.value})} placeholder="Detalle técnico, repuestos utilizados y resultado de la intervención."/></label>
        <Button type="submit">Finalizar orden y registrar historial</Button>
      </form>}
    </Dialog>
  </main>;
}
