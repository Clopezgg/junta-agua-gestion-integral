# Fase 3 — Tarifas, obligaciones y morosidad

## Implementado
- Catálogo de tarifas con código único por organización.
- Versiones históricas con vigencias; una nueva versión cierra la anterior sin modificar recibos u obligaciones históricas.
- Generación anual idempotente para pegues y abonados activos.
- Obligaciones manuales preparadas para conceptos no anuales.
- Estado de cuenta consolidado por abonado.
- Cálculo en servidor de pendiente, parcial, pagada, vencida y cancelada.
- Total pendiente, total vencido, antigüedad de mora y condición de solvencia.
- Bloqueos por deuda para constancia de solvencia, reconexión, cambio de propietario y nuevo pegue.
- Consulta y recepción de pago no se bloquean por morosidad.
- Excepciones por deuda preparadas con permiso especial, MFA, motivo mínimo y auditoría.
- RLS y prohibición de escrituras directas sobre tablas financieras.

## No incluido en esta fase
Los pagos, aplicación de dinero a obligaciones, recibos PDF, caja y anulaciones corresponden a la Fase 4.
