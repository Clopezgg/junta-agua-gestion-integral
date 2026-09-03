-- V6 · Milestone O — Gobierno: selector de personas y listado de comités.
-- Elimina la necesidad de teclear un UUID en el formulario de Junta Directiva (§5, §90).
-- Sólo lectura; no altera tablas ni enums.
begin;

-- Personas del registro maestro, para el "persona picker" de cargos institucionales.
create or replace function public.list_governance_persons(p_query text default null)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'full_name',p.full_name,
    'document_number',p.document_number,'sector',p.sector
  ) order by p.full_name),'[]'::jsonb)
  from public.persons p
  where p.organization_id=public.current_organization_id()
    and (public.has_permission('governance.read') or public.has_permission('subscribers.read'))
    and (p_query is null or p.normalized_name like '%'||lower(coalesce(p_query,''))||'%'
         or coalesce(p.document_number,'') like '%'||coalesce(p_query,'')||'%')
$$;
grant execute on function public.list_governance_persons(text) to authenticated;

-- Comités de la JAA con su tipo y propósito (antes se leía por tabla directa desde la UI).
create or replace function public.list_committees()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select case when not public.has_permission('governance.read') then '[]'::jsonb
    else coalesce(jsonb_agg(jsonb_build_object(
      'id',c.id,'name',c.name,'committee_type',c.committee_type,'purpose',c.purpose,'active',c.active
    ) order by c.name),'[]'::jsonb) end
  from public.committees c
  where c.organization_id=public.current_organization_id()
$$;
grant execute on function public.list_committees() to authenticated;

commit;
