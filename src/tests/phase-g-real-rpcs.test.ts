import {describe,expect,it} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const srcRoot='src';
const migrations=fs.readdirSync('supabase/migrations')
  .filter(name=>name.endsWith('.sql'))
  .sort();

function walk(dir:string):string[]{
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(dir,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}

const dbSql=migrations.map(file=>fs.readFileSync(path.join('supabase/migrations',file),'utf8')).join('\n');
const tsFiles=walk(srcRoot).filter(file=>file.endsWith('.ts')||file.endsWith('.tsx'));
const source=tsFiles.map(file=>fs.readFileSync(file,'utf8')).join('\n');

const rpcNames=[...new Set([...source.matchAll(/\brpc\(\s*'([a-z_0-9]+)'/gi)].map(match=>match[1]))];
const definedNames=[...new Set([...dbSql.matchAll(/create or replace function\s+public\.([a-z_0-9]+)\s*\(/gi)].map(match=>match[1].toLowerCase()))];

describe('auditoría fase G: ninguna pantalla invoca RPC fantasma',()=>{
 it('todas las RPC usadas por la interfaz existen en las migraciones',()=>{
  expect(rpcNames.length).toBeGreaterThan(0);
  const ghost=rpcNames.filter(name=>!definedNames.includes(name));
  expect(ghost,`RPC invocadas sin definición en migraciones: ${ghost.join(', ')}`).toEqual([]);
 });
 it('las pantallas operativas y financieras llaman al backend',()=>{
  // Páginas que por diseño no consultan datos de negocio (auth/MFA/UI sola).
  const noData=/(Security|Mfa|NotFound|ReceiptVisualStudio)\.tsx$/;
  const pages=[...new Set(walk('src/pages').filter(file=>file.endsWith('.tsx')&&!noData.test(file)))];
  const missing:Array<string>=[];
  for(const page of pages){
    const content=fs.readFileSync(page,'utf8');
    const serviceImports=[...content.matchAll(/from\s+'([^']*service[^']*)'/gi)].map(match=>match[1]);
    if(/\brpc\(|\.invoke\(|\.select\(|\.signIn\(/.test(content))continue;
    if(serviceImports.length===0){missing.push(page);continue;}
    let backed=false;
    for(const specifier of serviceImports){
      const base=path.join(path.dirname(page),specifier);
      for(const candidate of [base,`${base}.ts`,path.join(base,'index.ts')]){
        if(fs.existsSync(candidate)){
          const serviceContent=fs.readFileSync(candidate,'utf8');
          if(/\brpc\(|\.invoke\(|\.select\(/.test(serviceContent)){backed=true;break;}
        }
      }
      if(backed)break;
    }
    if(!backed)missing.push(page);
  }
  expect(missing,`pantallas sin respaldo real del backend: ${missing.join(', ')}`).toEqual([]);
 });
 it('el catálogo de funciones supera el centenar de procedimientos reales',()=>{
  expect(definedNames.length).toBeGreaterThan(100);
 });
});