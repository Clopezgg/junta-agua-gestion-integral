import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import type {Session,User} from '@supabase/supabase-js';
import {configured,supabase} from '../lib/supabase';
import type {Permission} from '../lib/security';

type Profile={id:string;full_name:string;username:string;status:string;organization_id:string};
type PortalSubscriber=Record<string,unknown>;
type AccountKind='staff'|'subscriber'|null;
type AuthValue={
 configured:boolean;loading:boolean;session:Session|null;user:User|null;profile:Profile|null;
 portalSubscriber:PortalSubscriber|null;portalState:Record<string,unknown>|null;accountKind:AccountKind;
 permissions:Permission[];mfaVerified:boolean;hasVerifiedFactor:boolean;
 signIn:(email:string,password:string)=>Promise<void>;
 setPortalSession:(accessToken:string,refreshToken:string)=>Promise<void>;
 refresh:()=>Promise<void>;
 enrollMfa:()=>Promise<{factor:{id:string};qr:string;secret:string}>;
 verifyEnrollment:(factorId:string,code:string)=>Promise<void>;verifyMfa:(code:string)=>Promise<void>;
 signOut:()=>Promise<void>;has:(permission:Permission)=>boolean;
};
const C=createContext<AuthValue|null>(null);

export function AuthProvider({children}:{children:ReactNode}){
 const[session,setSession]=useState<Session|null>(null);const[profile,setProfile]=useState<Profile|null>(null);const[portalSubscriber,setPortalSubscriber]=useState<PortalSubscriber|null>(null);const[portalState,setPortalState]=useState<Record<string,unknown>|null>(null);const[accountKind,setAccountKind]=useState<AccountKind>(null);const[permissions,setPermissions]=useState<Permission[]>([]);const[loading,setLoading]=useState(true);const[mfaVerified,setMfaVerified]=useState(false);const[hasVerifiedFactor,setHasVerifiedFactor]=useState(false);
 async function load(nextSession:Session|null){
  setLoading(true);setSession(nextSession);setProfile(null);setPortalSubscriber(null);setPortalState(null);setAccountKind(null);setPermissions([]);setMfaVerified(false);setHasVerifiedFactor(false);
  if(!nextSession||!supabase){setLoading(false);return;}
  try{
   const{data:authorization,error:authorizationError}=await supabase.rpc('get_my_authorization');
   if(!authorizationError&&authorization?.profile){
    const[{data:factors},{data:aal}]=await Promise.all([supabase.auth.mfa.listFactors(),supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
    setProfile(authorization.profile);setPermissions(authorization.permissions??[]);setAccountKind('staff');setHasVerifiedFactor(Boolean(factors?.totp.some(factor=>factor.status==='verified')));const verified=aal?.currentLevel==='aal2';setMfaVerified(verified);
    if(verified&&!sessionStorage.getItem(`audit-login-${nextSession.access_token.slice(-12)}`)){await supabase.rpc('log_session_event',{p_action:'session.login',p_metadata:{user_agent:navigator.userAgent}});sessionStorage.setItem(`audit-login-${nextSession.access_token.slice(-12)}`,'1');}
    return;
   }
   const[{data:subscriber,error:subscriberError},{data:state,error:stateError}]=await Promise.all([supabase.rpc('get_my_subscriber_card'),supabase.rpc('get_my_portal_account_state')]);
   if(subscriberError||!subscriber)throw subscriberError??new Error('ACCOUNT_CONTEXT_NOT_FOUND');
   setPortalSubscriber(subscriber);setPortalState(stateError?null:state);setAccountKind('subscriber');setMfaVerified(true);
  }finally{setLoading(false)}
 }
 useEffect(()=>{if(!supabase){setLoading(false);return;}supabase.auth.getSession().then(({data})=>load(data.session)).catch(()=>setLoading(false));const{data}=supabase.auth.onAuthStateChange((_event,nextSession)=>{void load(nextSession)});return()=>data.subscription.unsubscribe();},[]);
 async function signIn(email:string,password:string){if(!supabase)throw new Error('Configuración segura pendiente.');const{error}=await supabase.auth.signInWithPassword({email,password});if(error)throw new Error('Usuario o contraseña incorrectos.');}
 async function setPortalSession(accessToken:string,refreshToken:string){if(!supabase)throw new Error('Configuración segura pendiente.');const{error}=await supabase.auth.setSession({access_token:accessToken,refresh_token:refreshToken});if(error)throw new Error('No se pudo abrir la sesión del abonado.');}
 async function refresh(){await load((await supabase?.auth.getSession())?.data.session??null)}
 async function enrollMfa(){if(!supabase)throw new Error('Configuración segura pendiente.');const{data,error}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'Junta de Agua'});if(error)throw new Error(error.message);return{factor:data,qr:data.totp.qr_code,secret:data.totp.secret};}
 async function verifyEnrollment(factorId:string,code:string){if(!supabase)throw new Error('Configuración segura pendiente.');const{data:challenge,error:challengeError}=await supabase.auth.mfa.challenge({factorId});if(challengeError)throw new Error('No se pudo iniciar la verificación.');const{error}=await supabase.auth.mfa.verify({factorId,challengeId:challenge.id,code});if(error)throw new Error('Código inválido.');await load((await supabase.auth.getSession()).data.session);}
 async function verifyMfa(code:string){if(!supabase)throw new Error('Configuración segura pendiente.');const{data:factors}=await supabase.auth.mfa.listFactors();const factor=factors?.totp.find(item=>item.status==='verified');if(!factor)throw new Error('No existe un factor configurado.');const{data:challenge,error:challengeError}=await supabase.auth.mfa.challenge({factorId:factor.id});if(challengeError)throw new Error('No se pudo iniciar la verificación.');const{error}=await supabase.auth.mfa.verify({factorId:factor.id,challengeId:challenge.id,code});if(error)throw new Error('Código de autenticación inválido.');await load((await supabase.auth.getSession()).data.session);}
 async function signOut(){if(supabase&&session&&accountKind==='staff'){await supabase.rpc('log_session_event',{p_action:'session.logout',p_metadata:{user_agent:navigator.userAgent}}).catch(()=>undefined);}await supabase?.auth.signOut();sessionStorage.clear();}
 const value:AuthValue={configured,loading,session,user:session?.user??null,profile,portalSubscriber,portalState,accountKind,permissions,mfaVerified,hasVerifiedFactor,signIn,setPortalSession,refresh,enrollMfa,verifyEnrollment,verifyMfa,signOut,has:(permission)=>permissions.includes(permission)};
 return <C.Provider value={value}>{children}</C.Provider>;
}
export function useAuth(){const value=useContext(C);if(!value)throw new Error('AuthProvider faltante');return value;}
