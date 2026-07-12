begin;

create table if not exists public.subscriber_portal_accounts(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscriber_id uuid not null references public.subscribers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check(status in('invited','active','blocked','revoked')),
  identity_verified_at timestamptz,
  invited_by uuid references public.profiles(id),
  invited_at timestamptz not null default now(),
  last_access_at timestamptz,
  created_at timestamptz not null default now(),
  unique(subscriber_id),
  unique(user_id)
);

alter table public.subscriber_portal_accounts enable row level security;

create policy portal_account_self_read on public.subscriber_portal_accounts
for select using(user_id=auth.uid());

create policy portal_account_admin_read on public.subscriber_portal_accounts
for select using(organization_id=public.current_organization_id() and public.has_permission('portal.manage'));

revoke insert,update,delete on public.subscriber_portal_accounts from authenticated;

create or replace function public.link_subscriber_portal_account(p_subscriber_id uuid,p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  subscriber_row public.subscribers%rowtype;
  result public.subscriber_portal_accounts%rowtype;
begin
  if not public.has_permission('portal.manage')
     or coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;

  select * into subscriber_row
  from public.subscribers
  where id=p_subscriber_id
    and organization_id=public.current_organization_id();
  if subscriber_row.id is null then raise exception 'SUBSCRIBER_NOT_FOUND'; end if;
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'AUTH_USER_NOT_FOUND'; end if;

  insert into public.subscriber_portal_accounts(
    organization_id,subscriber_id,user_id,status,identity_verified_at,invited_by
  ) values(
    subscriber_row.organization_id,subscriber_row.id,p_user_id,'active',now(),auth.uid()
  )
  on conflict(subscriber_id) do update set
    user_id=excluded.user_id,status='active',identity_verified_at=now(),invited_by=auth.uid(),invited_at=now()
  returning * into result;

  update public.subscribers set portal_enabled=true where id=subscriber_row.id;
  perform public.write_audit_event('portal.account.link','subscriber_portal_accounts',result.id::text,null,to_jsonb(result),'Vinculación protegida con MFA');
  return to_jsonb(result);
end
$$;

create or replace function public.get_my_subscriber_card()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  account_row public.subscriber_portal_accounts%rowtype;
  result jsonb;
begin
  select * into account_row from public.subscriber_portal_accounts
  where user_id=auth.uid() and status='active';
  if account_row.id is null then raise exception 'PORTAL_ACCOUNT_NOT_FOUND'; end if;

  update public.subscriber_portal_accounts set last_access_at=now() where id=account_row.id;
  update public.subscribers set portal_last_access_at=now() where id=account_row.subscriber_id;

  select jsonb_build_object(
    'id',s.id,'code',s.code,'full_name',s.full_name,'birth_date',s.birth_date,
    'age',public.age_on_date(s.birth_date,current_date),'photo_path',s.photo_path,
    'whatsapp',s.whatsapp,'email',s.email,'address',s.address,'sector',s.sector,'status',s.status,
    'identity_masked',(select left(i.normalized_number,4)||repeat('*',greatest(length(i.normalized_number)-8,2))||right(i.normalized_number,4) from public.subscriber_identities i where i.subscriber_id=s.id and i.is_primary limit 1),
    'connections',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'code',c.code,'sector',c.sector,'address',c.address,'status',c.status) order by c.code),'[]'::jsonb) from public.water_connections c where c.subscriber_id=s.id),
    'benefits',(select coalesce(jsonb_agg(jsonb_build_object('name',bd.name,'percentage',bd.percentage,'status',sb.status)),'[]'::jsonb) from public.subscriber_benefits sb join public.benefit_definitions bd on bd.id=sb.benefit_definition_id where sb.subscriber_id=s.id and sb.status='active'),
    'annual_status',(select coalesce(jsonb_agg(jsonb_build_object('year',extract(year from o.due_date)::int,'balance',public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount),'status',case when public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)<=0 then 'paid' when o.due_date<current_date then 'overdue' else 'pending' end) order by extract(year from o.due_date) desc),'[]'::jsonb) from public.obligations o where o.subscriber_id=s.id and o.cancelled_at is null)
  ) into result
  from public.subscribers s where s.id=account_row.subscriber_id;

  return result;
