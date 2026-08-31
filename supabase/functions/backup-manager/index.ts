import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'
};

const direct=[
  'profiles','roles',
  'subscribers','subscriber_identities','water_connections','duplicate_reviews',
  'benefit_definitions','subscriber_benefits','portal_update_requests',
  'tariff_definitions','tariff_versions','service_catalog','obligations','debt_override_events',
  'consumption_tariff_schemes','consumption_tariff_blocks','meter_reading_batches','meter_readings',
  'document_template_versions','financial_documents','document_sequences','cash_sessions','payments','payment_events',
  'suppliers','expenses','bank_accounts','ledger_entries',
  'fiscal_periods','budget_categories','budget_lines',
  'integrations','integration_runs','system_update_state',
  'assets','maintenance_plans','work_orders','asset_maintenance_log',
  'inventory_items','inventory_movements',
  'system_health_checks','communication_messages','ocr_extractions','data_import_batches','data_import_rows'
];

const restoreOrder=[
  'roles','profiles',
  'subscribers','subscriber_identities','water_connections','duplicate_reviews',
  'benefit_definitions','subscriber_benefits','portal_update_requests',
  'tariff_definitions','tariff_versions','service_catalog','obligations','debt_override_events',
  'consumption_tariff_schemes','consumption_tariff_blocks','meter_reading_batches','meter_readings',
  'document_template_versions','document_sequences','cash_sessions','payments','payment_events','financial_documents',
  'suppliers','expenses','bank_accounts','ledger_entries',
  'fiscal_periods','budget_categories','budget_lines',
  'integrations','integration_runs','system_update_state',
  'assets','maintenance_plans','work_orders','asset_maintenance_log',
  'inventory_items','inventory_movements',
  'system_health_checks','communication_messages','ocr_extractions','data_import_batches','data_import_rows'
];

const fileBuckets=['subscriber-documents','expense-evidence','receipt-documents','organization-assets'];

async function sha256(text:string){
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return[...new Uint8Array(hash)].map(value=>value.toString(16).padStart(2,'0')).join('');
}

function toBase64(bytes:Uint8Array){
  let binary='';
  for(let index=0;index<bytes.length;index+=0x8000){
    binary+=String.fromCharCode(...bytes.subarray(index,Math.min(index+0x8000,bytes.length)));
  }
  return btoa(binary);
}

function fromBase64(value:string){
  const binary=atob(value);
  const bytes=new Uint8Array(binary.length);
  for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);
  return bytes;
}

async function collectFiles(admin:any,bucket:string,root:string){
  const output:any[]=[];
  async function walk(path:string){
    let offset=0;
    while(true){
      const{data,error}=await admin.storage.from(bucket).list(path,{limit:1000,offset,sortBy:{column:'name',order:'asc'}});
      if(error)throw error;
      const rows=data??[];
      for(const item of rows){
        const full=path?`${path}/${item.name}`:item.name;
        if(item.id){
          const{data:file,error:downloadError}=await admin.storage.from(bucket).download(full);
          if(downloadError||!file)throw downloadError??new Error('FILE_DOWNLOAD_FAILED');
          const bytes=new Uint8Array(await file.arrayBuffer());
          output.push({path:full,content_type:file.type||item.metadata?.mimetype||'application/octet-stream',size:bytes.length,base64:toBase64(bytes)});
        }else await walk(full);
      }
      if(rows.length<1000)break;
      offset+=1000;
    }
  }
  await walk(root);
  return output;
}

function defaultRetentionDays(value:unknown){
  const parsed=Number(value);
  if(Number.isFinite(parsed)&&parsed>=1&&parsed<=3650)return Math.floor(parsed);
  return 90;
}

async function resolveRetentionDays(admin:any,organizationId:string){
  const{data,error}=await admin.from('integrations').select('public_config').eq('organization_id',organizationId).eq('key','backup').limit(1).maybeSingle();
  if(error)return 90;
  return defaultRetentionDays((data?.public_config as any)?.retention_days);
}

