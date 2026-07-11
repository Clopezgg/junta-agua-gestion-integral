import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
  const started=Date.now();let admin:any;let organizationId='';let actorId='';let key='';
  try{
    const url=Deno.env.get('SUPABASE_URL')!;const anon=Deno.env.get('SUPABASE_ANON_KEY')!;const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const caller=createClient(url,anon,{global:{headers:{Authorization:request.headers.get('Authorization')??''}}});
    const{data:auth}=await caller.auth.getUser();if(!auth.user)throw new Error('AUTH_REQUIRED');actorId=auth.user.id;
    const{data:allowed}=await caller.rpc('has_permission',{p_code:'integrations.manage'});if(!allowed)throw new Error('FORBIDDEN');
    const{data:aal}=await caller.auth.mfa.getAuthenticatorAssuranceLevel();if(aal?.currentLevel!=='aal2')throw new Error('MFA_REQUIRED');
    admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const{data:profile}=await admin.from('profiles').select('organization_id').eq('id',actorId).single();if(!profile)throw new Error('PROFILE_NOT_FOUND');
    organizationId=profile.organization_id;key=String((await request.json()).key??'');
    let ok=false;let message='';let details:Record<string,unknown>={};

    if(key==='email'){
      const token=Deno.env.get('RESEND_API_KEY');if(!token)throw new Error('RESEND_API_KEY_NOT_CONFIGURED');
      const response=await fetch('https://api.resend.com/domains',{headers:{Authorization:`Bearer ${token}`}});
      ok=response.ok;message=ok?'Resend respondió correctamente.':`Resend respondió ${response.status}.`;
    }else if(key==='whatsapp'){
      const token=Deno.env.get('WHATSAPP_ACCESS_TOKEN');const phoneId=Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
      if(!token||!phoneId)throw new Error('WHATSAPP_SECRETS_NOT_CONFIGURED');
      const response=await fetch(`https://graph.facebook.com/v23.0/${phoneId}?fields=display_phone_number,verified_name`,{headers:{Authorization:`Bearer ${token}`}});
      const payload=await response.json();ok=response.ok;message=ok?'WhatsApp Cloud API respondió correctamente.':String(payload?.error?.message??`HTTP ${response.status}`);details=ok?payload:{};
    }else if(key==='ocr'){
      const apiKey=Deno.env.get('GOOGLE_VISION_API_KEY');if(!apiKey)throw new Error('GOOGLE_VISION_API_KEY_NOT_CONFIGURED');
      const pixel='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const response=await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requests:[{image:{content:pixel},features:[{type:'TEXT_DETECTION'}]}]})});
      ok=response.ok;message=ok?'Google Vision respondió correctamente.':`Google Vision respondió ${response.status}.`;
    }else if(key==='backup'){
      const{error}=await admin.storage.from('system-backups').list(organizationId,{limit:1});ok=!error;message=ok?'El almacenamiento privado de respaldos está disponible.':error!.message;
    }else if(key==='google_maps'){
      ok=Deno.env.get('GOOGLE_MAPS_API_KEY_CONFIGURED')==='true';
      message=ok?'La clave del mapa está declarada como configurada. Verifique además la carga desde Render.':'Configure VITE_GOOGLE_MAPS_API_KEY en Render y GOOGLE_MAPS_API_KEY_CONFIGURED=true en Supabase.';
    }else throw new Error('INVALID_INTEGRATION');

    if(!ok)throw new Error(message||'INTEGRATION_TEST_FAILED');
    await admin.from('integrations').upsert({organization_id:organizationId,key,enabled:true,secret_configured:true,last_checked_at:new Date().toISOString(),last_error:null,updated_by:actorId},{onConflict:'organization_id,key'});
    await admin.from('integration_runs').insert({
      organization_id:organizationId,integration_key:key,operation:'connection_test',status:'success',
      response_summary:{message,details},started_at:new Date(started).toISOString(),completed_at:new Date().toISOString(),
      duration_ms:Date.now()-started,actor_id:actorId
    });
    return new Response(JSON.stringify({ok:true,message,details}),{headers:{...cors,'Content-Type':'application/json'}});
  }catch(error){
    const message=error instanceof Error?error.message:'UNKNOWN_ERROR';
    if(admin&&organizationId&&key){
      await admin.from('integrations').upsert({organization_id:organizationId,key,enabled:false,last_checked_at:new Date().toISOString(),last_error:message,updated_by:actorId||null},{onConflict:'organization_id,key'}).catch(()=>undefined);
      await admin.from('integration_runs').insert({
        organization_id:organizationId,integration_key:key,operation:'connection_test',status:'failed',
        error_code:message.split(':')[0],error_message:message,started_at:new Date(started).toISOString(),
        completed_at:new Date().toISOString(),duration_ms:Date.now()-started,actor_id:actorId||null
      }).catch(()=>undefined);
    }
    return new Response(JSON.stringify({ok:false,message}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
  }
});
