import {useCallback,useEffect,useMemo,useState} from 'react';
import {BadgeCheck,FileCog,Plus,Save,Stamp,TableProperties} from 'lucide-react';
import {activateDocumentTemplate,listDocumentTemplates,listServiceCatalog,saveDocumentTemplate,saveServiceCatalogItem} from '../features/configuration/advancedService';
import {useAuth} from '../contexts/AuthContext';
import {Badge,Button,ErrorState} from '../design-system/primitives';
import {formatDateTime,formatMoney} from '../design-system/utils';

type Row=Record<string,any>;
const M=(v:unknown)=>formatMoney(typeof v==='number'||typeof v==='string'?v:0);
const defaultTemplate={
  institutionTitle:'Junta de Agua',institutionSubtitle:'Servicio comunitario de agua potable',location:'Honduras',
  conceptLabel:'Cuota anual por prestación y sostenimiento del servicio comunitario de agua potable',
  annualUnitAmount:400,validFromMonthDay:'01-01',dueMonthDay:'11-30',lateFromMonthDay:'12-01',
  showQr:true,showNationalShield:true,showInstitutionLogo:true,showSignature:true,showStamp:true,
  showMaskedIdentity:true,showConnections:true,showAnnualHistory:true,showSeniorBenefit:true,
  paperSize:'half-letter',orientation:'portrait',primaryColor:'#0b4f8a',secondaryColor:'#d6a21f',
  watermarkOriginal:'IMPRESIÓN',watermarkCopy:'REIMPRESIÓN',paidStamp:'PAGADO',pendingStamp:'PENDIENTE',
  overdueStamp:'VENCIDO',voidStamp:'ANULADO',refundStamp:'DEVUELTO',
  footer:'Documento oficial emitido por la Junta de Agua. Su autenticidad puede verificarse mediante el código QR.',
  claimText:'Para reclamos o correcciones presente este documento ante la Secretaría de la Junta.',
  signerName:'',signerTitle:'',rtn:'PENDIENTE',legalEntityNumber:'PENDIENTE',phone:'PENDIENTE',email:'PENDIENTE',
};

