import {useState} from 'react';
import {IdCard,Plus} from 'lucide-react';
import {createPerson} from '../features/identity/service';
import {Button,Dialog,ErrorState} from '../design-system/primitives';

const MODEL=[
  {k:'PERSONA',d:'Registro maestro de persona física o jurídica.'},
  {k:'ABONADO',d:'Cliente de la Junta de Agua (relación sobre una persona).'},
  {k:'INMUEBLE',d:'Predio o ubicación de servicio (service_locations).'},
  {k:'CONTRATO',d:'Servicio contratado (service_contracts) sobre un pegue.'},
  {k:'PEGUE',d:'Conexión con medidor (water_connections).'},
];

export function PeguesContratos(){
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState({full_name:'',document_type:'dni',document_number:'',whatsapp:''});

  async function create(e:React.FormEvent){
    e.preventDefault();
    try{
      await createPerson({full_name:form.full_name.trim(),document_type:form.document_type,
        document_number:form.document_number.trim(),whatsapp:form.whatsapp.trim()||undefined});
      setForm({full_name:'',document_type:'dni',document_number:'',whatsapp:''});
      setOpen(false);setNotice('Persona registrada en el maestro de identidad.');
    }catch(err){setError((err as Error).message);}
  }

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Pegues y contratos</h1><p>Modelo de identidad: PERSONA ≠ ABONADO ≠ INMUEBLE ≠ CONTRATO ≠ PEGUE.</p></div>
      <Button icon={<Plus size={15}/>} onClick={()=>setOpen(true)}>Registrar persona</Button>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={()=>setError('')}/>}

    <section className="ja-list">
      <h3 className="ja-list-heading"><IdCard size={16}/> Modelo de identidad</h3>
      {MODEL.map(m=><article key={m.k} className="ja-list-row">
        <div><strong>{m.k}</strong><span className="ja-cell-sub">{m.d}</span></div>
      </article>)}
    </section>

    <Dialog open={open} onClose={()=>setOpen(false)} title="Registrar persona (maestro de identidad)">
      <form className="ja-pos-fields" onSubmit={create}>
        <label className="ja-field"><span className="ja-field-label">Nombre completo</span>
          <input className="ja-control" required minLength={3} value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/>
        </label>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Tipo de documento</span>
            <select className="ja-control" value={form.document_type} onChange={e=>setForm({...form,document_type:e.target.value})}>
              <option value="dni">DNI</option><option value="passport">Pasaporte</option><option value="other">Otro</option>
            </select>
          </label>
          <label className="ja-field"><span className="ja-field-label">Número de documento</span>
            <input className="ja-control" value={form.document_number} onChange={e=>setForm({...form,document_number:e.target.value})}/>
          </label>
        </div>
        <label className="ja-field"><span className="ja-field-label">WhatsApp (opcional)</span>
          <input className="ja-control" value={form.whatsapp} onChange={e=>setForm({...form,whatsapp:e.target.value})} placeholder="+504…"/>
        </label>
        <Button type="submit">Crear persona</Button>
      </form>
    </Dialog>
  </main>;
}
