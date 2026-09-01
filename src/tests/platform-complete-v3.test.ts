import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {hasRoute} from '../app/router/routeManifest';

const root=process.cwd();
const read=(file:string)=>fs.readFileSync(path.join(root,file),'utf8');

describe('plataforma completa V3',()=>{
  it('conecta portal, documentos financieros y rutas protegidas',()=>{
    const router=read('src/app/router/AppRouter.tsx');
    expect(router).toContain('path="/portal"');
    expect(router).toContain('path="/mi-cuenta"');
    expect(router).toContain('PortalRoute');
    expect(hasRoute('documentos-financieros')).toBe(true);
  });

  it('implementa acceso del abonado con DNI y contraseña, no con DNI solo',()=>{
    const page=read('src/pages/PortalLogin.tsx');
    const edge=read('supabase/functions/subscriber-portal-login/index.ts');
    expect(page).toContain('DNI y contraseña');
    expect(page).toContain("type={show?'text':'password'}");
    expect(edge).toContain('signInWithPassword');
    expect(edge).toContain('failed_login_count');
    expect(edge).toContain('ACCOUNT_TEMPORARILY_LOCKED');
  });

  it('restringe los campos editables del portal',()=>{
    const migration=read('supabase/migrations/202607110026_annual_service_receipts_benefits_portal.sql');
    expect(migration).toContain("field_name text not null check(field_name in('whatsapp','email','address','photo_path'))");
    expect(migration).not.toContain("field_name in('full_name'");
    expect(migration).not.toContain("field_name in('document_number'");
  });

  it('mantiene la regla de adulto mayor de 60 años y 25 por ciento',()=>{
    const benefits=read('supabase/migrations/202607110026_annual_service_receipts_benefits_portal.sql');
    const posting=read('supabase/migrations/202607110028_financial_document_posting_reversal.sql');
    expect(benefits).toContain("'SENIOR_60'");
    expect(benefits).toContain('60,25,true,true,true');
    expect(posting).toContain('benefit_percentage:=25');
  });

  it('prioriza cuota anual y oculta medición en la navegación principal',()=>{
    const layout=read('src/components/Layout.tsx');
    const home=read('src/pages/Home.tsx');
    const roleView=read('src/features/dashboard/roleView.ts');
    expect(layout).not.toContain('Medición y consumo');
    expect(roleView).toContain('Generar cuota anual');
    // §39: el monto de la cuota NO se hardcodea en la UI — viene de tarifas versionadas.
    expect(home).not.toContain('L 400 por pegue');
    expect(roleView).not.toContain('L 400');
  });

  it('el recibo PDF no menciona canales de entrega; el envío por WhatsApp usa wa.me (§43, §87)',()=>{
    const payments=read('src/pages/Payments.tsx');
    const receipt=read('src/features/finance/documents.ts');
    expect(payments).toContain('wa.me/');           // entrega manual sin API
    expect(receipt).not.toContain('WhatsApp');      // el documento en sí no lo menciona
  });

  it('conecta fotografía y pestañas funcionales del expediente',()=>{
    const subscribers=read('src/pages/Subscribers.tsx');
    expect(subscribers).toContain('uploadSubscriberPhoto');
    expect(subscribers).toContain("setActiveTab('payments')");
    expect(subscribers).toContain("setActiveTab('documents')");
    expect(subscribers).toContain("setActiveTab('audit')");
  });

  it('documenta los únicos pasos externos de Supabase y Render',()=>{
    const guide=read('docs/PASO-A-PASO-SUPABASE-RENDER-V3.md');
    expect(guide).toContain('## A. Supabase');
    expect(guide).toContain('## B. Render');
    expect(guide).toContain('subscriber-portal-login --no-verify-jwt');
    expect(guide).toContain('No utilice dinero real');
  });
});
