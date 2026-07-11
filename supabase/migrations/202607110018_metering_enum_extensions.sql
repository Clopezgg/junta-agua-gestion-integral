-- Extensiones de enum separadas para que PostgreSQL confirme los nuevos valores antes de usarlos.
alter type public.tariff_category add value if not exists 'consumption';
alter type public.obligation_source add value if not exists 'meter_reading';
