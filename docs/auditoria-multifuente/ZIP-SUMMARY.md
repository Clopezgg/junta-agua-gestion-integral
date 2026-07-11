# Resumen verificable de archivos ZIP

El manifiesto completo por archivo, con ruta, tamaño, CRC32 y SHA-256, se entrega dentro del ZIP final en `docs/auditoria-multifuente/ZIP-FILE-MANIFEST.csv`. Este resumen compacto sí se conserva en GitHub.

| ZIP | Archivos | Tamaño descomprimido | SHA-256 del ZIP | Licencia raíz | Señales TODO/demo |
|---|---:|---:|---|---|---:|
| `FLOWFORGE-main(1).zip` | 21 | 0.16 MB | `e7ee6ad329c3f971d4bf230633ad7a0a607e78323f7a36f7a0cfd4f5ae0e0339` | No confirmada | 7 |
| `sap-rdp-integration-accelerator-main(1).zip` | 77 | 32.30 MB | `4e1b7e673e37e5142d6917eb1de377ff64ffe2dc2415d8ccfb0b876cc4e7ac97` | Sí | 0 |
| `SCA-water-control-system-administration--master(1).zip` | 1,534 | 13.36 MB | `da657e642585bd2a863ee5d219107ab1ab13bb84a2f92fd9c30e32876c65129e` | No confirmada | 100 |
| `open-payment-framework-integration-main(1).zip` | 466 | 47.15 MB | `f1f09107fc6811d025304386b0b773f2e5a0c6c0d8a76f167fdcde79a3a81052` | Sí | 33 |
| `cobranzas_agua_potable-master(1).zip` | 76 | 17.73 MB | `ced05ce8f8cce6163aef51b585626605414b0b76766e0b701366c2539549b309` | No confirmada | 4 |
| `fiori-tools-samples-main(1).zip` | 760 | 27.09 MB | `398e2b6084158cea38df6b971faa8db9babfdb347a96ac466399e723808b7c45` | Sí | 72 |
| `btp-launchpad-ui-samples-main(1).zip` | 633 | 8.33 MB | `7478dc355acc7523b3ba7627544f974d7fcccaa1bab7348b8a7f663bac17624c` | Sí | 39 |
| `sap-devs-cli-main(1).zip` | 572 | 8.99 MB | `e82442315eeeabefe1cfc7c26d2a65ce6af72cae06b902c00b5c72f9e4e9f241` | Sí | 49 |

## Cobertura automática

- Todos los miembros de cada ZIP fueron enumerados sin extraer rutas inseguras.
- Cada archivo fue clasificado por extensión y analizado para detectar manifiestos, licencias, TODO, FIXME, mock, demo y placeholder.
- El manifiesto completo incluye hashes por archivo para demostrar que no se omitieron rutas.
- Los binarios, dependencias vendorizadas y artefactos de transporte se inventariaron, pero no se integraron mecánicamente.
