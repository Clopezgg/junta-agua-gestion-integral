import {useEffect,useState} from 'react';
import {Scale} from 'lucide-react';
import {getTransparencyReport,listCompliance} from '../features/compliance/service';

type Report={resolutions?:number;projects?:number;reports?:number;compliance?:unknown[]};

export function Transparencia(){
 const [data,setData]=useState<Report>({});
 const [error,setError]=useState('');
 const year=new Date().getFullYear();
 useEffect(()=>{void Promise.all([getTransparencyReport(year),listCompliance()]).then(([r,c])=>{setData({...(r as Report),compliance:(c as unknown[])??[]});}).catch(()=>setError('No se pudo cargar el reporte de transparencia.'));},[year]);
 const cards=[
  {label:'Resoluciones del año',value:data.resolutions??0},
  {label:'Proyectos del año',value:data.projects??0},
  {label:'Informes publicados',value:data.reports??0},
  {label:'Obligaciones ERSAPS',value:Array.isArray(data.compliance)?data.compliance.length:0}
 ];
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Cumplimiento</span><h1>Transparencia</h1><p>Rendición de cuentas y publicaciones institucionales · {year}.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  <div className="cards">
   {cards.map(c=><article key={c.label} className="panel"><small>{c.label}</small><h3>{c.value}</h3></article>)}
  </div>
  <section className="panel" style={{marginTop:'1rem'}}><div className="panel-heading"><div><h2><Scale size={18}/> Instrumentos de transparencia</h2></div></div>
   <ul>
    <li>Estado financiero y libro mayor (informe anual).</li>
    <li>Resoluciones y actas públicas.</li>
    <li>Ejecución de proyectos y presupuesto.</li>
   </ul>
  </section>
 </main>;
}
