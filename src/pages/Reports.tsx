import {useCallback,useEffect,useMemo,useState} from 'react';
import {Bar,BarChart,CartesianGrid,Cell,Legend,Line,LineChart,Pie,PieChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {Download,ExternalLink,Printer,Search} from 'lucide-react';
import {getExpenseEvidenceUrl,getFinancialDashboard,getTransparencyReport} from '../features/finance/service';
import {downloadWorkbookXml} from '../features/finance/documents';
import {Button,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {formatMoney} from '../design-system/utils';

type AnyData=Record<string,any>;
const M=(v:unknown)=>formatMoney(typeof v==='number'||typeof v==='string'?v:0);
const PIE=['var(--ja-primary)','var(--ja-success)','var(--ja-warning)','var(--ja-danger)','var(--ja-text-muted)'];

export function Reports(){
  const currentYear=new Date().getFullYear();
  const [year,setYear]=useState(currentYear);
  const [data,setData]=useState<AnyData|null>(null);
  const [report,setReport]=useState<AnyData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [filter,setFilter]=useState('');

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([getFinancialDashboard(`${year}-01-01`,`${year}-12-31`),getTransparencyReport(year)])
      .then(([d,r])=>{setData(d as AnyData);setReport(r as AnyData);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[year]);
  useEffect(load,[load]);

  const monthly=data?.monthly??[];
  const expenses=useMemo(()=>report?.expenses_detail??[],[report]);
  const payments=report?.payments_detail??[];
  const overdue=report?.overdue_detail??[];
  const categories=report?.expenses_by_category??[];
  const filtered=useMemo(()=>expenses.filter((e:AnyData)=>`${e.description} ${e.reason} ${e.category} ${e.supplier}`.toLowerCase().includes(filter.toLowerCase())),[expenses,filter]);

  function exportAll(){
    downloadWorkbookXml(`transparencia-${year}.xls`,[
      {name:'Resumen mensual',headers:['Mes','Ingresos','Gastos','Resultado','Saldo acumulado'],rows:monthly.map((m:AnyData)=>[m.month,Number(m.income),Number(m.expense),Number(m.net),Number(m.running_balance)])},
      {name:'Gastos detallados',headers:['Fecha','Categoría','Descripción','Motivo','Proveedor','Monto','Factura','Origen'],rows:expenses.map((e:AnyData)=>[e.date,e.category,e.description,e.reason,e.supplier??'',Number(e.amount),e.invoice_number??'',e.paid_from??''])},
      {name:'Pagos',headers:['Fecha','Recibo','Código','Abonado','Método','Total','Estado'],rows:payments.map((p:AnyData)=>[p.date,p.receipt_number,p.subscriber_code,p.subscriber_name,p.method,Number(p.total),p.status])},
      {name:'Morosidad',headers:['Código','Abonado','Concepto','Vencimiento','Saldo'],rows:overdue.map((o:AnyData)=>[o.subscriber_code,o.subscriber_name,o.description,o.due_date,Number(o.balance)])},
      {name:'Gastos por categoría',headers:['Categoría','Total','Documentos'],rows:categories.map((c:AnyData)=>[c.category,Number(c.total),Number(c.documents)])},
    ]);
  }
  async function openEvidence(path:string){
    try{const url=await getExpenseEvidenceUrl(path);window.open(url,'_blank','noopener,noreferrer');}
    catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Dashboards e informes</h1><p>Balance, hoja financiera integrada e informe anual de transparencia con evidencias.</p></div>
      <label className="ja-field" style={{maxWidth:'7rem'}}><span className="ja-field-label">Año</span>
        <select className="ja-control" value={year} onChange={e=>setYear(Number(e.target.value))}>
          {Array.from({length:8},(_,i)=>currentYear-i).map(y=><option key={y}>{y}</option>)}
        </select>
      </label>
      <Button variant="secondary" icon={<Printer size={15}/>} onClick={()=>window.print()}>PDF / imprimir</Button>
      <Button icon={<Download size={15}/>} onClick={exportAll}>Excel completo</Button>
    </header>

    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&!data&&<Skeleton className="ja-360-skel"/>}

    {!loading&&data&&<>
      <div className="ja-home-metrics">
        <article className="ja-metric"><small>Saldo disponible</small><strong>{M(data.balance)}</strong></article>
        <article className="ja-metric"><small>Ingresos del año</small><strong>{M(data.income)}</strong></article>
        <article className="ja-metric"><small>Gastos del año</small><strong>{M(data.expense)}</strong></article>
        <article className="ja-metric"><small>Morosidad</small><strong>{M(report?.overdue_total)}</strong></article>
      </div>

      <section className="ja-table-scroll">
        <div className="ja-list-heading">Ingresos y gastos por mes</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ja-border)"/>
            <XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/>
            <Tooltip formatter={(v)=>M(v as number)}/><Legend/>
            <Bar dataKey="income" name="Ingresos" fill="var(--ja-success)"/>
            <Bar dataKey="expense" name="Gastos" fill="var(--ja-danger)"/>
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="ja-table-scroll">
        <div className="ja-list-heading">Saldo acumulado</div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ja-border)"/>
            <XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/>
            <Tooltip formatter={(v)=>M(v as number)}/>
            <Line dataKey="running_balance" name="Saldo" stroke="var(--ja-primary)" strokeWidth={3}/>
          </LineChart>
        </ResponsiveContainer>
      </section>

      {categories.length>0&&<section className="ja-table-scroll">
        <div className="ja-list-heading">Gastos por categoría</div>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={categories} dataKey="total" nameKey="category" outerRadius={95} label>
              {categories.map((_:AnyData,i:number)=><Cell key={i} fill={PIE[i%PIE.length]}/>)}
            </Pie>
            <Tooltip formatter={(v)=>M(v as number)}/>
          </PieChart>
        </ResponsiveContainer>
      </section>}

      <section className="ja-table-scroll">
        <div className="ja-list-heading">Hoja financiera integrada</div>
        <table className="ja-table">
          <thead><tr><th>Mes</th><th className="ja-td-num">Ingresos</th><th className="ja-td-num">Gastos</th><th className="ja-td-num">Resultado</th><th className="ja-td-num">Saldo acumulado</th></tr></thead>
          <tbody>
            {monthly.length===0
              ?<tr><td colSpan={5} className="ja-table-empty">Sin movimientos en {year}.</td></tr>
              :monthly.map((m:AnyData)=><tr key={m.month}>
                <td>{m.month}</td>
                <td className="ja-td-num">{M(m.income)}</td>
                <td className="ja-td-num">{M(m.expense)}</td>
                <td className="ja-td-num">{M(m.net)}</td>
                <td className="ja-td-num">{M(m.running_balance)}</td>
              </tr>)}
          </tbody>
        </table>
      </section>

      <section className="ja-table-scroll">
        <div className="ja-list-heading" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'1rem'}}>
          <span>Gastos reales y evidencias</span>
          <span className="ja-search-field"><Search size={15}/><input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filtrar gastos"/></span>
        </div>
        <table className="ja-table">
          <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th>Motivo</th><th>Proveedor</th><th className="ja-td-num">Monto</th><th>Factura</th></tr></thead>
          <tbody>
            {filtered.length===0
              ?<tr><td colSpan={7} className="ja-table-empty">Sin gastos que coincidan.</td></tr>
              :filtered.map((e:AnyData)=><tr key={e.id}>
                <td>{e.date}</td><td>{e.category}</td><td>{e.description}</td><td>{e.reason}</td><td>{e.supplier??'—'}</td>
                <td className="ja-td-num">{M(e.amount)}</td>
                <td>{e.invoice_path
                  ?<Button variant="secondary" icon={<ExternalLink size={13}/>} onClick={()=>void openEvidence(e.invoice_path)}>{e.invoice_number||'Ver'}</Button>
                  :'Sin evidencia'}</td>
              </tr>)}
          </tbody>
        </table>
      </section>

      <section className="ja-list">
        <h3 className="ja-list-heading">Informe anual de transparencia {year}</h3>
        <p style={{color:'var(--ja-text-muted)',margin:'0 0 .75rem'}}>{report?.summary??'El informe se genera desde movimientos confirmados, sin exponer identidades completas.'}</p>
        <div className="ja-home-metrics">
          <article className="ja-metric"><small>Ingresos respaldados</small><strong>{report?.income_count??0}</strong></article>
          <article className="ja-metric"><small>Gastos con factura</small><strong>{report?.expense_count??0}</strong></article>
          <article className="ja-metric"><small>Recibos anulados</small><strong>{report?.void_count??0}</strong></article>
          <article className="ja-metric"><small>Obligaciones vencidas</small><strong>{overdue.length}</strong></article>
        </div>
      </section>
    </>}

    {!loading&&!data&&!error&&<EmptyState title="Sin datos" description="No hay información financiera para el año seleccionado."/>}
  </main>;
}
