import {lazy,Suspense} from 'react';
import {BrowserRouter,Route,Routes} from 'react-router-dom';
import {AuthProvider} from './contexts/AuthContext';
import {ProtectedRoute} from './components/ProtectedRoute';
import {PortalRoute} from './components/PortalRoute';
import {Layout} from './components/Layout';
import {Home} from './pages/Home';
import {Admin} from './pages/Admin';
import {Audit} from './pages/Audit';
import {Settings} from './pages/Settings';
import {Users} from './pages/Users';
import {Login} from './pages/Login';
import {PortalLogin} from './pages/PortalLogin';
import {SubscriberPortal} from './pages/SubscriberPortal';
import {Mfa} from './pages/Mfa';
import {Setup} from './pages/Setup';
import {Subscribers} from './pages/Subscribers';
import {Security} from './pages/Security';
import {Tariffs} from './pages/Tariffs';
import {Accounts} from './pages/Accounts';
import {VerifyReceipt} from './pages/VerifyReceipt';
import {Asamblea} from './pages/Asamblea';
import {JuntaDirectiva} from './pages/JuntaDirectiva';
import {Comites} from './pages/Comites';
import {Reuniones} from './pages/Reuniones';
import {Resoluciones} from './pages/Resoluciones';
import {Proyectos} from './pages/Proyectos';
import {Fuentes} from './pages/Fuentes';
import {Calidad} from './pages/Calidad';
import {Cloracion} from './pages/Cloracion';
import {Continuidad} from './pages/Continuidad';
import {Microcuenca} from './pages/Microcuenca';
import {Ersaps} from './pages/Ersaps';
import {Calendario} from './pages/Calendario';
import {Transparencia} from './pages/Transparencia';
import {Bancos} from './pages/Bancos';
import {Compras} from './pages/Compras';
import {Solicitudes} from './pages/Solicitudes';
import {Morosidad} from './pages/Morosidad';
import {Bodega} from './pages/Bodega';
import {Caja} from './pages/Caja';
import {PeguesContratos} from './pages/PeguesContratos';
import {Comunicaciones} from './pages/Comunicaciones';

const Payments=lazy(()=>import('./pages/Payments').then(module=>({default:module.Payments})));
const Expenses=lazy(()=>import('./pages/Expenses').then(module=>({default:module.Expenses})));
const Reports=lazy(()=>import('./pages/Reports').then(module=>({default:module.Reports})));
const Integrations=lazy(()=>import('./pages/Integrations').then(module=>({default:module.Integrations})));
const Operations=lazy(()=>import('./pages/Operations').then(module=>({default:module.Operations})));
const Progress=lazy(()=>import('./pages/Progress').then(module=>({default:module.Progress})));
const MapView=lazy(()=>import('./pages/MapView').then(module=>({default:module.MapView})));
const Backups=lazy(()=>import('./pages/Backups').then(module=>({default:module.Backups})));
const Budget=lazy(()=>import('./pages/Budget').then(module=>({default:module.Budget})));
const Metering=lazy(()=>import('./pages/Metering').then(module=>({default:module.Metering})));
const Imports=lazy(()=>import('./pages/Imports').then(module=>({default:module.Imports})));
const DocumentSettings=lazy(()=>import('./pages/DocumentSettings').then(module=>({default:module.DocumentSettings})));
const ReceiptVisualStudio=lazy(()=>import('./pages/ReceiptVisualStudio').then(module=>({default:module.ReceiptVisualStudio})));
const SubscriberCards=lazy(()=>import('./pages/SubscriberCards').then(module=>({default:module.SubscriberCards})));
const FinancialDocuments=lazy(()=>import('./pages/FinancialDocuments').then(module=>({default:module.FinancialDocuments})));
const loading=<main className="content"><div className="panel">Cargando módulo seguro…</div></main>;

