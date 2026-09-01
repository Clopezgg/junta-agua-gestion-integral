import {useEffect,useState,type FormEvent} from 'react';
import {Link,Navigate,useNavigate} from 'react-router-dom';
import {ArrowLeft,ArrowRight,Building2,CheckCircle2,Droplets,LoaderCircle,MapPin,ScrollText,ShieldCheck} from 'lucide-react';
import {useAuth} from '../contexts/AuthContext';
import {supabase} from '../lib/supabase';
import {Button,Input} from '../design-system/primitives';
import {getOrganizationSettings,completeSetup,saveSetupProgress} from '../features/settings/service';
import {
  deferredConfig,draftFromSettings,emptyDraft,setupSteps,stepStatus,toSettingsPayload,validateStep,
  type SetupDraft,
} from '../features/settings/setupWizard';

// El asistente institucional sólo se ejecuta como continuación del bootstrap del
// primer administrador (o si se pide explícitamente). Un administrador ya
// existente NO queda atrapado en /setup aunque su configuración esté incompleta.
const WIZARD_FLAG='ja-setup-wizard';
const wizardRequested=()=>{try{return sessionStorage.getItem(WIZARD_FLAG)==='1';}catch{return false;}};
const requestWizard=()=>{try{sessionStorage.setItem(WIZARD_FLAG,'1');}catch{/* noop */}};
const clearWizard=()=>{try{sessionStorage.removeItem(WIZARD_FLAG);}catch{/* noop */}};

export function Setup(){
  const auth=useAuth();

  if(!auth.configured){
    return <div className="ja-auth"><div className="ja-auth-card">
      <div className="ja-setup-info"><span className="ja-auth-brand-mark" aria-hidden><Droplets size={22}/></span>
        <h1 className="ja-auth-title">Configuración segura pendiente</h1>
        <p>Conecte el sistema a su base de datos institucional y vuelva a desplegar. No se mostrarán datos simulados ni se permitirá el acceso sin una base real.</p>
      </div>
    </div></div>;
  }
  if(auth.loading)return <div className="ja-auth ja-auth-brand">Comprobando configuración segura…</div>;
  if(!auth.session){
    return <div className="ja-auth"><div className="ja-auth-card">
      <div className="ja-setup-info"><span className="ja-auth-brand-mark" aria-hidden><ShieldCheck size={22}/></span>
        <h1 className="ja-auth-title">Plataforma conectada</h1>
        <p>La base de datos ya fue detectada. Cree la cuenta del primer usuario y después inicie sesión para completar la inicialización.</p>
        <Link className="ja-btn ja-btn-primary ja-btn-md" to="/login"><ArrowRight size={16}/>Ir al inicio de sesión</Link>
      </div>
    </div></div>;
  }
  if(!auth.mfaVerified)return <Navigate to="/mfa" replace/>;
  if(!auth.profile)return <BootstrapStep/>;
  // Administrador ya inicializado: al dashboard, salvo que se haya pedido el asistente.
  if(!wizardRequested())return <Navigate to="/" replace/>;
  return <InstitutionWizard/>;
}

function BootstrapStep(){
  const auth=useAuth();
  const[organizationName,setOrganizationName]=useState('');
  const[fullName,setFullName]=useState('');
  const[username,setUsername]=useState('');
  const[error,setError]=useState('');
  const[saving,setSaving]=useState(false);

  async function submit(event:FormEvent){
    event.preventDefault();
    if(!supabase)return;
    if(organizationName.trim().length<3||fullName.trim().length<3||username.trim().length<3){
      setError('Complete el nombre de la Junta, su nombre completo y un usuario de al menos 3 caracteres.');
      return;
    }
    setSaving(true);setError('');
    const{error:rpcError}=await supabase.rpc('bootstrap_organization',{
      p_name:organizationName.trim(),p_full_name:fullName.trim(),p_username:username.trim().toLowerCase(),
    });
    if(rpcError){
      setSaving(false);
      setError(rpcError.message.includes('BOOTSTRAP_DENIED')
        ?'La inicialización fue denegada. Debe existir solamente el primer usuario y ninguna organización previa.'
        :rpcError.message);
      return;
    }
    requestWizard();
    await auth.refresh();
  }

  return <div className="ja-auth">
    <div className="ja-auth-brand"><span className="ja-auth-brand-mark" aria-hidden><Droplets size={22}/></span></div>
    <div className="ja-auth-card">
      <div>
        <h1 className="ja-auth-title">Inicializar Junta de Agua</h1>
        <p className="ja-auth-subtitle">Paso 1 de 2 — Crea la organización y convierte su cuenta en Administrador principal.</p>
      </div>
      <form className="ja-auth-form" onSubmit={submit}>
        <Input label="Nombre oficial de la Junta" required minLength={3} value={organizationName} onChange={e=>setOrganizationName(e.target.value)} placeholder="Junta Administradora de Agua …" leading={<Building2 size={16}/>}/>
        <Input label="Su nombre completo" required minLength={3} value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Nombre y apellidos" leading={<ShieldCheck size={16}/>}/>
        <Input label="Nombre de usuario" required minLength={3} autoCapitalize="none" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="ej. admin.general" leading={<ShieldCheck size={16}/>}/>
        {error&&<div className="ja-auth-alert ja-auth-alert-error" role="alert"><span>{error}</span></div>}
        <Button type="submit" size="lg" full disabled={saving}>{saving?<><LoaderCircle size={16} className="ja-spin"/>Inicializando…</>:<><Building2 size={16}/>Crear organización y continuar<ArrowRight size={15}/></>}</Button>
        <p className="ja-auth-subtitle">Solo el primer usuario realiza este paso, una única vez. Después de inicializar, el registro público queda cerrado.</p>
      </form>
    </div>
  </div>;
}

