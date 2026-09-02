import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {hasRoute} from '../app/router/routeManifest';

const mig=readFileSync('supabase/migrations/202609010014_v6_portfolio.sql','utf8');
const page=readFileSync('src/pages/Cartera.tsx','utf8');
const bancos=readFileSync('src/pages/Bancos.tsx','utf8');
const morosidad=readFileSync('src/pages/Morosidad.tsx','utf8');
const service=readFileSync('src/features/arrears/service.ts','utf8');
const allowlist=readFileSync('docs/legacy-ui-allowlist.txt','utf8');

describe('Milestone H — Cartera y convenios (§34-38, §49-50)',()=>{
  it('migración 014: overview de cartera con aging, sector y mayores saldos',()=>{
    expect(mig).toContain('create or replace function public.get_portfolio_overview');
    expect(mig).toContain('security definer');
    expect(mig).toContain("has_permission('obligations.read')");
    expect(mig).toContain('obligation_balance');
    for(const b of ['por_vencer','d1_30','d31_60','d61_90','d90_mas'])expect(mig).toContain(`'${b}'`);
    expect(mig).toContain("'by_sector'");
    expect(mig).toContain("'top_debtors'");
  });

  it('migración 014: NO introduce suspensión automática ni política de mora embebida',()=>{
    expect(mig).not.toMatch(/update .*water_connections.*set.*status/i);
    expect(mig).not.toMatch(/suspend|corte autom|auto.?cut/i);
  });

  it('migración 014: workspace de convenios preserva la deuda y deriva estado',()=>{
    expect(mig).toContain('create or replace function public.list_arrangements_workspace');
    expect(mig).toContain("'display_status'");
    for(const s of ['al_dia','vencido','completado','cancelado'])expect(mig).toContain(`'${s}'`);
    // sólo lectura: el workspace no hace INSERT/UPDATE/DELETE
    expect(mig).not.toMatch(/\b(insert into|update payment_arrangements set|delete from)\b/i);
  });

  it('el servicio expone las RPC de cartera',()=>{
    expect(service).toContain("rpc('get_portfolio_overview'");
    expect(service).toContain("rpc('list_arrangements_workspace'");
  });

  it('la página Cartera vive en el design system y enruta',()=>{
    expect(hasRoute('cartera')).toBe(true);
    expect(page).toContain('ja-page');
    expect(page).toContain('Antigüedad de saldo');
    expect(page).toContain('getPortfolioOverview');
    expect(page).not.toContain('className="content"');
    expect(page).not.toContain('className="titlebar"');
  });

  it('Bancos y Morosidad migradas al design system (fuera del allowlist legacy)',()=>{
    expect(allowlist).not.toMatch(/^src\/pages\/Bancos\.tsx$/m);
    expect(allowlist).not.toMatch(/^src\/pages\/Morosidad\.tsx$/m);
    for(const src of [bancos,morosidad]){
      expect(src).toContain("from '../design-system/primitives'");
      expect(src).not.toContain('className="content"');
      expect(src).not.toContain('className="modal"');
      expect(src).not.toContain('className="panel"');
    }
    // la conciliación conserva el contraste banco/sistema y las acciones
    for(const label of ['Conciliar','Desvincular','Descartar'])expect(bancos).toContain(label);
    expect(bancos).toContain('ja-recon-grid');
  });
});
