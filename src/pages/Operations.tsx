import {useCallback,useEffect,useMemo,useState} from 'react';
import {Boxes,ClipboardList,Gauge,MapPinned,PackagePlus,Plus,RefreshCw,Settings2,Wrench} from 'lucide-react';
import {GoogleMapPicker} from '../components/maps/GoogleMapPicker';
import {createAsset,createInventoryItem,createMaintenancePlan,createWorkOrder,generatePreventiveWorkOrders,listAssets,listInventory,listMaintenancePlans,listWorkOrders,registerInventoryMovement,updateWorkOrderDetails} from '../features/operations/service';
import {useAuth} from '../contexts/AuthContext';

type Row=Record<string,any>;
type Tab='orders'|'assets'|'maintenance'|'inventory';
const today=new Date().toISOString().slice(0,10);
const money=(value:unknown)=>`L ${Number(value??0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export function Operations(){
 const auth=useAuth();
 const[tab,setTab]=useState<Tab>('orders');
 const[orders,setOrders]=useState<Row[]>([]);
 const[assets,setAssets]=useState<Row[]>([]);
 const[plans,setPlans]=useState<Row[]>([]);
 const[stock,setStock]=useState<Row[]>([]);
 const[error,setError]=useState('');
 const[message,setMessage]=useState('');
 const[assetFilter,setAssetFilter]=useState('');
 const[order,setOrder]=useState({type:'fuga',description:'',priority:'normal',asset_id:'',due_date:'',estimated_cost:'0'});
 const[asset,setAsset]=useState({code:'',name:'',asset_type:'bomba',status:'active',condition:'good',criticality:'medium',sector:'',address:'',latitude:'',longitude:'',installed_at:'',expected_life_years:'',replacement_cost:'0',serial_number:'',notes:''});
 const[plan,setPlan]=useState({asset_id:'',name:'',frequency_days:'30',next_due_date:today,estimated_cost:'0',checklist:''});
 const[item,setItem]=useState({code:'',name:'',unit:'unidad',minimum_stock:'0',unit_cost:'0'});
 const[movement,setMovement]=useState({item_id:'',movement_type:'entry',quantity:'',reason:'',work_order_id:''});

 const load=useCallback(async()=>{
   try{
     const[workRows,assetRows,planRows,stockRows]=await Promise.all([listWorkOrders(),listAssets(),listMaintenancePlans(),listInventory()]);
     setOrders(workRows);setAssets(assetRows);setPlans(planRows);setStock(stockRows);setError('');
   }catch(e){setError((e as Error).message)}
 },[]);
 useEffect(()=>{void load()},[load]);

 const filteredAssets=useMemo(()=>assets.filter(row=>{
   const q=assetFilter.trim().toLowerCase();
   return !q||`${row.code} ${row.name} ${row.asset_type} ${row.sector??''}`.toLowerCase().includes(q);
 }),[assets,assetFilter]);
 const mapMarkers=useMemo(()=>filteredAssets.filter(row=>row.latitude!=null&&row.longitude!=null).map(row=>({lat:Number(row.latitude),lng:Number(row.longitude),title:`${row.code} · ${row.name} · ${row.condition}`,status:row.status})),[filteredAssets]);
 const overduePlans=plans.filter(row=>row.overdue);
 const openOrders=orders.filter(row=>!['completed','cancelled'].includes(row.status));
 const criticalAssets=assets.filter(row=>row.condition==='critical'||row.criticality==='critical');
 const lowStock=stock.filter(row=>Number(row.quantity)<=Number(row.minimum_stock));

 async function saveOrder(event:React.FormEvent){
   event.preventDefault();
   try{
     await createWorkOrder({...order,estimated_cost:Number(order.estimated_cost)});
     setOrder({type:'fuga',description:'',priority:'normal',asset_id:'',due_date:'',estimated_cost:'0'});
     setMessage('Orden de trabajo creada y auditada.');await load();
   }catch(e){setError((e as Error).message)}
 }
 async function saveAsset(event:React.FormEvent){
   event.preventDefault();
   try{
     await createAsset({...asset,latitude:asset.latitude||null,longitude:asset.longitude||null,expected_life_years:asset.expected_life_years||null,replacement_cost:Number(asset.replacement_cost)});
     setAsset({code:'',name:'',asset_type:'bomba',status:'active',condition:'good',criticality:'medium',sector:'',address:'',latitude:'',longitude:'',installed_at:'',expected_life_years:'',replacement_cost:'0',serial_number:'',notes:''});
     setMessage('Activo registrado en el catastro técnico.');await load();
   }catch(e){setError((e as Error).message)}
 }
 async function savePlan(event:React.FormEvent){
   event.preventDefault();
   try{
     await createMaintenancePlan({...plan,frequency_days:Number(plan.frequency_days),estimated_cost:Number(plan.estimated_cost)});
     setPlan({asset_id:'',name:'',frequency_days:'30',next_due_date:today,estimated_cost:'0',checklist:''});
     setMessage('Plan preventivo creado.');await load();
   }catch(e){setError((e as Error).message)}
 }
 async function generateOrders(){
   try{
     const result=await generatePreventiveWorkOrders(today);
     setMessage(`${Number(result?.generated??0)} órdenes preventivas generadas.`);await load();
   }catch(e){setError((e as Error).message)}
 }
 async function completeOrder(row:Row){
   const actual=window.prompt('Costo real de la orden',String(row.estimated_cost??0));
   if(actual===null)return;
   const notes=window.prompt('Detalle del trabajo realizado','Trabajo finalizado')??'Trabajo finalizado';
   try{await updateWorkOrderDetails(row.id,{status:'completed',actual_cost:Number(actual),notes});setMessage('Orden completada y agregada al historial del activo.');await load()}catch(e){setError((e as Error).message)}
 }

 return <main className="content">
  <div className="titlebar"><div><h1>Operaciones, activos y mantenimiento</h1><p>Infraestructura, GIS, órdenes, prevención e inventario en un solo flujo.</p></div><button className="outline" onClick={()=>void load()}><RefreshCw size={17}/>Actualizar</button></div>
  {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}

  <div className="cards operational-cards">
   <article><ClipboardList size={20}/><small>Órdenes abiertas</small><h3>{openOrders.length}</h3><span>{orders.filter(row=>row.priority==='urgent'&&!['completed','cancelled'].includes(row.status)).length} urgentes</span></article>
   <article><Gauge size={20}/><small>Mantenimientos vencidos</small><h3>{overduePlans.length}</h3><span>Requieren planificación</span></article>
   <article><Wrench size={20}/><small>Activos críticos</small><h3>{criticalAssets.length}</h3><span>Por condición o criticidad</span></article>
   <article><Boxes size={20}/><small>Stock bajo</small><h3>{lowStock.length}</h3><span>Materiales en mínimo</span></article>
  </div>

  <div className="module-tabs">
   <button className={tab==='orders'?'active outline':'outline'} onClick={()=>setTab('orders')}><ClipboardList size={17}/>Órdenes</button>
   <button className={tab==='assets'?'active outline':'outline'} onClick={()=>setTab('assets')}><MapPinned size={17}/>Activos y GIS</button>
   <button className={tab==='maintenance'?'active outline':'outline'} onClick={()=>setTab('maintenance')}><Settings2 size={17}/>Mantenimiento</button>
   <button className={tab==='inventory'?'active outline':'outline'} onClick={()=>setTab('inventory')}><Boxes size={17}/>Inventario</button>
  </div>

  {tab==='orders'&&<div className="subscriber-layout">
   {auth.has('operations.manage')&&<section className="panel"><h2><Plus size={19}/>Nueva orden</h2><form className="subform" onSubmit={saveOrder}>
    <label>Tipo<select value={order.type} onChange={e=>setOrder({...order,type:e.target.value})}><option value="fuga">Fuga</option><option value="instalacion">Instalación</option><option value="inspeccion">Inspección</option><option value="suspension">Suspensión</option><option value="reconexion">Reconexión</option><option value="medidor">Cambio de medidor</option><option value="reparacion">Reparación</option><option value="mantenimiento_preventivo">Mantenimiento preventivo</option></select></label>
    <label>Activo relacionado<select value={order.asset_id} onChange={e=>setOrder({...order,asset_id:e.target.value})}><option value="">Sin activo específico</option>{assets.map(row=><option key={row.id} value={row.id}>{row.code} — {row.name}</option>)}</select></label>
    <label>Descripción<textarea required minLength={5} value={order.description} onChange={e=>setOrder({...order,description:e.target.value})}/></label>
    <label>Prioridad<select value={order.priority} onChange={e=>setOrder({...order,priority:e.target.value})}><option value="low">Baja</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
    <label>Fecha límite<input type="date" value={order.due_date} onChange={e=>setOrder({...order,due_date:e.target.value})}/></label>
    <label>Costo estimado<input type="number" min="0" step="0.01" value={order.estimated_cost} onChange={e=>setOrder({...order,estimated_cost:e.target.value})}/></label>
    <button>Crear orden</button>
   </form></section>}
   <section className="panel"><h2>Cola de trabajo</h2>{orders.length===0?<div className="empty">No existen órdenes.</div>:orders.map(row=><div className={`work-order priority-${row.priority}`} key={row.id}><div><strong>{row.order_number} — {row.type}</strong><small>{row.description}</small><span>{row.asset_name?`${row.asset_code} · ${row.asset_name}`:'Sin activo'} · {row.status}{row.due_date?` · vence ${row.due_date}`:''}</span><span>Estimado {money(row.estimated_cost)} · Real {money(row.actual_cost)}</span></div>{auth.has('operations.manage')&&!['completed','cancelled'].includes(row.status)&&<button className="compact" onClick={()=>void completeOrder(row)}>Completar</button>}</div>)}</section>
  </div>}

  {tab==='assets'&&<>
   <div className="subscriber-layout">
    {auth.has('assets.manage')&&<section className="panel"><h2><Plus size={19}/>Registrar activo</h2><form className="subform" onSubmit={saveAsset}>
     <div className="form-grid"><label>Código<input required value={asset.code} onChange={e=>setAsset({...asset,code:e.target.value})}/></label><label>Nombre<input required value={asset.name} onChange={e=>setAsset({...asset,name:e.target.value})}/></label>
     <label>Tipo<select value={asset.asset_type} onChange={e=>setAsset({...asset,asset_type:e.target.value})}>{['pozo','tanque','bomba','motor','tuberia','valvula','medidor','macromedidor','clorador','edificio','vehiculo','herramienta','otro'].map(value=><option key={value}>{value}</option>)}</select></label>
     <label>Estado<select value={asset.status} onChange={e=>setAsset({...asset,status:e.target.value})}><option value="active">Activo</option><option value="inactive">Inactivo</option><option value="maintenance">En mantenimiento</option><option value="retired">Retirado</option></select></label>
     <label>Condición<select value={asset.condition} onChange={e=>setAsset({...asset,condition:e.target.value})}><option value="excellent">Excelente</option><option value="good">Buena</option><option value="fair">Regular</option><option value="poor">Mala</option><option value="critical">Crítica</option></select></label>
     <label>Criticidad<select value={asset.criticality} onChange={e=>setAsset({...asset,criticality:e.target.value})}><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Crítica</option></select></label>
     <label>Sector<input value={asset.sector} onChange={e=>setAsset({...asset,sector:e.target.value})}/></label><label>Dirección<input value={asset.address} onChange={e=>setAsset({...asset,address:e.target.value})}/></label>
     <label>Fecha de instalación<input type="date" value={asset.installed_at} onChange={e=>setAsset({...asset,installed_at:e.target.value})}/></label><label>Vida útil esperada (años)<input type="number" min="1" value={asset.expected_life_years} onChange={e=>setAsset({...asset,expected_life_years:e.target.value})}/></label>
     <label>Costo de reposición<input type="number" min="0" step="0.01" value={asset.replacement_cost} onChange={e=>setAsset({...asset,replacement_cost:e.target.value})}/></label><label>Serie / placa<input value={asset.serial_number} onChange={e=>setAsset({...asset,serial_number:e.target.value})}/></label>
     <label className="span-2">Notas<textarea value={asset.notes} onChange={e=>setAsset({...asset,notes:e.target.value})}/></label></div>
     <GoogleMapPicker latitude={asset.latitude?Number(asset.latitude):undefined} longitude={asset.longitude?Number(asset.longitude):undefined} onChange={(latitude,longitude)=>setAsset(current=>({...current,latitude:String(latitude),longitude:String(longitude)}))}/>
     <div className="coordinate-grid"><label>Latitud<input value={asset.latitude} onChange={e=>setAsset({...asset,latitude:e.target.value})}/></label><label>Longitud<input value={asset.longitude} onChange={e=>setAsset({...asset,longitude:e.target.value})}/></label></div>
     <button>Guardar activo</button>
    </form></section>}
    <section className="panel"><div className="titlebar"><div><h2>Catastro técnico</h2><p>{filteredAssets.length} activos</p></div><input className="compact-search" value={assetFilter} onChange={e=>setAssetFilter(e.target.value)} placeholder="Buscar activo"/></div><div className="table-scroll"><table><thead><tr><th>Activo</th><th>Tipo</th><th>Condición</th><th>Criticidad</th><th>Próximo mantenimiento</th></tr></thead><tbody>{filteredAssets.map(row=><tr key={row.id}><td><strong>{row.code}</strong><small>{row.name}</small></td><td>{row.asset_type}</td><td><span className={`status-badge ${row.condition}`}>{row.condition}</span></td><td>{row.criticality}</td><td>{row.next_maintenance??'Sin plan'}</td></tr>)}</tbody></table></div></section>
   </div>
   <section className="panel" style={{marginTop:'1rem'}}><h2><MapPinned size={19}/>Mapa GIS de infraestructura</h2><GoogleMapPicker readonly markers={mapMarkers} onChange={()=>{}}/></section>
  </>}

  {tab==='maintenance'&&<div className="subscriber-layout">
   {auth.has('maintenance.manage')&&<section className="panel"><h2><Plus size={19}/>Plan preventivo</h2><form className="subform" onSubmit={savePlan}>
    <label>Activo<select required value={plan.asset_id} onChange={e=>setPlan({...plan,asset_id:e.target.value})}><option value="">Seleccione activo</option>{assets.filter(row=>row.status!=='retired').map(row=><option key={row.id} value={row.id}>{row.code} — {row.name}</option>)}</select></label>
    <label>Actividad<input required value={plan.name} onChange={e=>setPlan({...plan,name:e.target.value})} placeholder="Lubricación, inspección, limpieza…"/></label>
    <label>Frecuencia en días<input type="number" min="1" max="3650" value={plan.frequency_days} onChange={e=>setPlan({...plan,frequency_days:e.target.value})}/></label>
    <label>Próxima fecha<input type="date" required value={plan.next_due_date} onChange={e=>setPlan({...plan,next_due_date:e.target.value})}/></label>
    <label>Costo estimado<input type="number" min="0" step="0.01" value={plan.estimated_cost} onChange={e=>setPlan({...plan,estimated_cost:e.target.value})}/></label>
    <label>Lista de verificación<textarea value={plan.checklist} onChange={e=>setPlan({...plan,checklist:e.target.value})} placeholder="Pasos, parámetros y criterios de aceptación."/></label>
    <button>Crear plan</button>
   </form><button className="outline full-button" onClick={()=>void generateOrders()}><RefreshCw size={17}/>Generar órdenes vencidas</button></section>}
   <section className="panel"><h2>Calendario preventivo</h2>{plans.length===0?<div className="empty">No existen planes.</div>:plans.map(row=><div className={`maintenance-row ${row.overdue?'overdue':''}`} key={row.id}><div><strong>{row.asset_code} — {row.asset_name}</strong><small>{row.name}</small><span>Cada {row.frequency_days} días · próxima: {row.next_due_date}</span></div><span>{money(row.estimated_cost)}</span></div>)}</section>
  </div>}

  {tab==='inventory'&&<div className="subscriber-layout">
   {auth.has('inventory.manage')&&<section className="panel"><h2><PackagePlus size={19}/>Nuevo material</h2><form className="subform" onSubmit={async event=>{event.preventDefault();try{await createInventoryItem({...item,minimum_stock:Number(item.minimum_stock),unit_cost:Number(item.unit_cost)});setItem({code:'',name:'',unit:'unidad',minimum_stock:'0',unit_cost:'0'});await load()}catch(e){setError((e as Error).message)}}}><input required placeholder="Código" value={item.code} onChange={e=>setItem({...item,code:e.target.value})}/><input required placeholder="Nombre" value={item.name} onChange={e=>setItem({...item,name:e.target.value})}/><input required placeholder="Unidad" value={item.unit} onChange={e=>setItem({...item,unit:e.target.value})}/><input type="number" min="0" step="0.001" placeholder="Mínimo" value={item.minimum_stock} onChange={e=>setItem({...item,minimum_stock:e.target.value})}/><input type="number" min="0" step="0.01" placeholder="Costo unitario" value={item.unit_cost} onChange={e=>setItem({...item,unit_cost:e.target.value})}/><button>Crear material</button></form></section>}
   <section className="panel"><h2>Inventario</h2>{auth.has('inventory.manage')&&<form className="subform" onSubmit={async event=>{event.preventDefault();try{await registerInventoryMovement({...movement,quantity:Number(movement.quantity)});setMovement({item_id:'',movement_type:'entry',quantity:'',reason:'',work_order_id:''});await load()}catch(e){setError((e as Error).message)}}}><select required value={movement.item_id} onChange={e=>setMovement({...movement,item_id:e.target.value})}><option value="">Material</option>{stock.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select><select value={movement.movement_type} onChange={e=>setMovement({...movement,movement_type:e.target.value})}><option value="entry">Entrada</option><option value="exit">Salida</option><option value="adjustment">Ajuste</option></select><input required type="number" min="0.001" step="0.001" value={movement.quantity} onChange={e=>setMovement({...movement,quantity:e.target.value})}/><input required placeholder="Motivo" value={movement.reason} onChange={e=>setMovement({...movement,reason:e.target.value})}/><select value={movement.work_order_id} onChange={e=>setMovement({...movement,work_order_id:e.target.value})}><option value="">Sin orden asociada</option>{orders.map(row=><option key={row.id} value={row.id}>{row.order_number}</option>)}</select><button>Registrar movimiento</button></form>}<div className="table-scroll"><table><thead><tr><th>Material</th><th>Existencia</th><th>Mínimo</th><th>Valor</th></tr></thead><tbody>{stock.map(row=><tr key={row.id}><td>{row.name}</td><td>{row.quantity} {row.unit}</td><td className={Number(row.quantity)<=Number(row.minimum_stock)?'warn':''}>{row.minimum_stock}</td><td>{money(Number(row.quantity)*Number(row.unit_cost))}</td></tr>)}</tbody></table></div></section>
  </div>}
 </main>;
}
