begin;

create or replace function public.save_consumption_tariff_scheme(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  org uuid:=public.current_organization_id();
  code_value text;
  service_value text;
  effective_value date;
  fixed_value numeric;
  definition_row public.tariff_definitions%rowtype;
  tariff_version_row public.tariff_versions%rowtype;
  scheme_row public.consumption_tariff_schemes%rowtype;
  version_value integer;
  blocks jsonb;
  block_count integer;
begin
  if not public.has_permission('metering.manage') or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then
    raise exception 'MFA_REQUIRED_OR_FORBIDDEN';
  end if;
  code_value:=upper(regexp_replace(trim(coalesce(p_payload->>'code','')),'[^A-Za-z0-9]+','_','g'));
  service_value:=nullif(trim(p_payload->>'service_type'),'');
  effective_value:=(p_payload->>'effective_from')::date;
  fixed_value:=coalesce(nullif(p_payload->>'fixed_charge','')::numeric,0);
  blocks:=coalesce(p_payload->'blocks','[]'::jsonb);
  block_count:=jsonb_array_length(blocks);
  if length(code_value)<2 or length(trim(coalesce(p_payload->>'name','')))<3 or fixed_value<0 or block_count<1 then
    raise exception 'INVALID_CONSUMPTION_TARIFF';
  end if;
  if service_value is not null and service_value not in('residential','commercial','community','institutional') then
    raise exception 'INVALID_SERVICE_TYPE';
  end if;
  if exists(
    with valueset as (
      select row_number() over() as position,
        (value->>'from_volume')::numeric as from_volume,
        nullif(value->>'to_volume','')::numeric as to_volume,
        (value->>'unit_price')::numeric as unit_price
      from jsonb_array_elements(blocks)
    )
    select 1 from valueset
    where from_volume<0 or unit_price<0 or (to_volume is not null and to_volume<=from_volume)
  ) then raise exception 'INVALID_TARIFF_BLOCK'; end if;
  if (select min((value->>'from_volume')::numeric) from jsonb_array_elements(blocks))<>0 then
    raise exception 'FIRST_BLOCK_MUST_START_ZERO';
  end if;
  if (select count(*) from jsonb_array_elements(blocks) value where nullif(value->>'to_volume','') is null)<>1 then
    raise exception 'ONE_OPEN_ENDED_BLOCK_REQUIRED';
  end if;
  if exists(
    with valueset as (
      select
        coalesce(nullif(value->>'block_order','')::integer,ordinality::integer) as block_order,
        (value->>'from_volume')::numeric as from_volume,
        nullif(value->>'to_volume','')::numeric as to_volume
      from jsonb_array_elements(blocks) with ordinality as b(value,ordinality)
    ), sequenced as (
      select *,lag(to_volume) over(order by block_order) as previous_to,
        row_number() over(order by block_order) as rn,count(*) over() as total
      from valueset
    )
    select 1 from sequenced
    where (rn>1 and from_volume<>previous_to) or (to_volume is null and rn<>total)
  ) then raise exception 'TARIFF_BLOCKS_NOT_CONTIGUOUS'; end if;

  insert into public.tariff_definitions(
    organization_id,code,name,category,description,applies_to_service,is_annual,status,created_by
  ) values(
    org,'CONSUMO_'||code_value,trim(p_payload->>'name'),'consumption',
    nullif(trim(p_payload->>'description'),''),service_value,false,'active',auth.uid()
  )
  on conflict(organization_id,code) do update set
    name=excluded.name,category='consumption',description=excluded.description,
    applies_to_service=excluded.applies_to_service,status='active',updated_at=now()
  returning * into definition_row;

  update public.consumption_tariff_schemes set
    effective_to=effective_value-1,status='inactive'
  where organization_id=org and code=code_value and status='active' and effective_from<effective_value;

  update public.tariff_versions set valid_to=effective_value-1
  where tariff_definition_id=definition_row.id and valid_to is null and valid_from<effective_value;

  if exists(
    select 1 from public.consumption_tariff_schemes
    where organization_id=org and code=code_value and effective_from=effective_value
  ) then raise exception 'DUPLICATE_EFFECTIVE_DATE'; end if;

  select greatest(
    coalesce((select max(version_number) from public.consumption_tariff_schemes where organization_id=org and code=code_value),0),
    coalesce((select max(version_number) from public.tariff_versions where tariff_definition_id=definition_row.id),0)
  )+1 into version_value;

  insert into public.tariff_versions(
    organization_id,tariff_definition_id,version_number,amount,valid_from,valid_to,notes,created_by
  ) values(
    org,definition_row.id,version_value,fixed_value,effective_value,
    nullif(p_payload->>'effective_to','')::date,
    nullif(trim(p_payload->>'notes'),''),auth.uid()
  ) returning * into tariff_version_row;

  insert into public.consumption_tariff_schemes(
    organization_id,code,name,service_type,version_number,fixed_charge,effective_from,effective_to,
    tariff_definition_id,tariff_version_id,status,notes,created_by
  ) values(
    org,code_value,trim(p_payload->>'name'),service_value,version_value,fixed_value,effective_value,
    nullif(p_payload->>'effective_to','')::date,definition_row.id,tariff_version_row.id,'active',
    nullif(trim(p_payload->>'notes'),''),auth.uid()
  ) returning * into scheme_row;

  insert into public.consumption_tariff_blocks(
    organization_id,scheme_id,block_order,from_volume,to_volume,unit_price
  )
  select org,scheme_row.id,
    coalesce(nullif(value->>'block_order','')::integer,ordinality::integer),
    (value->>'from_volume')::numeric,
    nullif(value->>'to_volume','')::numeric,
    (value->>'unit_price')::numeric
  from jsonb_array_elements(blocks) with ordinality as b(value,ordinality);

  perform public.write_audit_event(
    'metering.tariff.save','consumption_tariff_schemes',scheme_row.id::text,null,
    to_jsonb(scheme_row)||jsonb_build_object('blocks',blocks),null
  );
  return to_jsonb(scheme_row);
end
$$;

create or replace function public.list_consumption_tariff_schemes()
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',s.id,'code',s.code,'name',s.name,'service_type',s.service_type,
    'version_number',s.version_number,'fixed_charge',s.fixed_charge,
    'effective_from',s.effective_from,'effective_to',s.effective_to,'status',s.status,'notes',s.notes,
    'blocks',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',b.id,'block_order',b.block_order,'from_volume',b.from_volume,
        'to_volume',b.to_volume,'unit_price',b.unit_price
      ) order by b.block_order)
      from public.consumption_tariff_blocks b where b.scheme_id=s.id
    ),'[]'::jsonb)
  )
  from public.consumption_tariff_schemes s
  where s.organization_id=public.current_organization_id()
    and public.has_permission('metering.read')
  order by s.code,s.version_number desc
