import {describe,expect,it} from 'vitest';
import {isValidElement} from 'react';
import {appRoutes} from '../app/router/appRoutes';
import {LEGACY_REDIRECTS} from '../app/router/legacyRedirects';

type RouteProps={path?:string;index?:boolean;element?:unknown};
const routes=appRoutes().map(r=>{
  expect(isValidElement(r)).toBe(true);
  return (r.props as RouteProps);
});

describe('router map (§22)',()=>{
  it('no hay paths duplicados en la app autenticada',()=>{
    const paths=routes.map(r=>r.path).filter((p):p is string=>Boolean(p)&&p!=='*');
    const dupes=paths.filter((p,i)=>paths.indexOf(p)!==i);
    expect(dupes).toEqual([]);
  });

  it('toda ruta con path (salvo comodín y redirects maestros) monta un ProtectedRoute con permiso',()=>{
    const redirectPaths=new Set(LEGACY_REDIRECTS.map(([from])=>from));
    const offenders=routes
      .filter(r=>r.path&&r.path!=='*'&&!redirectPaths.has(r.path))
      .filter(r=>{
        const el=r.element as {type?:{name?:string};props?:{permission?:string}}|undefined;
        return !el||el.type?.name!=='ProtectedRoute'||!el.props?.permission;
      })
      .map(r=>r.path);
    // 'inicio' es la única ruta autenticada sin permiso (accesible a todos los roles).
    expect(offenders).toEqual(['inicio']);
  });

  it('exactamente un index y un comodín',()=>{
    expect(routes.filter(r=>r.index).length).toBe(1);
    expect(routes.filter(r=>r.path==='*').length).toBe(1);
  });

  it('los redirects maestros legacy sólo pueden encoger (§22)',()=>{
    // Snapshot Milestone C = 15. Cada milestone que sustituye una ruta maestra baja este número.
    expect(LEGACY_REDIRECTS.length).toBeLessThanOrEqual(15);
  });

  it('cada redirect legacy declara el milestone que lo sustituye',()=>{
    for(const [from,to,milestone] of LEGACY_REDIRECTS){
      expect(from,'origen').toBeTruthy();
      expect(to.startsWith('/'),`destino de ${from}`).toBe(true);
      expect(milestone,`milestone de ${from}`).toMatch(/^[A-Z]$/);
    }
  });
});
