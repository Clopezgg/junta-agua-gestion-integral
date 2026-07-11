begin;

create or replace function public.create_import_batch(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  row_value public.data_import_batches%rowtype;
  kind_value public.data_import_kind;
begin
  if not public.has_permission('imports.manage') then
    raise exception 'FORBIDDEN';
  end if;
  kind_value:=(p_payload->>'kind')::public.data_import_kind;
  if length(trim(coalesce(p_payload->>'file_name','')))<1 then
    raise exception 'FILE_NAME_REQUIRED';
  end if;
  insert into public.data_import_batches(
    organization_id,kind,file_name,file_type,file_size,source_sha256,mapping,created_by
  ) values(
    public.current_organization_id(),kind_value,trim(p_payload->>'file_name'),
    nullif(trim(p_payload->>'file_type'),''),
    coalesce(nullif(p_payload->>'file_size','')::bigint,0),
    nullif(trim(p_payload->>'source_sha256'),''),
    coalesce(p_payload->'mapping','{}'::jsonb),auth.uid()
  ) returning * into row_value;
  perform public.write_audit_event('import.batch.create','data_import_batches',row_value.id::text,null,to_jsonb(row_value),null);
  return to_jsonb(row_value);
end
$$;

create or replace function public.stage_import_rows(p_batch_id uuid,p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  batch_row public.data_import_batches%rowtype;
  inserted_count integer:=0;
begin
  if not public.has_permission('imports.manage') then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>5000 then raise exception 'INVALID_IMPORT_ROWS'; end if;
  select * into batch_row from public.data_import_batches
  where id=p_batch_id and organization_id=public.current_organization_id()
  for update;
  if batch_row.id is null or batch_row.status not in('draft','validated') then raise exception 'IMPORT_BATCH_NOT_EDITABLE'; end if;

  insert into public.data_import_rows(
    organization_id,batch_id,row_number,raw_data,normalized_data,status,error_codes,message
  )
  select
    public.current_organization_id(),p_batch_id,x.row_number,x.raw_data,
    coalesce(x.normalized_data,'{}'::jsonb),
    coalesce(x.status,'pending')::public.import_row_status,
    coalesce(x.error_codes,'{}'::text[]),x.message
  from jsonb_to_recordset(p_rows) as x(
    row_number integer,
    raw_data jsonb,
    normalized_data jsonb,
    status text,
    error_codes text[],
    message text
  )
  on conflict(batch_id,row_number) do update set
    raw_data=excluded.raw_data,
    normalized_data=excluded.normalized_data,
    status=excluded.status,
    error_codes=excluded.error_codes,
    message=excluded.message,
    updated_at=now();
  get diagnostics inserted_count=row_count;

  update public.data_import_batches b set
    total_rows=(select count(*) from public.data_import_rows r where r.batch_id=b.id),
    valid_rows=(select count(*) from public.data_import_rows r where r.batch_id=b.id and r.status='valid'),
    error_rows=(select count(*) from public.data_import_rows r where r.batch_id=b.id and r.status='error'),
    status=case when exists(select 1 from public.data_import_rows r where r.batch_id=b.id and r.status='error') then 'draft'::public.data_import_status else 'validated'::public.data_import_status end
  where b.id=p_batch_id;

  perform public.write_audit_event('import.rows.stage','data_import_batches',p_batch_id::text,null,jsonb_build_object('rows',inserted_count),null);
  return jsonb_build_object('processed',inserted_count);
end
$$;

create or replace function public.set_import_row_result(
  p_row_id uuid,
  p_status public.import_row_status,
  p_result_entity_id uuid default null,
  p_message text default null,
  p_error_codes text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  batch_id_value uuid;
begin
  if not public.has_permission('imports.manage') then raise exception 'FORBIDDEN'; end if;
  update public.data_import_rows set
    status=p_status,result_entity_id=p_result_entity_id,message=p_message,
    error_codes=coalesce(p_error_codes,'{}'),updated_at=now()
  where id=p_row_id and organization_id=public.current_organization_id()
  returning batch_id into batch_id_value;
  if batch_id_value is null then raise exception 'IMPORT_ROW_NOT_FOUND'; end if;

  update public.data_import_batches b set
    total_rows=(select count(*) from public.data_import_rows r where r.batch_id=b.id),
    valid_rows=(select count(*) from public.data_import_rows r where r.batch_id=b.id and r.status='valid'),
    imported_rows=(select count(*) from public.data_import_rows r where r.batch_id=b.id and r.status='imported'),
    skipped_rows=(select count(*) from public.data_import_rows r where r.batch_id=b.id and r.status='skipped'),
    error_rows=(select count(*) from public.data_import_rows r where r.batch_id=b.id and r.status='error')
  where b.id=batch_id_value;
end
$$;

create or replace function public.complete_import_batch(p_batch_id uuid,p_error_message text default null)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare row_value public.data_import_batches%rowtype;
begin
  if not public.has_permission('imports.manage') then raise exception 'FORBIDDEN'; end if;
  update public.data_import_batches set
    status=case when p_error_message is null then 'completed'::public.data_import_status else 'failed'::public.data_import_status end,
    error_message=p_error_message,completed_at=now()
  where id=p_batch_id and organization_id=public.current_organization_id()
  returning * into row_value;
  if row_value.id is null then raise exception 'IMPORT_BATCH_NOT_FOUND'; end if;
  perform public.write_audit_event('import.batch.complete','data_import_batches',p_batch_id::text,null,to_jsonb(row_value),p_error_message);
  return to_jsonb(row_value);
end
$$;

create or replace function public.list_import_batches(p_limit integer default 50)
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',b.id,'kind',b.kind,'file_name',b.file_name,'file_type',b.file_type,
    'file_size',b.file_size,'source_sha256',b.source_sha256,'status',b.status,
    'total_rows',b.total_rows,'valid_rows',b.valid_rows,'imported_rows',b.imported_rows,
    'skipped_rows',b.skipped_rows,'error_rows',b.error_rows,'error_message',b.error_message,
    'created_at',b.created_at,'completed_at',b.completed_at
  )
  from public.data_import_batches b
  where b.organization_id=public.current_organization_id()
    and public.has_permission('imports.read')
  order by b.created_at desc
  limit least(greatest(p_limit,1),200)
$$;

create or replace function public.list_import_rows(p_batch_id uuid)
returns setof jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'id',r.id,'row_number',r.row_number,'raw_data',r.raw_data,'normalized_data',r.normalized_data,
    'status',r.status,'error_codes',r.error_codes,'result_entity_id',r.result_entity_id,'message',r.message
  )
  from public.data_import_rows r
  where r.organization_id=public.current_organization_id()
    and r.batch_id=p_batch_id
    and public.has_permission('imports.read')
  order by r.row_number
$$;


commit;
