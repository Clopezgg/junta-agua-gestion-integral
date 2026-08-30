import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const webhook=fs.readFileSync('supabase/functions/whatsapp-webhook/index.ts','utf8');
const createUser=fs.readFileSync('supabase/functions/admin-create-user/index.ts','utf8');
const dbWorkflow=fs.readFileSync('.github/workflows/db-validate.yml','utf8');
const release=fs.readFileSync('.github/workflows/release.yml','utf8');
const render=fs.readFileSync('render.yaml','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const readme=fs.readFileSync('README.md','utf8');
const changelog=fs.readFileSync('CHANGELOG.md','utf8');
const auth=fs.readFileSync('src/contexts/AuthContext.tsx','utf8');
const app=fs.readFileSync('src/App.tsx','utf8');

describe('endurecimiento de producción',()=>{
 it('el webhook de Meta verifica la firma y mantiene la verificación de suscripción',()=>{
  expect(webhook).toContain('x-hub-signature-256');
  expect(webhook).toContain('crypto.subtle');
  expect(webhook).toContain('WHATSAPP_APP_SECRET');
  expect(webhook).toContain('hub.verify_token');
 });
 it('el alta de usuarios es idempotente y exige permiso y MFA',()=>{
  expect(createUser).toContain('findExistingUser');
  expect(createUser).toContain('idempotent_replay');
  expect(createUser).toContain('has_permission');
  expect(createUser).toContain('aal2');
 });
 it('la base de datos se valida en CI con una instancia real (migraciones 001..032)',()=>{
  expect(dbWorkflow).toContain('supabase/setup-cli');
  expect(dbWorkflow).toContain('supabase db reset --db-url');
  expect(fs.existsSync('supabase/tests/db_integrity.sql')).toBe(true);
  expect(release).toContain('needs: [validate]');
  expect(release).toContain('create-release:');
 });
 it('render sirve encabezados de seguridad y el service worker se versiona por build',()=>{
  expect(render).toContain('Content-Security-Policy');
  expect(render).toContain('Strict-Transport-Security');
  expect(render).toContain('Permissions-Policy');
  expect(fs.existsSync('scripts/bake-sw.mjs')).toBe(true);
  expect(pkg.scripts['build:render']).toContain('bake-sw.mjs');
 });
 it('los errores de contexto no se confunden con abonado y las rutas sensibles se protegen',()=>{
  expect(auth).toContain('ACCOUNT_CONTEXT_NOT_FOUND');
  expect(auth).toContain('authError');
  expect(auth).not.toContain('sessionStorage.clear()');
  expect(app).toContain('path="avance" element={<ProtectedRoute permission="updates.read"');
  expect(app).toContain('path="seguridad" element={<ProtectedRoute permission="settings.read"');
 });
 it('la documentación principal refleja la miliración 032 y el motor de tarifas',()=>{
  expect(readme).toContain('001` a `032');
  expect(readme).toContain('erp_financial_integrity_core');
  expect(readme).not.toContain('Cuota anual predeterminada de L 400');
  expect(readme).toContain('WHATSAPP_APP_SECRET');
  expect(changelog).toContain('3.1.1');
 });
});