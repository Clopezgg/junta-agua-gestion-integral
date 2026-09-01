import {getOrganizationSettings} from '../features/settings/service';

let cache:string|undefined;
let inflight:Promise<string>|undefined;

export function institutionName():string|undefined{
  return cache;
}

export async function loadInstitutionName():Promise<string>{
  if(cache!==undefined)return cache;
  if(!inflight){
    inflight=getOrganizationSettings()
      .then(settings=>{
        const name=typeof settings?.institution_name==='string'?settings.institution_name:'';
        cache=name;
        return name;
      })
      .finally(()=>{inflight=undefined});
  }
  return inflight;
}