import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const normalize=(value:string)=>value.replace(/\D/g,'');

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    if(req.method!=='POST')return json({error:'METHOD_NOT_ALLOWED'},405);
    const url=Deno.env.get('SUPABASE_URL');
    const anon=Deno.env.get('SUPABASE_ANON_KEY');
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!anon||!service)throw new Error('SERVER_CONFIGURATION_MISSING');
    const body=await req.json();
    const dni=normalize(String(body.dni??''));
    const password=String(body.password??'');
    if(dni.length<8||password.length<8)throw new Error('INVALID_CREDENTIALS');

    const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
    const{data:identities,error:identityError}=await admin.from('subscriber_identities').select('subscriber_id,normalized_number').eq('normalized_number',dni).eq('is_primary',true).limit(3);
    if(identityError)throw identityError;
    if(!identities||identities.length!==1)throw new Error('INVALID_CREDENTIALS');
    const subscriberId=identities[0].subscriber_id;
    const{data:account,error:accountError}=await admin.from('subscriber_portal_accounts').select('id,user_id,status,failed_login_count,locked_until').eq('subscriber_id',subscriberId).single();
    if(accountError||!account||account.status!=='active')throw new Error('INVALID_CREDENTIALS');
    if(account.locked_until&&new Date(account.locked_until)>new Date())throw new Error('ACCOUNT_TEMPORARILY_LOCKED');

    const{data:userData,error:userError}=await admin.auth.admin.getUserById(account.user_id);
    if(userError||!userData.user?.email)throw new Error('INVALID_CREDENTIALS');
    const client=createClient(url,anon,{auth:{autoRefreshToken:false,persistSession:false}});
    const{data:sessionData,error:signInError}=await client.auth.signInWithPassword({email:userData.user.email,password});
    if(signInError||!sessionData.session){
      const failures=Number(account.failed_login_count??0)+1;
      await admin.from('subscriber_portal_accounts').update({failed_login_count:failures,locked_until:failures>=5?new Date(Date.now()+15*60*1000).toISOString():null}).eq('id',account.id);
      throw new Error(failures>=5?'ACCOUNT_TEMPORARILY_LOCKED':'INVALID_CREDENTIALS');
    }

    await admin.from('subscriber_portal_accounts').update({failed_login_count:0,locked_until:null,last_access_at:new Date().toISOString()}).eq('id',account.id);
    return json({access_token:sessionData.session.access_token,refresh_token:sessionData.session.refresh_token,expires_in:sessionData.session.expires_in,token_type:sessionData.session.token_type});
  }catch(error){
    const code=error instanceof Error?error.message:'UNKNOWN_ERROR';
    const status=code==='ACCOUNT_TEMPORARILY_LOCKED'?429:400;
    return json({error:code},status);
  }
});
