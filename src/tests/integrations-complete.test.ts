import {describe,expect,it} from 'vitest';import {readFileSync} from 'node:fs';import {join} from 'node:path';
const root=process.cwd();
const migration=readFileSync(join(root,'supabase/migrations/202607110011_integrations_complete.sql'),'utf8');
const app=readFileSync(join(root,'src/App.tsx'),'utf8');
const subscribers=readFileSync(join(root,'src/pages/Subscribers.tsx'),'utf8');
const integrations=readFileSync(join(root,'src/pages/Integrations.tsx'),'utf8');
const payments=readFileSync(join(root,'src/pages/Payments.tsx'),'utf8');
describe('integraciones completas',()=>{
 it('crea comunicación, OCR, respaldos y verificación pública',()=>{expect(migration).toContain('communication_messages');expect(migration).toContain('ocr_extractions');expect(migration).toContain('backup_runs');expect(migration).toContain('verify_receipt_public');});
 it('protege recibos y respaldos en buckets privados',()=>{expect(migration).toContain("'receipt-documents'");expect(migration).toContain("'system-backups'");expect(migration).toMatch(/values\('(?:system-backups|receipt-documents)'[^;]+false/s);});
 it('incluye mapa y verificación pública en rutas',()=>{expect(app).toContain('verificar-recibo/:token');expect(app).toContain('path="mapa"');expect(app).toContain('path="respaldos"');});
 it('conecta OCR antes del alta y mapa en pegues',()=>{expect(subscribers).toContain('uploadTemporaryIdentityDocument');expect(subscribers).toContain('runOcr');expect(subscribers).toContain('GoogleMapPicker');});
 it('elimina prompts de secretos y prueba conectores',()=>{expect(integrations).not.toContain('prompt(');expect(integrations).toContain('testIntegration');expect(integrations).toContain('Supabase Secrets');});
 it('guarda PDF privado y permite correo y WhatsApp',()=>{expect(payments).toContain('uploadPaymentReceipt');expect(payments).toContain('sendEmail');expect(payments).toContain('sendWhatsApp');});
});
