import {useCallback,useEffect,useState} from 'react';
import {RefreshCw,Scale} from 'lucide-react';
import {getTransparencyReport,listCompliance} from '../features/compliance/service';
import {ErrorState,Skeleton} from '../design-system/primitives';

type Report={resolutions?:number;projects?:number;reports?:number;compliance?:unknown[]};

export function Transparencia(){
  const year=new Date().getFullYear();
  const [data,setData]=useState<Report>({});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([getTransparencyReport(year),listCompliance()])
      .then(([r,c])=>{setData({...(r as Report),compliance:(c as unknown[])??[]});setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[year]);
  useEffect(load,[load]);

  const cards=[
    {label:'Resoluciones del año',value:data.resolutions??0},
    {label:'Proyectos del año',value:data.projects??0},
    {label:'Informes publicados',value:data.reports??0},
    {label:'Obligaciones ERSAPS',value:Array.isArray(data.compliance)?data.compliance.length:0},
  ];

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Transparencia · {year}</h1><p>Rendición de cuentas y publicaciones institucionales.</p></div>
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading?<Skeleton className="ja-360-skel"/>:<>
      <div className="ja-home-metrics">
        {cards.map(c=><div key={c.label} className="ja-metric">
          <small>{c.label}</small>
          <strong>{c.value}</strong>
        </div>)}
      </div>

      <section className="ja-list">
        <h3 className="ja-list-heading"><Scale size={16}/> Instrumentos de transparencia</h3>
        <article className="ja-list-row"><div><strong>Estado financiero y libro mayor</strong><span className="ja-cell-sub">Informe anual de ingresos, gastos y saldos.</span></div></article>
        <article className="ja-list-row"><div><strong>Resoluciones y actas públicas</strong><span className="ja-cell-sub">Documentos normativos y minutas aprobadas.</span></div></article>
        <article className="ja-list-row"><div><strong>Ejecución de proyectos y presupuesto</strong><span className="ja-cell-sub">Avance físico y financiero de las obras.</span></div></article>
      </section>
    </>}
  </main>;
}
