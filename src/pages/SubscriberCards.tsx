import {useEffect,useState} from 'react';
import {BadgeCheck,Camera,MapPin,Search,ShieldCheck,UserRound,WalletCards,Waves} from 'lucide-react';
import {getSubscriberDigitalCard,getSubscriberDocumentUrl,searchSubscribers,uploadSubscriberPhoto} from '../features/subscribers/service';
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

  async function search(){try{setResults(await searchSubscribers(query));setError('')}catch(e){setError((e as Error).message)}}
  async function open(id:string){try{const data=await getSubscriberDigitalCard(id);setCard(data);setPhotoUrl(await getSubscriberDocumentUrl(data?.photo_path));setError('')}catch(e){setError((e as Error).message)}}
  useEffect(()=>{if(query.trim().length===0)void search()},[]);
  async function upload(file?:File){if(!file||!card)return;try{const path=await uploadSubscriberPhoto(card.id,file);setPhotoUrl(await getSubscriberDocumentUrl(path));setCard({...card,photo_path:path});setMessage('Fotografía actualizada y registrada en auditoría.')}catch(e){setError((e as Error).message)}}

  return <main className="content">
    <div className="titlebar"><div><h1>Fichas digitales de abonados</h1><p>Identidad, fotografía, pegues, beneficios e historial anual en una vista institucional.</p></div></div>
    {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}
    <div className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void search()}} placeholder="Código, nombre o identidad"/><button onClick={()=>void search()}><Search size={17}/>Buscar</button></div>
    <div className="subscriber-card-layout">
      <section className="panel card-results"><h2>Resultados</h2>{results.map(row=><button className="list-button" key={row.subscriber_id} onClick={()=>void open(row.subscriber_id)}><strong>{row.subscriber_code} · {row.full_name}</strong><small>{row.masked_document} · {row.sector}</small></button>)}{results.length===0&&<div className="empty">No hay resultados.</div>}</section>
      <section>{card?<div className="digital-member-card">
        <div className="member-card-hero">
          <div className="member-card-brand"><span><Waves size={25}/></span><div><strong>Junta Patronal de Agua Potable</strong><small>El Achiotal · Santa Cruz de Yojoa</small></div></div>
          <div className="member-card-identity">
            <div className="member-photo">{photoUrl?<img src={photoUrl} alt={`Fotografía de ${card.full_name}`}/>:<UserRound size={58}/>} {auth.has('subscribers.update')&&<label className="photo-action" title="Actualizar fotografía"><Camera size={16}/><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void upload(e.target.files?.[0])}/></label>}</div>
            <div><span className="eyebrow">Abonado registrado</span><h2>{card.full_name}</h2><div className="member-code">CUENTA {card.code}</div><div className="member-id">IDENTIDAD {card.identity_masked||'NO DISPONIBLE'}</div></div>
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
  </main>;
}
