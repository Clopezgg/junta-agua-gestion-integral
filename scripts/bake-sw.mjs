import{createHash}from'node:crypto';
import{readFileSync,writeFileSync}from'node:fs';

const pkg=JSON.parse(readFileSync('package.json','utf8'));
const version=pkg.version??'dev';
const shellFiles=['index.html','manifest.webmanifest','icons/icon.svg','health.txt'];
const parts=shellFiles.map(file=>{
  try{return readFileSync(`dist/${file}`)}catch{return Buffer.from(`${file}:missing`)}
});
const sha=createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0,8);
const template=readFileSync('public/sw.js','utf8');
const baked=template.replace(/^const CACHE='[^']*';$/m,`const CACHE='junta-agua-shell-v${version}-${sha}';`);
writeFileSync('dist/sw.js',baked);
console.log(`[bake-sw] service worker versionado: junta-agua-shell-v${version}-${sha}`);