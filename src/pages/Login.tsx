import {useState} from 'react';
import {Droplets,Eye,EyeOff,KeyRound,LockKeyhole,ShieldCheck} from 'lucide-react';
import {Navigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {supabase} from '../lib/supabase';

async function callRpc(name:string,args:Record<string,unknown>){if(!supabase)return null;const{data,error}=await supabase.rpc(name,args);return error?null:data;}
async function cooldownSeconds(email:string){return Number((await callRpc('get_login_cooldown_seconds',{p_email:email}))??0);}
function formatCooldown(seconds:number){const m=Math.floor(seconds/60);const s=seconds%60;return `${m} min ${s} s`;}

export function Login(){
 const auth=useAuth();
 const[email,setEmail]=useState('');
 const[password,setPassword]=useState('');
 const[showPassword,setShowPassword]=useState(false);
 const[error,setError]=useState('');
 const[loading,setLoading]=useState(false);
 if(auth.session)return <Navigate to="/mfa" replace/>;
 async function submit(event:React.FormEvent){event.preventDefault();setError('');setLoading(true);try{
  const wait=await cooldownSeconds(email);if(wait>0){setError(`Demasiados intentos fallidos. Espere ${formatCooldown(wait)} para volver a intentar.`);return;}
  try{await auth.signIn(email,password);await callRpc('record_login_attempt',{p_email:email,p_success:true});}
  catch(signInError){await callRpc('record_login_attempt',{p_email:email,p_success:false});throw signInError;}
 }catch(error){setError(error instanceof Error?error.message:'No se pudo iniciar sesión.')}finally{setLoading(false)}}
 return <main className="auth auth-premium">
  <section className="auth-showcase">
   <div className="auth-emblem"><Droplets size={34}/></div>
   <span className="eyebrow">Plataforma institucional segura</span>
   <h1>Junta Patronal de Agua Potable El Achiotal</h1>
   <p>Gestión de abonados, pegues, pagos, documentos, presupuesto, activos y auditoría en una sola plataforma.</p>
   <div className="auth-security-list"><div><ShieldCheck size={20}/><span><strong>Acceso protegido</strong><small>MFA obligatorio y permisos por rol.</small></span></div><div><LockKeyhole size={20}/><span><strong>Datos privados</strong><small>RLS, archivos privados y auditoría.</small></span></div><div><KeyRound size={20}/><span><strong>Cuenta individual</strong><small>No se permiten usuarios compartidos.</small></span></div></div>
   <footer>Aldea El Achiotal · Santa Cruz de Yojoa · Cortés, Honduras</footer>
  </section>
  <section className="auth-panel">
   <form className="auth-card" onSubmit={submit}>
    <div className="auth-card-header"><span className="auth-lock"><LockKeyhole size={22}/></span><div><h2>Iniciar sesión</h2><p>Ingrese sus credenciales institucionales.</p></div></div>
    <label>Correo institucional<div className="input-with-icon"><span>@</span><input type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="usuario@correo.com"/></div></label>
    <label>Contraseña<div className="input-with-icon"><KeyRound size={17}/><input type={showPassword?'text':'password'} autoComplete="current-password" required minLength={8} value={password} onChange={event=>setPassword(event.target.value)} placeholder="Mínimo 8 caracteres"/><button type="button" className="password-toggle" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Ocultar contraseña':'Mostrar contraseña'}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
    {error&&<div className="error">{error}</div>}
    <button className="login-action" disabled={loading}>{loading?'Verificando acceso…':<><ShieldCheck size={18}/>Continuar de forma segura</>}</button>
    <div className="auth-help"><small>Después de ingresar deberá validar su código TOTP. Si perdió el acceso, contacte al administrador principal.</small></div>
   </form>
  </section>
 </main>;
}
