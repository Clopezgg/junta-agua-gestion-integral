import {useEffect,useState} from 'react';
import {Sparkles,Plus} from 'lucide-react';
import {listWatersheds} from '../features/water/service';
import {useAuth} from '../contexts/AuthContext';
import {supabase} from '../lib/supabase';

type Watershed={id:string;name:string;code:string|null;protection_status:string|null;description:string|null};

export function Microcuenca(){
 const auth=useAuth();
 const [items,setItems]=useState<Watershed[]>([]);
 const [error,setError]=useState('');
 const load=()=>{void listWatersheds().then(w=>setItems((w as Watershed[])??[])).catch(()=>setError('No se pudo cargar la microcuenca.'));};
 useEffect(load,[]);
 const create=async()=>{const name=prompt('Nombre de la microcuenca');if(!name)return;
  const {error}=await supabase!.rpc('register_watershed',{p_name:name,p_code:null,p_protection_status:null,p_description:null});
  if(error)setError(error.message);else load();};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Agua y ambiente</span><h1>Microcuenca</h1><p>Cuencas de recarga, protección y monitoreo del recurso hídrico.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  {auth.has('water.manage')&&<button className="primary" onClick={create}><Plus size={16}/> Nueva microcuenca</button>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {items.length===0&&<div className="panel"><div className="empty empty-state"><Sparkles size={22}/><p>Sin microcuencas registradas.</p></div></div>}
   {items.map(w=><article key={w.id} className="panel"><strong>{w.name}</strong><span>{w.code||'sin código'}</span><small>{w.protection_status||'Sin estado de protección'}</small>{w.description&&<small>{w.description}</small>}</article>)}
  </div>
 </main>;
}
