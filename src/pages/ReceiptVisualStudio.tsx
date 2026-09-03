import {useEffect,useMemo,useState} from 'react';
import {BadgeCheck,CalendarDays,Download,Droplets,FileImage,IdCard,Palette,Printer,QrCode,Shield,Stamp,Upload,WalletCards} from 'lucide-react';
import QRCode from 'qrcode';
import {downloadReceiptPdf,type ReceiptBrand,type ReceiptInput} from '../features/finance/documents';
import {Button} from '../design-system/primitives';

type AssetKey='logoDataUrl'|'nationalEmblemDataUrl'|'signatureDataUrl'|'stampDataUrl';
type PaymentState='paid'|'pending'|'overdue'|'voided'|'refunded'|'partially_refunded';

const money=(value:number)=>new Intl.NumberFormat('es-HN',{style:'currency',currency:'HNL'}).format(value);
const stateLabels:Record<PaymentState,string>={paid:'PAGADO',pending:'PENDIENTE',overdue:'VENCIDO',voided:'ANULADO',refunded:'DEVUELTO',partially_refunded:'DEVOLUCIÓN PARCIAL'};

function readImage(file?:File){
  if(!file)return Promise.resolve('');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))return Promise.reject(new Error('La imagen debe ser JPG, PNG o WEBP.'));
  return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('No se pudo leer la imagen.'));reader.readAsDataURL(file)});
}

