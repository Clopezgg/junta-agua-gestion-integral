begin;

create or replace function public.generate_preventive_work_orders(p_through_date date default current_date)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  plan_row record;
  work_row public.work_orders%rowtype;
  generated int:=0;
begin
  if not public.has_permission('maintenance.manage')
     or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;

  for plan_row in
    select mp.*,a.name as asset_name,a.code as asset_code
    from public.maintenance_plans mp
    join public.assets a on a.id=mp.asset_id
    where mp.organization_id=public.current_organization_id()
      and mp.active
      and mp.next_due_date<=p_through_date
    order by mp.next_due_date
    for update of mp
  loop
    if not exists(
      select 1
      from public.work_orders w
      where w.organization_id=public.current_organization_id()
        and w.maintenance_plan_id=plan_row.id
        and w.status not in('completed','cancelled')
    ) then
      insert into public.work_orders(
        organization_id,order_number,type,description,priority,status,
        asset_id,maintenance_plan_id,due_date,scheduled_at,estimated_cost,created_by
      ) values(
        public.current_organization_id(),
        public.next_document_number('work_order','OT',5),
        'mantenimiento_preventivo',
        plan_row.name||' — '||plan_row.asset_code||' '||plan_row.asset_name,
        case when plan_row.next_due_date<current_date then 'high' else 'normal' end,
        'scheduled',
        plan_row.asset_id,
        plan_row.id,
        plan_row.next_due_date,
        plan_row.next_due_date::timestamptz,
        plan_row.estimated_cost,
        auth.uid()
      ) returning * into work_row;

      update public.maintenance_plans
      set next_due_date=next_due_date+frequency_days,
          updated_at=now()
      where id=plan_row.id;

      generated:=generated+1;

      perform public.write_audit_event(
        'maintenance.work_order.generate',
        'work_orders',
        work_row.id::text,
        null,
        to_jsonb(work_row),
        null
      );
    end if;
  end loop;

  return jsonb_build_object(
    'generated',generated,
    'through_date',p_through_date,
    'skipped_open_orders',(
      select count(*)
      from public.maintenance_plans mp
      where mp.organization_id=public.current_organization_id()
        and mp.active
        and mp.next_due_date<=p_through_date
        and exists(
          select 1
          from public.work_orders w
          where w.organization_id=public.current_organization_id()
            and w.maintenance_plan_id=mp.id
            and w.status not in('completed','cancelled')
        )
    )
  );
end
$$;

commit;
