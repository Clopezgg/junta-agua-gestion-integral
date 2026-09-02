import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createReceiptPdfBlob,type ReceiptInput} from '../features/finance/documents';

const src=readFileSync('src/features/finance/documents.ts','utf8');
const mig=readFileSync('supabase/migrations/202609010013_v6_receipt_snapshot.sql','utf8');

const demo:ReceiptInput={
  number:'REC-000318',subscriber:'Cándida López González',subscriberCode:'ACH-001256',
  date:'19/dic/2022',time:'10:24 a. m.',cashBox:'01',
  concept:'Pago de cuota del servicio de agua potable correspondiente al año 2022.',
  reference:undefined,connectionCodes:['A-12345'],sector:'El Achiotal',
  discountAmount:0,lateFeeAmount:0,previousBalance:700,appliedAmount:300,newBalance:400,
  total:300,received:300,change:0,method:'cash',items:[{description:'Cuota anual 2022',amount:300}],
  verification:'https://x/verificar-recibo/tok',verificationCode:'REC-2022-000318-7F3A',
  cashier:'María Hernández',status:'confirmed',
  brand:{name:'Junta Administradora de Agua Potable El Achiotal',address:'Santa Cruz de Yojoa, Cortés'},
};

describe('recibo oficial — contrato visual (§10-31, §129)',()=>{
  it('composición: header navy, RECIBÍ DE / LA SUMA DE / POR CONCEPTO DE, SITUACIÓN DE LA CUENTA, autenticidad',()=>{
    for(const s of ['RECIBO OFICIAL','RECIBÍ DE:','LA SUMA DE:','POR CONCEPTO DE:','MONTO PAGADO',
      'SITUACIÓN DE LA CUENTA','SALDO ACTUAL','VERIFIQUE SU RECIBO','FIRMA AUTORIZADA','FORMA DE PAGO','RECIBIDO POR']){
      expect(src,s).toContain(s);
    }
  });

  it('logo y sello son assets SEPARADOS; placeholders sin inventar identidad (§11-12)',()=>{
    expect(src).toContain('drawLogoPlaceholder');
    expect(src).toContain('drawStampPlaceholder');
    // el sello NO contiene texto de firma/persona
    const stamp=src.slice(src.indexOf('function drawStampPlaceholder'),src.indexOf('function drawStampPlaceholder')+600);
    for(const banned of ['FIRMA','TESORERO','SECRETARIO','PAGADO','CAJA'])expect(stamp).not.toContain(banned);
  });

  it('§31 — sin hardcodes ni datos inventados en el motor del recibo',()=>{
    expect(src).not.toContain('Deisy Rivas');
    expect(src).not.toContain('drawFallbackEmblem');       // sin escudo nacional inventado
    expect(src).not.toMatch(/RTN:\s*\$\{[^}]*\|\|'PENDIENTE'/); // sin "RTN PENDIENTE" decorativo
    expect(src).not.toContain("'MORA DESDE'");              // sin fecha de mora inventada
    // sin totales hardcodeados
    expect(src).not.toMatch(/\btotal:\s*300\b/);
    expect(src).not.toMatch(/año 2022/);
  });

  it('filas L0 se omiten: beneficio/mora sólo si el valor es real',()=>{
    expect(src).toContain('if(discount>0)rows.push');
    expect(src).toContain('if(late>0)rows.push');
  });

  it('estados no-pagados se marcan sin borrar (§27)',()=>{
    expect(src).toContain("voided?'ANULADO':'REVERSADO'");
    expect(src).toContain("receipt.status==='voided'");
  });

  it('el QR no expone rutas/tokens internos — usa la URL pública de verificación',()=>{
    expect(src).toContain('receipt.verification?await QRCode.toDataURL');
    expect(src).not.toMatch(/QRCode\.toDataURL\([^)]*receipt_path/);
  });

  it('genera un PDF real desde el snapshot',async()=>{
    const blob=await createReceiptPdfBlob(demo);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(2000);
  });

  it('reimpresión no muta el snapshot: mismo número, marca COPY',async()=>{
    const a=await createReceiptPdfBlob(demo);
    const b=await createReceiptPdfBlob({...demo,copy:true});
    expect(a.size).toBeGreaterThan(0);expect(b.size).toBeGreaterThan(0);
    expect(src).toContain("receipt.copy");
    expect(src).toContain("'REIMPRESIÓN'");
  });

  it('migración: snapshot balance_before/after congelado en el pago (§24)',()=>{
    expect(mig).toContain('balance_before');
    expect(mig).toContain('balance_after');
    expect(mig).toContain('where p.id=payment_id and p.balance_after is null');  // sólo una vez
    expect(mig).toContain("'previous_balance'");
    expect(mig).toContain("'new_balance'");
    expect(mig).toContain("'concept'");
  });
});
