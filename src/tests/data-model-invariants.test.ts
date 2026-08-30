import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const m033=fs.readFileSync('supabase/migrations/202607110033_data_model_invariants.sql','utf8');
const subscribers=fs.readFileSync('src/pages/Subscribers.tsx','utf8');
const subscribersService=fs.readFileSync('src/features/subscribers/service.ts','utf8');
const dbIntegrity=fs.readFileSync('supabase/tests/db_integrity.sql','utf8');
const login=fs.readFileSync('src/pages/Login.tsx','utf8');

describe('invariantes del modelo de datos (migración 033)',()=>{
 it('prohíbe el borrado físico de registros publicados',()=>{
  expect(m033).toContain('forbid_delete_on_financial_records');
  expect(m033).toContain('DELETE_NOT_ALLOWED');
  expect(m033).toContain("'subscribers','subscriber_identities','water_connections','obligations'");
  expect(m033).toContain("'payments','payment_allocations','payment_components','payment_events'");
  expect(m033).toContain("'cash_movements','financial_documents','document_artifacts','expenses','audit_events'");
 });
 it('fija el formato del código de pegue y garantiza componentes económicos no negativos',()=>{
  expect(m033).toContain('water_connections_code_format');
  expect(m033).toMatch(/code ~ '\^\[0-9\]\{4,6\}-\[0-9\]\{1,6\}\$'/);
  expect(m033).toContain('obligations_nonnegative_components');
  expect(m033).toMatch(/coalesce\(base_amount,0\)>=0 and coalesce\(discount_amount,0\)>=0 and coalesce\(late_fee_amount,0\)>=0/);
  expect(m033).toContain('benefits_window_valid');
 });
 it('sella la caja cuando se cierra la sesión',()=>{
  expect(m033).toContain('cash_session_closed_guard');
  expect(m033).toContain('CASH_SESSION_CLOSED: las sesiones cerradas son inmutables');
  expect(m033).toContain('cash_movement_session_guard');
  expect(m033).toContain('closing_difference');
 });
 it('expone la corrección auditada de abonados y pegues con permiso y MFA',()=>{
  expect(m033).toContain('update_subscriber');
  expect(m033).toContain('update_water_connection');
  expect(m033).toContain('write_audit_event');
  expect(m033).toContain('MFA_REQUIRED');
  expect(m033).toContain('has_permission');
  expect(m033).toContain('CANCELLED_CONNECTION_LOCKED: usa el flujo de reconexión');
  expect(m033).toContain('REASON_REQUIRED: indique el motivo del cambio de estado');
  expect(m033).toContain('DUPLICATE_ACTIVE_METER');
 });
 it('implementa el enfriamiento por fuerza bruta previo a la autenticación',()=>{
  expect(m033).toContain('login_attempt_cooldowns');
  expect(m033).toContain('record_login_attempt');
  expect(m033).toContain('get_login_cooldown_seconds');
  expect(m033).toContain('interval \'15 minutes\'');
  expect(m033).toContain('interval \'5 minutes\'');
  expect(m033).toMatch(/failed_attempts>=10/);
  expect(m033).toMatch(/failed_attempts>=5/);
 });
 it('la interfaz de abonados usa las nuevas funciones RPC',()=>{
  expect(subscribersService).toContain("db.rpc('update_subscriber'");
  expect(subscribersService).toContain("db.rpc('update_water_connection'");
  expect(subscribers).toContain('saveSubscriptionData');
  expect(subscribers).toContain('manageConnection');
  expect(subscribers).toContain('Suspender o retirar pegue (requiere MFA)');
 });
 it('el inicio de sesión consulta el enfriamiento y registra los intentos fallidos',()=>{
  expect(login).toContain("'get_login_cooldown_seconds'");
  expect(login).toContain("'record_login_attempt'");
  expect(login).toContain('Demasiados intentos fallidos');
  expect(login).toContain('p_success:false');
  expect(login).toContain('p_success:true');
 });
 it('la validación de integridad en CI comprueba las garantías de la 033',()=>{
  expect(dbIntegrity).toContain("to_regprocedure('public.update_subscriber(uuid,jsonb)')");
  expect(dbIntegrity).toContain("to_regprocedure('public.record_login_attempt(text,boolean)')");
  expect(dbIntegrity).toContain("to_regprocedure('public.get_login_cooldown_seconds(text)')");
  expect(dbIntegrity).toContain('forbid_delete_payments');
  expect(dbIntegrity).toContain('cash_session_closed_guard');
  expect(dbIntegrity).toContain('water_connections_code_format');
  expect(dbIntegrity).toContain('login_attempt_cooldowns');
 });
});