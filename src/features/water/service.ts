import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function check(error:{message:string}|null){if(error)throw new Error(error.message);}
export async function registerWaterSource(payload:Record<string,unknown>){const {data,error}=await db().rpc('register_water_source',payload);check(error);return data as string;}
export async function registerWaterSample(payload:Record<string,unknown>,parameters:unknown[]=[]){const {data,error}=await db().rpc('register_water_sample',{p_payload:payload,p_parameters:parameters});check(error);return data as string;}
export async function registerChlorination(payload:Record<string,unknown>){const {data,error}=await db().rpc('register_chlorination',payload);check(error);return data as string;}
export async function listWaterSamples(){const {data,error}=await db().rpc('list_water_samples');check(error);return data??[];}
export async function listChlorinationLogs(){const {data,error}=await db().rpc('list_chlorination_logs');check(error);return data??[];}
export async function listWaterSources(){const {data,error}=await db().from('water_sources').select('id,code,name,source_type,status,location,estimated_flow').order('name');if(error)throw new Error(error.message);return data??[];}
export async function listWatersheds(){const {data,error}=await db().from('watersheds').select('id,name,code,protection_status').order('name');if(error)throw new Error(error.message);return data??[];}
export async function listRationalizations(){const {data,error}=await db().rpc('list_rationalization');check(error);return data??[];}
