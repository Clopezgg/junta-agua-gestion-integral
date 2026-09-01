import { createClient } from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL as string|undefined; const key=import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined;
export const configured=Boolean(url&&key);
export const supabase=configured?createClient(url!,key!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;

// Tipos generados de la BD real (supabase gen types --linked). Fuente canónica para el
// código nuevo de dominio (§17). El cliente compartido sigue sin tipar hasta que cada
// milestone de dominio migre sus call sites; el código nuevo importa `Database` y
// castea sus consultas de forma explícita.
export type { Database } from './database.types';
