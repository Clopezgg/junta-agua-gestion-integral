import {describe,expect,it} from 'vitest';import {readFileSync} from 'node:fs';import {join} from 'node:path';
const root=process.cwd();
const read=(file:string)=>readFileSync(join(root,file),'utf8');

describe('plataforma v2 institucional',()=>{
  it('incluye migración segura con presupuesto, activos, GIS y RLS',()=>{
    const migration=read('supabase/migrations/202607110013_platform_v2.sql');
    expect(migration).toContain('budget_versions');
    expect(migration).toContain('asset_registry');
    expect(migration).toContain('latitude');
    expect(migration).toContain('enable row level security');
  });

  it('evita doble conteo en presupuesto ejecutado',()=>{
    const migration=read('supabase/migrations/202607110013_platform_v2.sql');
    expect(migration).toContain('left join lateral');
    expect(migration).toContain('expense_allocations');
  });

  it('no adelanta planes preventivos cuando ya existe una orden abierta',()=>{
    const migration=read('supabase/migrations/202607110013_platform_v2.sql');
    expect(migration).toContain("not exists(select 1 from public.work_orders");
    expect(migration).toContain("wo.status in('draft','planned','approved','in_progress')");
  });

  it('genera recibos media carta con estados e identidad institucional histórica',()=>{
    const documents=read('src/features/finance/documents.ts');
    expect(documents).toContain('half-letter');
    expect(documents).toContain('receipt_brand_snapshot');
    expect(documents).toContain('PAGADO');
  });

  it('incluye presupuesto, activos, mantenimiento y documentos en respaldo v5',()=>{
    const backup=read('src/features/backups/service.ts');
    expect(backup).toContain("format:'junta-agua-backup-v5'");
    expect(backup).toContain("'organization-assets'");
    expect(backup).toContain("'junta-agua-backup-v5'");
  });

  it('muestra versión y publica GitHub Releases desde main',()=>{
    const pkg=JSON.parse(read('package.json')) as {version:string};
    const vite=read('vite.config.ts');
    const release=read('.github/workflows/release.yml');
    expect(pkg.version).toBe('3.0.0');
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
    expect(app).toContain('presupuesto');
    expect(app).toContain('operaciones');
    expect(layout).toContain('Presupuesto');
    expect(layout).toContain('Activos y órdenes');
  });
});
