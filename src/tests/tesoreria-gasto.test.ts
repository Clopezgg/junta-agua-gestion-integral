import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {hasRoute} from '../app/router/routeManifest';

const expenses=readFileSync('src/pages/Expenses.tsx','utf8');
const compras=readFileSync('src/pages/Compras.tsx','utf8');
const budget=readFileSync('src/pages/Budget.tsx','utf8');
const allowlist=readFileSync('docs/legacy-ui-allowlist.txt','utf8');

describe('Milestone I — Gastos + Compras + Presupuesto sobre design system (§40-42)',()=>{
  it('las tres páginas viven en el design system y fuera del allowlist legacy',()=>{
    for(const[name,src] of [['Expenses',expenses],['Compras',compras],['Budget',budget]] as const){
      expect(src,name).toContain("from '../design-system/primitives'");
      expect(src,name).not.toContain('className="content"');
      expect(src,name).not.toContain('className="titlebar"');
      expect(src,name).not.toContain('className="panel"');
      expect(src,name).not.toContain('className="modal"');
      expect(allowlist).not.toMatch(new RegExp(`^src/pages/${name}\\.tsx$`,'m'));
    }
  });

  it('Gastos conserva el circuito solicitud → aprobación → comprobación con factura',()=>{
    expect(expenses).toContain('createExpenseRequest');
    expect(expenses).toContain('approveExpense');
    expect(expenses).toContain('confirmExpense');
    expect(expenses).toContain('uploadExpenseEvidence');
    expect(expenses).toContain('El número de factura es obligatorio.');
  });

  it('Compras conserva creación de orden y recepción en bodega',()=>{
    expect(compras).toContain('createPurchaseOrder');
    expect(compras).toContain('receivePurchaseOrder');
    expect(compras).toContain('Recibir en bodega');
  });

  it('Presupuesto conserva periodo fiscal, rubros, aprobación con MFA y semáforo',()=>{
    expect(budget).toContain('saveFiscalPeriod');
    expect(budget).toContain('saveBudgetLine');
    expect(budget).toContain('approveBudget');
    expect(budget).toContain('Presupuesto vs. ejecutado');
    expect(budget).toMatch(/<h1>\s*Presupuesto\s*<\/h1>/);
    expect(hasRoute('presupuesto')).toBe(true);
  });
});
