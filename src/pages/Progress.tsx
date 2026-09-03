import {useCallback,useEffect,useMemo,useState} from 'react';
import {AlertTriangle,CheckCircle2,RefreshCw,ShieldCheck,XCircle} from 'lucide-react';
import {appVersion} from '../lib/version';
import {getSystemReadiness} from '../features/integrations/service';
import {Badge,ErrorState,Skeleton} from '../design-system/primitives';
import {formatDateTime} from '../design-system/utils';

type Check={key:string;area:string;label:string;status:'pass'|'warning'|'fail';detail:string};
type Result={generated_at?:string;checks:Check[];summary:{pass:number;warning:number;fail:number}};

export function Progress(){
  const [data,setData]=useState<Result>({checks:[],summary:{pass:0,warning:0,fail:0}});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const remote=await getSystemReadiness() as Result;
      const clientChecks:Check[]=[
        {key:'build_version',area:'Aplicación',label:'Versión compilada',status:appVersion.version&&appVersion.commit?'pass':'fail',detail:`v${appVersion.version} · commit ${appVersion.commit}`},
        {key:'pwa_manifest',area:'Aplicación',label:'Manifiesto PWA',status:document.querySelector('link[rel="manifest"]')?'pass':'fail',detail:'El navegador detecta el manifiesto instalable.'},
        {key:'service_worker',area:'Aplicación',label:'Service worker',status:'serviceWorker' in navigator?'pass':'warning',detail:'Disponible para caché del shell; las operaciones financieras siguen requiriendo conexión.'},
        {key:'secure_context',area:'Seguridad',label:'Contexto seguro HTTPS',status:window.isSecureContext?'pass':'warning',detail:window.isSecureContext?'La aplicación se ejecuta en contexto seguro.':'Localhost puede funcionar; producción debe usar HTTPS.'},
      ];
      const checks=[...(remote.checks??[]),...clientChecks];
      setData({...remote,checks,summary:{
        pass:checks.filter(c=>c.status==='pass').length,
        warning:checks.filter(c=>c.status==='warning').length,
        fail:checks.filter(c=>c.status==='fail').length,
      }});
      setError('');
    }catch(e){setError((e as Error).message);}finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);

  const percent=useMemo(()=>{
    const total=data.checks.length;
    return total?Math.round(((data.summary.pass+data.summary.warning*.5)/total)*100):0;
  },[data]);

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Diagnóstico de preparación</h1><p>Estado calculado desde la base, la sesión, los conectores y la compilación actual.</p></div>
      <button type="button" className="ja-tab" onClick={()=>void load()}><RefreshCw size={14}/> Recalcular</button>
    </header>

    {error&&<ErrorState error={error} onRetry={()=>void load()}/>}

    <div className="ja-home-metrics">
      <article className="ja-metric"><small>Correctas</small><strong>{data.summary.pass}</strong></article>
      <article className="ja-metric"><small>Requieren configuración</small><strong>{data.summary.warning}</strong></article>
      <article className="ja-metric"><small>Fallidas</small><strong>{data.summary.fail}</strong></article>
      <article className="ja-metric"><small>Preparación ponderada</small><strong>{percent}%</strong></article>
    </div>

    <div className="ja-banner ja-banner-info">
      Una advertencia no equivale a una función verificada: normalmente indica credenciales, despliegue o prueba externa pendiente.
    </div>

    {loading
      ?<Skeleton className="ja-360-skel"/>
      :<section className="ja-list">
        {data.checks.map(check=><article key={check.key} className="ja-list-row">
          <div style={{display:'flex',gap:'.6rem',alignItems:'flex-start'}}>
            {check.status==='pass'?<CheckCircle2 size={16} style={{color:'var(--ja-success)'}}/>:check.status==='warning'?<AlertTriangle size={16} style={{color:'var(--ja-warning)'}}/>:<XCircle size={16} style={{color:'var(--ja-danger)'}}/>}
            <span><strong>{check.area}: {check.label}</strong><span className="ja-cell-sub">{check.detail}</span></span>
          </div>
          <Badge tone={check.status==='pass'?'success':check.status==='warning'?'warning':'danger'}>
            {check.status==='pass'?'Verificado':check.status==='warning'?'Pendiente externo':'Fallo'}
          </Badge>
        </article>)}
      </section>}

    {data.generated_at&&<p style={{color:'var(--ja-text-muted)',fontSize:'.8rem'}}>Diagnóstico de base generado: {formatDateTime(data.generated_at)}.</p>}
    <p style={{color:'var(--ja-text-muted)',fontSize:'.8rem'}}><ShieldCheck size={12}/> {appVersion.version} · {appVersion.commit}</p>
  </main>;
}
