import {useCallback,useEffect,useMemo,useState} from 'react';
import {Landmark,Link2,RefreshCw,Upload} from 'lucide-react';
import {
  discardBankTransaction,getBankAccountBalance,importBankStatement,linkBankTransaction,
  listBankAccounts,listBankTransactions,listExpenses,listPayments,unlinkBankTransaction,
} from '../features/treasury/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton,Tabs} from '../design-system/primitives';
import {cn,formatDate,formatMoney} from '../design-system/utils';

type Account={id:string;name:string;account_mask:string|null;currency:string;opening_balance:number;active:boolean};
type Balance={opening_balance:number;debits:number;credits:number;linked:number;pending:number};
type Txn={id:string;txn_date:string;txn_type:string;amount:number;description:string|null;reference:string|null;recon_status:string};
type Row=Record<string,any>;

const M=(v:unknown)=>formatMoney(typeof v==='number'||typeof v==='string'?v:0);
const STATUS_TABS=[
  {value:'pendiente',label:'Pendientes'},
  {value:'conciliado',label:'Conciliados'},
  {value:'descartado',label:'Descartados'},
] as const;

export function Bancos(){
  const auth=useAuth();
  const manage=auth.has('bank.manage');
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [balances,setBalances]=useState<Record<string,Balance>>({});
  const [txns,setTxns]=useState<Txn[]>([]);
  const [filter,setFilter]=useState<'pendiente'|'conciliado'|'descartado'>('pendiente');
  const [accountId,setAccountId]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [importOpen,setImportOpen]=useState(false);
  const [stmt,setStmt]=useState({bank_account_id:'',period_start:'',period_end:'',opening:'0',closing:'0',lines:''});
  const [linking,setLinking]=useState<Txn|null>(null);
  const [linkKind,setLinkKind]=useState<'payment'|'expense'>('payment');
  const [candidates,setCandidates]=useState<Row[]>([]);

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([listBankAccounts(),listBankTransactions()])
      .then(async([a,b])=>{
        setAccounts(a as Account[]);setTxns(b as Txn[]);setError('');
        const bal:Record<string,Balance>={};
        for(const acc of a as Account[]){try{const r=await getBankAccountBalance(acc.id);if(r)bal[acc.id]=r as Balance;}catch{/* saldo opcional */}}
        setBalances(bal);
      })
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  const activeAccount=accountId||accounts[0]?.id||'';
  const bal=activeAccount?balances[activeAccount]:undefined;
  const bankSide=useMemo(()=>txns.filter(t=>t.recon_status===filter),[txns,filter]);

  async function refreshTxns(){
    try{setTxns(await listBankTransactions() as Txn[]);}catch(e){setError((e as Error).message);}
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
      parsed.push({txn_date:`${yy??'2026'}-${mm}-${dd}`,txn_type:ty,amount:Number(am),reference:ref||null,description:desc||null});
      return true;
    });
    if(!ok||parsed.length===0){setError('Formato inválido: fecha(dd-mm-aaaa);tipo(debito/credito);monto;referencia;descripción');return;}
    try{
      await importBankStatement({p_bank_account_id:stmt.bank_account_id,p_period_start:stmt.period_start||'2026-01-01',p_period_end:stmt.period_end||'2026-12-31',p_opening:Number(stmt.opening)||0,p_closing:Number(stmt.closing)||0,p_transactions:parsed});
      setImportOpen(false);setStmt({bank_account_id:'',period_start:'',period_end:'',opening:'0',closing:'0',lines:''});
      setNotice('Estado de cuenta importado y auditado.');load();
    }catch(e){setError((e as Error).message);}
  }
  async function openLink(txn:Txn){
    setLinking(txn);setLinkKind('payment');
    try{setCandidates(await listPayments());}catch(e){setError((e as Error).message);}
  }
  async function chooseKind(kind:'payment'|'expense'){
    setLinkKind(kind);
    try{setCandidates(kind==='payment'?await listPayments():await listExpenses());}catch(e){setError((e as Error).message);}
  }
  async function confirmLink(sourceId:string){
    if(!linking)return;
    try{
      await linkBankTransaction(linking.id,linkKind,sourceId);
      setNotice('Movimiento conciliado con su origen.');setLinking(null);await refreshTxns();
    }catch(e){setError((e as Error).message);}
  }
  async function doDiscard(id:string){
    try{await discardBankTransaction(id);setNotice('Partida descartada.');await refreshTxns();}catch(e){setError((e as Error).message);}
  }
  async function doUnlink(id:string){
    try{await unlinkBankTransaction(id);setNotice('Partida desvinculada y devuelta a pendiente.');await refreshTxns();}catch(e){setError((e as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div>
        <h1>Bancos y conciliación</h1>
        <p>Contraste del extracto bancario contra los cobros y gastos del sistema.</p>
      </div>
      {manage&&<Button variant="secondary" icon={<Upload size={15}/>} onClick={()=>{setStmt(s=>({...s,bank_account_id:activeAccount}));setImportOpen(true);}}>Importar estado</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&accounts.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<>
      <div className="ja-home-metrics">
        {accounts.length===0
          ?<EmptyState icon={<Landmark size={22}/>} title="Sin cuentas bancarias" description="Registre una cuenta para conciliar movimientos."/>
          :accounts.map(a=>{
            const b=balances[a.id];
            const current=b?Number(b.opening_balance)+Number(b.credits)-Number(b.debits):Number(a.opening_balance);
            return <button key={a.id} type="button" className={cn('ja-metric',activeAccount===a.id&&'ja-metric-info')} style={{textAlign:'left',cursor:'pointer'}} onClick={()=>setAccountId(a.id)}>
              <small>{a.name} · {a.account_mask||a.currency}</small>
              <strong>{M(current)}</strong>
              <span>{b?`${M(b.pending)} pendiente · ${M(b.linked)} conciliado`:'sin movimientos'}</span>
            </button>;
          })}
      </div>

      {bal&&<section className="ja-table-scroll">
        <table className="ja-table">
          <thead><tr><th>Apertura</th><th className="ja-td-num">Créditos</th><th className="ja-td-num">Débitos</th><th className="ja-td-num">Conciliado</th><th className="ja-td-num">Pendiente</th></tr></thead>
          <tbody><tr>
            <td>{M(bal.opening_balance)}</td>
            <td className="ja-td-num">{M(bal.credits)}</td>
            <td className="ja-td-num">{M(bal.debits)}</td>
            <td className="ja-td-num">{M(bal.linked)}</td>
            <td className="ja-td-num">{M(bal.pending)}</td>
          </tr></tbody>
        </table>
      </section>}

      <Tabs tabs={STATUS_TABS} value={filter} onChange={v=>setFilter(v as typeof filter)}/>

      <section className="ja-list">
        <h3 className="ja-list-heading">Extracto bancario — {STATUS_TABS.find(s=>s.value===filter)?.label.toLowerCase()}</h3>
        {bankSide.length===0
          ?<EmptyState title="Sin movimientos" description={`No hay partidas ${filter==='pendiente'?'pendientes de conciliar':filter+'s'}.`}/>
          :bankSide.map(t=><article key={t.id} className="ja-list-row">
            <div>
              <strong>{t.description||t.reference||'Movimiento'}</strong>
              <span className="ja-cell-sub">{formatDate(t.txn_date)}{t.reference?` · ${t.reference}`:''}</span>
            </div>
            <div className="ja-td-num" style={{color:t.txn_type==='debito'?'var(--ja-danger)':'var(--ja-success)'}}>{t.txn_type==='debito'?'− ':'+ '}{M(t.amount)}</div>
            {t.recon_status!=='pendiente'&&<Badge tone={t.recon_status==='conciliado'?'success':'neutral'}>{t.recon_status==='conciliado'?'Conciliado':'Descartado'}</Badge>}
            {manage&&<div className="ja-row-actions">
              {t.recon_status==='pendiente'&&<>
                <Button size="sm" variant="secondary" icon={<Link2 size={13}/>} onClick={()=>void openLink(t)}>Conciliar</Button>
                <Button size="sm" variant="ghost" onClick={()=>void doDiscard(t.id)}>Descartar</Button>
              </>}
              {t.recon_status==='conciliado'&&<Button size="sm" variant="ghost" onClick={()=>void doUnlink(t.id)}>Desvincular</Button>}
            </div>}
          </article>)}
      </section>
    </>}

    <Dialog open={importOpen} onClose={()=>setImportOpen(false)} title="Importar estado de cuenta"
      description="Una línea por movimiento: fecha(dd-mm-aaaa);tipo(debito/credito);monto;referencia;descripción">
      <form className="ja-pos-fields" onSubmit={saveStatement}>
        <label className="ja-field"><span className="ja-field-label">Cuenta bancaria</span>
          <select className="ja-control" required value={stmt.bank_account_id} onChange={e=>setStmt({...stmt,bank_account_id:e.target.value})}>
            <option value="">Seleccione</option>
            {accounts.map(a=><option key={a.id} value={a.id}>{a.name} ({a.account_mask||a.currency})</option>)}
          </select></label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Periodo desde</span><input className="ja-control" type="date" value={stmt.period_start} onChange={e=>setStmt({...stmt,period_start:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Periodo hasta</span><input className="ja-control" type="date" value={stmt.period_end} onChange={e=>setStmt({...stmt,period_end:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Saldo inicial</span><input className="ja-control" type="number" min="0" step="0.01" value={stmt.opening} onChange={e=>setStmt({...stmt,opening:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Saldo final</span><input className="ja-control" type="number" min="0" step="0.01" value={stmt.closing} onChange={e=>setStmt({...stmt,closing:e.target.value})}/></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Movimientos</span>
          <textarea className="ja-control" required rows={7} value={stmt.lines} onChange={e=>setStmt({...stmt,lines:e.target.value})}
            placeholder={'01-09-2026;credito;500.00;C-001;Pago recibido\n02-09-2026;debito;120.50;B-330;Compra de cloro'}/></label>
        <Button type="submit" icon={<Upload size={15}/>}>Importar y auditar</Button>
      </form>
    </Dialog>

    <Dialog open={Boolean(linking)} onClose={()=>setLinking(null)} title="Conciliar movimiento"
      description={linking?`${M(linking.amount)} · ${linking.description||linking.reference||'Movimiento'} · ${formatDate(linking.txn_date)}`:''}>
      <div className="ja-recon-grid">
        <div className="ja-recon-col">
          <h3>Banco</h3>
          {linking&&<article className="ja-list-row"><div><strong>{linking.description||linking.reference||'Movimiento'}</strong><span className="ja-cell-sub">{formatDate(linking.txn_date)}</span></div><div className="ja-td-num">{M(linking.amount)}</div></article>}
        </div>
        <div className="ja-recon-col">
          <h3>Sistema</h3>
          <Tabs tabs={[{value:'payment',label:'Cobros'},{value:'expense',label:'Gastos'}]} value={linkKind} onChange={v=>void chooseKind(v as 'payment'|'expense')}/>
          <div style={{maxHeight:'46vh',overflow:'auto',display:'flex',flexDirection:'column',gap:'.4rem'}}>
            {candidates.length===0
              ?<EmptyState title="Sin candidatos" description={`No hay ${linkKind==='payment'?'cobros':'gastos'} sin conciliar.`}/>
              :candidates.map(c=><article key={c.id} className="ja-list-row">
                <div><strong>{linkKind==='payment'?(c.receipt_number||'Pago'):(c.description||'Gasto')}</strong><span className="ja-cell-sub">{formatDate((c.created_at||c.paid_at||c.date) as string)}</span></div>
                <div className="ja-td-num">{M(c.total??c.amount??c.received_amount)}</div>
                <Button size="sm" onClick={()=>void confirmLink(c.id)}>Vincular</Button>
              </article>)}
          </div>
        </div>
      </div>
    </Dialog>
  </main>;
}
