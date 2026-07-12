import {useEffect,useState} from 'react';
import {BadgeCheck,Camera,Copy,KeyRound,MapPin,Search,ShieldCheck,UserRound,WalletCards,Waves,X} from 'lucide-react';
import {getSubscriberDigitalCard,getSubscriberDocumentUrl,searchSubscribers,uploadSubscriberPhoto} from '../features/subscribers/service';
import {createPortalAccess} from '../features/portal/service';
import {useAuth} from '../contexts/AuthContext';

type Row=Record<string,any>;
const money=(value:unknown)=>new Intl.NumberFormat('es-HN',{style:'currency',currency:'HNL'}).format(Number(value??0));

export function SubscriberCards(){
  const auth=useAuth();
  const[query,setQuery]=useState('');
  const[results,setResults]=useState<Row[]>([]);
  const[card,setCard]=useState<Row|null>(null);
  const[photoUrl,setPhotoUrl]=useState('');
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');
  const[portalOpen,setPortalOpen]=useState(false);
  const[temporaryPassword,setTemporaryPassword]=useState('');
  const[portalResult,setPortalResult]=useState<Row|null>(null);

  async function search(){try{setResults(await searchSubscribers(query));setError('')}catch(e){setError((e as Error).message)}}
  async function open(id:string){try{const data=await getSubscriberDigitalCard(id);setCard(data);setPhotoUrl(await getSubscriberDocumentUrl(data?.photo_path));setPortalResult(null);setError('')}catch(e){setError((e as Error).message)}}
  useEffect(()=>{if(query.trim().length===0)void search()},[]);
  async function upload(file?:File){if(!file||!card)return;try{const path=await uploadSubscriberPhoto(card.id,file);setPhotoUrl(await getSubscriberDocumentUrl(path));setCard({...card,photo_path:path});setMessage('Fotografía actualizada y registrada en auditoría.')}catch(e){setError((e as Error).message)}}
  async function createAccess(){if(!card)return;try{const result=await createPortalAccess(card.id,temporaryPassword||undefined);setPortalResult(result);setTemporaryPassword('');setMessage('Acceso del abonado creado o restablecido con MFA.')}catch(e){setError((e as Error).message)}}
  async function copyAccess(){if(!portalResult)return;await navigator.clipboard.writeText(`DNI: ${portalResult.dni_masked}\nContraseña temporal: ${portalResult.temporary_password}\nPortal: ${window.location.origin}/portal`);setMessage('Datos temporales copiados. Entréguelos únicamente al titular.')}

  return <main className="content">
    <div className="titlebar module-hero"><div><span className="eyebrow">Identificación comunitaria</span><h1>Fichas digitales de abonados</h1><p>Identidad, fotografía, pegues, beneficios, historial anual y acceso seguro al portal.</p></div></div>
    {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}
    <div className="search command-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void search()}} placeholder="Código, nombre o identidad"/><button onClick={()=>void search()}><Search size={17}/>Buscar</button></div>
    <div className="subscriber-card-layout">
      <section className="panel card-results"><div className="panel-heading"><div><h2>Resultados</h2><p>{results.length} abonado{results.length===1?'':'s'}</p></div></div>{results.map(row=><button className="list-button" key={row.subscriber_id} onClick={()=>void open(row.subscriber_id)}><strong>{row.subscriber_code} · {row.full_name}</strong><small>{row.masked_document} · {row.sector}</small></button>)}{results.length===0&&<div className="empty">No hay resultados.</div>}</section>
      <section>{card?<div className="digital-member-card">
        <div className="member-card-hero">
          <div className="member-card-brand"><span><Waves size={25}/></span><div><strong>Junta Patronal de Agua Potable</strong><small>El Achiotal · Santa Cruz de Yojoa</small></div></div>
          <div className="member-card-identity">
            <div className="member-photo">{photoUrl?<img src={photoUrl} alt={`Fotografía de ${card.full_name}`}/>:<UserRound size={58}/>} {auth.has('subscribers.update')&&<label className="photo-action" title="Actualizar fotografía"><Camera size={16}/><input type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={e=>{void upload(e.target.files?.[0]);e.currentTarget.value=''}}/></label>}</div>
            <div><span className="eyebrow">Abonado registrado</span><h2>{card.full_name}</h2><div className="member-code">CUENTA {card.code}</div><div className="member-id">IDENTIDAD {card.identity_masked||'NO DISPONIBLE'}</div>{auth.has('portal.manage')&&<button className="member-portal-action" onClick={()=>setPortalOpen(true)}><KeyRound size={16}/>Crear o restablecer acceso</button>}</div>
          </div>
          <div className="member-badges"><span><ShieldCheck size={15}/>{card.status==='active'?'Servicio activo':card.status}</span><span><MapPin size={15}/>{card.sector||'Sin sector'}</span><span><BadgeCheck size={15}/>{card.age!=null?`${card.age} años`:'Edad pendiente'}</span></div>
        </div>
        <div className="member-summary-grid">
          <article><small>Pegues activos</small><strong>{card.active_connections??0}</strong></article>
          <article><small>Beneficios</small><strong>{(card.benefits??[]).filter((benefit:Row)=>benefit.status==='active').length}</strong></article>
          <article><small>Último estado</small><strong>{card.annual_status?.[0]?.status==='paid'?'Solvente':card.annual_status?.[0]?.status==='overdue'?'Moroso':'Pendiente'}</strong></article>
        </div>
        <div className="member-details-grid">
          <section><h3><MapPin size={17}/> Pegues</h3>{(card.connections??[]).map((connection:Row)=><div className="member-line" key={connection.id}><span><strong>{connection.code}</strong><small>{connection.address||connection.sector}</small></span><b>{connection.status}</b></div>)}</section>
          <section><h3><BadgeCheck size={17}/> Beneficios</h3>{(card.benefits??[]).length===0?<p className="empty">Sin beneficios activos.</p>:(card.benefits??[]).map((benefit:Row,index:number)=><div className="member-line" key={`${benefit.code}-${index}`}><span><strong>{benefit.name}</strong><small>{benefit.status}</small></span><b>{benefit.percentage}%</b></div>)}</section>
          <section><h3><WalletCards size={17}/> Historial anual</h3>{(card.annual_status??[]).slice(0,6).map((year:Row,index:number)=><div className="member-line" key={`${year.year}-${index}`}><span><strong>{year.year}</strong><small>{year.status==='paid'?'Pagado':year.status==='overdue'?'Vencido':'Pendiente'}</small></span><b>{money(year.balance)}</b></div>)}</section>
        </div>
      </div>:<div className="panel empty member-empty"><UserRound size={52}/><h2>Seleccione un abonado</h2><p>La ficha reunirá fotografía, identidad protegida, pegues, beneficios y estado anual.</p></div>}</section>
    </div>
    {portalOpen&&card&&<div className="modal"><div className="modal-card"><div className="titlebar"><div><h2>Acceso del abonado</h2><p>{card.full_name} · {card.identity_masked}</p></div><button className="outline" onClick={()=>{setPortalOpen(false);setPortalResult(null)}}><X size={17}/>Cerrar</button></div>{portalResult?<div className="portal-credential-result"><ShieldCheck size={32}/><h3>Acceso preparado</h3><p>Entregue estos datos únicamente al titular. La contraseña debe cambiarse al primer ingreso.</p><div><small>DNI</small><strong>{portalResult.dni_masked}</strong></div><div><small>Contraseña temporal</small><code>{portalResult.temporary_password}</code></div><div><small>Dirección del portal</small><strong>{window.location.origin}/portal</strong></div><button onClick={()=>void copyAccess()}><Copy size={17}/>Copiar datos temporales</button></div>:<><div className="warning-box"><ShieldCheck size={20}/><p>La cuenta utilizará el DNI como identificador y una contraseña privada. No se permitirá entrar únicamente con el número de identidad.</p></div><label>Contraseña temporal opcional<input type="password" minLength={10} value={temporaryPassword} onChange={e=>setTemporaryPassword(e.target.value)} placeholder="Déjelo vacío para generar una segura"/></label><button disabled={temporaryPassword.length>0&&temporaryPassword.length<10} onClick={()=>void createAccess()}><KeyRound size={17}/>Crear o restablecer acceso</button></>}</div></div>}
  </main>;
}
