begin;
insert into permissions(code,description) values('reports.read','Consultar informes'),('reports.export','Exportar informes') on conflict(code) do update set description=excluded.description;
insert into role_permissions(role_id,permission_code) select r.id,p.code from roles r cross join permissions p where r.code='superadmin' and p.code in('reports.read','reports.export') on conflict do nothing;

create or replace function public.get_financial_dashboard(p_from date,p_to date)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare inc numeric;exp numeric;bal numeric;monthly jsonb;
begin
 if not has_permission('finance.read') then raise exception 'FORBIDDEN';end if;
 if p_to<p_from then raise exception 'INVALID_RANGE';end if;
 select coalesce(sum(amount),0) into inc from ledger_entries where organization_id=current_organization_id() and entry_type='income' and entry_date::date between p_from and p_to;
 select abs(coalesce(sum(amount),0)) into exp from ledger_entries where organization_id=current_organization_id() and entry_type in('expense','refund') and entry_date::date between p_from and p_to;
 select coalesce(sum(amount),0) into bal from ledger_entries where organization_id=current_organization_id() and entry_date::date<=p_to;
 with months as(select generate_series(date_trunc('month',p_from::timestamp),date_trunc('month',p_to::timestamp),interval '1 month')::date m),agg as(select date_trunc('month',entry_date)::date m,sum(amount) filter(where entry_type='income') income,abs(sum(amount) filter(where entry_type in('expense','refund'))) expense from ledger_entries where organization_id=current_organization_id() and entry_date::date between p_from and p_to group by 1),rows as(select to_char(months.m,'YYYY-MM') month,coalesce(agg.income,0) income,coalesce(agg.expense,0) expense,coalesce(agg.income,0)-coalesce(agg.expense,0) net from months left join agg using(m)) select jsonb_agg(jsonb_build_object('month',month,'income',income,'expense',expense,'net',net,'running_balance',sum(net) over(order by month)) order by month) into monthly from rows;
 return jsonb_build_object('income',inc,'expense',exp,'balance',bal,'monthly',coalesce(monthly,'[]'::jsonb));
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
  'expense_count',(select count(*) from expenses where organization_id=current_organization_id() and extract(year from created_at)=p_year and status='confirmed' and invoice_path is not null),
  'void_count',(select count(*) from payments where organization_id=current_organization_id() and extract(year from created_at)=p_year and status='voided'),
  'overdue_total',(select coalesce(sum(obligation_balance(original_amount,adjustment_amount,paid_amount)),0) from obligations where organization_id=current_organization_id() and cancelled_at is null and due_date<current_date),
  'expenses_by_category',(select coalesce(jsonb_agg(x),'[]'::jsonb) from(select category,sum(amount) total,count(*) documents from expenses where organization_id=current_organization_id() and extract(year from created_at)=p_year and status='confirmed' group by category order by total desc)x),
  'expenses_detail',(select coalesce(jsonb_agg(x),'[]'::jsonb) from(select created_at::date date,description,reason,category,supplier,amount,invoice_number,invoice_path from expenses where organization_id=current_organization_id() and extract(year from created_at)=p_year and status='confirmed' order by created_at)x)
 ) into result;
 return result;
end$$;
commit;
