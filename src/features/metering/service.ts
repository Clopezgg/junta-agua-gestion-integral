import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function fail(error:{message:string}|null){if(error)throw new Error(error.message);}

export type TariffBlock={block_order:number;from_volume:number;to_volume:number|null;unit_price:number};
export async function listConsumptionSchemes(){const{data,error}=await db().rpc('list_consumption_tariff_schemes');fail(error);return data??[];}
export async function saveConsumptionScheme(payload:Record<string,unknown>){const{data,error}=await db().rpc('save_consumption_tariff_scheme',{p_payload:payload});fail(error);return data;}
export async function listMeteringConnections(query=''){const{data,error}=await db().rpc('list_metering_connections',{p_query:query});fail(error);return data??[];}
export async function createReadingBatch(payload:Record<string,unknown>){const{data,error}=await db().rpc('create_meter_reading_batch',{p_payload:payload});fail(error);return data;}
export async function listReadingBatches(limit=50){const{data,error}=await db().rpc('list_meter_reading_batches',{p_limit:limit});fail(error);return data??[];}
export async function listReadings(batchId:string){const{data,error}=await db().rpc('list_meter_readings',{p_batch_id:batchId});fail(error);return data??[];}
export async function saveReading(batchId:string,payload:Record<string,unknown>){const{data,error}=await db().rpc('upsert_meter_reading',{p_batch_id:batchId,p_payload:payload});fail(error);return data;}
export async function postReadingBatch(batchId:string){const{data,error}=await db().rpc('post_meter_reading_batch',{p_batch_id:batchId});fail(error);return data;}
export async function listCutCandidates(minDays=30){const{data,error}=await db().rpc('list_cut_candidates',{p_min_days_overdue:minDays});fail(error);return data??[];}
