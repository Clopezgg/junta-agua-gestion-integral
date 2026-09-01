import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

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
    expect(documents).toContain('maskedIdentity');
    expect(documents).toContain('connectionCodes');
    expect(documents).toContain('discountPercentage');
    expect(documents).toContain('MORA DESDE');
    expect(documents).toContain('TOTAL EN LETRAS');
    expect(documents).toContain('DOCUMENTO VERIFICABLE');
    expect(documents).toContain('drawFallbackLogo');
  });

  it('expone la ruta y la navegación del estudio visual',()=>{
    const app=read('src/App.tsx');
    const layout=read('src/components/Layout.tsx');
    expect(app).toContain('path="estudio-recibo"');
    expect(layout).toContain('Vista del recibo');
  });

  it('mantiene el recibo sin WhatsApp ni sitio web',()=>{
    const page=read('src/pages/ReceiptVisualStudio.tsx');
    const documents=read('src/features/finance/documents.ts');
    expect(page).not.toContain('WhatsApp');
    expect(documents).not.toContain('WhatsApp');
    expect(page).not.toContain('Sitio web');
  });
});
