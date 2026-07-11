import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function check(error:{message:string}|null){if(error)throw new Error(error.message);}
export async function listUsers(){const {data,error}=await db().rpc('list_organization_users');check(error);return data??[];}
export async function listRoles(){const {data,error}=await db().rpc('list_organization_roles');check(error);return data??[];}
export async function inviteUser(payload:{email:string;full_name:string;username:string;role_id:string}){const {data,error}=await db().functions.invoke('admin-create-user',{body:payload});if(error)throw new Error(error.message);if(data?.error)throw new Error(data.error);return data;}
export async function setUserStatus(userId:string,status:'active'|'inactive'|'blocked'){const {error}=await db().rpc('set_user_status',{p_user_id:userId,p_status:status});check(error);}
