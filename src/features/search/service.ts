import {supabase} from '../../lib/supabase';

export type GlobalSearchResult={
  type:'subscriber'|'payment'|'work_order'|'asset';
  id:string;
  label:string;
  subtitle:string;
  route:string;
};

function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}

export async function globalSearch(query:string,limit=20){
  const q=query.trim();
  if(q.length<2)return[] as GlobalSearchResult[];
  const{data,error}=await db().rpc('global_search',{p_query:q,p_limit:limit});
  if(error)throw new Error(error.message);
  return(data??[]) as GlobalSearchResult[];
}
