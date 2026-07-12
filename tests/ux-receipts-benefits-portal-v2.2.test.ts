import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

describe('versión 2.2 experiencia institucional',()=>{
  it('protege al superadministrador en servidor e interfaz',()=>{
    const sql=read('supabase/migrations/202607110026_annual_service_receipts_benefits_portal.sql');
    const users=read('src/pages/Users.tsx');
    expect(sql).toContain('SUPERADMIN_MUST_REMAIN_ACTIVE');
    expect(sql).toContain("r.code='superadmin'");
    expect(users).toContain('Siempre activo');
    expect(users).toContain('protected-admin');
  });

  it('configura descuento de adulto mayor desde los 60 años al 25 por ciento',()=>{
    const sql=read('supabase/migrations/202607110026_annual_service_receipts_benefits_portal.sql');
    expect(sql).toContain("'SENIOR_60'");
    expect(sql).toContain("60,25,true,true,true,'dni'");
    expect(sql).toContain("benefit_percentage:=25");
    expect(sql).toContain("base_total:=connection_count*p_unit_amount");
  });

  it('incluye cuota anual por pegue con vencimiento al 30 de noviembre',()=>{
    const sql=read('supabase/migrations/202607110026_annual_service_receipts_benefits_portal.sql');
    const tariffs=read('src/pages/Tariffs.tsx');
    expect(sql).toContain("make_date(p_year,11,30)");
    expect(sql).toContain("make_date(p_year,12,1)");
    expect(sql).toContain("'ANUAL','Cuota anual del servicio comunitario de agua potable'");
    expect(tariffs).toContain('Genera obligación anual por pegue');
    expect(tariffs).toContain('Código automático');
  });

  it('crea configuración documental versionada y catálogo ampliable',()=>{
    const sql=read('supabase/migrations/202607110026_annual_service_receipts_benefits_portal.sql');
    const page=read('src/pages/DocumentSettings.tsx');
    expect(sql).toContain('create table if not exists public.document_template_versions');
    expect(sql).toContain('create table if not exists public.service_catalog');
    expect(sql).toContain('create or replace function public.activate_document_template');
    expect(page).toContain('Configuración documental');
    expect(page).toContain('Cambio de tubería');
    expect(page).toContain('Descuento adulto mayor');
  });

  it('prepara ficha digital protegida del abonado',()=>{
    const sql=read('supabase/migrations/202607110026_annual_service_receipts_benefits_portal.sql');
    expect(sql).toContain('create table if not exists public.portal_update_requests');
    expect(sql).toContain('create or replace function public.get_subscriber_digital_card');
    expect(sql).toContain("'identity_masked'");
    expect(sql).toContain("field_name in('whatsapp','email','address','photo_path')");
  });

  it('mejora el login y navegación institucional',()=>{
    const login=read('src/pages/Login.tsx');
    const layout=read('src/components/Layout.tsx');
    const app=read('src/App.tsx');
    expect(login).toContain('Junta Patronal de Agua Potable El Achiotal');
    expect(login).toContain('MFA obligatorio');
    expect(layout).toContain('Documentos y recibos');
    expect(app).toContain('configuracion-documental');
  });
});
