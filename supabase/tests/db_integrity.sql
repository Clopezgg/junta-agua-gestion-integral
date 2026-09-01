-- Verificación estructural de integridad financiera sobre una base local recién
-- migrada (001..034). Ejecución: psql "$DATABASE_URL" -f supabase/tests/db_integrity.sql
-- Falla (exit != 0) ante cualquier invariante roto. No muta datos: solo inspección.

\set ON_ERROR_STOP on

do $$
declare n int;
begin
  -- 1) Tablas core creadas o respaldadas por la migración 032
  select count(*) into n from pg_tables
  where schemaname='public' and tablename in
   ('subscriber_connection_sequences','cash_movements','document_artifacts','late_fee_policies',
    'financial_documents','payments','expenses','obligations','payment_events','payment_components');
  if n<>10 then raise exception 'TABLAS_CORE_INCOMPLETAS: %', n; end if;

  -- 2) Columnas de integridad
  select count(*) into n from information_schema.columns
  where table_schema='public'
    and ((table_name='payments' and column_name='idempotency_key')
      or (table_name='expenses' and column_name='idempotency_key')
      or (table_name='obligations' and column_name in
          ('late_fee_pending','base_amount','discount_amount','late_fee_amount','calculation_snapshot','original_amount','paid_amount')));
  if n<>9 then raise exception 'COLUMNAS_INTEGRIDAD_INCOMPLETAS: %', n; end if;

  -- 3) Índices de unicidad y acceso
  if to_regclass('public.payments_idempotency_unique') is null then raise exception 'FALTA payments_idempotency_unique'; end if;
  if to_regclass('public.expenses_idempotency_unique') is null then raise exception 'FALTA expenses_idempotency_unique'; end if;
  if to_regclass('public.document_artifacts_document_idx') is null then raise exception 'FALTA document_artifacts_document_idx'; end if;
  if to_regclass('public.cash_movements_session_idx') is null then raise exception 'FALTA cash_movements_session_idx'; end if;

  -- 4) Funciones críticas presentes con la firma esperada
  if to_regprocedure('public.next_connection_code(uuid)') is null then raise exception 'FALTA next_connection_code'; end if;
  if to_regprocedure('public.create_water_connection(uuid,jsonb)') is null then raise exception 'FALTA create_water_connection'; end if;
  if to_regprocedure('public.register_payment(jsonb)') is null then raise exception 'FALTA register_payment'; end if;
  if to_regprocedure('public.create_expense_request(jsonb)') is null then raise exception 'FALTA create_expense_request'; end if;
  if to_regprocedure('public.evaluate_benefit_eligibility(uuid,text,date)') is null then raise exception 'FALTA evaluate_benefit_eligibility'; end if;
  if to_regprocedure('public.calculate_annual_charge(uuid,integer,numeric)') is null then raise exception 'FALTA calculate_annual_charge'; end if;
  if to_regprocedure('public.sync_senior_benefit(uuid,date)') is null then raise exception 'FALTA sync_senior_benefit'; end if;
  if to_regprocedure('public.get_late_fee_policy()') is null then raise exception 'FALTA get_late_fee_policy'; end if;
  if to_regprocedure('public.obligation_late_fee_label(numeric,boolean)') is null then raise exception 'FALTA obligation_late_fee_label'; end if;
  if to_regprocedure('public.generate_annual_obligations(uuid,integer,date)') is null then raise exception 'FALTA generate_annual_obligations'; end if;
  if to_regprocedure('public.post_annual_financial_document(uuid)') is null then raise exception 'FALTA post_annual_financial_document'; end if;
  if to_regprocedure('public.verify_receipt_public(uuid)') is null then raise exception 'FALTA verify_receipt_public'; end if;
  if to_regprocedure('public.get_payment_receipt_data(uuid)') is null then raise exception 'FALTA get_payment_receipt_data'; end if;
  if to_regprocedure('public.register_document_artifact(uuid,text)') is null then raise exception 'FALTA register_document_artifact'; end if;
  if to_regprocedure('public.complete_document_artifact(uuid,text,text,text,text)') is null then raise exception 'FALTA complete_document_artifact'; end if;
  if to_regprocedure('public.fail_document_artifact(uuid,text)') is null then raise exception 'FALTA fail_document_artifact'; end if;
  if to_regprocedure('public.list_document_artifacts(uuid)') is null then raise exception 'FALTA list_document_artifacts'; end if;

  -- 5) Inmutabilidad por disparadores y verificador público sin ruta interna
  select count(*) into n from pg_trigger where tgname in ('financial_documents_immutable','payments_immutable','audit_events_append_only','document_artifacts_immutable');
  if n<>4 then raise exception 'DISPARADORES_INMUTABILIDAD_INCOMPLETOS: %', n; end if;
  select count(*) into n from pg_trigger where tgname like 'cash_movements_%';
  if n<>5 then raise exception 'DISPARADORES_CAJA_INCOMPLETOS: %', n; end if;
  perform 1 from pg_proc where proname='verify_receipt_public' and pg_get_functiondef(oid) like '%decision_path%';
  if found then raise exception 'verify_receipt_public EXTIENDE rutas internas'; end if;

  -- 6) Permisos granulares de respaldo aplicados por rol
  select count(*) into n
  from public.role_permissions rp
  join public.roles r on r.id=rp.role_id
  join public.permissions p on p.code=rp.permission_code
  where p.code like 'backups.%';
  if n<>6 then raise exception 'PERMISOS_RESPALDO_INCORRECTOS: %', n; end if;

  -- 7) Métodos de pago admitidos presentes
  select count(*) into n from pg_enum e
  join pg_type t on t.oid=e.enumtypid
  where t.typname='payment_method' and e.enumlabel in ('cash','transfer','deposit','check','mixed');
  if n<>5 then raise exception 'ENUM payment_method INCOMPLETO: %', n; end if;

  -- 8) Invariantes de la migración 033
  if to_regprocedure('public.update_subscriber(uuid,jsonb)') is null then raise exception 'FALTA update_subscriber'; end if;
  if to_regprocedure('public.update_water_connection(uuid,jsonb)') is null then raise exception 'FALTA update_water_connection'; end if;
  if to_regprocedure('public.record_login_attempt(text,boolean)') is null then raise exception 'FALTA record_login_attempt'; end if;
  if to_regprocedure('public.get_login_cooldown_seconds(text)') is null then raise exception 'FALTA get_login_cooldown_seconds'; end if;
  select count(*) into n from pg_trigger where tgname in
    ('forbid_delete_payments','forbid_delete_financial_documents','forbid_delete_subscribers','forbid_delete_cash_sessions','forbid_delete_audit_events');
  if n<>5 then raise exception 'PROTECCION_DELETE_INCOMPLETA: %', n; end if;
  select count(*) into n from pg_trigger where tgname in ('cash_session_closed_guard','cash_movement_session_guard');
  if n<>2 then raise exception 'PROTECCION_CAJA_INCOMPLETA: %', n; end if;
  select count(*) into n from pg_constraint where conname in
    ('water_connections_code_format','obligations_nonnegative_components','benefits_window_valid');
  if n<>3 then raise exception 'CONSTRAINTS_033_INCOMPLETOS: %', n; end if;
  if to_regclass('public.login_attempt_cooldowns') is null then raise exception 'FALTA login_attempt_cooldowns'; end if;

  raise notice 'Integridad financiera (migración 032) e invariantes (033) verificadas: OK';

  -- 9) Trazabilidad de restauraciones (migración 034)
  if to_regclass('public.backup_restore_sessions') is null then raise exception 'FALTA backup_restore_sessions'; end if;
  if to_regprocedure('public.get_backup_restore_sessions(int)') is null then raise exception 'FALTA get_backup_restore_sessions'; end if;
  raise notice 'Trazabilidad de restauraciones (migración 034) verificada: OK';

  -- 10) Retención automática de respaldos (migración 035)
  select count(*) into n
  from information_schema.columns
  where table_schema='public' and table_name='backup_runs'
    and column_name in ('retention_days','pruned_at','pruned_by');
  if n<>3 then raise exception 'RETENCION_RESPALDOS_INCOMPLETA: %', n; end if;
  raise notice 'Retención de respaldos (migración 035) verificada: OK';

  -- 11) Asistente de configuración inicial (migración 202609010009)
  select count(*) into n
  from information_schema.columns
  where table_schema='public' and table_name='organizations'
    and column_name in ('department','municipality','community','legal_representative_name',
      'legal_representative_title','incorporation_reference','founding_date','service_type',
      'metering_enabled','setup_progress','setup_completed_at');
  if n<>11 then raise exception 'PERFIL_INSTITUCIONAL_INCOMPLETO: %', n; end if;
  if to_regprocedure('public.save_setup_progress(jsonb)') is null then raise exception 'FALTA save_setup_progress'; end if;
  if to_regprocedure('public.complete_setup(jsonb)') is null then raise exception 'FALTA complete_setup'; end if;
  -- update_organization_settings ya no borra claves ausentes (merge por clave)
  if position('p_payload ? ' in pg_get_functiondef('public.update_organization_settings(jsonb)'::regprocedure))=0
    then raise exception 'update_organization_settings NO hace merge por clave (riesgo de pérdida de datos)'; end if;
  raise notice 'Asistente de configuración inicial (migración 009) verificado: OK';

  -- 12) Listado profesional de abonados (migración 202609010010)
  if to_regprocedure('public.list_subscribers(text,text,text,text,boolean,int,int)') is null
    then raise exception 'FALTA list_subscribers'; end if;
  -- devuelve el contrato {total, rows, sectors} sin filas de ejemplo
  if (public.list_subscribers()->'rows') is null or (public.list_subscribers()->>'total') is null
    then raise exception 'list_subscribers NO devuelve el contrato esperado'; end if;
  raise notice 'Listado de abonados (migración 010) verificado: OK';

  -- 13) Expediente único del Abonado 360 (migración 202609010011)
  if to_regprocedure('public.get_subscriber_expediente(uuid)') is null
    then raise exception 'FALTA get_subscriber_expediente'; end if;
  if position('has_permission' in pg_get_functiondef('public.get_subscriber_expediente(uuid)'::regprocedure))=0
    then raise exception 'get_subscriber_expediente NO filtra por permisos'; end if;
  -- devuelve NULL (no un objeto vacío) cuando el abonado no existe / sin permiso
  if public.get_subscriber_expediente('00000000-0000-0000-0000-000000000000'::uuid) is not null
    then raise exception 'get_subscriber_expediente debe devolver NULL para un abonado inexistente'; end if;
  raise notice 'Expediente del Abonado 360 (migración 011) verificado: OK';

  -- 14) Caja como espacio propio (migración 202609010012)
  if to_regprocedure('public.get_cash_session_report(uuid)') is null
    then raise exception 'FALTA get_cash_session_report'; end if;
  if to_regprocedure('public.list_cash_sessions(int)') is null
    then raise exception 'FALTA list_cash_sessions'; end if;
  if jsonb_typeof(public.list_cash_sessions()) is distinct from 'array'
    then raise exception 'list_cash_sessions no devuelve un array'; end if;
  raise notice 'Caja como espacio propio (migración 012) verificado: OK';
end
$$;