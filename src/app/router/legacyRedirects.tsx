import type {ReactElement} from 'react';
import {Navigate,Route} from 'react-router-dom';

/**
 * Rutas maestras (§22) que HOY sólo redirigen a una pantalla legacy.
 * NO son la solución definitiva: cada una debe convertirse en una experiencia real
 * en su milestone. Esta lista SÓLO puede encoger — el gate
 * `scripts/enterprise-gates.mjs` (checkLegacyRedirects) falla si crece.
 *
 * Formato: [ruta maestra, destino actual, milestone que la sustituye]
 */
export const LEGACY_REDIRECTS:ReadonlyArray<readonly[string,string,string]>=[
  ['tesoreria','/pagos','G'],
  ['tesoreria/cobrar','/pagos','G'],
  ['tesoreria/caja','/caja','G'],
  ['tesoreria/bancos','/bancos','H'],
  ['tesoreria/gastos','/gastos','I'],
  ['tesoreria/compras','/compras','I'],
  ['tesoreria/presupuesto','/presupuesto','I'],
  ['operacion','/operaciones','J'],
  ['operacion/mapa','/mapa','K'],
  ['operacion/bodega','/bodega','I'],
  ['junta','/junta-directiva','O'],
  ['cumplimiento','/ersaps','P'],
  ['cumplimiento/ersaps','/ersaps','P'],
  ['cumplimiento/calidad','/calidad','M'],
  ['cumplimiento/informe-anual','/informes','P'],
];

export function legacyRedirectRoutes():ReactElement[]{
  return LEGACY_REDIRECTS.map(([from,to])=>(
    <Route key={from} path={from} element={<Navigate to={to} replace/>}/>
  ));
}
