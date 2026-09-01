import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/202607110031_production_readiness_fixes.sql','utf8');
const payments=fs.readFileSync('src/pages/Payments.tsx','utf8');
const sw=fs.readFileSync('public/sw.js','utf8');
const workflow=fs.readFileSync('.github/workflows/validate.yml','utf8');
const render=fs.readFileSync('render.yaml','utf8');

describe('production readiness hardening',()=>{
  it('uses reproducible npm installs in CI and Render',()=>{
    expect(fs.existsSync('package-lock.json')).toBe(true);
    expect(workflow).toContain('npm ci --include=dev');
    expect(workflow).not.toContain('test ! -f package-lock.json');
    expect(render).toContain('npm ci --include=dev');
  });

  it('versions the service worker with the application release',()=>{
    expect(sw).toContain("junta-agua-shell-v3.1.1");
    expect(sw).not.toContain('v2.1.0');
  });

  it('snapshots annual senior discounts into generated obligations',()=>{
    expect(migration).toContain('add column if not exists base_amount');
    expect(migration).toContain('calculation_snapshot');
    expect(migration).toContain('senior_discount_applied');
    expect(migration).toContain('ANNUAL_DUE_DATE_MUST_BE_NOVEMBER_30');
    expect(migration).toContain('on conflict(organization_id,connection_id,tariff_definition_id,period_key) do nothing');
  });

  it('feeds annual receipt fields from persisted payment data',()=>{
    expect(payments).toContain('const data=await getPaymentReceiptData(result.id)');
    expect(payments).toContain('maskedIdentity:data.masked_identity');
    expect(payments).toContain('connectionCodes:(data.connection_codes');
    expect(payments).toContain('discountAmount:discount');
  });
});