export function DocumentSettings(){
  const auth=useAuth();
  const [templates,setTemplates]=useState<Row[]>([]);
  const [services,setServices]=useState<Row[]>([]);
  const [config,setConfig]=useState<Record<string,any>>(defaultTemplate);
  const [name,setName]=useState('Recibo anual institucional');
  const [reason,setReason]=useState('Configuración inicial del recibo anual comunitario');
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [serviceForm,setServiceForm]=useState({name:'',description:'',category:'other',calculation_type:'fixed',unit:'servicio',default_amount:'0',discount_eligible:false,requires_approval:false,requires_evidence:false,generates_obligation:true,active:true,valid_from:new Date().toISOString().slice(0,10)});

  const load=useCallback(async()=>{
    try{
      const [t,s]=await Promise.all([listDocumentTemplates(),listServiceCatalog()]);
      setTemplates(t);setServices(s);
      const active=t.find((r:Row)=>r.document_type==='payment_receipt'&&r.status==='active');
      if(active?.configuration)setConfig({...defaultTemplate,...active.configuration});
      setError('');
    }catch(e){setError((e as Error).message);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const activeTemplate=useMemo(()=>templates.find(r=>r.document_type==='payment_receipt'&&r.status==='active'),[templates]);

  async function saveTemplate(){
    try{await saveDocumentTemplate('payment_receipt',name,config,reason);setNotice('Nueva versión guardada como borrador. Actívela tras revisar la vista previa.');await load();}
    catch(e){setError((e as Error).message);}
  }
  async function activate(id:string){
    try{await activateDocumentTemplate(id);setNotice('Plantilla activada con MFA y registrada en auditoría.');await load();}
    catch(e){setError((e as Error).message);}
  }
  async function saveService(){
    try{
      await saveServiceCatalogItem({...serviceForm,default_amount:Number(serviceForm.default_amount)});
      setNotice('Concepto de servicio guardado con código automático.');
      setServiceForm({name:'',description:'',category:'other',calculation_type:'fixed',unit:'servicio',default_amount:'0',discount_eligible:false,requires_approval:false,requires_evidence:false,generates_obligation:true,active:true,valid_from:new Date().toISOString().slice(0,10)});
      await load();
    }catch(e){setError((e as Error).message);}
  }

  const CONTENT:[string,string,boolean?][]=[
    ['institutionTitle','Título institucional'],['institutionSubtitle','Subtítulo'],['location','Ubicación'],
    ['annualUnitAmount','Valor por pegue',true],['dueMonthDay','Vence cada año'],['lateFromMonthDay','Mora desde'],
    ['signerName','Firmante'],['signerTitle','Cargo'],['rtn','RTN'],['legalEntityNumber','Personería jurídica'],
    ['phone','Teléfono'],['email','Correo'],
  ];
  const STATES:[string,string][]=[
    ['watermarkOriginal','Marca original'],['watermarkCopy','Marca reimpresión'],['paidStamp','Sello pagado'],
    ['pendingStamp','Sello pendiente'],['overdueStamp','Sello vencido'],['voidStamp','Sello anulado'],
  ];
  const TOGGLES:[string,string][]=[
    ['showQr','Código QR'],['showNationalShield','Escudo de Honduras'],['showInstitutionLogo','Logo de la Junta'],
    ['showSignature','Firma'],['showStamp','Sello'],['showMaskedIdentity','Identidad protegida'],
    ['showConnections','Pegues'],['showAnnualHistory','Historial anual'],['showSeniorBenefit','Descuento adulto mayor'],
  ];

  return <main className="ja-page">
    <header className="ja-page-head">
      <div><h1>Configuración documental</h1><p>Administre recibos, estados, textos, fechas, beneficios y conceptos sin modificar código.</p></div>
      <Badge tone={activeTemplate?'success':'warning'}>{activeTemplate?`Plantilla activa v${activeTemplate.version_number}`:'Sin plantilla activa'}</Badge>
    </header>

    {notice&&<div className="ja-banner ja-banner-info">{notice}</div>}
    {error&&<ErrorState error={error} onRetry={()=>void load()}/>}

    <section className="ja-list">
      <h3 className="ja-list-heading"><FileCog size={16}/> Identidad y contenido</h3>
      <div className="ja-pos-grid">
        {CONTENT.map(([key,label,isNum])=><label key={key} className="ja-field">
          <span className="ja-field-label">{label}</span>
          <input className="ja-control" type={isNum?'number':'text'} value={config[key]??''} onChange={e=>setConfig({...config,[key]:isNum?Number(e.target.value):e.target.value})}/>
        </label>)}
      </div>
      <label className="ja-field"><span className="ja-field-label">Concepto anual</span>
        <textarea className="ja-control" rows={2} value={config.conceptLabel} onChange={e=>setConfig({...config,conceptLabel:e.target.value})}/>
      </label>
      <label className="ja-field"><span className="ja-field-label">Pie institucional</span>
        <textarea className="ja-control" rows={2} value={config.footer} onChange={e=>setConfig({...config,footer:e.target.value})}/>
      </label>
      <label className="ja-field"><span className="ja-field-label">Texto de reclamos</span>
        <textarea className="ja-control" rows={2} value={config.claimText} onChange={e=>setConfig({...config,claimText:e.target.value})}/>
      </label>
    </section>

    <section className="ja-list">
      <h3 className="ja-list-heading"><Stamp size={16}/> Presentación y estados</h3>
      <div className="ja-pos-grid">
        {STATES.map(([key,label])=><label key={key} className="ja-field">
          <span className="ja-field-label">{label}</span>
          <input className="ja-control" value={config[key]??''} onChange={e=>setConfig({...config,[key]:e.target.value})}/>
        </label>)}
        <label className="ja-field"><span className="ja-field-label">Color principal</span>
          <input className="ja-control" type="color" value={config.primaryColor} onChange={e=>setConfig({...config,primaryColor:e.target.value})}/>
        </label>
        <label className="ja-field"><span className="ja-field-label">Color secundario</span>
          <input className="ja-control" type="color" value={config.secondaryColor} onChange={e=>setConfig({...config,secondaryColor:e.target.value})}/>
        </label>
      </div>
      <div className="ja-pos-grid">
        {TOGGLES.map(([key,label])=><label key={key} className="ja-field" style={{flexDirection:'row',alignItems:'center',gap:'.5rem'}}>
          <input type="checkbox" checked={Boolean(config[key])} onChange={e=>setConfig({...config,[key]:e.target.checked})}/>
          <span className="ja-field-label" style={{margin:0}}>{label}</span>
        </label>)}
      </div>
      <div className="template-preview" style={{'--preview-primary':config.primaryColor,'--preview-secondary':config.secondaryColor} as React.CSSProperties}>
        <header><strong>{config.institutionTitle}</strong><small>{config.location}</small></header>
        <div className="preview-body">
          <div className="preview-qr">QR</div>
          <div>
            <b>RECIBO OFICIAL</b>
            <span>REC-{new Date().getFullYear()}-000001</span>
            <span>Abonado: NOMBRE DE EJEMPLO</span>
            <span>Pegues: 2 × {M(config.annualUnitAmount)}</span>
            <span>Descuento adulto mayor: -{M(Number(config.annualUnitAmount)*2*.25)}</span>
            <strong>Total: {M(Number(config.annualUnitAmount)*2*.75)}</strong>
          </div>
        </div>
        <div className="preview-watermark">{config.watermarkOriginal}</div>
        <div className="preview-paid">{config.paidStamp}</div>
        <footer>{config.footer}</footer>
      </div>
    </section>

    {auth.has('document_templates.manage')&&<section className="ja-table-scroll">
      <div className="ja-list-heading"><Save size={16}/> Versionar plantilla</div>
      <div className="ja-toolbar">
        <input className="ja-control" style={{maxWidth:'16rem'}} value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre de la plantilla"/>
        <input className="ja-control" style={{maxWidth:'18rem'}} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Motivo del cambio"/>
        <Button icon={<Save size={14}/>} onClick={()=>void saveTemplate()}>Guardar nueva versión</Button>
      </div>
      <table className="ja-table">
        <thead><tr><th>Versión</th><th>Nombre</th><th>Estado</th><th>Creada</th><th>Acción</th></tr></thead>
        <tbody>
          {templates.filter(r=>r.document_type==='payment_receipt').map(r=><tr key={r.id}>
            <td>v{r.version_number}</td><td>{r.name}</td><td>{r.status}</td><td>{formatDateTime(r.created_at)}</td>
            <td>{r.status==='draft'&&<Button variant="secondary" icon={<BadgeCheck size={13}/>} onClick={()=>void activate(r.id)}>Activar</Button>}</td>
          </tr>)}
        </tbody>
      </table>
    </section>}

    <section className="ja-table-scroll">
      <div className="ja-list-heading"><TableProperties size={16}/> Catálogo de cobros y servicios</div>
      <table className="ja-table">
        <thead><tr><th>Código</th><th>Concepto</th><th>Categoría</th><th>Cálculo</th><th className="ja-td-num">Valor</th><th>Descuento</th><th>Estado</th></tr></thead>
        <tbody>
          {services.map(r=><tr key={r.id}>
            <td>{r.code}</td>
            <td><strong>{r.name}</strong><span className="ja-cell-sub">{r.description}</span></td>
            <td>{r.category}</td>
            <td>{r.calculation_type} · {r.unit}</td>
            <td className="ja-td-num">{M(r.default_amount)}</td>
            <td>{r.discount_eligible?'Sí':'No'}</td>
            <td>{r.active?'Activo':'Inactivo'}</td>
          </tr>)}
        </tbody>
      </table>
      {auth.has('service_catalog.manage')&&<form className="ja-pos-fields" style={{marginTop:'1rem'}} onSubmit={e=>{e.preventDefault();void saveService();}}>
        <span className="ja-field-label"><Plus size={13}/> Nuevo concepto</span>
        <div className="ja-pos-grid">
          <label className="ja-field"><span className="ja-field-label">Nombre</span><input className="ja-control" value={serviceForm.name} onChange={e=>setServiceForm({...serviceForm,name:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Categoría</span>
            <select className="ja-control" value={serviceForm.category} onChange={e=>setServiceForm({...serviceForm,category:e.target.value})}>
              <option value="new_connection">Nuevo pegue</option><option value="reconnection">Reconexión</option><option value="pipe_change">Cambio de tubería</option>
              <option value="pipe_repair">Reparación de tubería</option><option value="leak_repair">Reparación de fuga</option><option value="labor">Mano de obra</option>
              <option value="materials">Materiales</option><option value="late_fee">Mora</option><option value="extraordinary_contribution">Aporte extraordinario</option>
              <option value="adjustment">Ajuste</option><option value="other">Otro</option>
            </select>
          </label>
          <label className="ja-field"><span className="ja-field-label">Forma de cálculo</span>
            <select className="ja-control" value={serviceForm.calculation_type} onChange={e=>setServiceForm({...serviceForm,calculation_type:e.target.value})}>
              <option value="fixed">Valor fijo</option><option value="per_connection">Por pegue</option><option value="quantity">Por cantidad</option><option value="percentage">Porcentaje</option>
            </select>
          </label>
          <label className="ja-field"><span className="ja-field-label">Unidad</span><input className="ja-control" value={serviceForm.unit} onChange={e=>setServiceForm({...serviceForm,unit:e.target.value})}/></label>
          <label className="ja-field"><span className="ja-field-label">Valor predeterminado</span><input className="ja-control" type="number" min="0" step="0.01" value={serviceForm.default_amount} onChange={e=>setServiceForm({...serviceForm,default_amount:e.target.value})}/></label>
        </div>
        <label className="ja-field"><span className="ja-field-label">Descripción</span><textarea className="ja-control" rows={2} value={serviceForm.description} onChange={e=>setServiceForm({...serviceForm,description:e.target.value})}/></label>
        <div className="ja-pos-grid">
          {([['discount_eligible','Permite descuentos'],['requires_approval','Requiere aprobación'],['requires_evidence','Requiere evidencia']] as const).map(([key,label])=>
            <label key={key} className="ja-field" style={{flexDirection:'row',alignItems:'center',gap:'.5rem'}}>
              <input type="checkbox" checked={serviceForm[key]} onChange={e=>setServiceForm({...serviceForm,[key]:e.target.checked})}/>
              <span className="ja-field-label" style={{margin:0}}>{label}</span>
            </label>)}
        </div>
        <Button type="submit" icon={<Save size={14}/>} disabled={!serviceForm.name.trim()}>Guardar concepto</Button>
      </form>}
    </section>
  </main>;
}
