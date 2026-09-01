import {Suspense} from 'react';
import {BrowserRouter,Route,Routes} from 'react-router-dom';
import {AuthProvider} from '../../contexts/AuthContext';
import {ProtectedRoute} from '../../components/ProtectedRoute';
import {PortalRoute} from '../../components/PortalRoute';
import {AppShell} from '../../layouts/AppShell';
import {appRoutes} from './appRoutes';
import * as P from './lazyPages';

const routeFallback=(
  <main className="ja-route-fallback" aria-busy="true">
    <div className="ja-skeleton-block"/>
    <span className="ja-visually-hidden">Cargando módulo seguro…</span>
  </main>
);

/** Punto de entrada de enrutamiento. `App.tsx` sólo lo compone. */
export function AppRouter(){
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={routeFallback}>
          <Routes>
            {/* Acceso / identidad (AuthShell — sin sesión) */}
            <Route path="/login" element={<P.Login/>}/>
            <Route path="/recuperar" element={<P.RecuperarAcceso/>}/>
            <Route path="/restablecer" element={<P.Restablecer/>}/>
            <Route path="/portal" element={<P.PortalLogin/>}/>
            <Route path="/mfa" element={<P.Mfa/>}/>
            <Route path="/setup" element={<P.Setup/>}/>

            {/* Portal del abonado */}
            <Route path="/mi-cuenta" element={<PortalRoute><P.SubscriberPortal/></PortalRoute>}/>

            {/* Verificación pública de recibo (sin sesión) */}
            <Route path="/verificar-recibo/:token" element={<P.VerifyReceipt/>}/>

            {/* Aplicación autenticada */}
            <Route element={<ProtectedRoute><AppShell/></ProtectedRoute>}>
              {appRoutes()}
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
