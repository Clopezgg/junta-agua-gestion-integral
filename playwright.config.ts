import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'tests/e2e',
  fullyParallel:false,
  workers:1,
  retries:process.env.CI?1:0,
  timeout:60_000,
  expect:{timeout:15_000},
  reporter:process.env.CI?'github':'list',
  use:{
    baseURL:'http://127.0.0.1:4173',
    headless:true,
    viewport:{width:1280,height:800},
    trace:'retain-on-failure'
  },
  projects:[
    {name:'chromium',use:{browserName:'chromium'}}
  ],
  webServer:{
    command:'npm run build:render && vite preview --port 4173 --strictPort --host 127.0.0.1',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:false,
    timeout:420_000
  }
});