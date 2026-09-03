import {describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {hasRoute} from '../app/router/routeManifest';

describe('abonados — listado profesional (§33, §103)',()=>{
  it('la ruta /abonados monta la lista y /abonados/registro el expediente',()=>{
    expect(hasRoute('abonados')).toBe(true);
    expect(hasRoute('abonados/registro')).toBe(true);
  });

  it('la lista pagina en el servidor y filtra por estado, sector, saldo y beneficio',()=>{
    const page=readFileSync('src/pages/AbonadosList.tsx','utf8');
    expect(page).toContain('listSubscribers');
    expect(page).toMatch(/limit:PAGE/);
    expect(page).toMatch(/offset:page\*PAGE/);
    for(const f of ['status','sector','balance','benefit'])expect(page).toContain(`aria-label="${f==='status'?'Estado':f==='sector'?'Sector':f==='balance'?'Saldo':'Beneficio'}"`);
  });

  it('la migración expone list_subscribers con el contrato {total, rows, sectors}',()=>{
    const mig=readFileSync('supabase/migrations/202609010010_v6_subscriber_list.sql','utf8');
    expect(mig).toContain('function public.list_subscribers');
    expect(mig).toContain("'total'");
    expect(mig).toContain("'rows'");
    expect(mig).toContain("'sectors'");
    // saldo por abonado calculado en el servidor, no en el cliente
    expect(mig).toContain('obligation_balance');
    // último pago excluye anulados
    expect(mig).toContain("p.status<>'voided'");
    // beneficio real
    expect(mig).toContain('subscriber_benefits');
  });

  it('listSubscribers normaliza la respuesta a un contrato estable',async()=>{
    vi.resetModules();
    vi.doMock('../lib/supabase',()=>({supabase:{rpc:vi.fn().mockResolvedValue({data:null,error:null})}}));
    const {listSubscribers}=await import('../features/subscribers/service');
    await expect(listSubscribers()).resolves.toEqual({total:0,rows:[],sectors:[]});
    vi.doUnmock('../lib/supabase');
  });
});
