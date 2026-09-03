import type {ReactElement} from 'react';
import {Route} from 'react-router-dom';
import {ProtectedRoute} from '../../components/ProtectedRoute';
import type {Permission} from '../../lib/security';

// Azúcar para declarar una ruta protegida por permiso de forma homogénea (§126).
export function guarded(path:string,permission:Permission|undefined,element:ReactElement):ReactElement{
  return <Route key={path} path={path} element={<ProtectedRoute permission={permission}>{element}</ProtectedRoute>}/>;
}
