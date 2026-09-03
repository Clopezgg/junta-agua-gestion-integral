-- =============================================================================
-- V6 · Milestone D — Asistente de configuración inicial (§25)
-- Perfil institucional (identidad, ubicación, representación legal, servicio) +
-- progreso persistente del asistente. Sin datos inventados: todo lo llena el usuario.
-- Corrige además una pérdida de datos en update_organization_settings (§152):
-- la versión previa ponía a NULL address/phone/email/rtn/etc. cuando la clave
-- no venía en el payload; ahora sólo toca las claves presentes (merge real).
-- =============================================================================

alter table public.organizations
  add column if not exists department text,
  add column if not exists municipality text,
  add column if not exists community text,
  add column if not exists legal_representative_name text,
  add column if not exists legal_representative_title text,
  add column if not exists incorporation_reference text,
  add column if not exists founding_date date,
  add column if not exists service_type text,
  add column if not exists metering_enabled boolean not null default false,
  add column if not exists setup_progress jsonb not null default '{}'::jsonb,
  add column if not exists setup_completed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='organizations_service_type_valid') then
    alter table public.organizations
      add constraint organizations_service_type_valid
      check (service_type is null or service_type in ('agua','agua_alcantarillado','agua_saneamiento'));
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- update_organization_settings — merge por clave (no borra lo ausente)
-- -----------------------------------------------------------------------------
create or replace function public.update_organization_settings(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  old_row public.organizations%rowtype;
  new_row public.organizations%rowtype;
  v_txt   text;
begin
  if not public.has_permission('settings.manage')
     or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;

  select * into old_row from public.organizations
  where id=public.current_organization_id() for update;
  if not found then raise exception 'ORG_NOT_FOUND'; end if;

  update public.organizations set
    name                     = case when p_payload ? 'name' then coalesce(nullif(trim(p_payload->>'name'),''),name) else name end,
    address                  = case when p_payload ? 'address' then nullif(trim(p_payload->>'address'),'') else address end,
    phone                    = case when p_payload ? 'phone' then nullif(trim(p_payload->>'phone'),'') else phone end,
    email                    = case when p_payload ? 'email' then nullif(trim(p_payload->>'email'),'') else email end,
    rtn                      = case when p_payload ? 'rtn' then nullif(trim(p_payload->>'rtn'),'') else rtn end,
    logo_path                = case when p_payload ? 'logo_path' then nullif(trim(p_payload->>'logo_path'),'') else logo_path end,
    signature_path           = case when p_payload ? 'signature_path' then nullif(trim(p_payload->>'signature_path'),'') else signature_path end,
    stamp_path               = case when p_payload ? 'stamp_path' then nullif(trim(p_payload->>'stamp_path'),'') else stamp_path end,
    receipt_signatory_name   = case when p_payload ? 'receipt_signatory_name' then nullif(trim(p_payload->>'receipt_signatory_name'),'') else receipt_signatory_name end,
    receipt_signatory_title  = case when p_payload ? 'receipt_signatory_title' then nullif(trim(p_payload->>'receipt_signatory_title'),'') else receipt_signatory_title end,
    receipt_template_version = case when p_payload ? 'receipt_template_version' then coalesce(nullif(trim(p_payload->>'receipt_template_version'),''),'2.0') else receipt_template_version end,
    receipt_footer           = case when p_payload ? 'receipt_footer' then nullif(trim(p_payload->>'receipt_footer'),'') else receipt_footer end,
    currency                 = case when p_payload ? 'currency' then coalesce(nullif(trim(p_payload->>'currency'),''),'HNL') else currency end,
    department               = case when p_payload ? 'department' then nullif(trim(p_payload->>'department'),'') else department end,
    municipality             = case when p_payload ? 'municipality' then nullif(trim(p_payload->>'municipality'),'') else municipality end,
    community                = case when p_payload ? 'community' then nullif(trim(p_payload->>'community'),'') else community end,
    legal_representative_name  = case when p_payload ? 'legal_representative_name' then nullif(trim(p_payload->>'legal_representative_name'),'') else legal_representative_name end,
    legal_representative_title = case when p_payload ? 'legal_representative_title' then nullif(trim(p_payload->>'legal_representative_title'),'') else legal_representative_title end,
    incorporation_reference  = case when p_payload ? 'incorporation_reference' then nullif(trim(p_payload->>'incorporation_reference'),'') else incorporation_reference end,
    founding_date            = case when p_payload ? 'founding_date' then nullif(trim(p_payload->>'founding_date'),'')::date else founding_date end,
    service_type             = case when p_payload ? 'service_type' then nullif(trim(p_payload->>'service_type'),'') else service_type end,
    metering_enabled         = case when p_payload ? 'metering_enabled' then coalesce((p_payload->>'metering_enabled')::boolean,metering_enabled) else metering_enabled end
  where id=old_row.id
  returning * into new_row;

  perform public.write_audit_event('update','organization_settings',new_row.id::text,
    to_jsonb(old_row),to_jsonb(new_row),'Actualización de configuración institucional');
  return public.get_organization_settings();
end $$;

-- -----------------------------------------------------------------------------
-- get_organization_settings — incluye perfil institucional y estado del asistente
-- -----------------------------------------------------------------------------
create or replace function public.get_organization_settings()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',o.id,'name',o.name,'address',o.address,'phone',o.phone,'email',o.email,'rtn',o.rtn,
    'logo_path',o.logo_path,'signature_path',o.signature_path,'stamp_path',o.stamp_path,
    'receipt_signatory_name',o.receipt_signatory_name,'receipt_signatory_title',o.receipt_signatory_title,
    'receipt_template_version',o.receipt_template_version,'receipt_footer',o.receipt_footer,'currency',o.currency,
    'department',o.department,'municipality',o.municipality,'community',o.community,
    'legal_representative_name',o.legal_representative_name,'legal_representative_title',o.legal_representative_title,
    'incorporation_reference',o.incorporation_reference,'founding_date',o.founding_date,
    'service_type',o.service_type,'metering_enabled',o.metering_enabled,
    'setup_progress',o.setup_progress,'setup_completed_at',o.setup_completed_at
  )
  from public.organizations o
  where o.id=public.current_organization_id()
    and (public.has_permission('settings.read') or public.has_permission('settings.manage') or public.has_permission('payments.read'));
