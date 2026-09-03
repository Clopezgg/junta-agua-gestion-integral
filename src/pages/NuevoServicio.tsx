import {useEffect,useMemo,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {ArrowLeft,ArrowRight,CheckCircle2,Circle,Droplet,MapPin,Save,Search,UserPlus} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {checkDuplicates,createConnection,createSubscriber,searchSubscribers} from '../features/subscribers/service';
import {createServiceRequest} from '../features/requests/service';
import {
  clearDraft,emptyNuevoServicio,loadDraft,nuevoServicioSteps,nuevoServicioTimeline,saveDraft,validateStep,
  type NuevoServicioDraft,type NuevoServicioStep,
} from '../features/subscribers/nuevoServicio';
import {Badge,Button,EmptyState} from '../design-system/primitives';
import {cn} from '../design-system/utils';

type Match={subscriber_id:string;subscriber_code:string;full_name:string;masked_document:string;score:number;match_level:string;exact_document:boolean};

export function NuevoServicio(){
  const auth=useAuth();
  const navigate=useNavigate();
  const [draft,setDraft]=useState<NuevoServicioDraft>(loadDraft);
  const [stepIndex,setStepIndex]=useState(0);
  const [errors,setErrors]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);
  const [saved,setSaved]=useState('');
  const [done,setDone]=useState<{code:string;subscriberId:string}|null>(null);

  // Búsqueda de abonado existente
  const [q,setQ]=useState('');
  const [results,setResults]=useState<Array<{subscriber_id:string;subscriber_code:string;full_name:string;masked_document:string;sector:string}>>([]);
  // Duplicados de persona nueva
  const [matches,setMatches]=useState<Match[]|null>(null);
  const [homonymNote,setHomonymNote]=useState('');

  useEffect(()=>{saveDraft(draft);},[draft]);
  useEffect(()=>{
    const v=q.trim();
    if(v.length<2){setResults([]);return;}
    const t=setTimeout(()=>{void searchSubscribers(v).then(r=>setResults(r as typeof results)).catch(()=>setResults([]));},260);
    return()=>clearTimeout(t);
  },[q]);

  const step=nuevoServicioSteps[stepIndex];
  const isReview=step.id==='revision';
  const patch=<K extends keyof NuevoServicioDraft>(k:K,v:Partial<NuevoServicioDraft[K]>)=>
    setDraft(d=>({...d,[k]:{...d[k],...v}}));

  const exactBlock=useMemo(()=>matches?.find(m=>m.exact_document),[matches]);
  const similar=useMemo(()=>matches?.find(m=>!m.exact_document&&m.score>=0.7),[matches]);

  async function runDuplicateCheck(){
    setErrors([]);setBusy(true);
    try{
      const data=await checkDuplicates({
        full_name:draft.solicitante.full_name,
        document_type:draft.solicitante.document_type,
        document_number:draft.solicitante.document_number,
        issuing_country:'HND',
        whatsapp:draft.solicitante.whatsapp,
        address:draft.ubicacion.address||'—',
        sector:draft.ubicacion.sector||'—',
      }) as Match[];
      setMatches(data);
    }catch(e){setErrors([(e as Error).message]);}
    finally{setBusy(false);}
  }

  function next(){
    const e=validateStep(draft,step.id as NuevoServicioStep);
    if(step.id==='solicitante'&&draft.solicitante.mode==='nuevo'){
      if(matches===null){e.push('Verifique duplicados antes de continuar.');}
      else if(exactBlock){e.push(`Identidad ya registrada: ${exactBlock.full_name} (${exactBlock.subscriber_code}). Use "abonado existente".`);}
      else if(similar&&homonymNote.trim().length<15){e.push('Aclare por qué es una persona diferente (mínimo 15 caracteres).');}
    }
    setErrors(e);
    if(e.length)return;
    setSaved('Progreso guardado.');
    setStepIndex(i=>Math.min(i+1,nuevoServicioSteps.length-1));
  }
  function back(){setErrors([]);setSaved('');setStepIndex(i=>Math.max(i-1,0));}

  async function submit(){
    setBusy(true);setErrors([]);
    try{
      let subscriberId=draft.solicitante.subscriber_id;
      if(draft.solicitante.mode==='nuevo'){
        subscriberId=String(await createSubscriber({
          full_name:draft.solicitante.full_name,
          document_type:draft.solicitante.document_type,
          document_number:draft.solicitante.document_number,
          issuing_country:'HND',
          whatsapp:draft.solicitante.whatsapp,
          address:draft.ubicacion.address,
          sector:draft.ubicacion.sector,
        },similar?homonymNote:undefined,similar?.subscriber_id));
      }
      await createConnection(subscriberId,{
        service_type:draft.ubicacion.service_type,
        address:draft.ubicacion.address,
        sector:draft.ubicacion.sector,
        meter_number:draft.ubicacion.meter_number||undefined,
        latitude:draft.ubicacion.latitude,
        longitude:draft.ubicacion.longitude,
      });
      const requestId=await createServiceRequest({
        request_type:'solicitud',
        channel:draft.solicitud.channel,
        subscriber_id:subscriberId,
        subject:'Nuevo servicio de agua',
        description:draft.solicitud.description,
        priority:draft.solicitud.priority,
      });
      void requestId;
      clearDraft();
      setDone({code:'registrada',subscriberId});
    }catch(e){setErrors([(e as Error).message]);}
    finally{setBusy(false);}
  }

  if(!auth.has('subscribers.create')){
    return <main className="ja-page"><EmptyState title="Sin permiso" description="No tiene permiso para iniciar solicitudes de servicio."/></main>;
  }

  if(done){
    return <main className="ja-page ja-ns">
      <div className="ja-ns-success">
        <CheckCircle2 size={40}/>
        <h1>Solicitud registrada</h1>
        <p>El trámite quedó abierto. Estos son los pasos siguientes — cada uno se ejecuta en su pantalla:</p>
      </div>
      <ol className="ja-ns-timeline">
        {nuevoServicioTimeline.map((t,i)=>(
          <li key={t.label} className={cn('ja-ns-tl-item',i===0&&'ja-ns-tl-done')}>
            {i===0?<CheckCircle2 size={16}/>:<Circle size={16}/>}
            <div><strong>{t.label}</strong><span>{t.detail}</span></div>
            <Link className="ja-link" to={t.to}>Ir</Link>
          </li>
        ))}
      </ol>
      <div className="ja-ns-nav">
        <Button variant="secondary" onClick={()=>navigate(`/abonados/${done.subscriberId}`)}>Ver abonado</Button>
        <Button onClick={()=>{setDone(null);setDraft(emptyNuevoServicio);setStepIndex(0);}}>Nueva solicitud</Button>
      </div>
    </main>;
  }

  return <main className="ja-page ja-ns">
    <button className="ja-back" onClick={()=>navigate('/abonados')}><ArrowLeft size={15}/>Abonados</button>
    <header className="ja-page-head"><div><h1>Nuevo servicio</h1><p>{step.hint}</p></div></header>

    <ol className="ja-setup-steps">
      {nuevoServicioSteps.map((s,i)=>(
        <li key={s.id} className={cn('ja-setup-step',i===stepIndex?'ja-setup-step-current':i<stepIndex&&'ja-setup-step-complete')}>
          <span className="ja-setup-step-dot">{i<stepIndex?<CheckCircle2 size={14}/>:i+1}</span>{s.title}
        </li>
      ))}
    </ol>

    <section className="ja-ns-body">
      {step.id==='solicitante'&&<div className="ja-auth-form">
        <div className="ja-ns-toggle">
          <button className={cn('ja-ns-chip',draft.solicitante.mode==='existente'&&'ja-ns-chip-on')} onClick={()=>patch('solicitante',{mode:'existente'})}><Search size={14}/>Abonado existente</button>
          <button className={cn('ja-ns-chip',draft.solicitante.mode==='nuevo'&&'ja-ns-chip-on')} onClick={()=>patch('solicitante',{mode:'nuevo'})}><UserPlus size={14}/>Persona nueva</button>
        </div>

        {draft.solicitante.mode==='existente'?<>
          <div className="ja-search-field"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nombre, código o identidad" aria-label="Buscar abonado"/></div>
          {draft.solicitante.subscriber_id&&<div className="ja-ns-picked"><strong>{draft.solicitante.subscriber_label}</strong><button className="ja-link" onClick={()=>patch('solicitante',{subscriber_id:'',subscriber_label:''})}>Cambiar</button></div>}
          <div className="ja-ns-results">
            {results.map(r=><button key={r.subscriber_id} className="ja-ns-result" onClick={()=>{patch('solicitante',{subscriber_id:r.subscriber_id,subscriber_label:`${r.full_name} · ${r.subscriber_code}`});setQ('');setResults([]);}}>
              <strong>{r.full_name}</strong><span className="ja-cell-sub">{r.subscriber_code} · {r.masked_document} · {r.sector||'sin sector'}</span>
            </button>)}
          </div>
        </>:<>
          <label className="ja-field"><span className="ja-field-label">Nombre completo</span>
            <input className="ja-control" value={draft.solicitante.full_name} onChange={e=>{patch('solicitante',{full_name:e.target.value});setMatches(null);}}/></label>
          <div className="ja-ns-row">
            <label className="ja-field"><span className="ja-field-label">Documento</span>
              <select className="ja-control" value={draft.solicitante.document_type} onChange={e=>{patch('solicitante',{document_type:e.target.value as 'dni'|'passport'|'other'});setMatches(null);}}>
                <option value="dni">DNI</option><option value="passport">Pasaporte</option><option value="other">Otro</option>
              </select></label>
            <label className="ja-field"><span className="ja-field-label">Número</span>
              <input className="ja-control" value={draft.solicitante.document_number} onChange={e=>{patch('solicitante',{document_number:e.target.value});setMatches(null);}}/></label>
          </div>
          <label className="ja-field"><span className="ja-field-label">Teléfono</span>
            <input className="ja-control" value={draft.solicitante.whatsapp} onChange={e=>patch('solicitante',{whatsapp:e.target.value})}/></label>
          <Button type="button" variant="secondary" disabled={busy} onClick={()=>void runDuplicateCheck()}>Verificar duplicados</Button>
          {matches!==null&&<div className="ja-ns-matches">
            {matches.length===0?<Badge tone="success">Sin coincidencias — es una persona nueva</Badge>
              :matches.map(m=><div key={m.subscriber_id} className={cn('ja-ns-match',m.exact_document&&'ja-ns-match-block')}>
                <strong>{m.full_name} · {m.subscriber_code}</strong>
                <span className="ja-cell-sub">{m.masked_document} · {Math.round(m.score*100)}% · {m.match_level}{m.exact_document?' · identidad idéntica':''}</span>
              </div>)}
            {similar&&!exactBlock&&<label className="ja-field"><span className="ja-field-label">Aclaratoria (persona diferente)</span>
              <textarea className="ja-control" value={homonymNote} onChange={e=>setHomonymNote(e.target.value)} placeholder="Explique cómo se verificó que es otra persona"/></label>}
          </div>}
        </>}
      </div>}

      {step.id==='ubicacion'&&<div className="ja-auth-form">
        <label className="ja-field"><span className="ja-field-label">Tipo de servicio</span>
          <select className="ja-control" value={draft.ubicacion.service_type} onChange={e=>patch('ubicacion',{service_type:e.target.value as typeof draft.ubicacion.service_type})}>
            <option value="residential">Residencial</option><option value="commercial">Comercial</option><option value="community">Comunitario</option><option value="institutional">Institucional</option>
          </select></label>
        <label className="ja-field"><span className="ja-field-label">Dirección del punto de servicio</span>
          <input className="ja-control" value={draft.ubicacion.address} onChange={e=>patch('ubicacion',{address:e.target.value})} placeholder="Calle, referencia…"/></label>
        <label className="ja-field"><span className="ja-field-label">Sector</span>
          <input className="ja-control" value={draft.ubicacion.sector} onChange={e=>patch('ubicacion',{sector:e.target.value})}/></label>
        <div className="ja-ns-row">
          <label className="ja-field"><span className="ja-field-label">Latitud (opcional)</span>
            <input className="ja-control" type="number" step="any" value={draft.ubicacion.latitude??''} onChange={e=>patch('ubicacion',{latitude:e.target.value?Number(e.target.value):undefined})}/></label>
          <label className="ja-field"><span className="ja-field-label">Longitud (opcional)</span>
            <input className="ja-control" type="number" step="any" value={draft.ubicacion.longitude??''} onChange={e=>patch('ubicacion',{longitude:e.target.value?Number(e.target.value):undefined})}/></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Número de medidor (opcional — solo si se instala)</span>
          <input className="ja-control" value={draft.ubicacion.meter_number} onChange={e=>patch('ubicacion',{meter_number:e.target.value})}/></label>
      </div>}

      {step.id==='solicitud'&&<div className="ja-auth-form">
        <div className="ja-ns-row">
          <label className="ja-field"><span className="ja-field-label">Canal</span>
            <select className="ja-control" value={draft.solicitud.channel} onChange={e=>patch('solicitud',{channel:e.target.value as typeof draft.solicitud.channel})}>
              <option value="presencial">Presencial</option><option value="telefonico">Teléfono</option><option value="whatsapp">WhatsApp</option><option value="portal">Portal</option><option value="correo">Correo</option>
            </select></label>
          <label className="ja-field"><span className="ja-field-label">Prioridad</span>
            <select className="ja-control" value={draft.solicitud.priority} onChange={e=>patch('solicitud',{priority:e.target.value as typeof draft.solicitud.priority})}>
              <option value="baja">Baja</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option>
            </select></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Descripción de la solicitud</span>
          <textarea className="ja-control" rows={4} value={draft.solicitud.description} onChange={e=>patch('solicitud',{description:e.target.value})} placeholder="Ej. Solicita instalación de un nuevo pegue residencial en…"/></label>
      </div>}

      {isReview&&<div className="ja-setup-review">
        <dl>
          <div><dt>Solicitante</dt><dd>{draft.solicitante.mode==='existente'?draft.solicitante.subscriber_label||'—':`${draft.solicitante.full_name} (nuevo)`}</dd></div>
          <div><dt>Punto de servicio</dt><dd>{[draft.ubicacion.address,draft.ubicacion.sector].filter(Boolean).join(', ')||'—'}</dd></div>
          <div><dt>Tipo</dt><dd>{draft.ubicacion.service_type}{draft.ubicacion.meter_number?` · medidor ${draft.ubicacion.meter_number}`:' · sin medidor'}</dd></div>
          <div><dt>Canal / prioridad</dt><dd>{draft.solicitud.channel} · {draft.solicitud.priority}</dd></div>
        </dl>
        <p className="ja-hint">Al registrar se crea el abonado (si es nuevo), el pegue y la solicitud en estado "recibida". El trámite continúa en Solicitudes.</p>
      </div>}

      {errors.length>0&&<div className="ja-auth-alert ja-auth-alert-error" role="alert"><ul>{errors.map(x=><li key={x}>{x}</li>)}</ul></div>}
      {saved&&!errors.length&&<div className="ja-ns-saved"><Save size={13}/>{saved}</div>}

      <div className="ja-setup-nav">
        {stepIndex>0&&<Button type="button" variant="secondary" onClick={back} disabled={busy}><ArrowLeft size={15}/>Atrás</Button>}
        <span className="ja-setup-nav-spacer"/>
        {isReview
          ?<Button type="button" onClick={()=>void submit()} disabled={busy}><Droplet size={15}/>Registrar solicitud</Button>
          :<Button type="button" onClick={next} disabled={busy}>Guardar y continuar<ArrowRight size={15}/></Button>}
      </div>
      <p className="ja-hint"><MapPin size={12}/> El borrador se guarda automáticamente en este dispositivo.</p>
    </section>
  </main>;
}
