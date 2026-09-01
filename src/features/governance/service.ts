import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function check(error:{message:string}|null){if(error)throw new Error(error.message);}
export async function setInstitutionalPosition(payload:Record<string,unknown>){const {data,error}=await db().rpc('set_institutional_position',payload);check(error);return data as string;}
export async function getBoardMembers(){const {data,error}=await db().rpc('get_board_members');check(error);return data??[];}
export async function createResolution(payload:Record<string,unknown>){const {data,error}=await db().rpc('create_resolution',payload);check(error);return data as string;}
export async function createMeeting(payload:Record<string,unknown>){const {data,error}=await db().rpc('create_meeting',payload);check(error);return data as string;}
export async function saveMinutes(meetingId:string,content:string){const {data,error}=await db().rpc('save_minutes',{p_meeting_id:meetingId,p_content:content});check(error);return data as string;}
export async function createProject(payload:Record<string,unknown>){const {data,error}=await db().rpc('create_project',payload);check(error);return data as string;}
export async function listResolutions(){const {data,error}=await db().from('resolutions').select('id,number,title,resolution_type,status,effective_date,requires_validation').order('created_at',{ascending:false}).limit(100);if(error)throw new Error(error.message);return data??[];}
export async function listProjects(){const {data,error}=await db().from('projects').select('id,code,name,status,funding,budget,start_date,end_date').order('created_at',{ascending:false}).limit(100);if(error)throw new Error(error.message);return data??[];}
export async function listMeetings(){const {data,error}=await db().from('meetings').select('id,reunion_type,status,title,scheduled_at,place').order('scheduled_at',{ascending:false}).limit(100);if(error)throw new Error(error.message);return data??[];}
export async function getGovernanceSummary(){const {data,error}=await db().rpc('get_governance_summary');check(error);return data;}
