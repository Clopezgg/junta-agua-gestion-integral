import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const m040=fs.readFileSync('supabase/migrations/202608310040_v5_bank_reconciliation.sql','utf8');
const m048=fs.readFileSync('supabase/migrations/202609010004_v5_bank_reconciliation_enhance.sql','utf8');
const service=fs.readFileSync('src/features/treasury/service.ts','utf8');
const page=fs.readFileSync('src/pages/Bancos.tsx','utf8');

describe('Bancos y conciliación (dominio E)',()=>{
 it('el backend base (040) define cuentas, estados y movimientos',()=>{
  expect(m040).toContain('create table public.bank_statements');
  expect(m040).toContain('create table public.bank_transactions');
  expect(m040).toContain("recon_status recon_status not null default 'pendiente'");
  for(const rpc of ['import_bank_statement','link_bank_transaction','list_bank_transactions']){
   expect(m040).toContain(rpc);
  }
  expect(m040).toContain('enable row level security');
 });
 it('la migración 048 añade la gestión de conciliación (discard/unlink/saldo)',()=>{
  expect(m048).toContain('security definer');
  expect(m048).toContain("has_permission('bank.manage')");
  for(const fn of ['discard_bank_transaction','unlink_bank_transaction','get_bank_account_balance']){
   expect(m048).toContain(fn);
  }
  expect(m048).toContain('write_audit_event');
 });
 it('el servicio de tesorería expone las RPC de conciliación',()=>{
  for(const rpc of ["rpc('discard_bank_transaction'","rpc('unlink_bank_transaction'","rpc('get_bank_account_balance'","rpc('list_payments'","rpc('list_expenses'","rpc('link_bank_transaction'"]){
   expect(service).toContain(rpc);
  }
 });
 it('la página implementa import, cola y conciliación (no prompt-gate)',()=>{
  expect(page).toContain('importBankStatement');
  expect(page).toContain('linkBankTransaction');
  expect(page).toContain('discardBankTransaction');
  expect(page).toContain('unlinkBankTransaction');
  expect(page).toContain('getBankAccountBalance');
  expect(page).not.toContain('prompt(');
 });
 it('la página garantiza UI de conciliación con candidatos reales',()=>{
  expect(page).toContain('listPayments');
  expect(page).toContain('listExpenses');
  expect(page).toContain('Conciliar');
  expect(page).toContain('Desvincular');
  expect(page).toContain('Descartar');
 });
});
