import {supabase} from '../../lib/supabase';

function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function fail(error:{message:string}|null){if(error)throw new Error(error.message);}

export type ImportKind='subscribers'|'meter_readings';
export type StagedImportRow={
  row_number:number;
  raw_data:Record<string,unknown>;
  normalized_data:Record<string,unknown>;
  status:'pending'|'valid'|'imported'|'skipped'|'error';
  error_codes:string[];
  message?:string;
};

export async function createImportBatch(payload:{kind:ImportKind;file_name:string;file_type:string;file_size:number;source_sha256:string;mapping:Record<string,string>}){
  const{data,error}=await db().rpc('create_import_batch',{p_payload:payload});fail(error);return data;
}
export async function stageImportRows(batchId:string,rows:StagedImportRow[]){
  const{data,error}=await db().rpc('stage_import_rows',{p_batch_id:batchId,p_rows:rows});fail(error);return data;
}
export async function setImportRowResult(rowId:string,status:'imported'|'skipped'|'error',resultEntityId?:string,message?:string,errorCodes:string[]=[]){
  const{error}=await db().rpc('set_import_row_result',{p_row_id:rowId,p_status:status,p_result_entity_id:resultEntityId??null,p_message:message??null,p_error_codes:errorCodes});fail(error);
}
export async function completeImportBatch(batchId:string,errorMessage?:string){
  const{data,error}=await db().rpc('complete_import_batch',{p_batch_id:batchId,p_error_message:errorMessage??null});fail(error);return data;
}
export async function listImportBatches(limit=50){
  const{data,error}=await db().rpc('list_import_batches',{p_limit:limit});fail(error);return data??[];
}
export async function listImportRows(batchId:string){
  const{data,error}=await db().rpc('list_import_rows',{p_batch_id:batchId});fail(error);return data??[];
}
