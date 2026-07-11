import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'
};

function versionParts(value:string){
  const clean=value.trim().replace(/^v/i,'').split('-')[0];
  const parts=clean.split('.').map(part=>Number(part));
  if(parts.some(part=>!Number.isInteger(part)||part<0))throw new Error('INVALID_VERSION');
  return[parts[0]??0,parts[1]??0,parts[2]??0];
}
function newer(latest:string,current:string){
  const a=versionParts(latest);const b=versionParts(current);
  for(let index=0;index<3;index++){if(a[index]>b[index])return true;if(a[index]<b[index])return false}
  return false;
}
function summary(text:unknown,limit=1000){
  return typeof text==='string'?text.replace(/\r/g,'').slice(0,limit):'';
}

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
  const started=Date.now();
  let admin:any;let organizationId='';let actorId='';
  try{
    const url=Deno.env.get('SUPABASE_URL')!;
    const anon=Deno.env.get('SUPABASE_ANON_KEY')!;
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const caller=createClient(url,anon,{global:{headers:{Authorization:request.headers.get('Authorization')??''}}});
    const{data:auth}=await caller.auth.getUser();
    if(!auth.user)throw new Error('AUTH_REQUIRED');
    actorId=auth.user.id;
    const{data:allowed}=await caller.rpc('has_permission',{p_code:'updates.read'});
    if(!allowed)throw new Error('FORBIDDEN');
    admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const{data:profile}=await admin.from('profiles').select('organization_id').eq('id',actorId).single();
    if(!profile)throw new Error('PROFILE_NOT_FOUND');
    organizationId=profile.organization_id;

    const body=await request.json();
    const currentVersion=String(body.currentVersion??'').trim();
    versionParts(currentVersion);

    const{data:integration}=await admin.from('integrations').select('public_config').eq('organization_id',organizationId).eq('key','github_updates').maybeSingle();
    const repository=String(Deno.env.get('GITHUB_REPOSITORY')||integration?.public_config?.repository||'Clopezgg/junta-agua-gestion-integral');
    const cacheHours=Math.min(24,Math.max(1,Number(integration?.public_config?.cache_hours??6)));
    const{data:cached}=await admin.from('system_update_state').select('*').eq('organization_id',organizationId).maybeSingle();
    if(cached&&new Date(cached.checked_at).getTime()>Date.now()-cacheHours*3600000&&cached.current_version===currentVersion){
      return new Response(JSON.stringify({
        ok:cached.status==='success',currentVersion,latestVersion:cached.latest_version,
        updateAvailable:cached.update_available,releaseUrl:cached.release_url,
        message:cached.update_available?'Hay una actualización disponible.':'No se detectaron actualizaciones.',
        cached:true
      }),{headers:{...cors,'Content-Type':'application/json'}});
    }

    const token=Deno.env.get('GITHUB_RELEASE_TOKEN');
    if(!token)throw new Error('GITHUB_RELEASE_TOKEN_NOT_CONFIGURED');
    const response=await fetch(`https://api.github.com/repos/${repository}/releases/latest`,{
      headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'junta-agua-update-checker'}
    });
    const payload=await response.json();
    if(!response.ok)throw new Error(`GITHUB_RELEASE_HTTP_${response.status}:${String(payload?.message??'UNKNOWN')}`);
    const latestVersion=String(payload.tag_name??payload.name??'').replace(/^v/i,'');
    versionParts(latestVersion);
    const updateAvailable=newer(latestVersion,currentVersion);
    const state={
      organization_id:organizationId,current_version:currentVersion,latest_version:latestVersion,
      update_available:updateAvailable,release_url:payload.html_url??null,release_name:payload.name??payload.tag_name??null,
      release_notes:summary(payload.body,4000),published_at:payload.published_at??null,checked_at:new Date().toISOString(),
      status:'success',error_message:null,details:{repository,tag:payload.tag_name,prerelease:Boolean(payload.prerelease),draft:Boolean(payload.draft)},checked_by:actorId
    };
    await admin.from('system_update_state').upsert(state);
    await admin.from('integrations').upsert({
      organization_id:organizationId,key:'github_updates',enabled:true,secret_configured:true,
      public_config:{...(integration?.public_config??{}),repository,cache_hours:cacheHours},
      last_checked_at:new Date().toISOString(),last_error:null,updated_by:actorId
    },{onConflict:'organization_id,key'});
    await admin.from('integration_runs').insert({
      organization_id:organizationId,integration_key:'github_updates',operation:'check_latest_release',status:'success',
      request_summary:{current_version:currentVersion,repository},
      response_summary:{latest_version:latestVersion,update_available:updateAvailable,release_url:payload.html_url},
      started_at:new Date(started).toISOString(),completed_at:new Date().toISOString(),duration_ms:Date.now()-started,actor_id:actorId
    });
    return new Response(JSON.stringify({
      ok:true,currentVersion,latestVersion,updateAvailable,releaseUrl:payload.html_url,
      message:updateAvailable?`Nueva versión ${latestVersion} disponible.`:`La versión ${currentVersion} está actualizada.`,cached:false
    }),{headers:{...cors,'Content-Type':'application/json'}});
  }catch(error){
    const message=error instanceof Error?error.message:'UNKNOWN_ERROR';
    if(admin&&organizationId){
      await admin.from('system_update_state').upsert({
        organization_id:organizationId,current_version:'unknown',update_available:false,
        checked_at:new Date().toISOString(),status:'failed',error_message:message,details:{},checked_by:actorId||null
      }).catch(()=>undefined);
      await admin.from('integration_runs').insert({
        organization_id:organizationId,integration_key:'github_updates',operation:'check_latest_release',status:'failed',
        error_code:message.split(':')[0],error_message:message,started_at:new Date(started).toISOString(),
        completed_at:new Date().toISOString(),duration_ms:Date.now()-started,actor_id:actorId||null
      }).catch(()=>undefined);
      await admin.from('integrations').upsert({
        organization_id:organizationId,key:'github_updates',enabled:false,secret_configured:message!=='GITHUB_RELEASE_TOKEN_NOT_CONFIGURED',
        last_checked_at:new Date().toISOString(),last_error:message,updated_by:actorId||null
      },{onConflict:'organization_id,key'}).catch(()=>undefined);
    }
    return new Response(JSON.stringify({ok:false,message,updateAvailable:false}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
  }
});
