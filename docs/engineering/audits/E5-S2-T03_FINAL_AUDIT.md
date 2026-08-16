# E5-S2-T03 — Auditoría final independiente

## Metadatos

| Campo              | Valor                                                                                                                                                                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fecha              | 2026-07-31                                                                                                                                                                                                                                                                   |
| Auditor            | Codex                                                                                                                                                                                                                                                                        |
| Modelo             | GPT-5 Codex                                                                                                                                                                                                                                                                  |
| Tipo               | Auditoría final independiente `READ ONLY`                                                                                                                                                                                                                                    |
| HEAD auditado      | `e05fa7b07deb0a9b17f4009073d24f5f87a8b8b3`                                                                                                                                                                                                                                   |
| Alcance            | `E5-S2-T03` — `CfdiConceptRepository` / `CfdiTaxRepository` (Sprint 2 de Bloque E, EWO-005)                                                                                                                                                                                  |
| Archivos revisados | `apps/api/src/modules/cfdi/cfdi-concept.repository.ts`; `apps/api/src/modules/cfdi/cfdi-concept.repository.spec.ts`; `apps/api/src/modules/cfdi/cfdi-tax.repository.ts`; `apps/api/src/modules/cfdi/cfdi-tax.repository.spec.ts`; `apps/api/src/modules/cfdi/cfdi.errors.ts` |

## Veredicto

**PASSED**

## Alcance de la auditoría

La revisión evaluó el alcance declarado de `E5-S2-T03` sobre el HEAD indicado arriba: persistencia de hijos (`CfdiConcept`, `CfdiTax`) por identidad declarativa con `upsert`, validación de correspondencia posicional entre conceptos y sus impuestos, y propagación correcta de errores Prisma — contra los criterios de la tarjeta y los hallazgos de la auditoría previa (`H-T03-01` y `L-T03-02`).

## Resumen ejecutivo

`E5-S2-T03` implementa `CfdiConceptRepository.upsertMany` y `CfdiTaxRepository.upsertComprobanteTaxes`/`upsertConceptTaxes`, persistiendo los hijos del agregado CFDI sin duplicados ante reintentos del mismo Job. La corrección aplicada tras el primer veredicto `FAILED` resuelve ambos hallazgos: la validación posicional en dos etapas de `upsertConceptTaxes` previene la asignación cruzada de `conceptSlot`/`cfdiConceptId`, y las pruebas de propagación de errores Prisma confirman que los repositorios no envuelven ni transforman excepciones.

## Hallazgos

Dos hallazgos de la auditoría previa (2026-07-26), ambos **`RESOLVED`** en este HEAD:

| ID         | Severidad | Descripción                                                                                                                                                                                                                                                                                                                                                 | Estado     |
| ---------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `H-T03-01` | `HIGH`    | `CfdiTaxRepository.upsertConceptTaxes()` solo validaba longitud de `concepts`/`createdConcepts` pero nunca verificaba `createdConcepts[index].position === concepts[index].position` antes de emparejar por índice — riesgo de persistir un impuesto con `conceptSlot` derivado de un concepto y `cfdiConceptId` de otro, violación directa de AD-5 §4.5.2. | `RESOLVED` |
| `L-T03-02` | `LOW`     | Faltaban pruebas de propagación de errores Prisma en ambos repositorios de hijos (`CfdiConceptRepository` y `CfdiTaxRepository`).                                                                                                                                                                                                                           | `RESOLVED` |

Corrección verificada en el HEAD auditado: `upsertConceptTaxes` valida en dos etapas y antes de cualquier escritura (1) `concepts.length === createdConcepts.length` y (2) `createdConcepts[index].position === concepts[index].position` para cada índice, lanzando `ViolacionDeInvarianteError` ante cualquier divergencia. Las pruebas de propagación de errores Prisma están presentes en ambos specs. No se detectaron hallazgos nuevos de ninguna severidad.

## Resultado

- **`E5-S2-T03` cumple su alcance declarado.** Los hijos se persisten por identidad declarativa sin duplicados, con validación posicional estricta previa a cualquier escritura.
- **Cero regresiones.** Las pruebas preexistentes y las nuevas (20 tests / 2 suites) cierran en `PASSED`.
- **Consistencia con AD-10.1.2.** El `upsert` es correcto para hijos (a diferencia de la cabecera en T02, donde está prohibido por D-007).
- **Hallazgos `H-T03-01` y `L-T03-02` confirmados `RESOLVED`** — la validación posicional y las pruebas de propagación están presentes y verificadas.

## Conclusión

`E5-S2-T03` cumple el alcance de persistencia de hijos por identidad declarativa, resuelve ambos hallazgos de la auditoría previa, y no introduce cambios de producción más allá de los ya registrados en su tarjeta. Puede marcarse `E5-S2-T03` como `PASSED`.

## Confirmación de independencia

- La conclusión se basa en inspección directa de los archivos indicados en el HEAD auditado.
- No se modificó código, pruebas, `schema.prisma`, migraciones ni arquitectura técnica durante esta auditoría.
- No se ejecutaron migraciones, SQL, `git add`, commits ni operaciones remotas.
