import {useEffect,useState} from 'react';
import {Landmark,UserPlus} from 'lucide-react';
import {getBoardMembers,setInstitutionalPosition} from '../features/governance/service';
import {useAuth} from '../contexts/AuthContext';

const POSITIONS=['presidente','vicepresidente','secretario','tesorero','fiscal','vocal'];
type Term={id:string;position:string;person_id:string;term_start:string;term_end:string;status:string};
type Member={term:Term;person?:{id:string;full_name:string}};

export function JuntaDirectiva(){
 const auth=useAuth();
 const [members,setMembers]=useState<Member[]>([]);
 const [error,setError]=useState('');
 const [form,setForm]=useState({position:'presidente',person_id:'',term_start:'',term_end:''});
 const [saving,setSaving]=useState(false);
 const load=()=>{void getBoardMembers().then(m=>setMembers(Array.isArray(m)?m:[])).catch(()=>setError('No se pudo cargar la Junta Directiva.'));};
 useEffect(load,[]);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setError('');
  try{await setInstitutionalPosition({p_position:form.position,p_person_id:form.person_id,p_term_start:form.term_start,p_term_end:form.term_end});setForm({position:'presidente',person_id:'',term_start:'',term_end:''});load();}
  catch(err){setError((err as Error).message);}finally{setSaving(false);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Gobierno</span><h1>Junta Directiva</h1><p>Cargos institucionales de la JAA (registro de personas, no roles del sistema).</p></div></div>
  {error&&<div className="notice">{error}</div>}
  <div className="cards">
   {members.length===0&&<div className="panel"><div className="empty empty-state"><Landmark size={22}/><p>Aún no hay cargos vigentes registrados.</p></div></div>}
   {members.map(m=><article key={m.term.id} className="panel"><strong>{m.person?.full_name||m.term.person_id}</strong><span>{m.term.position}</span><small>Vigencia {m.term.term_start} → {m.term.term_end}</small></article>)}
  </div>
  {auth.has('governance.manage')&&<section className="panel" style={{marginTop:'1rem'}}>
   <div className="panel-heading"><div><h2><UserPlus size={18}/> Nombrar cargo</h2><p>Asociar una persona (registro maestro) a un cargo institucional.</p></div></div>
   <form className="form-grid" onSubmit={submit}>
    <label>Persona (ID)
     <input required value={form.person_id} onChange={e=>setForm({...form,person_id:e.target.value})} placeholder="UUID de la persona"/>
    </label>
    <label>Cargo
     <select value={form.position} onChange={e=>setForm({...form,position:e.target.value})}>{POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}</select>
    </label>
    <label>Inicio
     <input type="date" required value={form.term_start} onChange={e=>setForm({...form,term_start:e.target.value})}/>
    </label>
    <label>Fin
     <input type="date" required value={form.term_end} onChange={e=>setForm({...form,term_end:e.target.value})}/>
    </label>
    <button className="primary" disabled={saving}>{saving?'Guardando…':'Guardar cargo'}</button>
   </form>
  </section>}
 </main>;
}
