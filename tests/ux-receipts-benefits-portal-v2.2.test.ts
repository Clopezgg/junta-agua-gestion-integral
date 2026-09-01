import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
import {hasRoute} from '../src/app/router/routeManifest';
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
    expect(sql).toContain('benefit_percentage:=25');
    expect(sql).toContain('base_total:=connection_count*p_unit_amount');
  });

  it('incluye cuota anual por pegue con vencimiento al 30 de noviembre',()=>{
    const sql=read('supabase/migrations/202607110026_annual_service_receipts_benefits_portal.sql');
    const tariffs=read('src/pages/Tariffs.tsx');
    expect(sql).toContain('make_date(p_year,11,30)');
    expect(sql).toContain('make_date(p_year,12,1)');
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

  it('crea ficha digital y portal con campos editables limitados',()=>{
    const base=read('supabase/migrations/202607110026_annual_service_receipts_benefits_portal.sql');
    const portal=read('supabase/migrations/202607110027_subscriber_card_secure_portal.sql');
    const page=read('src/pages/SubscriberCards.tsx');
    expect(base).toContain('create table if not exists public.portal_update_requests');
    expect(base).toContain('create or replace function public.get_subscriber_digital_card');
    expect(base).toContain("field_name in('whatsapp','email','address','photo_path')");
    expect(portal).toContain('create table if not exists public.subscriber_portal_accounts');
    expect(portal).toContain('create or replace function public.update_my_subscriber_profile');
    expect(portal).toContain('portal.profile.update');
    expect(page).toContain('Fichas digitales de abonados');
    expect(page).toContain('Fotografía actualizada');
  });

  it('mejora el login y navegación institucional',()=>{
    const login=read('src/pages/Login.tsx');
    const layout=read('src/components/Layout.tsx');
    const router=read('src/app/router/lazyPages.ts');
    expect(login).not.toContain('El Achiotal');
    expect(login).not.toContain('Plataforma institucional segura');
    expect(login).not.toContain('Continuar de forma segura');
    expect(login).toContain('Acceso administrativo');
    expect(login).toContain('Iniciar sesión');
    expect(login).toContain('Recuperar acceso');
    expect(login).toContain('Portal del abonado');
    expect(login).toContain('Acceso exclusivo para personal autorizado.');
    expect(login).toContain('getPublicInstitution');
    expect(login).toContain('get_login_cooldown_seconds');
    expect(layout).toContain('Administración');
    expect(layout).toContain('Fichas digitales');
    expect(layout).toContain('nav-collapsed');
    expect(hasRoute('configuracion-documental')).toBe(true);
    expect(hasRoute('fichas-abonados')).toBe(true);
    expect(router).toContain('RecuperarAcceso');
    expect(router).toContain('Restablecer');
  });
});
