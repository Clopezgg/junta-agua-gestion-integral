import type {ReactElement} from 'react';
import {Navigate,Route} from 'react-router-dom';
import {guarded} from './guards';
import {legacyRedirectRoutes} from './legacyRedirects';
import * as P from './lazyPages';

/**
 * Árbol de rutas de la aplicación autenticada, organizado por dominio (§16, §22).
 * Cada bloque = un universo de la navegación maestra (§21).
 * Los paths se preservan 1:1 respecto al router V6; la deduplicación de alias
 * de administración se hace en su milestone (S).
 */
export function appRoutes():ReactElement[]{
  return [
    // INICIO
    <Route key="index" index element={<P.Home/>}/>,
    <Route key="inicio" path="inicio" element={<P.Home/>}/>,
    ...legacyRedirectRoutes(),
    guarded('centro-operativo','operations.read',<P.Operations/>),

    // ABONADOS Y SERVICIO
    guarded('abonados','subscribers.read',<P.AbonadosList/>),
    guarded('abonados/registro','subscribers.read',<P.Subscribers/>),
    guarded('fichas-abonados','subscribers.read',<P.SubscriberCards/>),
    guarded('pegues-contratos','subscribers.read',<P.PeguesContratos/>),
    guarded('abonado-360','subscribers.read',<P.Abonado360/>),
    guarded('solicitudes','subscribers.read',<P.Solicitudes/>),
    guarded('morosidad','obligations.read',<P.Morosidad/>),
    guarded('comunicaciones','communications.read',<P.Comunicaciones/>),
    guarded('medicion','metering.read',<P.Metering/>),

    // TESORERÍA
    guarded('pagos','payments.read',<P.Payments/>),
    guarded('caja','payments.read',<P.Caja/>),
    guarded('estados-cuenta','obligations.read',<P.Accounts/>),
    guarded('bancos','finance.read',<P.Bancos/>),
    guarded('gastos','expenses.read',<P.Expenses/>),
    guarded('presupuesto','budget.read',<P.Budget/>),
    guarded('compras','expenses.read',<P.Compras/>),
    guarded('documentos-financieros','payments.read',<P.FinancialDocuments/>),
    guarded('tarifas','tariffs.read',<P.Tariffs/>),

    // OPERACIÓN
    guarded('operaciones','operations.read',<P.Operations/>),
    guarded('incidencias','incidents.read',<P.Incidents/>),
    guarded('ordenes-trabajo','operations.read',<P.Operations/>),
    guarded('activos','assets.read',<P.Operations/>),
    guarded('mantenimiento','maintenance.manage',<P.Operations/>),
    guarded('bodega','inventory.read',<P.Bodega/>),
    guarded('lecturas-campo','field.read',<P.FieldReadings/>),
    guarded('mapa','map.read',<P.MapView/>),

    // AGUA Y AMBIENTE
    guarded('fuentes','water.read',<P.Fuentes/>),
    guarded('calidad','water.read',<P.Calidad/>),
    guarded('cloracion','water.read',<P.Cloracion/>),
    guarded('continuidad','water.read',<P.Continuidad/>),
    guarded('microcuenca','water.read',<P.Microcuenca/>),

    // JUNTA / GOBIERNO
    guarded('asamblea','governance.read',<P.Asamblea/>),
    guarded('junta-directiva','governance.read',<P.JuntaDirectiva/>),
    guarded('comites','governance.read',<P.Comites/>),
    guarded('reuniones','governance.read',<P.Reuniones/>),
    guarded('resoluciones','governance.read',<P.Resoluciones/>),
    guarded('proyectos','governance.read',<P.Proyectos/>),

    // CUMPLIMIENTO
    guarded('ersaps','compliance.read',<P.Ersaps/>),
    guarded('calendario','updates.read',<P.Calendario/>),
    guarded('informes','reports.read',<P.Reports/>),
    guarded('transparencia','reports.read',<P.Transparencia/>),
    guarded('auditoria','audit.read',<P.Audit/>),

    // ADMINISTRACIÓN (alias a deduplicar en Milestone S)
    guarded('avance','updates.read',<P.Progress/>),
    guarded('admin','settings.read',<P.Admin/>),
    guarded('admin/usuarios','users.manage',<P.Users/>),
    guarded('admin/junta','users.manage',<P.Users/>),
    guarded('admin/auditoria','audit.read',<P.Audit/>),
    guarded('admin/respaldos','backups.read',<P.Backups/>),
    guarded('admin/integraciones','integrations.read',<P.Integrations/>),
    guarded('admin/configuracion','settings.manage',<P.Settings/>),
    guarded('admin/configuracion-documental','document_templates.read',<P.DocumentSettings/>),
    guarded('admin/estudio-recibo','document_templates.read',<P.ReceiptVisualStudio/>),
    guarded('admin/seguridad','settings.read',<P.Security/>),
    guarded('admin/readiness','settings.read',<P.Progress/>),
    guarded('admin/progreso','updates.read',<P.Progress/>),
    guarded('usuarios','users.manage',<P.Users/>),
    guarded('importaciones','imports.read',<P.Imports/>),
    guarded('documentos','document_templates.read',<P.DocumentSettings/>),
    guarded('integraciones','integrations.read',<P.Integrations/>),
    guarded('respaldos','backups.read',<P.Backups/>),
    guarded('estudio-recibo','document_templates.read',<P.ReceiptVisualStudio/>),
    guarded('configuracion-documental','document_templates.read',<P.DocumentSettings/>),
    guarded('configuracion','settings.manage',<P.Settings/>),
    guarded('seguridad','settings.read',<P.Security/>),

    // Ruta no encontrada dentro de la app → Inicio (nunca pantalla en blanco, §108)
    <Route key="catchall" path="*" element={<Navigate to="/inicio" replace/>}/>,
  ];
}
