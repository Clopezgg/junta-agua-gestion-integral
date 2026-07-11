begin;

create or replace function public.get_budget_dashboard(p_fiscal_year int)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  result jsonb;
begin
  if not public.has_permission('budget.read') then
    raise exception 'FORBIDDEN';
  end if;

  with selected_period as (
    select *
    from public.fiscal_periods
    where organization_id=public.current_organization_id()
      and fiscal_year=p_fiscal_year
    limit 1
  ),
  line_actuals as (
    select
      bl.id,
      bc.code,
      bc.name,
      bc.category_type,
      bc.match_pattern,
      bl.budget_amount,
      bl.notes,
      case
        when bc.category_type='income' then coalesce((
          select sum(le.amount)
          from public.ledger_entries le
          where le.organization_id=public.current_organization_id()
            and extract(year from le.entry_date)=p_fiscal_year
            and le.entry_type='income'
            and bc.match_pattern is not null
            and trim(bc.match_pattern)<>''
            and concat_ws(' ',le.source_type,le.account,le.description)
                ilike '%'||trim(bc.match_pattern)||'%'
        ),0)
        when bc.category_type='expense' then abs(coalesce((
          select sum(le.amount)
          from public.ledger_entries le
          where le.organization_id=public.current_organization_id()
            and extract(year from le.entry_date)=p_fiscal_year
            and le.entry_type='expense'
            and bc.match_pattern is not null
            and trim(bc.match_pattern)<>''
            and concat_ws(' ',le.source_type,le.account,le.description)
                ilike '%'||trim(bc.match_pattern)||'%'
        ),0))
        else greatest(0,least(
          bl.budget_amount,
          coalesce((select opening_cash+opening_bank from selected_period),0)
          +coalesce((
            select sum(le.amount)
            from public.ledger_entries le
            where le.organization_id=public.current_organization_id()
              and extract(year from le.entry_date)<=p_fiscal_year
          ),0)
        ))
      end as actual_amount
    from public.budget_lines bl
    join public.budget_categories bc on bc.id=bl.category_id
    join selected_period sp on sp.id=bl.fiscal_period_id
  ),
  totals as (
    select
      coalesce(sum(budget_amount) filter(where category_type='income'),0) as income_budget,
      coalesce(sum(actual_amount) filter(where category_type='income'),0) as income_actual,
      coalesce(sum(budget_amount) filter(where category_type='expense'),0) as expense_budget,
      coalesce(sum(actual_amount) filter(where category_type='expense'),0) as expense_actual,
      coalesce(sum(budget_amount) filter(where category_type='reserve'),0) as reserve_budget,
      coalesce(sum(actual_amount) filter(where category_type='reserve'),0) as reserve_actual
    from line_actuals
  )
  select jsonb_build_object(
    'period',(select to_jsonb(sp) from selected_period sp),
    'lines',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',la.id,
          'code',la.code,
          'name',la.name,
          'category_type',la.category_type,
          'match_pattern',la.match_pattern,
          'budget_amount',la.budget_amount,
          'actual_amount',la.actual_amount,
          'variance',case
            when la.category_type='expense' then la.budget_amount-la.actual_amount
            else la.actual_amount-la.budget_amount
          end,
          'execution_percent',case
            when la.budget_amount=0 then 0
            else round((la.actual_amount/la.budget_amount)*100,2)
          end,
          'notes',la.notes
        )
        order by la.category_type,la.code
      )
      from line_actuals la
    ),'[]'::jsonb),
    'summary',coalesce((select to_jsonb(t) from totals t),'{}'::jsonb),
    'current_balance',
      coalesce((select opening_cash+opening_bank from selected_period),0)
      +coalesce((
        select sum(le.amount)
        from public.ledger_entries le
        where le.organization_id=public.current_organization_id()
          and le.entry_date::date<=make_date(p_fiscal_year,12,31)
      ),0)
  ) into result;

  return coalesce(result,jsonb_build_object(
    'period',null,
    'lines','[]'::jsonb,
    'summary','{}'::jsonb,
    'current_balance',0
  ));
end
$$;

commit;
