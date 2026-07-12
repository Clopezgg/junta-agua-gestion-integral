import type {ReactNode} from 'react';
import {Navigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';

export function PortalRoute({children}:{children:ReactNode}){
  const auth=useAuth();
  if(auth.loading)return <main className="center">Cargando portal seguro…</main>;
  if(!auth.configured)return <Navigate to="/setup" replace/>;
  if(!auth.session)return <Navigate to="/portal" replace/>;
  if(auth.accountKind!=='subscriber')return <Navigate to="/" replace/>;
  return <>{children}</>;
}
