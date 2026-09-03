import {useCallback,useEffect,useState} from 'react';
import {Boxes,Plus,RefreshCw} from 'lucide-react';
import {Link} from 'react-router-dom';
import {createWarehouse,listWarehouses} from '../features/inventory/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';

type Warehouse={id:string;code:string;name:string;active:boolean};

export function Bodega(){
  const auth=useAuth();
  const manage=auth.has('inventory.manage');
  const [warehouses,setWarehouses]=useState<Warehouse[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({code:'',name:''});

  const load=useCallback(()=>{
    setLoading(true);
    void listWarehouses()
      .then(w=>{setWarehouses((w as Warehouse[])??[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    try{
      await createWarehouse(form.code.trim(),form.name.trim());
      setForm({code:'',name:''});setOpen(false);setNotice('Bodega creada.');load();
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Bodega</h1><p>Ubicaciones de inventario y existencias de materiales.</p></div>
      {manage&&<Button icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>Nueva bodega</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&warehouses.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<section className="ja-list">
      {warehouses.length===0
        ?<EmptyState icon={<Boxes size={22}/>} title="Sin bodegas registradas" description="Cree la primera ubicación de inventario."/>
        :warehouses.map(w=><article key={w.id} className="ja-list-row">
          <div><strong>{w.code} · {w.name}</strong></div>
          <Badge tone={w.active?'success':'neutral'}>{w.active?'Activa':'Inactiva'}</Badge>
        </article>)}
    </section>}

    <div className="ja-banner ja-banner-info">
      El detalle de existencias se despliega desde <Link to="/operaciones">Centro operativo</Link> (activos, órdenes e inventario comparten flujo técnico).
    </div>

    <Dialog open={open} onClose={()=>setOpen(false)} title="Nueva bodega">
      <form className="ja-pos-fields" onSubmit={submit}>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Código</span>
            <input className="ja-control" required value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/>
          </label>
          <label className="ja-field"><span className="ja-field-label">Nombre</span>
            <input className="ja-control" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          </label>
        </div>
        <Button type="submit">Crear bodega</Button>
      </form>
    </Dialog>
  </main>;
}
