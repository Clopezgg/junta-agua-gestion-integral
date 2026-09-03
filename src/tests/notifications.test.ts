import {describe,expect,it} from 'vitest';
import {deriveNotifications} from '../features/notifications/service';

describe('notifications center (§30)',()=>{
  it('un tablero vacío no genera avisos',()=>{
    expect(deriveNotifications({})).toEqual([]);
  });

  it('no inventa avisos cuando los contadores están en cero',()=>{
    expect(deriveNotifications({overdue_debt:0,pending_expenses:0,open_work_orders:0,low_stock:0})).toEqual([]);
  });

  it('genera avisos accionables con ruta real por cada contador positivo',()=>{
    const n=deriveNotifications({
      urgent_work_orders:2,overdue_debt:1500,pending_expenses:3,low_stock:4,import_errors:1,
    });
    const ids=n.map(x=>x.id);
    expect(ids).toEqual(expect.arrayContaining(['urgent-work-orders','overdue-debt','pending-expenses','low-stock','import-errors']));
    for(const item of n){
      expect(item.to.startsWith('/')).toBe(true);
      expect(item.title.length).toBeGreaterThan(0);
    }
  });

  it('las urgencias reales van marcadas como danger',()=>{
    const n=deriveNotifications({urgent_work_orders:1,import_errors:2});
    expect(n.every(x=>x.severity==='danger')).toBe(true);
  });

  it('caja cerrada es informativo, no urgente',()=>{
    const n=deriveNotifications({active_cash_session:false});
    expect(n).toHaveLength(1);
    expect(n[0]).toMatchObject({id:'cash-closed',severity:'info',to:'/caja'});
  });

  it('presupuesto aprobado no genera aviso; sin aprobar sí',()=>{
    expect(deriveNotifications({budget_status:'approved'})).toEqual([]);
    expect(deriveNotifications({budget_status:'draft'})[0]?.id).toBe('budget-pending');
  });
});
