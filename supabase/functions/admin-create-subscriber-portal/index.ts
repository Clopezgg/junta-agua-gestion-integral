import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const normalize=(value:string)=>value.replace(/\D/g,'');
const randomPassword=()=>`${crypto.randomUUID().replace(/-/g,'').slice(0,12)}Aa!7`;

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
    const url=Deno.env.get('SUPABASE_URL');
    const anon=Deno.env.get('SUPABASE_ANON_KEY');
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!anon||!service)throw new Error('SERVER_CONFIGURATION_MISSING');

    const authorization=req.headers.get('Authorization')??'';
    const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
    const{data:auth,error:authError}=await caller.auth.getUser();
    if(authError||!auth.user)throw new Error('AUTH_REQUIRED');
    const{data:allowed,error:permissionError}=await caller.rpc('has_permission',{p_code:'portal.manage'});
    if(permissionError||!allowed)throw new Error('FORBIDDEN');
    const{data:aal}=await caller.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal?.currentLevel!=='aal2')throw new Error('MFA_REQUIRED');

    const body=await req.json();
    const subscriberId=String(body.subscriber_id??'');
    const requestedPassword=String(body.temporary_password??'');
    if(!subscriberId)throw new Error('SUBSCRIBER_REQUIRED');
    const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
    const{data:callerProfile,error:profileError}=await admin.from('profiles').select('organization_id').eq('id',auth.user.id).single();
    if(profileError||!callerProfile)throw new Error('CALLER_PROFILE_NOT_FOUND');
    const{data:subscriber,error:subscriberError}=await admin.from('subscribers').select('id,organization_id,full_name').eq('id',subscriberId).eq('organization_id',callerProfile.organization_id).single();
    if(subscriberError||!subscriber)throw new Error('SUBSCRIBER_NOT_FOUND');
    const{data:identity,error:identityError}=await admin.from('subscriber_identities').select('normalized_number').eq('subscriber_id',subscriberId).eq('is_primary',true).single();
    if(identityError||!identity?.normalized_number)throw new Error('PRIMARY_DNI_REQUIRED');
    const normalizedDni=normalize(identity.normalized_number);
    if(normalizedDni.length<8)throw new Error('INVALID_DNI');

    const{data:existing}=await admin.from('subscriber_portal_accounts').select('user_id,status').eq('subscriber_id',subscriberId).maybeSingle();
    const temporaryPassword=requestedPassword.length>=10?requestedPassword:randomPassword();
    let userId=existing?.user_id as string|undefined;
    const syntheticEmail=`portal.${callerProfile.organization_id}.${normalizedDni}@junta.local`;

    if(userId){
      const{error:updateError}=await admin.auth.admin.updateUserById(userId,{password:temporaryPassword,user_metadata:{account_kind:'subscriber',subscriber_id:subscriberId,dni_last4:normalizedDni.slice(-4)}});
      if(updateError)throw updateError;
    }else{
      const{data:created,error:createError}=await admin.auth.admin.createUser({email:syntheticEmail,password:temporaryPassword,email_confirm:true,user_metadata:{account_kind:'subscriber',subscriber_id:subscriberId,dni_last4:normalizedDni.slice(-4)}});
      if(createError||!created.user)throw createError??new Error('PORTAL_USER_NOT_CREATED');
      userId=created.user.id;
    }

    const{error:linkError}=await admin.from('subscriber_portal_accounts').upsert({organization_id:subscriber.organization_id,subscriber_id:subscriberId,user_id:userId,status:'active',identity_verified_at:new Date().toISOString(),invited_by:auth.user.id,invited_at:new Date().toISOString(),must_change_password:true,failed_login_count:0,locked_until:null},{onConflict:'subscriber_id'});
    if(linkError)throw linkError;
    await admin.from('subscribers').update({portal_enabled:true}).eq('id',subscriberId);
    await admin.from('audit_events').insert({organization_id:subscriber.organization_id,actor_id:auth.user.id,action:'portal.account.create_or_reset',entity_type:'subscriber_portal_accounts',entity_id:subscriberId,new_data:{subscriber_id:subscriberId,user_id:userId,status:'active',must_change_password:true}});

    return json({ok:true,subscriber_id:subscriberId,subscriber_name:subscriber.full_name,temporary_password:temporaryPassword,dni_masked:`****${normalizedDni.slice(-4)}`});
  }catch(error){return json({error:error instanceof Error?error.message:'UNKNOWN_ERROR'},400)}
});
