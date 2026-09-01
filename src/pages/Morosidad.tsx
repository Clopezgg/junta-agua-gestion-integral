import {useCallback,useEffect,useMemo,useState} from 'react';
import {BadgeCheck,Coins,HandCoins,Percent,Plus,RefreshCw,X} from 'lucide-react';
import {createPaymentArrangement,getArrangementDetail,listPaymentArrangements,markArrangementInstallmentPaid} from '../features/arrears/service';
import {listCutCandidates} from '../features/metering/service';
import {useAuth} from '../contexts/AuthContext';

type Row=Record<string,any>;
const STATUS:Record<string,string>={activo:'Activo',cumplido:'Cumplido',incumplido:'Incumplido',cancelado:'Cancelado'};
const FREQ:Record<string,string>={semanal:'Semanal',quincenal:'Quincenal',mensual:'Mensual'};
const money=(v:unknown)=>`L ${Number(v??0).toLocaleString('es-HN',{minimumFractionDigits:2})}`;
const today=()=>new Date().toISOString().slice(0,10);

export function Morosidad(){
 const auth=useAuth();
 const manage=auth.has('obligations.manage');
 const[rows,setRows]=useState<Row[]>([]);
 const[cands,setCands]=useState<Row[]>([]);
 const[filter,setFilter]=useState('');
 const[error,setError]=useState('');
 const[message,setMessage]=useState('');
 const[creating,setCreating]=useState(false);
 const[detail,setDetail]=useState<Row|null>(null);
 const[payAmount,setPayAmount]=useState<Record<string,string>>({});
 const[candId,setCandId]=useState('');
 const[draft,setDraft]=useState({installment_amount:'',frequency:'mensual',first_due_date:'',notes:''});

 const load=useCallback(async()=>{
  try{
   const[a,c]=await Promise.all([listPaymentArrangements(),listCutCandidates(30)]);
   setRows(a as Row[]);setCands(c as Row[]);setError('');
  }catch(e){setError((e as Error).message)}
  },[]);
 useEffect(()=>{void load()},[load]);

 const selected=cands.find(c=>c.subscriber_id===candId);
 const counts=useMemo(()=>({
  activo:rows.filter(r=>r.status==='activo').length,
  cumplido:rows.filter(r=>r.status==='cumplido').length,
  incumplido:rows.filter(r=>r.status==='incumplido').length
 }),[rows]);
 const totalRecovering=rows.filter(r=>r.status==='activo').reduce((s,r)=>s+Number(r.total_debt??0),0);
 const visible=rows.filter(r=>!filter||r.status===filter);

 async function save(e:React.FormEvent){
  e.preventDefault();
  try{
   await createPaymentArrangement({
    p_subscriber_id:candId,p_total_debt:Number(selected?.overdue_amount??0),
    p_installment_amount:Number(draft.installment_amount),p_frequency:draft.frequency,
    p_first_due_date:draft.first_due_date,p_obligation_ids:[],p_notes:draft.notes||null
   });
   setCreating(false);setCandId('');setDraft({installment_amount:'',frequency:'mensual',first_due_date:'',notes:''});
   setMessage('Convenio creado y auditado.');await load();
  }catch(e){setError((e as Error).message)}
 }
 async function openDetail(id:string){
  try{const d=await getArrangementDetail(id);setDetail(d);setError('');}catch(e){setError((e as Error).message)}
 }
 async function refreshDetail(){
  if(!detail)return;const d=await getArrangementDetail(detail.arrangement.id);setDetail(d);setPayAmount({});
 }
 async function pay(inst:any){
  const amt=payAmount[inst.id]??'';
  if(!amt||!detail)return;
  try{await markArrangementInstallmentPaid(detail.arrangement.id,Number(inst.installment_no),Number(amt));setMessage(`Cuota #${inst.installment_no} registrada en ${detail.arrangement.code}.`);await refreshDetail();await load();}catch(e){setError((e as Error).message)}
 }

 return <main className="content">
  <div className="titlebar"><div><h1>Morosidad y convenios</h1><p>Planes de pago para regularizar la cartera; cuotas y avance del convenio.</p></div><div style={{display:'flex',gap:'0.5rem'}}>{manage&&<button onClick={()=>setCreating(true)}><Plus size={17}/>Nuevo convenio</button>}<button className="outline" onClick={()=>void load()}><RefreshCw size={17}/>Actualizar</button></div></div>
  {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}

  <div className="cards operational-cards">
   <article><HandCoins size={20}/><small>Convenios activos</small><h3>{counts.activo}</h3><span>En curso de pago</span></article>
   <article><Coins size={20}/><small>En recuperación</small><h3>{money(totalRecovering)}</h3><span>Deuda sujeta a plan</span></article>
   <article><BadgeCheck size={20}/><small>Cumplidos</small><h3>{counts.cumplido}</h3><span>Plan saldado</span></article>
   <article><Percent size={20}/><small>Incumplidos</small><h3>{counts.incumplido}</h3><span>Requieren renegociación</span></article>
  </div>

  <div className="module-tabs">
   <button className={!filter?'active outline':'outline'} onClick={()=>setFilter('')}>Todos</button>
   {Object.keys(STATUS).map(s=><button key={s} className={filter===s?'active outline':'outline'} onClick={()=>setFilter(s)}>{STATUS[s]}</button>)}
  </div>

  <section className="panel"><h2>Convenios de pago</h2>
   {visible.length===0?<div className="empty">Sin convenios con este filtro.</div>:<div className="work-orders">
    {visible.map(a=>{return <div className="work-order" key={a.id}>
     <div><strong>{a.code} — {a.subscriber_name??('Abonado '+a.subscriber_id)}</strong><small>{FREQ[a.frequency]??a.frequency} · {a.num_installments} cuotas de {money(a.installment_amount)} · vence {a.first_due_date}</small>
      <span>Deuda total {money(a.total_debt)}</span></div>
     <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}><span className={`status-badge ${a.status==='cumplido'?'approved':a.status==='incumplido'?'critical':'draft'}`}>{STATUS[a.status]??a.status}</span><button className="compact" onClick={()=>void openDetail(a.id)}>Cuotas</button></div>
    </div>})}
   </div>}
  </section>

  {creating&&<div className="modal" role="dialog" aria-modal="true"><form className="modal-card" onSubmit={save}>
   <div className="titlebar"><div><h2>Nuevo convenio de pago</h2><p>Regulariza la deuda de un abonado con un plan de cuotas.</p></div><button type="button" className="outline" onClick={()=>setCreating(false)}><X size={18}/>Cerrar</button></div>
   <div className="form-grid">
    <label className="span-2">Abonado con mora<select value={candId} onChange={e=>setCandId(e.target.value)} required>
     <option value="">Seleccione un abonado en mora…</option>
     {cands.map(c=><option key={c.subscriber_id} value={c.subscriber_id}>{c.subscriber_code} — {c.subscriber_name} (L {Number(c.overdue_amount).toFixed(2)})</option>)}
    </select></label>
    <label>Deuda a regularizar<input value={selected?`L ${Number(selected.overdue_amount).toLocaleString('es-HN',{minimumFractionDigits:2})}`:'—'} readOnly/></label>
    <label>Cuota por período (L)<input type="number" min="1" step="0.01" required value={draft.installment_amount} onChange={e=>setDraft({...draft,installment_amount:e.target.value})}/></label>
    <label>Frecuencia<select value={draft.frequency} onChange={e=>setDraft({...draft,frequency:e.target.value})}>{Object.keys(FREQ).map(f=><option key={f} value={f}>{FREQ[f]}</option>)}</select></label>
    <label>Primer vencimiento<input type="date" required value={draft.first_due_date} onChange={e=>setDraft({...draft,first_due_date:e.target.value})}/></label>
    <label className="span-2">Notas<textarea rows={2} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label>
   </div>
   <button disabled={!candId}>Crear convenio</button>
  </form></div>}

  {detail&&<div className="modal" role="dialog" aria-modal="true"><div className="modal-card">
   <div className="titlebar"><div><h2>{detail.arrangement.code}</h2><p>Deuda total {money(detail.arrangement.total_debt)} · {detail.arrangement.num_installments} cuotas de {money(detail.arrangement.installment_amount)} · {FREQ[detail.arrangement.frequency]??detail.arrangement.frequency}</p></div><button className="outline" onClick={()=>setDetail(null)}><X size={18}/>Cerrar</button></div>
   <p>Estado: <span className={`status-badge ${detail.arrangement.status==='cumplido'?'approved':detail.arrangement.status==='incumplido'?'critical':'draft'}`}>{STATUS[detail.arrangement.status]??detail.arrangement.status}</span> · primer vencimiento {detail.arrangement.first_due_date}{detail.arrangement.notes?` · ${detail.arrangement.notes}`:''}</p>
   <div className="table-scroll"><table>
    <thead><tr><th>#</th><th>Vence</th><th>Monto</th><th>Pagado</th><th>Saldo</th><th>Estado</th><th>Acción</th></tr></thead>
    <tbody>{(detail.installments??[]).map((inst:any)=>{const bal=Number(inst.amount)-(Number(inst.paid_amount??0));const isPast=inst.due_date<today()&&inst.status==='pendiente';return <tr key={inst.id}>
     <td>{inst.installment_no}</td><td>{inst.due_date}{isPast?' ⚠':''}</td><td>{money(inst.amount)}</td><td>{money(inst.paid_amount)}</td><td>{money(bal)}</td>
     <td><span className={`status-badge ${inst.status==='pagada'?'approved':inst.status==='atrasada'||isPast?'critical':'draft'}`}>{inst.status==='pagada'?'Pagada':inst.status==='atrasada'||isPast?'Atrasada':inst.status}</span></td>
     <td>{inst.status==='pagada'?<span className="ok">✓</span>:manage?<div className="inline-form"><input type="number" min="1" step="0.01" placeholder="Monto" value={payAmount[inst.id]??''} onChange={e=>setPayAmount({...payAmount,[inst.id]:e.target.value})}/><button className="compact" disabled={!payAmount[inst.id]} onClick={()=>void pay(inst)}>Registrar</button></div>:'—'}</td>
    </tr>})}</tbody>
   </table></div>
  </div></div>}
 </main>;
}
