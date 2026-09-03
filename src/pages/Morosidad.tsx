import {useCallback,useEffect,useMemo,useState} from 'react';
import {CalendarClock,HandCoins,Plus,RefreshCw} from 'lucide-react';
import {
  createPaymentArrangement,getArrangementDetail,listArrangementsWorkspace,markArrangementInstallmentPaid,
} from '../features/arrears/service';
import {listCutCandidates} from '../features/metering/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton,Tabs} from '../design-system/primitives';
import {formatDate,formatMoney} from '../design-system/utils';

type Row=Record<string,any>;
const M=(v:unknown)=>formatMoney(typeof v==='number'||typeof v==='string'?v:0);
const today=()=>new Date().toISOString().slice(0,10);
const FREQ:Record<string,string>={semanal:'Semanal',quincenal:'Quincenal',mensual:'Mensual'};
const DISPLAY:Record<string,{label:string;tone:'success'|'warning'|'danger'|'neutral'}>={
  al_dia:{label:'Al día',tone:'success'},
  vencido:{label:'Vencido',tone:'danger'},
  completado:{label:'Completado',tone:'neutral'},
  cancelado:{label:'Cancelado',tone:'neutral'},
};
const FILTERS=[
  {value:'',label:'Todos'},
  {value:'al_dia',label:'Al día'},
  {value:'vencido',label:'Vencidos'},
  {value:'completado',label:'Completados'},
] as const;

