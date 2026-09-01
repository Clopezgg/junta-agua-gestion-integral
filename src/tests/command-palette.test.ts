import {describe,expect,it} from 'vitest';
import {filterCommands,navCommands,visibleCommands} from '../app/commands/navCommands';
import {hasRoute} from '../app/router/routeManifest';
import type {Permission} from '../lib/security';

describe('command palette — navegación (§28)',()=>{
  it('cada destino apunta a una ruta real de la app',()=>{
    const missing=navCommands.filter(c=>!hasRoute(c.to)).map(c=>c.to);
    expect(missing).toEqual([]);
  });

  it('recorta los destinos a los permisos del usuario',()=>{
    const soloAbonados=(p:Permission)=>p==='subscribers.read';
    const visibles=visibleCommands(soloAbonados).map(c=>c.id);
    expect(visibles).toContain('inicio');          // sin permiso → siempre visible
    expect(visibles).toContain('abonados');
    expect(visibles).not.toContain('cobrar');
    expect(visibles).not.toContain('bancos');
    expect(visibles).not.toContain('usuarios');
  });

  it('un rol sin permisos sólo ve Inicio',()=>{
    expect(visibleCommands(()=>false).map(c=>c.id)).toEqual(['inicio']);
  });

  it('filtra por etiqueta, grupo y palabras clave, ignorando acentos',()=>{
    const all=navCommands.slice();
    expect(filterCommands(all,'cobr').map(c=>c.id)).toContain('cobrar');
    expect(filterCommands(all,'operacion').map(c=>c.id)).toContain('operaciones');
    expect(filterCommands(all,'operación').map(c=>c.id)).toContain('operaciones');
    expect(filterCommands(all,'kardex').map(c=>c.id)).toContain('bodega');
    expect(filterCommands(all,'zzz-no-existe')).toEqual([]);
  });

  it('prioriza coincidencias por prefijo de etiqueta',()=>{
    const res=filterCommands(navCommands.slice(),'ca');
    expect(res[0]?.id==='caja'||res[0]?.id==='calidad').toBe(true);
  });
});
