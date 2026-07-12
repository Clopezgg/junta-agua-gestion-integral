#!/usr/bin/env node
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

const mode=process.argv.includes('--staging')?'staging':'offline';
const requiredFiles=[
  'package-lock.json',
  'supabase/migrations/202607110031_production_readiness_fixes.sql',
  'docs/OPERACION-SOPORTE-RECUPERACION.md',
  'docs/commercial/TERMINOS-SERVICIO.md',
  'docs/commercial/POLITICA-PRIVACIDAD.md',
  'docs/commercial/VALIDACION-COMERCIAL.md'
];
const requiredEnv=['SUPABASE_STAGING_URL','SUPABASE_STAGING_ANON_KEY','SUPABASE_STAGING_SERVICE_ROLE_KEY','RENDER_SERVICE_ID','RENDER_API_KEY'];
const checks=[];
function ok(name,details=''){checks.push({name,status:'ok',details});}
function fail(name,details=''){checks.push({name,status:'fail',details});}
function commandExists(command){try{execFileSync('bash',['-lc',`command -v ${command}`],{stdio:'ignore'});return true;}catch{return false;}}

for(const file of requiredFiles)existsSync(file)?ok(`archivo:${file}`):fail(`archivo:${file}`,'No existe');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
pkg.scripts?.['test:e2e']?ok('script:test:e2e',pkg.scripts['test:e2e']):fail('script:test:e2e','Falta script E2E');
pkg.scripts?.['readiness:staging']?ok('script:readiness:staging',pkg.scripts['readiness:staging']):fail('script:readiness:staging','Falta script staging');

const migration=readFileSync('supabase/migrations/202607110031_production_readiness_fixes.sql','utf8');
for(const token of ['calculation_snapshot','senior_discount_applied','ANNUAL_DUE_DATE_MUST_BE_NOVEMBER_30','verify_receipt_public']){
  migration.includes(token)?ok(`migracion:${token}`):fail(`migracion:${token}`,'Token requerido no encontrado');
}

if(mode==='staging'){
  for(const env of requiredEnv)process.env[env]?ok(`env:${env}`):fail(`env:${env}`,'Variable requerida para validación/deploy staging');
  for(const command of ['supabase','psql','curl'])commandExists(command)?ok(`bin:${command}`):fail(`bin:${command}`,'Binario requerido no está instalado');
}else{
  ok('modo:offline','No se requieren credenciales externas; valida artefactos versionados y documentación');
}

const failed=checks.filter(item=>item.status==='fail');
console.table(checks);
if(failed.length){
  console.error(`Commercial readiness ${mode} failed: ${failed.length} blocker(s).`);
  process.exit(1);
}
console.log(`Commercial readiness ${mode} passed.`);
