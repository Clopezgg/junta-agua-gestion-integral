import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const PAGES=['Asamblea','JuntaDirectiva','Reuniones','Resoluciones','Proyectos','Comites'] as const;
const src=Object.fromEntries(PAGES.map(p=>[p,readFileSync(`src/pages/${p}.tsx`,'utf8')])) as Record<typeof PAGES[number],string>;
const allowlist=readFileSync('docs/legacy-ui-allowlist.txt','utf8');
const uuidAllowlist=readFileSync('docs/legacy-uuid-allowlist.txt','utf8');
const migration=readFileSync('supabase/migrations/202609010015_v6_governance_persons.sql','utf8');

describe('Milestone O — Junta / Gobierno (§63-66)',()=>{
  it('todas las pantallas de gobierno están en el design system y fuera del allowlist',()=>{
    for(const p of PAGES){
      expect(src[p],p).toContain("from '../design-system/primitives'");
      expect(src[p],p).not.toContain('className="content"');
      expect(src[p],p).not.toContain('module-hero');
      expect(src[p],`${p} usa window.prompt`).not.toMatch(/\bprompt\(/);
      expect(allowlist).not.toMatch(new RegExp(`^src/pages/${p}\\.tsx$`,'m'));
    }
  });

  it('Junta Directiva usa un persona-picker, no un input de UUID (§64)',()=>{
    expect(src.JuntaDirectiva).toContain('listGovernancePersons');
    expect(src.JuntaDirectiva).toContain('Seleccione una persona');
    expect(src.JuntaDirectiva).not.toMatch(/placeholder="UUID/i);
    // El allowlist de UUID-en-formulario ya no lista ningún archivo.
    expect(uuidAllowlist).not.toMatch(/^src\//m);
  });

  it('la migración 015 añade selectores de sólo lectura sin tocar tablas ni enums',()=>{
    expect(migration).toContain('create or replace function public.list_governance_persons');
    expect(migration).toContain('create or replace function public.list_committees');
    expect(migration).not.toMatch(/\b(alter table|drop|create table|create type)\b/i);
  });

  it('el cargo institucional se mantiene separado del rol de software (§64)',()=>{
    expect(src.JuntaDirectiva).toMatch(/no es un rol del sistema/i);
  });
});
