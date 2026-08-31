import {useCallback,useEffect,useMemo,useState} from 'react';
import {BadgeCheck,FileCog,Plus,Save,Stamp,TableProperties} from 'lucide-react';
import {activateDocumentTemplate,listDocumentTemplates,listServiceCatalog,saveDocumentTemplate,saveServiceCatalogItem} from '../features/configuration/advancedService';
import {useAuth} from '../contexts/AuthContext';

type Row=Record<string,any>;
const money=(value:unknown)=>new Intl.NumberFormat('es-HN',{style:'currency',currency:'HNL'}).format(Number(value??0));
const defaultTemplate={
  institutionTitle:'Junta de Agua',
  institutionSubtitle:'Servicio comunitario de agua potable',
  location:'Honduras',
  conceptLabel:'Cuota anual por prestación y sostenimiento del servicio comunitario de agua potable',
  annualUnitAmount:400,
  validFromMonthDay:'01-01',
  dueMonthDay:'11-30',
  lateFromMonthDay:'12-01',
  showQr:true,
  showNationalShield:true,
  showInstitutionLogo:true,
  showSignature:true,
  showStamp:true,
  showMaskedIdentity:true,
  showConnections:true,
  showAnnualHistory:true,
  showSeniorBenefit:true,
  paperSize:'half-letter',
  orientation:'portrait',
  primaryColor:'#0b4f8a',
  secondaryColor:'#d6a21f',
  watermarkOriginal:'IMPRESIÓN',
  watermarkCopy:'REIMPRESIÓN',
  paidStamp:'PAGADO',
  pendingStamp:'PENDIENTE',
  overdueStamp:'VENCIDO',
  voidStamp:'ANULADO',
  refundStamp:'DEVUELTO',
  footer:'Documento oficial emitido por la Junta de Agua. Su autenticidad puede verificarse mediante el código QR.',
  claimText:'Para reclamos o correcciones presente este documento ante la Secretaría de la Junta.',
  signerName:'Deisy Rivas',
  signerTitle:'Secretaria',
  rtn:'PENDIENTE',
  legalEntityNumber:'PENDIENTE',
  phone:'PENDIENTE',
  email:'PENDIENTE'
};

