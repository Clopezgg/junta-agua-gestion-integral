import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe,expect,it} from 'vitest';
const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');

describe('consolidación multifuente 2.1',()=>{
  it('extiende enums antes de crear medición',()=>{
    const enums=read('supabase/migrations/202607110018_metering_enum_extensions.sql');
    const schema=[
      read('supabase/migrations/202607110019_metering_imports_schema.sql'),
      read('supabase/migrations/202607110020_import_functions.sql'),
      read('supabase/migrations/202607110021_tariff_functions.sql'),
      read('supabase/migrations/202607110022_metering_write_functions.sql'),
      read('supabase/migrations/202607110023_metering_posting_functions.sql')
    ].join('\n');
    expect(enums).toContain("tariff_category add value if not exists 'consumption'");
    expect(enums).toContain("obligation_source add value if not exists 'meter_reading'");
    expect(schema).toContain('create table public.meter_readings');
    expect(schema).toContain('create table public.data_import_batches');
    expect(schema).toContain('create or replace function public.post_meter_reading_batch');
    expect(schema).toContain('on conflict(organization_id,connection_id,tariff_definition_id,period_key) do nothing');
  });

  it('protege medición e importaciones con permisos, RLS y funciones auditadas',()=>{
    const schema=[
      read('supabase/migrations/202607110019_metering_imports_schema.sql'),
      read('supabase/migrations/202607110020_import_functions.sql'),
      read('supabase/migrations/202607110021_tariff_functions.sql'),
      read('supabase/migrations/202607110022_metering_write_functions.sql'),
      read('supabase/migrations/202607110023_metering_posting_functions.sql')
    ].join('\n');
    for(const permission of ['metering.read','metering.manage','imports.read','imports.manage'])expect(schema).toContain(`'${permission}'`);
    expect(schema).toContain('alter table public.meter_readings enable row level security');
    expect(schema).toContain('alter table public.data_import_batches enable row level security');
    expect(schema).toContain("coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2'");
    expect(schema).toContain('public.write_audit_event(');
    expect(schema).toContain("'metering.batch.post'");
  });

  it('implementa importación XLSX CSV TSV con hash, mapeo y fila auditada',()=>{
    const parser=read('src/features/imports/parser.ts');
    const page=read('src/pages/Imports.tsx');
    const service=read('src/features/imports/service.ts');
    expect(parser).toContain('read-excel-file/browser');
    expect(parser).toContain("extension==='csv'||extension==='tsv'");
    expect(parser).toContain("crypto.subtle.digest('SHA-256'");
    expect(page).toContain('Mapeo de columnas');
    expect(page).toContain('importSubscriberWithConnection');
    expect(page).toContain('MANUAL_DUPLICATE_REVIEW');
    expect(service).toContain('set_import_row_result');
  });

  it('implementa tarifa escalonada, anomalías y candidatos a corte',()=>{
    const schema=[
      read('supabase/migrations/202607110019_metering_imports_schema.sql'),
      read('supabase/migrations/202607110020_import_functions.sql'),
      read('supabase/migrations/202607110021_tariff_functions.sql'),
      read('supabase/migrations/202607110022_metering_write_functions.sql'),
      read('supabase/migrations/202607110023_metering_posting_functions.sql')
    ].join('\n');
    const page=read('src/pages/Metering.tsx');
    expect(schema).toContain('create table public.consumption_tariff_blocks');
    expect(schema).toContain('TARIFF_BLOCKS_NOT_CONTIGUOUS');
    expect(schema).toContain('UNUSUAL_HIGH_CONSUMPTION');
    expect(schema).toContain('METER_ROLLBACK');
    expect(schema).toContain('create or replace function public.list_cut_candidates');
    expect(page).toContain('La lista es informativa; no ejecuta cortes automáticos.');
  });

  it('añade historial de conectores, actualizaciones y diagnóstico real',()=>{
    const schema=read('supabase/migrations/202607110024_integrations_updates.sql')+read('supabase/migrations/202607110025_readiness_roles_dashboard.sql');
    const checker=read('supabase/functions/check-system-update/index.ts');
    const tester=read('supabase/functions/integration-test/index.ts');
    const progress=read('src/pages/Progress.tsx');
    expect(schema).toContain('create table public.integration_runs');
    expect(schema).toContain('create table public.system_update_state');
    expect(schema).toContain('create or replace function public.get_system_readiness');
    expect(checker).toContain('GITHUB_RELEASE_TOKEN');
    expect(checker).toContain('cacheHours');
    expect(tester).toContain("operation:'connection_test'");
    expect(progress).not.toContain('9 de 9 fases integradas');
    expect(progress).toContain('getSystemReadiness');
  });

  it('es PWA de shell sin cachear operaciones remotas',()=>{
    const manifest=read('public/manifest.webmanifest');
    const worker=read('public/sw.js');
    const main=read('src/main.tsx');
    expect(manifest).toContain('"display": "standalone"');
    expect(worker).toContain("request.method!=='GET'");
    expect(worker).toContain('url.origin!==self.location.origin');
    expect(main).toContain("navigator.serviceWorker.register('/sw.js')");
  });

  it('el respaldo vigente contiene los módulos multifuente y v2.2',()=>{
    const backup=read('supabase/functions/backup-manager/index.ts');
    for(const table of ['consumption_tariff_schemes','meter_reading_batches','meter_readings','data_import_batches','integration_runs','system_update_state','benefit_definitions','subscriber_benefits','document_template_versions','financial_documents'])expect(backup).toContain(`'${table}'`);
    expect(backup).toContain("format:'junta-agua-backup-v5'");
    expect(backup).toContain("'junta-agua-backup-v5'");
  });

  it('incluye ejemplos de entorno sin secretos reales',()=>{
    const frontend=read('.env.example');
    const backend=read('supabase/.env.example');
    expect(frontend).toContain('VITE_SUPABASE_URL=');
    expect(frontend).not.toMatch(/sk-proj|service_role/);
    expect(backend).toContain('GITHUB_RELEASE_TOKEN=');
    expect(backend).toContain('WHATSAPP_ACCESS_TOKEN=');
  });
});
