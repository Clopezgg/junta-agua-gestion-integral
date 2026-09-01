import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function check(error:{message:string}|null){if(error)throw new Error(error.message);}
export async function registerCompliance(payload:Record<string,unknown>){const {data,error}=await db().rpc('register_compliance_obligation',payload);check(error);return data as string;}
export async function upsertComplianceStatus(id:string,status:string,evidence?:string){const {data,error}=await db().rpc('upsert_compliance_status',{p_compliance_id:id,p_status:status,p_evidence:evidence??null});check(error);return data;}
export async function listCompliance(status?:string){const {data,error}=await db().rpc('list_compliance',{p_status:status??null});check(error);return data??[];}
export async function createCalendarEvent(payload:Record<string,unknown>){const {data,error}=await db().rpc('create_calendar_event',payload);check(error);return data as string;}
export async function listCalendarEvents(year?:number){const {data,error}=await db().rpc('list_calendar_events',{p_year:year??null});check(error);return data??[];}
export async function getTransparencyReport(year:number){const {data,error}=await db().rpc('get_transparency_report_v5',{p_year:year});check(error);return data;}
