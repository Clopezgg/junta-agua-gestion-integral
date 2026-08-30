-- Semilla determinista para E2E real sobre la pila local de Supabase.
-- Se ejecuta DESPUÉS de aplicar las migraciones 001..034 (supabase start).
-- Crear único usuario de autenticación, orquestar la inicialización a través
-- de bootstrap_organization (circuito real) y sembrar un abonado con pegue
-- usando las RPC de negocio, todo bajo claims sintéticos aal2.

begin;

-- 1) Usuario de autenticación (contraseña con pgcrypto en esquema extensions).
insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,
  email_confirmed_at,recovery_sent_at,last_sign_in_at,
  raw_app_meta_data,raw_user_meta_data,confirmation_token,
  email_change,email_change_token_new,recovery_token,created_at,updated_at
)
values(
  '00000000-0000-0000-0000-000000000000',
  'e2e00000-0000-4000-8000-00000000e2e0',
  'authenticated','authenticated','e2e-demo@junta.test',
  extensions.crypt('E2e-Demo-2026!',extensions.gen_salt('bf')),
  now(),now(),now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"provider":"email"}'::jsonb,'','','','',now(),now()
);

insert into auth.identities(
  provider_id,user_id,identity_data,provider,
  last_sign_in_at,created_at,updated_at,id
)
values(
  'e2e00000-0000-4000-8000-00000000e2e0',
  'e2e00000-0000-4000-8000-00000000e2e0',
  '{"sub":"e2e00000-0000-4000-8000-00000000e2e0","email":"e2e-demo@junta.test","email_verified":false,"phone_verified":false}'::jsonb,
  'email',now(),now(),now(),
  'e2e00000-0000-4000-8000-00000000e2e0'
);

-- 2) Claims sintéticos (sub + rol + aal2) para las funciones security definer.
select set_config(
  'request.jwt.claims',
  '{"sub":"e2e00000-0000-4000-8000-00000000e2e0","role":"authenticated","aal":"aal2"}'::text,
  false
);

-- 3) Factor TOTP verificado con secreto determinista (semilla de código real);
--    "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ" = base32 de "12345678901234567890".
insert into auth.mfa_factors(
  id, user_id, friendly_name, factor_type, status, secret, created_at, updated_at
)
values(
  'e2ee0000-0000-4000-8000-00000000e2e0',
  'e2e00000-0000-4000-8000-00000000e2e0',
  'E2E', 'totp', 'verified',
  'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', now(), now()
);

-- 4) Inicialización real de la organización con el único usuario existente.
select public.bootstrap_organization('Junta de Agua Demo','E2E Administrator','admin');

-- 5) Datos de negocio a través de las RPC reales de la aplicación.
select public.create_tariff(jsonb_build_object(
  'code','CUOTA-2026','name','Cuota anual 2026','category','annual_fee',
  'description','Tarifa anual por pegue activo','amount',400,
  'is_annual',true,'valid_from','2026-01-01','valid_to','2026-12-31'
));

select public.create_subscriber(jsonb_build_object(
  'full_name','Lucía Rivas','document_type','dni','issuing_country','HN',
  'document_number','080119??0-00001','whatsapp','+50499990000',
  'email','lucia@junta.test','address','Barrio El Centro','sector','Centro',
  'birth_date','1960-05-01'
));

select public.create_water_connection(
  (select id from public.subscribers where organization_id=public.current_organization_id() limit 1),
  jsonb_build_object(
    'service_type','residential','meter_number','MT-00042',
    'address','Barrio El Centro','sector','Centro',
    'installation_date','2026-01-15','latitude',14.7692,'longitude',-87.99
  )
);

commit;