import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

type PackageInfo={version:string};
const pkg=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf-8')) as PackageInfo;
const version=process.env.VITE_APP_VERSION||pkg.version;
const commit=(process.env.RENDER_GIT_COMMIT||process.env.GITHUB_SHA||'local').slice(0,7);
const buildDate=process.env.VITE_APP_BUILD_DATE||new Date().toISOString();
const releaseUrl=process.env.VITE_APP_RELEASE_URL||`https://github.com/Clopezgg/junta-agua-gestion-integral/releases/tag/v${version}`;

export default defineConfig({
  plugins:[react()],
  define:{
    __APP_VERSION__:JSON.stringify(version),
    __APP_COMMIT_SHA__:JSON.stringify(commit),
    __APP_BUILD_DATE__:JSON.stringify(buildDate),
    __APP_RELEASE_URL__:JSON.stringify(releaseUrl)
  },
  test:{
    exclude:['tests/**','node_modules/**']
  }
});
