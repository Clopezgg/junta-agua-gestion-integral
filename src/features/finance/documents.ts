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
  number:string;subscriber:string;subscriberCode?:string;maskedIdentity?:string;date:string;time?:string;cashBox?:string;
  annualYear?:number;periodFrom?:string;periodTo?:string;dueDate?:string;lateFrom?:string;concept?:string;reference?:string;
  connectionCount?:number;connectionCodes?:string[];address?:string;sector?:string;serviceStatus?:string;
  baseAmount?:number;discountPercentage?:number;discountAmount?:number;lateFeeAmount?:number;otherCharges?:number;
  previousBalance?:number;appliedAmount?:number;newBalance?:number;
  total:number;received:number;change:number;method:string;items:ReceiptItem[];verification?:string;verificationCode?:string;brand?:ReceiptBrand;copy?:boolean;
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

// Placeholder institucional del logo (§11): marca sobria, NO una identidad nueva
// permanente. Óvalo con gota — se usa sólo si la Junta aún no cargó su logo oficial.
function drawLogoPlaceholder(pdf:jsPDF,x:number,y:number,w:number,h:number){
  pdf.setFillColor(255,255,255);pdf.ellipse(x+w/2,y+h/2,w/2,h/2,'F');
  pdf.setDrawColor(11,39,69);pdf.setLineWidth(.5);pdf.ellipse(x+w/2,y+h/2,w/2,h/2,'S');
  pdf.setFillColor(8,145,178);pdf.circle(x+w/2,y+h/2-1.6,2.1,'F');
  pdf.triangle(x+w/2-2.1,y+h/2-0.6,x+w/2+2.1,y+h/2-0.6,x+w/2,y+h/2+3.2,'F');
}
// Placeholder del sello circular (§12): SIN nombres de persona ni "FIRMA".
function drawStampPlaceholder(pdf:jsPDF,cx:number,cy:number,r:number){
  pdf.setDrawColor(11,39,69);pdf.setLineWidth(.55);pdf.circle(cx,cy,r,'S');pdf.circle(cx,cy,r-1.6,'S');
  pdf.setFillColor(8,145,178);pdf.circle(cx,cy-0.6,1.6,'F');pdf.triangle(cx-1.6,cy,cx+1.6,cy,cx,cy+2.6,'F');
  pdf.setTextColor(11,39,69);pdf.setFont('helvetica','bold');pdf.setFontSize(3.4);
  pdf.text('JUNTA ADMINISTRADORA DE AGUA POTABLE',cx,cy-r+2.4,{align:'center'});
  pdf.text('EL ACHIOTAL',cx,cy+r-1.6,{align:'center'});
}

/**
 * Recibo oficial — Visual Contract §10–31, §129.
 * Composición: header navy (logo óvalo · institución · RECIBO OFICIAL DE PAGO No.) →
 * fila FECHA/HORA/CAJA/ESTADO → cuerpo 65/35 (RECIBÍ DE / LA SUMA DE / POR CONCEPTO DE
 * · panel MONTO PAGADO) → fila Abonado/Pegue/Sector → SITUACIÓN DE LA CUENTA (sólo
 * hechos reales, sin filas L0) → footer autenticidad (QR · FIRMA · SELLO) → footer navy.
 */
