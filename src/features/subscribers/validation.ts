import { z } from 'zod';
export const normalizeName=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-ZÑ ]/g,' ').replace(/\s+/g,' ').trim();
export const normalizeIdentifier=(v:string)=>v.toUpperCase().replace(/[^A-Z0-9]/g,'');
export const normalizePhone=(v:string)=>v.replace(/\D/g,'').replace(/^504/,'');
export const maskIdentifier=(v:string)=>{const n=normalizeIdentifier(v); return n.length<5?'****':`${n.slice(0,4)}-${'*'.repeat(Math.max(4,n.length-8))}-${n.slice(-4)}`};
export const subscriberSchema=z.object({full_name:z.string().min(5),document_type:z.enum(['dni','passport','other']),document_number:z.string().min(5),issuing_country:z.string().length(3).default('HND'),whatsapp:z.string().min(8),address:z.string().min(5),sector:z.string().min(2),email:z.string().email().optional().or(z.literal('')),birth_date:z.string().optional(),notes:z.string().optional()});
export const connectionSchema=z.object({service_type:z.enum(['residential','commercial','community','institutional']),address:z.string().min(5),sector:z.string().min(2),meter_number:z.string().optional(),installation_date:z.string().optional(),latitude:z.number().min(-90).max(90).optional(),longitude:z.number().min(-180).max(180).optional(),notes:z.string().optional()});
export type SubscriberInput=z.infer<typeof subscriberSchema>; export type ConnectionInput=z.infer<typeof connectionSchema>;
