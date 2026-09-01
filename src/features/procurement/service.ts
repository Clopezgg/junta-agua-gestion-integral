import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function check(error:{message:string}|null){if(error)throw new Error(error.message);}
export async function createPurchaseOrder(payload:Record<string,unknown>){const {data,error}=await db().rpc('create_purchase_order',payload);check(error);return data as string;}
export async function listPurchaseOrders(status?:string){const {data,error}=await db().rpc('list_purchase_orders',{p_status:status??null});check(error);return data??[];}
export async function receivePurchaseOrder(orderId:string,lineReceipts:unknown[]){const {data,error}=await db().rpc('receive_purchase_order',{p_order_id:orderId,p_line_receipts:lineReceipts});check(error);return data;}