async function pruneExpired(admin:any,organizationId:string,retentionDays:number,actorId:string){
  const cutoff=new Date(Date.now()-retentionDays*86_400_000).toISOString();
  const{data:expired}=await admin.from('backup_runs')
    .select('id,storage_path,checksum_sha256,size_bytes,completed_at')
    .eq('organization_id',organizationId)
    .in('status',['completed','restored'])
    .not('storage_path','is',null)
    .lt('completed_at',cutoff)
    .order('completed_at',{ascending:true})
    .limit(1000);
  let pruned=0;
  const failed:string[]=[];
  for(const row of expired??[]){
    const{error}=await admin.storage.from('system-backups').remove([row.storage_path]);
    if(error){failed.push(row.storage_path);continue;}
    const{error:updateError}=await admin.from('backup_runs').update({status:'pruned',storage_path:null,pruned_at:new Date().toISOString(),pruned_by:actorId}).eq('id',row.id).maybeSingle();
    if(updateError){failed.push(row.storage_path);continue;}
    await admin.from('audit_events').insert({organization_id:organizationId,actor_id:actorId,action:'backup.prune',entity_type:'backup_runs',entity_id:row.id,new_data:{retention_days:retentionDays,storage_path:row.storage_path,checksum:row.checksum_sha256,size_bytes:row.size_bytes}}).maybeSingle();
    pruned+=1;
  }
  return{pruned,failed};
}

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const url=Deno.env.get('SUPABASE_URL')!;
    const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const caller=createClient(url,anon,{global:{headers:{Authorization:request.headers.get('Authorization')??''}}});
    const{data:auth}=await caller.auth.getUser();
    if(!auth.user)throw new Error('AUTH_REQUIRED');

    const body=await request.json();
    const needed=body.action==='download'?'backups.read':'backups.manage';
    const{data:allowed}=await caller.rpc('has_permission',{p_code:needed});
    if(!allowed)throw new Error('FORBIDDEN');
    const{data:aal}=await caller.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal?.currentLevel!=='aal2')throw new Error('MFA_REQUIRED');

    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const{data:profile}=await admin.from('profiles').select('organization_id').eq('id',auth.user.id).single();
    if(!profile)throw new Error('PROFILE_NOT_FOUND');
    const organizationId=profile.organization_id;
    const retentionDays=await resolveRetentionDays(admin,organizationId);

    if(body.action==='create'){
      const{data:run,error:runError}=await admin.from('backup_runs').insert({organization_id:organizationId,status:'running',created_by:auth.user.id,retention_days:retentionDays}).select('id').single();
      if(runError)throw runError;
      try{
        const{data:organization,error:organizationError}=await admin.from('organizations').select('*').eq('id',organizationId).single();
        if(organizationError)throw organizationError;

        const tables:Record<string,unknown[]>={};
        const counts:Record<string,number>={};
        for(const table of direct){
          const{data,error}=await admin.from(table).select('*').eq('organization_id',organizationId);
          if(error)throw new Error(`${table}: ${error.message}`);
          tables[table]=data??[];
          counts[table]=(data??[]).length;
        }

        const roleIds=(tables.roles as any[]).map(row=>row.id);
        const profileIds=(tables.profiles as any[]).map(row=>row.id);
        const paymentIds=(tables.payments as any[]).map(row=>row.id);
        const junctions:Record<string,unknown[]>={};
        if(roleIds.length)junctions.role_permissions=(await admin.from('role_permissions').select('*').in('role_id',roleIds)).data??[];
        if(profileIds.length)junctions.user_roles=(await admin.from('user_roles').select('*').in('user_id',profileIds)).data??[];
        if(paymentIds.length){
          junctions.payment_allocations=(await admin.from('payment_allocations').select('*').in('payment_id',paymentIds)).data??[];
          junctions.payment_components=(await admin.from('payment_components').select('*').in('payment_id',paymentIds)).data??[];
        }

        const files:Record<string,unknown[]>={};
        for(const bucket of fileBuckets)files[bucket]=await collectFiles(admin,bucket,String(organizationId));

        const payload={
          format:'junta-agua-backup-v5',
          created_at:new Date().toISOString(),
          organization_id:organizationId,
          organization,
          tables,
          junctions,
          files
        };
        const json=JSON.stringify(payload);
        const checksum=await sha256(json);
        const path=`${organizationId}/${new Date().toISOString().replace(/[:.]/g,'-')}-${run.id}.json`;
        const{error:uploadError}=await admin.storage.from('system-backups').upload(path,new Blob([json],{type:'application/json'}),{upsert:false});
        if(uploadError)throw uploadError;

        const fileCount=Object.values(files).reduce((total:any,items:any)=>total+items.length,0);
        await admin.from('backup_runs').update({
          status:'completed',storage_path:path,checksum_sha256:checksum,
          size_bytes:new TextEncoder().encode(json).length,
          table_counts:{...counts,storage_files:fileCount},completed_at:new Date().toISOString()
        }).eq('id',run.id);

        const prune=await pruneExpired(admin,organizationId,retentionDays,auth.user.id);

        return new Response(JSON.stringify({ok:true,backup_id:run.id,checksum,storage_files:fileCount,format:payload.format,retention_days:retentionDays,pruned:prune.pruned,prune_failed:prune.failed.length}),{headers:{...cors,'Content-Type':'application/json'}});
      }catch(error){
        await admin.from('backup_runs').update({status:'failed',error_message:error instanceof Error?error.message:'UNKNOWN',completed_at:new Date().toISOString()}).eq('id',run.id);
        throw error;
      }
    }

    if(body.action==='download'){
      const{data:run}=await admin.from('backup_runs').select('storage_path').eq('id',body.backup_id).eq('organization_id',organizationId).in('status',['completed','restored']).single();
      if(!run)throw new Error('BACKUP_NOT_FOUND');
      const{data,error}=await admin.storage.from('system-backups').createSignedUrl(run.storage_path,300);
      if(error)throw error;
      return new Response(JSON.stringify({url:data.signedUrl}),{headers:{...cors,'Content-Type':'application/json'}});
    }

    if(body.action==='restore'){
      if(body.confirm_phrase!=='RESTAURAR')throw new Error('CONFIRMATION_REQUIRED');
      const{data:run}=await admin.from('backup_runs').select('*').eq('id',body.backup_id).eq('organization_id',organizationId).in('status',['completed','restored']).single();
      if(!run)throw new Error('BACKUP_NOT_FOUND');
      const{data:file,error:fileError}=await admin.storage.from('system-backups').download(run.storage_path);
      if(fileError||!file)throw new Error(fileError?.message??'FILE_NOT_FOUND');
      const text=await file.text();
      if(await sha256(text)!==run.checksum_sha256)throw new Error('CHECKSUM_MISMATCH');
      const payload=JSON.parse(text);
      if(payload.organization_id!==organizationId||!['junta-agua-backup-v1','junta-agua-backup-v2','junta-agua-backup-v3','junta-agua-backup-v4','junta-agua-backup-v5'].includes(payload.format))throw new Error('BACKUP_SCOPE_INVALID');

      const{data:session,error:sessionError}=await admin.from('backup_restore_sessions').insert({organization_id:organizationId,backup_run_id:run.id,requested_by:auth.user.id,status:'running'}).select('id').single();
      if(sessionError)throw sessionError;
      const failRestore=async(message:string)=>{
        await admin.from('backup_restore_sessions').update({status:'failed',error_message:message,finished_at:new Date().toISOString()}).eq('id',session.id).maybeSingle();
        await admin.from('backup_runs').update({status:'failed',error_message:`restore: ${message}`,completed_at:new Date().toISOString()}).eq('id',run.id).maybeSingle();
      };
      try{
        let restoredRows=0;
        let restoredFiles=0;
        if(payload.organization){
          const{error}=await admin.from('organizations').upsert(payload.organization);
          if(error)throw new Error(`organizations: ${error.message}`);
          restoredRows+=1;
        }
        for(const table of restoreOrder){
          const rows=payload.tables?.[table]??[];
          if(rows.length){
            const{error}=await admin.from(table).upsert(rows);
            if(error)throw new Error(`${table}: ${error.message}`);
            restoredRows+=rows.length;
          }
        }
        for(const table of ['role_permissions','user_roles','payment_allocations','payment_components']){
          const rows=payload.junctions?.[table]??[];
          if(rows.length){
            const{error}=await admin.from(table).upsert(rows);
            if(error)throw new Error(`${table}: ${error.message}`);
            restoredRows+=rows.length;
          }
        }
        for(const[bucket,items]of Object.entries(payload.files??{})){
          if(!fileBuckets.includes(bucket))continue;
          for(const item of items as any[]){
            if(!String(item.path).startsWith(`${organizationId}/`))throw new Error('FILE_SCOPE_INVALID');
            const{error}=await admin.storage.from(bucket).upload(item.path,fromBase64(item.base64),{upsert:true,contentType:item.content_type});
            if(error)throw new Error(`${bucket}/${item.path}: ${error.message}`);
            restoredFiles+=1;
          }
        }
        await admin.from('backup_restore_sessions').update({status:'completed',restored_format:payload.format,restored_rows:restoredRows,restored_files:restoredFiles,finished_at:new Date().toISOString()}).eq('id',session.id);
        await admin.from('backup_runs').update({status:'restored',restored_at:new Date().toISOString(),restored_by:auth.user.id}).eq('id',run.id);
        await admin.from('audit_events').insert({organization_id:organizationId,actor_id:auth.user.id,action:'backup.restore',entity_type:'backup_runs',entity_id:run.id,new_data:{format:payload.format,restored_rows:restoredRows,restored_files:restoredFiles,backup_run_id:run.id}});
        return new Response(JSON.stringify({ok:true,format:payload.format,restored_rows:restoredRows,restored_files:restoredFiles,restore_session_id:session.id}),{headers:{...cors,'Content-Type':'application/json'}});
      }catch(error){
        const message=error instanceof Error?error.message:'UNKNOWN_ERROR';
        await failRestore(message);
        throw error;
      }
    }

    throw new Error('INVALID_ACTION');
  }catch(error){
    return new Response(JSON.stringify({error:error instanceof Error?error.message:'UNKNOWN_ERROR'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
  }
});
