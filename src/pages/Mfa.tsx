import {useState} from 'react';
import {ArrowRight,KeyRound,ScanLine,ShieldCheck,Smartphone,Info} from 'lucide-react';
import {Navigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';

export function Mfa(){
 const a=useAuth();
 const[code,setCode]=useState('');
 const[error,setError]=useState('');
 const[enrollment,setEnrollment]=useState<{factorId:string;qr:string;secret:string}|null>(null);

 if(!a.session)return <Navigate to="/login" replace/>;
 if(a.mfaVerified)return <Navigate to={a.profile?'/':'/setup'} replace/>;

 async function begin(){
  try{
   const e=await a.enrollMfa();
   setEnrollment({factorId:e.factor.id,qr:e.qr,secret:e.secret});
  }catch(x){
   setError(x instanceof Error?x.message:'No se pudo activar el código temporal.');
  }
 }

 async function verify(e:React.FormEvent){
  e.preventDefault();setError('');
  try{
   if(enrollment)await a.verifyEnrollment(enrollment.factorId,code);
   else await a.verifyMfa(code);
  }catch(x){
   setError(x instanceof Error?x.message:'El código no es válido. Revise el número de seis dígitos e intente de nuevo.');
  }
 }

 return <main className="auth">
  <form onSubmit={verify}>
   <div className="auth-card-header"><span className="auth-lock"><ShieldCheck size={22}/></span><div><h2>{a.hasVerifiedFactor?'Segundo factor':'Activar autenticador'}</h2><p>{a.hasVerifiedFactor?'Valide su identidad con el código temporal.':'Proteja su cuenta antes de continuar.'}</p></div></div>
   {!a.hasVerifiedFactor&&!enrollment&&<>
    <div className="notice"><Info size={16}/><span>Esta cuenta debe activar un código temporal antes de entrar. Use una aplicación de autenticación como Google Authenticator o Microsoft Authenticator.</span></div>
    <button type="button" onClick={begin}><ScanLine size={18}/>Generar código QR</button>
   </>}
   {enrollment&&<div className="mfa-enroll">
    <p className="mfa-steps"><span><Smartphone size={15}/></span>Abra su aplicación de autenticación y escanee este código QR.</p>
    <img className="qr" src={enrollment.qr} alt="Código QR de autenticación"/>
    <small className="mfa-secret">Si no puede escanear el código, escriba esta clave manual:<code>{enrollment.secret}</code></small>
   </div>}
   {(a.hasVerifiedFactor||enrollment)&&<label><span className="mfa-label">Código de seis dígitos</span><input className="mfa-code" inputMode="numeric" autoFocus pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="000000"/></label>}
   {error&&<div className="error">{error}</div>}
   {(a.hasVerifiedFactor||enrollment)&&<button className="login-action"><KeyRound size={18}/>Verificar y continuar <ArrowRight size={16}/></button>}
  </form>
 </main>;
}