export function ReceiptVisualStudio(){
  const currentYear=new Date().getFullYear();
  const[status,setStatus]=useState<PaymentState>('paid');
  const[year,setYear]=useState(currentYear);
  const[connections,setConnections]=useState(2);
  const[senior,setSenior]=useState(true);
  const[lateFee,setLateFee]=useState(0);
  const[qr,setQr]=useState('');
  const[message,setMessage]=useState('');
  const[brand,setBrand]=useState<ReceiptBrand>({
    name:'Junta de Agua',
    shortName:'Junta de Agua',
    slogan:'Servicio comunitario, transparente y responsable',
    address:'Honduras',
    rtn:'PENDIENTE',
    legalEntityNumber:'PENDIENTE',
    phone:'PENDIENTE',
    email:'PENDIENTE',
    signatoryName:'Deisy Rivas',
    signatoryTitle:'Secretaria',
    footer:'Documento oficial emitido por la Junta de Agua. Su autenticidad se verifica mediante el código QR.',
    claimText:'Para reclamos o correcciones, presente este documento ante la Secretaría de la Junta.',
    templateVersion:'3.1 VISUAL',
    primaryColor:'#0b4f6c',
    secondaryColor:'#d9a821'
  });

  useEffect(()=>{void QRCode.toDataURL(`${window.location.origin}/verificar-recibo/VISTA-PREVIA-REC-${year}-000001`,{width:260,margin:1,errorCorrectionLevel:'M'}).then(setQr)},[year]);

  const calculation=useMemo(()=>{
    const unitAmount=400;
    const baseAmount=connections*unitAmount;
    const discountPercentage=senior?25:0;
    const discountAmount=Math.round(baseAmount*discountPercentage)/100;
    const total=Math.max(0,baseAmount-discountAmount+lateFee);
    return{unitAmount,baseAmount,discountPercentage,discountAmount,total};
  },[connections,senior,lateFee]);

  const receipt=useMemo<ReceiptInput>(()=>({
    number:`REC-${year}-000001`,
    subscriber:'MARÍA ELENA RIVERA',
    subscriberCode:'ABA-000123',
    maskedIdentity:'0501-****-1234',
    date:new Date().toLocaleString('es-HN'),
    annualYear:year,
    periodFrom:`01/01/${year}`,
    periodTo:`30/11/${year}`,
    dueDate:`30/11/${year}`,
    lateFrom:`01/12/${year}`,
    connectionCount:connections,
    connectionCodes:Array.from({length:connections},(_,index)=>`PEG-000123-${String(index+1).padStart(2,'0')}`),
    address:'Sector Centro',
    sector:'Centro',
    serviceStatus:'ACTIVO',
    baseAmount:calculation.baseAmount,
    discountPercentage:calculation.discountPercentage,
    discountAmount:calculation.discountAmount,
    lateFeeAmount:lateFee,
    otherCharges:0,
    total:calculation.total,
    received:calculation.total,
    change:0,
    method:'cash',
    items:[{code:'ANUAL',description:`Cuota anual por prestación y sostenimiento del servicio comunitario de agua potable ${year}`,quantity:connections,unitPrice:calculation.unitAmount,amount:calculation.baseAmount}],
    verification:`${window.location.origin}/verificar-recibo/VISTA-PREVIA-REC-${year}-000001`,
    brand,
    status,
    cashier:'Usuario autorizado',
    sample:true
  }),[brand,calculation,connections,lateFee,status,year]);

  async function upload(key:AssetKey,file?:File){try{const value=await readImage(file);if(value)setBrand(current=>({...current,[key]:value}));setMessage('Imagen cargada en la vista visual. Todavía no se guarda en Supabase.')}catch(error){setMessage((error as Error).message)}}
  async function download(){await downloadReceiptPdf(receipt);setMessage('PDF visual generado con la misma composición del recibo mostrado.')}

  return <main className="ja-page receipt-studio-page">
    <header className="ja-page-head"><div><h1>Estudio visual del recibo anual</h1><p>Construcción completa del diseño sin depender todavía de Supabase. Todos los datos mostrados están marcados como demostrativos.</p></div><Button icon={<Download size={15}/>} onClick={()=>void download()}>Descargar PDF visual</Button></header>
    {message&&<div className="ja-banner ja-banner-info">{message}</div>}

    <div className="receipt-studio-layout">
      <aside className="ja-list receipt-controls">
        <h3 className="ja-list-heading"><Palette size={16}/> Controles visuales</h3>
        <label>Estado del documento<select value={status} onChange={event=>setStatus(event.target.value as PaymentState)}>{Object.entries(stateLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label>Año de la cuota<input type="number" min="2020" max="2100" value={year} onChange={event=>setYear(Number(event.target.value))}/></label>
        <label>Cantidad de pegues<input type="number" min="1" max="20" value={connections} onChange={event=>setConnections(Math.max(1,Number(event.target.value)))}/></label>
        <label className="check"><input type="checkbox" checked={senior} onChange={event=>setSenior(event.target.checked)}/>Aplicar adulto mayor: 25%</label>
        <label>Multa o mora<input type="number" min="0" step="0.01" value={lateFee} onChange={event=>setLateFee(Math.max(0,Number(event.target.value)))}/></label>
        <div className="visual-total-card"><small>Total calculado</small><strong>{money(calculation.total)}</strong><span>{connections} pegue{connections===1?'':'s'} · {senior?'con':'sin'} descuento</span></div>

        <div className="asset-visual-grid">
          <VisualAsset title="Logo de la Junta" icon={<Droplets size={25}/>} preview={brand.logoDataUrl} onFile={file=>void upload('logoDataUrl',file)}/>
          <VisualAsset title="Escudo de Honduras" icon={<Shield size={25}/>} preview={brand.nationalEmblemDataUrl} onFile={file=>void upload('nationalEmblemDataUrl',file)}/>
          <VisualAsset title="Firma" icon={<FileImage size={25}/>} preview={brand.signatureDataUrl} onFile={file=>void upload('signatureDataUrl',file)}/>
          <VisualAsset title="Sello" icon={<Stamp size={25}/>} preview={brand.stampDataUrl} onFile={file=>void upload('stampDataUrl',file)}/>
        </div>
        <div className="visual-warning"><BadgeCheck size={19}/><p>Esta pantalla es una vista visual. No registra pagos, no modifica saldos y no presenta los datos demostrativos como reales.</p></div>
      </aside>

      <section className="receipt-preview-frame">
        <div className="preview-ribbon">VISTA PREVIA VISUAL · DATOS DEMOSTRATIVOS</div>
        <article className={`annual-receipt-preview receipt-state-${status}`} style={{'--receipt-primary':brand.primaryColor,'--receipt-secondary':brand.secondaryColor} as React.CSSProperties}>
          <div className="receipt-top-lines"><span/><span/></div>
          <header className="receipt-official-header">
            <div className="receipt-brand-logo">{brand.logoDataUrl?<img src={brand.logoDataUrl} alt="Logo de la Junta"/>:<><Droplets size={42}/><strong>JAPA</strong></>}</div>
            <div className="receipt-institution-copy"><small>ORGANIZACIÓN COMUNITARIA</small><h2>{brand.name}</h2><p>{brand.slogan}</p><span>{brand.address}</span></div>
            <div className="receipt-national-mark">{brand.nationalEmblemDataUrl?<img src={brand.nationalEmblemDataUrl} alt="Escudo de Honduras"/>:<><Shield size={46}/><strong>HONDURAS</strong><small>Escudo oficial</small></>}</div>
          </header>

          <div className="receipt-document-band">
            <div className="receipt-qr-box">{qr?<img src={qr} alt="QR de verificación"/>:<QrCode size={70}/>}<small>VERIFICACIÓN DIGITAL</small></div>
            <div className="receipt-document-meta"><span className="receipt-document-type">RECIBO OFICIAL DE PAGO</span><div><small>NÚMERO DE DOCUMENTO</small><strong>{receipt.number}</strong></div><div className="meta-two"><span><small>FECHA Y HORA</small><b>{receipt.date}</b></span><span><small>VERSIÓN</small><b>{brand.templateVersion}</b></span></div></div>
            <div className="receipt-state-stamp"><span>{stateLabels[status]}</span><small>{status==='paid'?'CONTABILIZADO':'ESTADO DOCUMENTAL'}</small></div>
          </div>

          <section className="receipt-account-grid">
            <div className="receipt-data-card"><div className="card-title"><IdCard size={17}/>Datos del abonado</div><dl><div><dt>Nombre completo</dt><dd>{receipt.subscriber}</dd></div><div><dt>Identidad</dt><dd>{receipt.maskedIdentity}</dd></div><div><dt>Código de abonado</dt><dd>{receipt.subscriberCode}</dd></div><div><dt>Dirección</dt><dd>{receipt.address}</dd></div></dl></div>
            <div className="receipt-data-card"><div className="card-title"><WalletCards size={17}/>Datos del servicio</div><dl><div><dt>Tipo de servicio</dt><dd>Comunitario domiciliario</dd></div><div><dt>Estado</dt><dd>{receipt.serviceStatus}</dd></div><div><dt>Cantidad de pegues</dt><dd>{connections}</dd></div><div><dt>Códigos</dt><dd>{receipt.connectionCodes?.join(' · ')}</dd></div></dl></div>
          </section>

          <section className="receipt-period-strip"><CalendarDays size={20}/><div><small>PERIODO ANUAL CUBIERTO</small><strong>Del {receipt.periodFrom} al {receipt.periodTo}</strong></div><span><small>FECHA LÍMITE</small><b>{receipt.dueDate}</b></span><span><small>MORA DESDE</small><b>{receipt.lateFrom}</b></span></section>

          <section className="receipt-charge-table"><div className="charge-head"><span>CÓDIGO</span><span>DESCRIPCIÓN</span><span>CANT.</span><span>VALOR UNIT.</span><span>TOTAL</span></div>{receipt.items.map(item=><div className="charge-row" key={item.code}><span>{item.code}</span><span>{item.description}</span><span>{item.quantity}</span><span>{money(item.unitPrice??0)}</span><span>{money(item.amount)}</span></div>)}</section>

          <section className="receipt-summary-area">
            <div className="receipt-benefit-box"><BadgeCheck size={24}/><div><small>BENEFICIO APLICADO</small><strong>{senior?'Descuento de adulto mayor':'Sin descuento especial'}</strong><span>{senior?'25% sobre la cuota anual de todos los pegues del titular.':'La cuota se calcula al valor ordinario.'}</span></div></div>
            <div className="receipt-totals"><div><span>Base antes del descuento</span><b>{money(calculation.baseAmount)}</b></div><div className="discount"><span>Descuento adulto mayor {calculation.discountPercentage}%</span><b>-{money(calculation.discountAmount)}</b></div><div><span>Mora y otros cargos</span><b>{money(lateFee)}</b></div><div className="grand-total"><span>TOTAL PAGADO</span><strong>{money(calculation.total)}</strong></div></div>
          </section>

          <section className="receipt-words-payment"><div><small>TOTAL EN LETRAS</small><strong>{calculation.total.toFixed(2)} LEMPIRAS — REPRESENTACIÓN VISUAL</strong></div><div><small>FORMA DE PAGO</small><strong>EFECTIVO</strong><span>Recibido por: Usuario autorizado</span></div></section>

          <section className="receipt-auth-area"><div className="receipt-validation-copy"><QrCode size={23}/><div><strong>Documento verificable</strong><span>El QR abrirá este mismo recibo en formato digital y mostrará su estado vigente.</span></div></div><div className="receipt-signature-block">{brand.signatureDataUrl&&<img src={brand.signatureDataUrl} alt="Firma autorizada"/>}<span/><strong>{brand.signatoryName}</strong><small>{brand.signatoryTitle}</small></div><div className="receipt-seal-block">{brand.stampDataUrl?<img src={brand.stampDataUrl} alt="Sello institucional"/>:<><Stamp size={44}/><small>SELLO</small></>}</div></section>

          <footer className="receipt-official-footer"><p>{brand.footer}</p><div><span>RTN: {brand.rtn}</span><span>Personería jurídica: {brand.legalEntityNumber}</span><span>{brand.claimText}</span></div></footer>
          <div className="receipt-diagonal-state">{stateLabels[status]}</div>
        </article>
        <div className="receipt-preview-actions"><button className="outline" onClick={()=>window.print()}><Printer size={17}/>Imprimir vista</button><button onClick={()=>void download()}><Download size={17}/>Descargar PDF visual</button></div>
      </section>
    </div>
  </main>;
}

function VisualAsset({title,icon,preview,onFile}:{title:string;icon:React.ReactNode;preview?:string;onFile:(file?:File)=>void}){
  return <label className="visual-asset-control"><span className="visual-asset-thumb">{preview?<img src={preview} alt={title}/>:icon}</span><span><strong>{title}</strong><small>JPG, PNG o WEBP</small></span><Upload size={16}/><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>onFile(event.target.files?.[0])}/></label>;
}
