// Enterprise Rebuild — static legacy gates (§15, §32, §125)
// Pure functions + fs scanners. Consumed by src/tests/enterprise-legacy-gate.test.ts and CI.
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join,relative} from 'node:path';

const ROOT=new URL('..',import.meta.url).pathname.replace(/\/$/,'');

export const LEGACY_CSS=[
  'styles.css','v2.css','v3.css','v3-card.css','portal.css','workflows.css',
  'receipt-studio.css','responsive.css',
  'styles/tokens.css','styles/base.css','styles/components.css','styles/layout.css',
];

// Only this file may import legacy stylesheets (it is the aggregation point,
// scheduled for teardown in Milestone V once every screen reaches parity).
export const CSS_IMPORT_ALLOWED=new Set(['src/main.tsx']);

const LEGACY_CLASS_RE=/\b(module-hero|titlebar)\b|className=["'][^"']*\b(panel|cards|shell|notice)\b/;
// UUID en formulario = placeholder "UUID", o un <input> de texto EDITABLE ligado a un campo `*_id`.
// Excluye radio/checkbox/hidden/file/date/number y campos readOnly (patrones legítimos).
const UUID_FORM_RE=/placeholder=["'][^"']*\b(UUID|uuid)\b|<input(?![^>]*\btype=["'](?:radio|checkbox|hidden|file|date|number)["'])(?![^>]*\breadOnly)[^>]*\bvalue=\{[^}]*\.\w+_id\b[^>]*\bonChange/;

export function listSourceFiles(dir=join(ROOT,'src')){
  const out=[];
  for(const entry of readdirSync(dir)){
    const full=join(dir,entry);
    const st=statSync(full);
    if(st.isDirectory()){out.push(...listSourceFiles(full));continue;}
    if(/\.(ts|tsx)$/.test(entry)&&!/\.d\.ts$/.test(entry))out.push(full);
  }
  return out;
}

export function readAllowlist(name){
  const raw=readFileSync(join(ROOT,'docs',name),'utf8');
  return new Set(raw.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')));
}

export function checkLegacyCssImports(){
  const violations=[];
  for(const file of listSourceFiles()){
    const rel=relative(ROOT,file);
    if(/\.test\.tsx?$/.test(rel))continue;
    const src=readFileSync(file,'utf8');
    for(const css of LEGACY_CSS){
      const re=new RegExp(`import\\s+['"][^'"]*${css.replace('.','\\.')}['"]`);
      if(re.test(src)&&!CSS_IMPORT_ALLOWED.has(rel)){
        violations.push(`${rel} importa CSS legacy '${css}'`);
      }
    }
  }
  return violations;
}

export function checkLegacyClasses(){
  const allow=readAllowlist('legacy-ui-allowlist.txt');
  const violations=[];
  const stillLegacy=[];
  for(const file of listSourceFiles()){
    const rel=relative(ROOT,file);
    if(/\.test\.tsx?$/.test(rel)||!rel.endsWith('.tsx'))continue;
    const src=readFileSync(file,'utf8');
    if(LEGACY_CLASS_RE.test(src)){
      stillLegacy.push(rel);
      if(!allow.has(rel))violations.push(`${rel} usa clases legacy y NO está en docs/legacy-ui-allowlist.txt`);
    }
  }
  // La lista no puede crecer respecto a su snapshot ni contener entradas obsoletas.
  for(const entry of allow){
    if(!stillLegacy.includes(entry)){
      violations.push(`docs/legacy-ui-allowlist.txt lista '${entry}' que ya no usa clases legacy — elimínalo (progreso del rebuild)`);
    }
  }
  return violations;
}

export function checkUuidForms(){
  const allow=readAllowlist('legacy-uuid-allowlist.txt');
  const violations=[];
  for(const file of listSourceFiles()){
    const rel=relative(ROOT,file);
    if(/\.test\.tsx?$/.test(rel)||!rel.endsWith('.tsx'))continue;
    const src=readFileSync(file,'utf8');
    if(UUID_FORM_RE.test(src)&&!allow.has(rel)){
      violations.push(`${rel} expone UUID/ID técnico en un formulario (§32) — usa un picker humano`);
    }
  }
  return violations;
}

export function runAllGates(){
  return [
    ...checkLegacyCssImports(),
    ...checkLegacyClasses(),
    ...checkUuidForms(),
  ];
}

// CLI: `node scripts/enterprise-gates.mjs`
if(import.meta.url===`file://${process.argv[1]}`){
  const v=runAllGates();
  if(v.length){console.error('ENTERPRISE GATES FAILED:\n'+v.map(x=>' - '+x).join('\n'));process.exit(1);}
  console.log('Enterprise legacy gates: OK');
}
