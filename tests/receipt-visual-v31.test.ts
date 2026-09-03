import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {hasRoute} from '../src/app/router/routeManifest';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

describe('recibo visual institucional 3.1',()=>{
  it('incluye estudio visual independiente de Supabase',()=>{
    const page=read('src/pages/ReceiptVisualStudio.tsx');
    expect(page).toContain('VISTA PREVIA VISUAL');
    expect(page).toContain('Datos del abonado');
    expect(page).toContain('Datos del servicio');
    expect(page).toContain('Descuento de adulto mayor');
    expect(page).toContain('Escudo de Honduras');
    expect(page).toContain('Descargar PDF visual');
  });

  it('reconstruye el PDF con cuota anual, pegues, beneficio y QR',()=>{
    const documents=read('src/features/finance/documents.ts');
    // G.3 — recibo oficial §10-31: composición del Visual Contract
    expect(documents).toContain('maskedIdentity');
    expect(documents).toContain('connectionCodes');
    expect(documents).toContain('discountPercentage');
    expect(documents).toContain('RECIBÍ DE:');
    expect(documents).toContain('LA SUMA DE:');
    expect(documents).toContain('POR CONCEPTO DE:');
    expect(documents).toContain('SITUACIÓN DE LA CUENTA');
    expect(documents).toContain('VERIFIQUE SU RECIBO');
    expect(documents).toContain('drawLogoPlaceholder');
    expect(documents).toContain('drawStampPlaceholder');
  });

  it('expone la ruta y la navegación del estudio visual',()=>{
    expect(hasRoute('estudio-recibo')).toBe(true);
    expect(hasRoute('admin/estudio-recibo')).toBe(true);
  });

  it('mantiene el recibo sin WhatsApp ni sitio web',()=>{
    const page=read('src/pages/ReceiptVisualStudio.tsx');
    const documents=read('src/features/finance/documents.ts');
    expect(page).not.toContain('WhatsApp');
    expect(documents).not.toContain('WhatsApp');
    expect(page).not.toContain('Sitio web');
  });
});
