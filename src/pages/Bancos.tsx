import {useEffect,useState} from 'react';
import {Landmark,RefreshCw} from 'lucide-react';
import {listBankAccounts,listBankTransactions,linkBankTransaction,importBankStatement} from '../features/treasury/service';
import {useAuth} from '../contexts/AuthContext';

type Account={id:string;name:string;account_mask:string|null;currency:string;opening_balance:number;active:boolean};
type Txn={id:string;txn_date:string;txn_type:string;amount:number;description:string|null;reference:string|null;recon_status:string};

export function Bancos(){
 const auth=useAuth();
 const [accounts,setAccounts]=useState<Account[]>([]);
 const [txns,setTxns]=useState<Txn[]>([]);
 const [error,setError]=useState('');
 const money=(v:unknown)=>`L ${Number(v??0).toLocaleString('es-HN',{minimumFractionDigits:2})}`;
 const load=()=>{void Promise.all([listBankAccounts(),listBankTransactions('pendiente')]).then(([a,t])=>{setAccounts((a as Account[])??[]);setTxns((t as Txn[])??[])}).catch(()=>setError('No se pudo cargar la información bancaria.'));};
 useEffect(load,[]);
 const link=async(id:string,kind:'payment'|'expense')=>{const src=prompt(`ID del ${kind==='payment'?'pago':'gasto'}`);if(!src)return;try{await linkBankTransaction(id,kind,src);load();}catch(err){setError((err as Error).message);}};
 const importStatement=async()=>{const acct=prompt('ID de la cuenta bancaria');if(!acct)return;
  const lineHtml=prompt('Movimientos: fecha(dd-mm-aaaa);tipo(debito/credito);monto;referencia — uno por línea');
  const txns=(lineHtml??'').split('\n').map(l=>{const [d,ty,am,ref]=l.split(';').map(s=>s.trim());if(!d||!ty||!am)return null;const [dd,mm,yy]=d.split('-');return {txn_date:`${yy}-${mm}-${dd}`,txn_type:ty,amount:Number(am),reference:ref||null,description:null};}).filter(Boolean);
  try{await importBankStatement({p_bank_account_id:acct,p_period_start:'2026-01-01',p_period_end:'2026-12-31',p_opening:0,p_closing:0,p_transactions:txns});load();}catch(err){setError((err as Error).message);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Tesorería</span><h1>Bancos y conciliación</h1><p>Conciliación de movimientos bancarios con cobros y gastos.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  <div className="cards">
   {accounts.length===0&&<div className="panel"><div className="empty empty-state"><Landmark size={22}/><p>Sin cuentas bancarias registradas.</p></div></div>}
   {accounts.map(a=><article key={a.id} className="panel"><strong>{a.name}</strong><span>{a.account_mask||'sin máscara'} · {a.currency}</span><small>Saldo inicial {money(a.opening_balance)}</small></article>)}
  </div>
  {auth.has('bank.manage')&&<button className="outline" style={{marginTop:'1rem'}} onClick={importStatement}><RefreshCw size={16}/> Importar estado de cuenta</button>}
  <section className="panel" style={{marginTop:'1rem'}}><div className="panel-heading"><div><h2>Movimientos pendientes de conciliar</h2></div></div>
   {txns.length===0&&<p>Sin movimientos pendientes.</p>}
   {txns.map(t=><div key={t.id} className="row-line"><span>{new Date(t.txn_date).toLocaleDateString('es-HN')}</span><strong>{t.description||t.reference||'Movimiento'}</strong><span className={t.txn_type==='debito'?'danger':'success'}>{t.txn_type==='debito'?'−':'+'} {money(t.amount)}</span>{auth.has('bank.manage')&&<div style={{display:'flex',gap:'0.4rem'}}><button className="outline" onClick={()=>link(t.id,'payment')}>Vincular pago</button><button className="outline" onClick={()=>link(t.id,'expense')}>Vincular gasto</button></div>}</div>)}
  </section>
 </main>;
}
