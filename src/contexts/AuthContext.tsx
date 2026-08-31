import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from 'react';
import type {Session,User} from '@supabase/supabase-js';
import {configured,supabase} from '../lib/supabase';
import type {Permission} from '../lib/security';

type Profile={id:string;full_name:string;username:string;status:string;organization_id:string};
type PortalSubscriber=Record<string,unknown>;
type AccountKind='staff'|'subscriber'|'pre_bootstrap'|null;
export type AuthContextErrorKind='NETWORK_ERROR'|'AUTH_ERROR'|'ACCOUNT_CONTEXT_NOT_FOUND';
export type AuthContextError={kind:AuthContextErrorKind;message:string};
type AuthValue={
 configured:boolean;loading:boolean;session:Session|null;user:User|null;profile:Profile|null;
  portalSubscriber:PortalSubscriber|null;portalState:Record<string,unknown>|null;accountKind:AccountKind;
  permissions:Permission[];mfaVerified:boolean;hasVerifiedFactor:boolean;hasTotpFactor:boolean;authError:AuthContextError|null;
 signIn:(email:string,password:string)=>Promise<void>;
 setPortalSession:(accessToken:string,refreshToken:string)=>Promise<void>;
 refresh:()=>Promise<void>;
 enrollMfa:()=>Promise<{factor:{id:string};qr:string;secret:string}>;
 verifyEnrollment:(factorId:string,code:string)=>Promise<void>;verifyMfa:(code:string)=>Promise<void>;
 signOut:()=>Promise<void>;has:(permission:Permission)=>boolean;
};
const C=createContext<AuthValue|null>(null);

function isNetworkError(error:unknown):boolean{const message=typeof error==='object'&&error&&'message' in error?String((error as{message:unknown}).message):String(error);return /network|fetch|failed to fetch|quota|timeout|abort|connection/i.test(message);}
function classify(error:unknown,fallback:AuthContextErrorKind):AuthContextError{return isNetworkError(error)?{kind:'NETWORK_ERROR',message:'No se pudo contactar el servicio de autenticación. Verifique su conexión e intente de nuevo.'}:{kind:fallback,message:error instanceof Error?error.message:String(error)};}
function describeMfaError(error:unknown):string{const m=typeof error==='object'&&error&&'message' in error?String((error as{message:unknown}).message):'';if(/factor_exists|already exists|friendly name/i.test(m))return 'Ya existe un factor de autenticación registrado en esta cuenta.';if(/invalid_otp|invalid token|incorrect/i.test(m))return 'El código de autenticación no es válido; revíselo e intente de nuevo.';if(/rate.limit|over_request|locked/i.test(m))return 'Demasiados intentos o bloqueo temporal. Espere unos segundos e intente de nuevo.';return 'No se pudo completar la verificación de autenticación. Intente de nuevo.';}