end
$$;

create or replace function public.update_my_subscriber_profile(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  account_row public.subscriber_portal_accounts%rowtype;
  old_row public.subscribers%rowtype;
  new_row public.subscribers%rowtype;
begin
  select * into account_row from public.subscriber_portal_accounts
  where user_id=auth.uid() and status='active';
  if account_row.id is null then raise exception 'PORTAL_ACCOUNT_NOT_FOUND'; end if;

  select * into old_row from public.subscribers where id=account_row.subscriber_id for update;
  update public.subscribers set
    whatsapp=case when p_payload ? 'whatsapp' then nullif(trim(p_payload->>'whatsapp'),'') else whatsapp end,
    email=case when p_payload ? 'email' then nullif(lower(trim(p_payload->>'email')),'') else email end,
    address=case when p_payload ? 'address' then nullif(trim(p_payload->>'address'),'') else address end,
    photo_path=case when p_payload ? 'photo_path' then nullif(trim(p_payload->>'photo_path'),'') else photo_path end,
    portal_profile_updated_at=now(),updated_at=now()
  where id=old_row.id returning * into new_row;

  if old_row.whatsapp is distinct from new_row.whatsapp then insert into public.portal_update_requests(organization_id,subscriber_id,field_name,old_value,new_value) values(old_row.organization_id,old_row.id,'whatsapp',old_row.whatsapp,new_row.whatsapp); end if;
  if old_row.email is distinct from new_row.email then insert into public.portal_update_requests(organization_id,subscriber_id,field_name,old_value,new_value) values(old_row.organization_id,old_row.id,'email',old_row.email,new_row.email); end if;
  if old_row.address is distinct from new_row.address then insert into public.portal_update_requests(organization_id,subscriber_id,field_name,old_value,new_value) values(old_row.organization_id,old_row.id,'address',old_row.address,new_row.address); end if;
  if old_row.photo_path is distinct from new_row.photo_path then insert into public.portal_update_requests(organization_id,subscriber_id,field_name,old_value,new_value) values(old_row.organization_id,old_row.id,'photo_path',old_row.photo_path,new_row.photo_path); end if;

  perform public.write_audit_event('portal.profile.update','subscribers',new_row.id::text,to_jsonb(old_row),jsonb_build_object('whatsapp',new_row.whatsapp,'email',new_row.email,'address',new_row.address,'photo_path',new_row.photo_path),'Campos permitidos del portal');
  return jsonb_build_object('id',new_row.id,'whatsapp',new_row.whatsapp,'email',new_row.email,'address',new_row.address,'photo_path',new_row.photo_path);
end
$$;

create or replace function public.attach_subscriber_photo(p_subscriber_id uuid,p_storage_path text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare old_path text;
begin
  if not public.has_permission('subscribers.update') then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_storage_path),'')='' then raise exception 'PATH_REQUIRED'; end if;
  select photo_path into old_path from public.subscribers where id=p_subscriber_id and organization_id=public.current_organization_id() for update;
  if not found then raise exception 'SUBSCRIBER_NOT_FOUND'; end if;
  update public.subscribers set photo_path=p_storage_path,updated_at=now() where id=p_subscriber_id;
  perform public.write_audit_event('subscriber.photo.attach','subscribers',p_subscriber_id::text,jsonb_build_object('photo_path',old_path),jsonb_build_object('photo_path',p_storage_path),null);
end
$$;

create index if not exists subscriber_portal_accounts_org_status_idx on public.subscriber_portal_accounts(organization_id,status);

commit;
