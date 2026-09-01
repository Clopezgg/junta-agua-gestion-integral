import type {Permission} from '../../lib/security';

export type SetupStepId='identidad'|'ubicacion'|'legal'|'servicio'|'revision';

export const setupSteps:ReadonlyArray<{id:SetupStepId;title:string;description:string}>=[
  {id:'identidad',title:'Identidad',description:'Nombre oficial, RTN y datos de contacto de la Junta.'},
  {id:'ubicacion',title:'Ubicación',description:'Departamento, municipio y comunidad donde opera.'},
  {id:'legal',title:'Representación legal',description:'Representante legal y referencia de personería jurídica.'},
  {id:'servicio',title:'Servicio',description:'Tipo de servicio y si se factura por medición.'},
  {id:'revision',title:'Revisión',description:'Confirme los datos y active la plataforma.'},
];

export type SetupDraft={
  name:string;
  rtn:string;
  phone:string;
  email:string;
  department:string;
  municipality:string;
  community:string;
  legal_representative_name:string;
  legal_representative_title:string;
  incorporation_reference:string;
  founding_date:string;
  service_type:''|'agua'|'agua_alcantarillado'|'agua_saneamiento';
  metering_enabled:boolean;
};

export const emptyDraft:SetupDraft={
  name:'',rtn:'',phone:'',email:'',department:'',municipality:'',community:'',
  legal_representative_name:'',legal_representative_title:'',incorporation_reference:'',
  founding_date:'',service_type:'',metering_enabled:false,
};

export function draftFromSettings(settings:Record<string,unknown>):SetupDraft{
  const s=(k:string)=>typeof settings[k]==='string'?settings[k] as string:'';
  return {
    ...emptyDraft,
    name:s('name'),rtn:s('rtn'),phone:s('phone'),email:s('email'),
    department:s('department'),municipality:s('municipality'),community:s('community'),
    legal_representative_name:s('legal_representative_name'),
    legal_representative_title:s('legal_representative_title'),
    incorporation_reference:s('incorporation_reference'),
    founding_date:s('founding_date'),
    service_type:(['agua','agua_alcantarillado','agua_saneamiento'].includes(s('service_type'))?s('service_type'):'') as SetupDraft['service_type'],
    metering_enabled:settings.metering_enabled===true,
  };
}

const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;

/** Errores duros por paso. Sólo `name` es obligatorio: el resto es configurable
 * y no se inventa (§129); pero si se llena, debe tener formato válido. */
export function validateStep(draft:SetupDraft,step:SetupStepId):string[]{
  const e:string[]=[];
  if(step==='identidad'){
    if(draft.name.trim().length<3)e.push('El nombre oficial de la Junta es obligatorio (mínimo 3 caracteres).');
    if(draft.email&&!EMAIL_RE.test(draft.email.trim()))e.push('El correo no tiene un formato válido.');
  }
  if(step==='legal'&&draft.founding_date&&!DATE_RE.test(draft.founding_date.trim())){
    e.push('La fecha de constitución debe tener formato AAAA-MM-DD.');
  }
  return e;
}

export function stepStatus(draft:SetupDraft,step:SetupStepId):'complete'|'partial'|'pending'{
  if(validateStep(draft,step).length>0)return 'pending';
  const filled=(...keys:(keyof SetupDraft)[])=>keys.filter(k=>String(draft[k]??'').trim()!=='').length;
  switch(step){
    case 'identidad':return filled('name','rtn','phone','email')>=3?'complete':draft.name?'partial':'pending';
    case 'ubicacion':{const f=filled('department','municipality','community');return f===3?'complete':f>0?'partial':'pending';}
    case 'legal':{const f=filled('legal_representative_name','legal_representative_title','incorporation_reference');return f>=2?'complete':f>0?'partial':'pending';}
    case 'servicio':return draft.service_type?'complete':'partial';
    case 'revision':return 'pending';
  }
}

/** Payload de merge para complete_setup / save_setup_progress: sólo claves con valor. */
export function toSettingsPayload(draft:SetupDraft):Record<string,unknown>{
  const out:Record<string,unknown>={name:draft.name.trim()};
  const put=(k:keyof SetupDraft)=>{const v=String(draft[k]??'').trim();if(v)out[k]=v;};
  (['rtn','phone','email','department','municipality','community','legal_representative_name','legal_representative_title','incorporation_reference','founding_date','service_type'] as (keyof SetupDraft)[]).forEach(put);
  out.metering_enabled=draft.metering_enabled;
  return out;
}

/** Áreas de configuración avanzada que se completan después, en su pantalla real (§25). */
export const deferredConfig:ReadonlyArray<{label:string;to:string;permission:Permission}>=[
  {label:'Tarifas y cuotas',to:'/tarifas',permission:'tariffs.read'},
  {label:'Beneficios (adulto mayor…)',to:'/tarifas',permission:'tariffs.read'},
  {label:'Política de mora',to:'/tarifas',permission:'tariffs.read'},
  {label:'Caja y numeraciones',to:'/configuracion',permission:'settings.manage'},
  {label:'Cuentas bancarias',to:'/bancos',permission:'finance.read'},
  {label:'Plantillas de documentos',to:'/configuracion-documental',permission:'document_templates.read'},
  {label:'Integraciones (WhatsApp, correo, mapas)',to:'/integraciones',permission:'integrations.read'},
];
