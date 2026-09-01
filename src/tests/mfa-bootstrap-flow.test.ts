import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const auth=fs.readFileSync('src/contexts/AuthContext.tsx','utf8');
const mfa=fs.readFileSync('src/pages/Mfa.tsx','utf8');
const setup=fs.readFileSync('src/pages/Setup.tsx','utf8');
const route=fs.readFileSync('src/components/ProtectedRoute.tsx','utf8');

describe('flujo MFA del primer administrador (pre-bootstrap)',()=>{
 it('A) sesión sin profile con TOTP verified en AAL1: expone desafío MFA, sin QR',()=>{
  // La determinación del factor ocurre ANTES de depender del profile.
  const mfaBlock=auth.indexOf('listFactors()');
  const profileCheck=auth.indexOf("get_my_authorization");
  expect(mfaBlock).toBeGreaterThan(-1);
  expect(mfaBlock).toBeLessThan(profileCheck);
  // hasVerifiedFactor = existe TOTP con status verified
  expect(auth).toMatch(/hasVerifiedFactor/);
  expect(auth).toContain("factor.status==='verified'");
  // mfaVerified = aal.currentLevel === 'aal2'
  expect(auth).toContain("aal?.currentLevel==='aal2'");
  // En /mfa, si existe factor (verified o pendiente) se muestra la verificación y NO el QR.
  expect(mfa).toContain('hasVerifiedFactor||a.hasTotpFactor');
  expect(mfa).toMatch(/Generar código QR/);
  expect(mfa).toContain('Verificación de seguridad');
  expect(mfa).toContain('Introduce el código de 6 dígitos de tu aplicación autenticadora');
 });

 it('B) sesión sin profile con TOTP verified en AAL2: redirige a /setup',()=>{
  // Mfa envía a /setup cuando hay MFA verificado pero no profile.
  expect(mfa).toContain("a.profile?'/':'/setup'");
  // Setup exige MFA verificado; sin profile muestra el bootstrap, con profile el asistente (§25).
  expect(setup).toContain("if(!auth.mfaVerified)return <Navigate to=\"/mfa\" replace/>;");
  expect(setup).toContain("if(!auth.profile)return <BootstrapStep/>;");
  // El asistente redirige a la raíz sólo cuando la configuración ya fue completada.
  expect(setup).toContain("if(completed)return <Navigate to=\"/\" replace/>;");
  expect(setup).toContain("settings.setup_completed_at");
  // El estado sin profile/subscriber NO se convierte en ACCOUNT_CONTEXT_NOT_FOUND pre-bootstrap.
  expect(auth).toContain("setAccountKind('pre_bootstrap')");
  expect(auth).toContain("if(authorization?.profile)");
 });

 it('C) staff existente con profile, TOTP verified en AAL2: dashboard',()=>{
  expect(mfa).toContain("a.profile?'/':'/setup'");
  expect(route).toContain("if(!a.profile)return <Navigate to=\"/setup\" replace/>;");
  expect(auth).toContain("setAccountKind('staff')");
  // Con profile presente, Mfa redirige a la raíz (dashboard).
  expect(mfa).toContain("a.profile?'/':");
  expect(route).toContain("if(permission&&!a.has(permission))");
 });

 it('D) usuario sin factor: muestra enrolamiento con QR',()=>{
  expect(mfa).toContain("hasFactor?'Verificación de seguridad':'Activar autenticador'");
  expect(mfa).toContain('Generar código QR');
  expect(mfa).toContain('onClick={begin}');
  // enrollMfa crea el factor cuando no existe ninguno y expone el secret.
  expect(auth).toContain("supabase.auth.mfa.enroll({factorType:'totp',friendlyName:'Junta de Agua'})");
  expect(auth).toContain('data.totp.qr_code');
  expect(mfa).toContain('mfa-secret');
 });

 it('E) factor TOTP unverified existente: NO se crea duplicado',()=>{
  // enrollMfa verifica que NO exista ya un factor antes de enrollar.
  expect(auth).toContain('listFactors()');
  expect(auth).toContain('if(current?.totp?.length)throw new Error');
  expect(auth).toContain('Ya existe un factor de autenticación registrado en esta cuenta');
  // verifyMfa usa el primer factor totp (verificado o pendiente) para finalizarlo,
  // sin necesidad de crear otro factor.
  expect(auth).toContain("const factor=factors?.totp?.[0]");
  expect(auth).not.toContain("!== 'verified')throw new Error('No existe un factor");
 });

 it('F) portal del abonado: no se rompe el flujo',()=>{
  // El abonado se resuelve antes del estado pre-bootstrap y fija MFA como verificado.
  expect(auth).toContain("setAccountKind('subscriber')");
  expect(auth).toContain("setMfaVerified(true)");
  expect(auth).toContain("setPortalSubscriber(subscriber)");
  // El portal se enruta sólo para abonados (fuera de MFA de personal).
  expect(auth).toContain("setAccountKind('subscriber')");
 });

 it('los errores de MFA se muestran como mensajes humanos, nunca crudos de Supabase',()=>{
  expect(auth).toContain('describeMfaError');
  expect(auth).toContain('Ya existe un factor de autenticación registrado en esta cuenta.');
  // No se expone el texto interno de "friendly name" al usuario.
  expect(mfa).not.toMatch(/A factor with the friendly name/);
  expect(mfa).not.toMatch(/friendlyName/i);
  expect(auth).not.toMatch(/throw new Error\(error\.message\).*mfa/i);
 });
});
