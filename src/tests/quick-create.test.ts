import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {hasRoute} from '../app/router/routeManifest';

// El menú "Crear" (§29) no debe llevar a rutas inexistentes (cero dead-ends, §115).
const src=readFileSync('src/layouts/QuickCreate.tsx','utf8');
const targets=[...src.matchAll(/to:'(\/[a-z0-9-]+)'/g)].map(m=>m[1]);

describe('quick create',()=>{
  it('declara varias acciones',()=>{
    expect(targets.length).toBeGreaterThanOrEqual(8);
  });
  it('cada acción apunta a una ruta real de la app',()=>{
    const missing=targets.filter(t=>!hasRoute(t));
    expect(missing).toEqual([]);
  });
});
