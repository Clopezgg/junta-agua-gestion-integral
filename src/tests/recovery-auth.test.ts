import {describe,expect,it} from 'vitest';
import {formatCooldown,readRecoveryTokensFromHash} from '../features/auth/service';

describe('recuperación de acceso — helpers',()=>{
  it('lee tokens de recuperación del hash',()=>{
    const r=readRecoveryTokensFromHash('#access_token=abc&refresh_token=xyz&type=recovery');
    expect(r).toEqual({accessToken:'abc',refreshToken:'xyz',type:'recovery'});
  });
  it('acepta hash sin refresh token',()=>{
    const r=readRecoveryTokensFromHash('#access_token=abc');
    expect(r?.accessToken).toBe('abc');
  });
  it('devuelve null sin access_token',()=>{
    expect(readRecoveryTokensFromHash('#type=recovery')).toBeNull();
    expect(readRecoveryTokensFromHash('')).toBeNull();
  });
  it('formatea cooldown en minutos y segundos',()=>{
    expect(formatCooldown(125)).toBe('2 min 5 s');
    expect(formatCooldown(30)).toBe('0 min 30 s');
  });
});