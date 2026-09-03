import {useCallback,useEffect,useRef,useState} from 'react';
import {FileCheck2,Plus,ReceiptText,RefreshCw} from 'lucide-react';
import {
  approveExpense,confirmExpense,createExpenseRequest,getExpenseEvidenceUrl,listExpenses,uploadExpenseEvidence,
} from '../features/finance/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton,Tabs} from '../design-system/primitives';
import {formatDate,formatMoney} from '../design-system/utils';

type Row=Record<string,any>;
const M=(v:unknown)=>formatMoney(typeof v==='number'||typeof v==='string'?v:0);
const CATEGORIES=['Tuberías y accesorios','Mantenimiento','Electricidad','Combustible','Mano de obra','Papelería','Otros'];
const STATE:Record<string,{label:string;tone:'neutral'|'success'|'warning'|'danger'}>={
  requested:{label:'Solicitado',tone:'warning'},
  approved:{label:'Aprobado',tone:'neutral'},
  rejected:{label:'Rechazado',tone:'danger'},
  confirmed:{label:'Contabilizado',tone:'success'},
  paid:{label:'Contabilizado',tone:'success'},
};
const TABS=[
  {value:'',label:'Todos'},
  {value:'requested',label:'Por aprobar'},
  {value:'approved',label:'Por comprobar'},
  {value:'confirmed',label:'Contabilizados'},
] as const;

export function Expenses(){
  const auth=useAuth();
  const [rows,setRows]=useState<Row[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [filter,setFilter]=useState('');
  const [creating,setCreating]=useState(false);
  const [confirmTarget,setConfirmTarget]=useState<Row|null>(null);
  const [invoiceNo,setInvoiceNo]=useState('');
  const [paidFrom,setPaidFrom]=useState('cash');
  const fileRef=useRef<HTMLInputElement>(null);
  const [form,setForm]=useState({description:'',reason:'',category:CATEGORIES[0],supplier:'',amount:''});

  const load=useCallback(()=>{
    setLoading(true);
    void listExpenses()
      .then(r=>{setRows(r as Row[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  const visible=rows.filter(r=>!filter||r.status===filter||(filter==='confirmed'&&r.status==='paid'));

  async function create(e:React.FormEvent){
    e.preventDefault();
    try{
      await createExpenseRequest({...form,amount:Number(form.amount)});
      setForm({description:'',reason:'',category:CATEGORIES[0],supplier:'',amount:''});
      setCreating(false);setNotice('Solicitud de gasto registrada.');load();
    }catch(err){setError((err as Error).message);}
  }
  async function decide(id:string,decision:'approved'|'rejected'){
    try{await approveExpense(id,decision);setNotice(decision==='approved'?'Gasto aprobado.':'Gasto rechazado.');load();}
    catch(err){setError((err as Error).message);}
  }
  function startConfirm(row:Row){
    setConfirmTarget(row);setInvoiceNo('');setPaidFrom('cash');
  }
  async function uploadAndConfirm(file:File){
    if(!confirmTarget)return;
    try{
      if(!invoiceNo.trim())throw new Error('El número de factura es obligatorio.');
      const path=await uploadExpenseEvidence(file,confirmTarget.id);
      await confirmExpense({expense_id:confirmTarget.id,invoice_path:path,invoice_number:invoiceNo.trim(),paid_from:paidFrom});
      setNotice('Gasto comprobado y contabilizado.');setConfirmTarget(null);load();
    }catch(err){setError((err as Error).message);}
  }
  async function viewInvoice(path:string){
    try{const url=await getExpenseEvidenceUrl(path);window.open(url,'_blank','noopener,noreferrer');}
    catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div>
        <h1>Gastos</h1>
        <p>Ninguna salida se contabiliza sin aprobación separada y factura adjunta.</p>
      </div>
      {auth.has('expenses.create')&&<Button icon={<Plus size={15}/>} onClick={()=>setCreating(true)}>Solicitar gasto</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&rows.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<>
      <Tabs tabs={TABS} value={filter} onChange={setFilter}/>
      <section className="ja-list">
        {visible.length===0
          ?<EmptyState icon={<ReceiptText size={22}/>} title="Sin gastos" description="No hay solicitudes con este filtro."/>
          :visible.map(r=>{
            const st=STATE[r.status]??{label:r.status,tone:'neutral' as const};
            return <article key={r.id} className="ja-list-row">
              <div>
                <strong>{r.description}</strong>
                <span className="ja-cell-sub">{formatDate(r.created_at)} · {r.category}{r.supplier?` · ${r.supplier}`:''} · {r.reason}</span>
              </div>
              <div className="ja-td-num">{M(r.amount)}</div>
              <Badge tone={st.tone}>{st.label}</Badge>
              <div className="ja-row-actions">
                {r.status==='requested'&&auth.has('expenses.approve')&&<>
                  <Button size="sm" onClick={()=>void decide(r.id,'approved')}>Aprobar</Button>
                  <Button size="sm" variant="ghost" onClick={()=>void decide(r.id,'rejected')}>Rechazar</Button>
                </>}
                {r.status==='approved'&&auth.has('expenses.confirm')&&<Button size="sm" variant="secondary" icon={<FileCheck2 size={13}/>} onClick={()=>startConfirm(r)}>Comprobar</Button>}
                {r.invoice_path&&<Button size="sm" variant="ghost" onClick={()=>void viewInvoice(r.invoice_path)}>Ver factura</Button>}
              </div>
            </article>;
          })}
      </section>
    </>}

    <Dialog open={creating} onClose={()=>setCreating(false)} title="Solicitar gasto"
      description="La solicitud entra a aprobación; la contabilización es un paso posterior con factura.">
      <form className="ja-pos-fields" onSubmit={create}>
        <label className="ja-field"><span className="ja-field-label">Descripción</span><input className="ja-control" required minLength={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <label className="ja-field"><span className="ja-field-label">Motivo</span><input className="ja-control" required minLength={3} value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Categoría</span><select className="ja-control" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Proveedor</span><input className="ja-control" value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Monto (L)</span><input className="ja-control" required type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
        </div>
        <Button type="submit" icon={<Plus size={15}/>}>Registrar solicitud</Button>
      </form>
    </Dialog>

    <Dialog open={Boolean(confirmTarget)} onClose={()=>setConfirmTarget(null)} title="Comprobar y contabilizar"
      description={confirmTarget?`${confirmTarget.description} · ${M(confirmTarget.amount)}`:''}>
      <div className="ja-pos-fields">
        <label className="ja-field"><span className="ja-field-label">Número de factura</span><input className="ja-control" value={invoiceNo} onChange={e=>setInvoiceNo(e.target.value)} placeholder="Obligatorio"/></label>
        <label className="ja-field"><span className="ja-field-label">Pagado desde</span>
          <select className="ja-control" value={paidFrom} onChange={e=>setPaidFrom(e.target.value)}>
            <option value="cash">Efectivo</option><option value="bank">Banco</option><option value="transfer">Transferencia</option>
          </select></label>
        <Button icon={<FileCheck2 size={15}/>} disabled={!invoiceNo.trim()} onClick={()=>fileRef.current?.click()}>Adjuntar factura y contabilizar</Button>
        <p className="ja-hint">Se exige una imagen o PDF de la factura. El gasto no afecta el balance hasta este paso.</p>
      </div>
    </Dialog>

    <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
      onChange={e=>{const f=e.target.files?.[0];if(f)void uploadAndConfirm(f);e.currentTarget.value='';}}/>
  </main>;
}