$$;

create or replace function public.calculate_consumption_charge(p_scheme_id uuid,p_consumption numeric)
returns numeric
language plpgsql
stable
security definer
set search_path=public
as $$
declare result numeric;
begin
  if p_consumption<0 then raise exception 'INVALID_CONSUMPTION'; end if;
  select s.fixed_charge+coalesce(sum(
    greatest(
      least(p_consumption,coalesce(b.to_volume,p_consumption))-b.from_volume,
      0
    )*b.unit_price
  ),0)
  into result
  from public.consumption_tariff_schemes s
  join public.consumption_tariff_blocks b on b.scheme_id=s.id
  where s.id=p_scheme_id and s.organization_id=public.current_organization_id()
  group by s.fixed_charge;
  if result is null then raise exception 'TARIFF_SCHEME_NOT_FOUND'; end if;
  return round(result,2);
end
$$;

create or replace function public.list_metering_connections(p_query text default '')
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',w.id,'code',w.code,'meter_number',w.meter_number,'service_type',w.service_type,
    'address',w.address,'sector',w.sector,'status',w.status,
    'subscriber_id',s.id,'subscriber_code',s.code,'subscriber_name',s.full_name,
    'last_reading',coalesce((
      select mr.current_reading from public.meter_readings mr
      where mr.connection_id=w.id and mr.status='posted'
      order by mr.created_at desc limit 1
    ),0),
    'last_reading_date',(
      select mb.reading_date from public.meter_readings mr
      join public.meter_reading_batches mb on mb.id=mr.batch_id
      where mr.connection_id=w.id and mr.status='posted'
      order by mb.reading_date desc limit 1
    )
  )
  from public.water_connections w
  join public.subscribers s on s.id=w.subscriber_id
  where w.organization_id=public.current_organization_id()
    and public.has_permission('metering.read')
    and w.status='active' and s.status='active'
    and w.normalized_meter is not null
    and (
      coalesce(trim(p_query),'')='' or w.code ilike '%'||trim(p_query)||'%'
      or coalesce(w.meter_number,'') ilike '%'||trim(p_query)||'%'
      or s.code ilike '%'||trim(p_query)||'%' or s.full_name ilike '%'||trim(p_query)||'%'
    )
  order by s.full_name,w.code
$$;


commit;
