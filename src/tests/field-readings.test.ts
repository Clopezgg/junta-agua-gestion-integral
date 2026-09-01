import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/202609010007_v5_field_readings.sql','utf8');
const service=fs.readFileSync('src/features/metering/fieldService.ts','utf8');
const page=fs.readFileSync('src/pages/FieldReadings.tsx','utf8');
const app=fs.readFileSync('src/App.tsx','utf8');
const layout=fs.readFileSync('src/components/Layout.tsx','utf8');
const security=fs.readFileSync('src/lib/security.ts','utf8');

describe('Lecturas de campo (Field PWA, migración 051)',()=>{
 it('la migración 051 define la tabla field_readings con GPS, foto y cola offline',()=>{
  expect(migration).toContain('create table public.field_readings');
  expect(migration).toContain('connection_id uuid not null references water_connections(id)');
  expect(migration).toContain('current_reading numeric(12,3)');
  expect(migration).toContain('gps_lat double precision');
  expect(migration).toContain('photo_url text');
  expect(migration).toContain('offline_id text');
  expect(migration).toContain('enable row level security');
 });
 it('define permisos field.read/field.manage y RPCs security definer auditadas',()=>{
  expect(migration).toContain("'field.read'");
  expect(migration).toContain("'field.manage'");
  expect(migration).toContain('security definer');
  expect(migration).toContain('write_audit_event');
  for(const rpc of ['list_field_readings','get_field_reading','capture_field_reading','sync_field_readings','validate_field_reading','upload_field_photo']){
   expect(migration.toLowerCase()).toContain(rpc);
  }
 });
 it('el servicio de campo expone captura, sincronización, validación y cola offline',()=>{
  for(const fn of ["rpc('capture_field_reading'","rpc('sync_field_readings'","rpc('validate_field_reading'","rpc('list_field_readings'"]){
   expect(service).toContain(fn);
  }
  expect(service).toContain("OFFLINE_QUEUE_KEY");
  expect(service).toContain('generateOfflineId');
  expect(service).toContain('getGeoLocation');
 });
 it('la página captura con GPS/foto, mantiene cola offline y sincroniza',()=>{
  expect(page).toContain('field.manage');
  expect(page).toContain('getGeoLocation');
  expect(page).toContain('loadOfflineQueue');
  expect(page).toContain('syncFieldReadings');
  expect(page).toContain('validateFieldReading');
  expect(page).toContain('Lecturas de campo');
  expect(page).toContain('Cola offline');
 });
 it('la ruta y navegación usan el permiso field.read',()=>{
  expect(app).toContain('path="lecturas-campo"');
  expect(app).toContain('permission="field.read"');
  expect(layout).toContain("'/lecturas-campo'");
  expect(layout).toContain("'field.read'");
  expect(security).toContain("'field.read'|'field.manage'");
 });
 it('el rango de migraciones del pipeline llega a la 051',()=>{
  const dbWorkflow=fs.readFileSync('.github/workflows/db-validate.yml','utf8');
  expect(dbWorkflow).toContain('001..051');
 });
});
