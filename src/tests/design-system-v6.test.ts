import {describe,expect,it} from 'vitest';
import {cn,formatMoney,initials,maskIdentity} from '../design-system/utils';
import {primaryNav,mobileNav,visibleNav} from '../layouts/navigation';
import type {Permission} from '../lib/security';

describe('design system V6 — utils',()=>{
  it('combina clases ignorando falsy',()=>expect(cn('a',false,null,undefined,'b')).toBe('a b'));
  it('formatea dinero en lempiras',()=>expect(formatMoney(400)).toBe('L 400.00'));
  it('formatea dinero con miles',()=>expect(formatMoney(12500.5)).toBe('L 12,500.50'));
  it('formatea NaN como cero',()=>expect(formatMoney('abc')).toBe('L 0.00'));
  it('iniciales de persona',()=>expect(initials('Carlos Humberto López')).toBe('CH'));
  it('enmascara identidad sin exponer PII completa',()=>{
    const masked=maskIdentity('0801199812345');
    expect(masked).not.toContain('1998');
    expect(masked).toContain('•••');
  });
});

describe('design system V6 — navegación',()=>{
  it('sidebar maestro NO excede 6 entradas (regla §17)',()=>expect(primaryNav.length).toBeLessThanOrEqual(6));
  it('las 6 secciones son las maestras',()=>expect(primaryNav.map(n=>n.label)).toEqual(['Inicio','Abonados','Tesorería','Operación','Junta','Cumplimiento']));
  it('filtra por permisos',()=>{
    const has=(p:Permission)=>p!=='subscribers.read';
    const items=visibleNav(primaryNav,has);
    expect(items.find(i=>i.label==='Abonados')).toBeUndefined();
    expect(items.find(i=>i.label==='Inicio')).toBeDefined();
  });
  it('no exige permiso para Inicio',()=>expect(primaryNav[0].permission).toBeUndefined());
  it('bottom nav móvil incluye Buscar y Mapa',()=>{
    expect(mobileNav.map(n=>n.label)).toContain('Buscar');
    expect(mobileNav.map(n=>n.label)).toContain('Mapa');
  });
});