import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const PAGES=['Ersaps','Calendario','Transparencia'] as const;
const src=Object.fromEntries(PAGES.map(p=>[p,readFileSync(`src/pages/${p}.tsx`,'utf8')])) as Record<typeof PAGES[number],string>;
const allowlist=readFileSync('docs/legacy-ui-allowlist.txt','utf8');

describe('Milestone P — Cumplimiento (ERSAPS / Calendario / Transparencia)',()=>{
  it('las pantallas de cumplimiento están en el design system y fuera del allowlist',()=>{
    for(const p of PAGES){
      expect(src[p],p).toContain("from '../design-system/primitives'");
      expect(src[p],p).not.toContain('className="content"');
      expect(src[p],p).not.toContain('module-hero');
      expect(src[p],`${p} usa window.prompt`).not.toMatch(/\bprompt\(/);
      expect(allowlist).not.toMatch(new RegExp(`^src/pages/${p}\\.tsx$`,'m'));
    }
  });

  it('ERSAPS deja claro que registrar ≠ cumplir: requiere validación institucional (sin claims falsos)',()=>{
    expect(src.Ersaps).toMatch(/no implica cumplimiento legal/i);
    expect(src.Ersaps).toContain('registerCompliance');
    expect(src.Ersaps).toContain('upsertComplianceStatus');
    expect(src.Ersaps).toMatch(/fuente\/versión/i);
  });

  it('Transparencia y Calendario leen de RPC reales de compliance',()=>{
    expect(src.Transparencia).toContain('getTransparencyReport');
    expect(src.Calendario).toContain('listCalendarEvents');
    expect(src.Calendario).toContain('createCalendarEvent');
  });
});
