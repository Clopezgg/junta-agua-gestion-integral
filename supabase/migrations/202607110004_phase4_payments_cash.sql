begin;

create type public.payment_method as enum('cash','transfer','deposit','check','mixed');
create type public.payment_status as enum('confirmed','voided','partially_refunded','refunded');
create type public.cash_session_status as enum('open','closed');

create table public.document_sequences(
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sequence_key text not null,
  sequence_year integer not null,
  current_value bigint not null default 0 check(current_value>=0),
  primary key(organization_id,sequence_key,sequence_year)
);

create table public.cash_sessions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  location text,
  opening_amount numeric(14,2) not null default 0 check(opening_amount>=0),
  status public.cash_session_status not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  expected_amount numeric(14,2),
  counted_amount numeric(14,2),
  difference numeric(14,2),
  notes text
);
create unique index one_open_cash_session_per_user on public.cash_sessions(organization_id,user_id) where status='open';

create table public.payments(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscriber_id uuid not null references public.subscribers(id),
  cash_session_id uuid references public.cash_sessions(id),
  receipt_number text not null,
  method public.payment_method not null,
  total numeric(14,2) not null check(total>0),
  received_amount numeric(14,2) not null check(received_amount>=total),
  change_amount numeric(14,2) generated always as (received_amount-total) stored,
  reference text,
  verification_token uuid not null default gen_random_uuid(),
  status public.payment_status not null default 'confirmed',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(organization_id,receipt_number),
  unique(verification_token)
);

create table public.payment_allocations(
  payment_id uuid not null references public.payments(id) on delete cascade,
  obligation_id uuid not null references public.obligations(id),
  amount numeric(14,2) not null check(amount>0),
  primary key(payment_id,obligation_id)
);

create table public.payment_events(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payment_id uuid not null references public.payments(id),
  event_type text not null check(event_type in('void','refund','reprint')),
  amount numeric(14,2),
  reason text not null check(length(trim(reason))>=15),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

insert into public.permissions(code,description) values
('payments.read','Consultar pagos'),('payments.create','Registrar pagos'),('payments.void','Anular y devolver pagos'),('cash.manage','Administrar caja')
on conflict(code) do update set description=excluded.description;
insert into public.role_permissions(role_id,permission_code)
select r.id,p.code from public.roles r cross join public.permissions p
where r.code='superadmin' and p.code in('payments.read','payments.create','payments.void','cash.manage')
on conflict do nothing;

alter table public.document_sequences enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.payment_events enable row level security;
create policy cash_read on public.cash_sessions for select using(organization_id=current_organization_id() and has_permission('payments.read'));
create policy payment_read on public.payments for select using(organization_id=current_organization_id() and has_permission('payments.read'));
create policy allocation_read on public.payment_allocations for select using(exists(select 1 from public.payments p where p.id=payment_id and p.organization_id=current_organization_id() and has_permission('payments.read')));
create policy payment_event_read on public.payment_events for select using(organization_id=current_organization_id() and has_permission('payments.read'));
revoke insert,update,delete on public.document_sequences,public.cash_sessions,public.payments,public.payment_allocations,public.payment_events from authenticated;

create or replace function public.next_document_number(p_key text,p_prefix text,p_width int default 6)
returns text language plpgsql security definer set search_path=public as $$
declare y int:=extract(year from current_date)::int;n bigint;
begin
 insert into document_sequences(organization_id,sequence_key,sequence_year,current_value)
 values(current_organization_id(),p_key,y,1)
 on conflict(organization_id,sequence_key,sequence_year)
 do update set current_value=document_sequences.current_value+1
 returning current_value into n;
 return p_prefix||'-'||y||'-'||lpad(n::text,p_width,'0');
end$$;

create or replace function public.open_cash_session(p_opening_amount numeric,p_location text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r cash_sessions;
begin
 if not has_permission('cash.manage') then raise exception 'FORBIDDEN'; end if;
 if p_opening_amount<0 then raise exception 'INVALID_OPENING_AMOUNT'; end if;
 insert into cash_sessions(organization_id,user_id,opening_amount,location)
 values(current_organization_id(),auth.uid(),p_opening_amount,nullif(trim(p_location),'')) returning * into r;
 perform write_audit_event('cash.open','cash_sessions',r.id::text,null,to_jsonb(r),null);
 return to_jsonb(r);
exception when unique_violation then raise exception 'OPEN_SESSION_EXISTS';
end$$;

create or replace function public.get_active_cash_session()
returns jsonb language sql stable security definer set search_path=public as $$
 select to_jsonb(c) from cash_sessions c where c.organization_id=current_organization_id() and c.user_id=auth.uid() and c.status='open' limit 1
$$;

create or replace function public.search_payable_accounts(p_query text,p_limit int default 50)
returns setof jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object(
  'id',s.id,'code',s.code,'full_name',s.full_name,
  'total_balance',sum(obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)),
  'obligations',jsonb_agg(jsonb_build_object('id',o.id,'description',o.description,'due_date',o.due_date,'balance',obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)) order by o.due_date)
 )
 from subscribers s join obligations o on o.subscriber_id=s.id and o.cancelled_at is null
 where s.organization_id=current_organization_id() and has_permission('payments.read')
 and obligation_balance(o.original_amount,o.adjustment_amount,o.paid_amount)>0
 and (coalesce(trim(p_query),'')='' or s.code ilike '%'||trim(p_query)||'%' or s.full_name ilike '%'||trim(p_query)||'%' or exists(select 1 from subscriber_identities i where i.subscriber_id=s.id and i.normalized_number like '%'||normalize_identifier(p_query)||'%'))
 group by s.id order by s.full_name limit least(greatest(p_limit,1),100)
