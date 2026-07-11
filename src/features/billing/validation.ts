import { z } from 'zod';
export const tariffCategories=['annual_fee','new_connection','reconnection','late_fee','repair','ownership_change','inspection','fine','other'] as const;
export const serviceTypes=['','residential','commercial','community','institutional'] as const;
export const tariffSchema=z.object({
 code:z.string().trim().min(2,'El código debe tener al menos 2 caracteres.').max(30),
 name:z.string().trim().min(3,'El nombre debe tener al menos 3 caracteres.').max(120),
 category:z.enum(tariffCategories),description:z.string().max(500).default(''),
 applies_to_service:z.enum(serviceTypes),is_annual:z.boolean(),
 amount:z.coerce.number().min(0,'El valor no puede ser negativo.').max(999999999.99),
 valid_from:z.string().min(1,'La fecha de vigencia es obligatoria.'),valid_to:z.string().default(''),notes:z.string().max(500).default('')
}).refine(x=>!x.valid_to||x.valid_to>=x.valid_from,{message:'La fecha final no puede ser anterior a la inicial.',path:['valid_to']});
export const annualGenerationSchema=z.object({tariff_definition_id:z.string().uuid(),year:z.coerce.number().int().min(2000).max(2100),due_date:z.string().min(1,'La fecha de vencimiento es obligatoria.')});
export type TariffInput=z.infer<typeof tariffSchema>;
export type AnnualGenerationInput=z.infer<typeof annualGenerationSchema>;
