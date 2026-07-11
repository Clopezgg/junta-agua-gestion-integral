import {jsPDF} from 'jspdf';
import QRCode from 'qrcode';

export type ReceiptBrand={
  name?:string;address?:string;phone?:string;email?:string;rtn?:string;footer?:string;
  logoPath?:string;signaturePath?:string;stampPath?:string;
  logoDataUrl?:string;signatureDataUrl?:string;stampDataUrl?:string;
  signatoryName?:string;signatoryTitle?:string;templateVersion?:string;
};

export type ReceiptInput={
  number:string;subscriber:string;subscriberCode?:string;date:string;total:number;received:number;change:number;
  method:string;items:{description:string;amount:number}[];verification?:string;brand?:ReceiptBrand;copy?:boolean;
  status?:string;cashier?:string;
};

export function toReceiptBrandSnapshot(brand:ReceiptBrand):ReceiptBrand{
  return{
    name:brand.name,address:brand.address,phone:brand.phone,email:brand.email,rtn:brand.rtn,footer:brand.footer,
    logoPath:brand.logoPath,signaturePath:brand.signaturePath,stampPath:brand.stampPath,
    signatoryName:brand.signatoryName,signatoryTitle:brand.signatoryTitle,templateVersion:brand.templateVersion??'2.0'
  };
}

function addImageSafe(pdf:jsPDF,data:string|undefined,x:number,y:number,w:number,h:number){
  if(!data)return;
  try{
    const format=data.includes('image/jpeg')?'JPEG':data.includes('image/webp')?'WEBP':'PNG';
    pdf.addImage(data,format,x,y,w,h,undefined,'FAST');
  }catch{/* El documento sigue siendo válido aunque la imagen no pueda procesarse. */}
}

function methodLabel(value:string){
  return({cash:'Efectivo',transfer:'Transferencia',deposit:'Depósito',check:'Cheque',mixed:'Pago mixto'} as Record<string,string>)[value]??value;
}

function documentLabel(receipt:ReceiptInput){
  if(receipt.status==='voided')return'ANULADO';
  if(receipt.status==='refunded')return'DEVUELTO';
  if(receipt.status==='partially_refunded')return'DEVOLUCIÓN PARCIAL';
  return receipt.copy?'REIMPRESIÓN':'IMPRESIÓN';
}

function paymentStatusLabel(receipt:ReceiptInput){
  if(receipt.status==='voided')return'ANULADO';
  if(receipt.status==='refunded')return'DEVUELTO';
  if(receipt.status==='partially_refunded')return'DEVOLUCIÓN PARCIAL';
  return'PAGADO';
}

