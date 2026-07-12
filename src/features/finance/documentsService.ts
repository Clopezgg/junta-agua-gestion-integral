import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function fail(error:{message:string}|null){if(error)throw new Error(error.message);}
export async function postAnnualFinancialDocument(obligationId:string){const{data,error}=await db().rpc('post_annual_financial_document',{p_obligation_id:obligationId});fail(error);return data;}
export async function postPaymentFinancialDocument(paymentId:string){const{data,error}=await db().rpc('post_payment_financial_document',{p_payment_id:paymentId});fail(error);return data;}
export async function reverseFinancialDocument(documentId:string,reason:string,reversalType:'void_document'|'refund_document'|'credit_note'){const{data,error}=await db().rpc('reverse_financial_document',{p_document_id:documentId,p_reason:reason,p_reversal_type:reversalType});fail(error);return data;}
export async function listFinancialDocuments(query='',documentType='',status='',limit=100){const{data,error}=await db().rpc('list_financial_documents',{p_query:query||null,p_document_type:documentType||null,p_status:status||null,p_limit:limit});fail(error);return data??[];}
export async function getActiveDocumentTemplate(documentType:string){const{data,error}=await db().rpc('get_active_document_template',{p_document_type:documentType});fail(error);return data;}
