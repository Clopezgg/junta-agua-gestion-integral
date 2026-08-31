import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Permission } from '../lib/security';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({children,permission}:{children:ReactNode;permission?:Permission}){
  const a=useAuth();
  if(a.loading)return <main className="center">Cargando…</main>;
  if(!a.configured)return <Navigate to="/setup" replace/>;
  if(!a.session)return <Navigate to="/login" replace/>;
  if(a.authError)return <main className="center"><h1>No se pudo establecer la sesión</h1><p>{a.authError.message}</p><a href="/login">Volver a iniciar sesión</a></main>;
  if(!a.mfaVerified)return <Navigate to="/mfa" replace/>;
  if(!a.profile)return <Navigate to="/setup" replace/>;
  if(a.profile.status!=='active')return <main className="center">Cuenta inactiva.</main>;
  if(permission&&!a.has(permission))return <main className="center">Acceso no autorizado.</main>;
  return <>{children}</>;
}
