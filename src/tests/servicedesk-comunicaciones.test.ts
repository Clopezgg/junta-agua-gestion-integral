import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const sol=readFileSync('src/pages/Solicitudes.tsx','utf8');
const com=readFileSync('src/pages/Comunicaciones.tsx','utf8');
const allowlist=readFileSync('docs/legacy-ui-allowlist.txt','utf8');

describe('Milestone N — Solicitudes + Comunicaciones (§61-62)',()=>{
  it('ambas páginas están en el design system y fuera del allowlist',()=>{
    for(const[name,src] of [['Solicitudes',sol],['Comunicaciones',com]] as const){
      expect(src,name).toContain("from '../design-system/primitives'");
      expect(src,name).not.toContain('className="content"');
      expect(src,name).not.toContain('className="modal"');
      expect(allowlist).not.toMatch(new RegExp(`^src/pages/${name}\\.tsx$`,'m'));
    }
  });

  it('el service desk conserva SLA, asignación, estados y derivación a incidencia u orden',()=>{
    expect(sol).toContain('createServiceRequest');
    expect(sol).toContain('assignServiceRequest');
    expect(sol).toContain('setServiceRequestStatus');
    expect(sol).toContain('linkServiceRequestWorkOrder');
    expect(sol).toContain('deriveIncident');
    expect(sol).toContain('Atrasadas (SLA)');
  });

  it('Comunicaciones ofrece las plantillas §62 y los tres canales',()=>{
    for(const t of ['recibo','saldo','mora','convenio','interrupcion','emergencia','calidad','reunion'])expect(com).toContain(`'${t}'`);
    expect(com).toContain('shareWhatsApp');
    expect(com).toContain('sendEmail');
    expect(com).toContain('viaPrint');
    expect(com).toContain("communications.send");
  });
});
