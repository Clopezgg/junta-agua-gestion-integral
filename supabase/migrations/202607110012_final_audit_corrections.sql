begin;

alter table public.organizations
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists rtn text,
  add column if not exists logo_path text,
  add column if not exists receipt_footer text,
  add column if not exists currency text not null default 'HNL';

alter table public.payment_allocations
  add column if not exists refunded_amount numeric(14,2) not null default 0 check(refunded_amount>=0 and refunded_amount<=amount);

alter table public.payment_events
  add column if not exists cash_amount numeric(14,2) not null default 0 check(cash_amount>=0);

create table if not exists public.payment_components(
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  method public.payment_method not null check(method<>'mixed'),
  amount numeric(14,2) not null check(amount>0),
  refunded_amount numeric(14,2) not null default 0 check(refunded_amount>=0 and refunded_amount<=amount),
  reference text
);
create index if not exists payment_components_payment_idx on public.payment_components(payment_id);
insert into public.payment_components(payment_id,method,amount,reference)
select p.id,case when p.method='mixed' then 'cash'::payment_method else p.method end,p.total,p.reference from public.payments p
where not exists(select 1 from public.payment_components c where c.payment_id=p.id);
alter table public.payment_components enable row level security;
create policy payment_components_read on public.payment_components for select using(exists(select 1 from public.payments p where p.id=payment_id and p.organization_id=current_organization_id() and has_permission('payments.read')));
revoke insert,update,delete on public.payment_components from authenticated;

insert into public.permissions(code,description) values
 ('settings.read','Consultar configuración institucional')
on conflict(code) do update set description=excluded.description;

insert into public.role_permissions(role_id,permission_code)
select r.id,p.code from public.roles r cross join public.permissions p
where r.code in('superadmin','admin','auditor') and p.code='settings.read'
on conflict do nothing;

create or replace function public.get_organization_settings()
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object(
  'id',o.id,'name',o.name,'address',o.address,'phone',o.phone,'email',o.email,
  'rtn',o.rtn,'logo_path',o.logo_path,'receipt_footer',o.receipt_footer,'currency',o.currency
 )
 from organizations o where o.id=current_organization_id()
 and (has_permission('settings.read') or has_permission('settings.manage') or has_permission('payments.read'))
$$;

