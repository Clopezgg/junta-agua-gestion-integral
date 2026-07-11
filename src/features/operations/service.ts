import {supabase} from '../../lib/supabase';function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}function check(e:{message:string}|null){if(e)throw new Error(e.message)}
export async function listWorkOrders(){const {data,error}=await db().rpc('list_work_orders');check(error);return data??[];}
export async function createWorkOrder(payload:Record<string,unknown>){const {data,error}=await db().rpc('create_work_order',{p_payload:payload});check(error);return data;}
export async function updateWorkOrder(id:string,status:string,notes?:string){const {data,error}=await db().rpc('update_work_order',{p_id:id,p_status:status,p_notes:notes??null});check(error);return data;}
export async function listInventory(){const {data,error}=await db().rpc('list_inventory');check(error);return data??[];}
export async function registerInventoryMovement(payload:Record<string,unknown>){const {data,error}=await db().rpc('register_inventory_movement',{p_payload:payload});check(error);return data;}

export async function createInventoryItem(payload:Record<string,unknown>){const {data,error}=await db().rpc('create_inventory_item',{p_payload:payload});check(error);return data;}
