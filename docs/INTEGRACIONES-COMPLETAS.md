# Integraciones completadas en código

## Google Maps
- Mapa interactivo dentro del alta de pegues.
- Marcador movible y selección por clic.
- Ubicación actual como alternativa.
- Mapa general de pegues con filtros.
- Variables Render: `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`.

## OCR
- Edge Function `ocr-document` con Google Vision `DOCUMENT_TEXT_DETECTION`.
- Lectura de imágenes JPG, PNG y WEBP.
- Extracción asistida de nombre/identidad y datos básicos de factura.
- Revisión humana obligatoria antes de guardar.
- Secret: `GOOGLE_VISION_API_KEY`.
- Los PDF se almacenan, pero para OCR estructurado de PDF se requiere Google Document AI.

## WhatsApp Cloud API
- Edge Function `send-whatsapp`.
- Envío de texto o recibo PDF mediante enlace firmado privado.
- Webhook `whatsapp-webhook` para estados enviado, entregado, leído y fallido.
- Secrets: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`.

## Correo
- Edge Function `send-email` con Resend.
- Recibo PDF adjunto desde Storage privado.
- Historial de envío en `communication_messages`.
- Secrets: `RESEND_API_KEY`, `EMAIL_FROM`.

## Respaldos
- Edge Function `backup-manager`.
- Creación de respaldo lógico por organización.
- SHA-256, tamaño, conteos y archivo privado.
- Descarga mediante enlace temporal.
- Restauración controlada con frase `RESTAURAR`.
- Complementar con backups administrados de Supabase para recuperación total de infraestructura y usuarios Auth.

## Verificación pública
- Ruta `/verificar-recibo/:token`.
- Solo muestra información mínima y enmascarada.
- Refleja si el recibo está confirmado, anulado o devuelto.

## Secrets de Supabase
```bash
supabase secrets set RESEND_API_KEY=...
supabase secrets set EMAIL_FROM="Junta de Agua <recibos@dominio.com>"
supabase secrets set WHATSAPP_ACCESS_TOKEN=...
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=...
supabase secrets set WHATSAPP_VERIFY_TOKEN=...
supabase secrets set GOOGLE_VISION_API_KEY=...
supabase secrets set GOOGLE_MAPS_API_KEY_CONFIGURED=true
```

## Edge Functions a desplegar
```bash
supabase functions deploy admin-create-user
supabase functions deploy integration-test
supabase functions deploy send-email
supabase functions deploy send-whatsapp
supabase functions deploy whatsapp-webhook --no-verify-jwt
supabase functions deploy ocr-document
supabase functions deploy backup-manager
```