export async function createReceiptPdfBlob(receipt:ReceiptInput){
  const W=215.9,H=279.4,M=14;
  const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[W,H],compress:true});
  const brand=receipt.brand??{};
  const NAVY:[number,number,number]=[11,39,69];
  const TEAL:[number,number,number]=[8,145,178];
  const INK:[number,number,number]=[16,24,40];
  const SEC:[number,number,number]=[71,84,103];
  const MUT:[number,number,number]=[102,112,133];
  const GREEN:[number,number,number]=[6,118,71];
  const state=paymentStatusLabel(receipt);
  const voided=receipt.status==='voided';
  const reversed=receipt.status==='refunded'||receipt.status==='partially_refunded';
  const inst=brand.name||'Junta Administradora de Agua Potable El Achiotal';
  const place=brand.address||'Santa Cruz de Yojoa, Cortés';
  const discount=Number(receipt.discountAmount??0);
  const late=Number(receipt.lateFeeAmount??0);
  const applied=Number(receipt.appliedAmount??receipt.total);
  const prev=receipt.previousBalance;
  const next=receipt.newBalance;
  const [datePart,timePart]=receipt.date.includes(',')?receipt.date.split(',').map(s=>s.trim()):[receipt.date,receipt.time??''];
  const time=receipt.time??timePart??'';

  const qr=receipt.verification?await QRCode.toDataURL(receipt.verification,{margin:0,width:260,errorCorrectionLevel:'M'}):'';

  // ── HEADER NAVY ────────────────────────────────────────────────────────────
  const HD=34;
  pdf.setFillColor(...NAVY);pdf.rect(0,0,W,HD,'F');
  if(!addImageSafe(pdf,brand.logoDataUrl,M,7,28,20))drawLogoPlaceholder(pdf,M,7,28,20);
  pdf.setTextColor(255,255,255);pdf.setFont('helvetica','bold');pdf.setFontSize(11.5);
  pdf.text(pdf.splitTextToSize(inst.toUpperCase(),105).slice(0,3),M+34,13);
  pdf.setFont('helvetica','normal');pdf.setFontSize(7.5);pdf.setTextColor(200,214,228);
  pdf.text(place,M+34,HD-6);
  pdf.setFont('helvetica','bold');pdf.setFontSize(10.5);pdf.setTextColor(255,255,255);
  pdf.text('RECIBO OFICIAL DE PAGO',W-M,10.5,{align:'right'});
  pdf.setFont('helvetica','normal');pdf.setFontSize(6.5);pdf.setTextColor(200,214,228);
  pdf.text('N.º DE COMPROBANTE',W-M,17,{align:'right'});
  pdf.setFont('helvetica','bold');pdf.setFontSize(15);pdf.setTextColor(...[125,211,252]);
  pdf.text(receipt.number,W-M,25.5,{align:'right'});
  pdf.setFillColor(...TEAL);pdf.rect(0,HD,W,1,'F');

  // ── FILA METADATA ─────────────────────────────────────────────────────────
  let y=HD+9;
  const meta:[string,string,[number,number,number]][]=[
    ['FECHA',datePart,INK],['HORA',time||'—',INK],['CAJA',receipt.cashBox||receipt.cashier?.replace(/.*Caja\s*/i,'')||'01',INK],
    ['ESTADO',state,voided||reversed?[180,35,24]:state==='PAGADO'?GREEN:SEC],
  ];
  meta.forEach((m,i)=>{
    const x=M+i*((W-M*2)/4);
    pdf.setFont('helvetica','bold');pdf.setFontSize(5.6);pdf.setTextColor(...MUT);pdf.text(m[0],x,y);
    pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.setTextColor(...m[2]);pdf.text(m[1],x,y+5.5);
  });
  y+=11;pdf.setDrawColor(228,231,236);pdf.line(M,y,W-M,y);

  // ── CUERPO 65 / 35 ────────────────────────────────────────────────────────
  y+=8;const splitX=M+(W-M*2)*0.62;
  const field=(label:string,value:string, y0:number,maxW:number)=>{
    pdf.setFont('helvetica','bold');pdf.setFontSize(6);pdf.setTextColor(...MUT);pdf.text(label,M,y0);
    pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(...INK);
    const lines=pdf.splitTextToSize(value||'—',maxW);pdf.text(lines,M,y0+5);
    return y0+5+lines.length*4.4+4;
  };
  let ly=y;
  ly=field('RECIBÍ DE:',receipt.subscriber,ly,splitX-M-6);
  ly=field('LA SUMA DE:',receipt.totalWords||totalInWords(receipt.total),ly,splitX-M-6);
  ly=field('POR CONCEPTO DE:',receipt.concept||'Pago del servicio de agua potable.',ly,splitX-M-6);

  // panel monto (derecha)
  const pX=splitX+4,pW=W-M-pX,pH=44;
  pdf.setFillColor(247,249,252);pdf.setDrawColor(228,231,236);pdf.roundedRect(pX,y-3,pW,pH,2,2,'FD');
  pdf.setFont('helvetica','bold');pdf.setFontSize(6);pdf.setTextColor(...MUT);pdf.text('MONTO PAGADO',pX+4,y+3);
  pdf.setFont('helvetica','bold');pdf.setFontSize(17);pdf.setTextColor(...NAVY);pdf.text(amount(receipt.total),pX+4,y+13);
  const pr=(label:string,value:string,yy:number)=>{
    pdf.setFont('helvetica','bold');pdf.setFontSize(5.4);pdf.setTextColor(...MUT);pdf.text(label,pX+4,yy);
    pdf.setFont('helvetica','normal');pdf.setFontSize(7.4);pdf.setTextColor(...INK);pdf.text(value||'—',pX+4,yy+4);
  };
  pr('FORMA DE PAGO',methodLabel(receipt.method),y+20);
  pr('REFERENCIA',receipt.reference||'—',y+28);
  pr('RECIBIDO POR',`${receipt.cashier||'—'}${receipt.cashBox?`  ·  Caja ${receipt.cashBox}`:''}`,y+36);

  y=Math.max(ly,y+pH)+2;

  // ── FILA ABONADO / PEGUE / SECTOR ─────────────────────────────────────────
  pdf.setDrawColor(228,231,236);pdf.setFillColor(250,251,253);pdf.roundedRect(M,y,W-M*2,10,1.5,1.5,'FD');
  const svc:[string,string][]=[
    ['Abonado',receipt.subscriberCode||'—'],
    ['Pegue',(receipt.connectionCodes??[]).join(' · ')||'—'],
    ['Sector',receipt.sector||'—'],
  ];
  svc.forEach((s,i)=>{
    const x=M+4+i*((W-M*2-8)/3);
    pdf.setFont('helvetica','bold');pdf.setFontSize(6.4);pdf.setTextColor(...SEC);pdf.text(`${s[0]}: `,x,y+6.4);
    const lw=pdf.getTextWidth(`${s[0]}: `);
    pdf.setFont('helvetica','normal');pdf.setTextColor(...INK);pdf.text(s[1],x+lw,y+6.4);
  });
  y+=16;

  // ── SITUACIÓN DE LA CUENTA ───────────────────────────────────────────────
  pdf.setFillColor(...NAVY);pdf.rect(M,y,W-M*2,8,'F');
  pdf.setFont('helvetica','bold');pdf.setFontSize(7.5);pdf.setTextColor(255,255,255);pdf.text('SITUACIÓN DE LA CUENTA',M+4,y+5.4);
  pdf.text('VALOR (L)',W-M-4,y+5.4,{align:'right'});
  y+=8;
  const rows:[string,number,[number,number,number],boolean][]=[];
  if(prev!=null)rows.push(['Saldo anterior',prev,INK,false]);
  if(discount>0)rows.push(['Beneficio adulto mayor',-discount,GREEN,false]);
  if(late>0)rows.push(['Mora',late,[180,71,8],false]);
  rows.push(['Pago aplicado',-applied,GREEN,false]);
  if(next!=null)rows.push(['SALDO ACTUAL',next,NAVY,true]);
  rows.forEach(([label,value,color,strong])=>{
    if(strong){pdf.setFillColor(238,244,250);pdf.rect(M,y,W-M*2,8,'F');}
    pdf.setDrawColor(233,236,240);pdf.line(M,y+8,W-M,y+8);
    pdf.setFont('helvetica',strong?'bold':'normal');pdf.setFontSize(strong?8.5:7.6);pdf.setTextColor(...(strong?NAVY:SEC));
    pdf.text(label,M+4,y+5.4);
    pdf.setFont('helvetica','bold');pdf.setTextColor(...color);
    pdf.text(`${value<0?'-':''}${amount(Math.abs(value))}`,W-M-4,y+5.4,{align:'right'});
    if(strong){pdf.setDrawColor(...TEAL);pdf.setLineWidth(.9);pdf.line(M,y,W-M,y);pdf.setLineWidth(.2);}
    y+=8;
  });
  y+=6;

  // ── FOOTER AUTENTICIDAD ──────────────────────────────────────────────────
  pdf.setDrawColor(228,231,236);pdf.line(M,y,W-M,y);y+=6;
  const col=(W-M*2)/3;
  if(qr)pdf.addImage(qr,'PNG',M,y,22,22,undefined,'FAST');
  pdf.setFont('helvetica','bold');pdf.setFontSize(6);pdf.setTextColor(...NAVY);pdf.text('VERIFIQUE SU RECIBO',M+25,y+4);
  pdf.setFont('helvetica','normal');pdf.setFontSize(5.4);pdf.setTextColor(...SEC);
  pdf.text(pdf.splitTextToSize('Escanee el código QR para verificar número, fecha, monto y estado de este comprobante.',col-25),M+25,y+8);
  if(receipt.verificationCode){pdf.setFont('helvetica','bold');pdf.setFontSize(5.8);pdf.setTextColor(...INK);pdf.text(receipt.verificationCode,M+25,y+20);}

  const sigX=M+col;
  pdf.setFont('helvetica','bold');pdf.setFontSize(6);pdf.setTextColor(...NAVY);pdf.text('FIRMA AUTORIZADA',sigX+col/2,y+2,{align:'center'});
  if(brand.signatureDataUrl)addImageSafe(pdf,brand.signatureDataUrl,sigX+col/2-16,y+4,32,14);
  pdf.setDrawColor(...MUT);pdf.line(sigX+8,y+18,sigX+col-8,y+18);
  if(brand.signatoryName){pdf.setFont('helvetica','bold');pdf.setFontSize(5.6);pdf.setTextColor(...INK);pdf.text(brand.signatoryName,sigX+col/2,y+21.5,{align:'center'});
    if(brand.signatoryTitle){pdf.setFont('helvetica','normal');pdf.setTextColor(...SEC);pdf.text(brand.signatoryTitle,sigX+col/2,y+24.5,{align:'center'});}}

  const stX=M+col*2+col/2;
  if(!addImageSafe(pdf,brand.stampDataUrl,stX-11,y+1,22,22))drawStampPlaceholder(pdf,stX,y+11,11);

  // ── FOOTER NAVY ──────────────────────────────────────────────────────────
  const fY=H-16;
  pdf.setFillColor(...NAVY);pdf.rect(0,fY,W,16,'F');
  drawLogoPlaceholder(pdf,M,fY+3,10,10);
  pdf.setFont('helvetica','bold');pdf.setFontSize(6.6);pdf.setTextColor(255,255,255);pdf.text(inst,M+14,fY+7);
  pdf.setFont('helvetica','normal');pdf.setFontSize(5.8);pdf.setTextColor(200,214,228);pdf.text(`${place}.`,M+14,fY+11.5);
  pdf.setFont('helvetica','bold');pdf.setFontSize(5.6);pdf.setTextColor(200,214,228);
  pdf.text(`${documentLabel(receipt)} · ${receipt.number}`,W-M,fY+9,{align:'right'});

  // ── MARCA DE ESTADO NO-PAGADO ───────────────────────────────────────────
  if(voided||reversed){
    pdf.setTextColor(190,60,50);pdf.setFont('helvetica','bold');pdf.setFontSize(46);
    pdf.text(voided?'ANULADO':'REVERSADO',W/2,H/2,{align:'center',angle:28});
  }else if(receipt.copy){
    pdf.setTextColor(210,216,224);pdf.setFont('helvetica','bold');pdf.setFontSize(30);
    pdf.text('REIMPRESIÓN',W/2,H/2,{align:'center',angle:28});
  }else if(receipt.sample){
    pdf.setTextColor(214,220,228);pdf.setFont('helvetica','bold');pdf.setFontSize(28);
    pdf.text('VISTA PREVIA',W/2,H/2,{align:'center',angle:28});
  }

  pdf.setProperties({title:`Recibo ${receipt.number}`,subject:'Recibo oficial de pago',author:inst,keywords:'recibo,pago,agua,junta,El Achiotal'});
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
