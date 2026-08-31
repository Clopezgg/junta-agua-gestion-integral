import {FormEvent,useState} from 'react';
import {Building2,Droplets,Link as LinkIcon,ShieldCheck} from 'lucide-react';
import {Link,Navigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {supabase} from '../lib/supabase';

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
  return <main className="auth"><section className="panel setup-panel"><span className="setup-icon"><LinkIcon size={22}/></span><h1>Configuración segura pendiente</h1><p>Conecte el sistema a su base de datos institucional y vuelva a desplegar. No se mostrarán datos simulados ni se permitirá el acceso sin una base real.</p></section></main>;
 }
 if(auth.loading)return <main className="center">Comprobando configuración segura…</main>;
 if(!auth.session){
  return <main className="auth"><section className="panel setup-panel"><span className="setup-icon"><ShieldCheck size={22}/></span><h1>Plataforma conectada</h1><p>La base de datos ya fue detectada. Cree la cuenta del primer usuario y después inicie sesión para completar la inicialización.</p><Link className="button-link" to="/login"><LinkIcon size={16}/>Ir al inicio de sesión</Link></section></main>;
 }
 if(!auth.mfaVerified)return <Navigate to="/mfa" replace/>;
 if(auth.profile)return <Navigate to="/" replace/>;

 return <main className="auth">
  <form onSubmit={submit} className="setup-form">
   <div className="auth-card-header"><span className="auth-lock"><Droplets size={22}/></span><div><h2>Inicializar Junta de Agua</h2><p>Este proceso crea la organización inicial y convierte su cuenta en Administrador principal.</p></div></div>
   <label>Nombre oficial de la Junta<div className="input-with-icon"><Building2 size={16}/><input value={organizationName} onChange={e=>setOrganizationName(e.target.value)} required minLength={3} placeholder="Junta de Agua …"/></div></label>
   <label>Su nombre completo<div className="input-with-icon"><ShieldCheck size={16}/><input value={fullName} onChange={e=>setFullName(e.target.value)} required minLength={3} placeholder="Nombre y apellidos"/></div></label>
   <label>Nombre de usuario<div className="input-with-icon"><ShieldCheck size={16}/><input value={username} onChange={e=>setUsername(e.target.value)} required minLength={3} autoCapitalize="none" placeholder="ej. admin.general" autoComplete="username"/></div></label>
   {error&&<div className="error">{error}</div>}
   <button className="login-action" disabled={saving}>{saving?'Inicializando…':'Crear organización y administrador'}</button>
   <p className="auth-help small">Solo el primer usuario realiza este paso una única vez. Después de inicializar, el registro público queda cerrado.</p>
  </form>
 </main>;
}