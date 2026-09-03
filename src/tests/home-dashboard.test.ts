import {describe,expect,it} from 'vitest';
import {homeQuickActions,homeSections,roleLabel,visibleQuickActions} from '../features/dashboard/roleView';
import {hasRoute} from '../app/router/routeManifest';
import type {Permission} from '../lib/security';

const perms=(...list:Permission[])=>{const s=new Set(list);return (p:Permission)=>s.has(p);};

describe('inicio — command center role-aware (§26-27)',()=>{
  it('etiqueta el perfil operativo según permisos',()=>{
    expect(roleLabel(perms('settings.manage','roles.manage'))).toBe('Administración');
    expect(roleLabel(perms('bank.manage','payments.read'))).toBe('Tesorería');
    expect(roleLabel(perms('governance.manage'))).toBe('Junta Directiva');
    expect(roleLabel(perms('audit.read'))).toBe('Fiscalía / Auditoría');
    expect(roleLabel(perms('operations.manage'))).toBe('Operación técnica');
    expect(roleLabel(perms('subscribers.create'))).toBe('Secretaría');
    expect(roleLabel(perms('subscribers.read'))).toBe('Consulta');
  });

  it('el técnico ve operación pero no finanzas',()=>{
    const s=homeSections(perms('operations.read','field.manage','subscribers.read'));
    expect(s).toEqual({finance:false,operations:true,portfolio:false});
  });

  it('el tesorero ve finanzas y cartera',()=>{
    const s=homeSections(perms('payments.read','finance.read','obligations.read'));
    expect(s).toEqual({finance:true,operations:false,portfolio:true});
  });

  it('las acciones rápidas se recortan por permiso',()=>{
    expect(visibleQuickActions(perms('subscribers.create','subscribers.read')).map(a=>a.title))
      .toEqual(['Registrar abonado','Abrir ficha digital']);
    expect(visibleQuickActions(()=>false)).toEqual([]);
  });

  it('cada acción rápida apunta a una ruta real',()=>{
    expect(homeQuickActions.filter(a=>!hasRoute(a.to)).map(a=>a.to)).toEqual([]);
  });
});
