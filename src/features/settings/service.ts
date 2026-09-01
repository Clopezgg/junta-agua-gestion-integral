import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function fail(error:{message:string}|null){if(error)throw new Error(error.message);}
export async function getOrganizationSettings(){const{data,error}=await db().rpc('get_organization_settings');fail(error);return data??{};}
export async function updateOrganizationSettings(payload:Record<string,unknown>){const{data,error}=await db().rpc('update_organization_settings',{p_payload:payload});fail(error);return data;}

// Asistente de configuración inicial (§25)
export async function saveSetupProgress(progress:Record<string,unknown>){const{data,error}=await db().rpc('save_setup_progress',{p_progress:progress});fail(error);return data;}
export async function completeSetup(payload:Record<string,unknown>){const{data,error}=await db().rpc('complete_setup',{p_payload:payload});fail(error);return data;}

export async function uploadOrganizationAsset(file:File,kind:'logo'|'signature'|'stamp'){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('La imagen debe ser JPG, PNG o WEBP.');
  if(file.size>5*1024*1024)throw new Error('La imagen supera 5 MB.');
  const{data:user}=await db().auth.getUser();
  const{data:profile,error:profileError}=await db().from('profiles').select('organization_id').eq('id',user.user?.id??'').single();
  fail(profileError);
  if(!profile)throw new Error('No se pudo determinar la organización.');
  const ext=file.name.split('.').pop()?.toLowerCase()||'png';
  const timestamp=new Date().toISOString().replace(/[:.]/g,'-');
  const path=`${profile.organization_id}/${kind}/${timestamp}-${crypto.randomUUID()}.${ext}`;
  const{error}=await db().storage.from('organization-assets').upload(path,file,{upsert:false,contentType:file.type});
  fail(error);
  return path;
}

export const uploadOrganizationLogo=(file:File)=>uploadOrganizationAsset(file,'logo');
export async function getOrganizationAssetUrl(path?:string|null){if(!path)return'';const{data,error}=await db().storage.from('organization-assets').createSignedUrl(path,600);fail(error);return data?.signedUrl??'';}
