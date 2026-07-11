import{describe,it,expect}from'vitest';import{readFileSync}from'node:fs';import{resolve}from'node:path';
const read=(name:string)=>readFileSync(resolve(process.cwd(),'supabase/migrations',name),'utf8').toLowerCase();
describe('Fases 4 a 10 — invariantes estructurales',()=>{
 const p4=read('202607110004_phase4_payments_cash.sql');const p5=read('202607110005_phase5_expenses_balance.sql');const p6=read('202607110006_phase6_reports.sql');const p7=read('202607110007_phase7_integrations.sql');const p8=read('202607110008_phase8_operations.sql');const p9=read('202607110009_phase9_release.sql');const p10=read('202607110010_audit_repair_users.sql');
 it('pago, asignaciones, correlativo y caja son atómicos en servidor',()=>{expect(p4).toContain('register_payment');expect(p4).toContain('next_document_number');expect(p4).toContain('for update');expect(p4).toContain('payment_allocations');expect(p4).toContain('one_open_cash_session_per_user')});
 it('impide escrituras financieras directas',()=>expect(p4).toContain('revoke insert,update,delete'));
 it('gasto exige aprobación ajena, MFA y factura',()=>{expect(p5).toContain('self_approval_forbidden');expect(p5).toContain('invoice_required');expect(p5).toContain("aal2");expect(p5).toContain('ledger_entries')});
 it('anulaciones y devoluciones corrigen el libro mayor',()=>{expect(p5).toContain('ledger_payment_event_trigger');expect(p5).toContain("'refund'");expect(p5).toContain("'adjustment'")});
 it('dashboard e informe anual provienen del libro mayor',()=>{expect(p6).toContain('get_financial_dashboard');expect(p6).toContain('get_transparency_report');expect(p6).toContain('expenses_detail')});
 it('integraciones no guardan secretos en configuración pública',()=>{expect(p7).toContain('public_config');expect(p7).toContain('secret_configured');expect(p7).not.toContain("p_config jsonb")});
 it('inventario impide stock negativo y permite crear materiales',()=>{expect(p8).toContain('insufficient_stock');expect(p8).toContain('create_inventory_item');expect(p8).toContain('create_work_order')});
 it('fase de lanzamiento agrega índices y salud',()=>{expect(p9).toContain('system_health_checks');expect(p9).toContain('create index')});
 it('usuarios y documentos quedan auditados',()=>{expect(p10).toContain('list_organization_users');expect(p10).toContain('set_user_status');expect(p10).toContain('attach_identity_document')});
 it('todas las fases usan el contrato original de permisos',()=>{for(const sql of[p4,p5,p6,p7,p8]){expect(sql).toContain('permission_code');expect(sql).toContain('permissions(code,description)');expect(sql).not.toContain('permission_id');expect(sql).not.toContain('permissions(code,name)')}});
});
