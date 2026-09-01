import {useCallback,useEffect,useMemo,useState} from 'react';
import {Landmark,Link2,Plus,RefreshCw,Scale,X} from 'lucide-react';
import {getBankAccountBalance,importBankStatement,linkBankTransaction,listBankAccounts,listBankTransactions,listExpenses,listPayments,discardBankTransaction,unlinkBankTransaction} from '../features/treasury/service';
import {useAuth} from '../contexts/AuthContext';

type Account={id:string;name:string;account_mask:string|null;currency:string;opening_balance:number;active:boolean};
type Balance={opening_balance:number;debits:number;credits:number;linked:number;pending:number};
type Txn={id:string;txn_date:string;txn_type:string;amount:number;description:string|null;reference:string|null;recon_status:string};
type Row=Record<string,any>;

const money=(v:unknown)=>`L ${Number(v??0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const STATUS:Record<string,string>={pendiente:'Pendiente',conciliado:'Conciliado',descartado:'Descartado'};

export function Bancos(){
 const auth=useAuth();
 const manage=auth.has('bank.manage');
 const[accounts,setAccounts]=useState<Account[]>([]);
 const[balances,setBalances]=useState<Record<string,Balance>>({});
 const[txns,setTxns]=useState<Txn[]>([]);
 const[filter,setFilter]=useState<'pendiente'|'conciliado'|'descartado'>('pendiente');
 const[accountId,setAccountId]=useState('');
 const[error,setError]=useState('');
 const[message,setMessage]=useState('');
 const[importing,setImporting]=useState(false);
 const[stmt,setStmt]=useState({bank_account_id:'',period_start:'',period_end:'',opening:'0',closing:'0',lines:''});
 const[linking,setLinking]=useState<Txn|null>(null);
 const[linkKind,setLinkKind]=useState<'payment'|'expense'>('payment');
 const[candidates,setCandidates]=useState<Row[]>([]);

 const load=useCallback(async()=>{
  try{
   const[a,b]=await Promise.all([listBankAccounts(),listBankTransactions()]);
   setAccounts(a as Account[]);setTxns(b as Txn[]);setError('');
   const bal:Record<string,Balance>={};
   for(const acc of a as Account[]){try{const r=await getBankAccountBalance(acc.id);if(r)bal[acc.id]=r as Balance;}catch{/* balance opcional */}}
   setBalances(bal);
  }catch(e){setError((e as Error).message)}
 },[]);
 useEffect(()=>{void load()},[load]);

 const visible=useMemo(()=>txns.filter(t=>t.recon_status===filter),[txns,filter]);

 async function refreshTxns(){
  try{const b=await listBankTransactions();setTxns(b as Txn[]);}catch(e){setError((e as Error).message)}
 }
 async function saveStatement(event:React.FormEvent){
  event.preventDefault();
  if(!stmt.bank_account_id){setError('Seleccione la cuenta bancaria.');return;}
  const parsed:Array<Record<string,unknown>>=[];
  const ok=stmt.lines.split('\n').every(line=>{
   const l=line.trim();if(!l)return true;
   const [d,ty,am,ref,desc]=l.split(';').map(s=>s.trim());
   if(!d||!ty||!am)return false;
   const [dd,mm,yy]=d.split('-');
   const date=`${yy??'2026'}-${mm}-${dd}`;
   parsed.push({txn_date:date,txn_type:ty,amount:Number(am),reference:ref||null,description:desc||null});
   return true;
  });
  if(!ok||parsed.length===0){setError('Formato inválido: cada línea debe ser fecha(dd-mm-aaaa);tipo(debito/credito);monto;referencia;descripción');return;}
  try{
   await importBankStatement({p_bank_account_id:stmt.bank_account_id,p_period_start:stmt.period_start||'2026-01-01',p_period_end:stmt.period_end||'2026-12-31',p_opening:Number(stmt.opening)||0,p_closing:Number(stmt.closing)||0,p_transactions:parsed});
   setImporting(false);setStmt({bank_account_id:'',period_start:'',period_end:'',opening:'0',closing:'0',lines:''});
   setMessage('Estado de cuenta importado y auditado.');await load();
  }catch(e){setError((e as Error).message)}
 }
 async function openLink(txn:Txn){
  setLinking(txn);setLinkKind('payment');
  try{setCandidates(await listPayments());}catch(e){setError((e as Error).message)}
 }
 async function chooseKind(kind:'payment'|'expense'){
  setLinkKind(kind);
  try{setCandidates(kind==='payment'?await listPayments():await listExpenses());}catch(e){setError((e as Error).message)}
 }
 async function confirmLink(sourceId:string){
  if(!linking)return;
  try{
   await linkBankTransaction(linking.id,linkKind,sourceId);
   setMessage('Movimiento conciliado con su origen.');setLinking(null);await refreshTxns();
  }catch(e){setError((e as Error).message)}
 }
 async function doDiscard(id:string){
  try{await discardBankTransaction(id);setMessage('Partida descartada.');await refreshTxns();}catch(e){setError((e as Error).message)}
 }
 async function doUnlink(id:string){
  try{await unlinkBankTransaction(id);setMessage('Partida desvinculada y devuelta a pendiente.');await refreshTxns();}catch(e){setError((e as Error).message)}
 }
 const activeAccount=accountId||accounts[0]?.id||'';
 const bal=activeAccount?balances[activeAccount]:undefined;

 return <main className="content">
  <div className="titlebar"><div><h1>Bancos y conciliación</h1><p>Conciliación de movimientos bancarios con cobros y gastos.</p></div><div style={{display:'flex',gap:'0.5rem'}}>{manage&&<button className="" onClick={()=>setImporting(true)}><Plus size={17}/>Importar estado</button>}<button className="outline" onClick={()=>void load()}><RefreshCw size={17}/>Actualizar</button></div></div>
  {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}

  <div className="cards" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))'}}>
   {accounts.length===0?<div className="panel empty">Sin cuentas bancarias registradas.</div>:accounts.map(a=>{
    const b=balances[a.id];
    return <article key={a.id} className="panel" onClick={()=>setAccountId(a.id)} style={{cursor:'pointer',outline:activeAccount===a.id?'2px solid var(--brand-500)':'none'}}><Landmark size={20}/><strong>{a.name}</strong><span>{a.account_mask||'sin máscara'} · {a.currency}</span><h3>{b?money(Number(b.opening_balance)+Number(b.credits)-Number(b.debits)):money(a.opening_balance)}</h3><small>{b?`L ${Number(b.pending).toLocaleString('es-HN')} pendiente · ${Number(b.linked).toLocaleString('es-HN')} conciliado`:' sin movimientos'}</small></article>;
   })}
  </div>
  {bal&&<div className="panel" style={{marginTop:'1rem'}}><div className="panel-heading"><div><h2>Saldo de la cuenta</h2></div></div><div className="cards" style={{gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))'}}>
   <article><small>Apertura</small><strong>{money(bal.opening_balance)}</strong></article>
   <article><small>Créditos</small><strong className="" style={{color:'var(--success-700)'}}>{money(bal.credits)}</strong></article>
   <article><small>Débitos</small><strong style={{color:'var(--danger-700)'}}>{money(bal.debits)}</strong></article>
   <article><small>Conciliado</small><strong>{money(bal.linked)}</strong></article>
   <article><small>Pendiente</small><strong>{money(bal.pending)}</strong></article>
  </div></div>}

  <section className="panel" style={{marginTop:'1rem'}}>
   <div className="panel-heading"><div><h2>Movimientos bancarios</h2></div><div style={{display:'flex',gap:'0.4rem'}}>
    <button className={`outline ${filter==='pendiente'?'active':''}`} onClick={()=>setFilter('pendiente')}>Pendientes</button>
    <button className={`outline ${filter==='conciliado'?'active':''}`} onClick={()=>setFilter('conciliado')}>Conciliados</button>
    <button className={`outline ${filter==='descartado'?'active':''}`} onClick={()=>setFilter('descartado')}>Descartados</button>
   </div></div>
   {visible.length===0?<div className="empty">Sin movimientos {STATUS[filter].toLowerCase()}.</div>:visible.map(t=><div key={t.id} className="row-line">
    <span>{new Date(t.txn_date).toLocaleDateString('es-HN')}</span>
    <strong>{t.description||t.reference||'Movimiento'}</strong>
    <span className={t.txn_type==='debito'?'danger':'success'}>{t.txn_type==='debito'?'−':'+'} {money(t.amount)}</span>
    {manage&&<div style={{display:'flex',gap:'0.4rem',alignItems:'center'}}>
     {t.recon_status==='pendiente'&&<><button className="outline" onClick={()=>openLink(t)}><Link2 size={14}/> Conciliar</button><button className="outline" onClick={()=>doDiscard(t.id)}>Descartar</button></>}
     {t.recon_status==='conciliado'&&<button className="outline" onClick={()=>doUnlink(t.id)}>Desvincular</button>}
    </div>}
   </div>)}
  </section>

  {importing&&<div className="modal" role="dialog" aria-modal="true"><form className="modal-card" onSubmit={saveStatement}>
   <div className="titlebar"><div><h2>Importar estado de cuenta</h2><p>Cada línea: fecha(dd-mm-aaaa);tipo(debito/credito);monto;referencia;descripción</p></div><button type="button" className="outline" onClick={()=>setImporting(false)}><X size={18}/>Cerrar</button></div>
   <div className="form-grid">
    <label className="span-2">Cuenta bancaria<select required value={stmt.bank_account_id} onChange={e=>setStmt({...stmt,bank_account_id:e.target.value})}><option value="">Seleccione</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} ({a.account_mask||a.currency})</option>)}</select></label>
    <label>Periodo desde<input type="date" value={stmt.period_start} onChange={e=>setStmt({...stmt,period_start:e.target.value})}/></label>
    <label>Periodo hasta<input type="date" value={stmt.period_end} onChange={e=>setStmt({...stmt,period_end:e.target.value})}/></label>
    <label>Saldo inicial<input type="number" min="0" step="0.01" value={stmt.opening} onChange={e=>setStmt({...stmt,opening:e.target.value})}/></label>
    <label>Saldo final<input type="number" min="0" step="0.01" value={stmt.closing} onChange={e=>setStmt({...stmt,closing:e.target.value})}/></label>
    <label className="span-2">Movimientos<textarea required rows={8} value={stmt.lines} onChange={e=>setStmt({...stmt,lines:e.target.value})} placeholder={"01-09-2026;credito;500.00;C-001;Pago recibido\n02-09-2026;debito;120.50;B-330;Compra de cloro"}/></label>
   </div>
   <button>Importar y auditar</button>
  </form></div>}

  {linking&&<div className="modal" role="dialog" aria-modal="true"><div className="modal-card">
   <div className="titlebar"><div><h2>Conciliar movimiento</h2><p>{money(linking.amount)} · {linking.description||linking.reference||'Movimiento'} · {new Date(linking.txn_date).toLocaleDateString('es-HN')}</p></div><button className="outline" onClick={()=>setLinking(null)}><X size={18}/>Cerrar</button></div>
   <div className="module-tabs">
    <button className={linkKind==='payment'?'active outline':'outline'} onClick={()=>chooseKind('payment')}>Vincular pago</button>
    <button className={linkKind==='expense'?'active outline':'outline'} onClick={()=>chooseKind('expense')}>Vincular gasto</button>
   </div>
   <div style={{maxHeight:'300px',overflow:'auto'}}>{candidates.length===0?<div className="empty">Sin candidatos {linkKind==='payment'?'de pago':'de gasto'}.</div>:candidates.map(c=><div key={c.id} className="row-line">
    <span>{linkKind==='payment'?(c.receipt_number||'Pago'):(c.description||'Gasto')}</span>
    <strong>{money(c.total??c.amount??c.received_amount)}</strong>
    <button className="compact" onClick={()=>confirmLink(c.id)}><Scale size={14}/> Conciliar</button>
   </div>)}</div>
  </div></div>}
 </main>;
}
