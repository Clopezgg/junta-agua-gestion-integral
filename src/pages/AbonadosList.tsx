import {useEffect,useMemo,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Plus,Search,SlidersHorizontal,UserRound} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {listSubscribers,type SubscriberListPage,type SubscriberListRow} from '../features/subscribers/service';
import {Badge,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {formatMoney,formatDate} from '../design-system/utils';

const PAGE=25;

const STATUS_LABEL:Record<string,string>={active:'Activo',inactive:'Inactivo',suspended:'Suspendido',archived:'Archivado'};
const SERVICE_LABEL:Record<string,string>={residential:'Residencial',commercial:'Comercial',community:'Comunitario',institutional:'Institucional'};
const statusTone=(s:string)=>s==='active'?'success':s==='suspended'?'danger':'neutral';

export function AbonadosList(){
  const auth=useAuth();
  const navigate=useNavigate();
  const [query,setQuery]=useState('');
  const [debounced,setDebounced]=useState('');
  const [status,setStatus]=useState('');
  const [sector,setSector]=useState('');
  const [balance,setBalance]=useState<''|'con_saldo'|'al_dia'>('');
  const [benefit,setBenefit]=useState<''|'si'|'no'>('');
  const [page,setPage]=useState(0);
  const [data,setData]=useState<SubscriberListPage|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);

  useEffect(()=>{const t=setTimeout(()=>{setDebounced(query.trim());setPage(0);},280);return()=>clearTimeout(t);},[query]);
  useEffect(()=>{setPage(0);},[status,sector,balance,benefit]);

  useEffect(()=>{
    let live=true;
    setLoading(true);
    void listSubscribers({
      query:debounced,
      status:status||null,
      sector:sector||null,
      balance:balance||null,
      hasBenefit:benefit===''?null:benefit==='si',
      limit:PAGE,
      offset:page*PAGE,
    }).then(res=>{if(live){setData(res);setError('');}})
      .catch(e=>{if(live)setError((e as Error).message);})
      .finally(()=>{if(live)setLoading(false);});
    return()=>{live=false};
  },[debounced,status,sector,balance,benefit,page]);

  const sectors=useMemo(()=>data?.sectors??[],[data]);
  const total=data?.total??0;
  const rows=data?.rows??[];
  const pages=Math.max(1,Math.ceil(total/PAGE));
  const hasFilters=Boolean(status||sector||balance||benefit||debounced);

  const openRow=(r:SubscriberListRow)=>navigate(`/abonados/registro?abrir=${r.subscriber_id}`);

  return <main className="ja-page">
    <header className="ja-page-head">
      <div>
        <h1>Abonados</h1>
        <p>{loading&&!data?'Cargando…':`${total} abonado${total===1?'':'s'}`}</p>
      </div>
      {auth.has('subscribers.create')&&<button className="ja-btn ja-btn-primary ja-btn-md" onClick={()=>navigate('/abonados/registro?crear=1')}>
        <Plus size={16}/>Nuevo abonado
      </button>}
    </header>

    <div className="ja-toolbar">
      <div className="ja-search-field">
        <Search size={15}/>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Código, nombre, identidad, teléfono, sector o pegue" aria-label="Buscar abonados"/>
      </div>
      <div className="ja-filters">
        <SlidersHorizontal size={14} aria-hidden/>
        <select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Estado">
          <option value="">Estado: todos</option>
          {Object.entries(STATUS_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
        <select value={sector} onChange={e=>setSector(e.target.value)} aria-label="Sector">
          <option value="">Sector: todos</option>
          {sectors.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={balance} onChange={e=>setBalance(e.target.value as typeof balance)} aria-label="Saldo">
          <option value="">Saldo: todos</option>
          <option value="con_saldo">Con saldo pendiente</option>
          <option value="al_dia">Al día</option>
        </select>
        <select value={benefit} onChange={e=>setBenefit(e.target.value as typeof benefit)} aria-label="Beneficio">
          <option value="">Beneficio: todos</option>
          <option value="si">Con beneficio</option>
          <option value="no">Sin beneficio</option>
        </select>
      </div>
    </div>

    {error
      ?<ErrorState error={error} onRetry={()=>setPage(p=>p)}/>
      :<div className="ja-table-scroll">
        <table className="ja-table">
          <thead><tr>
            <th>Código</th><th>Abonado</th><th>Ubicación</th><th>Pegues</th>
            <th className="ja-td-num">Saldo</th><th>Estado</th><th>Último pago</th>
          </tr></thead>
          <tbody>
            {loading&&!data
              ?Array.from({length:8}).map((_,i)=><tr key={i}><td colSpan={7}><Skeleton className="ja-row-skel"/></td></tr>)
              :rows.map(r=>(
                <tr key={r.subscriber_id} className="ja-row-click" onClick={()=>openRow(r)} tabIndex={0}
                  onKeyDown={e=>{if(e.key==='Enter')openRow(r);}}>
                  <td className="ja-mono">{r.code}</td>
                  <td>
                    <div className="ja-cell-strong">{r.full_name}</div>
                    <div className="ja-cell-sub">{r.masked_document}{r.has_benefit&&<Badge tone="info">Beneficio</Badge>}</div>
                  </td>
                  <td>{r.sector||'—'}</td>
                  <td>{r.connections_count}{r.service_types.length>0&&<span className="ja-cell-sub"> · {r.service_types.map(t=>SERVICE_LABEL[t]??t).join(', ')}</span>}</td>
                  <td className="ja-td-num">{r.balance>0?<span className="ja-amount-due">{formatMoney(r.balance)}</span>:formatMoney(0)}</td>
                  <td><Badge tone={statusTone(r.status)}>{STATUS_LABEL[r.status]??r.status}</Badge></td>
                  <td>{r.last_payment_date?formatDate(r.last_payment_date):'Sin pagos'}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {!loading&&rows.length===0&&(
          hasFilters
            ?<EmptyState icon={<Search size={26}/>} title="Sin coincidencias" description="Ningún abonado coincide con la búsqueda o los filtros."/>
            :<EmptyState icon={<UserRound size={26}/>} title="Aún no hay abonados" description="Registre el primero para comenzar el expediente."/>
        )}
      </div>}

    {total>PAGE&&<div className="ja-pagination">
      <button className="ja-pagination-btn" disabled={page===0} onClick={()=>setPage(p=>p-1)} aria-label="Página anterior">‹</button>
      <span className="ja-pagination-meta">Página <strong>{page+1}</strong> de {pages}</span>
      <button className="ja-pagination-btn" disabled={page>=pages-1} onClick={()=>setPage(p=>p+1)} aria-label="Página siguiente">›</button>
    </div>}
  </main>;
}
