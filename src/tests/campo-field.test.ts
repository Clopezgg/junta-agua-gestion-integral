import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {hasRoute,routePermission} from '../app/router/routeManifest';

const page=readFileSync('src/pages/Campo.tsx','utf8');

describe('Milestone L — Campo / PWA técnico de órdenes (§53)',()=>{
  it('la ruta campo exige field.read y vive en el design system',()=>{
    expect(hasRoute('campo')).toBe(true);
    expect(routePermission('campo')).toBe('field.read');
    expect(page).toContain("from '../design-system/primitives'");
    expect(page).not.toContain('className="content"');
  });

  it('muestra sólo las órdenes asignadas al técnico y el flujo de campo',()=>{
    expect(page).toContain('o.assigned_to===me');
    for(const step of ['Llegué','Iniciar','GPS','Materiales','Finalizar'])expect(page).toContain(step);
    expect(page).toContain('getGeoLocation');
    expect(page).toContain('registerInventoryMovement');
    expect(page).toContain('updateWorkOrderDetails');
  });

  it('el cierre es offline-seguro pero NO hay operaciones financieras en campo',()=>{
    expect(page).toContain('QUEUE_KEY');
    expect(page).toContain('navigator.onLine');
    expect(page).toContain('No hay operaciones financieras en modo campo');
    // sin cobros, aprobación de gasto ni tarifas
    for(const banned of ['createExpenseRequest','approveExpense','registerPayment','saveTariff','register_payment'])
      expect(page).not.toContain(banned);
  });
});