export default function App(){
  return <BrowserRouter><AuthProvider><Suspense fallback={loading}><Routes>
    <Route path="/login" element={<Login/>}/>
    <Route path="/portal" element={<PortalLogin/>}/>
    <Route path="/mi-cuenta" element={<PortalRoute><SubscriberPortal/></PortalRoute>}/>
    <Route path="/mfa" element={<Mfa/>}/>
    <Route path="/setup" element={<Setup/>}/>
    <Route path="/verificar-recibo/:token" element={<VerifyReceipt/>}/>
    <Route element={<ProtectedRoute><Layout/></ProtectedRoute>}>
      <Route index element={<Home/>}/>
      {/* INICIO */}
      <Route path="centro-operativo" element={<ProtectedRoute permission="operations.read"><Operations/></ProtectedRoute>}/>
      {/* USUARIOS Y SERVICIO */}
      <Route path="abonados" element={<ProtectedRoute permission="subscribers.read"><Subscribers/></ProtectedRoute>}/>
      <Route path="fichas-abonados" element={<ProtectedRoute permission="subscribers.read"><SubscriberCards/></ProtectedRoute>}/>
      <Route path="pegues-contratos" element={<ProtectedRoute permission="subscribers.read"><PeguesContratos/></ProtectedRoute>}/>
      <Route path="solicitudes" element={<ProtectedRoute permission="subscribers.read"><Solicitudes/></ProtectedRoute>}/>
      <Route path="morosidad" element={<ProtectedRoute permission="obligations.read"><Morosidad/></ProtectedRoute>}/>
      <Route path="comunicaciones" element={<ProtectedRoute permission="communications.read"><Comunicaciones/></ProtectedRoute>}/>
      <Route path="medicion" element={<ProtectedRoute permission="metering.read"><Metering/></ProtectedRoute>}/>
      {/* TESORERÍA */}
      <Route path="pagos" element={<ProtectedRoute permission="payments.read"><Payments/></ProtectedRoute>}/>
      <Route path="caja" element={<ProtectedRoute permission="payments.read"><Caja/></ProtectedRoute>}/>
      <Route path="estados-cuenta" element={<ProtectedRoute permission="obligations.read"><Accounts/></ProtectedRoute>}/>
      <Route path="bancos" element={<ProtectedRoute permission="finance.read"><Bancos/></ProtectedRoute>}/>
      <Route path="gastos" element={<ProtectedRoute permission="expenses.read"><Expenses/></ProtectedRoute>}/>
      <Route path="presupuesto" element={<ProtectedRoute permission="budget.read"><Budget/></ProtectedRoute>}/>
      <Route path="compras" element={<ProtectedRoute permission="expenses.read"><Compras/></ProtectedRoute>}/>
      <Route path="documentos-financieros" element={<ProtectedRoute permission="payments.read"><FinancialDocuments/></ProtectedRoute>}/>
      <Route path="tarifas" element={<ProtectedRoute permission="tariffs.read"><Tariffs/></ProtectedRoute>}/>
      {/* OPERACIÓN */}
      <Route path="operaciones" element={<ProtectedRoute permission="operations.read"><Operations/></ProtectedRoute>}/>
      <Route path="incidencias" element={<ProtectedRoute permission="operations.read"><Operations/></ProtectedRoute>}/>
      <Route path="ordenes-trabajo" element={<ProtectedRoute permission="operations.read"><Operations/></ProtectedRoute>}/>
      <Route path="activos" element={<ProtectedRoute permission="assets.read"><Operations/></ProtectedRoute>}/>
      <Route path="mantenimiento" element={<ProtectedRoute permission="maintenance.manage"><Operations/></ProtectedRoute>}/>
      <Route path="bodega" element={<ProtectedRoute permission="inventory.read"><Bodega/></ProtectedRoute>}/>
      <Route path="mapa" element={<ProtectedRoute permission="map.read"><MapView/></ProtectedRoute>}/>
      {/* AGUA Y AMBIENTE */}
      <Route path="fuentes" element={<ProtectedRoute permission="water.read"><Fuentes/></ProtectedRoute>}/>
      <Route path="calidad" element={<ProtectedRoute permission="water.read"><Calidad/></ProtectedRoute>}/>
      <Route path="cloracion" element={<ProtectedRoute permission="water.read"><Cloracion/></ProtectedRoute>}/>
      <Route path="continuidad" element={<ProtectedRoute permission="water.read"><Continuidad/></ProtectedRoute>}/>
      <Route path="microcuenca" element={<ProtectedRoute permission="water.read"><Microcuenca/></ProtectedRoute>}/>
      {/* GOBIERNO */}
      <Route path="asamblea" element={<ProtectedRoute permission="governance.read"><Asamblea/></ProtectedRoute>}/>
      <Route path="junta-directiva" element={<ProtectedRoute permission="governance.read"><JuntaDirectiva/></ProtectedRoute>}/>
      <Route path="comites" element={<ProtectedRoute permission="governance.read"><Comites/></ProtectedRoute>}/>
      <Route path="reuniones" element={<ProtectedRoute permission="governance.read"><Reuniones/></ProtectedRoute>}/>
      <Route path="resoluciones" element={<ProtectedRoute permission="governance.read"><Resoluciones/></ProtectedRoute>}/>
      <Route path="proyectos" element={<ProtectedRoute permission="governance.read"><Proyectos/></ProtectedRoute>}/>
      {/* CUMPLIMIENTO */}
      <Route path="ersaps" element={<ProtectedRoute permission="compliance.read"><Ersaps/></ProtectedRoute>}/>
      <Route path="calendario" element={<ProtectedRoute permission="updates.read"><Calendario/></ProtectedRoute>}/>
      <Route path="informes" element={<ProtectedRoute permission="reports.read"><Reports/></ProtectedRoute>}/>
      <Route path="transparencia" element={<ProtectedRoute permission="reports.read"><Transparencia/></ProtectedRoute>}/>
      <Route path="auditoria" element={<ProtectedRoute permission="audit.read"><Audit/></ProtectedRoute>}/>
      {/* ADMINISTRACIÓN */}
      <Route path="avance" element={<ProtectedRoute permission="updates.read"><Progress/></ProtectedRoute>}/>
      <Route path="admin" element={<ProtectedRoute permission="settings.read"><Admin/></ProtectedRoute>}/>
      <Route path="admin/usuarios" element={<ProtectedRoute permission="users.manage"><Users/></ProtectedRoute>}/>
      <Route path="admin/junta" element={<ProtectedRoute permission="users.manage"><Users/></ProtectedRoute>}/>
      <Route path="admin/auditoria" element={<ProtectedRoute permission="audit.read"><Audit/></ProtectedRoute>}/>
      <Route path="admin/respaldos" element={<ProtectedRoute permission="backups.read"><Backups/></ProtectedRoute>}/>
      <Route path="admin/integraciones" element={<ProtectedRoute permission="integrations.read"><Integrations/></ProtectedRoute>}/>
      <Route path="admin/configuracion" element={<ProtectedRoute permission="settings.manage"><Settings/></ProtectedRoute>}/>
      <Route path="admin/configuracion-documental" element={<ProtectedRoute permission="document_templates.read"><DocumentSettings/></ProtectedRoute>}/>
      <Route path="admin/estudio-recibo" element={<ProtectedRoute permission="document_templates.read"><ReceiptVisualStudio/></ProtectedRoute>}/>
      <Route path="admin/seguridad" element={<ProtectedRoute permission="settings.read"><Security/></ProtectedRoute>}/>
      <Route path="admin/readiness" element={<ProtectedRoute permission="settings.read"><Progress/></ProtectedRoute>}/>
      <Route path="admin/progreso" element={<ProtectedRoute permission="updates.read"><Progress/></ProtectedRoute>}/>
      <Route path="usuarios" element={<ProtectedRoute permission="users.manage"><Users/></ProtectedRoute>}/>
      <Route path="importaciones" element={<ProtectedRoute permission="imports.read"><Imports/></ProtectedRoute>}/>
      <Route path="documentos" element={<ProtectedRoute permission="document_templates.read"><DocumentSettings/></ProtectedRoute>}/>
      <Route path="integraciones" element={<ProtectedRoute permission="integrations.read"><Integrations/></ProtectedRoute>}/>
      <Route path="respaldos" element={<ProtectedRoute permission="backups.read"><Backups/></ProtectedRoute>}/>
      <Route path="estudio-recibo" element={<ProtectedRoute permission="document_templates.read"><ReceiptVisualStudio/></ProtectedRoute>}/>
      <Route path="configuracion-documental" element={<ProtectedRoute permission="document_templates.read"><DocumentSettings/></ProtectedRoute>}/>
      <Route path="configuracion" element={<ProtectedRoute permission="settings.manage"><Settings/></ProtectedRoute>}/>
      <Route path="seguridad" element={<ProtectedRoute permission="settings.read"><Security/></ProtectedRoute>}/>
    </Route>
  </Routes></Suspense></AuthProvider></BrowserRouter>;
}