export function DocumentSettings(){
  const auth=useAuth();
  const[templates,setTemplates]=useState<Row[]>([]);
  const[services,setServices]=useState<Row[]>([]);
  const[config,setConfig]=useState<Record<string,any>>(defaultTemplate);
  const[name,setName]=useState('Recibo anual institucional');
  const[reason,setReason]=useState('Configuración inicial del recibo anual comunitario');
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');
  const[serviceForm,setServiceForm]=useState({name:'',description:'',category:'other',calculation_type:'fixed',unit:'servicio',default_amount:'0',discount_eligible:false,requires_approval:false,requires_evidence:false,generates_obligation:true,active:true,valid_from:new Date().toISOString().slice(0,10)});

  const load=useCallback(async()=>{try{const[t,s]=await Promise.all([listDocumentTemplates(),listServiceCatalog()]);setTemplates(t);setServices(s);const active=t.find((row:Row)=>row.document_type==='payment_receipt'&&row.status==='active');if(active?.configuration)setConfig({...defaultTemplate,...active.configuration});setError('')}catch(e){setError((e as Error).message)}},[]);
  useEffect(()=>{void load()},[load]);
  const activeTemplate=useMemo(()=>templates.find(row=>row.document_type==='payment_receipt'&&row.status==='active'),[templates]);

  async function saveTemplate(){try{await saveDocumentTemplate('payment_receipt',name,config,reason);setMessage('Nueva versión de plantilla guardada como borrador. Actívela después de revisar la vista previa.');await load()}catch(e){setError((e as Error).message)}}
  async function activate(id:string){try{await activateDocumentTemplate(id);setMessage('Plantilla activada con MFA y registrada en auditoría.');await load()}catch(e){setError((e as Error).message)}}
  async function saveService(){try{await saveServiceCatalogItem({...serviceForm,default_amount:Number(serviceForm.default_amount)});setMessage('Concepto de servicio guardado con código automático.');setServiceForm({name:'',description:'',category:'other',calculation_type:'fixed',unit:'servicio',default_amount:'0',discount_eligible:false,requires_approval:false,requires_evidence:false,generates_obligation:true,active:true,valid_from:new Date().toISOString().slice(0,10)});await load()}catch(e){setError((e as Error).message)}}

  return <main className="content">
    <div className="titlebar"><div><h1>Configuración documental</h1><p>Administre recibos, estados, textos, fechas, beneficios y conceptos sin modificar código.</p></div><span className={`status-badge ${activeTemplate?'approved':'draft'}`}>{activeTemplate?`Plantilla activa v${activeTemplate.version_number}`:'Sin plantilla activa'}</span></div>
    {error&&<div className="error">{error}</div>}{message&&<div className="notice">{message}</div>}

    <div className="document-config-grid">
      <section className="panel">
        <h2><FileCog size={20}/> Identidad y contenido</h2>
        <div className="form-grid">
          <label className="span-2">Título institucional<input value={config.institutionTitle} onChange={e=>setConfig({...config,institutionTitle:e.target.value})}/></label>
          <label className="span-2">Subtítulo<input value={config.institutionSubtitle} onChange={e=>setConfig({...config,institutionSubtitle:e.target.value})}/></label>
          <label className="span-2">Ubicación<input value={config.location} onChange={e=>setConfig({...config,location:e.target.value})}/></label>
          <label className="span-2">Concepto anual<textarea value={config.conceptLabel} onChange={e=>setConfig({...config,conceptLabel:e.target.value})}/></label>
          <label>Valor por pegue<input type="number" min="0" step="0.01" value={config.annualUnitAmount} onChange={e=>setConfig({...config,annualUnitAmount:Number(e.target.value)})}/></label>
          <label>Vence cada año<input type="text" value={config.dueMonthDay} onChange={e=>setConfig({...config,dueMonthDay:e.target.value})} placeholder="11-30"/></label>
          <label>Mora desde<input type="text" value={config.lateFromMonthDay} onChange={e=>setConfig({...config,lateFromMonthDay:e.target.value})} placeholder="12-01"/></label>
          <label>Firmante<input value={config.signerName} onChange={e=>setConfig({...config,signerName:e.target.value})}/></label>
          <label>Cargo<input value={config.signerTitle} onChange={e=>setConfig({...config,signerTitle:e.target.value})}/></label>
          <label>RTN<input value={config.rtn} onChange={e=>setConfig({...config,rtn:e.target.value})}/></label>
          <label>Personería jurídica<input value={config.legalEntityNumber} onChange={e=>setConfig({...config,legalEntityNumber:e.target.value})}/></label>
          <label>Teléfono<input value={config.phone} onChange={e=>setConfig({...config,phone:e.target.value})}/></label>
          <label>Correo<input value={config.email} onChange={e=>setConfig({...config,email:e.target.value})}/></label>
          <label className="span-2">Pie institucional<textarea value={config.footer} onChange={e=>setConfig({...config,footer:e.target.value})}/></label>
          <label className="span-2">Texto de reclamos<textarea value={config.claimText} onChange={e=>setConfig({...config,claimText:e.target.value})}/></label>
        </div>
      </section>

      <section className="panel">
        <h2><Stamp size={20}/> Presentación y estados</h2>
        <div className="form-grid">
          <label>Marca original<input value={config.watermarkOriginal} onChange={e=>setConfig({...config,watermarkOriginal:e.target.value})}/></label>
          <label>Marca reimpresión<input value={config.watermarkCopy} onChange={e=>setConfig({...config,watermarkCopy:e.target.value})}/></label>
          <label>Sello pagado<input value={config.paidStamp} onChange={e=>setConfig({...config,paidStamp:e.target.value})}/></label>
          <label>Sello pendiente<input value={config.pendingStamp} onChange={e=>setConfig({...config,pendingStamp:e.target.value})}/></label>
          <label>Sello vencido<input value={config.overdueStamp} onChange={e=>setConfig({...config,overdueStamp:e.target.value})}/></label>
          <label>Sello anulado<input value={config.voidStamp} onChange={e=>setConfig({...config,voidStamp:e.target.value})}/></label>
          <label>Color principal<input type="color" value={config.primaryColor} onChange={e=>setConfig({...config,primaryColor:e.target.value})}/></label>
          <label>Color secundario<input type="color" value={config.secondaryColor} onChange={e=>setConfig({...config,secondaryColor:e.target.value})}/></label>
        </div>
        <div className="check-grid">
          {[
            ['showQr','Código QR'],['showNationalShield','Escudo de Honduras'],['showInstitutionLogo','Logo de la Junta'],['showSignature','Firma'],['showStamp','Sello'],['showMaskedIdentity','Identidad protegida'],['showConnections','Pegues'],['showAnnualHistory','Historial anual'],['showSeniorBenefit','Descuento adulto mayor']
          ].map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={Boolean(config[key])} onChange={e=>setConfig({...config,[key]:e.target.checked})}/>{label}</label>)}
        </div>
        <div className="template-preview" style={{'--preview-primary':config.primaryColor,'--preview-secondary':config.secondaryColor} as React.CSSProperties}>
          <header><strong>{config.institutionTitle}</strong><small>{config.location}</small></header>
          <div className="preview-body"><div className="preview-qr">QR</div><div><b>RECIBO OFICIAL</b><span>REC-{new Date().getFullYear()}-000001</span><span>Abonado: NOMBRE DE EJEMPLO</span><span>Pegues: 2 × {money(config.annualUnitAmount)}</span><span>Descuento adulto mayor: -{money(Number(config.annualUnitAmount)*2*.25)}</span><strong>Total: {money(Number(config.annualUnitAmount)*2*.75)}</strong></div></div>
          <div className="preview-watermark">{config.watermarkOriginal}</div><div className="preview-paid">{config.paidStamp}</div><footer>{config.footer}</footer>
        </div>
      </section>
    </div>

    {auth.has('document_templates.manage')&&<section className="panel" style={{marginTop:'1rem'}}><h2><Save size={20}/> Versionar plantilla</h2><div className="inline-form"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre de la plantilla"/><input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo del cambio"/><button onClick={()=>void saveTemplate()}><Save size={17}/>Guardar nueva versión</button></div><div className="table-scroll"><table><thead><tr><th>Versión</th><th>Nombre</th><th>Estado</th><th>Creada</th><th>Acción</th></tr></thead><tbody>{templates.filter(row=>row.document_type==='payment_receipt').map(row=><tr key={row.id}><td>v{row.version_number}</td><td>{row.name}</td><td>{row.status}</td><td>{new Date(row.created_at).toLocaleString('es-HN')}</td><td>{row.status==='draft'&&<button className="compact" onClick={()=>void activate(row.id)}><BadgeCheck size={15}/>Activar</button>}</td></tr>)}</tbody></table></div></section>}

    <section className="panel" style={{marginTop:'1rem'}}><h2><TableProperties size={20}/> Catálogo de cobros y servicios</h2><div className="table-scroll"><table><thead><tr><th>Código</th><th>Concepto</th><th>Categoría</th><th>Cálculo</th><th>Valor</th><th>Descuento</th><th>Estado</th></tr></thead><tbody>{services.map(row=><tr key={row.id}><td>{row.code}</td><td><strong>{row.name}</strong><small>{row.description}</small></td><td>{row.category}</td><td>{row.calculation_type} · {row.unit}</td><td>{money(row.default_amount)}</td><td>{row.discount_eligible?'Sí':'No'}</td><td>{row.active?'Activo':'Inactivo'}</td></tr>)}</tbody></table></div>
      {auth.has('service_catalog.manage')&&<div className="catalog-form"><h3><Plus size={18}/> Nuevo concepto</h3><div className="form-grid"><label>Nombre<input value={serviceForm.name} onChange={e=>setServiceForm({...serviceForm,name:e.target.value})}/></label><label>Categoría<select value={serviceForm.category} onChange={e=>setServiceForm({...serviceForm,category:e.target.value})}><option value="new_connection">Nuevo pegue</option><option value="reconnection">Reconexión</option><option value="pipe_change">Cambio de tubería</option><option value="pipe_repair">Reparación de tubería</option><option value="leak_repair">Reparación de fuga</option><option value="labor">Mano de obra</option><option value="materials">Materiales</option><option value="late_fee">Mora</option><option value="extraordinary_contribution">Aporte extraordinario</option><option value="adjustment">Ajuste</option><option value="other">Otro</option></select></label><label>Forma de cálculo<select value={serviceForm.calculation_type} onChange={e=>setServiceForm({...serviceForm,calculation_type:e.target.value})}><option value="fixed">Valor fijo</option><option value="per_connection">Por pegue</option><option value="quantity">Por cantidad</option><option value="percentage">Porcentaje</option></select></label><label>Unidad<input value={serviceForm.unit} onChange={e=>setServiceForm({...serviceForm,unit:e.target.value})}/></label><label>Valor predeterminado<input type="number" min="0" step="0.01" value={serviceForm.default_amount} onChange={e=>setServiceForm({...serviceForm,default_amount:e.target.value})}/></label><label className="span-2">Descripción<textarea value={serviceForm.description} onChange={e=>setServiceForm({...serviceForm,description:e.target.value})}/></label></div><div className="check-grid"><label className="check"><input type="checkbox" checked={serviceForm.discount_eligible} onChange={e=>setServiceForm({...serviceForm,discount_eligible:e.target.checked})}/>Permite descuentos</label><label className="check"><input type="checkbox" checked={serviceForm.requires_approval} onChange={e=>setServiceForm({...serviceForm,requires_approval:e.target.checked})}/>Requiere aprobación</label><label className="check"><input type="checkbox" checked={serviceForm.requires_evidence} onChange={e=>setServiceForm({...serviceForm,requires_evidence:e.target.checked})}/>Requiere evidencia</label></div><button disabled={!serviceForm.name.trim()} onClick={()=>void saveService()}><Save size={17}/>Guardar concepto</button></div>}
    </section>
  </main>;
}
