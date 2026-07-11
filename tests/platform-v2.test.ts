import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

describe('plataforma v2 institucional',()=>{
  it('incluye migración segura con presupuesto, activos, GIS y RLS',()=>{
    const sql=read('supabase/migrations/202607110014_platform_v2_premium_budget_assets_ux.sql');
    expect(sql).toContain('create table if not exists public.fiscal_periods');
    expect(sql).toContain('create table if not exists public.assets');
    expect(sql).toContain('create table if not exists public.maintenance_plans');
    expect(sql).toContain('alter table public.assets enable row level security');
    expect(sql).toContain("coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2'");
    expect(sql).toContain('create or replace function public.global_search');
    expect(sql).toContain('create or replace function public.get_role_dashboard');
  });

  it('evita doble conteo en presupuesto ejecutado',()=>{
    const sql=read('supabase/migrations/202607110016_budget_actual_matching_fix.sql');
    expect(sql).toContain('bc.match_pattern is not null');
    expect(sql).toContain("trim(bc.match_pattern)<>''");
    expect(sql).not.toContain('bc.match_pattern is null\n            or');
  });

  it('no adelanta planes preventivos cuando ya existe una orden abierta',()=>{
    const sql=read('supabase/migrations/202607110017_preventive_schedule_integrity.sql');
    const insertion=sql.indexOf('insert into public.work_orders');
    const advancement=sql.indexOf('update public.maintenance_plans');
    expect(insertion).toBeGreaterThan(-1);
    expect(advancement).toBeGreaterThan(insertion);
    expect(sql).toContain("w.status not in('completed','cancelled')");
    expect(sql).toContain("'skipped_open_orders'");
  });

  it('genera recibos media carta con estados e identidad institucional histórica',()=>{
    const documents=read('src/features/finance/documents.ts');
    const finance=read('src/features/finance/service.ts');
    const settings=read('src/features/settings/service.ts');
    expect(documents).toContain('format:[139.7,215.9]');
    expect(documents).toContain("receipt.copy?'REIMPRESIÓN':'IMPRESIÓN'");
    expect(documents).toContain("return'PAGADO'");
    expect(documents).toContain('signatureDataUrl');
    expect(documents).toContain('stampDataUrl');
    expect(finance).toContain('attach_payment_receipt_v2');
    expect(finance).toContain('p_brand_snapshot');
    expect(settings).toContain('crypto.randomUUID()');
    expect(settings).toContain('upsert:false');
  });

  it('incluye presupuesto, activos, mantenimiento y archivos históricos en respaldos',()=>{
    const backup=read('supabase/functions/backup-manager/index.ts');
    for(const table of ['fiscal_periods','budget_categories','budget_lines','assets','maintenance_plans','asset_maintenance_log'])expect(backup).toContain(`'${table}'`);
    expect(backup).toContain("format:'junta-agua-backup-v3'");
    expect(backup).toContain("'organization-assets'");
    expect(backup).toContain("'junta-agua-backup-v3'");
  });

  it('muestra versión y publica GitHub Releases desde main',()=>{
    const pkg=JSON.parse(read('package.json')) as {version:string};
    const vite=read('vite.config.ts');
    const release=read('.github/workflows/release.yml');
    expect(pkg.version).toBe('2.0.0');
    expect(vite).toContain('__APP_COMMIT_SHA__');
    expect(vite).toContain('RENDER_GIT_COMMIT');
    expect(release).toContain('branches: [main]');
    expect(release).toContain('workflow_dispatch:');
    expect(release).toContain('gh release view');
    expect(release).toContain('gh release create');
    expect(release).toContain('--target "${GITHUB_SHA}"');
  });

  it('integra módulos y navegación orientada a tareas',()=>{
    const app=read('src/App.tsx');
    const layout=read('src/components/Layout.tsx');
    const home=read('src/pages/Home.tsx');
    const operations=read('src/pages/Operations.tsx');
    expect(app).toContain('path="presupuesto"');
    expect(layout).toContain('<GlobalSearch/>');
    expect(layout).toContain('appVersion.version');
    expect(home).toContain('Centro de pendientes');
    expect(home).toContain('Acciones rápidas');
    expect(operations).not.toContain('window.prompt');
    expect(operations).toContain('Finalizar orden y registrar historial');
  });
});
