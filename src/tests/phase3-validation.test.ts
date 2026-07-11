import { describe,expect,it } from 'vitest';
import { annualGenerationSchema,tariffSchema } from '../features/billing/validation';
describe('fase 3 - validaciones financieras',()=>{
 it('rechaza tarifas negativas',()=>expect(tariffSchema.safeParse({code:'AN',name:'Anual',category:'annual_fee',description:'',applies_to_service:'',is_annual:true,amount:-1,valid_from:'2026-01-01',valid_to:'',notes:''}).success).toBe(false));
 it('acepta una tarifa anual válida',()=>expect(tariffSchema.safeParse({code:'ANUAL',name:'Pago anual',category:'annual_fee',description:'',applies_to_service:'residential',is_annual:true,amount:1700,valid_from:'2026-01-01',valid_to:'',notes:''}).success).toBe(true));
 it('valida año y vencimiento',()=>expect(annualGenerationSchema.safeParse({tariff_definition_id:'c6cdb5d2-0bc0-4b7b-87b7-a4c6da77d95a',year:2026,due_date:'2026-12-31'}).success).toBe(true));
});
