import {useState,type FormEvent} from 'react';
import {AlertCircle,KeyRound,LoaderCircle,Mail,ShieldCheck} from 'lucide-react';
import {Link,Navigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {requestPasswordReset} from '../features/auth/service';
import {Button,Input} from '../design-system/primitives';

export function RecuperarAcceso(){
  const auth=useAuth();
  const[email,setEmail]=useState('');
  const[error,setError]=useState('');
  const[sent,setSent]=useState(false);
  const[loading,setLoading]=useState(false);

  if(auth.session)return <Navigate to="/mfa" replace/>;

  async function submit(event:FormEvent){
    event.preventDefault();
    setError('');setLoading(true);
    try{
      await requestPasswordReset(email);
      setSent(true);
    }catch(x){
      setError(x instanceof Error?x.message:'No se pudo enviar el enlace de recuperación. Intente de nuevo.');
    }finally{setLoading(false)}
  }

  return <div className="ja-auth">
    <div className="ja-auth-brand"><span className="ja-auth-brand-mark" aria-hidden><KeyRound size={22}/></span></div>
    <div className="ja-auth-card">
      <div>
        <h1 className="ja-auth-title">Recuperar acceso</h1>
        <p className="ja-auth-subtitle">Ingrese su correo institucional y le enviaremos un enlace seguro para restablecer su contraseña.</p>
      </div>
      {sent
        ?<div className="ja-auth-form">
          <div className="ja-auth-alert ja-auth-alert-success" role="status"><ShieldCheck size={15}/><span>Si su correo está registrado, recibirá un enlace para restablecer la contraseña. Revise también su carpeta de spam.</span></div>
          <Link className="ja-btn ja-btn-secondary ja-btn-md ja-btn-full" to="/login">Volver al inicio de sesión</Link>
        </div>
        :<form className="ja-auth-form" onSubmit={submit} noValidate>
          <Input label="Correo" type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="usuario@correo.com" leading={<Mail size={16}/>}/>
          {error&&<div className="ja-auth-alert ja-auth-alert-error" role="alert"><AlertCircle size={15}/><span>{error}</span></div>}
          <Button type="submit" size="lg" full disabled={loading}>{loading?<><LoaderCircle size={16} className="ja-spin"/>Enviando…</>:<><Mail size={16}/>Enviar enlace de recuperación</>}</Button>
          <div className="ja-auth-links"><span>¿Recordó su contraseña?</span><Link className="ja-auth-link" to="/login">Iniciar sesión</Link></div>
        </form>}
    </div>
    <footer className="ja-auth-footer">Acceso exclusivo para personal autorizado.</footer>
  </div>;
}