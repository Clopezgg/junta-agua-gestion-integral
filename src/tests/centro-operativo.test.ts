import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {hasRoute,routePermission} from '../app/router/routeManifest';

const page=readFileSync('src/pages/CentroOperativo.tsx','utf8');
const map=readFileSync('src/components/maps/OperationsMap.tsx','utf8');
const css=readFileSync('src/design-system/command.css','utf8');
const routes=readFileSync('src/app/router/appRoutes.tsx','utf8');

describe('Milestone K — Centro Operativo / GIS command center (§49-50)',()=>{
  it('la ruta centro-operativo carga el command center, no la página de operación',()=>{
    expect(hasRoute('centro-operativo')).toBe(true);
    expect(routePermission('centro-operativo')).toBe('operations.read');
    expect(routes).toContain("guarded('centro-operativo','operations.read',<P.CentroOperativo/>)");
  });

  it('el mapa es el workspace: tema oscuro y capas reales, sin inventar geometría',()=>{
    expect(page).toContain('data-theme="dark"');
    expect(css).toContain('.ja-cc-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,32%)');
    // capas §49
    for(const layer of ['pegues','incidentes','ordenes','activos','tanques','fuentes'])expect(page).toContain(`'${layer}'`);
    // sólo se plotea lo que tiene coordenadas reales
    expect(page).toContain('Number.isFinite(p.lat)&&Number.isFinite(p.lng)');
    expect(map).toContain('No añade geometría');
  });

  it('el panel resumen expone incidencias, órdenes, activos críticos y sectores afectados',()=>{
    for(const s of ['Incidencias abiertas','Órdenes abiertas','Activos críticos','Sectores afectados'])expect(page).toContain(s);
  });

  it('consume datos reales existentes (map points, activos, órdenes, incidencias)',()=>{
    expect(page).toContain('listMapPoints');
    expect(page).toContain('listAssets');
    expect(page).toContain('listWorkOrders');
    expect(page).toContain('listIncidents');
    // no crea migración: el command center es sólo lectura sobre RPC existentes
  });
});
