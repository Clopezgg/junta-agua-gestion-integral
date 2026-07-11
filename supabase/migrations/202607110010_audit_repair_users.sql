begin;
create policy role_permissions_manage on public.role_permissions for all using(exists(select 1 from roles r where r.id=role_id and r.organization_id=current_organization_id()) and has_permission('roles.manage')) with check(exists(select 1 from roles r where r.id=role_id and r.organization_id=current_organization_id()) and has_permission('roles.manage'));
create policy user_roles_manage on public.user_roles for all using(exists(select 1 from profiles p where p.id=user_id and p.organization_id=current_organization_id()) and has_permission('users.manage')) with check(exists(select 1 from profiles p where p.id=user_id and p.organization_id=current_organization_id()) and has_permission('users.manage'));

create or replace function public.list_organization_users()
returns setof jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('id',p.id,'full_name',p.full_name,'username',p.username,'status',p.status,'roles',coalesce(jsonb_agg(jsonb_build_object('id',r.id,'code',r.code,'name',r.name)) filter(where r.id is not null),'[]'::jsonb))
 from profiles p left join user_roles ur on ur.user_id=p.id left join roles r on r.id=ur.role_id
 where p.organization_id=current_organization_id() and has_permission('users.manage') group by p.id order by p.full_name
$$;
create or replace function public.list_organization_roles()
returns setof jsonb language sql stable security definer set search_path=public as $$select to_jsonb(r) from roles r where r.organization_id=current_organization_id() and has_permission('users.manage') order by r.name$$;
create or replace function public.set_user_status(p_user_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$declare old profiles;begin if not has_permission('users.manage') or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then raise exception 'FORBIDDEN_OR_MFA';end if;if p_status not in('active','inactive','blocked') then raise exception 'INVALID_STATUS';end if;select * into old from profiles where id=p_user_id and organization_id=current_organization_id();if old.id is null then raise exception 'NOT_FOUND';end if;if old.id=auth.uid() and p_status<>'active' then raise exception 'SELF_DISABLE_FORBIDDEN';end if;update profiles set status=p_status,updated_at=now() where id=p_user_id;perform write_audit_event('user.status','profiles',p_user_id::text,to_jsonb(old),jsonb_build_object('status',p_status),null);end$$;

create or replace function public.attach_identity_document(p_subscriber_id uuid,p_storage_path text)
returns void language plpgsql security definer set search_path=public as $$
declare old subscriber_identities;
begin
 if not has_permission('subscribers.update') then raise exception 'FORBIDDEN';end if;
 if coalesce(trim(p_storage_path),'')='' then raise exception 'PATH_REQUIRED';end if;
 select * into old from subscriber_identities where subscriber_id=p_subscriber_id and organization_id=current_organization_id() and is_primary for update;
 if old.id is null then raise exception 'IDENTITY_NOT_FOUND';end if;
 update subscriber_identities set storage_path=p_storage_path where id=old.id;
 perform write_audit_event('identity.document.attach','subscriber_identities',old.id::text,to_jsonb(old),jsonb_build_object('storage_path',p_storage_path),null);
end$$;
commit;
