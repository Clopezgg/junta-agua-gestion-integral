import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function check(error:{message:string}|null){if(error)throw new Error(error.message);}
export async function listWarehouses(){const {data,error}=await db().rpc('list_warehouses');check(error);return data??[];}
export async function createWarehouse(code:string,name:string,address?:string){const {data,error}=await db().rpc('create_warehouse',{p_code:code,p_name:name,p_address:address??null});check(error);return data as string;}
export async function getInventoryWithWarehouses(){const {data,error}=await db().rpc('get_inventory_with_warehouses');check(error);return data??[];}
