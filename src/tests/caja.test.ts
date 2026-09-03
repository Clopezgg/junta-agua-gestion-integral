import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {routePermission} from '../app/router/routeManifest';

const mig=readFileSync('supabase/migrations/202609010012_v6_caja.sql','utf8');
const page=readFileSync('src/pages/Caja.tsx','utf8');

describe('Caja como espacio propio (§46)',()=>{
  it('la ruta /caja exige payments.read',()=>{
    expect(routePermission('caja')).toBe('payments.read');
  });

  it('el reporte de sesión calcula efectivo esperado = fondo + cobros cash − devoluciones (§46)',()=>{
    expect(mig).toContain('function public.get_cash_session_report');
    expect(mig).toContain('expected_cash');
    expect(mig).toContain("method='cash'");
    expect(mig).toContain("e.event_type='refund'");
    expect(mig).toContain('totals_by_method');
  });

  it('el historial lista sesiones con cajero y diferencia',()=>{
    expect(mig).toContain('function public.list_cash_sessions');
    expect(mig).toContain("'difference',c.difference");
    expect(mig).toContain("'cashier',pr.full_name");
  });

  it('la pantalla separa la operación de caja del cobro',()=>{
    for(const tab of ['Estado','Cobros de la sesión','Arqueo','Historial'])expect(page).toContain(tab);
    // no reintroduce el flujo de cobro: solo enlaza a /pagos
    expect(page).toContain('to="/pagos"');
    expect(page).not.toContain('registerPayment');
    // sin prompt() del legacy
    expect(page).not.toContain('prompt(');
  });

  it('muestra la diferencia del arqueo (faltante/sobrante/cuadra)',()=>{
    expect(page).toContain('faltante');
    expect(page).toContain('sobrante');
    expect(page).toContain('cuadra');
  });
});
