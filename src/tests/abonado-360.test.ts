import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import {routePermission} from '../app/router/routeManifest';

const identity=fs.readFileSync('src/features/identity/service.ts','utf8');
const page=fs.readFileSync('src/pages/Abonado360.tsx','utf8');
const m346=fs.readFileSync('supabase/migrations/202609010002_v5_abonado_360.sql','utf8');
const m36=fs.readFileSync('supabase/migrations/202608310036_v5_identity_model.sql','utf8');

describe('Abonado 360 (identidad V5 conectada a la UI)',()=>{
 it('el backend expone la ficha, la creación y la búsqueda de abonados',()=>{
  expect(m36).toContain('get_abonado_360');
  expect(m36).toContain('register_service_contract');
  expect(m346).toContain('create_abonado');
  expect(m346).toContain('search_abonados');
 });
 it('las RPC mutables son security definer y auditan',()=>{
  expect(m346).toContain('security definer');
  expect(m346).toContain('write_audit_event');
  expect(m346).toContain('has_permission');
 });
 it('el servicio de identidad expone los RPC 360',()=>{
  expect(identity).toContain("rpc('get_abonado_360'");
  expect(identity).toContain("rpc('register_service_contract'");
  expect(identity).toContain("rpc('create_abonado'");
  expect(identity).toContain("rpc('search_abonados'");
 });
 it('la página consume la ficha 360 y permite registrar contrato',()=>{
  expect(page).toContain('getAbonado360');
  expect(page).toContain('searchAbonados');
  expect(page).toContain('registerServiceContract');
  expect(page).toContain('Abonado 360');
 });
 it('la ruta y la navegación están conectadas con permiso subscribers.read',()=>{
  expect(routePermission('abonado-360')).toBe('subscribers.read');
 });
});
