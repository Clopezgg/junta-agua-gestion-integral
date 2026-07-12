# Validación comercial y checklist de salida

## Veredicto actual

Estado: **pre-comercial**. El sistema requiere staging real antes de venderse o usarse con dinero real.

## Checklist obligatorio

| Área | Criterio de aceptación |
| --- | --- |
| Supabase | Migraciones desde cero pasan en staging. |
| RLS | Usuarios de organización A no leen organización B. |
| Roles | Secretaria, tesorero, auditor y técnico tienen permisos limitados. |
| Superadmin | No puede inactivarse ni dejar la organización sin administrador. |
| Generación anual | 1, 2, 4 y 20 pegues generan montos correctos. |
| Adulto mayor | 60 años + DNI aplica 25% a todos los pegues y queda en snapshot. |
| Pagos | Efectivo, transferencia, depósito, cheque y mixto cuadran. |
| Caja | Apertura, cierre, arqueo y diferencia quedan auditados. |
| Reversos | Anulación/devolución no eliminan pago original. |
| Recibo | Vista, PDF, QR y reimpresión coinciden. |
| Portal | Abonado solo edita celular, correo, dirección y foto. |
| Backup | Backup y restore completos aprobados. |
| Render | Staging desplegado con variables reales. |
| Legal | Términos y privacidad revisados por responsable legal. |

## Comando de validación

```bash
npm run readiness:staging
```

Si falta una credencial o herramienta externa, el resultado debe considerarse bloqueado, no aprobado.