export async function createReceiptPdfBlob(receipt:ReceiptInput){
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[139.7,215.9],compress:true});
  const brand=receipt.brand??{};
  const width=139.7;
  const margin=8;
  const documentState=documentLabel(receipt);
  const paymentState=paymentStatusLabel(receipt);
  const primary:[number,number,number]=[7,59,76];
  const isNegative=['ANULADO','DEVUELTO','DEVOLUCIÓN PARCIAL'].includes(paymentState);
  const accent:[number,number,number]=isNegative?[153,27,27]:[11,110,117];

  pdf.setFillColor(...primary);
  pdf.rect(0,0,width,4,'F');

  pdf.setTextColor(225,232,236);
  pdf.setFont('helvetica','bold');
  pdf.setFontSize(documentState.length>12?22:30);
  pdf.text(documentState,width/2,112,{align:'center',angle:35});
  pdf.setTextColor(20,33,61);

  addImageSafe(pdf,brand.logoDataUrl,margin,9,19,19);
  pdf.setFont('helvetica','bold');
  pdf.setFontSize(13);
  pdf.text(pdf.splitTextToSize(brand.name||'Junta Administradora de Agua',88),32,14);
  pdf.setFont('helvetica','normal');
  pdf.setFontSize(7.5);
  const institution=[brand.rtn?`RTN: ${brand.rtn}`:'',brand.address||'',brand.phone?`Tel. ${brand.phone}`:'',brand.email||''].filter(Boolean);
  institution.forEach((line,index)=>pdf.text(pdf.splitTextToSize(line,88),32,23+index*4));

  pdf.setDrawColor(...primary);
  pdf.setLineWidth(.5);
  pdf.line(margin,35,width-margin,35);

  pdf.setFillColor(241,247,247);
  pdf.roundedRect(margin,39,width-margin*2,25,2,2,'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica','bold');
  pdf.text('RECIBO OFICIAL',12,45);
  pdf.setFont('helvetica','normal');
  pdf.text(`N.º ${receipt.number}`,12,51);
  pdf.text(`Fecha: ${receipt.date}`,12,57);
  pdf.text(`Caja / responsable: ${receipt.cashier||'Usuario autorizado'}`,72,45);
  pdf.text(`Forma de pago: ${methodLabel(receipt.method)}`,72,51);
  pdf.text(`Plantilla: v${brand.templateVersion||'2.0'}`,72,57);

  pdf.setFont('helvetica','bold');
  pdf.setFontSize(8.5);
  pdf.text('ABONADO',margin,71);
  pdf.setFont('helvetica','normal');
  pdf.setFontSize(9.5);
  pdf.text(pdf.splitTextToSize(receipt.subscriber,95),margin,77);
  if(receipt.subscriberCode){pdf.setFontSize(8);pdf.text(`Código: ${receipt.subscriberCode}`,width-margin,77,{align:'right'});}

  let y=88;
  pdf.setFillColor(...primary);
  pdf.setTextColor(255,255,255);
  pdf.rect(margin,y,width-margin*2,7,'F');
  pdf.setFont('helvetica','bold');
  pdf.setFontSize(8);
  pdf.text('CONCEPTO',11,y+4.8);
  pdf.text('IMPORTE',width-11,y+4.8,{align:'right'});
  pdf.setTextColor(20,33,61);
  y+=10;

  const visibleItems=receipt.items.slice(0,8);
  visibleItems.forEach((item,index)=>{
    const lines=pdf.splitTextToSize(item.description,88).slice(0,2);
    pdf.setFont('helvetica','normal');
    pdf.setFontSize(8);
    pdf.text(lines,11,y);
    pdf.text(`L ${Number(item.amount).toFixed(2)}`,width-11,y,{align:'right'});
    y+=Math.max(6,lines.length*4);
    if(index<visibleItems.length-1){pdf.setDrawColor(226,232,240);pdf.line(11,y-2,width-11,y-2);}
  });
  if(receipt.items.length>visibleItems.length){
    pdf.setFontSize(7);
    pdf.text(`+ ${receipt.items.length-visibleItems.length} conceptos incluidos en el pago`,11,y);
    y+=5;
  }

  y=Math.max(y+2,131);
  pdf.setDrawColor(...primary);
  pdf.line(72,y,width-margin,y);
  const totals=[['TOTAL PAGADO',receipt.total],['RECIBIDO',receipt.received],['CAMBIO',receipt.change]] as const;
  totals.forEach(([label,value],index)=>{
    const rowY=y+7+index*7;
    pdf.setFont('helvetica',index===0?'bold':'normal');
    pdf.setFontSize(index===0?10:8);
    pdf.text(label,76,rowY);
    pdf.text(`L ${Number(value).toFixed(2)}`,width-margin,rowY,{align:'right'});
  });

  pdf.setDrawColor(...accent);
  pdf.setTextColor(...accent);
  pdf.setLineWidth(.8);
  pdf.circle(28,150,15);
  pdf.setFont('helvetica','bold');
  pdf.setFontSize(paymentState.length>12?6.5:9);
  pdf.text(paymentState,28,149,{align:'center'});
  pdf.setFontSize(6.5);
  pdf.text(receipt.number,28,154,{align:'center'});
  pdf.setTextColor(20,33,61);

  addImageSafe(pdf,brand.signatureDataUrl,70,158,30,14);
  addImageSafe(pdf,brand.stampDataUrl,98,151,25,25);
  pdf.setDrawColor(100,116,139);
  pdf.line(67,174,112,174);
  pdf.setFontSize(7);
  pdf.setFont('helvetica','bold');
  pdf.text(brand.signatoryName||'Firma autorizada',89.5,178,{align:'center'});
  pdf.setFont('helvetica','normal');
  if(brand.signatoryTitle)pdf.text(brand.signatoryTitle,89.5,182,{align:'center'});

  if(receipt.verification){
    const qr=await QRCode.toDataURL(receipt.verification,{margin:1,width:220,errorCorrectionLevel:'M'});
    pdf.addImage(qr,'PNG',margin,177,25,25,undefined,'FAST');
    pdf.setFontSize(6.8);
    pdf.setFont('helvetica','bold');
    pdf.text('VERIFICACIÓN DIGITAL',36,184);
    pdf.setFont('helvetica','normal');
    pdf.text(pdf.splitTextToSize('Escanee el QR para confirmar número, importe, estado y autenticidad del recibo.',58),36,189);
  }

  pdf.setDrawColor(203,213,225);
  pdf.line(margin,205,width-margin,205);
  pdf.setFontSize(6.5);
  pdf.setTextColor(71,85,105);
  const footer=brand.footer||'Conserve este comprobante. Su autenticidad puede verificarse mediante el código QR.';
  pdf.text(pdf.splitTextToSize(footer,112).slice(0,2),margin,209);
  pdf.text(`${receipt.copy?'REIMPRESIÓN':'IMPRESIÓN ORIGINAL'} · ${receipt.number}`,width-margin,213,{align:'right'});

  pdf.setProperties({title:`Recibo ${receipt.number}`,subject:'Comprobante institucional de pago',author:brand.name||'Junta de Agua',keywords:'recibo,pago,agua,QR'});
  return pdf.output('blob');
}

export async function downloadReceiptPdf(receipt:ReceiptInput){
  const blob=await createReceiptPdfBlob(receipt);
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`${receipt.copy?'REIMPRESION-':''}${receipt.number}.pdf`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  return blob;
}

function esc(v:unknown){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function sheet(name:string,headers:string[],rows:(string|number)[][]){const cells=(r:(string|number)[])=>`<Row>${r.map(v=>`<Cell><Data ss:Type="${typeof v==='number'?'Number':'String'}">${esc(v)}</Data></Cell>`).join('')}</Row>`;return `<Worksheet ss:Name="${esc(name).slice(0,31)}"><Table>${cells(headers)}${rows.map(cells).join('')}</Table></Worksheet>`;}
export function downloadWorkbookXml(filename:string,sheets:{name:string;headers:string[];rows:(string|number)[][]}[]){const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${sheets.map(x=>sheet(x.name,x.headers,x.rows)).join('')}</Workbook>`;const url=URL.createObjectURL(new Blob([xml],{type:'application/vnd.ms-excel'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function downloadExcelXml(filename:string,headers:string[],rows:(string|number)[][]){downloadWorkbookXml(filename,[{name:'Informe',headers,rows}]);}