$$;

-- -----------------------------------------------------------------------------
-- save_setup_progress — guarda el avance del asistente sin cerrar la configuración
-- -----------------------------------------------------------------------------
create or replace function public.save_setup_progress(p_progress jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare merged jsonb;
begin
  if not public.has_permission('settings.manage')
     or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;
  if jsonb_typeof(p_progress) is distinct from 'object' then
    raise exception 'INVALID_PROGRESS';
  end if;
  update public.organizations
    set setup_progress = coalesce(setup_progress,'{}'::jsonb) || p_progress
  where id = public.current_organization_id()
  returning setup_progress into merged;
  return merged;
end $$;

-- -----------------------------------------------------------------------------
-- complete_setup — aplica el perfil institucional y marca la configuración lista
-- -----------------------------------------------------------------------------
create or replace function public.complete_setup(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.has_permission('settings.manage')
     or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;
  perform public.update_organization_settings(p_payload - 'setup_completed_at');
  update public.organizations
    set setup_completed_at = coalesce(setup_completed_at, now())
  where id = public.current_organization_id();
  perform public.write_audit_event('complete','organization_setup',
    public.current_organization_id()::text,null,p_payload,'Configuración inicial finalizada');
  return public.get_organization_settings();
end $$;

revoke all on function public.save_setup_progress(jsonb) from public;
revoke all on function public.complete_setup(jsonb) from public;
grant execute on function public.save_setup_progress(jsonb) to authenticated;
grant execute on function public.complete_setup(jsonb) to authenticated;
