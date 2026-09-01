import {useEffect,useState,type FormEvent} from 'react';
import {AlertCircle,CheckCircle2,LoaderCircle,LockKeyhole,ShieldCheck} from 'lucide-react';
import {Link,Navigate} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {readRecoveryTokensFromHash,updatePassword} from '../features/auth/service';
import {useAuth} from '../contexts/AuthContext';
import {Button,PasswordField} from '../design-system/primitives';

export function Restablecer(){
  const auth=useAuth();
  const[hashChecked,setHashChecked]=useState(false);
  const[valid,setValid]=useState(false);
  const[password,setPassword]=useState('');
  const[confirmation,setConfirmation]=useState('');
  const[error,setError]=useState('');
  const[done,setDone]=useState(false);
  const[loading,setLoading]=useState(false);

  useEffect(()=>{
    let active=true;
    void(async()=>{
      const tokens=readRecoveryTokensFromHash(window.location.hash);
      if(!tokens||!supabase){if(active){setValid(false);setHashChecked(true);}return;}
      const{error}=await supabase.auth.setSession({access_token:tokens.accessToken,refresh_token:tokens.refreshToken??''});
      if(active){setValid(!error);setHashChecked(true);}
    })();
    return()=>{active=false};
  },[]);

  if(auth.session&&auth.mfaVerified)return <Navigate to="/" replace/>;

  async function submit(event:FormEvent){
    event.preventDefault();
    setError('');
    if(password.length<8){setError('La contraseña debe tener al menos 8 caracteres.');return;}
    if(password!==confirmation){setError('Las contraseñas no coinciden.');return;}
    setLoading(true);
    try{
      await updatePassword(password);
      setDone(true);
    }catch(x){
      setError(x instanceof Error?x.message:'No se pudo actualizar la contraseña. Intente de nuevo.');
    }finally{setLoading(false)}
  }

  if(!hashChecked)return <div className="ja-auth ja-auth-brand">Validando enlace…</div>;

  return <div className="ja-auth">
    <div className="ja-auth-brand"><span className="ja-auth-brand-mark" aria-hidden><LockKeyhole size={22}/></span></div>
    <div className="ja-auth-card">
      <div>
        <h1 className="ja-auth-title">{done?'Contraseña actualizada':'Restablecer contraseña'}</h1>
        <p className="ja-auth-subtitle">{done?'Ya puede iniciar sesión con su nueva contraseña.':''}</p>
      </div>
      {done
        ?<div className="ja-auth-form">
          <div className="ja-auth-alert ja-auth-alert-success" role="status"><CheckCircle2 size={15}/><span>Su contraseña fue actualizada correctamente.</span></div>
          <Link className="ja-btn ja-btn-primary ja-btn-md ja-btn-full" to="/login"><ShieldCheck size={16}/>Iniciar sesión</Link>
        </div>
        :!valid
          ?<div className="ja-auth-form">
            <div className="ja-auth-alert ja-auth-alert-error" role="alert"><AlertCircle size={15}/><span>El enlace de recuperación no es válido o ya caducó. Solicite uno nuevo.</span></div>
            <Link className="ja-btn ja-btn-secondary ja-btn-md ja-btn-full" to="/recuperar">Solicitar nuevo enlace</Link>
          </div>
          :<form className="ja-auth-form" onSubmit={submit} noValidate>
            <PasswordField label="Nueva contraseña" required minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 8 caracteres"/>
            <PasswordField label="Confirmar contraseña" required minLength={8} autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} placeholder="Repita la contraseña"/>
            {error&&<div className="ja-auth-alert ja-auth-alert-error" role="alert"><AlertCircle size={15}/><span>{error}</span></div>}
            <Button type="submit" size="lg" full disabled={loading}>{loading?<><LoaderCircle size={16} className="ja-spin"/>Guardando…</>:<><LockKeyhole size={16}/>Guardar nueva contraseña</>}</Button>
          </form>}
    </div>
    <footer className="ja-auth-footer">Acceso exclusivo para personal autorizado.</footer>
  </div>;
}