create or replace function public.update_organization_settings(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare old organizations;r organizations;
begin
 if not has_permission('settings.manage') or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then raise exception 'MFA_REQUIRED_OR_FORBIDDEN';end if;
 select * into old from organizations where id=current_organization_id() for update;
 update organizations set
  name=coalesce(nullif(trim(p_payload->>'name'),''),name),
  address=nullif(trim(p_payload->>'address'),''),phone=nullif(trim(p_payload->>'phone'),''),
  email=nullif(trim(p_payload->>'email'),''),rtn=nullif(trim(p_payload->>'rtn'),''),
  logo_path=nullif(trim(p_payload->>'logo_path'),''),receipt_footer=nullif(trim(p_payload->>'receipt_footer'),''),
  currency=coalesce(nullif(trim(p_payload->>'currency'),''),'HNL')
 where id=old.id returning * into r;
 perform write_audit_event('organization.settings.update','organizations',r.id::text,to_jsonb(old),to_jsonb(r),null);
 return to_jsonb(r);
end$$;

create or replace function public.list_audit_events(p_query text default null,p_action text default null,p_from date default null,p_to date default null,p_limit int default 200)
returns setof jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object(
  'id',a.id,'created_at',a.created_at,'actor_id',a.actor_id,'actor_name',p.full_name,
  'action',a.action,'entity_type',a.entity_type,'entity_id',a.entity_id,'reason',a.reason,
  'old_data',a.old_data,'new_data',a.new_data
 )
 from audit_events a left join profiles p on p.id=a.actor_id
 where a.organization_id=current_organization_id() and has_permission('audit.read')
 and (coalesce(trim(p_query),'')='' or coalesce(p.full_name,'') ilike '%'||trim(p_query)||'%' or a.entity_type ilike '%'||trim(p_query)||'%' or coalesce(a.entity_id,'') ilike '%'||trim(p_query)||'%')
 and (coalesce(trim(p_action),'')='' or a.action ilike '%'||trim(p_action)||'%')
 and (p_from is null or a.created_at::date>=p_from) and (p_to is null or a.created_at::date<=p_to)
 order by a.created_at desc limit least(greatest(p_limit,1),1000)
$$;

create or replace function public.register_payment(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();pay payments;item jsonb;obl obligations;sum_alloc numeric:=0;sum_components numeric:=0;cash_total numeric:=0;receipt text;session cash_sessions;components jsonb;component jsonb;received numeric;method_value payment_method;
begin
 if not has_permission('payments.create') then raise exception 'FORBIDDEN';end if;
 if coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then raise exception 'MFA_REQUIRED';end if;
 if jsonb_array_length(coalesce(p_payload->'allocations','[]'::jsonb))=0 then raise exception 'ALLOCATIONS_REQUIRED';end if;
 for item in select * from jsonb_array_elements(p_payload->'allocations') loop
  select * into obl from obligations where id=(item->>'obligation_id')::uuid and organization_id=org and cancelled_at is null for update;
  if obl.id is null then raise exception 'OBLIGATION_NOT_FOUND';end if;
  if (item->>'amount')::numeric<=0 or (item->>'amount')::numeric>obligation_balance(obl.original_amount,obl.adjustment_amount,obl.paid_amount) then raise exception 'INVALID_ALLOCATION';end if;
  sum_alloc:=sum_alloc+(item->>'amount')::numeric;
 end loop;
 method_value:=(p_payload->>'method')::payment_method;
 components:=coalesce(p_payload->'components','[]'::jsonb);
 if jsonb_array_length(components)=0 then components:=jsonb_build_array(jsonb_build_object('method',case when method_value='mixed' then 'cash' else method_value::text end,'amount',sum_alloc,'reference',nullif(trim(p_payload->>'reference'),'')));end if;
 for component in select * from jsonb_array_elements(components) loop
  if (component->>'method') not in('cash','transfer','deposit','check') or (component->>'amount')::numeric<=0 then raise exception 'INVALID_PAYMENT_COMPONENT';end if;
  if (component->>'method')<>'cash' and coalesce(trim(component->>'reference'),'')='' then raise exception 'REFERENCE_REQUIRED';end if;
  sum_components:=sum_components+(component->>'amount')::numeric;
  if (component->>'method')='cash' then cash_total:=cash_total+(component->>'amount')::numeric;end if;
 end loop;
 if sum_components<>sum_alloc then raise exception 'COMPONENT_TOTAL_MISMATCH';end if;
 if cash_total>0 then
  select * into session from cash_sessions where id=nullif(p_payload->>'cash_session_id','')::uuid and organization_id=org and user_id=auth.uid() and status='open' for update;
  if session.id is null then raise exception 'ACTIVE_CASH_SESSION_REQUIRED';end if;
 end if;
 received:=coalesce(nullif(p_payload->>'received_amount','')::numeric,sum_alloc);
 if received<sum_alloc then raise exception 'INSUFFICIENT_RECEIVED_AMOUNT';end if;
 receipt:=next_document_number('receipt','REC',6);
 insert into payments(organization_id,subscriber_id,cash_session_id,receipt_number,method,total,received_amount,reference,created_by) values(org,(p_payload->>'subscriber_id')::uuid,case when cash_total>0 then session.id else null end,receipt,method_value,sum_alloc,received,nullif(trim(p_payload->>'reference'),''),auth.uid()) returning * into pay;
 for item in select * from jsonb_array_elements(p_payload->'allocations') loop
  insert into payment_allocations(payment_id,obligation_id,amount) values(pay.id,(item->>'obligation_id')::uuid,(item->>'amount')::numeric);
  update obligations set paid_amount=paid_amount+(item->>'amount')::numeric where id=(item->>'obligation_id')::uuid;
 end loop;
 for component in select * from jsonb_array_elements(components) loop
  insert into payment_components(payment_id,method,amount,reference) values(pay.id,(component->>'method')::payment_method,(component->>'amount')::numeric,nullif(trim(component->>'reference'),''));
 end loop;
 perform write_audit_event('payment.create','payments',pay.id::text,null,to_jsonb(pay)||jsonb_build_object('components',components),null);
 return jsonb_build_object('id',pay.id,'receipt_number',pay.receipt_number,'verification_token',pay.verification_token,'verification_url','/verificar-recibo/'||pay.verification_token);
end$$;

create or replace function public.refund_payment(p_payment_id uuid,p_amount numeric,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p payments;already numeric;remaining numeric;alloc record;reverse_amount numeric;component record;component_reverse numeric;cash_refunded numeric:=0;
begin
 if not has_permission('payments.void') or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then raise exception 'FORBIDDEN_OR_MFA'; end if;
 if p_amount<=0 or length(trim(p_reason))<15 then raise exception 'INVALID_REFUND'; end if;
 select * into p from payments where id=p_payment_id and organization_id=current_organization_id() for update;
 if p.id is null or p.status='voided' then raise exception 'INVALID_STATUS'; end if;
 select coalesce(sum(amount),0) into already from payment_events where payment_id=p.id and event_type='refund';
 if already+p_amount>p.total then raise exception 'REFUND_EXCEEDS_PAYMENT'; end if;
 remaining:=p_amount;
 for alloc in select pa.* from payment_allocations pa where pa.payment_id=p.id order by pa.amount desc for update loop
  exit when remaining<=0;
  reverse_amount:=least(remaining,alloc.amount-alloc.refunded_amount);
  if reverse_amount>0 then
   update payment_allocations set refunded_amount=refunded_amount+reverse_amount where payment_id=p.id and obligation_id=alloc.obligation_id;
   update obligations set paid_amount=greatest(0,paid_amount-reverse_amount) where id=alloc.obligation_id;
   remaining:=remaining-reverse_amount;
  end if;
 end loop;
 if remaining>0 then raise exception 'REFUND_ALLOCATION_FAILED';end if;
 remaining:=p_amount;
 for component in select * from payment_components where payment_id=p.id order by case when method='cash' then 0 else 1 end,amount desc for update loop
  exit when remaining<=0;
  component_reverse:=least(remaining,component.amount-component.refunded_amount);
  if component_reverse>0 then
   update payment_components set refunded_amount=refunded_amount+component_reverse where id=component.id;
   if component.method='cash' then cash_refunded:=cash_refunded+component_reverse;end if;
   remaining:=remaining-component_reverse;
  end if;
 end loop;
 insert into payment_events(organization_id,payment_id,event_type,amount,cash_amount,reason,created_by) values(current_organization_id(),p.id,'refund',p_amount,cash_refunded,p_reason,auth.uid());
 update payments set status=case when already+p_amount=p.total then 'refunded' else 'partially_refunded' end where id=p.id;
 perform write_audit_event('payment.refund','payments',p.id::text,null,jsonb_build_object('amount',p_amount,'reopened_debt',p_amount,'cash_amount',cash_refunded),p_reason);
 return jsonb_build_object('ok',true,'reopened_debt',p_amount,'cash_amount',cash_refunded);
end$$;

create or replace function public.close_cash_session(p_session_id uuid,p_counted_amount numeric,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r cash_sessions;expected numeric;opening numeric;cash_sales numeric;cash_refunds numeric;
begin
 if not has_permission('cash.manage') then raise exception 'FORBIDDEN'; end if;
 select opening_amount into opening from cash_sessions where id=p_session_id and organization_id=current_organization_id() and user_id=auth.uid() and status='open' for update;
 if opening is null then raise exception 'SESSION_NOT_FOUND';end if;
 select coalesce(sum(c.amount),0) into cash_sales from payments p join payment_components c on c.payment_id=p.id and c.method='cash' where p.cash_session_id=p_session_id and p.status<>'voided';
 select coalesce(sum(e.cash_amount),0) into cash_refunds from payment_events e join payments p on p.id=e.payment_id where p.cash_session_id=p_session_id and e.event_type='refund';
 expected:=opening+cash_sales-cash_refunds;
 update cash_sessions set status='closed',closed_at=now(),counted_amount=p_counted_amount,expected_amount=expected,difference=p_counted_amount-expected,notes=p_notes where id=p_session_id returning * into r;
 perform write_audit_event('cash.close','cash_sessions',r.id::text,null,to_jsonb(r),null);
 return to_jsonb(r);
end$$;

create or replace function public.get_transparency_report(p_year int)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if not has_permission('reports.read') then raise exception 'FORBIDDEN';end if;
 if p_year<2000 or p_year>2100 then raise exception 'INVALID_YEAR';end if;
 select jsonb_build_object(
  'summary','Consolidado anual generado exclusivamente desde movimientos confirmados y evidencias registradas.',
  'income_count',(select count(*) from payments where organization_id=current_organization_id() and extract(year from created_at)=p_year and status<>'voided'),
  'expense_count',(select count(*) from expenses where organization_id=current_organization_id() and extract(year from confirmed_at)=p_year and status='confirmed' and invoice_path is not null),
  'void_count',(select count(*) from payments where organization_id=current_organization_id() and extract(year from created_at)=p_year and status='voided'),
  'overdue_total',(select coalesce(sum(obligation_balance(original_amount,adjustment_amount,paid_amount)),0) from obligations where organization_id=current_organization_id() and cancelled_at is null and due_date<current_date),
  'expenses_by_category',(select coalesce(jsonb_agg(x),'[]'::jsonb) from(select category,sum(amount) total,count(*) documents from expenses where organization_id=current_organization_id() and extract(year from confirmed_at)=p_year and status='confirmed' group by category order by total desc)x),
  'expenses_detail',(select coalesce(jsonb_agg(x),'[]'::jsonb) from(select id,confirmed_at::date date,description,reason,category,supplier,amount,invoice_number,invoice_path,paid_from from expenses where organization_id=current_organization_id() and extract(year from confirmed_at)=p_year and status='confirmed' order by confirmed_at)x),
  'payments_detail',(select coalesce(jsonb_agg(x),'[]'::jsonb) from(select p.receipt_number,p.created_at::date date,s.code subscriber_code,s.full_name subscriber_name,p.method,p.total,p.status from payments p join subscribers s on s.id=p.subscriber_id where p.organization_id=current_organization_id() and extract(year from p.created_at)=p_year order by p.created_at)x),
  'overdue_detail',(select coalesce(jsonb_agg(x),'[]'::jsonb) from(select s.code subscriber_code,s.full_name subscriber_name,o.description,o.due_date,obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount) balance from obligations o join subscribers s on s.id=o.subscriber_id where o.organization_id=current_organization_id() and o.cancelled_at is null and o.due_date<current_date and obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)>0 order by o.due_date)x)
 ) into result;
 return result;
end$$;

do $$ begin
 insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('organization-assets','organization-assets',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
exception when undefined_table then null;end $$;

create policy organization_assets_read on storage.objects for select using(bucket_id='organization-assets' and (storage.foldername(name))[1]=current_organization_id()::text);
create policy organization_assets_insert on storage.objects for insert with check(bucket_id='organization-assets' and (storage.foldername(name))[1]=current_organization_id()::text and has_permission('settings.manage'));
create policy organization_assets_update on storage.objects for update using(bucket_id='organization-assets' and (storage.foldername(name))[1]=current_organization_id()::text and has_permission('settings.manage')) with check(bucket_id='organization-assets' and (storage.foldername(name))[1]=current_organization_id()::text and has_permission('settings.manage'));
create policy receipt_files_update on storage.objects for update using(bucket_id='receipt-documents' and (storage.foldername(name))[1]=current_organization_id()::text and has_permission('payments.create')) with check(bucket_id='receipt-documents' and (storage.foldername(name))[1]=current_organization_id()::text and has_permission('payments.create'));


create or replace function public.log_session_event(p_action text,p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
 if p_action not in('session.login','session.logout') then raise exception 'INVALID_SESSION_ACTION';end if;
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 perform write_audit_event(p_action,'session',auth.uid()::text,null,p_metadata,null);
end$$;

create or replace function public.get_payment_receipt_data(p_payment_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if not has_permission('payments.read') then raise exception 'FORBIDDEN';end if;
 select jsonb_build_object(
  'id',p.id,'receipt_number',p.receipt_number,'created_at',p.created_at,'total',p.total,
  'received_amount',p.received_amount,'change_amount',p.change_amount,'method',p.method,'status',p.status,
  'verification_token',p.verification_token,'subscriber_name',s.full_name,'subscriber_code',s.code,
  'items',(select coalesce(jsonb_agg(jsonb_build_object('description',o.description,'amount',pa.amount) order by o.due_date),'[]'::jsonb) from payment_allocations pa join obligations o on o.id=pa.obligation_id where pa.payment_id=p.id),
  'components',(select coalesce(jsonb_agg(jsonb_build_object('method',c.method,'amount',c.amount,'reference',c.reference)),'[]'::jsonb) from payment_components c where c.payment_id=p.id)
 ) into result from payments p join subscribers s on s.id=p.subscriber_id
 where p.id=p_payment_id and p.organization_id=current_organization_id();
 if result is null then raise exception 'PAYMENT_NOT_FOUND';end if;
 return result;
end$$;

create or replace function public.record_payment_reprint(p_payment_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare p payments;
begin
 if not has_permission('payments.read') then raise exception 'FORBIDDEN';end if;
 select * into p from payments where id=p_payment_id and organization_id=current_organization_id();
 if p.id is null then raise exception 'PAYMENT_NOT_FOUND';end if;
 insert into payment_events(organization_id,payment_id,event_type,reason,created_by) values(current_organization_id(),p.id,'reprint','Reimpresión marcada como copia',auth.uid());
 perform write_audit_event('payment.reprint','payments',p.id::text,null,jsonb_build_object('receipt_number',p.receipt_number,'copy',true),'Reimpresión marcada como copia');
end$$;

commit;