export function Morosidad(){
  const auth=useAuth();
  const manage=auth.has('obligations.manage');
  const [rows,setRows]=useState<Row[]>([]);
  const [cands,setCands]=useState<Row[]>([]);
  const [filter,setFilter]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [creating,setCreating]=useState(false);
  const [detail,setDetail]=useState<Row|null>(null);
  const [payAmount,setPayAmount]=useState<Record<string,string>>({});
  const [candId,setCandId]=useState('');
  const [draft,setDraft]=useState({installment_amount:'',frequency:'mensual',first_due_date:'',notes:''});

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([listArrangementsWorkspace(),listCutCandidates(30)])
      .then(([a,c])=>{setRows(a as Row[]);setCands(c as Row[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  const selected=cands.find(c=>c.subscriber_id===candId);
  const stats=useMemo(()=>({
    active:rows.filter(r=>r.display_status==='al_dia'||r.display_status==='vencido').length,
    recovering:rows.filter(r=>r.display_status==='al_dia'||r.display_status==='vencido').reduce((s,r)=>s+Number(r.total_debt??0)-Number(r.paid_to_date??0),0),
    overdue:rows.filter(r=>r.display_status==='vencido').length,
    done:rows.filter(r=>r.display_status==='completado').length,
  }),[rows]);
  const visible=rows.filter(r=>!filter||r.display_status===filter);

  async function save(e:React.FormEvent){
    e.preventDefault();
    try{
      await createPaymentArrangement({
        p_subscriber_id:candId,p_total_debt:Number(selected?.overdue_amount??0),
        p_installment_amount:Number(draft.installment_amount),p_frequency:draft.frequency,
        p_first_due_date:draft.first_due_date,p_obligation_ids:[],p_notes:draft.notes||null,
      });
      setCreating(false);setCandId('');setDraft({installment_amount:'',frequency:'mensual',first_due_date:'',notes:''});
      setNotice('Convenio creado y auditado.');load();
    }catch(e){setError((e as Error).message);}
  }
  async function openDetail(id:string){
    try{setDetail(await getArrangementDetail(id));setError('');}catch(e){setError((e as Error).message);}
  }
  async function refreshDetail(){
    if(!detail)return;
    setDetail(await getArrangementDetail(detail.arrangement.id));setPayAmount({});
  }
  async function pay(inst:Row){
    const amt=payAmount[inst.id]??'';
    if(!amt||!detail)return;
    try{
      await markArrangementInstallmentPaid(detail.arrangement.id,Number(inst.installment_no),Number(amt));
      setNotice(`Cuota #${inst.installment_no} registrada en ${detail.arrangement.code}.`);
      await refreshDetail();load();
    }catch(e){setError((e as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div>
        <h1>Convenios de pago</h1>
        <p>Planes de cuotas para regularizar la cartera. El convenio preserva la deuda original.</p>
      </div>
      {manage&&<Button icon={<Plus size={15}/>} onClick={()=>setCreating(true)}>Nuevo convenio</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&rows.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<>
      <div className="ja-home-metrics">
        <article className="ja-metric"><small>Convenios activos</small><strong>{stats.active}</strong><span>En curso de pago</span></article>
        <article className="ja-metric"><small>En recuperación</small><strong>{M(stats.recovering)}</strong><span>Saldo sujeto a plan</span></article>
        <article className="ja-metric ja-metric-danger"><small>Vencidos</small><strong>{stats.overdue}</strong><span>Requieren gestión</span></article>
        <article className="ja-metric ja-metric-success"><small>Completados</small><strong>{stats.done}</strong><span>Plan saldado</span></article>
      </div>

      <Tabs tabs={FILTERS} value={filter} onChange={setFilter}/>

      <section className="ja-list">
        {visible.length===0
          ?<EmptyState icon={<HandCoins size={22}/>} title="Sin convenios" description="No hay planes de pago con este filtro."/>
          :visible.map(a=>{
            const d=DISPLAY[a.display_status]??{label:a.display_status,tone:'neutral' as const};
            const progress=`${a.installments_paid}/${a.installments_total}`;
            return <article key={a.id} className="ja-list-row">
              <div>
                <strong>{a.code} · {a.subscriber_name??`Abonado ${a.subscriber_id}`}</strong>
                <span className="ja-cell-sub">{FREQ[a.frequency]??a.frequency} · {progress} cuotas · {M(a.installment_amount)} c/u{a.next_due_date?` · próx. ${formatDate(a.next_due_date)}`:''}</span>
              </div>
              <div className="ja-td-num">{M(Number(a.total_debt)-Number(a.paid_to_date??0))}</div>
              <Badge tone={d.tone}>{d.label}</Badge>
              <Button size="sm" variant="secondary" onClick={()=>void openDetail(a.id)}>Cuotas</Button>
            </article>;
          })}
      </section>
    </>}

    <Dialog open={creating} onClose={()=>setCreating(false)} title="Nuevo convenio de pago"
      description="Regulariza la deuda vencida de un abonado con un plan de cuotas.">
      <form className="ja-pos-fields" onSubmit={save}>
        <label className="ja-field"><span className="ja-field-label">Abonado con mora</span>
          <select className="ja-control" value={candId} onChange={e=>setCandId(e.target.value)} required>
            <option value="">Seleccione un abonado en mora…</option>
            {cands.map(c=><option key={c.subscriber_id} value={c.subscriber_id}>{c.subscriber_code} — {c.subscriber_name} ({M(c.overdue_amount)})</option>)}
          </select></label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Deuda a regularizar</span><input className="ja-control" value={selected?M(selected.overdue_amount):'—'} readOnly/></label>
          <label className="ja-field"><span className="ja-field-label">Cuota por período (L)</span><input className="ja-control" type="number" min="1" step="0.01" required value={draft.installment_amount} onChange={e=>setDraft({...draft,installment_amount:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Frecuencia</span><select className="ja-control" value={draft.frequency} onChange={e=>setDraft({...draft,frequency:e.target.value})}>{Object.keys(FREQ).map(f=><option key={f} value={f}>{FREQ[f]}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Primer vencimiento</span><input className="ja-control" type="date" required value={draft.first_due_date} onChange={e=>setDraft({...draft,first_due_date:e.target.value})}/></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Notas</span><textarea className="ja-control" rows={2} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label>
        <Button type="submit" disabled={!candId} icon={<CalendarClock size={15}/>}>Crear convenio</Button>
      </form>
    </Dialog>

    <Dialog open={Boolean(detail)} onClose={()=>setDetail(null)}
      title={detail?String(detail.arrangement.code):''}
      description={detail?`Deuda ${M(detail.arrangement.total_debt)} · ${detail.arrangement.num_installments} cuotas de ${M(detail.arrangement.installment_amount)} · ${FREQ[detail.arrangement.frequency]??detail.arrangement.frequency}`:''}>
      {detail&&<>
        <p className="ja-cell-sub">
          Estado: <Badge tone={detail.arrangement.status==='cumplido'?'success':detail.arrangement.status==='incumplido'?'danger':'neutral'}>{detail.arrangement.status==='cumplido'?'Cumplido':detail.arrangement.status}</Badge>
          {' · '}primer vencimiento {formatDate(detail.arrangement.first_due_date)}
          {detail.arrangement.notes?` · ${detail.arrangement.notes}`:''}
        </p>
        <div className="ja-table-scroll">
          <table className="ja-table">
            <thead><tr><th>#</th><th>Vence</th><th className="ja-td-num">Monto</th><th className="ja-td-num">Pagado</th><th className="ja-td-num">Saldo</th><th>Estado</th><th>Acción</th></tr></thead>
            <tbody>
              {(detail.installments??[]).map((inst:Row)=>{
                const bal=Number(inst.amount)-Number(inst.paid_amount??0);
                const isPast=inst.due_date<today()&&inst.status!=='pagada';
                return <tr key={inst.id}>
                  <td>{inst.installment_no}</td>
                  <td className="ja-cell-sub">{formatDate(inst.due_date)}</td>
                  <td className="ja-td-num">{M(inst.amount)}</td>
                  <td className="ja-td-num">{M(inst.paid_amount)}</td>
                  <td className="ja-td-num">{M(bal)}</td>
                  <td><Badge tone={inst.status==='pagada'?'success':isPast?'danger':'neutral'}>{inst.status==='pagada'?'Pagada':isPast?'Atrasada':'Pendiente'}</Badge></td>
                  <td>{inst.status==='pagada'
                    ?'✓'
                    :manage
                      ?<span style={{display:'inline-flex',gap:'.35rem'}}>
                        <input className="ja-control" style={{maxWidth:'6rem'}} type="number" min="1" step="0.01" placeholder="Monto" value={payAmount[inst.id]??''} onChange={e=>setPayAmount({...payAmount,[inst.id]:e.target.value})}/>
                        <Button size="sm" disabled={!payAmount[inst.id]} onClick={()=>void pay(inst)}>Registrar</Button>
                      </span>
                      :'—'}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </>}
    </Dialog>
  </main>;
}
