import {FormEvent,useState} from 'react';
import {Link,Navigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {supabase} from '../lib/supabase';

export function Setup(){
  const auth=useAuth();
  const[organizationName,setOrganizationName]=useState('Junta de Agua');
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
    return <main className="auth"><section className="panel"><h1>Configuración segura pendiente</h1><p>Agregue en Render las variables <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>, ejecute las migraciones y vuelva a desplegar.</p><p>El sistema no mostrará datos simulados ni permitirá acceso sin una base real.</p></section></main>;
  }
  if(auth.loading)return <main className="center">Comprobando configuración segura…</main>;
  if(!auth.session){
    return <main className="auth"><section className="panel"><h1>Supabase conectado</h1><p>Las variables ya fueron detectadas. Cree el primer usuario en Supabase Authentication y después inicie sesión.</p><Link className="button-link" to="/login">Ir al inicio de sesión</Link></section></main>;
  }
  if(!auth.mfaVerified)return <Navigate to="/mfa" replace/>;
  if(auth.profile)return <Navigate to="/" replace/>;

  return <main className="auth"><section className="panel"><h1>Inicializar Junta de Agua</h1><p>Este proceso crea la única organización inicial y convierte su cuenta en Administrador principal.</p>{error&&<div className="error">{error}</div>}<form onSubmit={submit} className="form-grid"><label>Nombre oficial de la Junta<input value={organizationName} onChange={e=>setOrganizationName(e.target.value)} required minLength={3}/></label><label>Su nombre completo<input value={fullName} onChange={e=>setFullName(e.target.value)} required minLength={3}/></label><label>Nombre de usuario<input value={username} onChange={e=>setUsername(e.target.value)} required minLength={3} autoCapitalize="none"/></label><button disabled={saving} type="submit">{saving?'Inicializando…':'Crear organización y administrador'}</button></form></section></main>;
}
