begin;

create or replace function public.list_meter_reading_batches(p_limit integer default 50)
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',b.id,'period_key',b.period_key,'reading_date',b.reading_date,'due_date',b.due_date,
    'scheme_id',b.scheme_id,'scheme_code',s.code,'scheme_name',s.name,'status',b.status,
    'total_readings',b.total_readings,'warning_readings',b.warning_readings,
    'error_readings',b.error_readings,'posted_readings',b.posted_readings,
    'notes',b.notes,'created_at',b.created_at,'posted_at',b.posted_at
  )
  from public.meter_reading_batches b
  join public.consumption_tariff_schemes s on s.id=b.scheme_id
  where b.organization_id=public.current_organization_id()
    and public.has_permission('metering.read')
  order by b.reading_date desc,b.created_at desc
  limit least(greatest(p_limit,1),200)
$$;

create or replace function public.list_meter_readings(p_batch_id uuid)
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',r.id,'batch_id',r.batch_id,'connection_id',r.connection_id,
    'connection_code',w.code,'meter_number',w.meter_number,'subscriber_name',s.full_name,
    'previous_reading',r.previous_reading,'current_reading',r.current_reading,
    'consumption',r.consumption,'status',r.status,'anomaly_code',r.anomaly_code,
    'notes',r.notes,'obligation_id',r.obligation_id
  )
  from public.meter_readings r
  join public.water_connections w on w.id=r.connection_id
  join public.subscribers s on s.id=w.subscriber_id
  where r.organization_id=public.current_organization_id()
    and r.batch_id=p_batch_id and public.has_permission('metering.read')
  order by s.full_name,w.code
$$;

create or replace function public.post_meter_reading_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare batch_row public.meter_reading_batches%rowtype;
  scheme_row public.consumption_tariff_schemes%rowtype;
  reading_row record;
  obligation_value uuid;
  charge_value numeric;
  posted_count integer:=0;
begin
  if not public.has_permission('metering.manage') or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;
  select * into batch_row from public.meter_reading_batches
  where id=p_batch_id and organization_id=public.current_organization_id()
  for update;
  if batch_row.id is null then raise exception 'READING_BATCH_NOT_FOUND'; end if;
  if batch_row.status='posted' then return jsonb_build_object('posted',batch_row.posted_readings,'already_posted',true); end if;
  if batch_row.status<>'validated' or batch_row.total_readings<1 or batch_row.error_readings>0 then
    raise exception 'READING_BATCH_NOT_READY';
  end if;
  select * into scheme_row from public.consumption_tariff_schemes where id=batch_row.scheme_id;

  for reading_row in
    select r.*,w.subscriber_id,w.code as connection_code
    from public.meter_readings r join public.water_connections w on w.id=r.connection_id
    where r.batch_id=batch_row.id and r.status in('valid','warning')
    for update of r
  loop
    obligation_value:=null;
    charge_value:=public.calculate_consumption_charge(scheme_row.id,reading_row.consumption);
    insert into public.obligations(
      organization_id,subscriber_id,connection_id,tariff_definition_id,tariff_version_id,
      source,period_key,description,issue_date,due_date,original_amount,created_by
    ) values(
      public.current_organization_id(),reading_row.subscriber_id,reading_row.connection_id,
      scheme_row.tariff_definition_id,scheme_row.tariff_version_id,'meter_reading',
      'CONSUMO-'||batch_row.period_key,
      format('Consumo %s · %s m³ · lectura %s a %s',
        batch_row.period_key,reading_row.consumption,reading_row.previous_reading,reading_row.current_reading),
      batch_row.reading_date,batch_row.due_date,charge_value,auth.uid()
    )
    on conflict(organization_id,connection_id,tariff_definition_id,period_key) do nothing
    returning id into obligation_value;

    if obligation_value is null then
      select id into obligation_value from public.obligations
      where organization_id=public.current_organization_id()
        and connection_id=reading_row.connection_id
        and tariff_definition_id=scheme_row.tariff_definition_id
        and period_key='CONSUMO-'||batch_row.period_key;
    end if;

    update public.meter_readings set status='posted',obligation_id=obligation_value,updated_at=now()
    where id=reading_row.id;
    posted_count:=posted_count+1;
  end loop;

  update public.meter_reading_batches set
    status='posted',posted_readings=posted_count,posted_by=auth.uid(),posted_at=now()
  where id=batch_row.id;

  perform public.write_audit_event(
    'metering.batch.post','meter_reading_batches',batch_row.id::text,null,
    jsonb_build_object('period_key',batch_row.period_key,'posted',posted_count),'Facturación de consumo'
  );
  return jsonb_build_object('posted',posted_count,'period_key',batch_row.period_key,'already_posted',false);
end
$$;

create or replace function public.list_cut_candidates(p_min_days_overdue integer default 30)
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  with debts as (
    select o.subscriber_id,o.connection_id,
      sum(public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)) as overdue_amount,
      count(*) as overdue_count,min(o.due_date) as oldest_due_date
    from public.obligations o
    where o.organization_id=public.current_organization_id()
      and o.cancelled_at is null and o.due_date<current_date
      and public.obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)>0
    group by o.subscriber_id,o.connection_id
  )
  select jsonb_build_object(
    'subscriber_id',s.id,'subscriber_code',s.code,'subscriber_name',s.full_name,
    'whatsapp',s.whatsapp,'connection_id',w.id,'connection_code',w.code,
    'meter_number',w.meter_number,'sector',w.sector,'address',w.address,
    'overdue_amount',d.overdue_amount,'overdue_count',d.overdue_count,
    'oldest_due_date',d.oldest_due_date,'days_overdue',current_date-d.oldest_due_date
  )
  from debts d
  join public.subscribers s on s.id=d.subscriber_id
  join public.water_connections w on w.id=d.connection_id
  where public.has_permission('metering.read')
    and w.status='active'
    and current_date-d.oldest_due_date>=greatest(p_min_days_overdue,0)
  order by d.oldest_due_date,d.overdue_amount desc
$$;


create or replace function public.import_subscriber_with_connection(
  p_subscriber jsonb,
  p_connection jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  duplicate_row record;
  subscriber_id_value uuid;
  connection_id_value uuid;
begin
  if not public.has_permission('imports.manage') or not public.has_permission('subscribers.create') then
    raise exception 'FORBIDDEN';
  end if;
  if coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then raise exception 'MFA_REQUIRED'; end if;

  select * into duplicate_row
  from public.check_subscriber_duplicates(
    p_subscriber->>'full_name',p_subscriber->>'document_type',p_subscriber->>'document_number',
    p_subscriber->>'issuing_country',p_subscriber->>'whatsapp',p_subscriber->>'sector'
  )
  where exact_document or score>=.70
  order by exact_document desc,score desc
  limit 1;

  if duplicate_row.exact_document then raise exception 'IMPORT_DUPLICATE_IDENTITY'; end if;
  if duplicate_row.subscriber_id is not null then raise exception 'IMPORT_HOMONYM_REVIEW_REQUIRED:%',duplicate_row.subscriber_code; end if;

  subscriber_id_value:=public.create_subscriber(p_subscriber,null,null);
  if p_connection is not null and coalesce(trim(p_connection->>'address'),'')<>'' then
    connection_id_value:=public.create_water_connection(subscriber_id_value,p_connection);
  end if;

  perform public.write_audit_event(
    'import.subscriber.commit','subscribers',subscriber_id_value::text,null,
    jsonb_build_object('connection_id',connection_id_value),'Importación atómica'
  );
  return jsonb_build_object('subscriber_id',subscriber_id_value,'connection_id',connection_id_value);
end
$$;


commit;
