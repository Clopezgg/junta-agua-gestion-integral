import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import {hasRoute,routePermission} from '../app/router/routeManifest';

const identity=fs.readFileSync('src/features/identity/service.ts','utf8');
const page=fs.readFileSync('src/pages/Abonado360.tsx','utf8');
const svc=fs.readFileSync('src/features/subscribers/service.ts','utf8');
const expediente=fs.readFileSync('supabase/migrations/202609010011_v6_abonado_expediente.sql','utf8');
const m346=fs.readFileSync('supabase/migrations/202609010002_v5_abonado_360.sql','utf8');
const m36=fs.readFileSync('supabase/migrations/202608310036_v5_identity_model.sql','utf8');

describe('Abonado 360 — expediente único (§34)',()=>{
 it('el modelo de identidad V5 (persona→abonado→contrato) sigue disponible',()=>{
  expect(m36).toContain('create table public.persons');
  expect(m36).toContain('create table public.abonados');
  expect(m346).toContain('create_abonado');
  // el servicio de identidad se conserva para el alta persona/abonado
  expect(identity).toContain("rpc('create_person'");
 });

 it('un único RPC arma las 8 pestañas del expediente, keyed por subscriber',()=>{
  expect(expediente).toContain('function public.get_subscriber_expediente(p_subscriber_id uuid)');
  for(const key of ['subscriber','identities','connections','account','obligations','payments','benefits','requests','work_orders','audit','person_link']){
    expect(expediente,`falta ${key}`).toContain(`'${key}'`);
  }
  // respeta permisos por sección
  expect(expediente).toContain("has_permission('payments.read')");
  expect(expediente).toContain("has_permission('operations.read')");
  expect(expediente).toContain("has_permission('audit.read')");
 });

 it('la ficha 360 consume el expediente y muestra las 8 pestañas y la barra de acciones',()=>{
  expect(svc).toContain('getSubscriberExpediente');
  expect(page).toContain('getSubscriberExpediente');
  for(const label of ['Resumen','Servicio','Cuenta','Pagos','Solicitudes','Trabajo','Documentos','Historial']){
    expect(page).toContain(label);
  }
  for(const action of ['Cobrar','Nuevo servicio','Solicitud','Estado de cuenta','Comunicar']){
    expect(page).toContain(action);
  }
  // §32: cero UUID/ID técnico en formularios — la 360 ya no tiene inputs de id
  expect(page).not.toMatch(/value=\{[^}]*\.\w+_id\b[^}]*\}\s*[^>]*onChange/);
 });

 it('la ruta /abonados/:id monta la ficha con permiso subscribers.read',()=>{
  expect(hasRoute('abonados/:id')).toBe(true);
  expect(routePermission('abonados/:id')).toBe('subscribers.read');
 });
});
