import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {
  AlertTriangle,ArrowRight,BadgeDollarSign,CheckCircle2,ClipboardList,FileSpreadsheet,IdCard,
  Info,Landmark,PackagePlus,ReceiptText,Users,WalletMinimal,Wrench,
} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {getFinancialDashboard,getRoleDashboard} from '../features/finance/service';
import {deriveNotifications,type AppNotification,type RoleDashboard} from '../features/notifications/service';
import {homeSections,roleLabel,visibleQuickActions} from '../features/dashboard/roleView';
import {formatMoney} from '../design-system/utils';
import {EmptyState,Metric,Skeleton} from '../design-system/primitives';

type Financial={balance?:number|null;income?:number|null;expense?:number|null};

const greeting=()=>{const h=new Date().getHours();return h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';};

const ICONS:Record<string,React.ReactNode>={
  '/abonados':<Users size={18}/>,'/fichas-abonados':<IdCard size={18}/>,'/pagos':<ReceiptText size={18}/>,
  '/tarifas':<BadgeDollarSign size={18}/>,'/operaciones':<Wrench size={18}/>,'/compras':<PackagePlus size={18}/>,
  '/presupuesto':<Landmark size={18}/>,'/importaciones':<FileSpreadsheet size={18}/>,
};

export function Home(){
  const auth=useAuth();
  const[dashboard,setDashboard]=useState<RoleDashboard|null>(null);
  const[financial,setFinancial]=useState<Financial|null>(null);
  const[error,setError]=useState('');
  const year=new Date().getFullYear();

  useEffect(()=>{
    let live=true;
    void Promise.all([
      getRoleDashboard().catch(()=>({} as RoleDashboard)),
      auth.has('payments.read')||auth.has('finance.read')||auth.has('reports.read')
        ? getFinancialDashboard(`${year}-01-01`,`${year}-12-31`).catch(()=>null)
        : Promise.resolve(null),
    ]).then(([role,fin])=>{
      if(!live)return;
      setDashboard(role as RoleDashboard);
      setFinancial(fin as Financial|null);
      setError('');
    }).catch(()=>{if(live)setError('No se pudo cargar el resumen. Intente de nuevo en un momento.');});
    return()=>{live=false};
  },[year,auth]);

  const loading=dashboard===null;
  const alerts:AppNotification[]=useMemo(()=>dashboard?deriveNotifications(dashboard):[],[dashboard]);
  const cash=dashboard?.active_cash_session;
  const quickActions=useMemo(()=>visibleQuickActions(auth.has),[auth]);
  const sections=useMemo(()=>homeSections(auth.has),[auth]);

  const showFinance=financial!==null&&sections.finance;
  const showOps=sections.operations&&dashboard?.open_work_orders!=null;

  return <main className="ja-home">
    <header className="ja-home-head">
      <div>
        <span className="ja-home-eyebrow">{roleLabel(auth.has)} · {new Date().toLocaleDateString('es-HN',{weekday:'long',day:'numeric',month:'long'})}</span>
        <h1>{greeting()}, {auth.profile?.full_name?.split(' ')[0]??'bienvenido'}</h1>
        <p>Esto es lo que requiere su atención hoy.</p>
      </div>
      {cash!=null&&<Link to="/caja" className={`ja-home-cash${cash?' ja-home-cash-open':''}`}>
        <WalletMinimal size={16}/>{cash?'Caja abierta':'Caja cerrada'}
      </Link>}
    </header>

    {error&&<div className="ja-banner ja-banner-warning" role="alert">{error}</div>}

    <section className="ja-home-section" aria-labelledby="ja-home-attention">
      <h2 id="ja-home-attention">Requiere atención</h2>
      {loading
        ?<div className="ja-home-alerts">{[0,1,2].map(i=><Skeleton key={i} className="ja-home-alert-skel"/>)}</div>
        :alerts.length===0
          ?<EmptyState icon={<CheckCircle2 size={26}/>} title="Todo al día" description="No hay pendientes para su rol en este momento."/>
          :<ul className="ja-home-alerts">
            {alerts.map(a=><li key={a.id}>
              <Link to={a.to} className={`ja-home-alert ja-home-alert-${a.severity}`}>
                <span className="ja-home-alert-icon">{a.severity==='info'?<Info size={16}/>:<AlertTriangle size={16}/>}</span>
                <span className="ja-home-alert-body"><strong>{a.title}</strong><small>{a.detail}</small></span>
                <ArrowRight size={16}/>
              </Link>
            </li>)}
          </ul>}
    </section>

    {(showFinance||showOps)&&<section className="ja-home-section" aria-labelledby="ja-home-panorama">
      <h2 id="ja-home-panorama">Panorama</h2>
      <div className="ja-home-metrics">
        {showFinance&&<>
          <Metric label="Saldo disponible" value={loading?'—':formatMoney(financial?.balance)} detail="Libro mayor confirmado"/>
          <Metric label={`Ingresos ${year}`} value={loading?'—':formatMoney(financial?.income)}/>
          <Metric label={`Gastos ${year}`} value={loading?'—':formatMoney(financial?.expense)}/>
        </>}
        {dashboard?.overdue_debt!=null&&<Metric label="Cartera vencida" tone={Number(dashboard.overdue_debt)>0?'warning':'success'} value={formatMoney(dashboard.overdue_debt)}/>}
        {showOps&&<>
          <Metric label="Órdenes abiertas" tone={Number(dashboard?.urgent_work_orders)>0?'danger':undefined} value={String(dashboard?.open_work_orders??0)} detail={Number(dashboard?.urgent_work_orders)>0?`${dashboard?.urgent_work_orders} urgentes`:undefined}/>
          {dashboard?.low_stock!=null&&<Metric label="Materiales bajo mínimo" tone={Number(dashboard.low_stock)>0?'warning':'success'} value={String(dashboard.low_stock)}/>}
        </>}
      </div>
    </section>}

    <section className="ja-home-section" aria-labelledby="ja-home-quick">
      <h2 id="ja-home-quick">Acciones rápidas</h2>
      {quickActions.length===0
        ?<EmptyState icon={<ClipboardList size={26}/>} title="Sin acciones rápidas" description="Su rol no tiene flujos de creación disponibles."/>
        :<div className="ja-home-quick">
          {quickActions.map(a=><Link key={a.to+a.title} to={a.to} className="ja-home-quick-card">
            <span className="ja-home-quick-icon">{ICONS[a.to]??<ClipboardList size={18}/>}</span>{a.title}<ArrowRight size={15}/>
          </Link>)}
        </div>}
    </section>
  </main>;
}
