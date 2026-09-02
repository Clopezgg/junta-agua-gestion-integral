import {useCallback,useEffect,useState} from 'react';
import {Building2,PackageCheck,Plus,RefreshCw} from 'lucide-react';
import {createPurchaseOrder,listPurchaseOrders,receivePurchaseOrder} from '../features/procurement/service';
import {listSuppliers} from '../features/finance/service';
import {useAuth} from '../contexts/AuthContext';
import {supabase} from '../lib/supabase';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {formatDate,formatMoney} from '../design-system/utils';

type Order={id:string;code:string;status:string;order_date:string;total_amount:number;supplier_id:string};
type Supplier={id:string;name:string};
const M=(v:unknown)=>formatMoney(typeof v==='number'||typeof v==='string'?v:0);
const STATE:Record<string,{label:string;tone:'neutral'|'success'|'warning'}>={
  borrador:{label:'Borrador',tone:'neutral'},
  aprobada:{label:'Aprobada',tone:'warning'},
  recibida:{label:'Recibida',tone:'success'},
  cerrada:{label:'Cerrada',tone:'success'},
};

export function Compras(){
  const auth=useAuth();
  const [items,setItems]=useState<Order[]>([]);
  const [suppliers,setSuppliers]=useState<Supplier[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [creating,setCreating]=useState(false);
  const [form,setForm]=useState({supplier_id:'',description:'',quantity:'',unit_price:''});

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([listPurchaseOrders(),listSuppliers()])
      .then(([o,s])=>{setItems((o as Order[])??[]);setSuppliers((s as Supplier[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    try{
      await createPurchaseOrder({p_supplier_id:form.supplier_id,p_requisition_id:null,p_expected_date:null,
        p_lines:[{description:form.description,quantity:Number(form.quantity),unit_price:Number(form.unit_price)}]});
      setForm({supplier_id:'',description:'',quantity:'',unit_price:''});
      setCreating(false);setNotice('Orden de compra creada.');load();
    }catch(err){setError((err as Error).message);}
  }
  async function receive(o:Order){
    if(!auth.has('inventory.manage'))return;
    try{
      const {data}=await supabase!.from('purchase_order_lines').select('id').eq('purchase_order_id',o.id);
      if(!data)return;
      await receivePurchaseOrder(o.id,data.map(l=>({line_id:l.id,received_quantity:1})));
      setNotice(`Orden ${o.code} recibida en bodega.`);load();
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div>
        <h1>Compras y proveedores</h1>
        <p>Órdenes de compra y recepción en bodega.</p>
      </div>
      {auth.has('expenses.create')&&<Button icon={<Plus size={15}/>} onClick={()=>setCreating(true)}>Nueva orden</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&items.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<section className="ja-list">
      {items.length===0
        ?<EmptyState icon={<Building2 size={22}/>} title="Sin órdenes de compra" description="Cree una orden para registrar una compra a proveedor."/>
        :items.map(o=>{
          const st=STATE[o.status]??{label:o.status,tone:'neutral' as const};
          return <article key={o.id} className="ja-list-row">
            <div>
              <strong className="ja-mono">{o.code}</strong>
              <span className="ja-cell-sub">{formatDate(o.order_date)} · {suppliers.find(s=>s.id===o.supplier_id)?.name??'Proveedor'}</span>
            </div>
            <div className="ja-td-num">{M(o.total_amount)}</div>
            <Badge tone={st.tone}>{st.label}</Badge>
            {o.status==='aprobada'&&auth.has('inventory.manage')&&<Button size="sm" variant="secondary" icon={<PackageCheck size={13}/>} onClick={()=>void receive(o)}>Recibir en bodega</Button>}
          </article>;
        })}
    </section>}

    <Dialog open={creating} onClose={()=>setCreating(false)} title="Nueva orden de compra" description="Una línea por partida; el total se calcula del detalle.">
      <form className="ja-pos-fields" onSubmit={submit}>
        <label className="ja-field"><span className="ja-field-label">Proveedor</span>
          <select className="ja-control" required value={form.supplier_id} onChange={e=>setForm({...form,supplier_id:e.target.value})}>
            <option value="">Seleccione</option>
            {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
        <label className="ja-field"><span className="ja-field-label">Descripción</span><input className="ja-control" required value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Cantidad</span><input className="ja-control" type="number" step="0.01" min="0" required value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Precio unitario (L)</span><input className="ja-control" type="number" step="0.01" min="0" required value={form.unit_price} onChange={e=>setForm({...form,unit_price:e.target.value})}/></label>
        </div>
        <Button type="submit" icon={<Plus size={15}/>}>Crear orden</Button>
      </form>
    </Dialog>
  </main>;
}
