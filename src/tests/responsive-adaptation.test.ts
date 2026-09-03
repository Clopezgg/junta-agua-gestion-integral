import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';

const shell=readFileSync('src/layouts/AppShell.tsx','utf8');
const nav=readFileSync('src/layouts/navigation.tsx','utf8');
const css=readFileSync('src/responsive.css','utf8');
const main=readFileSync('src/main.tsx','utf8');

describe('adaptación responsive multiplataforma',()=>{
  it('el shell del design system tiene barra móvil inferior + menú lateral completo (drawer)',()=>{
    expect(shell).toContain('ja-mobile-nav');
    expect(shell).toContain('ja-nav-mobile-link');
    expect(shell).toContain('setMobileOpen(true)');
    expect(shell).toContain('ja-sidebar');
    // "Más" abre el cajón con todos los módulos.
    expect(shell).toContain('Más');
    expect(nav).toContain('mobileNav');
    expect(nav).toContain('primaryNav');
  });

  it('define breakpoints para escritorio, tablet, móvil y pantallas pequeñas',()=>{
    for(const token of ['@media(min-width:1280px)','@media(max-width:1180px)','@media(max-width:900px)','@media(max-width:640px)','@media(max-width:420px)'])expect(css).toContain(token);
  });

  it('optimiza interacción táctil, safe areas y navegación inferior móvil',()=>{
    expect(css).toContain('--mobile-nav-height');
    expect(css).toContain('env(safe-area-inset-bottom,0px)');
    expect(css).toContain('@media(pointer:coarse)');
    expect(css).toContain('100dvh');
  });

  it('carga la hoja responsive al final para sobrescribir estilos base',()=>{
    expect(main).toContain("import './responsive.css';");
    expect(main.indexOf("receipt-studio.css'")).toBeLessThan(main.indexOf("responsive.css'"));
  });
});
