import {jsPDF} from 'jspdf';
import QRCode from 'qrcode';

export type ReceiptBrand={
  name?:string;shortName?:string;slogan?:string;address?:string;phone?:string;email?:string;rtn?:string;legalEntityNumber?:string;
  footer?:string;claimText?:string;logoPath?:string;nationalEmblemPath?:string;signaturePath?:string;stampPath?:string;
  logoDataUrl?:string;nationalEmblemDataUrl?:string;signatureDataUrl?:string;stampDataUrl?:string;
  signatoryName?:string;signatoryTitle?:string;templateVersion?:string;primaryColor?:string;secondaryColor?:string;
};

export type ReceiptItem={code?:string;description:string;quantity?:number;unitPrice?:number;amount:number};

export type ReceiptInput={
  number:string;subscriber:string;subscriberCode?:string;maskedIdentity?:string;date:string;
  annualYear?:number;periodFrom?:string;periodTo?:string;dueDate?:string;lateFrom?:string;
  connectionCount?:number;connectionCodes?:string[];address?:string;sector?:string;serviceStatus?:string;
  baseAmount?:number;discountPercentage?:number;discountAmount?:number;lateFeeAmount?:number;otherCharges?:number;
  total:number;received:number;change:number;method:string;items:ReceiptItem[];verification?:string;brand?:ReceiptBrand;copy?:boolean;
  status?:string;cashier?:string;totalWords?:string;sample?:boolean;
};

export function toReceiptBrandSnapshot(brand:ReceiptBrand):ReceiptBrand{
  return{
    name:brand.name,shortName:brand.shortName,slogan:brand.slogan,address:brand.address,phone:brand.phone,email:brand.email,rtn:brand.rtn,
    legalEntityNumber:brand.legalEntityNumber,footer:brand.footer,claimText:brand.claimText,logoPath:brand.logoPath,
    nationalEmblemPath:brand.nationalEmblemPath,signaturePath:brand.signaturePath,stampPath:brand.stampPath,
    signatoryName:brand.signatoryName,signatoryTitle:brand.signatoryTitle,templateVersion:brand.templateVersion??'3.1',
    primaryColor:brand.primaryColor,secondaryColor:brand.secondaryColor
  };
}

function addImageSafe(pdf:jsPDF,data:string|undefined,x:number,y:number,w:number,h:number){
  if(!data)return false;
  try{
    const format=data.includes('image/jpeg')?'JPEG':data.includes('image/webp')?'WEBP':'PNG';
    pdf.addImage(data,format,x,y,w,h,undefined,'FAST');
    return true;
  }catch{return false;}
}

function hexToRgb(value:string|undefined,fallback:[number,number,number]):[number,number,number]{
  const match=value?.trim().match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  return match?[Number.parseInt(match[1],16),Number.parseInt(match[2],16),Number.parseInt(match[3],16)]:fallback;
}

function methodLabel(value:string){
  return({cash:'EFECTIVO',transfer:'TRANSFERENCIA',deposit:'DEPÓSITO',check:'CHEQUE',mixed:'PAGO MIXTO'} as Record<string,string>)[value]??value.toUpperCase();
}

function paymentStatusLabel(receipt:ReceiptInput){
  if(receipt.status==='voided')return'ANULADO';
  if(receipt.status==='refunded')return'DEVUELTO';
  if(receipt.status==='partially_refunded')return'DEVOLUCIÓN PARCIAL';
  if(receipt.status==='overdue')return'VENCIDO';
  if(receipt.status==='pending')return'PENDIENTE';
  return'PAGADO';
}

function documentLabel(receipt:ReceiptInput){
  if(receipt.status==='voided')return'ANULACIÓN';
  if(receipt.status==='refunded'||receipt.status==='partially_refunded')return'DEVOLUCIÓN';
  return receipt.copy?'REIMPRESIÓN':'ORIGINAL';
}

