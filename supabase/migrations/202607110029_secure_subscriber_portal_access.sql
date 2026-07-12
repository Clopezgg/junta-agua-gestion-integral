begin;

alter table public.subscriber_portal_accounts
  add column if not exists must_change_password boolean not null default true,
  add column if not exists password_changed_at timestamptz,
  add column if not exists failed_login_count int not null default 0,
  add column if not exists locked_until timestamptz;

create or replace function public.mark_my_portal_password_changed()
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.subscriber_portal_accounts
  set must_change_password=false,password_changed_at=now(),failed_login_count=0,locked_until=null
  where user_id=auth.uid() and status='active';
  if not found then raise exception 'PORTAL_ACCOUNT_NOT_FOUND'; end if;
end
$$;

create or replace function public.get_my_portal_account_state()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'status',a.status,
    'must_change_password',a.must_change_password,
    'password_changed_at',a.password_changed_at,
    'last_access_at',a.last_access_at
  )
  from public.subscriber_portal_accounts a
  where a.user_id=auth.uid()
$$;

grant execute on function public.mark_my_portal_password_changed() to authenticated;
grant execute on function public.get_my_portal_account_state() to authenticated;

commit;
