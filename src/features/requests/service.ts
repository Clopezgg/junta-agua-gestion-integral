import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function check(error:{message:string}|null){if(error)throw new Error(error.message);}
export async function createServiceRequest(payload:Record<string,unknown>){const {data,error}=await db().rpc('create_service_request',{p_payload:payload});check(error);return data as string;}
export async function listServiceRequests(status?:string,limit=100){const {data,error}=await db().rpc('list_service_requests',{p_limit:limit,p_status:status??null});check(error);return data??[];}
export async function resolveServiceRequest(id:string,resolution:string,status='resuelta'){const {data,error}=await db().rpc('resolve_service_request',{p_request_id:id,p_resolution:resolution,p_status:status});check(error);return data;}
export async function assignServiceRequest(id:string,assignedTo:string){const{data,error}=await db().rpc('assign_service_request',{p_request_id:id,p_assigned_to:assignedTo});check(error);return data;}
export async function setServiceRequestStatus(id:string,status:string,note:string|null=null){const{data,error}=await db().rpc('set_service_request_status',{p_request_id:id,p_status:status,p_note:note});check(error);return data;}
export async function linkServiceRequestWorkOrder(id:string,workOrderId:string){const{data,error}=await db().rpc('link_service_request_work_order',{p_request_id:id,p_work_order_id:workOrderId});check(error);return data;}
