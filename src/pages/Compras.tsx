import {useEffect,useState} from 'react';
import {Building2,Plus} from 'lucide-react';
import {createPurchaseOrder,listPurchaseOrders} from '../features/procurement/service';
import {listSuppliers} from '../features/finance/service';
import {useAuth} from '../contexts/AuthContext';
import {supabase} from '../lib/supabase';

type Order={id:string;code:string;status:string;order_date:string;total_amount:number;supplier_id:string};
type Supplier={id:string;name:string};

export function Compras(){
 const auth=useAuth();
 const [items,setItems]=useState<Order[]>([]);
 const [suppliers,setSuppliers]=useState<Supplier[]>([]);
 const [error,setError]=useState('');
 const [form,setForm]=useState({supplier_id:'',description:'',quantity:'',unit_price:''});
 const money=(v:unknown)=>`L ${Number(v??0).toLocaleString('es-HN',{minimumFractionDigits:2})}`;
 const load=()=>{void Promise.all([listPurchaseOrders(),listSuppliers()]).then(([o,s])=>{setItems((o as Order[])??[]);setSuppliers((s as Supplier[])??[])}).catch(()=>setError('No se pudieron cargar las compras.'));};
 useEffect(load,[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();try{await createPurchaseOrder({p_supplier_id:form.supplier_id,p_requisition_id:null,p_expected_date:null,p_lines:[{description:form.description,quantity:Number(form.quantity),unit_price:Number(form.unit_price)}]});setForm({supplier_id:'',description:'',quantity:'',unit_price:''});load();}catch(err){setError((err as Error).message);}};
 const receive=async(o:Order)=>{if(!auth.has('inventory.manage'))return;const {data}=await supabase!.from('purchase_order_lines').select('id').eq('purchase_order_id',o.id);if(!data)return;try{await (await import('../features/procurement/service')).receivePurchaseOrder(o.id,data.map(l=>({line_id:l.id,received_quantity:1})));load();}catch(err){setError((err as Error).message);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Tesorería</span><h1>Compras y proveedores</h1><p>Órdenes de compra y recepción en bodega.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  {auth.has('expenses.create')&&<section className="panel"><div className="panel-heading"><h2><Plus size={18}/> Nueva orden de compra</h2></div>
   <form className="form-grid" onSubmit={submit}>
    <label>Proveedor<select required value={form.supplier_id} onChange={e=>setForm({...form,supplier_id:e.target.value})}><option value="">—</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label>Descripción<input required value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
    <label>Cantidad<input type="number" step="0.01" min="0" required value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></label>
    <label>Precio unitario (L)<input type="number" step="0.01" min="0" required value={form.unit_price} onChange={e=>setForm({...form,unit_price:e.target.value})}/></label>
    <button className="primary">Crear orden</button>
   </form></section>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {items.length===0&&<div className="panel"><div className="empty empty-state"><Building2 size={22}/><p>Sin órdenes de compra.</p></div></div>}
   {items.map(o=><article key={o.id} className="panel"><strong>{o.code}</strong><span>{o.status}</span><small>{new Date(o.order_date).toLocaleDateString('es-HN')} · {money(o.total_amount)}</small>{o.status==='aprobada'&&<button className="outline" style={{marginTop:'0.5rem'}} onClick={()=>receive(o)}>Recibir en bodega</button>}</article>)}
  </div>
 </main>;
}
