import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={ 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type' };
async function findExistingUser(email:string){
  const url=Deno.env.get('SUPABASE_URL')!;const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const client=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
  let page=1;
  while(true){
    const{data:list}=await client.auth.admin.listUsers({page,perPage:500});
    const found=list?.users.find(u=>u.email?.toLowerCase()===email.toLowerCase());
    if(found)return found;
    if(!list?.users.length)return null;
    page+=1;
  }
}
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
   const url=Deno.env.get('SUPABASE_URL')!;const anon=Deno.env.get('SUPABASE_ANON_KEY')!;const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
   const caller=createClient(url,anon,{global:{headers:{Authorization:req.headers.get('Authorization')??''}}});
   const {data:auth}=await caller.auth.getUser();if(!auth.user)throw new Error('AUTH_REQUIRED');
   const {data:allowed,error:permError}=await caller.rpc('has_permission',{p_code:'users.manage'});if(permError||!allowed)throw new Error('FORBIDDEN');
   const {data:aal}=await caller.auth.mfa.getAuthenticatorAssuranceLevel();if(aal?.currentLevel!=='aal2')throw new Error('MFA_REQUIRED');
   const body=await req.json();const email=String(body.email??'').trim().toLowerCase();const fullName=String(body.full_name??'').trim();const username=String(body.username??'').trim().toLowerCase();const roleId=String(body.role_id??'');
   if(!email||fullName.length<3||username.length<3||!roleId)throw new Error('INVALID_INPUT');
   const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
   const {data:callerProfile,error:cpError}=await admin.from('profiles').select('organization_id').eq('id',auth.user.id).single();if(cpError)throw cpError;
   const {data:role,error:roleError}=await admin.from('roles').select('id').eq('id',roleId).eq('organization_id',callerProfile.organization_id).single();if(roleError||!role)throw new Error('INVALID_ROLE');
   const existing=await findExistingUser(email);
   let userId:string|null=existing?.id??null;let replay=Boolean(existing);
   if(!userId){
    const {data:invite,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{data:{full_name:fullName,username,organization_id:callerProfile.organization_id}});
    if(inviteError){
     const duplicate=await findExistingUser(email);
     if(!duplicate)throw inviteError;
     userId=duplicate.id;replay=true;
    }else userId=invite.user.id;
   }
   const {error:profileError}=await admin.from('profiles').upsert({id:userId,organization_id:callerProfile.organization_id,full_name:fullName,username,status:'active'},{onConflict:'id'});if(profileError)throw profileError;
   const {error:urError}=await admin.from('user_roles').upsert({user_id:userId,role_id:roleId},{onConflict:'user_id,role_id',ignoreDuplicates:true});if(urError)throw urError;
   if(!replay){
    await admin.from('audit_events').insert({organization_id:callerProfile.organization_id,actor_id:auth.user.id,action:'user.invite',entity_type:'profiles',entity_id:userId,new_data:{email,full_name:fullName,username,role_id:roleId}});
   }
   return new Response(JSON.stringify({ok:true,user_id:userId,idempotent_replay:replay}),{headers:{...cors,'Content-Type':'application/json'}});
  }catch(error){return new Response(JSON.stringify({error:error instanceof Error?error.message:'UNKNOWN_ERROR'}),{status:400,headers:{...cors,'Content-Type':'application/json'}})}
});