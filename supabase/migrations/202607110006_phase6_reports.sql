begin;

insert into public.permissions(code,description) values
('reports.read','Consultar informes'),
('reports.export','Exportar informes')
on conflict(code) do update set description=excluded.description;

insert into public.role_permissions(role_id,permission_code)
select r.id,p.code
from public.roles r
cross join public.permissions p
where r.code='superadmin'
  and p.code in('reports.read','reports.export')
on conflict do nothing;

create or replace function public.get_financial_dashboard(p_from date,p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  inc numeric;
  exp numeric;
  bal numeric;
  monthly jsonb;
begin
  if not public.has_permission('finance.read') then
    raise exception 'FORBIDDEN';
  end if;

  if p_from is null or p_to is null or p_to<p_from then
    raise exception 'INVALID_RANGE';
  end if;

  select coalesce(sum(amount),0)
    into inc
  from public.ledger_entries
  where organization_id=public.current_organization_id()
    and entry_type='income'
    and entry_date::date between p_from and p_to;

  select abs(coalesce(sum(amount),0))
    into exp
  from public.ledger_entries
  where organization_id=public.current_organization_id()
    and entry_type in('expense','refund')
    and entry_date::date between p_from and p_to;

  select coalesce(sum(amount),0)
    into bal
  from public.ledger_entries
  where organization_id=public.current_organization_id()
    and entry_date::date<=p_to;

  with month_series as (
    select generate_series(
      date_trunc('month',p_from::timestamp),
      date_trunc('month',p_to::timestamp),
      interval '1 month'
    )::date as month_start
  ),
  aggregated as (
    select
      date_trunc('month',entry_date)::date as month_start,
      coalesce(sum(amount) filter(where entry_type='income'),0) as income_amount,
      abs(coalesce(sum(amount) filter(where entry_type in('expense','refund')),0)) as expense_amount
    from public.ledger_entries
    where organization_id=public.current_organization_id()
      and entry_date::date between p_from and p_to
    group by date_trunc('month',entry_date)::date
  ),
  monthly_rows as (
    select
      to_char(ms.month_start,'YYYY-MM') as month_key,
      coalesce(a.income_amount,0) as income_amount,
      coalesce(a.expense_amount,0) as expense_amount,
      coalesce(a.income_amount,0)-coalesce(a.expense_amount,0) as net_amount
    from month_series ms
    left join aggregated a using(month_start)
  ),
  monthly_balances as (
    select
      month_key,
      income_amount,
      expense_amount,
      net_amount,
      sum(net_amount) over(order by month_key) as running_balance
    from monthly_rows
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'month',month_key,
        'income',income_amount,
        'expense',expense_amount,
        'net',net_amount,
        'running_balance',running_balance
      )
      order by month_key
    ),
    '[]'::jsonb
  )
  into monthly
  from monthly_balances;

  return jsonb_build_object(
    'income',inc,
    'expense',exp,
    'balance',bal,
    'monthly',monthly
  );
end
$$;

create or replace function public.get_transparency_report(p_year int)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  result jsonb;
begin
  if not public.has_permission('reports.read') then
    raise exception 'FORBIDDEN';
  end if;

  if p_year<2000 or p_year>2100 then
    raise exception 'INVALID_YEAR';
  end if;

  select jsonb_build_object(
    'summary','Consolidado anual generado exclusivamente desde movimientos confirmados y evidencias registradas.',
    'income_count',(
      select count(*)
      from public.payments
      where organization_id=public.current_organization_id()
        and extract(year from created_at)=p_year
        and status<>'voided'
    ),
    'expense_count',(
      select count(*)
      from public.expenses
      where organization_id=public.current_organization_id()
        and extract(year from created_at)=p_year
        and status='confirmed'
        and invoice_path is not null
    ),
    'void_count',(
      select count(*)
      from public.payments
      where organization_id=public.current_organization_id()
        and extract(year from created_at)=p_year
        and status='voided'
    ),
    'overdue_total',(
      select coalesce(sum(public.obligation_balance(original_amount,adjustment_amount,paid_amount)),0)
      from public.obligations
      where organization_id=public.current_organization_id()
        and cancelled_at is null
        and due_date<current_date
    ),
    'expenses_by_category',(
      select coalesce(jsonb_agg(x),'[]'::jsonb)
      from (
        select category,sum(amount) as total,count(*) as documents
        from public.expenses
        where organization_id=public.current_organization_id()
          and extract(year from created_at)=p_year
          and status='confirmed'
        group by category
        order by total desc
      ) x
    ),
    'expenses_detail',(
      select coalesce(jsonb_agg(x),'[]'::jsonb)
      from (
        select created_at::date as expense_date,description,reason,category,supplier,amount,invoice_number,invoice_path
        from public.expenses
        where organization_id=public.current_organization_id()
          and extract(year from created_at)=p_year
          and status='confirmed'
        order by created_at
      ) x
    )
  ) into result;

  return result;
end
$$;

commit;
