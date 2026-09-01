import {useEffect,useState} from 'react';
import {MessagesSquare} from 'lucide-react';
import {listMessages} from '../features/communications/service';
import {useAuth} from '../contexts/AuthContext';

type Msg={id:string;channel:string;status:string;created_at:string;to?:string};

export function Comunicaciones(){
 const auth=useAuth();
 const [items,setItems]=useState<Msg[]>([]);
 const [error,setError]=useState('');
 useEffect(()=>{if(!auth.has('communications.read'))return;void listMessages().then(i=>setItems((i as Msg[])??[])).catch(()=>setError('No se pudieron cargar las comunicaciones.'));},[auth]);
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Usuarios y servicio</span><h1>Comunicaciones</h1><p>Historial de mensajes enviados por correo y WhatsApp a los abonados.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  <div className="cards" style={{marginTop:'1rem'}}>
   {items.length===0&&<div className="panel"><div className="empty empty-state"><MessagesSquare size={22}/><p>Sin comunicaciones registradas.</p></div></div>}
   {items.map(m=><article key={m.id} className="panel"><strong>{(m as unknown as {recipient?:string}).recipient??m.to??'—'}</strong><span>{m.channel} · {m.status}</span><small>{new Date(m.created_at).toLocaleString('es-HN')}</small></article>)}
  </div>
 </main>;
}
