import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'tests/e2e',
  fullyParallel:true,
  retries:process.env.CI?2:0,
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
    {name:'chromium',use:{browserName:'chromium'}},
    {name:'mobile-chromium',use:{browserName:'chromium',viewport:{width:375,height:667}}}
  ],
  webServer:{
    command:'npm run build:render && vite preview --port 4173 --strictPort',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:false,
    timeout:240_000
  }
});