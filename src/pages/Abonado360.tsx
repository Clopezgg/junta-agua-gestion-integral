import {useCallback,useEffect,useMemo,useState} from 'react';
import {Link,useNavigate,useParams} from 'react-router-dom';
import {
  ArrowLeft,BadgeCheck,ClipboardList,Droplet,FileText,History,MessageSquare,Receipt,
  ShieldAlert,Wallet,Wrench,
} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {getSubscriberDocumentUrl,getSubscriberExpediente,type SubscriberExpediente} from '../features/subscribers/service';
import {Badge,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {cn,formatDate,formatDateTime,formatMoney,initials} from '../design-system/utils';

const TABS=['resumen','servicio','cuenta','pagos','atencion','trabajo','documentos','historial'] as const;
type Tab=typeof TABS[number];
const TAB_LABEL:Record<Tab,string>={resumen:'Resumen',servicio:'Servicio',cuenta:'Cuenta',pagos:'Pagos',atencion:'Atención',trabajo:'Trabajo',documentos:'Documentos',historial:'Historial'};

const S=(v:unknown)=>v==null||v===''?'—':String(v);
const M=(v:unknown)=>formatMoney(typeof v==='number'||typeof v==='string'?v:0);
const connStatusTone=(s:string)=>s==='active'?'success':s==='suspended'?'danger':'neutral';

export function Abonado360(){
  const {id=''}=useParams();
  const auth=useAuth();
  const navigate=useNavigate();
  const [data,setData]=useState<SubscriberExpediente|null>(null);
  const [photo,setPhoto]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [tab,setTab]=useState<Tab>('resumen');

  const load=useCallback(()=>{
    setLoading(true);
    void getSubscriberExpediente(id)
      .then(async exp=>{
        setData(exp);setError('');
        const p=exp?.subscriber?.photo_path;
        if(typeof p==='string'&&p)setPhoto(await getSubscriberDocumentUrl(p).catch(()=>''));
      })
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[id]);
  useEffect(load,[load]);

  const sub=data?.subscriber;
  const name=S(sub?.full_name);
  const account=data?.account;

  const actions=useMemo(()=>[
    auth.has('payments.create')&&{label:'Cobrar',icon:<Wallet size={15}/>,to:`/pagos?abonado=${id}`},
    auth.has('subscribers.create')&&{label:'Nuevo servicio',icon:<Droplet size={15}/>,to:`/abonados/nuevo-servicio`},
    auth.has('subscribers.read')&&{label:'Solicitud',icon:<ClipboardList size={15}/>,to:`/solicitudes?abonado=${id}`},
    auth.has('operations.manage')&&{label:'Orden',icon:<Wrench size={15}/>,to:`/operaciones?abonado=${id}`},
    auth.has('obligations.read')&&{label:'Estado de cuenta',icon:<Receipt size={15}/>,to:`/estados-cuenta?abonado=${id}`},
    auth.has('communications.send')&&{label:'Comunicar',icon:<MessageSquare size={15}/>,to:`/comunicaciones?abonado=${id}`},
  ].filter(Boolean) as {label:string;icon:React.ReactNode;to:string}[],[auth,id]);

  if(loading&&!data)return <main className="ja-page"><Skeleton className="ja-360-skel"/></main>;
  if(error)return <main className="ja-page"><ErrorState error={error} onRetry={load}/></main>;
  if(!data||!sub)return <main className="ja-page"><EmptyState title="Abonado no encontrado" description="No existe un expediente para este identificador o no tiene permiso para verlo." action={<Link className="ja-btn ja-btn-outline ja-btn-md" to="/abonados">Volver a Abonados</Link>}/></main>;

  return <main className="ja-page ja-360">
    <button className="ja-back" onClick={()=>navigate('/abonados')}><ArrowLeft size={15}/>Abonados</button>

    <header className="ja-360-head">
      <div className="ja-360-avatar">{photo?<img src={photo} alt=""/>:<span>{initials(name)}</span>}</div>
      <div className="ja-360-id">
        <h1>{name}</h1>
        <p><span className="ja-mono">{S(sub.code)}</span> · {S(data.identities[0]?.masked_number??data.identities[0]?.masked_document)}</p>
        <div className="ja-360-tags">
          <Badge tone={sub.status==='active'?'success':'neutral'}>{S(sub.status)==='active'?'Activo':S(sub.status)}</Badge>
          {account&&!account.solvent&&<Badge tone="danger">Debe {formatMoney(account.total_pending)}</Badge>}
          {account?.solvent&&<Badge tone="success"><BadgeCheck size={12}/> Al día</Badge>}
          {data.benefits.some(b=>['eligible','active'].includes(String(b.status)))&&<Badge tone="info">Beneficio</Badge>}
        </div>
      </div>
      <div className="ja-360-actions">
        {actions.map(a=><Link key={a.label} to={a.to} className="ja-btn ja-btn-secondary ja-btn-sm">{a.icon}{a.label}</Link>)}
      </div>
    </header>

    <nav className="ja-tabs" role="tablist">
      {TABS.map(t=>(
        <button key={t} role="tab" aria-selected={tab===t} className={cn('ja-tab',tab===t&&'ja-tab-active')} onClick={()=>setTab(t)}>
          {TAB_LABEL[t]}
          {t==='cuenta'&&account&&account.overdue_count>0&&<span className="ja-tab-badge">{account.overdue_count}</span>}
          {t==='atencion'&&data.requests.length>0&&<span className="ja-tab-badge">{data.requests.length}</span>}
        </button>
      ))}
    </nav>

    <section className="ja-360-body" role="tabpanel">
      {tab==='resumen'&&<div className="ja-360-grid">
        <Field label="Teléfono" value={S(sub.whatsapp)}/>
        <Field label="Correo" value={S(sub.email)}/>
        <Field label="Sector" value={S(sub.sector)}/>
        <Field label="Dirección" value={S(sub.address)}/>
        <Field label="Pegues activos" value={String(data.connections.filter(c=>c.status!=='cancelled').length)}/>
        <Field label="Saldo pendiente" value={account?formatMoney(account.total_pending):'—'}/>
        {data.person_link&&<Field label="Categoría" value={S(data.person_link.category)}/>}
      </div>}

      {tab==='servicio'&&<div className="ja-list">
        {data.connections.length===0?<EmptyState icon={<Droplet size={24}/>} title="Sin pegues" description="Este abonado aún no tiene conexiones registradas."/>
          :data.connections.map(c=><article key={String(c.id)} className="ja-list-row">
            <div><strong className="ja-mono">{S(c.code)}</strong><span className="ja-cell-sub">{S(c.address)} · {S(c.sector)}</span></div>
            <div className="ja-cell-sub">{S(c.service_type)}{c.meter_number?` · medidor ${S(c.meter_number)}`:' · sin medidor'}</div>
            <Badge tone={connStatusTone(String(c.status))}>{S(c.status)}</Badge>
          </article>)}
        {data.contracts.length>0&&<>
          <h3 className="ja-list-heading">Contratos</h3>
          {data.contracts.map((ct,i)=><article key={i} className="ja-list-row">
            <div><strong>{S(ct.contract_type)}</strong><span className="ja-cell-sub">Inicio {formatDate(ct.start_date as string)}</span></div>
            <Badge tone={ct.status==='activo'?'success':'neutral'}>{S(ct.status)}</Badge>
          </article>)}
        </>}
      </div>}

      {tab==='cuenta'&&<div className="ja-list">
        {account&&<div className="ja-360-grid">
          <Field label="Total pendiente" value={formatMoney(account.total_pending)}/>
          <Field label="Vencido" value={formatMoney(account.overdue_amount)}/>
          <Field label="Obligaciones vencidas" value={String(account.overdue_count)}/>
          <Field label="Más antigua" value={account.oldest_due_date?formatDate(account.oldest_due_date):'—'}/>
        </div>}
        {data.obligations.length===0?<EmptyState title="Sin obligaciones" description="No hay cuotas ni cargos registrados."/>
          :data.obligations.map(o=><article key={String(o.id)} className="ja-list-row">
            <div><strong>{S(o.description)}</strong><span className="ja-cell-sub">{S(o.tariff_name)} · vence {formatDate(o.due_date as string)}{o.connection_code?` · ${S(o.connection_code)}`:''}</span></div>
            <div className="ja-td-num">{M(o.balance)}</div>
            <Badge tone={o.state==='overdue'?'danger':o.state==='paid'?'success':'warning'}>{S(o.state)}</Badge>
          </article>)}
      </div>}

      {tab==='pagos'&&<div className="ja-list">
        {data.payments.length===0?<EmptyState icon={<Receipt size={24}/>} title="Sin pagos" description="Aún no se ha registrado ningún pago de este abonado."/>
          :data.payments.map(p=><article key={String(p.id)} className="ja-list-row">
            <div><strong className="ja-mono">{S(p.receipt_number)}</strong><span className="ja-cell-sub">{formatDateTime(p.created_at as string)} · {S(p.method)}</span></div>
            <div className="ja-td-num">{M(p.total)}</div>
            <div className="ja-row-actions">
              <Badge tone={p.status==='voided'?'neutral':p.status==='confirmed'?'success':'warning'}>{S(p.status)}</Badge>
              {typeof p.verification_token==='string'&&<Link className="ja-link" to={`/verificar-recibo/${p.verification_token}`} target="_blank" rel="noreferrer">Ver recibo</Link>}
            </div>
          </article>)}
      </div>}

      {tab==='atencion'&&<div className="ja-list">
        {data.requests.length===0?<EmptyState icon={<ClipboardList size={24}/>} title="Sin solicitudes" description="No hay solicitudes ni reclamos para este abonado."/>
          :data.requests.map(r=><article key={String(r.id)} className="ja-list-row">
            <div><strong>{S(r.code)} · {S(r.subject)}</strong><span className="ja-cell-sub">{S(r.type)} · {formatDate(r.created_at as string)}</span></div>
            <Badge tone={r.priority==='urgente'?'danger':r.priority==='alta'?'warning':'neutral'}>{S(r.priority)}</Badge>
            <Badge tone={r.status==='resuelta'||r.status==='cerrada'?'success':'warning'}>{S(r.status)}</Badge>
          </article>)}
      </div>}

      {tab==='trabajo'&&<div className="ja-list">
        {data.work_orders.length===0?<EmptyState icon={<Wrench size={24}/>} title="Sin órdenes de trabajo" description="No hay trabajo técnico asociado a este abonado."/>
          :data.work_orders.map(w=><article key={String(w.id)} className="ja-list-row">
            <div><strong className="ja-mono">{S(w.order_number)}</strong><span className="ja-cell-sub">{S(w.type)} · {formatDate(w.created_at as string)}</span></div>
            <Badge tone={String(w.priority)==='urgent'?'danger':'neutral'}>{S(w.priority)}</Badge>
            <Badge tone={w.status==='completed'?'success':w.status==='cancelled'?'neutral':'warning'}>{S(w.status)}</Badge>
          </article>)}
      </div>}

      {tab==='documentos'&&<div className="ja-list">
        {data.identities.length===0?<EmptyState icon={<FileText size={24}/>} title="Sin documentos" description="No hay documentos de identidad adjuntos."/>
          :data.identities.map(d=><article key={String(d.id)} className="ja-list-row">
            <div><span className="ja-list-icon"><ShieldAlert size={16}/></span><span><strong>{S(d.document_type).toString().toUpperCase()} · {S(d.masked_number)}</strong><span className="ja-cell-sub">{d.has_file?'Documento protegido adjunto':'Sin archivo adjunto'}</span></span></div>
            <Badge tone="neutral">Privado</Badge>
          </article>)}
        <p className="ja-hint">La gestión de archivos (adjuntar identidad, fotografía) se realiza desde el expediente de registro. <Link className="ja-link" to={`/abonados/registro?abrir=${id}`}>Abrir</Link></p>
      </div>}

      {tab==='historial'&&<div className="ja-list">
        {data.audit.length===0?<EmptyState icon={<History size={24}/>} title="Sin historial visible" description="No hay eventos de auditoría o no tiene permiso para verlos."/>
          :data.audit.map((a,i)=><article key={i} className="ja-list-row ja-audit-row">
            <div><strong>{humanAction(String(a.action))}</strong><span className="ja-cell-sub">{S(a.reason)}</span></div>
            <span className="ja-cell-sub">{formatDateTime(a.created_at as string)}</span>
          </article>)}
      </div>}
    </section>
  </main>;
}

function Field({label,value}:{label:string;value:string}){
  return <div className="ja-field-ro"><small>{label}</small><strong>{value}</strong></div>;
}

function humanAction(action:string):string{
  const map:Record<string,string>={
    create:'Alta',update:'Modificación',bootstrap:'Inicialización',
    'payment.void':'Pago anulado','payment.refund':'Pago devuelto',
    'work_order.create':'Orden creada','work_order.update':'Orden actualizada',
  };
  return map[action]??action.replace(/[._]/g,' ');
}
