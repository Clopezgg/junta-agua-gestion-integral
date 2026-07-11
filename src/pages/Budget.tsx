import {useCallback,useEffect,useMemo,useState} from 'react';
import {BadgeCheck,Landmark,Plus,TrendingDown,TrendingUp,WalletCards} from 'lucide-react';
import {Bar,BarChart,CartesianGrid,Legend,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {approveBudget,getBudgetDashboard,saveBudgetLine,saveFiscalPeriod,type BudgetDashboard} from '../features/budget/service';
import {useAuth} from '../contexts/AuthContext';

const money=(value:unknown)=>`L ${Number(value??0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export function Budget(){
  const auth=useAuth();
  const[year,setYear]=useState(new Date().getFullYear());
  const[data,setData]=useState<BudgetDashboard|null>(null);
  const[error,setError]=useState('');
  const[message,setMessage]=useState('');
  const[periodForm,setPeriodForm]=useState({opening_cash:'0',opening_bank:'0',reserve_target:'0',notes:''});
  const[lineForm,setLineForm]=useState({code:'',name:'',category_type:'expense' as 'income'|'expense'|'reserve',match_pattern:'',budget_amount:'',notes:''});

  const load=useCallback(async()=>{
    try{
      const next=await getBudgetDashboard(year);
      setData(next);
      if(next.period)setPeriodForm({
        opening_cash:String(next.period.opening_cash??0),
        opening_bank:String(next.period.opening_bank??0),
        reserve_target:String(next.period.reserve_target??0),
        notes:next.period.notes??''
      });
      setError('');
    }catch(e){setError((e as Error).message)}
  },[year]);

  useEffect(()=>{void load()},[load]);

  const chartData=useMemo(()=>data?.lines.map(line=>({
    name:line.code,
    Presupuestado:Number(line.budget_amount),
    Ejecutado:Number(line.actual_amount)
  }))??[],[data]);

  const summary=data?.summary??{};
  const expensePercent=Number(summary.expense_budget??0)>0
    ?Number(summary.expense_actual??0)/Number(summary.expense_budget)*100
    :0;

  async function savePeriod(){
    try{
      await saveFiscalPeriod({
        fiscal_year:year,
        opening_cash:Number(periodForm.opening_cash),
        opening_bank:Number(periodForm.opening_bank),
        reserve_target:Number(periodForm.reserve_target),
        notes:periodForm.notes
      });
      setMessage('Periodo fiscal y saldos iniciales guardados con auditoría.');
      await load();
    }catch(e){setError((e as Error).message)}
  }

  async function saveLine(){
    if(!data?.period)return;
    try{
      await saveBudgetLine({
        fiscal_period_id:data.period.id,
        code:lineForm.code,
        name:lineForm.name,
        category_type:lineForm.category_type,
        match_pattern:lineForm.match_pattern,
        budget_amount:Number(lineForm.budget_amount),
        notes:lineForm.notes
      });
      setLineForm({code:'',name:'',category_type:'expense',match_pattern:'',budget_amount:'',notes:''});
      setMessage('Rubro presupuestario guardado.');
      await load();
    }catch(e){setError((e as Error).message)}
  }

  async function approve(){
    try{
      await approveBudget(year);
      setMessage('Presupuesto aprobado con MFA. Desde ahora queda identificado como presupuesto oficial.');
      await load();
    }catch(e){setError((e as Error).message)}
  }

  return <main className="content">
    <div className="titlebar">
      <div><h1>Presupuesto y sostenibilidad financiera</h1><p>Saldos iniciales, presupuesto anual, reservas y ejecución real.</p></div>
      <div className="actions">
        <label>Año fiscal<select value={year} onChange={e=>setYear(Number(e.target.value))}>{[year-2,year-1,year,year+1].map(value=><option key={value}>{value}</option>)}</select></label>
        {data?.period?.status==='draft'&&auth.has('budget.manage')&&<button onClick={()=>void approve()}><BadgeCheck size={18}/>Aprobar presupuesto</button>}
      </div>
    </div>
    {error&&<div className="error">{error}</div>}
    {message&&<div className="notice">{message}</div>}

    <div className="cards budget-cards">
      <article><small>Saldo inicial</small><h3>{money(Number(data?.period?.opening_cash??0)+Number(data?.period?.opening_bank??0))}</h3><span>Caja + bancos</span></article>
      <article><small>Saldo financiero actual</small><h3>{money(data?.current_balance)}</h3><span>Incluye movimientos contabilizados</span></article>
      <article><small>Ejecución del gasto</small><h3>{expensePercent.toFixed(1)}%</h3><span className={expensePercent>100?'danger-text':'ok'}>{expensePercent>100?'Presupuesto excedido':'Dentro del presupuesto'}</span></article>
      <article><small>Meta de reserva</small><h3>{money(data?.period?.reserve_target)}</h3><span>Renovación y contingencias</span></article>
    </div>

    <div className="grid budget-layout">
      {auth.has('budget.manage')&&<section className="panel">
        <h2><Landmark size={20}/> Periodo fiscal y saldos iniciales</h2>
        <p className="help">Registre únicamente los saldos reales existentes al iniciar el año. La aprobación requiere MFA.</p>
        <div className="form-grid">
          <label>Saldo inicial en caja<input type="number" min="0" step="0.01" value={periodForm.opening_cash} onChange={e=>setPeriodForm({...periodForm,opening_cash:e.target.value})}/></label>
          <label>Saldo inicial en bancos<input type="number" min="0" step="0.01" value={periodForm.opening_bank} onChange={e=>setPeriodForm({...periodForm,opening_bank:e.target.value})}/></label>
          <label>Meta de reserva<input type="number" min="0" step="0.01" value={periodForm.reserve_target} onChange={e=>setPeriodForm({...periodForm,reserve_target:e.target.value})}/></label>
          <label className="span-2">Notas<textarea value={periodForm.notes} onChange={e=>setPeriodForm({...periodForm,notes:e.target.value})} placeholder="Origen de los saldos, acta de aprobación o referencia contable."/></label>
        </div>
        <button onClick={()=>void savePeriod()}><WalletCards size={18}/>Guardar periodo</button>
      </section>}

      {auth.has('budget.manage')&&data?.period&&data.period.status!=='closed'&&<section className="panel">
        <h2><Plus size={20}/> Rubro presupuestario</h2>
        <div className="form-grid">
          <label>Código<input required value={lineForm.code} onChange={e=>setLineForm({...lineForm,code:e.target.value})} placeholder="ENERGIA, REPARACIONES, INGRESOS"/></label>
          <label>Nombre<input required value={lineForm.name} onChange={e=>setLineForm({...lineForm,name:e.target.value})}/></label>
          <label>Tipo<select value={lineForm.category_type} onChange={e=>setLineForm({...lineForm,category_type:e.target.value as typeof lineForm.category_type})}><option value="income">Ingreso</option><option value="expense">Gasto</option><option value="reserve">Reserva</option></select></label>
          <label>Monto presupuestado<input type="number" min="0" step="0.01" value={lineForm.budget_amount} onChange={e=>setLineForm({...lineForm,budget_amount:e.target.value})}/></label>
          <label>Coincidencia contable<input value={lineForm.match_pattern} onChange={e=>setLineForm({...lineForm,match_pattern:e.target.value})} placeholder="Ej.: energía, pago, combustible"/><small className="help">Se usa para relacionar el rubro con movimientos reales.</small></label>
          <label>Notas<input value={lineForm.notes} onChange={e=>setLineForm({...lineForm,notes:e.target.value})}/></label>
        </div>
        <button disabled={!lineForm.code.trim()||!lineForm.name.trim()||!lineForm.budget_amount} onClick={()=>void saveLine()}><Plus size={18}/>Agregar o actualizar rubro</button>
      </section>}
    </div>

    <section className="panel" style={{marginTop:'1rem'}}>
      <div className="titlebar"><div><h2>Presupuesto vs. ejecutado</h2><p>Semáforo financiero por rubro.</p></div><span className={`status-badge ${data?.period?.status??'draft'}`}>{data?.period?.status==='approved'?'Aprobado':data?.period?.status==='closed'?'Cerrado':'Borrador'}</span></div>
      {!data?.period?<div className="empty">Cree el periodo fiscal para comenzar.</div>:<>
        <div className="table-scroll"><table><thead><tr><th>Rubro</th><th>Tipo</th><th>Presupuesto</th><th>Ejecutado</th><th>Variación</th><th>Avance</th></tr></thead><tbody>{data.lines.map(line=>{
          const percent=Number(line.execution_percent);
          const tone=line.category_type==='expense'&&percent>100?'danger':percent>=80?'warning':'success';
          return <tr key={line.id}><td><strong>{line.code}</strong><small>{line.name}</small></td><td>{line.category_type==='income'?'Ingreso':line.category_type==='expense'?'Gasto':'Reserva'}</td><td>{money(line.budget_amount)}</td><td>{money(line.actual_amount)}</td><td className={Number(line.variance)<0?'danger-text':'ok'}>{money(line.variance)}</td><td><div className="budget-progress"><span className={tone} style={{width:`${Math.min(100,Math.max(0,percent))}%`}}/></div><small>{percent.toFixed(1)}%</small></td></tr>})}</tbody></table></div>
        {chartData.length>0&&<div className="chart budget-chart"><ResponsiveContainer width="100%" height={320}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip formatter={(value)=>money(value)}/><Legend/><Bar dataKey="Presupuestado" fill="#94a3b8"/><Bar dataKey="Ejecutado" fill="#0b6e75"/></BarChart></ResponsiveContainer></div>}
      </>}
    </section>

    <div className="cards budget-summary">
      <article><TrendingUp size={20}/><small>Ingresos</small><h3>{money(summary.income_actual)}</h3><span>de {money(summary.income_budget)}</span></article>
      <article><TrendingDown size={20}/><small>Gastos</small><h3>{money(summary.expense_actual)}</h3><span>de {money(summary.expense_budget)}</span></article>
      <article><Landmark size={20}/><small>Reserva disponible</small><h3>{money(summary.reserve_actual)}</h3><span>meta {money(summary.reserve_budget)}</span></article>
    </div>
  </main>;
}
