import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,Layers,RefreshCw,TrendingDown} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {getPortfolioOverview} from '../features/arrears/service';
import {Badge,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {cn,formatDate,formatMoney} from '../design-system/utils';

type Aging={bucket:string;label:string;subscribers:number;amount:number};
type Sector={sector:string;subscribers:number;amount:number;overdue_amount:number};
type Debtor={subscriber_id:string;subscriber_code:string;subscriber_name:string;sector:string|null;balance:number;oldest_due_date:string|null;days_overdue:number};
type Overview={
  as_of:string;
  totals:{subscribers_with_debt:number;obligations_open:number;balance_total:number;current:number;overdue:number};
  aging:Aging[];by_sector:Sector[];top_debtors:Debtor[];
};

const M=(v:unknown)=>formatMoney(typeof v==='number'||typeof v==='string'?v:0);
const BUCKET_TONE:Record<string,'neutral'|'warning'|'danger'>={por_vencer:'neutral',d1_30:'warning',d31_60:'warning',d61_90:'danger',d90_mas:'danger'};

export function Cartera(){
  const auth=useAuth();
  const [data,setData]=useState<Overview|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=useCallback(()=>{
    setLoading(true);
    void getPortfolioOverview()
      .then(d=>{setData((d??null) as Overview|null);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  const maxAging=useMemo(()=>Math.max(1,...(data?.aging??[]).map(a=>a.amount)),[data]);

  if(!auth.has('obligations.read'))return <main className="ja-page"><EmptyState title="Sin acceso" description="No tiene permiso para consultar la cartera."/></main>;

  return <main className="ja-page">
    <header className="ja-page-head">
      <div>
        <h1>Cartera</h1>
        <p>Estado de la deuda por cobrar a la fecha. La antigüedad de saldo no dispara cortes automáticos.</p>
      </div>
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={15}/> Actualizar</button>
    </header>

    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&!data&&<Skeleton className="ja-360-skel"/>}

    {!loading&&data&&<>
      <div className="ja-home-metrics">
        <article className="ja-metric"><small>Saldo por cobrar</small><strong>{M(data.totals.balance_total)}</strong><span>{data.totals.subscribers_with_debt} abonados · {data.totals.obligations_open} cuotas abiertas</span></article>
        <article className="ja-metric ja-metric-success"><small>Por vencer</small><strong>{M(data.totals.current)}</strong><span>Aún dentro de plazo</span></article>
        <article className="ja-metric ja-metric-danger"><small>Vencido</small><strong>{M(data.totals.overdue)}</strong><span>Deuda exigible</span></article>
        <article className="ja-metric"><small>Corte al</small><strong>{formatDate(data.as_of)}</strong><span>Foto de la cartera</span></article>
      </div>

      <section className="ja-list">
        <h3 className="ja-list-heading"><Layers size={15}/> Antigüedad de saldo</h3>
        {data.aging.every(a=>a.amount===0)
          ?<EmptyState title="Cartera sana" description="No hay saldos pendientes registrados."/>
          :data.aging.map(a=><article key={a.bucket} className="ja-list-row">
            <div style={{minWidth:'8rem'}}><strong>{a.label}</strong><span className="ja-cell-sub">{a.subscribers} abonados</span></div>
            <div className="ja-cartera-bar"><span className={cn('ja-cartera-bar-fill',`is-${BUCKET_TONE[a.bucket]}`)} style={{width:`${Math.round((a.amount/maxAging)*100)}%`}}/></div>
            <div className="ja-td-num">{M(a.amount)}</div>
          </article>)}
      </section>

      <section className="ja-table-scroll">
        <h3 className="ja-list-heading">Cartera por sector</h3>
        <table className="ja-table">
          <thead><tr><th>Sector</th><th className="ja-td-num">Abonados</th><th className="ja-td-num">Saldo</th><th className="ja-td-num">Vencido</th></tr></thead>
          <tbody>
            {data.by_sector.length===0
              ?<tr><td colSpan={4} className="ja-table-empty">Sin datos por sector.</td></tr>
              :data.by_sector.map(s=><tr key={s.sector}>
                <td>{s.sector}</td>
                <td className="ja-td-num">{s.subscribers}</td>
                <td className="ja-td-num">{M(s.amount)}</td>
                <td className="ja-td-num">{M(s.overdue_amount)}</td>
              </tr>)}
          </tbody>
        </table>
      </section>

      <section className="ja-table-scroll">
        <h3 className="ja-list-heading"><TrendingDown size={15}/> Mayores saldos</h3>
        <table className="ja-table">
          <thead><tr><th>Abonado</th><th>Sector</th><th>Cuota más antigua</th><th className="ja-td-num">Días</th><th className="ja-td-num">Saldo</th><th/></tr></thead>
          <tbody>
            {data.top_debtors.length===0
              ?<tr><td colSpan={6} className="ja-table-empty">Sin deudores.</td></tr>
              :data.top_debtors.map(d=><tr key={d.subscriber_id}>
                <td><strong>{d.subscriber_name}</strong><span className="ja-cell-sub ja-mono">{d.subscriber_code}</span></td>
                <td>{d.sector??'—'}</td>
                <td className="ja-cell-sub">{formatDate(d.oldest_due_date)}</td>
                <td className="ja-td-num">{d.days_overdue>0?<Badge tone={d.days_overdue>90?'danger':'warning'}>{d.days_overdue}</Badge>:'—'}</td>
                <td className="ja-td-num">{M(d.balance)}</td>
                <td className="ja-td-num"><Link className="ja-tab" to={`/abonados/${d.subscriber_id}`}>Ver <ArrowUpRight size={13}/></Link></td>
              </tr>)}
          </tbody>
        </table>
      </section>
    </>}
  </main>;
}