function InstitutionWizard(){
  const navigate=useNavigate();
  const[draft,setDraft]=useState<SetupDraft>(emptyDraft);
  const[stepIndex,setStepIndex]=useState(0);
  const[loading,setLoading]=useState(true);
  const[completed,setCompleted]=useState(false);
  const[busy,setBusy]=useState(false);
  const[errors,setErrors]=useState<string[]>([]);
  const[notice,setNotice]=useState('');

  useEffect(()=>{void(async()=>{
    try{
      const settings=await getOrganizationSettings() as Record<string,unknown>;
      if(settings.setup_completed_at){clearWizard();setCompleted(true);return;}
      setDraft(draftFromSettings(settings));
    }catch{/* usa borrador vacío */}
    finally{setLoading(false)}
  })();},[]);

  if(completed)return <Navigate to="/" replace/>;
  if(loading)return <div className="ja-auth ja-auth-brand">Cargando configuración…</div>;

  const step=setupSteps[stepIndex];
  const isReview=step.id==='revision';
  const set=(patch:Partial<SetupDraft>)=>setDraft(d=>({...d,...patch}));

  async function persistProgress(){
    try{await saveSetupProgress({draft:toSettingsPayload(draft),last_step:step.id});}catch{/* no bloquea el avance */}
  }

  async function next(){
    const stepErrors=validateStep(draft,step.id);
    setErrors(stepErrors);
    if(stepErrors.length)return;
    setBusy(true);
    await persistProgress();
    setBusy(false);
    setNotice('Progreso guardado.');
    setStepIndex(i=>Math.min(i+1,setupSteps.length-1));
  }
  function back(){setErrors([]);setNotice('');setStepIndex(i=>Math.max(i-1,0));}

  async function finish(){
    setBusy(true);setErrors([]);
    try{
      await completeSetup(toSettingsPayload(draft));
      clearWizard();
      setCompleted(true);
    }catch(e){
      setErrors([(e as Error).message]);
    }finally{setBusy(false)}
  }

  return <div className="ja-auth ja-auth-wide">
    <div className="ja-auth-brand"><span className="ja-auth-brand-mark" aria-hidden><Droplets size={22}/></span>
      <span className="ja-auth-brand-name">{draft.name||'Junta de Agua'}</span>
    </div>
    <div className="ja-auth-card ja-setup-card">
      <ol className="ja-setup-steps" aria-label="Progreso de configuración">
        {setupSteps.map((s,i)=>{
          const status=i===stepIndex?'current':stepStatus(draft,s.id);
          return <li key={s.id} className={`ja-setup-step ja-setup-step-${status}`} aria-current={i===stepIndex?'step':undefined}>
            <span className="ja-setup-step-dot">{status==='complete'?<CheckCircle2 size={14}/>:i+1}</span>
            <span>{s.title}</span>
          </li>;
        })}
      </ol>

      <div className="ja-setup-body">
        <h1 className="ja-auth-title">{step.title}</h1>
        <p className="ja-auth-subtitle">{step.description}</p>

        {step.id==='identidad'&&<div className="ja-auth-form">
          <Input label="Nombre oficial de la Junta" required value={draft.name} onChange={e=>set({name:e.target.value})} leading={<Building2 size={16}/>}/>
          <Input label="RTN (opcional)" value={draft.rtn} onChange={e=>set({rtn:e.target.value})} placeholder="Sin inventar — déjelo vacío si no lo tiene"/>
          <Input label="Teléfono (opcional)" value={draft.phone} onChange={e=>set({phone:e.target.value})}/>
          <Input label="Correo institucional (opcional)" type="email" value={draft.email} onChange={e=>set({email:e.target.value})}/>
        </div>}

        {step.id==='ubicacion'&&<div className="ja-auth-form">
          <Input label="Departamento" value={draft.department} onChange={e=>set({department:e.target.value})} leading={<MapPin size={16}/>}/>
          <Input label="Municipio" value={draft.municipality} onChange={e=>set({municipality:e.target.value})}/>
          <Input label="Comunidad / aldea" value={draft.community} onChange={e=>set({community:e.target.value})}/>
        </div>}

        {step.id==='legal'&&<div className="ja-auth-form">
          <Input label="Representante legal" value={draft.legal_representative_name} onChange={e=>set({legal_representative_name:e.target.value})} leading={<ScrollText size={16}/>}/>
          <Input label="Cargo del representante" value={draft.legal_representative_title} onChange={e=>set({legal_representative_title:e.target.value})} placeholder="ej. Presidente de la Junta"/>
          <Input label="Referencia de personería jurídica" value={draft.incorporation_reference} onChange={e=>set({incorporation_reference:e.target.value})} placeholder="N.º de resolución o acta"/>
          <Input label="Fecha de constitución (AAAA-MM-DD)" value={draft.founding_date} onChange={e=>set({founding_date:e.target.value})} placeholder="2005-03-14"/>
        </div>}

        {step.id==='servicio'&&<div className="ja-auth-form">
          <label className="ja-field">
            <span className="ja-field-label">Tipo de servicio</span>
            <select className="ja-control" value={draft.service_type} onChange={e=>set({service_type:e.target.value as SetupDraft['service_type']})}>
              <option value="">Seleccione…</option>
              <option value="agua">Solo agua potable</option>
              <option value="agua_alcantarillado">Agua y alcantarillado</option>
              <option value="agua_saneamiento">Agua y saneamiento</option>
            </select>
          </label>
          <label className="ja-setup-toggle">
            <input type="checkbox" checked={draft.metering_enabled} onChange={e=>set({metering_enabled:e.target.checked})}/>
            <span><strong>Facturación por medición</strong><small>Actívelo solo si instalará medidores y cobrará por consumo. Si no, el sistema opera por cuota fija y no pedirá lecturas.</small></span>
          </label>
        </div>}

        {isReview&&<div className="ja-setup-review">
          <dl>
            <div><dt>Junta</dt><dd>{draft.name||'—'}</dd></div>
            <div><dt>Ubicación</dt><dd>{[draft.community,draft.municipality,draft.department].filter(Boolean).join(', ')||'—'}</dd></div>
            <div><dt>Representante legal</dt><dd>{draft.legal_representative_name?`${draft.legal_representative_name}${draft.legal_representative_title?` · ${draft.legal_representative_title}`:''}`:'—'}</dd></div>
            <div><dt>Servicio</dt><dd>{draft.service_type?draft.service_type.replace(/_/g,' + '):'—'}{draft.metering_enabled?' · por medición':' · cuota fija'}</dd></div>
          </dl>
          <div className="ja-setup-deferred">
            <strong>Se configura después, cuando lo necesite:</strong>
            <ul>{deferredConfig.map(c=><li key={c.label}><Link to={c.to}>{c.label}</Link></li>)}</ul>
          </div>
        </div>}

        {errors.length>0&&<div className="ja-auth-alert ja-auth-alert-error" role="alert"><ul>{errors.map(x=><li key={x}>{x}</li>)}</ul></div>}
        {notice&&!errors.length&&<div className="ja-auth-alert ja-auth-alert-success" role="status">{notice}</div>}

        <div className="ja-setup-nav">
          {stepIndex>0&&<Button type="button" variant="secondary" onClick={back} disabled={busy}><ArrowLeft size={15}/>Atrás</Button>}
          <span className="ja-setup-nav-spacer"/>
          {!isReview
            ?<Button type="button" onClick={()=>void next()} disabled={busy}>{busy?<LoaderCircle size={15} className="ja-spin"/>:<>Guardar y continuar<ArrowRight size={15}/></>}</Button>
            :<Button type="button" onClick={()=>void finish()} disabled={busy}>{busy?<><LoaderCircle size={15} className="ja-spin"/>Activando…</>:<><CheckCircle2 size={15}/>Activar plataforma</>}</Button>}
        </div>
        {!isReview&&<button type="button" className="ja-auth-link ja-setup-skip" onClick={()=>{clearWizard();navigate('/');}}>Omitir por ahora y completar luego</button>}
      </div>
    </div>
    <footer className="ja-auth-footer">Acceso exclusivo para personal autorizado.</footer>
  </div>;
}
