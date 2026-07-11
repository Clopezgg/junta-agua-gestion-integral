import {useCallback,useEffect,useMemo,useState} from 'react';
import {AlertTriangle,CheckCircle2,CircleDashed,RefreshCw,ShieldCheck,XCircle} from 'lucide-react';
import {appVersion} from '../lib/version';
import {getSystemReadiness} from '../features/integrations/service';

type Check={key:string;area:string;label:string;status:'pass'|'warning'|'fail';detail:string};
type Result={generated_at?:string;checks:Check[];summary:{pass:number;warning:number;fail:number}};

export function Progress(){
  const[data,setData]=useState<Result>({checks:[],summary:{pass:0,warning:0,fail:0}});
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const remote=await getSystemReadiness() as Result;
      const clientChecks:Check[]=[
        {key:'build_version',area:'Aplicación',label:'Versión compilada',status:appVersion.version&&appVersion.commit?'pass':'fail',detail:`v${appVersion.version} · commit ${appVersion.commit}`},
        {key:'pwa_manifest',area:'Aplicación',label:'Manifiesto PWA',status:document.querySelector('link[rel="manifest"]')?'pass':'fail',detail:'El navegador detecta el manifiesto instalable.'},
        {key:'service_worker',area:'Aplicación',label:'Service worker',status:'serviceWorker' in navigator?'pass':'warning',detail:'Disponible para caché del shell; las operaciones financieras siguen requiriendo conexión.'},
        {key:'secure_context',area:'Seguridad',label:'Contexto seguro HTTPS',status:window.isSecureContext?'pass':'warning',detail:window.isSecureContext?'La aplicación se ejecuta en contexto seguro.':'Localhost puede funcionar; producción debe usar HTTPS.'}
      ];
      const checks=[...(remote.checks??[]),...clientChecks];
      setData({
        ...remote,checks,
        summary:{
          pass:checks.filter(check=>check.status==='pass').length,
          warning:checks.filter(check=>check.status==='warning').length,
          fail:checks.filter(check=>check.status==='fail').length
        }
      });
      setError('');
    }catch(e){setError((e as Error).message)}finally{setLoading(false)}
  },[]);
  useEffect(()=>{void load()},[load]);

  const percent=useMemo(()=>{
    const total=data.checks.length;
    return total?Math.round(((data.summary.pass+data.summary.warning*.5)/total)*100):0;
  },[data]);

  return <main className="content">
    <div className="titlebar"><div><h1>Diagnóstico de preparación</h1><p>Estado calculado desde la base, la sesión, los conectores y la compilación actual.</p></div><button className="outline" onClick={()=>void load()}><RefreshCw size={17}/>Recalcular</button></div>
    {error&&<div className="error">{error}</div>}
    <div className="cards readiness-summary">
      <article><CheckCircle2/><small>Correctas</small><h3>{data.summary.pass}</h3></article>
      <article><AlertTriangle/><small>Requieren configuración</small><h3>{data.summary.warning}</h3></article>
      <article><XCircle/><small>Fallidas</small><h3>{data.summary.fail}</h3></article>
      <article><ShieldCheck/><small>Preparación ponderada</small><h3>{percent}%</h3></article>
    </div>
    <section className="panel" style={{marginTop:'1rem'}}>
      <div className="progress readiness-progress"><span style={{width:`${percent}%`}}/></div>
      <p className="help">Una advertencia no equivale a una función verificada: normalmente indica credenciales, despliegue o prueba externa pendiente.</p>
    </section>
    <div className="progress-list">{loading?<section className="panel"><CircleDashed/> Calculando comprobaciones…</section>:data.checks.map(check=><section className={`panel readiness-check ${check.status}`} key={check.key}><div className="phase-head">{check.status==='pass'?<CheckCircle2 className="ok"/>:check.status==='warning'?<AlertTriangle className="warn"/>:<XCircle className="danger-text"/>}<div><strong>{check.area}: {check.label}</strong><small>{check.detail}</small></div><span className={`status-badge ${check.status==='pass'?'approved':check.status==='warning'?'fair':'critical'}`}>{check.status==='pass'?'Verificado':check.status==='warning'?'Pendiente externo':'Fallo'}</span></div></section>)}</div>
    {data.generated_at&&<p className="help">Diagnóstico de base generado: {new Date(data.generated_at).toLocaleString('es-HN')}.</p>}
  </main>;
}
