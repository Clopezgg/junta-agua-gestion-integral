import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function check(error:{message:string}|null){if(error)throw new Error(error.message);}
export async function createPerson(payload:{full_name:string;document_type?:string;document_number?:string;issuing_country?:string;kind?:string;birth_date?:string;whatsapp?:string;email?:string;phone?:string;address?:string;sector?:string}){const {data,error}=await db().rpc('create_person',payload);check(error);return data as string;}
export async function getAbonado360(id:string){const {data,error}=await db().rpc('get_abonado_360',{p_abonado_id:id});check(error);return data;}
export async function registerServiceContract(payload:Record<string,unknown>){const {data,error}=await db().rpc('register_service_contract',payload);check(error);return data as string;}
