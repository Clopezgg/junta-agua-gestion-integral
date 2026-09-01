import {useEffect,useState} from 'react';
import {AlertCircle,Droplets,Link as LinkIcon,LoaderCircle,LogIn,Mail} from 'lucide-react';
import {Link,Navigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {supabase} from '../lib/supabase';
import {formatCooldown,getPublicInstitution} from '../features/auth/service';
import {Button} from '../design-system/primitives';
import {Input,PasswordField} from '../design-system/primitives';

async function callRpc(name:string,args:Record<string,unknown>){if(!supabase)return null;const{data,error}=await supabase.rpc(name,args);return error?null:data;}
async function cooldownSeconds(email:string){return Number((await callRpc('get_login_cooldown_seconds',{p_email:email}))??0);}

export function Login(){
  const auth=useAuth();
  const[institution,setInstitution]=useState<string|undefined>(undefined);
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[error,setError]=useState('');
  const[loading,setLoading]=useState(false);

  useEffect(()=>{let active=true;getPublicInstitution().then(value=>{if(active&&value)setInstitution(value.name)}).catch(()=>undefined);return()=>{active=false};},[]);

  if(auth.session)return <Navigate to="/mfa" replace/>;

  async function submit(event:React.FormEvent){
    event.preventDefault();
    setError('');setLoading(true);
    try{
      const wait=await cooldownSeconds(email);
      if(wait>0){setError(`Demasiados intentos fallidos. Espere ${formatCooldown(wait)} para volver a intentar.`);return;}
      try{await auth.signIn(email,password);await callRpc('record_login_attempt',{p_email:email,p_success:true});}
      catch(signInError){await callRpc('record_login_attempt',{p_email:email,p_success:false});throw signInError;}
    }catch(signInError){
      setError(signInError instanceof Error?signInError.message:'No se pudo iniciar sesión.');
    }finally{setLoading(false)}
  }

  return <div className="ja-auth">
    <div className="ja-auth-brand">
      <span className="ja-auth-brand-mark" aria-hidden><Droplets size={22}/></span>
      <span className="ja-auth-brand-name">{institution??'Junta de Agua'}</span>
    </div>
    <div className="ja-auth-card">
      <div>
        <h1 className="ja-auth-title">Acceso administrativo</h1>
        <p className="ja-auth-subtitle">Ingrese sus credenciales para continuar.</p>
      </div>
      <form className="ja-auth-form" onSubmit={submit} noValidate>
        <Input label="Correo" type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="usuario@correo.com" leading={<Mail size={16}/>}/>
        <PasswordField label="Contraseña" required minLength={8} value={password} onChange={event=>setPassword(event.target.value)} placeholder="Mínimo 8 caracteres"/>
        {error&&<div className="ja-auth-alert ja-auth-alert-error" role="alert"><AlertCircle size={15}/><span>{error}</span></div>}
        <Button type="submit" variant="primary" size="lg" full disabled={loading}>
          {loading?<><LoaderCircle size={16} className="ja-spin"/>Verificando acceso…</>:<><LogIn size={16}/>Iniciar sesión</>}
        </Button>
        <div className="ja-auth-links"><span>¿Perdió su acceso?</span><Link className="ja-auth-link" to="/recuperar">Recuperar acceso</Link></div>
        <div className="ja-auth-divider">Portal del abonado</div>
        <Link className="ja-btn ja-btn-outline ja-btn-md ja-btn-full" to="/portal"><LinkIcon size={16}/>Portal del abonado</Link>
      </form>
    </div>
    <footer className="ja-auth-footer">Acceso exclusivo para personal autorizado.</footer>
  </div>;
}