function amount(value:unknown){return `L ${Number(value??0).toLocaleString('es-HN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;}

const units=['','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE','VEINTIUNO','VEINTIDÓS','VEINTITRÉS','VEINTICUATRO','VEINTICINCO','VEINTISÉIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE'];
const tens=['','','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
const hundreds=['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
function underThousand(value:number):string{
  if(value===0)return'';if(value===100)return'CIEN';
  const h=Math.floor(value/100),rest=value%100;
  const tail=rest<30?units[rest]:`${tens[Math.floor(rest/10)]}${rest%10?` Y ${units[rest%10]}`:''}`;
  return`${hundreds[h]}${h&&tail?' ':''}${tail}`.trim();
}
function numberWords(value:number){
  const integer=Math.floor(Math.abs(value));
  if(integer===0)return'CERO';
  const millions=Math.floor(integer/1_000_000),thousands=Math.floor((integer%1_000_000)/1000),rest=integer%1000;
  const parts:string[]=[];
  if(millions)parts.push(millions===1?'UN MILLÓN':`${underThousand(millions)} MILLONES`);
  if(thousands)parts.push(thousands===1?'MIL':`${underThousand(thousands)} MIL`);
  if(rest)parts.push(underThousand(rest));
  return parts.join(' ');
}
function totalInWords(value:number){const cents=Math.round((Math.abs(value)-Math.floor(Math.abs(value)))*100);return`${numberWords(value)} LEMPIRAS CON ${String(cents).padStart(2,'0')}/100`;}

function drawFallbackLogo(pdf:jsPDF,x:number,y:number,primary:[number,number,number],secondary:[number,number,number]){
  pdf.setFillColor(...primary);pdf.roundedRect(x,y,22,22,4,4,'F');
  pdf.setFillColor(...secondary);pdf.circle(x+11,y+7,3.4,'F');pdf.triangle(x+7.6,y+8.2,x+14.4,y+8.2,x+11,y+15.3,'F');
  pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(5.8);pdf.text('JAPA',x+11,y+20,{align:'center'});
}
function drawFallbackEmblem(pdf:jsPDF,x:number,y:number,primary:[number,number,number]){
  pdf.setDrawColor(...primary);pdf.setLineWidth(.45);pdf.roundedRect(x,y,21,22,3,3,'S');
  pdf.setFont('helvetica','bold');pdf.setTextColor(...primary);pdf.setFontSize(5.4);pdf.text('HONDURAS',x+10.5,y+5,{align:'center'});
  pdf.setFontSize(14);pdf.text('H',x+10.5,y+14,{align:'center'});pdf.setFontSize(4.5);pdf.text('ESCUDO OFICIAL',x+10.5,y+19.5,{align:'center'});
}

export async function createReceiptPdfBlob(receipt:ReceiptInput){
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[139.7,215.9],compress:true});
  const brand=receipt.brand??{};
  const width=139.7,margin=6.5;
  const primary=hexToRgb(brand.primaryColor,[11,79,108]);
  const secondary=hexToRgb(brand.secondaryColor,[217,168,33]);
  const state=paymentStatusLabel(receipt);
  const negative=['ANULADO','DEVUELTO','DEVOLUCIÓN PARCIAL','VENCIDO'].includes(state);
  const stateColor:[number,number,number]=negative?[153,27,27]:state==='PENDIENTE'?[180,83,9]:[21,128,61];
  const year=receipt.annualYear??new Date(receipt.date).getFullYear();
  const baseAmount=Number(receipt.baseAmount??receipt.items.reduce((sum,item)=>sum+Number(item.amount),0));
  const discountAmount=Number(receipt.discountAmount??0);
  const lateFeeAmount=Number(receipt.lateFeeAmount??0);
  const otherCharges=Number(receipt.otherCharges??0);
  const connectionCodes=receipt.connectionCodes??[];

  pdf.setFillColor(...primary);pdf.rect(0,0,width,3,'F');
  pdf.setFillColor(...secondary);pdf.rect(0,3,width,1.2,'F');
  if(receipt.sample){pdf.setFillColor(254,243,199);pdf.rect(0,4.2,width,5.5,'F');pdf.setTextColor(146,64,14);pdf.setFont('helvetica','bold');pdf.setFontSize(6.2);pdf.text('VISTA PREVIA VISUAL · DATOS DEMOSTRATIVOS · NO REPRESENTA UN PAGO REAL',width/2,7.8,{align:'center'});}

  const headerY=receipt.sample?11.5:7;
  if(!addImageSafe(pdf,brand.logoDataUrl,margin,headerY,22,22))drawFallbackLogo(pdf,margin,headerY,primary,secondary);
  if(!addImageSafe(pdf,brand.nationalEmblemDataUrl,width-margin-21,headerY,21,22))drawFallbackEmblem(pdf,width-margin-21,headerY,primary);
  pdf.setTextColor(...primary);pdf.setFont('helvetica','bold');pdf.setFontSize(11.4);
  const institutionLines=pdf.splitTextToSize(brand.name||'Junta de Agua',78).slice(0,2);
  pdf.text(institutionLines,width/2,headerY+5,{align:'center'});
  pdf.setFont('helvetica','normal');pdf.setFontSize(6.3);pdf.setTextColor(71,85,105);
  pdf.text(brand.slogan||'Servicio comunitario, transparente y responsable',width/2,headerY+13,{align:'center'});
  const addressLines=pdf.splitTextToSize(brand.address||'Honduras',76).slice(0,2);
  pdf.text(addressLines,width/2,headerY+17,{align:'center'});

  const bandY=headerY+26;
  pdf.setFillColor(244,248,250);pdf.roundedRect(margin,bandY,width-margin*2,29,2.5,2.5,'F');
  let qrData='';if(receipt.verification)qrData=await QRCode.toDataURL(receipt.verification,{margin:1,width:240,errorCorrectionLevel:'M'});
  if(qrData)pdf.addImage(qrData,'PNG',margin+2,bandY+2,23,23,undefined,'FAST');
  pdf.setFontSize(4.8);pdf.setTextColor(71,85,105);pdf.setFont('helvetica','bold');pdf.text('VERIFICACIÓN DIGITAL',margin+13.5,bandY+27,{align:'center'});

  pdf.setTextColor(...primary);pdf.setFontSize(8.8);pdf.text('RECIBO OFICIAL DE PAGO',margin+30,bandY+5.5);
  pdf.setFontSize(5.5);pdf.setTextColor(100,116,139);pdf.text('NÚMERO DE DOCUMENTO',margin+30,bandY+10.5);
  pdf.setFont('helvetica','bold');pdf.setTextColor(15,23,42);pdf.setFontSize(8);pdf.text(receipt.number,margin+30,bandY+14.5);
  pdf.setFont('helvetica','normal');pdf.setFontSize(5.6);pdf.setTextColor(71,85,105);
  pdf.text(`Fecha y hora: ${receipt.date}`,margin+30,bandY+20);
  pdf.text(`Emisión: ${documentLabel(receipt)} · Plantilla: v${brand.templateVersion||'3.1'}`,margin+30,bandY+24);

  pdf.setDrawColor(...stateColor);pdf.setTextColor(...stateColor);pdf.setLineWidth(.8);pdf.roundedRect(width-margin-35,bandY+4,31,18,3,3,'S');
  pdf.setFont('helvetica','bold');pdf.setFontSize(state.length>16?6.3:10);pdf.text(state,width-margin-19.5,bandY+12,{align:'center'});
  pdf.setFontSize(5.2);pdf.text(state==='PAGADO'?'CONTABILIZADO':'ESTADO DOCUMENTAL',width-margin-19.5,bandY+17,{align:'center'});

  const cardsY=bandY+32;
  const cardW=(width-margin*2-3)/2;
  pdf.setFillColor(255,255,255);pdf.setDrawColor(219,231,234);pdf.roundedRect(margin,cardsY,cardW,27,2,2,'FD');pdf.roundedRect(margin+cardW+3,cardsY,cardW,27,2,2,'FD');
  pdf.setTextColor(...primary);pdf.setFont('helvetica','bold');pdf.setFontSize(6.5);pdf.text('DATOS DEL ABONADO',margin+3,cardsY+5);pdf.text('DATOS DEL SERVICIO',margin+cardW+6,cardsY+5);
  pdf.setTextColor(51,65,85);pdf.setFont('helvetica','normal');pdf.setFontSize(5.8);
  const leftRows=[['Nombre',receipt.subscriber],['Identidad',receipt.maskedIdentity||'NO REGISTRADA'],['Código',receipt.subscriberCode||'NO ASIGNADO'],['Dirección',receipt.address||receipt.sector||'NO REGISTRADA']];
  leftRows.forEach(([label,value],index)=>{const y=cardsY+9+index*4.3;pdf.setFont('helvetica','bold');pdf.text(`${label}:`,margin+3,y);pdf.setFont('helvetica','normal');pdf.text(pdf.splitTextToSize(String(value),cardW-20).slice(0,1),margin+18,y)});
  const rightRows=[['Tipo','COMUNITARIO DOMICILIARIO'],['Estado',receipt.serviceStatus||'ACTIVO'],['Pegues',String(receipt.connectionCount??connectionCodes.length??0)],['Códigos',connectionCodes.length?connectionCodes.join(' · '):'NO REGISTRADOS']];
  rightRows.forEach(([label,value],index)=>{const y=cardsY+9+index*4.3;pdf.setFont('helvetica','bold');pdf.text(`${label}:`,margin+cardW+6,y);pdf.setFont('helvetica','normal');pdf.text(pdf.splitTextToSize(String(value),cardW-20).slice(0,1),margin+cardW+21,y)});

  const periodY=cardsY+30;
  pdf.setFillColor(...primary);pdf.roundedRect(margin,periodY,width-margin*2,13,2,2,'F');pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(6.4);
  pdf.text(`PERIODO ANUAL ${year}`,margin+4,periodY+4.6);pdf.setFontSize(7.2);pdf.text(`Del ${receipt.periodFrom||`01/01/${year}`} al ${receipt.periodTo||`30/11/${year}`}`,margin+4,periodY+9.2);
  pdf.setFontSize(5.3);pdf.text('FECHA LÍMITE',width-57,periodY+4.2);pdf.text(receipt.dueDate||`30/11/${year}`,width-57,periodY+8.6);pdf.text('MORA DESDE',width-30,periodY+4.2);pdf.text(receipt.lateFrom||`01/12/${year}`,width-30,periodY+8.6);

  let tableY=periodY+16;
  const columns=[margin,margin+15,margin+83,margin+98,width-margin];
  pdf.setFillColor(226,235,238);pdf.rect(margin,tableY,width-margin*2,7,'F');pdf.setTextColor(51,65,85);pdf.setFont('helvetica','bold');pdf.setFontSize(5.4);
  pdf.text('CÓDIGO',columns[0]+2,tableY+4.5);pdf.text('DESCRIPCIÓN',columns[1]+2,tableY+4.5);pdf.text('CANT.',columns[2]+2,tableY+4.5);pdf.text('VALOR UNIT.',columns[3]+2,tableY+4.5);pdf.text('TOTAL',columns[4]-2,tableY+4.5,{align:'right'});
  tableY+=8;
  const visibleItems=receipt.items.slice(0,4);
  visibleItems.forEach(item=>{
    const lines=pdf.splitTextToSize(item.description,62).slice(0,2);const rowH=Math.max(8,lines.length*3.6+2);
    pdf.setDrawColor(226,232,240);pdf.line(margin,tableY+rowH,width-margin,tableY+rowH);
    pdf.setTextColor(15,23,42);pdf.setFont('helvetica','normal');pdf.setFontSize(5.7);
    pdf.text(item.code||'SRV',columns[0]+2,tableY+4);pdf.text(lines,columns[1]+2,tableY+3.8);pdf.text(String(item.quantity??1),columns[2]+6,tableY+4,{align:'center'});
    pdf.text(amount(item.unitPrice??item.amount),columns[3]+16,tableY+4,{align:'right'});pdf.setFont('helvetica','bold');pdf.text(amount(item.amount),columns[4]-2,tableY+4,{align:'right'});
    tableY+=rowH;
  });

  const summaryY=Math.max(tableY+3,154);
  pdf.setFillColor(239,248,246);pdf.roundedRect(margin,summaryY,62,21,2,2,'F');pdf.setTextColor(21,128,61);pdf.setFont('helvetica','bold');pdf.setFontSize(6.2);pdf.text('BENEFICIO APLICADO',margin+4,summaryY+5);
  pdf.setTextColor(15,23,42);pdf.setFontSize(7.2);pdf.text(discountAmount>0?'DESCUENTO DE ADULTO MAYOR':'SIN DESCUENTO ESPECIAL',margin+4,summaryY+10);
  pdf.setFont('helvetica','normal');pdf.setTextColor(71,85,105);pdf.setFontSize(5.4);pdf.text(pdf.splitTextToSize(discountAmount>0?`${receipt.discountPercentage??25}% sobre la cuota anual de todos los pegues del titular.`:'La cuota se calcula al valor ordinario.',54),margin+4,summaryY+14);

  const totalsX=75;
  const totals=[['Base antes del descuento',baseAmount], [`Descuento adulto mayor ${receipt.discountPercentage??0}%`,-discountAmount],['Mora y otros cargos',lateFeeAmount+otherCharges]] as const;
  pdf.setFontSize(5.8);totals.forEach(([label,value],index)=>{const y=summaryY+4+index*5;pdf.setFont('helvetica','normal');pdf.setTextColor(71,85,105);pdf.text(label,totalsX,y);pdf.setFont('helvetica','bold');pdf.setTextColor(value<0?21:15,value<0?128:23,value<0?61:42);pdf.text(`${value<0?'-':''}${amount(Math.abs(value))}`,width-margin,y,{align:'right'})});
  pdf.setFillColor(...primary);pdf.roundedRect(totalsX,summaryY+15,width-margin-totalsX,8,2,2,'F');pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(7);pdf.text('TOTAL PAGADO',totalsX+3,summaryY+20.2);pdf.setFontSize(9);pdf.text(amount(receipt.total),width-margin-2,summaryY+20.2,{align:'right'});

  const wordsY=summaryY+26;
  pdf.setFillColor(248,250,252);pdf.roundedRect(margin,wordsY,width-margin*2,12,2,2,'F');pdf.setTextColor(100,116,139);pdf.setFont('helvetica','bold');pdf.setFontSize(5);pdf.text('TOTAL EN LETRAS',margin+3,wordsY+4);pdf.setTextColor(15,23,42);pdf.setFontSize(6.2);pdf.text(pdf.splitTextToSize(receipt.totalWords||totalInWords(receipt.total),78).slice(0,2),margin+3,wordsY+8);
  pdf.setTextColor(100,116,139);pdf.setFontSize(5);pdf.text('FORMA DE PAGO',width-42,wordsY+4);pdf.setTextColor(15,23,42);pdf.setFontSize(6.2);pdf.text(methodLabel(receipt.method),width-42,wordsY+8);pdf.setFont('helvetica','normal');pdf.setFontSize(5);pdf.text(`Recibido por: ${receipt.cashier||'Usuario autorizado'}`,width-42,wordsY+11);

  const authY=wordsY+15;
  pdf.setDrawColor(203,213,225);pdf.line(margin,authY,width-margin,authY);
  if(qrData)pdf.addImage(qrData,'PNG',margin,authY+3,18,18,undefined,'FAST');
  pdf.setTextColor(...primary);pdf.setFont('helvetica','bold');pdf.setFontSize(5.8);pdf.text('DOCUMENTO VERIFICABLE',margin+22,authY+7);pdf.setFont('helvetica','normal');pdf.setTextColor(71,85,105);pdf.setFontSize(5.1);pdf.text(pdf.splitTextToSize('El QR abrirá este mismo recibo en formato digital y mostrará su estado vigente.',40),margin+22,authY+11);
  addImageSafe(pdf,brand.signatureDataUrl,76,authY+2,24,10);addImageSafe(pdf,brand.stampDataUrl,106,authY+1,18,18);
  pdf.setDrawColor(100,116,139);pdf.line(72,authY+15,103,authY+15);pdf.setTextColor(15,23,42);pdf.setFont('helvetica','bold');pdf.setFontSize(5.5);pdf.text(brand.signatoryName||'Deisy Rivas',87.5,authY+18,{align:'center'});pdf.setFont('helvetica','normal');pdf.setTextColor(71,85,105);pdf.text(brand.signatoryTitle||'Secretaria',87.5,authY+21,{align:'center'});
  if(!brand.stampDataUrl){pdf.setDrawColor(...primary);pdf.circle(115,authY+10,8);pdf.setTextColor(...primary);pdf.setFont('helvetica','bold');pdf.setFontSize(5.2);pdf.text('SELLO',115,authY+9,{align:'center'});pdf.setFontSize(4.2);pdf.text('INSTITUCIONAL',115,authY+12,{align:'center'});}

  const footerY=authY+24;
  pdf.setFillColor(...primary);pdf.rect(0,footerY,width,215.9-footerY,'F');pdf.setTextColor(255,255,255);pdf.setFont('helvetica','normal');pdf.setFontSize(4.8);
  pdf.text(pdf.splitTextToSize(brand.footer||'Documento oficial emitido por la Junta de Agua. Su autenticidad se verifica mediante el código QR.',86).slice(0,2),margin,footerY+5);
  pdf.setFont('helvetica','bold');pdf.text(`RTN: ${brand.rtn||'PENDIENTE'} · Personería jurídica: ${brand.legalEntityNumber||'PENDIENTE'}`,margin,footerY+10);
  pdf.setFont('helvetica','normal');pdf.text(pdf.splitTextToSize(brand.claimText||'Para reclamos o correcciones, presente este documento ante la Secretaría de la Junta.',82).slice(0,1),margin,footerY+14);
  pdf.setFont('helvetica','bold');pdf.text(`${documentLabel(receipt)} · ${receipt.number}`,width-margin,footerY+8,{align:'right'});

  pdf.setTextColor(200,210,214);pdf.setFont('helvetica','bold');pdf.setFontSize(state.length>16?22:31);pdf.text(state,width/2,126,{align:'center',angle:32});
  pdf.setProperties({title:`Recibo ${receipt.number}`,subject:'Comprobante institucional de pago anual',author:brand.name||'Junta de Agua',keywords:'recibo,pago anual,agua,pegues,adulto mayor,QR'});
  return pdf.output('blob');
}

export async function downloadReceiptPdf(receipt:ReceiptInput){
  const blob=await createReceiptPdfBlob(receipt);
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=url;anchor.download=`${receipt.sample?'VISTA-PREVIA-':receipt.copy?'REIMPRESION-':''}${receipt.number}.pdf`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return blob;
}

function esc(value:unknown){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function sheet(name:string,headers:string[],rows:(string|number)[][]){const cells=(row:(string|number)[])=>`<Row>${row.map(value=>`<Cell><Data ss:Type="${typeof value==='number'?'Number':'String'}">${esc(value)}</Data></Cell>`).join('')}</Row>`;return `<Worksheet ss:Name="${esc(name).slice(0,31)}"><Table>${cells(headers)}${rows.map(cells).join('')}</Table></Worksheet>`;}
export function downloadWorkbookXml(filename:string,sheets:{name:string;headers:string[];rows:(string|number)[][]}[]){const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${sheets.map(item=>sheet(item.name,item.headers,item.rows)).join('')}</Workbook>`;const url=URL.createObjectURL(new Blob([xml],{type:'application/vnd.ms-excel'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function downloadExcelXml(filename:string,headers:string[],rows:(string|number)[][]){downloadWorkbookXml(filename,[{name:'Informe',headers,rows}]);}
