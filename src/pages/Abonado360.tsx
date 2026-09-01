import {useCallback,useEffect,useState} from 'react';
import {Building2,ChevronRight,CircleDot,Crosshair,FileSignature,MapPin,Plus,Search,UserRound} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {getAbonado360,registerServiceContract,searchAbonados} from '../features/identity/service';

type AbonadoRow={abonado_id:string;person_id:string;subscriber_id:string|null;full_name:string;masked_document:string|null;category:string;status:string;subscriber_code:string|null;sector:string|null;connection_count:number};

const date=(v:unknown)=>v==null||v===''?'—':new Date(String(v)).toLocaleDateString('es-HN',{day:'2-digit',month:'2-digit',year:'numeric'});
const text=(v:unknown)=>v==null||v===''?'—':String(v);
const initials=(name='')=>name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'PA';

export function Abonado360(){
 const auth=useAuth();
 const [query,setQuery]=useState('');
 const [rows,setRows]=useState<AbonadoRow[]>([]);
 const [selected,setSelected]=useState('');
 const [view,setView]=useState<any>(null);
 const [error,setError]=useState('');
 const [info,setInfo]=useState('');
 const [contractForm,setContractForm]=useState({connection_id:'',contract_type:'servicio_agua'});

 const load=useCallback(async(q='')=>{try{setRows(await searchAbonados(q) as AbonadoRow[]);}catch(e){setError(e instanceof Error?e.message:'No se pudo consultar abonados.');}},[setRows,setError]);
 useEffect(()=>{void load();},[load]);

 async function open(id:string){setSelected(id);setError('');try{setView(await getAbonado360(id));}catch(e){setError(e instanceof Error?e.message:'No se pudo abrir la ficha 360.');}}

 async function registerContract(e:React.FormEvent){e.preventDefault();setError('');setInfo('');try{const id=await registerServiceContract({p_abonado_id:selected,p_location_id:null,p_connection_id:contractForm.connection_id||null,p_contract_type:contractForm.contract_type});setInfo(`Contrato registrado: ${id}`);setContractForm({connection_id:'',contract_type:'servicio_agua'});await open(selected);}catch(err){setError((err as Error).message);}}

 const persona=view?.persona as Record<string,unknown>|undefined;
 const abonado=view?.abonado as Record<string,unknown>|undefined;
 const subscriber=view?.subscriber as Record<string,unknown>|undefined;
 const contracts=(view?.contracts as Array<Record<string,unknown>>)??[];
 const connections=(view?.connections as Array<Record<string,unknown>>)??[];
 const locations=(view?.locations as Array<Record<string,unknown>>)??[];
 const fullName=text(persona?.full_name);
 const identityLine=(persona?.document_type||abonado?.id)?`${String(persona?.document_type??'').toUpperCase()||'ID'} · ${subscriber?.code??String(abonado?.id??'').slice(0,8)}`:'';

 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Usuarios y servicio</span><h1>Abonado 360</h1><p>Vista integral: persona, abonado, predios, contratos y pegues en una sola ficha.</p></div></div>
  <div className="search command-search"><Search size={18}/><input placeholder="Buscar por nombre, documento, código o sector" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void load(query);}}/><button onClick={()=>void load(query)}>Buscar</button></div>
  {error&&<div className="notice danger">{error}</div>}
  {info&&<div className="notice">{info}</div>}
  <div className="subscriber-master-layout">
   <section className="panel subscriber-list-panel"><div className="panel-heading"><div><h2>Directorio de abonados 360</h2><p>{rows.length} registro{rows.length===1?'':'s'}</p></div></div>
    <div className="subscriber-list">{rows.map(r=><button className={`subscriber-row-card ${selected===r.abonado_id?'active':''}`} key={r.abonado_id} onClick={()=>void open(r.abonado_id)}><span className="avatar avatar-sm">{initials(r.full_name)}</span><span className="subscriber-row-main"><strong>{r.full_name}</strong><small>{r.masked_document??'sin identidad'} · {r.subscriber_code??'sin abonado legacy'}</small><span><MapPin size={13}/>{r.sector??'Sector no definido'}</span></span><span className="subscriber-row-state"><span className="status-badge approved">{r.status}</span><ChevronRight size={17}/></span></button>)}</div>
    {rows.length===0&&<div className="empty-state"><UserRound size={36}/><h3>Sin abonados 360</h3><p>No hay abonados para ese criterio. Cree la relación de abonado (sobre una persona) para ver aquí la ficha integral.</p></div>}
   </section>

   <section className="panel subscriber-profile-panel">
    {view&&abonado&&persona?<>
     <div className="profile-cover"><div className="profile-photo-wrap"><div className="profile-photo">{initials(fullName)}</div></div><div className="profile-heading"><span className="eyebrow">Ficha 360</span><h2>{fullName}</h2><p>{identityLine}</p><div className="profile-tags"><span className="status-badge approved"><CircleDot size={13}/>{String(abonado.category??'')}</span><span className={`status-badge ${String(abonado.status)==='activo'?'approved':'draft'}`}>{String(abonado.status??'')}</span></div></div></div>
     <div className="profile-summary-grid">
      <article><UserRound size={18}/><span><small>Persona</small><strong>{fullName}</strong></span></article>
      <article><Building2 size={18}/><span><small>Abonado desde</small><strong>{date(abonado.since_date)}</strong></span></article>
      <article><FileSignature size={18}/><span><small>Contratos</small><strong>{contracts.length}</strong></span></article>
      <article><CircleDot size={18}/><span><small>Pegues</small><strong>{connections.length}</strong></span></article>
      <article><Crosshair size={18}/><span><small>Predios</small><strong>{locations.length}</strong></span></article>
     </div>

     <div className="profile-section"><div className="section-heading"><div><h3>Contratos de servicio</h3><p>Relación abonado → predio → pegue.</p></div></div>
      {contracts.length===0&&<div className="empty-state"><FileSignature size={28}/><p>Sin contratos registrados.</p></div>}
      {contracts.map((c,idx)=><div className="data-row" key={idx}><span className="data-icon"><FileSignature size={17}/></span><span><strong>{String(c.contract_type??'servicio')}</strong><small>{c.connection_id?`pegue ${String(c.connection_id).slice(0,8)}`:'sin pegue'} · inicio {date(c.start_date)}</small></span><span className={`status-badge ${String(c.status)==='activo'?'approved':'draft'}`}>{String(c.status??'—')}</span></div>)}
      {auth.has('subscribers.update')&&<details className="expand-form"><summary><Plus size={16}/> Registrar contrato</summary><form className="form-grid" onSubmit={registerContract} style={{marginTop:'0.75rem'}}><label>ID del pegue (water_connection)<input placeholder="Opcional" value={contractForm.connection_id} onChange={e=>setContractForm({...contractForm,connection_id:e.target.value})}/></label><label>Tipo de contrato<select value={contractForm.contract_type} onChange={e=>setContractForm({...contractForm,contract_type:e.target.value})}><option value="servicio_agua">Servicio de agua</option><option value="servicio_alcantarillado">Alcantarillado</option><option value="ambos">Ambos</option></select></label><button className="primary">Registrar contrato</button></form></details>}
     </div>

     <div className="profile-section"><div className="section-heading"><div><h3>Pegues (conexiones)</h3><p>Puntos de servicio vinculados por contrato.</p></div></div>
      {connections.length===0&&<div className="empty-state"><CircleDot size={28}/><p>Sin pegues vinculados.</p></div>}
      {connections.map((w,idx)=><div className="data-row" key={idx}><span className="data-icon"><CircleDot size={17}/></span><span><strong>{String(w.code??'')}</strong><small>{String(w.sector??'')} · {String(w.address??'')}</small></span><span className="status-badge approved">{String(w.status??'activo')}</span></div>)}
     </div>

     <div className="profile-section"><div className="section-heading"><div><h3>Predios / ubicaciones de servicio</h3></div></div>
      {locations.length===0&&<div className="empty-state"><Crosshair size={28}/><p>Sin predios registrados.</p></div>}
      {locations.map((l,idx)=><div className="data-row" key={idx}><span className="data-icon"><Crosshair size={17}/></span><span><strong>{String(l.code??'')}</strong><small>{String(l.address??'')} · {String(l.sector??'')}</small></span><span className="status-badge draft">{String(l.property_type??'')}</span></div>)}
     </div>
    </>:<div className="empty-state tall"><Crosshair size={48}/><h3>Seleccione un abonado</h3><p>Abra una ficha del directorio para ver la vista 360 completa del cliente.</p></div>}
   </section>
  </div>
 </main>;
}
