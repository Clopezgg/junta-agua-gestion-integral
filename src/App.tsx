import {lazy,Suspense} from 'react';
import {BrowserRouter,Route,Routes} from 'react-router-dom';
import {AuthProvider} from './contexts/AuthContext';
import {ProtectedRoute} from './components/ProtectedRoute';
import {PortalRoute} from './components/PortalRoute';
import {Layout} from './components/Layout';
import {Home} from './pages/Home';
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
      <Route path="usuarios" element={<ProtectedRoute permission="users.manage"><Users/></ProtectedRoute>}/>
      <Route path="abonados" element={<ProtectedRoute permission="subscribers.read"><Subscribers/></ProtectedRoute>}/>
      <Route path="fichas-abonados" element={<ProtectedRoute permission="subscribers.read"><SubscriberCards/></ProtectedRoute>}/>
      <Route path="importaciones" element={<ProtectedRoute permission="imports.read"><Imports/></ProtectedRoute>}/>
      <Route path="mapa" element={<ProtectedRoute permission="map.read"><MapView/></ProtectedRoute>}/>
      <Route path="medicion" element={<ProtectedRoute permission="metering.read"><Metering/></ProtectedRoute>}/>
      <Route path="tarifas" element={<ProtectedRoute permission="tariffs.read"><Tariffs/></ProtectedRoute>}/>
      <Route path="estados-cuenta" element={<ProtectedRoute permission="obligations.read"><Accounts/></ProtectedRoute>}/>
      <Route path="pagos" element={<ProtectedRoute permission="payments.read"><Payments/></ProtectedRoute>}/>
      <Route path="documentos-financieros" element={<ProtectedRoute permission="payments.read"><FinancialDocuments/></ProtectedRoute>}/>
      <Route path="gastos" element={<ProtectedRoute permission="expenses.read"><Expenses/></ProtectedRoute>}/>
      <Route path="presupuesto" element={<ProtectedRoute permission="budget.read"><Budget/></ProtectedRoute>}/>
      <Route path="informes" element={<ProtectedRoute permission="reports.read"><Reports/></ProtectedRoute>}/>
      <Route path="integraciones" element={<ProtectedRoute permission="integrations.read"><Integrations/></ProtectedRoute>}/>
      <Route path="respaldos" element={<ProtectedRoute permission="backups.read"><Backups/></ProtectedRoute>}/>
      <Route path="operaciones" element={<ProtectedRoute permission="operations.read"><Operations/></ProtectedRoute>}/>
      <Route path="avance" element={<Progress/>}/>
      <Route path="auditoria" element={<ProtectedRoute permission="audit.read"><Audit/></ProtectedRoute>}/>
      <Route path="estudio-recibo" element={<ProtectedRoute permission="document_templates.read"><ReceiptVisualStudio/></ProtectedRoute>}/>
      <Route path="configuracion-documental" element={<ProtectedRoute permission="document_templates.read"><DocumentSettings/></ProtectedRoute>}/>
      <Route path="configuracion" element={<ProtectedRoute permission="settings.manage"><Settings/></ProtectedRoute>}/>
      <Route path="seguridad" element={<Security/>}/>
    </Route>
  </Routes></Suspense></AuthProvider></BrowserRouter>;
}
