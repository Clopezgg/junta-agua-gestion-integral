import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const safeName=(name:string)=>name.replace(/[^a-zA-Z0-9._-]/g,'_');

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const url=Deno.env.get('SUPABASE_URL');
    const anon=Deno.env.get('SUPABASE_ANON_KEY');
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!anon||!service)throw new Error('SERVER_CONFIGURATION_MISSING');
    const authorization=req.headers.get('Authorization')??'';
    const caller=createClient(url,anon,{global:{headers:{Authorization:authorization}}});
    const{data:auth,error:authError}=await caller.auth.getUser();
    if(authError||!auth.user)throw new Error('AUTH_REQUIRED');
    const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});
    const{data:account,error:accountError}=await admin.from('subscriber_portal_accounts').select('id,organization_id,subscriber_id,status').eq('user_id',auth.user.id).single();
    if(accountError||!account||account.status!=='active')throw new Error('PORTAL_ACCOUNT_NOT_FOUND');

    if(req.method==='GET'){
      const{data,error}=await caller.rpc('get_my_subscriber_card');
      if(error)throw error;
      return json(data);
    }

    if(req.method!=='POST'&&req.method!=='PUT')return json({error:'METHOD_NOT_ALLOWED'},405);
    const contentType=req.headers.get('content-type')??'';
    let payload:Record<string,unknown>={};
    if(contentType.includes('multipart/form-data')){
      const form=await req.formData();
      const file=form.get('photo');
      if(!(file instanceof File))throw new Error('PHOTO_REQUIRED');
      if(file.size>5*1024*1024)throw new Error('PHOTO_TOO_LARGE');
      if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('PHOTO_FORMAT_NOT_ALLOWED');
      const path=`${account.organization_id}/${account.subscriber_id}/profile/${crypto.randomUUID()}-${safeName(file.name)}`;
      const bytes=new Uint8Array(await file.arrayBuffer());
      const{error:uploadError}=await admin.storage.from('subscriber-documents').upload(path,bytes,{contentType:file.type,upsert:false});
      if(uploadError)throw uploadError;
      payload={photo_path:path};
    }else{
      const body=await req.json();
      const whatsapp=body.whatsapp==null?undefined:String(body.whatsapp).trim();
      const email=body.email==null?undefined:String(body.email).trim().toLowerCase();
      const address=body.address==null?undefined:String(body.address).trim();
      if(email&&(!email.includes('@')||email.length>160))throw new Error('INVALID_EMAIL');
      if(whatsapp&&whatsapp.replace(/\D/g,'').length<8)throw new Error('INVALID_PHONE');
      if(address&&address.length<5)throw new Error('INVALID_ADDRESS');
      if(whatsapp!==undefined)payload.whatsapp=whatsapp;
      if(email!==undefined)payload.email=email;
      if(address!==undefined)payload.address=address;
    }

    const{data,error}=await caller.rpc('update_my_subscriber_profile',{p_payload:payload});
    if(error)throw error;
    return json({ok:true,profile:data});
  }catch(error){return json({error:error instanceof Error?error.message:'UNKNOWN_ERROR'},400)}
});
