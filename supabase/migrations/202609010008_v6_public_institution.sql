-- V6 · 052 · Identidad pública de la institución (pantalla de acceso).
-- Expone SOLO nombre y ruta de logo para el login pre-autenticación.
-- NO expone datos financieros, abonados ni configuraciones internas.

create or replace function public.get_public_institution()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'name', o.name,
    'logo_path', o.logo_path
  )
  from public.organizations o
  order by o.created_at asc
  limit 1;
$$;

grant execute on function public.get_public_institution() to anon, authenticated;

commit;