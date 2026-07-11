import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
export async function listIntegrations(){const {data,error}=await db().rpc('list_integrations');if(error)throw error;return data??[];}
export async function saveIntegration(key:string,config:Record<string,unknown>,enabled:boolean){const {data,error}=await db().rpc('save_integration_public_config',{p_key:key,p_public_config:config,p_enabled:enabled});if(error)throw error;return data;}
export async function testIntegration(key:string){const {data,error}=await db().functions.invoke('integration-test',{body:{key}});if(error)throw new Error(error.message);return data as {ok:boolean;message:string;details?:Record<string,unknown>};}
export function openGoogleMaps(lat:number,lng:number){window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,'_blank','noopener,noreferrer');}
export function shareWhatsApp(phone:string,message:string){window.open(`https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer');}
export function shareEmail(email:string,subject:string,body:string){window.location.href=`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;}
export async function listMapPoints(status?:string,sector?:string){const {data,error}=await db().rpc('list_connection_map_points',{p_status:status||null,p_sector:sector||null});if(error)throw error;return data??[];}
