import {useEffect,useState} from 'react';
import {Building2,Landmark,Scale,CalendarDays} from 'lucide-react';
import {Link} from 'react-router-dom';
import {getGovernanceSummary} from '../features/governance/service';
import {useAuth} from '../contexts/AuthContext';

type Summary={positions?:number;meetings?:number;resolutions?:number;projects?:number};

export function Asamblea(){
 const auth=useAuth();
 const [s,setS]=useState<Summary>({});
 const [error,setError]=useState('');
 useEffect(()=>{void getGovernanceSummary().then(setS).catch(()=>setError('No se pudo cargar el resumen de gobierno.'));},[]);
 const tiles=[
  {label:'Cargos de la Junta',value:s.positions??'–',to:'/junta-directiva',icon:<Landmark size={20}/>},
  {label:'Reuniones',value:s.meetings??'–',to:'/reuniones',icon:<CalendarDays size={20}/>},
  {label:'Resoluciones',value:s.resolutions??'–',to:'/resoluciones',icon:<Scale size={20}/>},
  {label:'Proyectos',value:s.projects??'–',to:'/proyectos',icon:<Building2 size={20}/>}
 ];
 return <main className="content">
  <div className="titlebar module-hero">
   <div><span className="eyebrow">Gobierno</span><h1>Asamblea y gobierno institucional</h1><p>Órganos de gobierno, reuniones, actas, resoluciones y proyectos de la JAA.</p></div>
  </div>
  {error&&<div className="notice">{error}</div>}
  <div className="cards">
   {tiles.map(t=>(
    <Link to={t.to} key={t.label} className="panel quick-action" style={{textDecoration:'none'}}>
     <span className="quick-icon">{t.icon}</span>
     <span><strong>{t.label}</strong><small>{t.value}</small></span>
    </Link>
   ))}
  </div>
  <section className="panel" style={{marginTop:'1rem'}}>
   <div className="panel-heading"><div><h2>Asamblea general de abonados</h2><p>La máxima autoridad de la JAA, conforme al Reglamento de Juntas Administradoras de Agua.</p></div></div>
   <div className="notice">Los cargos institucionales (Presidente, Vicepresidente, Secretario, Tesorero, Fiscal, Vocal) se registran en <Link to="/junta-directiva">Junta Directiva</Link> y son independientes de los roles del sistema.</div>
   {!auth.has('governance.manage')&&<p style={{color:'var(--text-secondary)'}}>Gestione este módulo con permisos de gobierno.</p>}
  </section>
 </main>;
}
