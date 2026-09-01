import {useEffect,useState} from 'react';
import {Boxes,Plus} from 'lucide-react';
import {listWarehouses,createWarehouse} from '../features/inventory/service';
import {useAuth} from '../contexts/AuthContext';

type Warehouse={id:string;code:string;name:string;active:boolean};

export function Bodega(){
 const auth=useAuth();
 const [warehouses,setWarehouses]=useState<Warehouse[]>([]);
 const [error,setError]=useState('');
 const [form,setForm]=useState({code:'',name:''});
 const load=()=>{void listWarehouses().then(w=>setWarehouses((w as Warehouse[])??[])).catch(()=>setError('No se pudo cargar la bodega.'));};
 useEffect(load,[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();try{await createWarehouse(form.code,form.name);setForm({code:'',name:''});load();}catch(err){setError((err as Error).message);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Operación</span><h1>Bodega</h1><p>Ubicaciones de inventario y existencias de materiales.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  {auth.has('inventory.manage')&&<section className="panel"><div className="panel-heading"><h2><Plus size={18}/> Nueva bodega</h2></div>
   <form className="form-grid" onSubmit={submit}>
    <label>Código<input required value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></label>
    <label>Nombre<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
    <button className="primary">Crear bodega</button>
   </form></section>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {warehouses.length===0&&<div className="panel"><div className="empty empty-state"><Boxes size={22}/><p>Sin bodegas registradas.</p></div></div>}
   {warehouses.map(w=><article key={w.id} className="panel"><strong>{w.code} · {w.name}</strong><span>{w.active?'Activa':'Inactiva'}</span></article>)}
  </div>
  <section className="panel" style={{marginTop:'1rem'}}>
   <div className="panel-heading"><div><h2>Existencias por bodega</h2></div></div>
   <div className="notice">El detalle de existencias se despliega desde <a href="/operaciones">Centro operativo</a> (activos, órdenes e inventario comparten flujo técnico).</div>
  </section>
 </main>;
}
