import {supabase} from '../../lib/supabase';

function db(){if(!supabase)throw new Error('La base segura aún no está configurada.');return supabase;}
function fail(error:{message:string}|null){if(error)throw new Error(error.message);}

export type FiscalPeriod={
  id:string;
  fiscal_year:number;
  status:'draft'|'approved'|'closed';
  opening_cash:number;
  opening_bank:number;
  reserve_target:number;
  notes?:string|null;
};

export type BudgetLine={
  id:string;
  code:string;
  name:string;
  category_type:'income'|'expense'|'reserve';
  match_pattern?:string|null;
  budget_amount:number;
  actual_amount:number;
  variance:number;
  execution_percent:number;
  notes?:string|null;
};

export type BudgetDashboard={
  period: FiscalPeriod|null;
  lines: BudgetLine[];
  summary:{
    income_budget?:number;
    income_actual?:number;
    expense_budget?:number;
    expense_actual?:number;
    reserve_budget?:number;
    reserve_actual?:number;
  };
  current_balance:number;
};

export async function getBudgetDashboard(year:number){
  const{data,error}=await db().rpc('get_budget_dashboard',{p_fiscal_year:year});
  fail(error);
  return(data??{period:null,lines:[],summary:{},current_balance:0}) as BudgetDashboard;
}

export async function saveFiscalPeriod(payload:{fiscal_year:number;opening_cash:number;opening_bank:number;reserve_target:number;notes?:string}){
  const{data,error}=await db().rpc('save_fiscal_period',{p_payload:payload});
  fail(error);
  return data as FiscalPeriod;
}

export async function saveBudgetLine(payload:{fiscal_period_id:string;code:string;name:string;category_type:'income'|'expense'|'reserve';match_pattern?:string;budget_amount:number;notes?:string}){
  const{data,error}=await db().rpc('save_budget_line',{p_payload:payload});
  fail(error);
  return data;
}

export async function approveBudget(year:number){
  const{data,error}=await db().rpc('approve_budget',{p_fiscal_year:year});
  fail(error);
  return data as FiscalPeriod;
}
