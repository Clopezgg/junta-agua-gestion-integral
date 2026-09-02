import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const PAGES=['Calidad','Cloracion','Fuentes','Continuidad','Microcuenca'] as const;
const src=Object.fromEntries(PAGES.map(p=>[p,readFileSync(`src/pages/${p}.tsx`,'utf8')]));
const allowlist=readFileSync('docs/legacy-ui-allowlist.txt','utf8');
const service=readFileSync('src/features/water/service.ts','utf8');

describe('Milestone M — Agua y Ambiente sobre design system (§54-58)',()=>{
  it('las cinco páginas viven en el design system, fuera del allowlist y sin window.prompt',()=>{
    for(const p of PAGES){
      expect(src[p],p).toContain("from '../design-system/primitives'");
      expect(src[p],p).not.toContain('className="content"');
      expect(src[p],p).not.toContain('className="panel"');
      expect(src[p],p).not.toContain('prompt(');
      expect(allowlist).not.toMatch(new RegExp(`^src/pages/${p}\\.tsx$`,'m'));
    }
  });

  it('Calidad registra parámetros medidos sin inventar límites regulatorios (§55)',()=>{
    expect(src.Calidad).toContain('registerWaterSample');
    expect(src.Calidad).toContain('límites regulatorios');
    // no hay veredicto automático de cumplimiento hardcodeado
    expect(src.Calidad).not.toMatch(/(cumple|no cumple|potable|apto).*(0\.[0-9]|>=|<=)/i);
  });

  it('Continuidad y Microcuenca usan RPC del servicio, no supabase directo ni prompt',()=>{
    expect(src.Continuidad).toContain('createRationalization');
    expect(src.Microcuenca).toContain('registerWatershed');
    expect(service).toContain("rpc('create_rationalization'");
    expect(service).toContain("rpc('register_watershed'");
    expect(src.Continuidad).not.toContain("from '../lib/supabase'");
    expect(src.Microcuenca).not.toContain("from '../lib/supabase'");
  });
});
