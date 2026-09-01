import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import {routePermission} from '../app/router/routeManifest';

const migration=fs.readFileSync('supabase/migrations/202609010003_v5_incidents.sql','utf8');
const service=fs.readFileSync('src/features/operations/service.ts','utf8');
const page=fs.readFileSync('src/pages/Incidents.tsx','utf8');
const security=fs.readFileSync('src/lib/security.ts','utf8');

describe('Incidencias (semántica de incidencia en Operación)',()=>{
 it('la migración 047 define la tabla incidents con RLS y permisos',()=>{
  expect(migration).toContain('create table public.incidents');
  expect(migration).toContain('incident_number');
  expect(migration).toContain('work_order_id uuid references work_orders(id)');
  expect(migration).toContain('enable row level security');
  expect(migration).toContain("'incidents.read'");
  expect(migration).toContain("'incidents.manage'");
 });
 it('las RPC mutables son security definer y auditan el flujo',()=>{
  expect(migration).toContain('security definer');
  expect(migration).toContain('write_audit_event');
  expect(migration).toContain('has_permission');
  for(const rpc of ['list_incidents','get_incident','create_incident','update_incident']){
   expect(migration.toLowerCase()).toContain(rpc);
  }
 });
 it('el servicio de operaciones expone las RPC de incidencias',()=>{
  for(const rpc of ["rpc('list_incidents'","rpc('get_incident'","rpc('create_incident'","rpc('update_incident'"]){
   expect(service).toContain(rpc);
  }
 });
 it('la página registra y tramita incidencias y vincula órdenes',()=>{
  expect(page).toContain('listIncidents');
  expect(page).toContain('createIncident');
  expect(page).toContain('updateIncident');
  expect(page).toContain('createWorkOrder');
  expect(page).toContain('Incidencia y reportes');
 });
 it('la ruta y navegación usan el permiso incidents.read',()=>{
  expect(routePermission('incidencias')).toBe('incidents.read');
  expect(security).toContain("'incidents.read'|'incidents.manage'");
 });
});
