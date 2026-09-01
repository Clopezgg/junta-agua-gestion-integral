import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/202609010005_v5_service_requests_enhance.sql','utf8');
const service=fs.readFileSync('src/features/requests/service.ts','utf8');
const page=fs.readFileSync('src/pages/Solicitudes.tsx','utf8');

describe('Service Desk: Solicitudes y reclamos (migración 049)',()=>{
 it('la migración 049 amplía service_requests con asignación y RPC de trámite',()=>{
  expect(migration).toContain('alter table public.service_requests add column if not exists assigned_to');
  expect(migration).toContain('create or replace function public.assign_service_request');
  expect(migration).toContain('create or replace function public.set_service_request_status');
  expect(migration).toContain('create or replace function public.link_service_request_work_order');
 });
 it('las RPC mutables son security definer, org-scoped y auditan el flujo',()=>{
  expect(migration).toContain('security definer');
  expect(migration).toContain('has_permission');
  expect(migration).toContain('current_organization_id()');
  expect(migration).toContain('write_audit_event');
  expect(migration).toContain('INVALID_STATUS');
  for(const rpc of ['assign_service_request','set_service_request_status','link_service_request_work_order']){
   expect(migration).toContain(rpc);
  }
 });
 it('el servicio de solicitudes expone las nuevas RPC',()=>{
  for(const rpc of ["rpc('assign_service_request'","rpc('set_service_request_status'","rpc('link_service_request_work_order'","rpc('list_service_requests'","rpc('create_service_request'"]){
   expect(service).toContain(rpc);
  }
 });
 it('la página es un service desk: asignación, estado/SLA y vínculo a orden',()=>{
  expect(page).toContain('assignServiceRequest');
  expect(page).toContain('setServiceRequestStatus');
  expect(page).toContain('linkServiceRequestWorkOrder');
  expect(page).toContain('listWorkOrders');
  expect(page).toContain('listUsers');
  expect(page).toContain('due_date');
  expect(page).toContain('Atrasadas');
  expect(page).toContain('asignación');
 });
 it('el rango de migraciones del pipeline llega a la 050',()=>{
  const dbWorkflow=fs.readFileSync('.github/workflows/db-validate.yml','utf8');
  const readme=fs.readFileSync('README.md','utf8');
  expect(dbWorkflow).toContain('001..051');
  expect(readme).toContain('001` a `051');
 });
});
