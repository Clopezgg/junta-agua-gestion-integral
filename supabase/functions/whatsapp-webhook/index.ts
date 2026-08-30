import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

async function hmacSha256Hex(secret:string,data:string):Promise<string>{
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(data));
  return [...new Uint8Array(signature)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
function safeEqual(a:string,b:string):boolean{
  if(a.length!==b.length)return false;
  let diff=0;
  for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}

Deno.serve(async(req)=>{
  if(req.method==='GET'){
    const u=new URL(req.url);
    const verify=Deno.env.get('WHATSAPP_VERIFY_TOKEN');
    if(u.searchParams.get('hub.mode')==='subscribe'&&u.searchParams.get('hub.verify_token')===verify&&u.searchParams.get('hub.challenge'))return new Response(u.searchParams.get('hub.challenge')??'',{status:200});
    return new Response('Forbidden',{status:403});
  }
  if(req.method!=='POST')return new Response('Method Not Allowed',{status:405});
  try{
    const raw=await req.text();
    const secret=Deno.env.get('WHATSAPP_APP_SECRET');
    if(!secret)return new Response('Service not configured',{status:500});
    const received=(req.headers.get('x-hub-signature-256')??'').replace(/^sha256=/,'').toLowerCase();
    const expected=await hmacSha256Hex(secret,raw);
    if(!received||!safeEqual(received,expected))return new Response('Unauthorized',{status:401});
    const body=JSON.parse(raw);
    const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const url=Deno.env.get('SUPABASE_URL')!;
    const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    for(const entry of body.entry??[])for(const change of entry.changes??[])for(const s of change.value?.statuses??[]){
      const status=['sent','delivered','read','failed'].includes(s.status)?s.status:'sent';
      await admin.from('communication_messages').update({status,error_message:s.errors?.[0]?.title??null,updated_at:new Date().toISOString()}).eq('provider_message_id',s.id);
    }
    return new Response('ok',{status:200});
  }catch{return new Response('bad request',{status:400})}
});