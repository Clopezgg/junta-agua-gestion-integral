import {isValidElement} from 'react';
import {appRoutes} from './appRoutes';
import {LEGACY_REDIRECTS} from './legacyRedirects';
import type {Permission} from '../../lib/security';

export type RouteEntry={
  path:string;
  index:boolean;
  /** permiso exigido por ProtectedRoute, si aplica */
  permission?:Permission;
  /** true si sólo redirige (ruta maestra legacy, §22) */
  redirect?:string;
};

function extract():RouteEntry[]{
  const redirects=new Map(LEGACY_REDIRECTS.map(([from,to])=>[from,to] as const));
  return appRoutes().flatMap(node=>{
    if(!isValidElement(node))return [];
    const props=node.props as {path?:string;index?:boolean;element?:unknown};
    const path=props.path??'';
    if(!path&&!props.index)return [];
    const el=props.element as {props?:{permission?:Permission;to?:string}}|undefined;
    return [{
      path:path||'/',
      index:Boolean(props.index),
      permission:el?.props?.permission,
      redirect:redirects.get(path)??el?.props?.to,
    }];
  });
}

export const routeManifest:RouteEntry[]=extract();

/** Rutas públicas (fuera del AppShell) declaradas en AppRouter. */
export const publicRoutePaths=[
  '/login','/recuperar','/restablecer','/portal','/mfa','/setup',
  '/mi-cuenta','/verificar-recibo/:token',
] as const;

export function findRoute(path:string):RouteEntry|undefined{
  return routeManifest.find(r=>r.path===path.replace(/^\//,''));
}

export function routePermission(path:string):Permission|undefined{
  return findRoute(path)?.permission;
}

export function hasRoute(path:string):boolean{
  const clean=path.replace(/^\//,'');
  return routeManifest.some(r=>r.path===clean)
    ||(publicRoutePaths as readonly string[]).includes(path);
}
