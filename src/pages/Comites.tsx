import {useEffect,useState} from 'react';
import {Users,UserPlus} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';

type Committee={id:string;name:string;committee_type:string;purpose:string;active:boolean};

export function Comites(){
 const auth=useAuth();
 const [items,setItems]=useState<Committee[]>([]);
 const [error,setError]=useState('');
 useEffect(()=>{if(!auth.has('governance.read'))return;
  (async()=>{const {supabase}=await import('../lib/supabase');const {data,error}=await supabase!.from('committees').select('id,name,committee_type,purpose,active').order('name');if(error)setError(error.message);else if(data)setItems(data);})();},[auth]);
 const create=async()=>{const name=prompt('Nombre del comité');if(!name)return;
  const type=prompt('Tipo (agua/saneamiento/ambiente/control_fiscal/compras/protocolo/otro)')||'otro';
  const {supabase}=await import('../lib/supabase');const {error}=await supabase!.rpc('create_committee',{p_name:name,p_type:type,p_purpose:null});if(error)setError(error.message);else {const {data}=await supabase!.from('committees').select('id,name,committee_type,purpose,active');if(data)setItems(data);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Gobierno</span><h1>Comités</h1><p>Comités de la JAA (agua, saneamiento, ambiente, control fiscal, entre otros).</p></div></div>
  {error&&<div className="notice">{error}</div>}
  {auth.has('governance.manage')&&<button className="primary" onClick={create}><UserPlus size={16}/> Nuevo comité</button>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {items.length===0&&<div className="panel"><div className="empty empty-state"><Users size={22}/><p>Sin comités registrados.</p></div></div>}
   {items.map(c=><article key={c.id} className="panel"><strong>{c.name}</strong><span>{c.committee_type}</span><small>{c.purpose||'Sin propósito'}</small></article>)}
  </div>
 </main>;
}
