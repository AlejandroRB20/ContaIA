# D-009 — Auditoría final independiente

## Metadatos

| Campo              | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decisión           | `D-009`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Fecha              | 2026-08-03                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Auditor            | Codex                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Modelo             | No especificado en la evidencia proporcionada                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Tipo               | Auditoría final independiente `READ ONLY`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| HEAD auditado      | `6934b26f6f568c27d697f8c3f31cebaddb0261a0`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Alcance            | `D-009` — corrección arquitectónica `issuedAtLocal: string` y namespace oficial del Timbre Fiscal Digital (EWO-005 Bloque E, Sprint 3)                                                                                                                                                                                                                                                                                                                                                                                                               |
| Archivos revisados | `apps/api/src/modules/cfdi/cfdi-aggregate.types.ts`; `apps/api/src/modules/cfdi/cfdi.repository.ts`; `apps/api/src/modules/cfdi/cfdi.repository.spec.ts`; `apps/api/src/modules/cfdi/persist-cfdi-aggregate.spec.ts`; `packages/database/prisma/schema.prisma`; `packages/database/prisma/migrations/20260804013104_preserve_cfdi_local_issue_datetime/migration.sql`; `docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md` §5.3quater; `docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md`; `brain/DECISIONS.md` (D-009); `AI_CONTEXT.md` |

## Veredicto

**PASSED**

## Alcance de la auditoría

La revisión evaluó el alcance declarado de la corrección arquitectónica `D-009` sobre el HEAD indicado arriba: la sustitución de `ExtractedCfdiAggregate.issuedAt: Date` por `issuedAtLocal: string`, sin coexistencia de ambos campos ni alias ambiguos; la preservación determinista del valor exacto del atributo `Fecha` de CFDI 4.0 sin ninguna inferencia de zona horaria; la persistencia textual mediante `issuedAtLocal String @map("issued_at") @db.VarChar(19)`; y la migración correctiva nueva que materializa ese cambio de tipo sobre la tabla `cfdis`. Esta corrección modificó artefactos ya auditados de Sprint 1 y Sprint 2 (`E5-S1-T05`, `E5-S1-T07`/`T09`, `E5-S2-T01`, `E5-S2-T02`, `E5-S2-T06`/`T10`), por lo que quedó `READY_FOR_AUDIT` y exigía reauditoría independiente antes de cerrarse.

## Evidencia utilizada

Veredicto literal emitido por la auditoría independiente `READ ONLY` de Codex sobre el HEAD auditado:

> **PASSED**
>
> D-009 cumple los criterios de preservación determinista de la fecha local del CFDI sin inferencia de zona horaria, contrato `issuedAtLocal` como string exacto, persistencia `VARCHAR(19)`, migración correctiva segura sobre tabla vacía, conservación del índice, revalidación de contratos previamente aprobados y ausencia de regresiones en atomicidad o persistencia. `I-14` e `I-15` quedan `RESOLVED`. Puede crearse `D-009_FINAL_AUDIT.md` y marcar la corrección arquitectónica como `PASSED`. `E5-S3-T06` puede desbloquearse para implementación.

## Confirmación de los criterios auditados

- **Sin inferencia de zona horaria** — `issuedAtLocal` preserva el valor exacto recibido (`AAAA-MM-DDThh:mm:ss`), sin `new Date()`, `Date.parse()`, offset añadido, interpretación UTC ni zona fija asumida.
- **Contrato `issuedAtLocal: string`** — sustituye a `issuedAt: Date` en `ExtractedCfdiAggregate` sin coexistencia de ambos campos.
- **Persistencia `VARCHAR(19)`** — `Cfdi.issuedAtLocal String @map("issued_at") @db.VarChar(19)` en `schema.prisma`; la columna física conserva el nombre `issued_at`.
- **Migración correctiva segura sobre tabla vacía** — `20260804013104_preserve_cfdi_local_issue_datetime` verifica `COUNT(*) = 0` antes de generarse y de aplicarse; la cláusula `USING` no evalúa ningún valor, sin `AT TIME ZONE`, sin `issued_at::text` y sin asumir UTC.
- **Conservación del índice** — `@@index([companyId, issuedAtLocal])` preserva el nombre físico `cfdis_company_id_issued_at_idx` mediante `ALTER COLUMN ... TYPE` en lugar de `DROP` + `ADD COLUMN`.
- **Revalidación de contratos previamente aprobados** — `CfdiRepository.create` propaga `issuedAtLocal` sin transformar; `persist-cfdi-aggregate` no referencia el campo y queda intacto en atomicidad, checksum, logging y errores.
- **Sin regresiones** — regresión completa revalidada: 40 suites / 598 pruebas `PASSED`.

## Hallazgos

| ID     | Estado     | Descripción                                                                                                                                                                                           |
| ------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `I-14` | `RESOLVED` | El atributo `Fecha` de CFDI 4.0 es hora local sin offset; el parser tiene prohibido derivar un instante. Resuelto con el contrato `issuedAtLocal: string` y la migración correctiva `20260804013104`. |
| `I-15` | `RESOLVED` | El namespace oficial del Timbre Fiscal Digital 1.1 carecía de registro normativo. Resuelto con `TFD_11_NAMESPACE_URI` registrado como constante arquitectónica vinculante en Addendum §5.3quater.     |

No se detectaron hallazgos nuevos de ninguna severidad.

## Confirmación de que `E5-S3-T06` no fue iniciada durante la corrección

No existe ningún archivo propio de `E5-S3-T06` en el repositorio (no hay `cfdi-40-extractor.service.ts` ni artefacto equivalente de extracción de encabezado). La corrección `D-009` se ejecutó íntegramente como tarea arquitectónica independiente, sin adelantar ninguna responsabilidad de `E5-S3-T06`.

## Resultado

- **`D-009` cumple su alcance declarado.** Preservación determinista de la fecha local del CFDI, sin inferencia de zona horaria, con persistencia y migración seguras.
- **`I-14` e `I-15` quedan `RESOLVED`**, sin hallazgos nuevos.
- **Sin regresiones en atomicidad ni persistencia** del agregado CFDI.
- **`E5-S3-T06` no fue iniciada** durante esta corrección.

## Conclusión

`D-009` cumple el alcance de preservación determinista de la fecha local del CFDI y namespace oficial del TFD. Puede marcarse `D-009` como `PASSED`. `E5-S3-T06` queda habilitada para implementación, no iniciada. Sprint 3 permanece `IN_PROGRESS`.

## Confirmación de independencia

- La conclusión se basa en inspección directa de los archivos indicados en el HEAD auditado.
- No se modificó código, pruebas, `schema.prisma`, migraciones ni arquitectura técnica durante esta auditoría.
- No se ejecutaron migraciones, SQL, `git add`, commits ni operaciones remotas.
