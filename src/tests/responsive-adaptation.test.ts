import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const layout=readFileSync('src/components/Layout.tsx','utf8');
const css=readFileSync('src/responsive.css','utf8');
const main=readFileSync('src/main.tsx','utf8');

describe('adaptación responsive multiplataforma',()=>{
  it('incluye navegación móvil completa sin quitar el menú lateral de módulos',()=>{
    expect(layout).toContain('mobile-quick-nav');
    expect(layout).toContain('mobile-context-bar');
    expect(layout).toContain('setNavOpen(true)');
    expect(layout).toContain('Modo móvil seguro');
  });

  it('define breakpoints para escritorio, tablet, móvil y pantallas pequeñas',()=>{
    for(const token of ['@media(min-width:1280px)','@media(max-width:1180px)','@media(max-width:900px)','@media(max-width:640px)','@media(max-width:420px)'])expect(css).toContain(token);
  });

  it('optimiza interacción táctil, safe areas y navegación inferior móvil',()=>{
    expect(css).toContain('--mobile-nav-height');
    expect(css).toContain('env(safe-area-inset-bottom,0px)');
    expect(css).toContain('@media(pointer:coarse)');
    expect(css).toContain('.mobile-quick-nav');
    expect(css).toContain('100dvh');
  });

  it('carga la hoja responsive al final para sobrescribir estilos base',()=>{
    expect(main.trim().split('\n').at(-1)).not.toContain('responsive.css');
    expect(main).toContain("import './responsive.css';");
    expect(main.indexOf("receipt-studio.css'")).toBeLessThan(main.indexOf("responsive.css'"));
  });
});
