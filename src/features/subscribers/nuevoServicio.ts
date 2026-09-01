// Workflow "Nuevo servicio" (§36). Lógica pura + tipos; la orquestación de RPCs
// vive en la página. Los pasos hablan lenguaje humano, no de tablas (§8).

export type NuevoServicioStep='solicitante'|'ubicacion'|'solicitud'|'revision';

export const nuevoServicioSteps:ReadonlyArray<{id:NuevoServicioStep;title:string;hint:string}>=[
  {id:'solicitante',title:'Solicitante',hint:'¿Quién pide el servicio? Persona nueva o abonado existente.'},
  {id:'ubicacion',title:'Punto de servicio',hint:'Dónde se instalará el pegue: dirección, sector y ubicación.'},
  {id:'solicitud',title:'Solicitud',hint:'Detalle de lo que se solicita y por qué canal llegó.'},
  {id:'revision',title:'Revisión',hint:'Confirme y registre la solicitud para iniciar el trámite.'},
];

/** Bitácora del trámite que sigue tras registrar la solicitud (§36). Cada paso
 * enlaza a la pantalla real donde se ejecuta — no son botones falsos. */
export const nuevoServicioTimeline:ReadonlyArray<{label:string;detail:string;to:string}>=[
  {label:'Solicitud registrada',detail:'Queda en estado "recibida".',to:'/solicitudes'},
  {label:'Asignación e inspección',detail:'Asigne un técnico y levante la inspección del sitio.',to:'/solicitudes'},
  {label:'Aprobación',detail:'La Junta aprueba o rechaza según inspección y capacidad.',to:'/solicitudes'},
  {label:'Contrato y cobro',detail:'Se formaliza el contrato y se cobra la conexión.',to:'/pagos'},
  {label:'Orden de instalación',detail:'Materiales de bodega y ejecución en campo.',to:'/operaciones'},
  {label:'Activación',detail:'El pegue queda activo y empieza a generar cuota.',to:'/abonados'},
];

export type SolicitanteDraft={
  mode:'existente'|'nuevo';
  subscriber_id:string;
  subscriber_label:string;
  full_name:string;
  document_type:'dni'|'passport'|'other';
  document_number:string;
  whatsapp:string;
};

export type UbicacionDraft={
  service_type:'residential'|'commercial'|'community'|'institutional';
  address:string;
  sector:string;
  latitude?:number;
  longitude?:number;
  meter_number:string;
};

export type SolicitudDraft={
  channel:'presencial'|'telefonico'|'whatsapp'|'portal'|'correo';
  priority:'baja'|'normal'|'alta'|'urgente';
  description:string;
};

export type NuevoServicioDraft={
  solicitante:SolicitanteDraft;
  ubicacion:UbicacionDraft;
  solicitud:SolicitudDraft;
};

export const emptyNuevoServicio:NuevoServicioDraft={
  solicitante:{mode:'existente',subscriber_id:'',subscriber_label:'',full_name:'',document_type:'dni',document_number:'',whatsapp:''},
  ubicacion:{service_type:'residential',address:'',sector:'',meter_number:''},
  solicitud:{channel:'presencial',priority:'normal',description:''},
};

export function validateStep(d:NuevoServicioDraft,step:NuevoServicioStep):string[]{
  const e:string[]=[];
  if(step==='solicitante'){
    if(d.solicitante.mode==='existente'){
      if(!d.solicitante.subscriber_id)e.push('Seleccione el abonado solicitante.');
    }else{
      if(d.solicitante.full_name.trim().length<5)e.push('El nombre completo del solicitante es obligatorio.');
      if(d.solicitante.document_number.trim().length<5)e.push('El número de documento es obligatorio.');
      if(d.solicitante.whatsapp.trim().length<8)e.push('El teléfono de contacto es obligatorio.');
    }
  }
  if(step==='ubicacion'){
    if(d.ubicacion.address.trim().length<5)e.push('La dirección del punto de servicio es obligatoria.');
    if(d.ubicacion.sector.trim().length<2)e.push('El sector es obligatorio.');
  }
  if(step==='solicitud'){
    if(d.solicitud.description.trim().length<10)e.push('Describa la solicitud (mínimo 10 caracteres).');
  }
  return e;
}

export const DRAFT_KEY='ja-nuevo-servicio-draft';

export function loadDraft():NuevoServicioDraft{
  try{
    const raw=localStorage.getItem(DRAFT_KEY);
    if(!raw)return emptyNuevoServicio;
    return {...emptyNuevoServicio,...JSON.parse(raw)} as NuevoServicioDraft;
  }catch{return emptyNuevoServicio;}
}
export function saveDraft(d:NuevoServicioDraft){
  try{localStorage.setItem(DRAFT_KEY,JSON.stringify(d));}catch{/* almacenamiento no disponible */}
}
export function clearDraft(){try{localStorage.removeItem(DRAFT_KEY);}catch{/* noop */}}
