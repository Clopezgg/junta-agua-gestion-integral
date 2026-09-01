import {AlertCircle,ArrowRight,Building2,Droplets,LoaderCircle,ShieldCheck} from 'lucide-react';
import {useState,type FormEvent} from 'react';
import {Link,Navigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {supabase} from '../lib/supabase';
import {Button,Input} from '../design-system/primitives';

export function Setup(){
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
      p_name:organizationName.trim(),
      p_full_name:fullName.trim(),
      p_username:username.trim().toLowerCase()
    });
    if(rpcError){
      setSaving(false);
      setError(rpcError.message.includes('BOOTSTRAP_DENIED')
       ?'La inicialización fue denegada. Debe existir solamente el primer usuario y ninguna organización previa.'
       :rpcError.message);
      return;
    }
    window.location.assign('/');
  }

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
  if(auth.profile)return <Navigate to="/" replace/>;

  return <div className="ja-auth">
    <div className="ja-auth-brand"><span className="ja-auth-brand-mark" aria-hidden><Droplets size={22}/></span></div>
    <div className="ja-auth-card">
      <div>
        <h1 className="ja-auth-title">Inicializar Junta de Agua</h1>
        <p className="ja-auth-subtitle">Este proceso crea la organización inicial y convierte su cuenta en Administrador principal.</p>
      </div>
      <form className="ja-auth-form" onSubmit={submit}>
        <Input label="Nombre oficial de la Junta" required minLength={3} value={organizationName} onChange={e=>setOrganizationName(e.target.value)} placeholder="Junta de Agua …" leading={<Building2 size={16}/>}/>
        <Input label="Su nombre completo" required minLength={3} value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Nombre y apellidos" leading={<ShieldCheck size={16}/>}/>
        <Input label="Nombre de usuario" required minLength={3} autoCapitalize="none" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="ej. admin.general" leading={<ShieldCheck size={16}/>}/>
        {error&&<div className="ja-auth-alert ja-auth-alert-error" role="alert"><AlertCircle size={15}/><span>{error}</span></div>}
        <Button type="submit" size="lg" full disabled={saving}>{saving?<><LoaderCircle size={16} className="ja-spin"/>Inicializando…</>:<><Building2 size={16}/>Crear organización y administrador</>}</Button>
        <p className="ja-auth-subtitle">Solo el primer usuario realiza este paso una única vez. Después de inicializar, el registro público queda cerrado.</p>
      </form>
    </div>
  </div>;
}