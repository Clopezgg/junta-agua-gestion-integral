import {describe,expect,it} from 'vitest';
import {
  checkLegacyCssImports,
  checkLegacyClasses,
  checkUuidForms,
} from '../../scripts/enterprise-gates.mjs';

// Gates estáticos del Enterprise Rebuild (§15, §32, §125).
// Protegen la VERSIÓN FINAL: fallan si reaparece deuda legacy o si crece la lista de excepciones.

describe('enterprise legacy gate',()=>{
  it('ningún archivo (salvo src/main.tsx) importa CSS legacy',()=>{
    expect(checkLegacyCssImports()).toEqual([]);
  });

  it('las clases legacy sólo aparecen en archivos de docs/legacy-ui-allowlist.txt y la lista no crece',()=>{
    expect(checkLegacyClasses()).toEqual([]);
  });

  it('ningún formulario nuevo expone UUID/ID técnico',()=>{
    expect(checkUuidForms()).toEqual([]);
  });
});
