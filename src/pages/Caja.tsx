import {useEffect,useState} from 'react';
import {Banknote,Power} from 'lucide-react';
import {openCashSession,getActiveCashSession,closeCashSession} from '../features/finance/service';
import {useAuth} from '../contexts/AuthContext';

export function Caja(){
 const auth=useAuth();
 const [session,setSession]=useState<any>(null);
 const [error,setError]=useState('');
 const money=(v:unknown)=>`L ${Number(v??0).toLocaleString('es-HN',{minimumFractionDigits:2})}`;
 const load=()=>{void getActiveCashSession().then(s=>setSession(s)).catch(()=>setSession(null));};
 useEffect(load,[]);
 const open=async()=>{const amt=prompt('Monto de apertura (L)');if(!amt)return;try{await openCashSession({opening_amount:Number(amt)});load();}catch(err){setError((err as Error).message);}};
 const close=async()=>{const counted=prompt('Monto contado (L)');if(!counted)return;if(!session)return;try{await closeCashSession({session_id:session.id,counted_amount:Number(counted)});setSession(null);}catch(err){setError((err as Error).message);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Tesorería</span><h1>Caja</h1><p>Apertura, operación y cierre de la caja del día.</p></div></div>
  {error&&<div className="notice">{error}</div>}
  <section className="panel" style={{marginTop:'1rem'}}>
   {!session
    ? <div className="empty empty-state"><Banknote size={24}/><p>No hay caja abierta.</p>{auth.has('cash.manage')&&<button className="primary" onClick={open}><Power size={16}/> Abrir caja</button>}</div>
    : <div><strong>Caja {session.id?.slice(0,8)}</strong><p>Monto esperado: {money(session.expected_amount)}</p><span className="status-badge approved">Abierta</span>{auth.has('cash.manage')&&<button className="danger" style={{marginLeft:'1rem'}} onClick={close}>Cerrar caja</button>}</div>}
  </section>
  <section className="panel" style={{marginTop:'1rem'}}><div className="panel-heading"><div><h2>Cobrar</h2><p>El flujo de cobro (encontrar abonado → cobrar → recibo) está en <a href="/pagos">Cobrar</a>.</p></div></div></section>
 </main>;
}
