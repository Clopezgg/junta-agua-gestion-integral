import {useState} from 'react';
import {IdCard,Plus} from 'lucide-react';
import {createPerson} from '../features/identity/service';

export function PeguesContratos(){
 const [error,setError]=useState('');
 const [info,setInfo]=useState('');
 const [personForm,setPersonForm]=useState({full_name:'',document_type:'dni',document_number:'',whatsapp:''});
 const create=async(e:React.FormEvent)=>{e.preventDefault();try{const id=await createPerson({full_name:personForm.full_name,document_type:personForm.document_type,document_number:personForm.document_number,whatsapp:personForm.whatsapp||undefined});setInfo(`Persona creada: ${id}`);setPersonForm({full_name:'',document_type:'dni',document_number:'',whatsapp:''});}catch(err){setError((err as Error).message);}};
 return <main className="content">
  <div className="titlebar module-hero"><div><span className="eyebrow">Usuarios y servicio</span><h1>Pegues y contratos</h1><p>Modelo de identidad V5: PERSONA ≠ ABONADO ≠ INMUEBLE ≠ CONTRATO ≠ PEGUE.</p></div></div>
  {error&&<div className="notice danger">{error}</div>}
  {info&&<div className="notice">{info}</div>}
  <section className="panel"><div className="panel-heading"><h2><Plus size={18}/> Registrar persona (maestro)</h2></div>
   <form className="form-grid" onSubmit={create}>
    <label>Nombre completo<input required value={personForm.full_name} onChange={e=>setPersonForm({...personForm,full_name:e.target.value})}/></label>
    <label>Tipo documento<select value={personForm.document_type} onChange={e=>setPersonForm({...personForm,document_type:e.target.value})}><option value="dni">DNI</option><option value="passport">Pasaporte</option><option value="other">Otro</option></select></label>
    <label>Número<input value={personForm.document_number} onChange={e=>setPersonForm({...personForm,document_number:e.target.value})}/></label>
    <label>WhatsApp<input value={personForm.whatsapp} onChange={e=>setPersonForm({...personForm,whatsapp:e.target.value})}/></label>
    <button className="primary">Crear persona</button>
   </form></section>
  <section className="panel" style={{marginTop:'1rem'}}><div className="panel-heading"><div><h2><IdCard size={18}/> Modelo de identidad</h2></div></div>
   <ul>
    <li><strong>PERSONA</strong> — registro maestro de persona física/jurídica.</li>
    <li><strong>ABONADO</strong> — cliente de la JAA (relación sobre persona).</li>
    <li><strong>INMUEBLE</strong> — predio/ubicación de servicio (service_locations).</li>
    <li><strong>CONTRATO</strong> — servicio contratado (service_contracts) sobre un pegue.</li>
    <li><strong>PEGUE</strong> — conexión con medidor (water_connections).</li>
   </ul>
  </section>
 </main>;
}
