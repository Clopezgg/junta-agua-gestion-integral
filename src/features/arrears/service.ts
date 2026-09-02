import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function check(error:{message:string}|null){if(error)throw new Error(error.message);}
export async function createPaymentArrangement(payload:Record<string,unknown>){const {data,error}=await db().rpc('create_payment_arrangement',payload);check(error);return data as string;}
export async function listPaymentArrangements(status?:string){const {data,error}=await db().rpc('list_payment_arrangements',{p_status:status??null});check(error);return data??[];}
export async function listArrangementsWorkspace(status?:string){const {data,error}=await db().rpc('list_arrangements_workspace',{p_status:status??null});check(error);return (data??[]) as Array<Record<string,any>>;}
export async function getPortfolioOverview(asOf?:string){const {data,error}=await db().rpc('get_portfolio_overview',{p_as_of:asOf??null});check(error);return data as Record<string,any>|null;}
export async function getArrangementDetail(id:string){const {data,error}=await db().rpc('get_arrangement_detail',{p_arrangement_id:id});check(error);return data;}
export async function markArrangementInstallmentPaid(id:string,installmentNo:number,paidAmount?:number,paymentId:string|null=null){const {data,error}=await db().rpc('mark_arrangement_installment_paid',{p_arrangement_id:id,p_installment_no:installmentNo,p_paid_amount:paidAmount??null,p_payment_id:paymentId});check(error);return data;}
