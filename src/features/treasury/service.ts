import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function check(error:{message:string}|null){if(error)throw new Error(error.message);}
export async function importBankStatement(payload:Record<string,unknown>){const {data,error}=await db().rpc('import_bank_statement',payload);check(error);return data as string;}
export async function listBankTransactions(status?:string,bankAccountId?:string){const {data,error}=await db().rpc('list_bank_transactions',{p_status:status??null,p_bank_account_id:bankAccountId??null});check(error);return data??[];}
export async function linkBankTransaction(id:string,kind:'payment'|'expense',sourceId:string){const {data,error}=await db().rpc('link_bank_transaction',{p_transaction_id:id,p_kind:kind,p_source_id:sourceId});check(error);return data;}
export async function listBankAccounts(){const {data,error}=await db().from('bank_accounts').select('id,name,account_mask,currency,opening_balance,active');if(error)throw new Error(error.message);return data??[];}
