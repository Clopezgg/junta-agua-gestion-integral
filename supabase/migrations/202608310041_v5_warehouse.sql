-- V5-FASE8 · Bodega: ubicaciones de inventario, unidades y apoyos de compra.
begin;

create table public.warehouses(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  code text not null,
  name text not null,
  address text,
  active boolean not null default true,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique(organization_id,code)
);

-- Inventario por bodega de referencia/cantidad mínima.
create table public.inventory_warehouse(
  organization_id uuid not null references organizations(id),
  item_id uuid not null references inventory_items(id) on delete cascade,
  warehouse_id uuid not null references warehouses(id) on delete cascade,
  quantity numeric(14,3) not null default 0 check(quantity>=0),
  min_stock numeric(14,3) not null default 0 check(min_stock>=0),
  primary key(item_id,warehouse_id)
);
create index inventory_warehouse_org on inventory_warehouse(organization_id,warehouse_id);

-- Movimientos con bodega de destino (entrada/salida).
alter table public.inventory_movements add column if not exists warehouse_id uuid references warehouses(id);

create or replace function public.list_warehouses() returns setof warehouses
language sql stable security definer set search_path=public as $$
select * from warehouses where organization_id=current_organization_id() and has_permission('inventory.read') order by name$$;

create or replace function public.create_warehouse(p_code text,p_name text,p_address text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare org uuid:=current_organization_id();wid uuid;
begin
  if not has_permission('inventory.manage') then raise exception 'FORBIDDEN';end if;
  insert into warehouses(organization_id,code,name,address,created_by) values(org,upper(trim(p_code)),trim(p_name),p_address,auth.uid()) returning id into wid;
  return wid;
end$$;

create or replace function public.get_inventory_with_warehouses() returns jsonb
language sql stable security definer set search_path=public as $$
select coalesce(jsonb_agg(jsonb_build_object('item',to_jsonb(i),'stocks',coalesce((select jsonb_agg(to_jsonb(iw)||jsonb_build_object('warehouse',to_jsonb(w))) from inventory_warehouse iw join warehouses w on w.id=iw.warehouse_id where iw.item_id=i.id),'[]'::jsonb))),'[]'::jsonb)
from inventory_items i where i.organization_id=current_organization_id() and i.active and has_permission('inventory.read')$$;

alter table public.warehouses enable row level security;
alter table public.inventory_warehouse enable row level security;
create policy warehouses_read on warehouses for select using(organization_id=current_organization_id() and has_permission('inventory.read'));
create policy inventory_warehouse_read on inventory_warehouse for select using(organization_id=current_organization_id() and has_permission('inventory.read'));
revoke insert,update,delete on warehouses,inventory_warehouse from authenticated;

commit;
