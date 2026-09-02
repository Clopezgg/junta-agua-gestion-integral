// Carga diferida de páginas (route-based code splitting, §103).
// Punto único de import de páginas para el router — las páginas NO se importan desde App.tsx.
import {lazy} from 'react';

// Núcleo (sin split — se necesita de inmediato tras el login / acceso)
export {Home} from '../../pages/Home';
export {Login} from '../../pages/Login';
export {PortalLogin} from '../../pages/PortalLogin';
export {Mfa} from '../../pages/Mfa';
export {Setup} from '../../pages/Setup';
export {RecuperarAcceso} from '../../pages/RecuperarAcceso';
export {Restablecer} from '../../pages/Restablecer';
export {VerifyReceipt} from '../../pages/VerifyReceipt';

// Diferidas por dominio
export const SubscriberPortal=lazy(()=>import('../../pages/SubscriberPortal').then(m=>({default:m.SubscriberPortal})));
export const AbonadosList=lazy(()=>import('../../pages/AbonadosList').then(m=>({default:m.AbonadosList})));
export const NuevoServicio=lazy(()=>import('../../pages/NuevoServicio').then(m=>({default:m.NuevoServicio})));
export const Subscribers=lazy(()=>import('../../pages/Subscribers').then(m=>({default:m.Subscribers})));
export const SubscriberCards=lazy(()=>import('../../pages/SubscriberCards').then(m=>({default:m.SubscriberCards})));
export const PeguesContratos=lazy(()=>import('../../pages/PeguesContratos').then(m=>({default:m.PeguesContratos})));
export const Abonado360=lazy(()=>import('../../pages/Abonado360').then(m=>({default:m.Abonado360})));
export const Solicitudes=lazy(()=>import('../../pages/Solicitudes').then(m=>({default:m.Solicitudes})));
export const Morosidad=lazy(()=>import('../../pages/Morosidad').then(m=>({default:m.Morosidad})));
export const Comunicaciones=lazy(()=>import('../../pages/Comunicaciones').then(m=>({default:m.Comunicaciones})));
export const Metering=lazy(()=>import('../../pages/Metering').then(m=>({default:m.Metering})));

export const Payments=lazy(()=>import('../../pages/Payments').then(m=>({default:m.Payments})));
export const Caja=lazy(()=>import('../../pages/Caja').then(m=>({default:m.Caja})));
export const Cartera=lazy(()=>import('../../pages/Cartera').then(m=>({default:m.Cartera})));
export const Accounts=lazy(()=>import('../../pages/Accounts').then(m=>({default:m.Accounts})));
export const Bancos=lazy(()=>import('../../pages/Bancos').then(m=>({default:m.Bancos})));
export const Expenses=lazy(()=>import('../../pages/Expenses').then(m=>({default:m.Expenses})));
export const Budget=lazy(()=>import('../../pages/Budget').then(m=>({default:m.Budget})));
export const Compras=lazy(()=>import('../../pages/Compras').then(m=>({default:m.Compras})));
export const FinancialDocuments=lazy(()=>import('../../pages/FinancialDocuments').then(m=>({default:m.FinancialDocuments})));
export const Tariffs=lazy(()=>import('../../pages/Tariffs').then(m=>({default:m.Tariffs})));

export const Operations=lazy(()=>import('../../pages/Operations').then(m=>({default:m.Operations})));
export const Incidents=lazy(()=>import('../../pages/Incidents').then(m=>({default:m.Incidents})));
export const Bodega=lazy(()=>import('../../pages/Bodega').then(m=>({default:m.Bodega})));
export const FieldReadings=lazy(()=>import('../../pages/FieldReadings').then(m=>({default:m.FieldReadings})));
export const MapView=lazy(()=>import('../../pages/MapView').then(m=>({default:m.MapView})));

export const Fuentes=lazy(()=>import('../../pages/Fuentes').then(m=>({default:m.Fuentes})));
export const Calidad=lazy(()=>import('../../pages/Calidad').then(m=>({default:m.Calidad})));
export const Cloracion=lazy(()=>import('../../pages/Cloracion').then(m=>({default:m.Cloracion})));
export const Continuidad=lazy(()=>import('../../pages/Continuidad').then(m=>({default:m.Continuidad})));
export const Microcuenca=lazy(()=>import('../../pages/Microcuenca').then(m=>({default:m.Microcuenca})));

export const Asamblea=lazy(()=>import('../../pages/Asamblea').then(m=>({default:m.Asamblea})));
export const JuntaDirectiva=lazy(()=>import('../../pages/JuntaDirectiva').then(m=>({default:m.JuntaDirectiva})));
export const Comites=lazy(()=>import('../../pages/Comites').then(m=>({default:m.Comites})));
export const Reuniones=lazy(()=>import('../../pages/Reuniones').then(m=>({default:m.Reuniones})));
export const Resoluciones=lazy(()=>import('../../pages/Resoluciones').then(m=>({default:m.Resoluciones})));
export const Proyectos=lazy(()=>import('../../pages/Proyectos').then(m=>({default:m.Proyectos})));

export const Ersaps=lazy(()=>import('../../pages/Ersaps').then(m=>({default:m.Ersaps})));
export const Calendario=lazy(()=>import('../../pages/Calendario').then(m=>({default:m.Calendario})));
export const Reports=lazy(()=>import('../../pages/Reports').then(m=>({default:m.Reports})));
export const Transparencia=lazy(()=>import('../../pages/Transparencia').then(m=>({default:m.Transparencia})));
export const Audit=lazy(()=>import('../../pages/Audit').then(m=>({default:m.Audit})));

export const Admin=lazy(()=>import('../../pages/Admin').then(m=>({default:m.Admin})));
export const Users=lazy(()=>import('../../pages/Users').then(m=>({default:m.Users})));
export const Settings=lazy(()=>import('../../pages/Settings').then(m=>({default:m.Settings})));
export const Security=lazy(()=>import('../../pages/Security').then(m=>({default:m.Security})));
export const Backups=lazy(()=>import('../../pages/Backups').then(m=>({default:m.Backups})));
export const Integrations=lazy(()=>import('../../pages/Integrations').then(m=>({default:m.Integrations})));
export const Imports=lazy(()=>import('../../pages/Imports').then(m=>({default:m.Imports})));
export const DocumentSettings=lazy(()=>import('../../pages/DocumentSettings').then(m=>({default:m.DocumentSettings})));
export const ReceiptVisualStudio=lazy(()=>import('../../pages/ReceiptVisualStudio').then(m=>({default:m.ReceiptVisualStudio})));
export const Progress=lazy(()=>import('../../pages/Progress').then(m=>({default:m.Progress})));
