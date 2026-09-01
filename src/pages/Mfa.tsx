import {useState} from 'react';
import {AlertCircle,ArrowRight,KeyRound,LoaderCircle,ScanLine,ShieldCheck,Smartphone} from 'lucide-react';
import {Navigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import {Button} from '../design-system/primitives';
import {Input} from '../design-system/primitives';

export function Mfa(){
  const a=useAuth();
  const[code,setCode]=useState('');
  const[error,setError]=useState('');
  const[enrolled,setEnrolled]=useState(false);
  const[enrollment,setEnrollment]=useState<{factorId:string;qr:string;secret:string}|null>(null);
  const[loading,setLoading]=useState(false);
  const hasFactor=a.hasVerifiedFactor||a.hasTotpFactor;

  if(!a.session)return <Navigate to="/login" replace/>;
  if(a.mfaVerified)return <Navigate to={a.profile?'/':'/setup'} replace/>;

  async function begin(){
    setError('');setLoading(true);
    try{
      const e=await a.enrollMfa();
      setEnrollment({factorId:e.factor.id,qr:e.qr,secret:e.secret});
    }catch(x){
      setError(x instanceof Error?x.message:'No se pudo activar el código temporal.');
    }finally{setLoading(false)}
  }

  async function verify(event:React.FormEvent){
    event.preventDefault();
    setError('');setLoading(true);
    try{
      if(enrollment)await a.verifyEnrollment(enrollment.factorId,code);
      else await a.verifyMfa(code);
    }catch(x){
      setError(x instanceof Error?x.message:'El código no es válido. Revise el número de seis dígitos e intente de nuevo.');
    }finally{setLoading(false)}
  }

  const codeInput=<>
    <Input label="Código de seis dígitos" className="ja-auth-code" inputMode="numeric" autoFocus pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>{
      const digits=e.target.value.replace(/\D/g,'').slice(0,6);
      setCode(digits);
      if(enrollment&&digits.length===6)setEnrolled(true);
    }} placeholder="000000"/>
    {error&&<div className="ja-auth-alert ja-auth-alert-error" role="alert"><AlertCircle size={15}/><span>{error}</span></div>}
    <Button type="submit" size="lg" full disabled={loading||Boolean(enrollment&&!enrolled)}>{loading?<><LoaderCircle size={16} className="ja-spin"/>Verificando…</>:<><KeyRound size={16}/>Verificar y continuar<ArrowRight size={15}/></>}</Button>
  </>;

  return <div className="ja-auth">
    <div className="ja-auth-brand">
      <span className="ja-auth-brand-mark" aria-hidden><ShieldCheck size={22}/></span>
    </div>
    <div className="ja-auth-card">
      <div>
        <h1 className="ja-auth-title">{hasFactor?'Verificación de seguridad':'Activar autenticador'}</h1>
        <p className="ja-auth-subtitle">{hasFactor?'Introduce el código de 6 dígitos de tu aplicación autenticadora.':'Proteja su cuenta antes de continuar con esta Junta de Agua.'}</p>
      </div>
      <form className="ja-auth-form" onSubmit={verify}>
        {!hasFactor&&!enrollment&&<>
          <div className="ja-auth-alert ja-auth-alert-info"><span>Debe activar un código temporal antes de entrar. Use una aplicación de autenticación como Google Authenticator o Microsoft Authenticator.</span></div>
          <Button type="button" size="lg" full disabled={loading} onClick={begin}>{loading?<><LoaderCircle size={16} className="ja-spin"/>Preparando…</>:<><ScanLine size={16}/>Generar código QR</>}</Button>
        </>}
        {enrollment&&<div className="ja-mfa-enroll">
          <p className="ja-auth-subtitle"><Smartphone size={15}/>&nbsp;Abra su aplicación de autenticación y escanee este código QR.</p>
          <img className="qr" src={enrollment.qr} alt="Código QR de autenticación"/>
          <small className="ja-mfa-secret">Si no puede escanear el código, escriba esta clave manualmente:<code>{enrollment.secret}</code></small>
        </div>}
        {(hasFactor||enrollment)&&codeInput}
      </form>
    </div>
    <footer className="ja-auth-footer">Acceso exclusivo para personal autorizado.</footer>
  </div>;
}