begin;

create or replace function public.create_meter_reading_batch(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare scheme_row public.consumption_tariff_schemes%rowtype;
  batch_row public.meter_reading_batches%rowtype;
begin
  if not public.has_permission('metering.manage') then raise exception 'FORBIDDEN'; end if;
  select * into scheme_row from public.consumption_tariff_schemes
  where id=(p_payload->>'scheme_id')::uuid
    and organization_id=public.current_organization_id()
    and status='active';
  if scheme_row.id is null then raise exception 'ACTIVE_SCHEME_NOT_FOUND'; end if;
  insert into public.meter_reading_batches(
    organization_id,period_key,reading_date,due_date,scheme_id,notes,created_by
  ) values(
    public.current_organization_id(),upper(trim(p_payload->>'period_key')),
    (p_payload->>'reading_date')::date,(p_payload->>'due_date')::date,
    scheme_row.id,nullif(trim(p_payload->>'notes'),''),auth.uid()
  ) returning * into batch_row;
  perform public.write_audit_event('metering.batch.create','meter_reading_batches',batch_row.id::text,null,to_jsonb(batch_row),null);
  return to_jsonb(batch_row);
exception when unique_violation then raise exception 'DUPLICATE_READING_PERIOD';
end
$$;

create or replace function public.upsert_meter_reading(p_batch_id uuid,p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare batch_row public.meter_reading_batches%rowtype;
  connection_row public.water_connections%rowtype;
  previous_value numeric;
  current_value numeric;
  consumption_value numeric;
  average_value numeric;
  status_value public.meter_reading_status;
  anomaly_value text;
  reading_row public.meter_readings%rowtype;
begin
  if not public.has_permission('metering.manage') then raise exception 'FORBIDDEN'; end if;
  select * into batch_row from public.meter_reading_batches
  where id=p_batch_id and organization_id=public.current_organization_id()
  for update;
  if batch_row.id is null or batch_row.status not in('draft','validated') then raise exception 'READING_BATCH_NOT_EDITABLE'; end if;
  select * into connection_row from public.water_connections
  where id=(p_payload->>'connection_id')::uuid
    and organization_id=public.current_organization_id() and status='active';
  if connection_row.id is null or connection_row.normalized_meter is null then raise exception 'METERED_CONNECTION_NOT_FOUND'; end if;
  if exists(
    select 1 from public.consumption_tariff_schemes s
    where s.id=batch_row.scheme_id and s.service_type is not null and s.service_type<>connection_row.service_type
  ) then raise exception 'SCHEME_SERVICE_MISMATCH'; end if;

  previous_value:=coalesce(nullif(p_payload->>'previous_reading','')::numeric,(
    select mr.current_reading from public.meter_readings mr
    join public.meter_reading_batches mb on mb.id=mr.batch_id
    where mr.connection_id=connection_row.id and mr.status='posted' and mb.reading_date<=batch_row.reading_date
    order by mb.reading_date desc limit 1
  ),0);
  current_value:=(p_payload->>'current_reading')::numeric;
  if previous_value<0 or current_value<0 then raise exception 'INVALID_READING'; end if;

  if current_value<previous_value then
    consumption_value:=0;status_value:='error';anomaly_value:='METER_ROLLBACK';
  else
    consumption_value:=current_value-previous_value;
    select avg(x.consumption) into average_value from (
      select mr.consumption from public.meter_readings mr
      join public.meter_reading_batches mb on mb.id=mr.batch_id
      where mr.connection_id=connection_row.id and mr.status='posted'
      order by mb.reading_date desc limit 3
    ) x;
    if consumption_value>greatest(coalesce(average_value,0)*3,100) then
      status_value:='warning';anomaly_value:='UNUSUAL_HIGH_CONSUMPTION';
    else status_value:='valid';anomaly_value:=null; end if;
  end if;

  insert into public.meter_readings(
    organization_id,batch_id,connection_id,previous_reading,current_reading,
    consumption,status,anomaly_code,notes,created_by
  ) values(
    public.current_organization_id(),batch_row.id,connection_row.id,previous_value,current_value,
    consumption_value,status_value,anomaly_value,nullif(trim(p_payload->>'notes'),''),auth.uid()
  )
  on conflict(batch_id,connection_id) do update set
    previous_reading=excluded.previous_reading,current_reading=excluded.current_reading,
    consumption=excluded.consumption,status=excluded.status,anomaly_code=excluded.anomaly_code,
    notes=excluded.notes,updated_at=now()
  returning * into reading_row;

  update public.meter_reading_batches b set
    total_readings=(select count(*) from public.meter_readings r where r.batch_id=b.id),
    warning_readings=(select count(*) from public.meter_readings r where r.batch_id=b.id and r.status='warning'),
    error_readings=(select count(*) from public.meter_readings r where r.batch_id=b.id and r.status='error'),
    status=case when exists(select 1 from public.meter_readings r where r.batch_id=b.id and r.status='error')
      then 'draft'::public.reading_batch_status else 'validated'::public.reading_batch_status end
  where b.id=batch_row.id;

  perform public.write_audit_event('metering.reading.save','meter_readings',reading_row.id::text,null,to_jsonb(reading_row),anomaly_value);
  return to_jsonb(reading_row);
end
$$;


commit;
