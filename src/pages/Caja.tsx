import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {Banknote,Calculator,History,Lock,Power,Receipt,Wallet} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {
  closeCashSession,getCashSessionReport,listCashSessions,openCashSession,type CashSessionReport,
} from '../features/finance/service';
import {Badge,Button,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {cn,formatDateTime,formatMoney} from '../design-system/utils';

const TABS=['estado','cobros','arqueo','historial'] as const;
type Tab=typeof TABS[number];
const TAB_LABEL:Record<Tab,string>={estado:'Estado',cobros:'Cobros de la sesión',arqueo:'Arqueo',historial:'Historial'};
const METHOD:Record<string,string>={cash:'Efectivo',transfer:'Transferencia',deposit:'Depósito',check:'Cheque',mixed:'Mixto'};
const M=(v:unknown)=>formatMoney(typeof v==='number'||typeof v==='string'?v:0);

export function Caja(){
  const auth=useAuth();
  const canManage=auth.has('cash.manage');
  const [report,setReport]=useState<CashSessionReport|null>(null);
  const [history,setHistory]=useState<Array<Record<string,unknown>>>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [tab,setTab]=useState<Tab>('estado');
  const [opening,setOpening]=useState('');
  const [location,setLocation]=useState('');
  const [counted,setCounted]=useState('');
  const [busy,setBusy]=useState(false);

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([getCashSessionReport().catch(()=>null),listCashSessions().catch(()=>[])])
      .then(([r,h])=>{setReport(r);setHistory(h);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  const session=report?.session as {id?:string;status?:string;opening_amount?:number;location?:string;opened_at?:string}|undefined;
  const isOpen=session?.status==='open';
  const diff=useMemo(()=>counted===''?null:Number(counted)-(report?.expected_cash??0),[counted,report]);

  async function open(){
    setBusy(true);setError('');
    try{await openCashSession({opening_amount:Number(opening||0),location:location||undefined});setOpening('');setLocation('');setNotice('Caja abierta.');load();}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function close(){
    if(!session?.id||counted==='')return;
    setBusy(true);setError('');
    try{await closeCashSession({session_id:session.id,counted_amount:Number(counted)});setCounted('');setNotice('Caja cerrada y conciliada.');setTab('historial');load();}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Caja</h1><p>Apertura, cobros del día, arqueo y cierre. Una caja cerrada es inmutable.</p></div>
      {report&&<Badge tone={isOpen?'success':'neutral'}>{isOpen?'Caja abierta':'Sin caja abierta'}</Badge>}
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}

    <nav className="ja-tabs" role="tablist">
      {TABS.map(t=><button key={t} role="tab" aria-selected={tab===t} className={cn('ja-tab',tab===t&&'ja-tab-active')} onClick={()=>setTab(t)}>{TAB_LABEL[t]}</button>)}
    </nav>

    <section className="ja-360-body">
      {loading&&!report&&<Skeleton className="ja-360-skel"/>}

      {!loading&&tab==='estado'&&<div className="ja-list">
        {isOpen
          ?<>
            <div className="ja-360-grid">
              <Field label="Punto de cobro" value={session?.location||'—'}/>
              <Field label="Fondo de apertura" value={formatMoney(session?.opening_amount)}/>
              <Field label="Abierta desde" value={session?.opened_at?formatDateTime(session.opened_at):'—'}/>
              <Field label="Cobros" value={String(report?.payment_count??0)}/>
              <Field label="Efectivo esperado" value={formatMoney(report?.expected_cash)}/>
            </div>
            {canManage&&<div className="ja-caja-close">
              <label className="ja-field"><span className="ja-field-label">Efectivo contado para el arqueo</span>
                <input className="ja-control" type="number" min="0" step="0.01" value={counted} onChange={e=>setCounted(e.target.value)} placeholder="0.00"/></label>
              {diff!==null&&<p className={cn('ja-caja-diff',Math.abs(diff)<0.01?'ok':diff<0?'short':'over')}>
                Diferencia: {formatMoney(diff)} {Math.abs(diff)<0.01?'(cuadra)':diff<0?'(faltante)':'(sobrante)'}
              </p>}
              <Button variant="danger" disabled={busy||counted===''} onClick={()=>void close()}><Lock size={15}/>Cerrar y conciliar</Button>
            </div>}
          </>
          :<div className="ja-caja-open">
            <EmptyState icon={<Banknote size={26}/>} title="No hay caja abierta" description="Abra una caja antes de recibir cobros en efectivo."/>
            {canManage&&<div className="ja-caja-open-form">
              <label className="ja-field"><span className="ja-field-label">Fondo inicial</span>
                <input className="ja-control" type="number" min="0" step="0.01" value={opening} onChange={e=>setOpening(e.target.value)} placeholder="0.00"/></label>
              <label className="ja-field"><span className="ja-field-label">Punto de cobro</span>
                <input className="ja-control" value={location} onChange={e=>setLocation(e.target.value)} placeholder="Secretaría"/></label>
              <Button disabled={busy} onClick={()=>void open()}><Power size={15}/>Abrir caja</Button>
            </div>}
          </div>}
      </div>}

      {!loading&&tab==='cobros'&&<div className="ja-list">
        {!report?<EmptyState title="Sin sesión activa" description="Los cobros aparecen aquí mientras la caja está abierta."/>
          :report.payments.length===0?<EmptyState icon={<Receipt size={24}/>} title="Sin cobros aún" description="Los pagos contabilizados en esta caja aparecerán aquí."/>
          :report.payments.map(p=><article key={String(p.id)} className="ja-list-row">
            <div><strong className="ja-mono">{String(p.receipt_number)}</strong><span className="ja-cell-sub">{String(p.subscriber_name)} · {formatDateTime(p.created_at as string)}</span></div>
            <span className="ja-cell-sub">{METHOD[String(p.method)]??String(p.method)}</span>
            <div className="ja-td-num">{M(p.total)}</div>
            <Badge tone={p.status==='confirmed'?'success':'neutral'}>{String(p.status)}</Badge>
          </article>)}
      </div>}

      {!loading&&tab==='arqueo'&&<div className="ja-list">
        {!report?<EmptyState icon={<Calculator size={24}/>} title="Sin sesión activa"/>
          :<>
            <div className="ja-360-grid">
              <Field label="Fondo de apertura" value={formatMoney(session?.opening_amount)}/>
              <Field label="Efectivo cobrado" value={formatMoney(report.cash_collected)}/>
              <Field label="Devoluciones en efectivo" value={formatMoney(-report.refunds)}/>
              <Field label="Efectivo esperado en caja" value={formatMoney(report.expected_cash)}/>
            </div>
            <h3 className="ja-list-heading">Cobros por método</h3>
            {Object.entries(report.totals_by_method).length===0
              ?<EmptyState title="Sin cobros" description="Aún no hay movimientos en esta sesión."/>
              :Object.entries(report.totals_by_method).map(([m,amt])=><article key={m} className="ja-list-row">
                <div><strong>{METHOD[m]??m}</strong></div><div className="ja-td-num">{formatMoney(amt)}</div>
              </article>)}
          </>}
      </div>}

      {!loading&&tab==='historial'&&<div className="ja-table-scroll">
        <table className="ja-table">
          <thead><tr><th>Cajero</th><th>Punto</th><th>Abierta</th><th>Cerrada</th><th className="ja-td-num">Esperado</th><th className="ja-td-num">Contado</th><th className="ja-td-num">Diferencia</th><th>Estado</th></tr></thead>
          <tbody>
            {history.map(s=><tr key={String(s.id)}>
              <td>{String(s.cashier??'—')}</td>
              <td>{String(s.location??'—')}</td>
              <td className="ja-cell-sub">{s.opened_at?formatDateTime(s.opened_at as string):'—'}</td>
              <td className="ja-cell-sub">{s.closed_at?formatDateTime(s.closed_at as string):'—'}</td>
              <td className="ja-td-num">{s.expected_amount!=null?M(s.expected_amount):'—'}</td>
              <td className="ja-td-num">{s.counted_amount!=null?M(s.counted_amount):'—'}</td>
              <td className="ja-td-num">{s.difference!=null?<span className={cn(Number(s.difference)!==0&&'ja-amount-due')}>{M(s.difference)}</span>:'—'}</td>
              <td><Badge tone={s.status==='open'?'success':'neutral'}>{s.status==='open'?'Abierta':'Cerrada'}</Badge></td>
            </tr>)}
          </tbody>
        </table>
        {history.length===0&&<EmptyState icon={<History size={24}/>} title="Sin historial de caja"/>}
      </div>}
    </section>

    <p className="ja-hint"><Wallet size={12}/> El flujo de cobro (buscar abonado → cobrar → recibo) está en <Link className="ja-link" to="/pagos">Cobrar</Link>.</p>
  </main>;
}

function Field({label,value}:{label:string;value:string}){
  return <div className="ja-field-ro"><small>{label}</small><strong>{value}</strong></div>;
}