export function AuthProvider({children}:{children:ReactNode}){
 const[session,setSession]=useState<Session|null>(null);const[profile,setProfile]=useState<Profile|null>(null);const[portalSubscriber,setPortalSubscriber]=useState<PortalSubscriber|null>(null);const[portalState,setPortalState]=useState<Record<string,unknown>|null>(null);const[accountKind,setAccountKind]=useState<AccountKind>(null);const[permissions,setPermissions]=useState<Permission[]>([]);const[loading,setLoading]=useState(true);const[mfaVerified,setMfaVerified]=useState(false);const[hasVerifiedFactor,setHasVerifiedFactor]=useState(false);const[hasTotpFactor,setHasTotpFactor]=useState(false);const[authError,setAuthError]=useState<AuthContextError|null>(null);
 const load=useCallback(async(nextSession:Session|null)=>{
  setLoading(true);setSession(nextSession);setProfile(null);setPortalSubscriber(null);setPortalState(null);setAccountKind(null);setPermissions([]);setMfaVerified(false);setHasVerifiedFactor(false);setHasTotpFactor(false);setAuthError(null);
  if(!nextSession||!supabase){setLoading(false);return;}
  try{
   const[{data:factors},{data:aal}]=await Promise.all([supabase.auth.mfa.listFactors(),supabase.auth.mfa.getAuthenticatorAssuranceLevel()]);
   const anyFactor=Boolean(factors?.totp?.length);const verifiedFactor=Boolean(factors?.totp?.some(factor=>factor.status==='verified'));const atAal2=aal?.currentLevel==='aal2';
   setHasTotpFactor(anyFactor);setHasVerifiedFactor(verifiedFactor);setMfaVerified(atAal2);
   const{data:authorization,error:authorizationError}=await supabase.rpc('get_my_authorization');
   if(authorization?.profile){
    setProfile(authorization.profile);setPermissions(authorization.permissions??[]);setAccountKind('staff');
    if(atAal2&&!sessionStorage.getItem(`audit-login-${nextSession.access_token.slice(-12)}`)){await supabase.rpc('log_session_event',{p_action:'session.login',p_metadata:{user_agent:navigator.userAgent}});sessionStorage.setItem(`audit-login-${nextSession.access_token.slice(-12)}`,'1');}
    return;
   }
   if(authorizationError){
    const error=classify(authorizationError,'AUTH_ERROR');setAuthError(error);throw error;
   }
   const{data:subscriber,error:subscriberError}=await supabase.rpc('get_my_subscriber_card');
   if(isNetworkError(subscriberError)){setAuthError({kind:'NETWORK_ERROR',message:'No se pudo contactar el servicio del portal.'});throw subscriberError;}
   if(subscriber){
    const{data:state,error:stateError}=await supabase.rpc('get_my_portal_account_state');
    setPortalSubscriber(subscriber);setPortalState(stateError?null:state);setAccountKind('subscriber');setMfaVerified(true);
    return;
   }
   if(subscriberError){const error=classify(subscriberError,'ACCOUNT_CONTEXT_NOT_FOUND');setAuthError(error);throw subscriberError;}
   setAccountKind('pre_bootstrap');setPermissions([]);
  }finally{setLoading(false)}
 },[ ]);
 useEffect(()=>{if(!supabase){setLoading(false);return;}supabase.auth.getSession().then(({data})=>load(data.session)).catch(()=>{setLoading(false);setAuthError({kind:'NETWORK_ERROR',message:'No se pudo contactar el servicio de autenticación.'})});const{data}=supabase.auth.onAuthStateChange((_event,nextSession)=>{void load(nextSession)});return()=>data.subscription.unsubscribe();},[load]);
 async function signIn(email:string,password:string){if(!supabase)throw new Error('Configuración segura pendiente.');const{error}=await supabase.auth.signInWithPassword({email,password});if(error)throw new Error('Usuario o contraseña incorrectos.');}
 async function setPortalSession(accessToken:string,refreshToken:string){if(!supabase)throw new Error('Configuración segura pendiente.');const{error}=await supabase.auth.setSession({access_token:accessToken,refresh_token:refreshToken});if(error)throw new Error('No se pudo abrir la sesión del abonado.');}
 async function refresh(){await load((await supabase?.auth.getSession())?.data.session??null)}
 async function enrollMfa(){if(!supabase)throw new Error('Configuración segura pendiente.');const{data:current}=await supabase.auth.mfa.listFactors();if(current?.totp?.length)throw new Error('Ya existe un factor de autenticación registrado en esta cuenta. Finalice la verificación en lugar de crear otro.');const{data,error}=await supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'Junta de Agua'});if(error)throw new Error(describeMfaError(error));return{factor:data,qr:data.totp.qr_code,secret:data.totp.secret};}
 async function verifyEnrollment(factorId:string,code:string){if(!supabase)throw new Error('Configuración segura pendiente.');const{data:challenge,error:challengeError}=await supabase.auth.mfa.challenge({factorId});if(challengeError)throw new Error(describeMfaError(challengeError));const{error}=await supabase.auth.mfa.verify({factorId,challengeId:challenge.id,code});if(error)throw new Error(describeMfaError(error));await load((await supabase.auth.getSession()).data.session);}
 async function verifyMfa(code:string){if(!supabase)throw new Error('Configuración segura pendiente.');const{data:factors}=await supabase.auth.mfa.listFactors();const factor=factors?.totp?.[0];if(!factor)throw new Error('No existe un factor de autenticación configurado en esta cuenta.');const{data:challenge,error:challengeError}=await supabase.auth.mfa.challenge({factorId:factor.id});if(challengeError)throw new Error(describeMfaError(challengeError));const{error}=await supabase.auth.mfa.verify({factorId:factor.id,challengeId:challenge.id,code});if(error)throw new Error(describeMfaError(error));await load((await supabase.auth.getSession()).data.session);}
 async function signOut(){if(supabase&&session&&accountKind==='staff'){try{await supabase.rpc('log_session_event',{p_action:'session.logout',p_metadata:{user_agent:navigator.userAgent}})}catch(error){if(import.meta.env.DEV)console.warn('No se pudo registrar el cierre de sesión en auditoría.',error)}}await supabase?.auth.signOut();for(const key of Object.keys(sessionStorage)){if(key.startsWith('audit-login-'))sessionStorage.removeItem(key);}}
 const value:AuthValue={configured,loading,session,user:session?.user??null,profile,portalSubscriber,portalState,accountKind,permissions,mfaVerified,hasVerifiedFactor,hasTotpFactor,authError,signIn,setPortalSession,refresh,enrollMfa,verifyEnrollment,verifyMfa,signOut,has:(permission)=>permissions.includes(permission)};
 return <C.Provider value={value}>{children}</C.Provider>;
}
export function useAuth(){const value=useContext(C);if(!value)throw new Error('AuthProvider faltante');return value;}
