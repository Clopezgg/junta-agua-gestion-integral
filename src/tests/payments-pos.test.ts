import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {routePermission} from '../app/router/routeManifest';

const pos=readFileSync('src/pages/Payments.tsx','utf8');

describe('POS de cobro (§43, §44)',()=>{
  it('la ruta /pagos exige payments.read',()=>{
    expect(routePermission('pagos')).toBe('payments.read');
  });

  it('conserva la integridad de pago (§44): idempotencia + componentes + allocations',()=>{
    expect(pos).toContain('draftPaymentKey');
    expect(pos).toContain('idempotency_key:idempotencyKey');
    expect(pos).toContain('registerPayment({');
    expect(pos).toContain('components,allocations');
  });

  it('soporta los 5 métodos incl. mixto (§43)',()=>{
    for(const m of ['cash','transfer','deposit','check','mixed'])expect(pos).toContain(`value="${m}"`);
    expect(pos).toContain('invalidMixed');
  });

  it('el efectivo exige caja abierta; los demás métodos no',()=>{
    expect(pos).toContain("const requiresCash=method==='cash'||method==='mixed'");
    expect(pos).toContain('(!requiresCash||Boolean(session))');
  });

  it('el fallo del PDF NO revierte el pago ya contabilizado (§44)',()=>{
    expect(pos).toMatch(/Pago contabilizado \(\$\{result\.receipt_number\}\), pero el PDF no pudo adjuntarse/);
  });

  it('entrega del recibo: descarga PDF, correo y WhatsApp wa.me (§43, §87)',()=>{
    expect(pos).toContain('downloadReceiptPdf');
    expect(pos).toContain('emailReceipt');
    expect(pos).toContain('https://wa.me/');
  });

  it('reimpresión usa el snapshot de marca histórico e queda auditada (§45)',()=>{
    expect(pos).toContain('resolveBrand((data.brand_snapshot');
    expect(pos).toContain('recordPaymentReprint');
    expect(pos).toContain('copy:true');
  });

  it('anulación y devolución no borran el original (§44)',()=>{
    expect(pos).toContain('voidPayment({');
    expect(pos).toContain('refundPayment({');
    expect(pos).toContain('El documento original no se elimina');
  });

  it('la consola de caja ya no vive aquí (§46) — solo enlaza a /caja',()=>{
    expect(pos).not.toContain('openCashSession');
    expect(pos).not.toContain('closeCashSession');
    expect(pos).toContain('to="/caja"');
  });
});
