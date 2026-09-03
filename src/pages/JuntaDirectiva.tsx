import {useCallback,useEffect,useState} from 'react';
import {Landmark,RefreshCw,UserPlus} from 'lucide-react';
import {createPerson,getBoardMembers,listGovernancePersons,setInstitutionalPosition} from '../features/governance/service';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,Dialog,EmptyState,ErrorState,Skeleton} from '../design-system/primitives';
import {formatDate} from '../design-system/utils';

// Cargo institucional ≠ rol del software (§64).
const POSITIONS=['presidente','vicepresidente','secretario','tesorero','fiscal','vocal'];
type Term={id:string;position:string;person_id:string;term_start:string;term_end:string;status:string};
type Member={term:Term;person?:{id:string;full_name:string}};
type Person={id:string;full_name:string;document_number:string|null;sector:string|null};

export function JuntaDirectiva(){
  const auth=useAuth();
  const manage=auth.has('governance.manage');
  const [members,setMembers]=useState<Member[]>([]);
  const [persons,setPersons]=useState<Person[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [newPersonOpen,setNewPersonOpen]=useState(false);
  const [form,setForm]=useState({position:'presidente',person_id:'',term_start:'',term_end:''});
  const [person,setPerson]=useState({full_name:'',document_type:'dni',document_number:''});

  const load=useCallback(()=>{
    setLoading(true);
    void Promise.all([getBoardMembers(),listGovernancePersons().catch(()=>[])])
      .then(([m,p])=>{setMembers(Array.isArray(m)?m:[]);setPersons(p as Person[]);setError('');})
      .catch(e=>setError((e as Error).message))
      .finally(()=>setLoading(false));
  },[]);
  useEffect(load,[load]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(!form.person_id){setError('Seleccione una persona.');return;}
    try{
      await setInstitutionalPosition({p_position:form.position,p_person_id:form.person_id,p_term_start:form.term_start,p_term_end:form.term_end});
      setForm({position:'presidente',person_id:'',term_start:'',term_end:''});
      setOpen(false);setNotice('Cargo institucional registrado.');load();
    }catch(err){setError((err as Error).message);}
  }
  async function addPerson(e:React.FormEvent){
    e.preventDefault();
    try{
      const id=await createPerson({p_full_name:person.full_name.trim(),p_document_type:person.document_type,p_document_number:person.document_number.trim()});
      setPerson({full_name:'',document_type:'dni',document_number:''});
      setNewPersonOpen(false);
      const list=await listGovernancePersons();setPersons(list as Person[]);
      setForm(f=>({...f,person_id:id}));setNotice('Persona registrada y seleccionada.');
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Junta Directiva</h1><p>Cargos institucionales de la JAA. El cargo institucional no es un rol del sistema.</p></div>
      {manage&&<Button icon={<UserPlus size={15}/>} onClick={()=>setOpen(true)}>Nombrar cargo</Button>}
      <button type="button" className="ja-tab" onClick={load}><RefreshCw size={14}/> Actualizar</button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={load}/>}
    {loading&&members.length===0&&<Skeleton className="ja-360-skel"/>}

    {!loading&&<section className="ja-list">
      {members.length===0
        ?<EmptyState icon={<Landmark size={22}/>} title="Sin cargos vigentes" description="Registre los cargos de la Junta Directiva."/>
        :members.map(m=><article key={m.term.id} className="ja-list-row">
          <div>
            <strong>{m.person?.full_name||'Persona'}</strong>
            <span className="ja-cell-sub">Vigencia {formatDate(m.term.term_start)} → {formatDate(m.term.term_end)}</span>
          </div>
          <Badge tone={m.term.status==='vigente'||m.term.status==='activo'?'success':'neutral'}>{m.term.position}</Badge>
        </article>)}
    </section>}

    <Dialog open={open} onClose={()=>setOpen(false)} title="Nombrar cargo institucional"
      description="Asocie una persona del registro maestro a un cargo. No se teclean identificadores.">
      <form className="ja-pos-fields" onSubmit={submit}>
        <label className="ja-field"><span className="ja-field-label">Persona</span>
          <select className="ja-control" required value={form.person_id} onChange={e=>setForm({...form,person_id:e.target.value})}>
            <option value="">Seleccione una persona…</option>
            {persons.map(p=><option key={p.id} value={p.id}>{p.full_name}{p.document_number?` · ${p.document_number}`:''}</option>)}
          </select>
        </label>
        {manage&&<button type="button" className="ja-link" onClick={()=>setNewPersonOpen(true)}>+ Registrar una persona nueva</button>}
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Cargo</span><select className="ja-control" value={form.position} onChange={e=>setForm({...form,position:e.target.value})}>{POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}</select></label>
          <label className="ja-field"><span className="ja-field-label">Inicio</span><input className="ja-control" type="date" required value={form.term_start} onChange={e=>setForm({...form,term_start:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Fin</span><input className="ja-control" type="date" required value={form.term_end} onChange={e=>setForm({...form,term_end:e.target.value})}/></label>
        </div>
        <Button type="submit">Guardar cargo</Button>
      </form>
    </Dialog>

    <Dialog open={newPersonOpen} onClose={()=>setNewPersonOpen(false)} title="Registrar persona">
      <form className="ja-pos-fields" onSubmit={addPerson}>
        <label className="ja-field"><span className="ja-field-label">Nombre completo</span><input className="ja-control" required minLength={3} value={person.full_name} onChange={e=>setPerson({...person,full_name:e.target.value})}/></label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Tipo de documento</span><select className="ja-control" value={person.document_type} onChange={e=>setPerson({...person,document_type:e.target.value})}><option value="dni">DNI</option><option value="passport">Pasaporte</option><option value="other">Otro</option></select></label>
          <label className="ja-field"><span className="ja-field-label">Número de documento</span><input className="ja-control" required value={person.document_number} onChange={e=>setPerson({...person,document_number:e.target.value})}/></label>
        </div>
        <Button type="submit">Registrar y seleccionar</Button>
      </form>
    </Dialog>
  </main>;
}
