import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/202609010006_v5_payment_arrangements_enhance.sql','utf8');
const service=fs.readFileSync('src/features/arrears/service.ts','utf8');
const page=fs.readFileSync('src/pages/Morosidad.tsx','utf8');

describe('Morosidad y convenios (migración 050)',()=>{
 it('la migración 050 define la RPC de registro de cuota del plan',()=>{
  expect(migration).toContain('create or replace function public.mark_arrangement_installment_paid');
  expect(migration).toContain('p_arrangement_id uuid');
  expect(migration).toContain('p_installment_no int');
 });
 it('la RPC es security definer, exige MFA y audita el avance a cumplido',()=>{
  expect(migration).toContain('security definer');
  expect(migration).toContain('has_permission');
  expect(migration).toContain('current_organization_id()');
  expect(migration).toContain("auth.jwt()->>'aal'");
  expect(migration).toContain("'MFA_REQUIRED'");
  expect(migration).toContain('write_audit_event');
  expect(migration).toContain('ARRANGEMENT_CLOSED');
  expect(migration).toContain('ALREADY_PAID');
  expect(migration).toContain("'cumplido'");
 });
 it('el servicio de morosidad expone la nueva RPC',()=>{
  expect(service).toContain("rpc('mark_arrangement_installment_paid'");
 });
 it('la página registra cuotas, crea convenios con candidatos reales y muestra avance',()=>{
  expect(page).toContain('markArrangementInstallmentPaid');
  expect(page).toContain('createPaymentArrangement');
  expect(page).toContain('getArrangementDetail');
  expect(page).toContain('listCutCandidates');
  expect(page).toContain('overdue_amount');
  expect(page).toContain('Cumplido');
  expect(page).toContain('Convenios activos');
 });
 it('el rango de migraciones del pipeline llega a la 050',()=>{
  const dbWorkflow=fs.readFileSync('.github/workflows/db-validate.yml','utf8');
  const readme=fs.readFileSync('README.md','utf8');
  expect(dbWorkflow).toContain('001..050');
  expect(readme).toContain('001` a `050');
 });
});
