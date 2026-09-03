import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Building2,CalendarDays,Landmark,Scale} from 'lucide-react';
import {getGovernanceSummary} from '../features/governance/service';
import {useAuth} from '../contexts/AuthContext';
import {EmptyState,ErrorState} from '../design-system/primitives';

type Summary={positions?:number;meetings?:number;resolutions?:number;projects?:number};

export function Asamblea(){
  const auth=useAuth();
  const [s,setS]=useState<Summary>({});
  const [error,setError]=useState('');
  useEffect(()=>{void getGovernanceSummary().then(d=>setS(d??{})).catch(e=>setError((e as Error).message));},[]);

  const tiles=[
    {label:'Cargos de la Junta',value:s.positions??'—',to:'/junta-directiva',icon:<Landmark size={18}/>},
    {label:'Reuniones',value:s.meetings??'—',to:'/reuniones',icon:<CalendarDays size={18}/>},
    {label:'Resoluciones',value:s.resolutions??'—',to:'/resoluciones',icon:<Scale size={18}/>},
    {label:'Proyectos',value:s.projects??'—',to:'/proyectos',icon:<Building2 size={18}/>},
  ];

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Asamblea y gobierno institucional</h1><p>Órganos de gobierno, reuniones, actas, resoluciones y proyectos de la Junta Administradora de Agua.</p></div>
    </header>

    {error&&<ErrorState error={error}/>}

    <div className="ja-home-metrics">
      {tiles.map(t=><Link key={t.label} to={t.to} className="ja-metric" style={{textDecoration:'none'}}>
        <small>{t.icon} {t.label}</small>
        <strong>{t.value}</strong>
        <span>Abrir</span>
      </Link>)}
    </div>

    <section className="ja-list">
      <h3 className="ja-list-heading">Asamblea general de abonados</h3>
      <div className="ja-banner ja-banner-info">
        Los cargos institucionales (Presidente, Vicepresidente, Secretario, Tesorero, Fiscal, Vocal) se registran en <Link to="/junta-directiva">Junta Directiva</Link> y son independientes de los roles del sistema.
      </div>
      {!auth.has('governance.manage')&&<EmptyState title="Consulta" description="Para gestionar este módulo se requieren permisos de gobierno."/>}
    </section>
  </main>;
}
