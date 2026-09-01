import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {
  emptyNuevoServicio,nuevoServicioSteps,nuevoServicioTimeline,validateStep,
} from '../features/subscribers/nuevoServicio';
import {hasRoute,routePermission} from '../app/router/routeManifest';

describe('workflow Nuevo servicio (§36)',()=>{
  it('la ruta exige subscribers.create',()=>{
    expect(hasRoute('abonados/nuevo-servicio')).toBe(true);
    expect(routePermission('abonados/nuevo-servicio')).toBe('subscribers.create');
  });

  it('los pasos hablan lenguaje humano, no de tablas (§8)',()=>{
    expect(nuevoServicioSteps.map(s=>s.title)).toEqual(['Solicitante','Punto de servicio','Solicitud','Revisión']);
  });

  it('valida cada paso: solicitante, ubicación y descripción',()=>{
    expect(validateStep(emptyNuevoServicio,'solicitante')).toContain('Seleccione el abonado solicitante.');
    const nuevo={...emptyNuevoServicio,solicitante:{...emptyNuevoServicio.solicitante,mode:'nuevo' as const}};
    expect(validateStep(nuevo,'solicitante').length).toBeGreaterThanOrEqual(3);
    expect(validateStep(emptyNuevoServicio,'ubicacion')).toContain('La dirección del punto de servicio es obligatoria.');
    expect(validateStep(emptyNuevoServicio,'solicitud')).toContain('Describa la solicitud (mínimo 10 caracteres).');
  });

  it('un solicitante existente seleccionado pasa la validación',()=>{
    const d={...emptyNuevoServicio,solicitante:{...emptyNuevoServicio.solicitante,subscriber_id:'abc',subscriber_label:'María'}};
    expect(validateStep(d,'solicitante')).toEqual([]);
  });

  it('la bitácora del trámite enlaza a pantallas reales y cubre hasta la activación',()=>{
    expect(nuevoServicioTimeline.map(t=>t.label)).toEqual([
      'Solicitud registrada','Asignación e inspección','Aprobación','Contrato y cobro','Orden de instalación','Activación',
    ]);
    for(const t of nuevoServicioTimeline)expect(hasRoute(t.to)).toBe(true);
  });

  it('la página orquesta abonado + pegue + solicitud con detección de duplicados (§35)',()=>{
    const page=readFileSync('src/pages/NuevoServicio.tsx','utf8');
    expect(page).toContain('checkDuplicates');
    expect(page).toContain('createSubscriber');
    expect(page).toContain('createConnection');
    expect(page).toContain('createServiceRequest');
    expect(page).toContain('exact_document');
    // §32: sin inputs de UUID
    expect(page).not.toMatch(/placeholder="[^"]*UUID/i);
  });
});