$$;

create or replace function public.register_payment(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();pay payments;item jsonb;obl obligations;sum_alloc numeric:=0;receipt text;session cash_sessions;
begin
 if not has_permission('payments.create') then raise exception 'FORBIDDEN'; end if;
 if coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then raise exception 'MFA_REQUIRED'; end if;
 if jsonb_array_length(coalesce(p_payload->'allocations','[]'::jsonb))=0 then raise exception 'ALLOCATIONS_REQUIRED'; end if;
 if nullif(p_payload->>'cash_session_id','') is not null then
  select * into session from cash_sessions where id=(p_payload->>'cash_session_id')::uuid and organization_id=org and user_id=auth.uid() and status='open' for update;
  if session.id is null then raise exception 'ACTIVE_CASH_SESSION_REQUIRED'; end if;
 end if;
 for item in select * from jsonb_array_elements(p_payload->'allocations') loop
  select * into obl from obligations where id=(item->>'obligation_id')::uuid and organization_id=org and cancelled_at is null for update;
  if obl.id is null then raise exception 'OBLIGATION_NOT_FOUND'; end if;
  if (item->>'amount')::numeric<=0 or (item->>'amount')::numeric>obligation_balance(obl.original_amount,obl.adjustment_amount,obl.paid_amount) then raise exception 'INVALID_ALLOCATION'; end if;
  sum_alloc:=sum_alloc+(item->>'amount')::numeric;
 end loop;
 if (p_payload->>'received_amount')::numeric<sum_alloc then raise exception 'INSUFFICIENT_RECEIVED_AMOUNT'; end if;
 receipt:=next_document_number('receipt','REC',6);
 insert into payments(organization_id,subscriber_id,cash_session_id,receipt_number,method,total,received_amount,reference,created_by)
 values(org,(p_payload->>'subscriber_id')::uuid,nullif(p_payload->>'cash_session_id','')::uuid,(receipt),(p_payload->>'method')::payment_method,sum_alloc,(p_payload->>'received_amount')::numeric,nullif(trim(p_payload->>'reference'),''),auth.uid()) returning * into pay;
 for item in select * from jsonb_array_elements(p_payload->'allocations') loop
  insert into payment_allocations(payment_id,obligation_id,amount) values(pay.id,(item->>'obligation_id')::uuid,(item->>'amount')::numeric);
  update obligations set paid_amount=paid_amount+(item->>'amount')::numeric where id=(item->>'obligation_id')::uuid;
 end loop;
 perform write_audit_event('payment.create','payments',pay.id::text,null,to_jsonb(pay),null);
 return jsonb_build_object('id',pay.id,'receipt_number',pay.receipt_number,'verification_token',pay.verification_token,'verification_url','/verificar-recibo/'||pay.verification_token);
end$$;

create or replace function public.close_cash_session(p_session_id uuid,p_counted_amount numeric,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r cash_sessions;expected numeric;
begin
 if not has_permission('cash.manage') then raise exception 'FORBIDDEN'; end if;
 select c.opening_amount+coalesce(sum(case when p.method='cash' and p.status='confirmed' then p.total else 0 end),0)-coalesce(sum(case when e.event_type='refund' then e.amount else 0 end),0)
 into expected from cash_sessions c left join payments p on p.cash_session_id=c.id left join payment_events e on e.payment_id=p.id
 where c.id=p_session_id and c.organization_id=current_organization_id() and c.user_id=auth.uid() and c.status='open' group by c.opening_amount;
 if expected is null then raise exception 'SESSION_NOT_FOUND'; end if;
 update cash_sessions set status='closed',closed_at=now(),counted_amount=p_counted_amount,expected_amount=expected,difference=p_counted_amount-expected,notes=p_notes where id=p_session_id returning * into r;
 perform write_audit_event('cash.close','cash_sessions',r.id::text,null,to_jsonb(r),null);
 return to_jsonb(r);
end$$;

create or replace function public.list_payments(p_limit int default 100)
returns setof jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('id',p.id,'receipt_number',p.receipt_number,'subscriber_name',s.full_name,'created_at',p.created_at,'total',p.total,'received_amount',p.received_amount,'change_amount',p.change_amount,'method',p.method,'status',p.status)
 from payments p join subscribers s on s.id=p.subscriber_id
 where p.organization_id=current_organization_id() and has_permission('payments.read') order by p.created_at desc limit least(greatest(p_limit,1),500)
$$;

create or replace function public.void_payment(p_payment_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p payments;r record;
begin
 if not has_permission('payments.void') or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then raise exception 'FORBIDDEN_OR_MFA'; end if;
 if length(trim(p_reason))<15 then raise exception 'REASON_REQUIRED'; end if;
 select * into p from payments where id=p_payment_id and organization_id=current_organization_id() for update;
 if p.id is null or p.status<>'confirmed' then raise exception 'INVALID_STATUS'; end if;
 for r in select * from payment_allocations where payment_id=p.id loop update obligations set paid_amount=greatest(0,paid_amount-r.amount) where id=r.obligation_id; end loop;
 update payments set status='voided' where id=p.id;
 insert into payment_events(organization_id,payment_id,event_type,reason,created_by) values(current_organization_id(),p.id,'void',p_reason,auth.uid());
 perform write_audit_event('payment.void','payments',p.id::text,to_jsonb(p),jsonb_build_object('status','voided'),p_reason);
 return jsonb_build_object('ok',true);
end$$;

create or replace function public.refund_payment(p_payment_id uuid,p_amount numeric,p_reason text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p payments;already numeric;
begin
 if not has_permission('payments.void') or coalesce((auth.jwt()->>'aal'),'aal1')<>'aal2' then raise exception 'FORBIDDEN_OR_MFA'; end if;
 if p_amount<=0 or length(trim(p_reason))<15 then raise exception 'INVALID_REFUND'; end if;
 select * into p from payments where id=p_payment_id and organization_id=current_organization_id() for update;
 if p.id is null or p.status='voided' then raise exception 'INVALID_STATUS'; end if;
 select coalesce(sum(amount),0) into already from payment_events where payment_id=p.id and event_type='refund';
 if already+p_amount>p.total then raise exception 'REFUND_EXCEEDS_PAYMENT'; end if;
 insert into payment_events(organization_id,payment_id,event_type,amount,reason,created_by) values(current_organization_id(),p.id,'refund',p_amount,p_reason,auth.uid());
 update payments set status=case when already+p_amount=p.total then 'refunded' else 'partially_refunded' end where id=p.id;
 perform write_audit_event('payment.refund','payments',p.id::text,null,jsonb_build_object('amount',p_amount),p_reason);
 return jsonb_build_object('ok',true);
end$$;
commit;
