# REFERENCE ARTIFACTS INVENTORY

Búsqueda ejecutada 2026-09-01 en todo el repo (excluye `node_modules`):
`*.pdf *.png *.jpg *.jpeg *.webp *.svg *.docx *.txt` + grep de referencias de producto.

## Hallazgos

| Artifact | Tipo | Ubicación | Qué aporta | Requisito derivado | Vigente |
|---|---|---|---|---|---|
| (sin binarios de diseño) | — | — | No hay PDF/PNG/JPG/WEBP/DOCX de mockups, capturas ni exports en el repo | — | — |
| `docs/V6-*.md` (11 archivos) | MD | `docs/` | Fuentes de verdad V6: contract, dominio, IA, workflows, design system, security, integraciones, UAT, migración, producción, progreso | Base conceptual del rebuild — se re-valida contra código, no se asume | Parcial (se supera con docs ENTERPRISE-*) |
| `docs/commercial/` | dir | `docs/commercial` | Material de readiness comercial | Revisar en Milestone Y | Por verificar |
| `docs/auditoria-multifuente/` | dir | `docs/auditoria-multifuente` | Auditoría histórica multifuente V2.1 | Contexto histórico | Obsoleto |
| `public/` assets | SVG/ico | `public/` | Iconos/manifest PWA | Field PWA + branding dinámico | Vigente (revisar en R/L) |
| `docs/EVIDENCE-MATRIX.md` | MD | `docs/` | Matriz de evidencia previa | Se reemplaza por FINAL ACCEPTANCE MATRIX (§139) | Se reescribe |

## Referencias de producto mencionadas históricamente

Grep de `Ziptility`, `Online Water Bill`, `Oracle Utilities`, `Tyler`, `CUSI`, `MuniBilling`, `mWater`, `Klir`, `NEXORA`, `ERSAPS` en el repo:

- **ERSAPS / Honduras:** referenciado en `docs/V6-*`, migración `202608310044_v5_compliance_ersaps.sql` y `src/pages/Ersaps.tsx`. Fuente normativa **no versionada** en repo → requisito Milestone P (§80 Regulatory Sources): crear tabla/registro de fuentes con URL, versión, vigencia. `REFERENCE_NOT_AVAILABLE` para el texto normativo oficial hasta que se aporte.
- **NEXORA (`Clopezgg/nexora-group`):** referencia de calidad/arquitectura, inspección READ-ONLY. No está clonado localmente. Se consultará como referencia de principios (no de dominio) en Milestone B.
- **Ziptility / Online Water Bill / Oracle/Tyler/CUSI:** sin archivos de referencia en el repo. `REFERENCE_NOT_AVAILABLE`. Los patrones funcionales (CIS, billing, field service, GIS) ya están suficientemente especificados en la orden maestra §7 y §52-68 para continuar.

## Conclusión

No hay artefactos de diseño binarios que bloqueen el rebuild. La especificación funcional de la orden maestra + docs V6 + código actual son suficientes para proceder. Los únicos `REFERENCE_NOT_AVAILABLE` relevantes son textos normativos ERSAPS oficiales, que se modelan como datos versionables configurables (no se hardcodean — §64, §79, §80, §129).
