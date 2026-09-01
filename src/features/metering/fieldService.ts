import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function fail(error:{message:string}|null){if(error)throw new Error(error.message);}

export type FieldReadingStatus='captured'|'synced'|'validated'|'rejected';
export interface FieldReadingPayload{
 connection_id:string;batch_id?:string;previous_reading:number;current_reading:number;
 gps_lat?:number;gps_lng?:number;gps_accuracy_m?:number;
 photo_url?:string;photo_bucket?:string;notes?:string;anomaly_code?:string;
 captured_at?:string;offline_id?:string;technician_id?:string;
}

export async function listFieldReadings(status:string|null=null,technicianId:string|null=null,batchId:string|null=null){
 const{data,error}=await db().rpc('list_field_readings',{p_status:status,p_technician_id:technicianId,p_batch_id:batchId});
 fail(error);return data??[];
}
export async function getFieldReading(id:string){
 const{data,error}=await db().rpc('get_field_reading',{p_id:id});fail(error);return data;
}
export async function captureFieldReading(payload:FieldReadingPayload){
 const{data,error}=await db().rpc('capture_field_reading',{p_payload:payload});fail(error);return data;
}
export async function syncFieldReadings(readings:FieldReadingPayload[]){
 const{data,error}=await db().rpc('sync_field_readings',{p_readings:readings});fail(error);return data;
}
export async function validateFieldReading(id:string,status:'validated'|'rejected'){
 const{data,error}=await db().rpc('validate_field_reading',{p_id:id,p_status:status});fail(error);return data;
}
export async function uploadFieldPhoto(readingId:string,bucket:string,path:string){
 const{data,error}=await db().rpc('upload_field_photo',{p_reading_id:readingId,p_bucket:bucket,p_path:path});fail(error);return data;
}
export function generateOfflineId():string{
 return `offline_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
}
export function getGeoLocation():Promise<{lat:number;lng:number;accuracy:number}>{
 return new Promise((resolve,reject)=>{
  if(!navigator.geolocation){reject(new Error('GPS no disponible'));return;}
  navigator.geolocation.getCurrentPosition(
   pos=>resolve({lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy}),
   err=>reject(new Error(`GPS: ${err.message}`)),
   {enableHighAccuracy:true,timeout:10000,maximumAge:60000}
  );
 });
}
export const OFFLINE_QUEUE_KEY='junta-field-readings-queue';
export function loadOfflineQueue():FieldReadingPayload[]{
 try{return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)??'[]');}catch{return[];}
}
export function saveOfflineQueue(queue:FieldReadingPayload[]):void{
 localStorage.setItem(OFFLINE_QUEUE_KEY,JSON.stringify(queue));
}
export function addToOfflineQueue(reading:FieldReadingPayload):FieldReadingPayload[]{
 const queue=loadOfflineQueue();queue.push(reading);saveOfflineQueue(queue);return queue;
}
export function removeFromOfflineQueue(index:number):FieldReadingPayload[]{
 const queue=loadOfflineQueue();queue.splice(index,1);saveOfflineQueue(queue);return queue;
}
