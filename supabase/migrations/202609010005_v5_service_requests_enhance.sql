-- V5-FASE3+ · Solicitudes y reclamos: Service Desk (asignación, estado/SLA, vínculo a orden).
-- Amplía la base 037 con las operaciones de atención que faltaban:
-- asignación a un técnico, transición de estados con nota/timeline y vínculo a orden.
begin;

alter table public.service_requests add column if not exists assigned_to uuid references profiles(id);
create index if not exists service_requests_assigned on public.service_requests(organization_id,assigned_to);

create or replace function public.assign_service_request(p_request_id uuid,p_assigned_to uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare old service_requests; r service_requests;
begin
 if not has_permission('operations.manage') then raise exception 'FORBIDDEN'; end if;
 select * into old from service_requests where id=p_request_id and organization_id=current_organization_id() for update;
 if old.id is null then raise exception 'NOT_FOUND'; end if;
 update service_requests set assigned_to=p_assigned_to,updated_at=now() where id=p_request_id returning * into r;
 perform write_audit_event('service_request.assign','service_requests',r.id::text,to_jsonb(old),to_jsonb(r),null);
 return to_jsonb(r);
end$$;

create or replace function public.set_service_request_status(p_request_id uuid,p_status text,p_note text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare old service_requests; r service_requests;
begin
 if not has_permission('operations.manage') then raise exception 'FORBIDDEN'; end if;
 if p_status not in('recibida','en_revision','en_proceso','resuelta','cerrada','rechazada') then raise exception 'INVALID_STATUS'; end if;
 select * into old from service_requests where id=p_request_id and organization_id=current_organization_id() for update;
 if old.id is null then raise exception 'NOT_FOUND'; end if;
 update service_requests set
  status=(p_status)::request_status,
  resolution=case when p_status in('resuelta','cerrada') then coalesce(p_note,old.resolution) else old.resolution end,
  resolved_at=case when p_status in('resuelta','cerrada') then now() else null end,
  resolved_by=case when p_status in('resuelta','cerrada') then auth.uid() else old.resolved_by end,
  updated_at=now()
 where id=p_request_id returning * into r;
 perform write_audit_event('service_request.update','service_requests',r.id::text,to_jsonb(old),to_jsonb(r),p_note);
 return to_jsonb(r);
end$$;

create or replace function public.link_service_request_work_order(p_request_id uuid,p_work_order_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare old service_requests; r service_requests;
begin
 if not has_permission('operations.manage') then raise exception 'FORBIDDEN'; end if;
 select * into old from service_requests where id=p_request_id and organization_id=current_organization_id() for update;
 if old.id is null then raise exception 'NOT_FOUND'; end if;
 update service_requests set work_order_id=p_work_order_id,updated_at=now() where id=p_request_id returning * into r;
 perform write_audit_event('service_request.link_work_order','service_requests',r.id::text,to_jsonb(old),to_jsonb(r),null);
 return to_jsonb(r);
end$$;

grant execute on function public.assign_service_request(uuid,uuid) to authenticated;
grant execute on function public.set_service_request_status(uuid,text,text) to authenticated;
grant execute on function public.link_service_request_work_order(uuid,uuid) to authenticated;

commit;
