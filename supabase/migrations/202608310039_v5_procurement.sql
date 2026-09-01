-- V5-FASE6 · Compras y proveedores: requisiciones, órdenes de compra y recepción.
begin;

-- Extender inventory_movements con trazabilidad de costo y referencia (compras/bodega).
alter table public.inventory_movements add column if not exists unit_cost numeric(14,2);
alter table public.inventory_movements add column if not exists reference_type text;
alter table public.inventory_movements add column if not exists reference_id uuid;

create type public.purchase_status as enum('borrador','aprobada','ordenada','recibida','cancelada');

create table public.purchase_requisitions(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  code text not null,
  requestor_id uuid not null references profiles(id),
  reason text not null,
  status text not null default 'pendiente' check(status in('pendiente','aprobada','rechazada')),
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique(organization_id,code)
);

create table public.purchase_requisition_lines(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  requisition_id uuid not null references purchase_requisitions(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null check(quantity>0),
  unit text,
  category text,
  created_at timestamptz not null default now()
);

create table public.purchase_orders(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  code text not null,
  requisition_id uuid references purchase_requisitions(id),
  supplier_id uuid not null references suppliers(id),
  status purchase_status not null default 'borrador',
  order_date date not null default current_date,
  expected_date date,
  total_amount numeric(14,2) not null default 0 check(total_amount>=0),
  paid_amount numeric(14,2) not null default 0 check(paid_amount>=0),
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);
create index purchase_orders_org_status on purchase_orders(organization_id,status);

create table public.purchase_order_lines(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null check(quantity>0),
  unit_price numeric(14,2) not null check(unit_price>=0),
  received_quantity numeric(12,2) not null default 0 check(received_quantity>=0),
  inventory_item_id uuid references inventory_items(id),
  created_at timestamptz not null default now()
);

create or replace function public.create_purchase_order(p_supplier_id uuid,p_requisition_id uuid default null,p_expected_date date default null,p_lines jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();oid uuid;n int;total numeric(14,2):=0;ln jsonb;
begin
  if not has_permission('expenses.create') then raise exception 'FORBIDDEN';end if;
  if auth.jwt()->>'aal'<>'aal2' then raise exception 'MFA_REQUIRED';end if;
  select count(*)+1 into n from purchase_orders where organization_id=org;
  for ln in select * from jsonb_array_elements(p_lines) loop
    total:=total+((ln->>'quantity')::numeric*(ln->>'unit_price')::numeric);
  end loop;
  insert into purchase_orders(organization_id,code,requisition_id,supplier_id,status,expected_date,total_amount,created_by)
  values(org,'PO-'||lpad(n::text,5,'0'),p_requisition_id,p_supplier_id,'aprobada',p_expected_date,total,auth.uid()) returning id into oid;
  for ln in select * from jsonb_array_elements(p_lines) loop
    insert into purchase_order_lines(organization_id,purchase_order_id,description,quantity,unit_price,inventory_item_id)
    values(org,oid,ln->>'description',(ln->>'quantity')::numeric,(ln->>'unit_price')::numeric,nullif(ln->>'inventory_item_id','')::uuid);
  end loop;
  perform write_audit_event('create','purchase_order',oid::text,null,jsonb_build_object('code','PO-'||lpad(n::text,5,'0')),'Nueva orden de compra');
  return oid;
end$$;

create or replace function public.receive_purchase_order(p_order_id uuid,p_line_receipts jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();lr jsonb;paid numeric:=0;
begin
  if not has_permission('inventory.manage') then raise exception 'FORBIDDEN';end if;
  if not exists(select 1 from purchase_orders where id=p_order_id and organization_id=org) then raise exception 'ORDER_NOT_FOUND';end if;
  for lr in select * from jsonb_array_elements(p_line_receipts) loop
    if (lr->>'received_quantity')::numeric>0 then
      insert into inventory_movements(organization_id,item_id,movement_type,quantity,unit_cost,work_order_id,reference_type,reference_id,created_by)
      select org,pol.inventory_item_id,'entry',(lr->>'received_quantity')::numeric,pol.unit_price,null,'purchase_order',p_order_id,auth.uid()
      from purchase_order_lines pol where pol.id=(lr->>'line_id')::uuid;
      update purchase_order_lines set received_quantity=(lr->>'received_quantity')::numeric where id=(lr->>'line_id')::uuid;
    end if;
  end loop;
  select sum(pol.quantity*pol.unit_price) into paid from purchase_order_lines pol where pol.purchase_order_id=p_order_id;
  update purchase_orders set status='recibida',paid_amount=coalesce(paid,0),updated_at=now() where id=p_order_id and organization_id=org;
  perform write_audit_event('update','purchase_order',p_order_id::text,null,jsonb_build_object('action','receive'),'Recepción de orden de compra');
end$$;

create or replace function public.list_purchase_orders(p_status text default null) returns setof purchase_orders
language sql stable security definer set search_path=public as $$
select * from purchase_orders where organization_id=current_organization_id() and has_permission('expenses.read') and (p_status is null or status=(p_status)::purchase_status) order by created_at desc$$;

alter table public.purchase_requisitions enable row level security;
alter table public.purchase_requisition_lines enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
create policy requisitions_read on purchase_requisitions for select using(organization_id=current_organization_id() and has_permission('expenses.read'));
create policy requisition_lines_read on purchase_requisition_lines for select using(organization_id=current_organization_id() and has_permission('expenses.read'));
create policy purchase_orders_read on purchase_orders for select using(organization_id=current_organization_id() and has_permission('expenses.read'));
create policy purchase_order_lines_read on purchase_order_lines for select using(organization_id=current_organization_id() and has_permission('expenses.read'));
revoke insert,update,delete on purchase_requisitions,purchase_requisition_lines,purchase_orders,purchase_order_lines from authenticated;

commit;
