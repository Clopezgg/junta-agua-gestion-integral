# Entrega consolidada de Fases 1 y 2

## Seguridad
La autorización se valida en interfaz, funciones SQL y políticas RLS. El acceso financiero futuro no está habilitado.

## Duplicados
1. Se normaliza el documento.
2. La coincidencia exacta bloquea el registro.
3. Se calcula similitud de nombre y señales complementarias.
4. Una coincidencia de 70% o más exige aclaratoria de al menos 15 caracteres.
5. La decisión queda registrada en `duplicate_reviews` y `audit_events`.

## Pegues
La persona y la conexión son entidades separadas. Cada abonado puede tener varios pegues con códigos `000001-01`, `000001-02`, etc.
