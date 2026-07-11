import {supabase} from '../../lib/supabase';
function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
export async function listBackups(){const {data,error}=await db().rpc('list_backup_runs');if(error)throw error;return data??[];}
export async function createBackup(){const {data,error}=await db().functions.invoke('backup-manager',{body:{action:'create'}});if(error)throw new Error(error.message);return data;}
export async function downloadBackup(id:string){const {data,error}=await db().functions.invoke('backup-manager',{body:{action:'download',backup_id:id}});if(error)throw new Error(error.message);return data as {url:string};}
export async function restoreBackup(id:string,phrase:string){const {data,error}=await db().functions.invoke('backup-manager',{body:{action:'restore',backup_id:id,confirm_phrase:phrase}});if(error)throw new Error(error.message);return data;}
