import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function fail(error:{message:string}|null){if(error)throw new Error(error.message);}
export async function listDocumentTemplates(){const{data,error}=await db().rpc('list_document_templates');fail(error);return data??[];}
export async function saveDocumentTemplate(documentType:string,name:string,configuration:Record<string,unknown>,reason=''){const{data,error}=await db().rpc('save_document_template',{p_document_type:documentType,p_name:name,p_configuration:configuration,p_reason:reason||null});fail(error);return data;}
export async function activateDocumentTemplate(templateId:string){const{data,error}=await db().rpc('activate_document_template',{p_template_id:templateId});fail(error);return data;}
export async function listServiceCatalog(){const{data,error}=await db().rpc('list_service_catalog');fail(error);return data??[];}
export async function saveServiceCatalogItem(payload:Record<string,unknown>){const{data,error}=await db().rpc('save_service_catalog_item',{p_payload:payload});fail(error);return data;}
export async function calculateAnnualCharge(subscriberId:string,year:number,unitAmount?:number){const{data,error}=await db().rpc('calculate_annual_charge',{p_subscriber_id:subscriberId,p_year:year,p_unit_amount:unitAmount??null});fail(error);return data;}
export async function syncSeniorBenefit(subscriberId:string,referenceDate?:string){const{data,error}=await db().rpc('sync_senior_benefit',{p_subscriber_id:subscriberId,p_reference_date:referenceDate??null});fail(error);return data;}
export async function getSubscriberDigitalCard(subscriberId:string){const{data,error}=await db().rpc('get_subscriber_digital_card',{p_subscriber_id:subscriberId});fail(error);return data;}
