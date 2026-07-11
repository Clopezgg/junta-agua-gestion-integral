import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
export async function sendEmail(payload:{to:string;subject:string;html:string;payment_id?:string;receipt_path?:string;filename?:string}){const {data,error}=await db().functions.invoke('send-email',{body:payload});if(error)throw new Error(error.message);return data;}
export async function sendWhatsApp(payload:{to:string;text?:string;document_url?:string;receipt_path?:string;filename?:string;payment_id?:string}){const {data,error}=await db().functions.invoke('send-whatsapp',{body:payload});if(error)throw new Error(error.message);return data;}
export async function runOcr(payload:{bucket:string;path:string;kind:'identity'|'invoice'}){const {data,error}=await db().functions.invoke('ocr-document',{body:payload});if(error)throw new Error(error.message);return data as {raw_text:string;extracted_data:Record<string,unknown>;extraction_id:string};}
export async function listMessages(){const {data,error}=await db().rpc('list_communication_messages',{p_limit:50});if(error)throw error;return data??[];}
export async function listOcr(){const {data,error}=await db().rpc('list_ocr_extractions',{p_limit:50});if(error)throw error;return data??[];}
