import {useEffect,useState} from 'react';
import {CalendarDays,Plus} from 'lucide-react';
import {listRationalizations} from '../features/water/service';
import {useAuth} from '../contexts/AuthContext';

type Rational={id:string;rational_type:string;status:string;title:string;description:string|null;zones:string[]|null;starts_at:string;ends_at:string|null};

export function Continuidad(){
 const auth=useAuth();
 const [items,setItems]=useState<Rational[]>([]);
 const [error,setError]=useState('');
 const load=()=>{void listRationalizations().then(i=>setItems((i as Rational[])??[])).catch(()=>setError('No se pudieron cargar los racionamientos.'));};
 useEffect(load,[]);
 const create=async()=>{const title=prompt('Título del racionamiento');if(!title)return;
  const type=prompt('Tipo (racionamiento/corte_planificado/horario_restriccion)')||'racionamiento';
  const starts=prompt('Inicio (YYYY-MM-DDTHH:MM)');if(!starts)return;
  const {supabase}=await import('../lib/supabase');
  const {error}=await supabase!.rpc('create_rationalization',{p_rational_type:type,p_title:title,p_starts_at:starts,p_ends_at:null,p_description:null,p_zones:null});
  if(error)setError(error.message);else load();};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Agua y ambiente</span><h1>Continuidad y racionamientos</h1><p>Horarios de prestación del servicio, racionamientos y cortes planificados.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  {auth.has('water.manage')&&<button className="primary" onClick={create}><Plus size={16}/> Nuevo racionamiento</button>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {items.length===0&&<div className="panel"><div className="empty empty-state"><CalendarDays size={22}/><p>Sin racionamientos programados.</p></div></div>}
   {items.map(r=><article key={r.id} className="panel"><strong>{r.title}</strong><span>{r.rational_type} · {r.status}</span><small>{new Date(r.starts_at).toLocaleString('es-HN')}{r.ends_at?` → ${new Date(r.ends_at).toLocaleString('es-HN')}`:''}</small>{r.zones&&r.zones.length>0&&<small>Zonas: {r.zones.join(', ')}</small>}</article>)}
  </div>
 </main>;
}
