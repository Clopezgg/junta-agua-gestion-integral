import {useCallback,useEffect,useMemo,useState} from 'react';
import {BadgeCheck,Landmark,Plus} from 'lucide-react';
import {Bar,BarChart,CartesianGrid,Legend,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {approveBudget,getBudgetDashboard,saveBudgetLine,saveFiscalPeriod,type BudgetDashboard} from '../features/budget/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {cn,formatMoney} from '../design-system/utils';

const M=(v:unknown)=>formatMoney(typeof v==='number'||typeof v==='string'?v:0);
const TYPE:Record<string,string>={income:'Ingreso',expense:'Gasto',reserve:'Reserva'};

export function Budget(){
  const auth=useAuth();
  const manage=auth.has('budget.manage');
  const [year,setYear]=useState(new Date().getFullYear());
  const [data,setData]=useState<BudgetDashboard|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [periodOpen,setPeriodOpen]=useState(false);
  const [lineOpen,setLineOpen]=useState(false);
  const [periodForm,setPeriodForm]=useState({opening_cash:'0',opening_bank:'0',reserve_target:'0',notes:''});
  const [lineForm,setLineForm]=useState({code:'',name:'',category_type:'expense' as 'income'|'expense'|'reserve',match_pattern:'',budget_amount:'',notes:''});

  const load=useCallback(()=>{
    setLoading(true);
    void getBudgetDashboard(year)
      .then(next=>{
        setData(next);
        if(next.period)setPeriodForm({
          opening_cash:String(next.period.opening_cash??0),
          opening_bank:String(next.period.opening_bank??0),
          reserve_target:String(next.period.reserve_target??0),
          notes:next.period.notes??'',
        });
        setError('');
      })
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[year]);
  useEffect(load,[load]);

  const chartData=useMemo(()=>data?.lines.map(l=>({name:l.code,Presupuestado:Number(l.budget_amount),Ejecutado:Number(l.actual_amount)}))??[],[data]);
  const summary=data?.summary??{};
  const expensePercent=Number(summary.expense_budget??0)>0?Number(summary.expense_actual??0)/Number(summary.expense_budget)*100:0;
  const status=data?.period?.status??'draft';
  const statusLabel=status==='approved'?'Aprobado':status==='closed'?'Cerrado':'Borrador';

  async function savePeriod(){
    try{
      await saveFiscalPeriod({fiscal_year:year,opening_cash:Number(periodForm.opening_cash),opening_bank:Number(periodForm.opening_bank),reserve_target:Number(periodForm.reserve_target),notes:periodForm.notes});
      setPeriodOpen(false);setNotice('Periodo fiscal y saldos iniciales guardados con auditoría.');load();
    }catch(e){setError((e as Error).message);}
  }
  async function saveLine(){
    if(!data?.period)return;
    try{
      await saveBudgetLine({fiscal_period_id:data.period.id,code:lineForm.code,name:lineForm.name,category_type:lineForm.category_type,match_pattern:lineForm.match_pattern,budget_amount:Number(lineForm.budget_amount),notes:lineForm.notes});
      setLineForm({code:'',name:'',category_type:'expense',match_pattern:'',budget_amount:'',notes:''});
      setLineOpen(false);setNotice('Rubro presupuestario guardado.');load();
    }catch(e){setError((e as Error).message);}
  }
  async function approve(){
    try{await approveBudget(year);setNotice('Presupuesto aprobado con MFA. Queda identificado como presupuesto oficial.');load();}
    catch(e){setError((e as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div>
        <h1>Presupuesto</h1>
        <p>Saldos iniciales, presupuesto anual, reservas y ejecución real.</p>
      </div>
      <label className="ja-field" style={{maxWidth:'8rem'}}><span className="ja-field-label">Año fiscal</span>
        <select className="ja-control" value={year} onChange={e=>setYear(Number(e.target.value))}>{[year-2,year-1,year,year+1].map(v=><option key={v}>{v}</option>)}</select></label>
      {manage&&status==='draft'&&data?.period&&<Button variant="secondary" icon={<BadgeCheck size={15}/>} onClick={()=>void approve()}>Aprobar presupuesto</Button>}
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&!data&&<Skeleton className="ja-360-skel"/>}

    {!loading&&data&&<>
      <div className="ja-home-metrics">
        <article className="ja-metric"><small>Saldo inicial</small><strong>{M(Number(data.period?.opening_cash??0)+Number(data.period?.opening_bank??0))}</strong><span>Caja + bancos</span></article>
        <article className="ja-metric"><small>Saldo financiero actual</small><strong>{M(data.current_balance)}</strong><span>Movimientos contabilizados</span></article>
        <article className={cn('ja-metric',expensePercent>100?'ja-metric-danger':'ja-metric-success')}><small>Ejecución del gasto</small><strong>{expensePercent.toFixed(1)}%</strong><span>{expensePercent>100?'Presupuesto excedido':'Dentro del presupuesto'}</span></article>
        <article className="ja-metric"><small>Meta de reserva</small><strong>{M(data.period?.reserve_target)}</strong><span>Renovación y contingencias</span></article>
      </div>

      {manage&&<div className="ja-row-actions">
        <Button variant="secondary" icon={<Landmark size={15}/>} onClick={()=>setPeriodOpen(true)}>Periodo fiscal y saldos</Button>
        {data.period&&status!=='closed'&&<Button variant="secondary" icon={<Plus size={15}/>} onClick={()=>setLineOpen(true)}>Rubro presupuestario</Button>}
      </div>}

      <section className="ja-table-scroll">
        <div className="ja-list-heading" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span>Presupuesto vs. ejecutado</span>
          <Badge tone={status==='approved'?'success':status==='closed'?'neutral':'warning'}>{statusLabel}</Badge>
        </div>
        {!data.period
          ?<EmptyState title="Sin periodo fiscal" description="Cree el periodo fiscal para comenzar."/>
          :<table className="ja-table">
            <thead><tr><th>Rubro</th><th>Tipo</th><th className="ja-td-num">Presupuesto</th><th className="ja-td-num">Ejecutado</th><th className="ja-td-num">Variación</th><th className="ja-td-num">Avance</th></tr></thead>
            <tbody>
              {data.lines.length===0
                ?<tr><td colSpan={6} className="ja-table-empty">Aún no hay rubros.</td></tr>
                :data.lines.map(line=>{
                  const percent=Number(line.execution_percent);
                  const tone=line.category_type==='expense'&&percent>100?'is-danger':percent>=80?'is-warning':'is-neutral';
                  return <tr key={line.id}>
                    <td><strong>{line.code}</strong><span className="ja-cell-sub">{line.name}</span></td>
                    <td>{TYPE[line.category_type]??line.category_type}</td>
                    <td className="ja-td-num">{M(line.budget_amount)}</td>
                    <td className="ja-td-num">{M(line.actual_amount)}</td>
                    <td className="ja-td-num" style={{color:Number(line.variance)<0?'var(--ja-danger)':'var(--ja-success)'}}>{M(line.variance)}</td>
                    <td className="ja-td-num">
                      <span className="ja-cartera-bar" style={{display:'inline-block',width:'5rem',verticalAlign:'middle'}}><span className={cn('ja-cartera-bar-fill',tone)} style={{width:`${Math.min(100,Math.max(0,percent))}%`}}/></span>
                      {' '}{percent.toFixed(0)}%
                    </td>
                  </tr>;
                })}
            </tbody>
          </table>}
      </section>

      {chartData.length>0&&<section className="ja-table-scroll">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ja-border)"/>
            <XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/>
            <Tooltip formatter={(v)=>M(v as number)}/><Legend/>
            <Bar dataKey="Presupuestado" fill="var(--ja-text-muted)"/>
            <Bar dataKey="Ejecutado" fill="var(--ja-primary)"/>
          </BarChart>
        </ResponsiveContainer>
      </section>}

      <div className="ja-home-metrics">
        <article className="ja-metric"><small>Ingresos</small><strong>{M(summary.income_actual)}</strong><span>de {M(summary.income_budget)}</span></article>
        <article className="ja-metric"><small>Gastos</small><strong>{M(summary.expense_actual)}</strong><span>de {M(summary.expense_budget)}</span></article>
        <article className="ja-metric"><small>Reserva disponible</small><strong>{M(summary.reserve_actual)}</strong><span>meta {M(summary.reserve_budget)}</span></article>
      </div>
    </>}

    <Dialog open={periodOpen} onClose={()=>setPeriodOpen(false)} title="Periodo fiscal y saldos iniciales"
      description="Registre únicamente los saldos reales existentes al iniciar el año. La aprobación requiere MFA.">
      <div className="ja-pos-fields">
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Saldo inicial en caja</span><input className="ja-control" type="number" min="0" step="0.01" value={periodForm.opening_cash} onChange={e=>setPeriodForm({...periodForm,opening_cash:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Saldo inicial en bancos</span><input className="ja-control" type="number" min="0" step="0.01" value={periodForm.opening_bank} onChange={e=>setPeriodForm({...periodForm,opening_bank:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Meta de reserva</span><input className="ja-control" type="number" min="0" step="0.01" value={periodForm.reserve_target} onChange={e=>setPeriodForm({...periodForm,reserve_target:e.target.value})}/></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Notas</span><textarea className="ja-control" rows={2} value={periodForm.notes} onChange={e=>setPeriodForm({...periodForm,notes:e.target.value})} placeholder="Origen de los saldos, acta de aprobación o referencia contable."/></label>
        <Button onClick={()=>void savePeriod()}>Guardar periodo</Button>
      </div>
    </Dialog>

    <Dialog open={lineOpen} onClose={()=>setLineOpen(false)} title="Rubro presupuestario"
      description="La coincidencia contable relaciona el rubro con los movimientos reales.">
      <div className="ja-pos-fields">
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Código</span><input className="ja-control" required value={lineForm.code} onChange={e=>setLineForm({...lineForm,code:e.target.value})} placeholder="ENERGIA, REPARACIONES"/></label>
          <label className="ja-field"><span className="ja-field-label">Nombre</span><input className="ja-control" required value={lineForm.name} onChange={e=>setLineForm({...lineForm,name:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Tipo</span><select className="ja-control" value={lineForm.category_type} onChange={e=>setLineForm({...lineForm,category_type:e.target.value as typeof lineForm.category_type})}><option value="income">Ingreso</option><option value="expense">Gasto</option><option value="reserve">Reserva</option></select></label>
          <label className="ja-field"><span className="ja-field-label">Monto presupuestado</span><input className="ja-control" type="number" min="0" step="0.01" value={lineForm.budget_amount} onChange={e=>setLineForm({...lineForm,budget_amount:e.target.value})}/></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Coincidencia contable</span><input className="ja-control" value={lineForm.match_pattern} onChange={e=>setLineForm({...lineForm,match_pattern:e.target.value})} placeholder="Ej.: energía, pago, combustible"/></label>
        <label className="ja-field"><span className="ja-field-label">Notas</span><input className="ja-control" value={lineForm.notes} onChange={e=>setLineForm({...lineForm,notes:e.target.value})}/></label>
        <Button disabled={!lineForm.code.trim()||!lineForm.name.trim()||!lineForm.budget_amount} onClick={()=>void saveLine()}>Agregar o actualizar rubro</Button>
      </div>
    </Dialog>
  </main>;
}
