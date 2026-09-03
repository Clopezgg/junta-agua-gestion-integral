import {useEffect,useState} from 'react';
import {AlertTriangle,CheckCircle2,Search,WalletCards} from 'lucide-react';
import {authorizeDebtOverride,checkDebtOperation,createManualObligation,getSubscriberAccount,listTariffs,searchAccounts} from '../features/billing/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,EmptyState,ErrorState} from '../design-system/primitives';
import {formatMoney} from '../design-system/utils';

const M=(v:unknown)=>formatMoney(typeof v==='number'||typeof v==='string'?v:0);
const labels:Record<string,string>={pending:'Pendiente',partial:'Parcial',paid:'Pagada',overdue:'Vencida',cancelled:'Cancelada'};

export function Accounts(){
  const auth=useAuth();
  const [query,setQuery]=useState('');
  const [rows,setRows]=useState<any[]>([]);
  const [selected,setSelected]=useState<any>(null);
  const [tariffs,setTariffs]=useState<any[]>([]);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [operation,setOperation]=useState('solvency_certificate');
  const [operationResult,setOperationResult]=useState<any>(null);
  const [manual,setManual]=useState({connection_id:'',tariff_definition_id:'',due_date:'',description:''});
  const [overrideReason,setOverrideReason]=useState('');

  async function load(q=''){
    try{setRows(await searchAccounts(q));setTariffs(await listTariffs());setError('');}
    catch(e){setError(e instanceof Error?e.message:'No se pudieron consultar los estados de cuenta.');}
  }
  useEffect(()=>{void load();},[]);

  async function open(id:string){
    try{setSelected(await getSubscriberAccount(id));setOperationResult(null);}
    catch(e){setError(e instanceof Error?e.message:'No se pudo abrir el estado de cuenta.');}
  }
  async function refresh(){
    if(selected?.subscriber?.id)setSelected(await getSubscriberAccount(selected.subscriber.id));
    await load(query);
  }
  async function verify(){
    if(!selected?.subscriber?.id)return;
    try{setOperationResult(await checkDebtOperation(selected.subscriber.id,operation));}
    catch(e){setError(e instanceof Error?e.message:'No se pudo validar la operación.');}
  }
  async function addManual(){
    if(!selected?.subscriber?.id||!manual.tariff_definition_id||!manual.due_date){setError('Seleccione tarifa y fecha de vencimiento.');return;}
    try{
      await createManualObligation({subscriber_id:selected.subscriber.id,...manual});
      setNotice('Obligación registrada y reflejada en el estado de cuenta.');
      setManual({connection_id:'',tariff_definition_id:'',due_date:'',description:''});
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:'No se pudo crear la obligación.');}
  }
  async function override(){
    if(!selected?.subscriber?.id||overrideReason.trim().length<20){setError('La justificación debe tener al menos 20 caracteres.');return;}
    try{
      await authorizeDebtOverride({subscriber_id:selected.subscriber.id,operation,reason:overrideReason});
      setNotice('Excepción autorizada y registrada en auditoría.');setOverrideReason('');
    }catch(e){setError(e instanceof Error?e.message:'No se pudo autorizar la excepción.');}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Estados de cuenta y morosidad</h1><p>Obligaciones, vencimientos, saldos y bloqueos operativos calculados por el servidor.</p></div>
    </header>

    <div className="ja-toolbar">
      <span className="ja-search-field"><Search size={15}/><input placeholder="Código o nombre del abonado" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void load(query);}}/></span>
      <Button onClick={()=>void load(query)}>Buscar</Button>
    </div>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={()=>setError('')}/>}

    <section className="ja-table-scroll">
      <table className="ja-table">
        <thead><tr><th>Código</th><th>Abonado</th><th className="ja-td-num">Pendiente</th><th className="ja-td-num">Vencido</th><th>Estado</th></tr></thead>
        <tbody>
          {rows.length===0
            ?<tr><td colSpan={5} className="ja-table-empty">No hay resultados.</td></tr>
            :rows.map(r=><tr key={r.subscriber_id} className="ja-row-click" onClick={()=>void open(r.subscriber_id)}>
              <td>{r.subscriber_code}</td><td>{r.full_name}</td>
              <td className="ja-td-num">{M(r.total_pending)}</td><td className="ja-td-num">{M(r.overdue_amount)}</td>
              <td><Badge tone={r.debt_status==='moroso'?'danger':'success'}>{r.debt_status}</Badge></td>
            </tr>)}
        </tbody>
      </table>
    </section>

    {selected?<section className="ja-list">
      <div className="ja-list-heading" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>{selected.subscriber.code} · {selected.subscriber.full_name}</span>
        {selected.summary.solvent?<CheckCircle2 size={16} style={{color:'var(--ja-success)'}}/>:<AlertTriangle size={16} style={{color:'var(--ja-warning)'}}/>}
      </div>
      <div className="ja-home-metrics">
        <article className="ja-metric"><small>Total pendiente</small><strong>{M(selected.summary.total_pending)}</strong></article>
        <article className="ja-metric"><small>Total vencido</small><strong>{M(selected.summary.overdue_amount)}</strong></article>
        <article className="ja-metric"><small>Días de mora</small><strong>{selected.summary.days_overdue}</strong></article>
      </div>

      <div className="ja-table-scroll">
        <table className="ja-table">
          <thead><tr><th>Periodo</th><th>Concepto</th><th>Pegue</th><th>Vence</th><th className="ja-td-num">Original</th><th className="ja-td-num">Saldo</th><th>Estado</th></tr></thead>
          <tbody>
            {selected.obligations.map((o:any)=><tr key={o.id}>
              <td>{o.period_key}</td><td>{o.description}</td><td>{o.connection_code||'General'}</td><td>{o.due_date}</td>
              <td className="ja-td-num">{M(o.original_amount)}</td><td className="ja-td-num">{M(o.balance)}</td>
              <td><Badge tone={o.computed_state==='overdue'?'danger':'neutral'}>{labels[o.computed_state]??o.computed_state}</Badge></td>
            </tr>)}
          </tbody>
        </table>
      </div>

      {auth.has('obligations.manage')&&<form className="ja-pos-fields" onSubmit={e=>{e.preventDefault();void addManual();}}>
        <span className="ja-field-label">Agregar obligación</span>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Tarifa</span>
            <select className="ja-control" value={manual.tariff_definition_id} onChange={e=>setManual({...manual,tariff_definition_id:e.target.value})}>
              <option value="">Seleccione tarifa</option>
              {tariffs.filter(t=>t.status==='active').map(t=><option key={t.definition_id} value={t.definition_id}>{t.code} · {t.name} · {M(t.amount)}</option>)}
            </select>
          </label>
          <label className="ja-field"><span className="ja-field-label">Pegue</span>
            <select className="ja-control" value={manual.connection_id} onChange={e=>setManual({...manual,connection_id:e.target.value})}>
              <option value="">Obligación general</option>
              {selected.connections.map((c:any)=><option key={c.id} value={c.id}>{c.code} · {c.address}</option>)}
            </select>
          </label>
          <label className="ja-field"><span className="ja-field-label">Vence</span><input className="ja-control" type="date" value={manual.due_date} onChange={e=>setManual({...manual,due_date:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Descripción (opcional)</span><input className="ja-control" value={manual.description} onChange={e=>setManual({...manual,description:e.target.value})}/></label>
        </div>
        <Button type="submit">Registrar</Button>
      </form>}

      <form className="ja-pos-fields" onSubmit={e=>{e.preventDefault();void verify();}}>
        <span className="ja-field-label">Validar operación</span>
        <div className="ja-toolbar">
          <select className="ja-control" style={{maxWidth:'16rem'}} value={operation} onChange={e=>setOperation(e.target.value)}>
            <option value="solvency_certificate">Constancia de solvencia</option><option value="reconnection">Reconexión</option>
            <option value="ownership_change">Cambio de propietario</option><option value="new_connection">Nuevo pegue</option>
            <option value="receive_payment">Recibir pago</option><option value="general_consultation">Consulta general</option>
          </select>
          <Button type="submit" variant="secondary">Comprobar</Button>
        </div>
        {operationResult&&<div className="ja-banner ja-banner-info">
          <strong>{operationResult.blocked?'Operación bloqueada':'Operación permitida'}.</strong> {operationResult.reason||'La deuda no impide esta operación.'}
          {' '}Vencido: {M(operationResult.overdue_amount)} · pendiente total: {M(operationResult.total_pending)}.
          {operationResult.blocked&&auth.has('debt.override')&&<div className="ja-pos-fields" style={{marginTop:'.5rem'}}>
            <textarea className="ja-control" rows={2} value={overrideReason} onChange={e=>setOverrideReason(e.target.value)} placeholder="Justificación excepcional, mínimo 20 caracteres"/>
            <Button type="button" onClick={()=>void override()}>Autorizar excepción con MFA</Button>
          </div>}
        </div>}
      </form>
    </section>
    :<EmptyState icon={<WalletCards size={22}/>} title="Seleccione un abonado" description="Abra un estado de cuenta para consultar obligaciones, vencimientos y bloqueos."/>}
  </main>;
}
