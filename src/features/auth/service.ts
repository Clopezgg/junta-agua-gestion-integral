import {supabase} from '../../lib/supabase';

export type PublicInstitution={name:string;logo_path:string|null};

export async function getPublicInstitution():Promise<PublicInstitution|null>{
  if(!supabase)return null;
  const{data,error}=await supabase.rpc('get_public_institution');
  if(error||!data||typeof data!=='object')return null;
  const row=data as Record<string,unknown>;
  const name=typeof row.name==='string'?row.name.trim():'';
  if(!name)return null;
  return{name,logo_path:typeof row.logo_path==='string'?row.logo_path:null};
}

export function readRecoveryTokensFromHash(hash:string):{accessToken:string;refreshToken?:string;type?:string}|null{
  const query=hash.replace(/^#/,'');
  if(!query)return null;
  const params=new URLSearchParams(query);
  const accessToken=params.get('access_token');
  if(!accessToken)return null;
  return{
    accessToken,
    refreshToken:params.get('refresh_token')??undefined,
    type:params.get('type')??undefined
  };
}

export function formatCooldown(seconds:number):string{
  const m=Math.floor(seconds/60);
  const s=seconds%60;
  return `${m} min ${s} s`;
}

export async function requestPasswordReset(email:string):Promise<void>{
  if(!supabase)throw new Error('Configuración segura pendiente.');
  const{error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/restablecer`});
  if(error)throw new Error('No se pudo enviar el enlace de recuperación.');
}

export async function updatePassword(password:string):Promise<void>{
  if(!supabase)throw new Error('Configuración segura pendiente.');
  const{error}=await supabase.auth.updateUser({password});
  if(error)throw new Error('No se pudo actualizar la contraseña.');
}