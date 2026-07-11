import { describe,expect,it } from 'vitest';import { readFileSync } from 'node:fs';import { resolve } from 'node:path';
const sql=readFileSync(resolve(process.cwd(),'supabase/migrations/202607110003_phase3_tariffs_obligations.sql'),'utf8');
describe('fase 3 - migración',()=>{
 it('versiona tarifas sin sobrescribir historia',()=>{expect(sql).toContain('create table public.tariff_versions');expect(sql).toContain('create_tariff_version');});
 it('evita anualidades duplicadas',()=>expect(sql).toContain('unique(organization_id,connection_id,tariff_definition_id,period_key)'));
 it('calcula morosidad y bloqueos en servidor',()=>{expect(sql).toContain('obligation_computed_state');expect(sql).toContain('check_debt_operation');});
 it('protege tablas con RLS y revoca escrituras directas',()=>{expect(sql).toContain('alter table obligations enable row level security');expect(sql).toContain('revoke insert,update,delete');});
});
