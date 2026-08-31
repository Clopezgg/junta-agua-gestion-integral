import { supabase } from '../../lib/supabase'; import type { SubscriberInput,ConnectionInput } from './validation';
function requireDb(){if(!supabase) throw new Error('La base segura aún no está configurada.'); return supabase;}
export async function searchSubscribers(query:string){const db=requireDb(); const {data,error}=await db.rpc('search_subscribers',{p_query:query,p_limit:50}); if(error) throw new Error(error.message); return data??[];}
export async function checkDuplicates(input:SubscriberInput){const db=requireDb(); const {data,error}=await db.rpc('check_subscriber_duplicates',{p_full_name:input.full_name,p_document_type:input.document_type,p_document_number:input.document_number,p_issuing_country:input.issuing_country,p_whatsapp:input.whatsapp,p_sector:input.sector}); if(error) throw new Error(error.message); return data??[];}
export async function createSubscriber(input:SubscriberInput,homonymNote?:string,matchedSubscriberId?:string){const db=requireDb(); const {data,error}=await db.rpc('create_subscriber',{p_payload:input,p_homonym_note:homonymNote??null,p_matched_subscriber_id:matchedSubscriberId??null}); if(error) throw new Error(error.message); const subscriberId=String(data); if(subscriberId&&input.birth_date){const{error:benefitError}=await db.rpc('sync_senior_benefit',{p_subscriber_id:subscriberId,p_reference_date:new Date().toISOString().slice(0,10)});if(benefitError&&!benefitError.message.includes('BENEFIT_NOT_CONFIGURED'))throw new Error(benefitError.message);} return data;}
export async function getSubscriberDetail(id:string){const db=requireDb(); const {data,error}=await db.rpc('get_subscriber_detail',{p_subscriber_id:id}); if(error) throw new Error(error.message); return data;}
export async function getSubscriberDigitalCard(id:string){const db=requireDb();const{data,error}=await db.rpc('get_subscriber_digital_card',{p_subscriber_id:id});if(error)throw new Error(error.message);return data;}
export async function createConnection(subscriberId:string,input:ConnectionInput){const db=requireDb(); const {data,error}=await db.rpc('create_water_connection',{p_subscriber_id:subscriberId,p_payload:input}); if(error) throw new Error(error.message); return data;}
export async function updateSubscriber(id:string,payload:Record<string,unknown>){const db=requireDb(); const {data,error}=await db.rpc('update_subscriber',{p_subscriber_id:id,p_payload:payload}); if(error) throw new Error(error.message); return data;}
export async function updateConnection(id:string,payload:Record<string,unknown>){const db=requireDb(); const {data,error}=await db.rpc('update_water_connection',{p_connection_id:id,p_payload:payload}); if(error) throw new Error(error.message); return data;}
export async function uploadIdentityDocument(subscriberId:string,file:File){
 const db=requireDb();
 if(file.size>10*1024*1024)throw new Error('El archivo supera 10 MB.');
 if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))throw new Error('Formato no permitido.');
 const {data:auth}=await db.auth.getUser();
 const {data:profile,error:profileError}=await db.from('profiles').select('organization_id').eq('id',auth.user?.id??'').single();
 if(profileError||!profile)throw new Error('No se pudo determinar la organización.');
 const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${profile.organization_id}/${subscriberId}/${crypto.randomUUID()}-${safe}`;
 const {error}=await db.storage.from('subscriber-documents').upload(path,file,{upsert:false});if(error)throw new Error(error.message);
 const {error:attachError}=await db.rpc('attach_identity_document',{p_subscriber_id:subscriberId,p_storage_path:path});
 if(attachError){await db.storage.from('subscriber-documents').remove([path]);throw new Error(attachError.message);}
 const{error:benefitError}=await db.rpc('sync_senior_benefit',{p_subscriber_id:subscriberId,p_reference_date:new Date().toISOString().slice(0,10)});if(benefitError&&!benefitError.message.includes('BENEFIT_NOT_CONFIGURED'))throw new Error(benefitError.message);
 return path;
}
export async function uploadSubscriberPhoto(subscriberId:string,file:File){
 const db=requireDb();
 if(file.size>5*1024*1024)throw new Error('La fotografía supera 5 MB.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('La fotografía debe ser JPG, PNG o WEBP.');
 const{data:auth}=await db.auth.getUser();
 const{data:profile,error:profileError}=await db.from('profiles').select('organization_id').eq('id',auth.user?.id??'').single();
 if(profileError||!profile)throw new Error('No se pudo determinar la organización.');
 const extension=file.name.split('.').pop()?.toLowerCase()||'jpg';
 const path=`${profile.organization_id}/${subscriberId}/profile/${crypto.randomUUID()}.${extension}`;
 const{error}=await db.storage.from('subscriber-documents').upload(path,file,{upsert:false,contentType:file.type});if(error)throw new Error(error.message);
 const{error:attachError}=await db.rpc('attach_subscriber_photo',{p_subscriber_id:subscriberId,p_storage_path:path});if(attachError){await db.storage.from('subscriber-documents').remove([path]);throw new Error(attachError.message);}
 return path;
}
export async function getSubscriberDocumentUrl(path?:string|null){if(!path)return'';const db=requireDb();const{data,error}=await db.storage.from('subscriber-documents').createSignedUrl(path,600);if(error)throw new Error(error.message);return data?.signedUrl??'';}
export async function uploadTemporaryIdentityDocument(file:File){
 const db=requireDb();
 if(file.size>10*1024*1024)throw new Error('El archivo supera 10 MB.');
 if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))throw new Error('Formato no permitido.');
 const {data:auth}=await db.auth.getUser();
 const {data:profile,error:profileError}=await db.from('profiles').select('organization_id').eq('id',auth.user?.id??'').single();
 if(profileError||!profile)throw new Error('No se pudo determinar la organización.');
 const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${profile.organization_id}/pending/${crypto.randomUUID()}-${safe}`;
 const {error}=await db.storage.from('subscriber-documents').upload(path,file,{upsert:false});if(error)throw new Error(error.message);
 return path;
}
export async function attachExistingIdentityDocument(subscriberId:string,path:string){const db=requireDb();const {error}=await db.rpc('attach_identity_document',{p_subscriber_id:subscriberId,p_storage_path:path});if(error)throw new Error(error.message);const{error:benefitError}=await db.rpc('sync_senior_benefit',{p_subscriber_id:subscriberId,p_reference_date:new Date().toISOString().slice(0,10)});if(benefitError&&!benefitError.message.includes('BENEFIT_NOT_CONFIGURED'))throw new Error(benefitError.message);return path;}
export async function importSubscriberWithConnection(subscriber:SubscriberInput,connection?:ConnectionInput){
 const db=requireDb();
 const {data,error}=await db.rpc('import_subscriber_with_connection',{p_subscriber:subscriber,p_connection:connection??null});
 if(error)throw new Error(error.message);
 if(data?.subscriber_id&&subscriber.birth_date){const{error:benefitError}=await db.rpc('sync_senior_benefit',{p_subscriber_id:data.subscriber_id,p_reference_date:new Date().toISOString().slice(0,10)});if(benefitError&&!benefitError.message.includes('BENEFIT_NOT_CONFIGURED'))throw new Error(benefitError.message);}
 return data as {subscriber_id:string;connection_id?:string|null};
}
