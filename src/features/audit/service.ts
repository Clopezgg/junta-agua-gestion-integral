import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
export async function listAuditEvents(input:{query?:string;action?:string;from?:string;to?:string;limit?:number}={}){const{data,error}=await db().rpc('list_audit_events',{p_query:input.query??null,p_action:input.action??null,p_from:input.from??null,p_to:input.to??null,p_limit:input.limit??200});if(error)throw new Error(error.message);return data??[];}
