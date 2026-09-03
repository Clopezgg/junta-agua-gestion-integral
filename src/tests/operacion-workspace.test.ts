import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const ops=readFileSync('src/pages/Operations.tsx','utf8');
const inc=readFileSync('src/pages/Incidents.tsx','utf8');
const allowlist=readFileSync('docs/legacy-ui-allowlist.txt','utf8');

describe('Milestone J — Operación + Incidentes + Órdenes sobre design system (§46-48)',()=>{
  it('Operación e Incidencias salen del allowlist legacy y viven en el design system',()=>{
    for(const[name,src] of [['Operations',ops],['Incidents',inc]] as const){
      expect(src,name).toContain("from '../design-system/primitives'");
      expect(src,name).not.toContain('className="content"');
      expect(src,name).not.toContain('className="panel"');
      expect(src,name).not.toContain('className="modal"');
      expect(allowlist).not.toMatch(new RegExp(`^src/pages/${name}\\.tsx$`,'m'));
    }
  });

  it('Operación conserva órdenes, activos, mantenimiento e inventario y el cierre auditado',()=>{
    expect(ops).toContain('createWorkOrder');
    expect(ops).toContain('updateWorkOrderDetails');
    expect(ops).toContain('generatePreventiveWorkOrders');
    expect(ops).toContain('registerInventoryMovement');
    expect(ops).toContain('Finalizar orden y registrar historial');
    expect(ops).not.toContain('window.prompt');
  });

  it('Incidencias conserva el flujo reporte → triaje → orden y no inventa taxonomía',()=>{
    expect(inc).toContain('createIncident');
    expect(inc).toContain('updateIncident');
    expect(inc).toContain('convertToOrder');
    // usa el enum real incident_category, no categorías inventadas
    for(const c of ['fuga','calidad_agua','baja_presion','saneamiento','infraestructura'])expect(inc).toContain(`${c}:`);
  });
});
