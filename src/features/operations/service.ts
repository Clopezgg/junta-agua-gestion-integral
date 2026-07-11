import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function check(error:{message:string}|null){if(error)throw new Error(error.message);}
export async function listWorkOrders(){const {data,error}=await db().rpc('list_work_orders');check(error);return data??[];}
export async function createWorkOrder(payload:Record<string,unknown>){const {data,error}=await db().rpc('create_work_order',{p_payload:payload});check(error);return data;}
export async function updateWorkOrder(id:string,status:string,notes?:string){const {data,error}=await db().rpc('update_work_order_v2',{p_id:id,p_payload:{status,notes:notes??null}});check(error);return data;}
export async function updateWorkOrderDetails(id:string,payload:Record<string,unknown>){const{data,error}=await db().rpc('update_work_order_v2',{p_id:id,p_payload:payload});check(error);return data;}
export async function listInventory(){const {data,error}=await db().rpc('list_inventory');check(error);return data??[];}
export async function registerInventoryMovement(payload:Record<string,unknown>){const {data,error}=await db().rpc('register_inventory_movement',{p_payload:payload});check(error);return data;}
export async function createInventoryItem(payload:Record<string,unknown>){const {data,error}=await db().rpc('create_inventory_item',{p_payload:payload});check(error);return data;}
export async function listAssets(query='',status='',type=''){const{data,error}=await db().rpc('list_assets',{p_query:query||null,p_status:status||null,p_type:type||null});check(error);return data??[];}
export async function createAsset(payload:Record<string,unknown>){const{data,error}=await db().rpc('create_asset',{p_payload:payload});check(error);return data;}
export async function listMaintenancePlans(){const{data,error}=await db().rpc('list_maintenance_plans');check(error);return data??[];}
export async function createMaintenancePlan(payload:Record<string,unknown>){const{data,error}=await db().rpc('create_maintenance_plan',{p_payload:payload});check(error);return data;}
export async function generatePreventiveWorkOrders(throughDate:string){const{data,error}=await db().rpc('generate_preventive_work_orders',{p_through_date:throughDate});check(error);return data;}
