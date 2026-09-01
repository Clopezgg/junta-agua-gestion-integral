# V6 — INTEGRATIONS

> Integrations Center empresarial. Cards compactas con estado real.
> NO instrucciones técnicas como producto principal.

## Catálogo

| Integración | Estado mínimo | Opcional | Baseline |
| --- | --- | --- | --- |
| WhatsApp | wa.me manual | Cloud API opcional | manual funciona sin API |
| Email | Supabase auth email | Resend/adapter | PDF/download fallback |
| OCR | — | proveedor opcional | OCR solo sugiere: dato + confianza + documento; humano confirma; NUNCA contabiliza automático |
| Maps | OpenStreetMap/Leaflet | Google Maps opcional | no bloquear sistema por falta de key |
| Storage | Supabase Storage privado | — | privado |
| Backup | Supabase/CLI | — | ver V6-SECURITY |

Cada integración muestra: Estado, Proveedor, Última prueba, Último éxito,
Último error, Configurar, Probar, Logs.

## Reglas

- Secrets solo en backend (Edge Functions / Secrets). NUNCA en frontend.
- WhatsApp Cloud: templates, webhook firmado, delivery status, retry
  idempotente.
- Email: templates, delivery log, fallback descargar/imprimir.
- Maps: OSM baseline gratis; Google opcional; no bloquear sin key.
- OCR: solo sugiere; el humano confirma.
- Nobloquear por opcionales sin credenciales → `OPTIONAL_NOT_CONFIGURED`.
- Mantener: WhatsApp manual, OSM, PDF/download, operación base.

## Integration Test Center

Configuración debe permitir probar WhatsApp, Email, Maps, OCR sin exponer
secret. Mostrar resultado humano.