# EWO-005 Bloque E — Implementation Checklist

## 1. Control del documento

| Campo                                 | Valor                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identificador                         | `EWO-005_IMPLEMENTATION_CHECKLIST`                                                                                                                                                                                                                                                                                                                                                                               |
| Título                                | EWO-005 Bloque E — Checklist maestro de ejecución (worker XML, módulo CFDI, endpoints de resultado)                                                                                                                                                                                                                                                                                                              |
| Versión                               | 0.1                                                                                                                                                                                                                                                                                                                                                                                                              |
| Fecha                                 | 2026-07-25                                                                                                                                                                                                                                                                                                                                                                                                       |
| Propietario                           | Responsable de producto de ContaIA (aprobación) / Claude Code (mantenimiento técnico)                                                                                                                                                                                                                                                                                                                            |
| Estado                                | **READY TO IMPLEMENT** — D-007 ratificada; Sprint 0 (preparación de entorno) sigue pendiente de ejecutarse                                                                                                                                                                                                                                                                                                       |
| Decisión relacionada                  | `brain/DECISIONS.md` **D-007** — Estrategia de concurrencia y persistencia atómica del agregado CFDI. Estado real verificado: **ACEPTADA — ratificada el 2026-07-25 por Alejandro Reyes Bocanegra (Product Owner y Arquitecto de Producto de ContaIA)**                                                                                                                                                          |
| Plan relacionado                      | `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md` — estado real verificado: `DOCUMENTACIÓN RATIFICADA — IMPLEMENTACIÓN DEL BLOQUE E AUTORIZADA`                                                                                                                                                                                                                                                                |
| Addendum relacionado                  | `docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md` (2408 líneas verificadas; criterios de aceptación 1–83; gates G-01 a G-31)                                                                                                                                                                                                                                                                           |
| Última auditoría                      | 2026-07-25 — auditoría READ ONLY de Codex sobre residuos de reutilización de `Cfdi`, `409` en UX y RBAC de API-0027 (todas cerradas antes de este documento)                                                                                                                                                                                                                                                     |
| Condición para iniciar implementación | **Cumplida.** D-007 fue ratificada el 2026-07-25 por Alejandro Reyes Bocanegra (Product Owner y Arquitecto de Producto de ContaIA); `brain/DECISIONS.md` registra responsable, rol, fecha y evidencia en su tabla "Ratificación", Estatus `ACEPTADA`. La implementación del Bloque E queda autorizada — el gate restante antes de escribir código es que **Sprint 0 se ejecute** (sección 8), no la ratificación |

> **Nota sobre numeración de referencias.** El encargo que originó este documento cita `docs/03_BUSINESS_RULES.md`, `docs/04_SYSTEM_DOMAIN_MODEL.md`, etc. La numeración real del repositorio, verificada directamente, es `docs/04_BUSINESS_RULES.md`, `docs/05_SYSTEM_DOMAIN_MODEL.md`, `docs/06_SYSTEM_WORKFLOWS.md`, `docs/07_SOFTWARE_ARCHITECTURE.md`, `docs/08_API_DESIGN.md`, `docs/09_DATABASE_DESIGN.md`, `docs/10_AI_ARCHITECTURE.md`, `docs/11_SECURITY_ARCHITECTURE.md` (consistente con el historial de reorganización de `MASTER_CONTEXT.md` §27). Este documento usa las rutas reales en todas sus referencias.

---

## 2. Propósito

Este checklist **no sustituye** ninguna decisión ya tomada. Específicamente:

- **No sustituye D-007.** La estrategia de concurrencia (`create()`, transacción única, `count === 1` en ambas transiciones, clasificación A–G, prohibición de reutilización de `Cfdi`, prohibición de reconciliación heurística) queda tal como está registrada en `brain/DECISIONS.md`. Este documento la referencia, nunca la reinterpreta.
- **No sustituye el plan EWO-005** (`docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md`) ni el Addendum (`docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md`). Cuando este checklist y esos documentos difieran en cualquier detalle técnico, **prevalecen el plan y el Addendum**, y este checklist debe corregirse.
- **No autoriza implementación por sí mismo.** Su existencia es documentación de planificación; la condición de la sección 1 sigue siendo la única puerta de entrada a los Sprints 1–10.
- **Organiza la ejecución técnica y los gates**: convierte 83 criterios de aceptación y 31 gates ya definidos en un plan de trabajo secuencial, con IDs estables, dependencias explícitas y evidencia de cierre verificable — el puente entre "arquitectura ya definida" y "código correctamente auditado".

---

## 3. Fuentes de verdad

| Prioridad | Documento                                                                          | Autoridad                                                                                                                                                                                   |
| --------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | `brain/DECISIONS.md` D-007                                                         | Estrategia de concurrencia y persistencia atómica. Prevalece sobre cualquier diseño histórico sustituido en el plan original o en rondas anteriores del Addendum                            |
| 2         | `docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md`                        | Especificación técnica completa del Bloque E (AD-1 a AD-12, §1–§20). Prevalece sobre `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md` mientras persista tensión documental (Addendum §1) |
| 3         | `brain/QUESTIONS.md` Q-001                                                         | Business rule abierta sobre folio fiscal duplicado de otro documento. Ninguna implementación puede resolverla unilateralmente                                                               |
| 4         | `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md`                                | Plan original del módulo Documents & Fiscal. Vigente donde no ha sido sustituido explícitamente por el Addendum o por D-007/Q-001 (ver sus propias marcas de SUSTITUIDO)                    |
| 5         | `docs/04_BUSINESS_RULES.md`, `docs/06_SYSTEM_WORKFLOWS.md`                         | Reglas de negocio y workflows conceptuales (BR-CFDI-001/002/003, BR-XML-001/002, BR-DOC-001/002). Marco estable, no técnico                                                                 |
| 6         | `docs/07_SOFTWARE_ARCHITECTURE.md`, `docs/09_DATABASE_DESIGN.md`                   | Límites de módulo, Bounded Contexts, principios de modelo de datos. El Addendum es más específico para el Bloque E                                                                          |
| 7         | `docs/08_API_DESIGN.md`, `docs/11_SECURITY_ARCHITECTURE.md`, `docs/15_UX_FLOWS.md` | Contratos de API, seguridad, UX — ya corregidos para alinearse con D-007/Q-001 en la auditoría del 2026-07-25                                                                               |
| 8         | `packages/database/prisma/schema.prisma`, código de `apps/api/src/modules/*`       | Estado real implementado — evidencia NIVEL B, ver sección 4                                                                                                                                 |

---

## 4. Estado real del repositorio

> Verificado directamente por inspección de código el 2026-07-25 (NIVEL B salvo donde se indique lo contrario). Ninguna fila de esta tabla asume que algo existe sin haberlo comprobado.

| Componente                                                       | Estado real                                       | Evidencia                                                                                                                                                                                                                                                                                                        | Observación                                                                                                                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modelo `Document`                                                | **Implementado**                                  | `packages/database/prisma/schema.prisma:551`                                                                                                                                                                                                                                                                     | Campos completos, `DocumentStatus` enum, `@@unique([id,companyId])`, `@@unique([storageReference])`                                                                                                 |
| Modelo `Cfdi`                                                    | **Parcialmente implementado — solo cabecera**     | `schema.prisma:620`                                                                                                                                                                                                                                                                                              | `@@unique([documentId,companyId])`, `@@unique([companyId,folioFiscal])`. Falta `@@unique([id,companyId])` que el DoD del Addendum exige para la FK compuesta de los hijos                           |
| Modelo `CfdiConcept`                                             | **No implementado**                               | Ausente en `schema.prisma` (grep sin resultados)                                                                                                                                                                                                                                                                 | Diseño completo en Addendum AD-5 §4.5.1                                                                                                                                                             |
| Modelo `CfdiTax` / `conceptSlot`                                 | **No implementado**                               | Ausente en `schema.prisma`                                                                                                                                                                                                                                                                                       | Diseño completo en Addendum AD-5 §4.5.2                                                                                                                                                             |
| Enums `CfdiTaxScope`, `CfdiTaxType`                              | **No implementado**                               | Ausentes                                                                                                                                                                                                                                                                                                         | Definidos conceptualmente en AD-5                                                                                                                                                                   |
| CHECK `cfdi_taxes_scope_concept_check`                           | **No implementado**                               | No hay migración con SQL manual para CFDI                                                                                                                                                                                                                                                                        | Única pieza de SQL manual prevista (AD-5)                                                                                                                                                           |
| Migraciones aplicadas                                            | **2**                                             | `20260722194307` (EWO-004), `20260723214446_ewo_005_documents_fiscal` (Document/Cfdi/Job + infra MinIO)                                                                                                                                                                                                          | Ninguna migración para hijos del CFDI                                                                                                                                                               |
| Modelo `Job`                                                     | **Implementado**                                  | `schema.prisma:681`                                                                                                                                                                                                                                                                                              | `JobStatus`, `JobType.XML_EXTRACTION` únicamente                                                                                                                                                    |
| `DocumentsModule`                                                | **Parcialmente implementado**                     | `apps/api/src/modules/documents/`                                                                                                                                                                                                                                                                                | Controller/Service/Repository/Authorization con pruebas. `confirmUpload` ya usa el patrón CAS (`updateMany`+`count`) que D-007 reutiliza                                                            |
| `DocumentsRepository.markAsProcessed` / `markAsRejected`         | **No implementado**                               | Ausentes en `documents.repository.ts` (métodos reales: `create`, `deleteCreatedDocument`, `findManyByCompany`, `countByCompany`, `findById`, `confirmUpload`)                                                                                                                                                    | Requeridos por AD-10                                                                                                                                                                                |
| `CfdiModule`                                                     | **No implementado**                               | No existe el directorio `apps/api/src/modules/cfdi`                                                                                                                                                                                                                                                              | API-0027/0028 no tienen controller                                                                                                                                                                  |
| `CfdiRepository` / `CfdiConceptRepository` / `CfdiTaxRepository` | **No implementado**                               | —                                                                                                                                                                                                                                                                                                                | —                                                                                                                                                                                                   |
| `XmlProcessingModule`                                            | **No implementado**                               | No existe el directorio                                                                                                                                                                                                                                                                                          | `XmlValidationService`, `CfdiExtractorService` no existen                                                                                                                                           |
| `fast-xml-parser`                                                | **No instalado**                                  | 0 resultados en `apps/api/package.json` y `pnpm-lock.yaml`                                                                                                                                                                                                                                                       | Requerido por §5                                                                                                                                                                                    |
| `JobsModule` (productor)                                         | **Implementado, solo productor**                  | `jobs.module.ts` — comentario explícito: "Productor de Jobs únicamente — SIN consumer/worker"                                                                                                                                                                                                                    | `BullMqJobsQueueAdapter.enqueueXmlExtraction` con `ATTEMPTS=3`/`BACKOFF_DELAY_MS=1000` **hardcodeados** (deben migrar a config central, AD-12)                                                      |
| `JobsRepository`                                                 | **Parcialmente implementado**                     | `jobs.repository.ts` — único método real: `findOrCreateQueued`                                                                                                                                                                                                                                                   | Faltan `markAsProcessing`, `markAsCompleted`, `markAsFailed`, `findById`                                                                                                                            |
| `JobsService`                                                    | **Parcialmente implementado**                     | Único método: `ensureXmlExtractionJob`                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                   |
| Worker `XmlExtractionProcessor`                                  | **No implementado**                               | Ningún `@Processor`/`WorkerHost` en todo el repositorio (verificado)                                                                                                                                                                                                                                             | Es la pieza central de D-007                                                                                                                                                                        |
| `@OnWorkerEvent('failed')` handler                               | **No implementado**                               | —                                                                                                                                                                                                                                                                                                                | AD-4.2                                                                                                                                                                                              |
| Reconciliador (arranque + periódico)                             | **No implementado**                               | —                                                                                                                                                                                                                                                                                                                | §10 completo                                                                                                                                                                                        |
| `StorageAdapter.getObject()`                                     | **No implementado**                               | `storage.interface.ts` expone `getPresignedUploadUrl`, `getPresignedDownloadUrl`, `exists`, `getMetadata`, `deleteObject` — **sin** `getObject`                                                                                                                                                                  | Requerido por AD-1 para que el worker descargue el Buffer                                                                                                                                           |
| Permiso `cfdi.read` en seed                                      | **No implementado**                               | `packages/database/prisma/seed.ts` — catálogo tiene `cfdi.generate`, `cfdi.cancel`, `document.upload`, `document.read`; **no** `cfdi.read`                                                                                                                                                                       | Requerido por Addendum §12 para ADMINISTRADOR/CONTADOR/AUXILIAR                                                                                                                                     |
| Configuración central (14 variables `JOBS_*`/`XML_*`)            | **No implementado**                               | 0 de 14 variables en `.env.example`; `packages/config/src/server.ts` compone `sharedEnvSchema`+`serverEnvSchema`+`databaseEnvSchema`+`redisEnvSchema`+`storageEnvSchema`+`observabilityEnvSchema` — sin `jobsEnvSchema`/`xmlEnvSchema`                                                                           | Addendum §10.3, tabla completa de 14 variables con rangos                                                                                                                                           |
| Infraestructura Docker (PostgreSQL 16, Redis 7, MinIO)           | **Implementado**                                  | `docker-compose.yml` — `postgres`, `redis`, `minio`, `minio-init` con healthchecks                                                                                                                                                                                                                               | Lista para pruebas de integración, no verificada como "en ejecución" en este momento                                                                                                                |
| API-0026/0027/0028/0055                                          | **No implementado**                               | Ningún controller ni ruta correspondiente                                                                                                                                                                                                                                                                        | Endpoints de resultado del Bloque E                                                                                                                                                                 |
| Observabilidad específica del Bloque E                           | **No implementado**                               | Sin logs estructurados, métricas ni correlación específicos de worker/reconciliador                                                                                                                                                                                                                              | —                                                                                                                                                                                                   |
| Pruebas unitarias del Bloque E                                   | **No implementado**                               | 0 archivos `*.spec.ts` relacionados con CFDI/XML/worker                                                                                                                                                                                                                                                          | —                                                                                                                                                                                                   |
| Pruebas de integración del Bloque E                              | **No implementado**                               | `apps/api/test/` solo tiene `auth`, `companies`, `health`                                                                                                                                                                                                                                                        | —                                                                                                                                                                                                   |
| Pruebas de concurrencia                                          | **No implementado**                               | —                                                                                                                                                                                                                                                                                                                | Gates G-01 a G-16                                                                                                                                                                                   |
| Gates G-01 a G-31                                                | **Ninguno ejecutado**                             | Addendum §16.2.1 lo declara explícitamente: "Ninguno de estos gates se ha ejecutado"                                                                                                                                                                                                                             | —                                                                                                                                                                                                   |
| Script exploratorio `test-prisma-upsert.ts`                      | **Existe, no ejecutado**                          | `packages/database/test-prisma-upsert.ts`, untracked en git                                                                                                                                                                                                                                                      | Caracterizaría `upsert({update:{}})`; D-007 no depende de su resultado                                                                                                                              |
| Scripts `test-bullmq.ts` / `test-prisma.ts` (raíz)               | **Existen, no son de este equipo**                | Untracked en git, atribuidos a validación externa (Gravity) previa                                                                                                                                                                                                                                               | No modificar                                                                                                                                                                                        |
| Frontend relacionado (`apps/web`)                                | **Parcialmente implementado, AJENO a esta tarea** | `apps/web/src/app/[companyId]/documentos/` (página, tabla, dropzone), hooks `use-documents.ts`/`use-upload-document.ts`, `documents-client.ts` — todos **untracked**; además `app-shell.tsx`, `inicio/page.tsx`, `acceso/iniciar-sesion/login-form.tsx`, `packages/ui/src/button.tsx` **modificados** sin commit | Trabajo en curso de otra tarea en la misma rama (`feature/frontend-ux-audit`, ver sección 24). Consume APIs de carga/listado de documentos ya existentes; no depende de ni implementa API-0027/0028 |
| `.claude/skills/`                                                | **Presente, fuera de alcance**                    | Directorio untracked                                                                                                                                                                                                                                                                                             | No debe tocarse (regla explícita)                                                                                                                                                                   |

---

## 5. Reglas que no pueden reinterpretarse

Invariantes de D-007 y del Addendum, vigentes con independencia del sprint en curso:

1. **Transacción única.** Cabecera, hijos, checksum, transición terminal de `Document` y cierre de `Job` comparten un solo `prisma.$transaction` interactivo. Nunca se divide en "Transacción A" + "Transacción B".
2. **`create()`, nunca `upsert({ update: {} })`.** La cabecera `Cfdi` se crea con `create()`. Un `Cfdi` preexistente hallado con el `Document` en `PROCESSING` es guarda de invariante, no rama de reutilización.
3. **`Document updateMany.count === 1` y `Job updateMany.count === 1`.** Ambas transiciones exigen exactamente una fila afectada. Cualquier otro valor aborta toda la transacción.
4. **Rollback total ante cualquier transición no confirmada.** No existe éxito parcial: o se confirma el agregado completo, o no se persiste nada.
5. **PostgreSQL primario es la autoridad.** Toda clasificación posterior al rollback consulta el primario, nunca una réplica; Redis/BullMQ es estado operativo, no fuente de verdad de negocio.
6. **Clasificación A–G tras el rollback**, en el orden D → C → A → B → E → F → G (AD-10.2). Ningún caso se salta ni se reordena.
7. **`Cfdi existente + Document PROCESSING` = violación de invariante**, siempre. Nunca produce `PROCESSED`, `COMPLETED`, éxito idempotente, reparación, reutilización, ni continuidad de la transacción.
8. **Q-001 permanece abierta.** Ninguna implementación puede fijar `REJECTED`/`CFDI_DUPLICATE`/`PROCESSING_FAILED`/`UnrecoverableError` automáticos por folio duplicado de otro documento.
9. **RBAC de API-0027**: `ADMINISTRADOR`, `CONTADOR`, `AUXILIAR` permitidos; `SUPERVISOR`, `AUDITOR` excluidos (403).
10. **Nunca `P2002.meta.target`** como base de una decisión de control de flujo.
11. **Nunca upsert vacío** (`update: {}`) como mecanismo de exclusión de concurrencia.
12. **El reconciliador nunca escribe `PROCESSED` ni `COMPLETED`.** Es exclusivamente diagnóstico; toda violación de invariante que detecta se resuelve re-encolando el Job, nunca reparándola en el propio reconciliador.

---

## 6. Estrategia de implementación

Flujo secuencial obligatorio — cada fase depende de que la anterior cierre su gate correspondiente:

1. **Ratificación** — D-007 aprobada formalmente (sección 8, `E5-S0-T01`). **Cumplida el 2026-07-25.**
2. **Preparación** — entorno, rama, baseline, evidencia inicial (Sprint 0).
3. **Base de datos** — `CfdiConcept`, `CfdiTax`, `conceptSlot`, CHECK, migración (Sprint 1).
4. **Dominio** — repositorios, transacción única, errores tipados (Sprint 2).
5. **Parser** — validación XML, extracción CFDI 4.0 (Sprint 3).
6. **Worker** — processor BullMQ, Transacción A completa (Sprint 4).
7. **Clasificación posterior** — casos A–G (Sprint 5).
8. **API** — API-0026/0027/0028/0055 (Sprint 7 — nota: el orden de ejecución real intercala Reconciliación antes de API; ver sección 26).
9. **Observabilidad** — logs, métricas, correlación (Sprint 8).
10. **Pruebas** — la matriz completa de la sección 18 (Sprint 10, transversal a todos los anteriores).
11. **Gates** — G-01 a G-31 ejecutados y en verde (sección 19).
12. **Auditoría** — Codex READ ONLY por bloque (sección 22).
13. **Correcciones** — ciclo cerrado antes de avanzar.
14. **Merge** — solo tras gate `PASSED` y DoD del sprint cumplida (sección 21).

**Por qué no deben implementarse varios bloques de riesgo simultáneamente.** El worker (Sprint 4) y la clasificación posterior (Sprint 5) comparten el mismo punto de falla que D-007 fue diseñada para cerrar: un falso `PROCESSED`. Implementarlos en paralelo con la reconciliación (Sprint 6) multiplica las superficies donde ese error podría reintroducirse sin que ninguna auditoría aislada lo detecte — la auditoría de un bloque no puede verificar invariantes que dependen del bloque vecino si ambos cambian a la vez. Cada sprint de riesgo alto (2, 4, 5, 6) se implementa, audita y cierra su gate **antes** de comenzar el siguiente. Sprints de bajo acoplamiento (3 y 8, por ejemplo) pueden solaparse en el tiempo de un implementador distinto, pero nunca comparten revisión de Codex con un sprint de riesgo alto todavía abierto.

---

## 7. Dependencias y bloqueos

| Bloqueo                                          | Afecta                                                 | Responsable                                               | Resolución requerida                                                                                                                           | Estado                                                                                                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ratificación de D-007                            | Sprints 1–10 completos                                 | Responsable de producto de ContaIA                        | ~~Registrar en `brain/DECISIONS.md` tabla "Ratificación": quién, fecha, evidencia~~                                                            | **Resuelto — 2026-07-25.** Ratificada por Alejandro Reyes Bocanegra (Product Owner y Arquitecto de Producto de ContaIA), Estatus `ACEPTADA`. Ya no bloquea                         |
| Q-001 abierta (folio duplicado)                  | Sprint 5 CASO F, Sprint 7 UX de error, criterios 20/76 | Responsable de producto de ContaIA                        | Decisión de negocio sobre tratamiento del duplicado — ver `brain/QUESTIONS.md` Q-001                                                           | **Bloqueo parcial** — el resto del Bloque E puede completarse con el comportamiento provisional ya documentado (§10.2.3); solo el cierre final de `CFDI_DUPLICATE` queda pendiente |
| PostgreSQL de pruebas                            | Sprints 1, 2, 5, 6, 10                                 | Implementador                                             | `docker compose up postgres` + `prisma migrate` en verde                                                                                       | Infraestructura lista (`docker-compose.yml`), disponibilidad real no verificada en este momento                                                                                    |
| Redis de pruebas                                 | Sprints 4, 6, 10                                       | Implementador                                             | `docker compose up redis` + `redis-cli ping`                                                                                                   | Infraestructura lista, disponibilidad real no verificada                                                                                                                           |
| Script `test-prisma-upsert.ts`                   | Ninguno de forma directa                               | Implementador (opcional)                                  | Ejecutarlo eleva de PENDIENTE a NIVEL A la caracterización del upsert, pero D-007 no depende de él                                             | **Gate previo a merge, no a implementación** — informativo                                                                                                                         |
| Migraciones (`CfdiConcept`/`CfdiTax`)            | Sprints 2–7                                            | Implementador                                             | Migración incremental aplicada y validada (`prisma validate`/`generate`/`migrate status`)                                                      | **Bloqueo total** para todo lo que dependa del modelo de hijos                                                                                                                     |
| Contratos API (`docs/08_API_DESIGN.md` §9.5/§13) | Sprint 7                                               | Implementador                                             | Ya corregidos y consistentes con D-007/Q-001 (auditoría 2026-07-25)                                                                            | Resuelto — sin bloqueo                                                                                                                                                             |
| Disponibilidad de roles (RBAC seed)              | Sprint 1 (permiso `cfdi.read`), Sprint 7, Sprint 9     | Implementador                                             | Agregar `cfdi.read` al `PERMISSION_CATALOG` y a `CONTADOR`/`AUXILIAR`                                                                          | **Bloqueo parcial** — Sprint 7 no puede cerrar sin este cambio de seed                                                                                                             |
| Configuración BullMQ (`JOBS_*`)                  | Sprint 4, AD-12                                        | Implementador                                             | Las 14 variables de Addendum §10.3 deben existir en `@contaia/validation`/`@contaia/config` antes de que el worker o el productor las consuman | **Bloqueo total** para Sprint 4                                                                                                                                                    |
| Outbox transaccional                             | Ninguno del MVP                                        | Responsable de producto de ContaIA (si cambia el alcance) | Addendum §9.5 lo clasifica **post-MVP**: no es requisito para cerrar el Bloque E                                                               | **Post-MVP** — no bloquea                                                                                                                                                          |
| Working tree mezclado con trabajo frontend ajeno | Sprint 0 (aislamiento de rama)                         | Implementador                                             | Ver sección 8, `E5-S0-T04`/`T05`                                                                                                               | **Bloqueo operativo** hasta separar el commit documental del trabajo frontend en curso                                                                                             |

---

## 8. Sprint 0 — Preparación y autorización

> Ninguna de estas tareas se ejecuta en este documento. Todas quedan documentadas para ejecución posterior.

#### E5-S0-T01 — Registrar ratificación de D-007

- **Objetivo:** obtener y registrar la aprobación formal del responsable de producto sobre D-007.
- **Archivos/módulos probables:** `brain/DECISIONS.md` (tabla "Ratificación" de D-007).
- **Dependencias:** ninguna.
- **Precondiciones:** ninguna — es la primera tarea posible.
- **Acciones:** 1) Presentar D-007 completa (contexto, alternativas, decisión, invariantes) al responsable de producto. 2) Obtener confirmación explícita. 3) Registrar quién, cuándo y con qué evidencia en `brain/DECISIONS.md`.
- **Criterio de aceptación:** la tabla "Ratificación" de D-007 deja de tener campos en `—`; el Estatus cambia a `Aprobada y vigente`.
- **Pruebas requeridas:** ninguna (acto documental).
- **Riesgos:** proceder sin esta ratificación reintroduce el riesgo que motivó las auditorías previas — decisiones fiscales o de concurrencia no aprobadas.
- **Evidencia de cierre:** diff de `brain/DECISIONS.md` mostrando la tabla completa.
- **Gate asociado:** ninguno (es la precondición de todos los gates).
- **Estado inicial:** ~~`BLOCKED`~~ → **`PASSED` — cerrada el 2026-07-25.** Ratificada por Alejandro Reyes Bocanegra (Product Owner y Arquitecto de Producto de ContaIA); `brain/DECISIONS.md` registra responsable, rol, fecha y evidencia; Estatus `ACEPTADA`.

#### E5-S0-T02 — Congelar documentación de referencia

- **Objetivo:** fijar la versión exacta del Addendum y de D-007 sobre la que se implementará, para que una edición posterior no mueva el objetivo a mitad de sprint.
- **Archivos/módulos probables:** ninguno de código; anotar el hash de commit o la fecha exacta de la versión congelada en este mismo checklist (sección 1).
- **Dependencias:** `E5-S0-T01`.
- **Precondiciones:** D-007 ratificada.
- **Acciones:** 1) Registrar el commit/fecha exacta del Addendum congelado. 2) Cualquier cambio posterior al Addendum durante la implementación requiere una nueva ronda de ratificación, no una edición silenciosa.
- **Criterio de aceptación:** este checklist referencia una versión inmutable del Addendum.
- **Pruebas requeridas:** ninguna.
- **Riesgos:** sin congelar, un cambio documental a mitad de Sprint 4 invalidaría trabajo ya auditado.
- **Evidencia de cierre:** nota en sección 1 con el commit/fecha.
- **Gate asociado:** ninguno.
- **Estado inicial:** `NOT_STARTED`.

#### E5-S0-T03 — Verificar working tree

- **Objetivo:** confirmar el estado exacto del árbol de trabajo antes de comenzar, distinguiendo cambios propios de esta implementación de trabajo preexistente ajeno.
- **Archivos/módulos probables:** ninguno — solo inspección.
- **Dependencias:** `E5-S0-T01`.
- **Precondiciones:** ninguna.
- **Acciones:** 1) `git status --short`. 2) Confirmar que los cambios en `apps/web/*`, `packages/ui/src/button.tsx` y el directorio `apps/web/src/app/[companyId]/documentos/` **no pertenecen** a esta tarea (verificado el 2026-07-25: son trabajo en curso de la rama `feature/frontend-ux-audit`, ajeno al Bloque E backend). 3) No modificarlos, no incluirlos en ningún commit de esta implementación.
- **Criterio de aceptación:** reporte explícito de qué archivos están sucios y por qué, sin tocarlos.
- **Pruebas requeridas:** ninguna.
- **Riesgos:** mezclar commits de frontend ajeno con el Bloque E complicaría cualquier revert o bisect futuro.
- **Evidencia de cierre:** salida de `git status --short` anotada.
- **Gate asociado:** ninguno.
- **Estado inicial:** `NOT_STARTED` — evidencia ya recolectada en esta inspección (ver sección 4, fila "Frontend relacionado").

#### E5-S0-T04 — Aislar el trabajo documental ya existente

- **Objetivo:** separar en su propio commit los cambios documentales de las rondas de auditoría previas (`CHANGELOG.md`, `MASTER_CONTEXT.md`, `brain/*`, `docs/08_API_DESIGN.md`, `docs/15_UX_FLOWS.md`, `docs/20_BACKEND_IMPLEMENTATION_PLAN.md`, `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md`, el Addendum, y este mismo checklist) del trabajo de frontend no relacionado.
- **Archivos/módulos probables:** los listados arriba.
- **Dependencias:** `E5-S0-T03`.
- **Precondiciones:** inventario de `E5-S0-T03` completo.
- **Acciones:** 1) `git add` selectivo, solo los archivos documentales. 2) Commit único con mensaje que referencie D-007/Q-001/las auditorías de Codex. 3) Confirmar que el commit no incluye ningún archivo de `apps/web` ni `packages/ui`.
- **Criterio de aceptación:** un commit documental limpio, sin arrastrar cambios de frontend.
- **Pruebas requeridas:** ninguna.
- **Riesgos:** un commit mezclado obligaría a revertir trabajo de otro equipo si el Bloque E se revierte.
- **Evidencia de cierre:** hash del commit + `git show --stat`.
- **Gate asociado:** ninguno.
- **Estado inicial:** `NOT_STARTED`.

#### E5-S0-T05 — Crear rama de implementación

- **Objetivo:** abrir una rama dedicada al Bloque E que no herede el trabajo en curso de `feature/frontend-ux-audit`.
- **Archivos/módulos probables:** ninguno (operación de rama).
- **Dependencias:** `E5-S0-T04`.
- **Precondiciones:** commit documental aislado y limpio.
- **Acciones:** 1) Confirmar la rama base correcta (probablemente `main`/`develop` tras el commit documental, no directamente sobre el frontend en curso). 2) Crear `feature/ewo-005-block-e` (o convención equivalente del repositorio) desde esa base. 3) Confirmar que el diff inicial de la rama nueva no contiene los archivos de frontend ajenos.
- **Criterio de aceptación:** rama nueva, aislada, con solo el commit documental como base.
- **Pruebas requeridas:** ninguna.
- **Riesgos:** ramificar sobre `feature/frontend-ux-audit` arrastraría cambios de UI no relacionados a cada PR del Bloque E.
- **Evidencia de cierre:** nombre de rama + `git log --oneline` mostrando el punto de partida.
- **Gate asociado:** ninguno.
- **Estado inicial:** `NOT_STARTED`.

#### E5-S0-T06 — Comprobar versiones instaladas

- **Objetivo:** confirmar que las versiones reales coinciden con las que D-007 y el Addendum asumen.
- **Archivos/módulos probables:** `apps/api/package.json`, `pnpm-lock.yaml`.
- **Dependencias:** ninguna.
- **Precondiciones:** ninguna.
- **Acciones:** 1) Confirmar Prisma `6.19.3` (verificado en `pnpm-lock.yaml` en rondas previas). 2) Confirmar `bullmq@^5.81.1` y `@nestjs/bullmq@^11.0.4` (verificado en `apps/api/package.json`). 3) Confirmar PostgreSQL `16-alpine` (`docker-compose.yml:17`, verificado). 4) Confirmar Node `>=20` (`package.json:8`, verificado).
- **Criterio de aceptación:** las cuatro versiones coinciden con lo asumido por D-007; cualquier discrepancia dispara revisión de D-007 (condición de revisión ya registrada).
- **Pruebas requeridas:** ninguna.
- **Riesgos:** una versión distinta de Prisma podría cambiar la semántica de `create()`/transacciones que D-007 asume como estable.
- **Evidencia de cierre:** tabla de versiones confirmadas.
- **Gate asociado:** ninguno.
- **Estado inicial:** `NOT_STARTED` — parcialmente verificado ya en esta inspección.

#### E5-S0-T07 — Verificar variables de entorno

- **Objetivo:** confirmar el estado real de `.env`/`.env.example` antes de añadir las 14 variables nuevas.
- **Archivos/módulos probables:** `.env.example`, `.env`.
- **Dependencias:** ninguna.
- **Precondiciones:** ninguna.
- **Acciones:** 1) Confirmar que `DATABASE_URL`, `REDIS_URL`, `STORAGE_*` ya están presentes (verificado). 2) Confirmar que ninguna de las 14 variables `JOBS_*`/`XML_*` de Addendum §10.3 existe todavía (verificado: 0 de 14). 3) No añadirlas todavía — eso es tarea de Sprint 1.
- **Criterio de aceptación:** reporte del estado real, sin modificar el archivo en este sprint.
- **Pruebas requeridas:** ninguna.
- **Riesgos:** ninguno en esta fase.
- **Evidencia de cierre:** listado de variables presentes/ausentes.
- **Gate asociado:** ninguno.
- **Estado inicial:** `NOT_STARTED` — evidencia ya recolectada (sección 4).

#### E5-S0-T08 — Verificar PostgreSQL de desarrollo

- **Objetivo:** confirmar que el contenedor PostgreSQL definido en `docker-compose.yml` arranca y acepta conexiones.
- **Archivos/módulos probables:** `docker-compose.yml`.
- **Dependencias:** ninguna.
- **Precondiciones:** Docker disponible en el entorno de ejecución.
- **Acciones:** 1) `docker compose up -d postgres`. 2) Esperar `healthy` (`pg_isready`). 3) `pnpm --filter @contaia/database run migrate status` (o equivalente) para confirmar que las 2 migraciones existentes están aplicadas.
- **Criterio de aceptación:** PostgreSQL healthy; `_prisma_migrations` con 2 filas `applied`.
- **Pruebas requeridas:** ninguna (verificación de infraestructura).
- **Riesgos:** entornos Windows han tenido bloqueos de proxy TCP de Docker Desktop documentados en EWO-002/003/004 — puede repetirse.
- **Evidencia de cierre:** salida de `docker compose ps` + estado de migraciones.
- **Gate asociado:** ninguno.
- **Estado inicial:** `NOT_STARTED` — no verificado en esta inspección (no se ejecutaron comandos).

#### E5-S0-T09 — Verificar Redis de desarrollo

- **Objetivo:** confirmar que el contenedor Redis arranca y responde.
- **Archivos/módulos probables:** `docker-compose.yml`.
- **Dependencias:** ninguna.
- **Precondiciones:** Docker disponible.
- **Acciones:** 1) `docker compose up -d redis`. 2) `redis-cli -h localhost ping` → `PONG`.
- **Criterio de aceptación:** Redis healthy y responde `PONG`.
- **Pruebas requeridas:** ninguna.
- **Riesgos:** mismo riesgo de proxy Docker Desktop que `E5-S0-T08`.
- **Evidencia de cierre:** salida del `ping`.
- **Gate asociado:** ninguno.
- **Estado inicial:** `NOT_STARTED`.

#### E5-S0-T10 — Verificar scripts de prueba existentes

- **Objetivo:** confirmar la configuración real de Jest para pruebas unitarias e integración antes de añadir las del Bloque E.
- **Archivos/módulos probables:** `apps/api/test/jest-e2e.json`, `apps/api/test/env.setup.ts`, `packages/database/vitest.config.ts`, `packages/database/vitest.integration.config.ts`.
- **Dependencias:** ninguna.
- **Precondiciones:** ninguna.
- **Acciones:** 1) Confirmar que `test:unit` excluye `test/` (`jest --testPathIgnorePatterns=test/`, verificado en `apps/api/package.json`). 2) Confirmar que `test:integration` usa `jest-e2e.json` (verificado). 3) Registrar el patrón para las pruebas nuevas del Bloque E (unitarias junto al código, integración en `apps/api/test/`).
- **Criterio de aceptación:** patrón de pruebas documentado y coherente con lo ya existente.
- **Pruebas requeridas:** ninguna.
- **Riesgos:** ninguno.
- **Evidencia de cierre:** nota de convención confirmada.
- **Gate asociado:** ninguno.
- **Estado inicial:** `NOT_STARTED` — parcialmente verificado ya.

#### E5-S0-T11 — Confirmar baseline de pruebas en verde

- **Objetivo:** establecer que `pnpm run check` pasa en verde **antes** de tocar código del Bloque E, para que cualquier fallo posterior sea atribuible sin ambigüedad a esta implementación.
- **Archivos/módulos probables:** todo el monorepo (ejecución, no modificación).
- **Dependencias:** `E5-S0-T05`, `E5-S0-T08`, `E5-S0-T09`.
- **Precondiciones:** rama de implementación creada; PostgreSQL y Redis disponibles.
- **Acciones:** 1) Ejecutar `pnpm run check` en la rama nueva, sin cambios de código todavía. 2) Registrar el resultado exacto (verde/rojo) como baseline.
- **Criterio de aceptación:** baseline documentado, sea cual sea su resultado real.
- **Pruebas requeridas:** la suite completa existente, como snapshot.
- **Riesgos:** si el baseline ya está roto por causas ajenas al Bloque E, se corre el riesgo de atribuirle fallos preexistentes a esta implementación.
- **Evidencia de cierre:** log completo de `pnpm run check`.
- **Gate asociado:** ninguno.
- **Estado inicial:** `NOT_STARTED` — no ejecutado en esta inspección (restricción: no ejecutar pruebas).

#### E5-S0-T12 — Confirmar ausencia de migraciones pendientes

- **Objetivo:** verificar que no hay drift entre `schema.prisma` y las migraciones aplicadas antes de añadir el Sprint 1.
- **Archivos/módulos probables:** `packages/database/prisma/migrations/`, `schema.prisma`.
- **Dependencias:** `E5-S0-T08`.
- **Precondiciones:** PostgreSQL disponible.
- **Acciones:** 1) `prisma migrate status`. 2) Confirmar "up to date", sin migraciones pendientes ni drift detectado.
- **Criterio de aceptación:** `migrate status` reporta el schema sincronizado.
- **Pruebas requeridas:** ninguna.
- **Riesgos:** iniciar Sprint 1 sobre un schema con drift generaría una migración incorrecta.
- **Evidencia de cierre:** salida de `migrate status`.
- **Gate asociado:** ninguno.
- **Estado inicial:** `NOT_STARTED`.

#### E5-S0-T13 — Registrar evidencia inicial

- **Objetivo:** dejar un punto de referencia auditable del estado exacto del repositorio al iniciar la implementación.
- **Archivos/módulos probables:** este checklist (sección 29, Estado global) + `CHANGELOG.md`.
- **Dependencias:** `E5-S0-T01` a `E5-S0-T12`.
- **Precondiciones:** todas las tareas anteriores de Sprint 0 cerradas.
- **Acciones:** 1) Consolidar la evidencia de las 12 tareas anteriores. 2) Actualizar el Estado global (sección 29) de `BLOCKED — RATIFICACIÓN PENDIENTE` a `READY TO IMPLEMENT`. 3) Registrar entrada en `CHANGELOG.md`.
- **Criterio de aceptación:** Sprint 0 completo, con evidencia consolidada y trazable.
- **Pruebas requeridas:** ninguna.
- **Riesgos:** ninguno.
- **Evidencia de cierre:** entrada de `CHANGELOG.md` + Estado global actualizado.
- **Gate asociado:** condición de entrada a Sprint 1.
- **Estado inicial:** `BLOCKED` (depende de que todo lo anterior cierre primero).

---

## 9. Sprint 1 — Modelo de datos y migraciones

> `E5-S0-T01` (ratificación de D-007) está **cerrada** (`PASSED`, 2026-07-25) y ya no bloquea este sprint. Las tareas de este sprint permanecen `BLOCKED` únicamente por la dependencia declarada en cada una (`E5-S0-T13` — cierre completo de Sprint 0, todavía no ejecutado: entorno, rama, baseline). Ninguna depende de Q-001: el modelo de datos es neutral respecto a la política de folio duplicado.

#### E5-S1-T01 — Modelo `CfdiConcept`

- **Objetivo:** crear el modelo Prisma para los conceptos del CFDI, exactamente como lo especifica Addendum AD-5 §4.5.1.
- **Archivos/módulos probables:** `packages/database/prisma/schema.prisma`.
- **Dependencias:** `E5-S0-T13`.
- **Precondiciones:** Sprint 0 cerrado.
- **Acciones:** 1) Campos: `id`, `companyId`, `cfdiId`, `position` (Int), `claveProdServ`, `noIdentificacion?`, `cantidad` (Decimal), `claveUnidad`, `unidad?`, `descripcion`, `valorUnitario` (Decimal), `importe` (Decimal), `descuento?` (Decimal), `objetoImp`. 2) `@@unique([companyId, cfdiId, position])` (identidad declarativa). 3) `@@unique([id, cfdiId, companyId])` (destino de la FK compuesta de `CfdiTax`). 4) FK compuesta hacia `Cfdi` vía `(cfdiId, companyId) → cfdis(id, companyId)`.
- **Criterio de aceptación:** el modelo compila con `prisma validate`; no se inventa ningún campo fuera de los listados en AD-5 §4.5.1.
- **Pruebas requeridas:** ninguna en este sprint (se cubren en `E5-S1-T09`).
- **Riesgos:** un campo inventado o un tipo incorrecto (p. ej. `Float` en vez de `Decimal`) rompería BR-GLB-004.
- **Evidencia de cierre:** diff de `schema.prisma`.
- **Gate asociado:** precondición de G-28.
- **Estado inicial:** `BLOCKED`.
- **Estado actual:** `PASSED` — auditado y aprobado por Codex el 2026-07-25.
- **Auditoría independiente (2026-07-25):** auditor **Codex**; veredicto **`PASSED`**; `prisma validate` verde; **sin hallazgos bloqueantes ni correctivos**. Confirmó: `CfdiConcept` coincide con AD-5 §4.5.1; FK compuesta hacia `Cfdi` correcta; tenant isolation correcto; `@@unique([id, cfdiId, companyId])` preparado como destino de la FK futura de `CfdiTax`; los cambios en `Cfdi` fueron necesarios; Q-001 abierta; sin migración nueva. **Autoriza el inicio de `E5-S1-T02`.** (La evidencia técnica de ejecución de abajo se conserva sin alterar.)
- **Evidencia de ejecución (2026-07-25):**
  - **Archivo modificado:** `packages/database/prisma/schema.prisma` (único archivo de código tocado).
  - **Modelo `CfdiConcept`** creado exactamente según AD-5 §4.5.1: campos `id`, `companyId`, `cfdiId`, `position` (Int), `claveProdServ`, `noIdentificacion?`, `cantidad` (Decimal 18,6), `claveUnidad`, `unidad?`, `descripcion`, `valorUnitario` (Decimal 18,6), `importe` (Decimal 18,6), `descuento?` (Decimal 18,6), `objetoImp`, `createdAt`, `updatedAt`. Restricciones `@@unique([companyId, cfdiId, position])`, `@@unique([id, cfdiId, companyId])`, índices `@@index([cfdiId])` y `@@index([companyId])`, FK compuesta `(cfdiId, companyId) → cfdis(id, companyId)` `onDelete: Cascade`, `@@map("cfdi_concepts")`. Sin campos, enums, defaults ni restricciones inventados. Longitudes de texto **no** restringidas (AD-5 §4.5.1 no las especifica) → `@db.Text` sin límite, para no inventar una restricción.
  - **Prerrequisito estructural carreado (solape con `E5-S1-T05`):** para que la FK compuesta de `CfdiConcept` valide, `Cfdi` requiere `@@unique([id, companyId])` (destino de la FK) y la back-relation `concepts CfdiConcept[]`. Ambos son obligatorios de Prisma/PostgreSQL —no hay forma válida de declarar `CfdiConcept` sin ellos— y AD-5 §4.5.1 los adjunta a esta misma especificación. Son adiciones **no destructivas** (la PK ya garantiza la unicidad de `id`). **Nota para auditoría:** el `@@unique([id, companyId])` que `E5-S1-T05` tiene como objetivo quedó aplicado aquí por necesidad estructural; `E5-S1-T05` debe reconciliarse en consecuencia (su cambio ya está en el schema).
  - **Validaciones ejecutadas (no destructivas, sin tocar la base de datos):** `prisma format` → OK (exit 0); `prisma validate` (con `../../.env`, sin conexión a BD) → `The schema at prisma\schema.prisma is valid 🚀` (exit 0).
  - **Diff aislado:** `git diff --stat` = solo `packages/database/prisma/schema.prisma` (56 inserciones, 3 supresiones —estas últimas son re-alineación de espacios de `prisma format`); `git diff --check` limpio; directorio `migrations/` sin cambios.
  - **No se creó migración**, no se ejecutó `migrate`/`db push`, no se modificó la base de datos, no se tocó código de aplicación, no se instalaron dependencias, no se implementó `CfdiTax`/enums/CHECK, Q-001 permanece abierta.
- **Riesgos pendientes:** `prisma validate` es estático; la verificación en PostgreSQL real de la FK compuesta y el CASCADE se cubre en `E5-S1-T09` tras la migración de `E5-S1-T07`. Reconciliar el estado de `E5-S1-T05` (cambio ya aplicado).

#### E5-S1-T02 — Modelo `CfdiTax` con `conceptSlot`

- **Objetivo:** crear el modelo de impuestos con el discriminador `conceptSlot`, exactamente como AD-5 §4.5.2.
- **Archivos/módulos probables:** `schema.prisma`.
- **Dependencias:** `E5-S1-T01`.
- **Precondiciones:** `CfdiConcept` ya definido (destino de la FK opcional).
- **Acciones:** 1) Campos: `id`, `companyId`, `cfdiId`, `cfdiConceptId?` (nullable), `conceptSlot` (Int NOT NULL — `0` = impuesto de comprobante, `k` = concepto en posición `k`), `position`, `scope` (`CfdiTaxScope`), `type` (`CfdiTaxType`), `impuesto`, `tipoFactor`, `tasaOCuota?`, `base?`, `importe?`. 2) `@@unique([companyId, cfdiId, conceptSlot, position])`. 3) FK compuesta obligatoria hacia `Cfdi` vía `(cfdiId, companyId)`. 4) FK compuesta **opcional** hacia `CfdiConcept` vía `(cfdiConceptId, cfdiId, companyId)` — nulabilidad mixta, MATCH SIMPLE (PostgreSQL no evalúa la FK si `cfdiConceptId` es `NULL`).
- **Criterio de aceptación:** `prisma validate` acepta la relación opcional de nulabilidad mixta (criterio 57).
- **Pruebas requeridas:** ninguna en este sprint.
- **Riesgos:** declarar `cfdiConceptId` como NOT NULL rompería los impuestos de comprobante (`conceptSlot = 0`, sin concepto asociado).
- **Evidencia de cierre:** diff de `schema.prisma` + salida de `prisma validate`.
- **Gate asociado:** precondición de G-28, G-29.
- **Estado inicial:** `BLOCKED`.
- **Estado actual:** `PASSED` — auditado y aprobado por Codex el 2026-07-25.
- **Auditoría independiente (2026-07-25):** auditor **Codex**; veredicto **`PASSED`**; `prisma validate` verde; **sin hallazgos `BLOCKER`/`HIGH`/`MEDIUM` ni correctivos**. Confirmó: `CfdiTax` coincide con AD-5 §4.5.2; `CfdiTaxScope`/`CfdiTaxType` coinciden exactamente con la arquitectura y fueron indispensables para pasar `prisma validate`; el solape con `E5-S1-T03` fue necesario y aceptable; sin migración nueva; Q-001 abierta. **Autoriza reconciliar `E5-S1-T03`.** (La evidencia técnica de ejecución de abajo se conserva sin alterar.)
- **Evidencia de ejecución (2026-07-25):**
  - **Archivo modificado:** `packages/database/prisma/schema.prisma` (único archivo de código tocado).
  - **Modelo `CfdiTax`** creado exactamente según AD-5 §4.5.2: campos `id`, `companyId`, `cfdiId`, `cfdiConceptId?` (nullable), `scope` (`CfdiTaxScope`), `conceptSlot` (Int NOT NULL, sin default — `0` = comprobante, `k` = concepto en `position=k`), `position` (Int), `type` (`CfdiTaxType`), `impuesto`, `tipoFactor`, `tasaOCuota?` (Decimal 18,6), `base?` (Decimal 18,6), `importe?` (Decimal 18,6), `createdAt`, `updatedAt`. Identidad `@@unique([companyId, cfdiId, conceptSlot, position])`; índices `@@index([cfdiId])`, `@@index([companyId])`, `@@index([cfdiConceptId])`; `@@map("cfdi_taxes")`.
  - **Relaciones:** FK compuesta obligatoria `cfdi` → `(cfdiId, companyId) → cfdis(id, companyId)` `onDelete: Cascade`; FK compuesta **opcional** de nulabilidad mixta `cfdiConcept` → `(cfdiConceptId, cfdiId, companyId) → cfdi_concepts(id, cfdiId, companyId)` `onDelete: Cascade` (MATCH SIMPLE — PostgreSQL no evalúa la FK si `cfdiConceptId` es NULL). **`prisma validate` aceptó la relación opcional de nulabilidad mixta → criterio 57 verificado.**
  - **Decimales:** `Decimal(18,6)` para `tasaOCuota`/`base`/`importe`, tomado de AD-5 §4.5.2 (línea 633), no reutilizado ciegamente de `CfdiConcept`. **Longitudes de texto** (`impuesto`, `tipoFactor`) no restringidas → `@db.Text` (AD-5 §4.5.2 no especifica longitud; fijarla sería inventar una restricción). Sin defaults, sin enums, sin índices ni constraints inventados.
  - **CHECK `cfdi_taxes_scope_concept_check`:** **NO** incluido — no es expresable en `schema.prisma`; corresponde a `E5-S1-T04` (SQL manual en la migración). Correctamente fuera de alcance.
  - **Prerrequisito estructural carreado (solape con `E5-S1-T03`):** los enums `CfdiTaxScope { CFDI, CONCEPT }` y `CfdiTaxType { TRANSFER, WITHHOLDING }` (definidos verbatim en AD-5 §4.5.2, objetivo nominal de `E5-S1-T03`) se incluyeron porque Prisma no valida un modelo que referencia tipos enum inexistentes — son obligatorios para el criterio de aceptación de `E5-S1-T02` (`prisma validate` verde). No inventados. **Nota para auditoría:** `E5-S1-T03` debe reconciliarse en consecuencia (su contenido ya está en el schema); las demás obligaciones de T03 (verificar coincidencia con la forma de API-0027 §13.1) quedan para su turno.
  - **Back-relations añadidas** (obligatorias de Prisma): `taxes CfdiTax[]` en `Cfdi` y en `CfdiConcept`. Ninguna otra modificación a esos modelos.
  - **Validaciones (no destructivas):** `prisma format` → OK (exit 0); `prisma validate` (`../../.env`, sin conexión a BD) → `The schema … is valid 🚀` (exit 0).
  - **Diff aislado:** `git diff --stat` = solo `schema.prisma`; `git diff --check` limpio; `migrations/` sin cambios.
  - **No se creó migración**, no se modificó la BD, no se instaló ninguna dependencia, no se tocó código de aplicación, no se implementó ningún otro modelo, Q-001 permanece abierta.
- **Riesgos pendientes:** invariante `conceptSlot == CfdiConcept.position` no la garantiza la BD (se cubre en repositorio + prueba de `E5-S1-T09`, riesgo ya declarado en AD-5); el CHECK y la verificación en PostgreSQL real de ambas FK compuestas se cubren en `E5-S1-T04`/`E5-S1-T07`/`E5-S1-T09`. Reconciliar `E5-S1-T03` (enums ya aplicados).

#### E5-S1-T03 — Enums `CfdiTaxScope` y `CfdiTaxType`

- **Objetivo:** declarar los dos enums que usa `CfdiTax`.
- **Archivos/módulos probables:** `schema.prisma`.
- **Dependencias:** `E5-S1-T02`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) `enum CfdiTaxScope { CFDI CONCEPT }` (coincide con la respuesta de API-0027, Addendum §13.1: `"scope": "CFDI"` / `"CONCEPT"`). 2) `enum CfdiTaxType { TRANSFER WITHHOLDING }` (coincide con `"type": "TRANSFER | WITHHOLDING"` de §13.1).
- **Criterio de aceptación:** los valores del enum coinciden exactamente con los que la forma de respuesta de API-0027 ya documenta — no se inventan variantes nuevas.
- **Pruebas requeridas:** ninguna.
- **Riesgos:** un nombre de valor distinto obligaría a mapear en la capa de servicio sin necesidad.
- **Evidencia de cierre:** diff de `schema.prisma`.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.
- **Estado actual:** `PASSED` — auditado y aprobado por Codex el 2026-07-25.
- **Auditoría independiente (2026-07-25):** auditor **Codex**; veredicto **`PASSED`**; enums exactos `CfdiTaxScope { CFDI, CONCEPT }` y `CfdiTaxType { TRANSFER, WITHHOLDING }`; `prisma validate` verde; **sin hallazgos bloqueantes ni correctivos**. **Autoriza `E5-S1-T04`.** (La evidencia de reconciliación de abajo se conserva sin alterar.)
- **Reconciliación de cobertura (2026-07-25):**
  - **Implementados durante `E5-S1-T02`:** los enums `CfdiTaxScope` y `CfdiTaxType` se añadieron a `packages/database/prisma/schema.prisma` como parte de `E5-S1-T02`, porque Prisma no valida un modelo (`CfdiTax`) que referencia tipos enum inexistentes. El **solape fue técnicamente necesario** y Codex lo confirmó como aceptable al auditar T02 (`PASSED`).
  - **Verificación de fidelidad (re-auditada esta tarea contra AD-5 §4.5.2, líneas 497–505):**

    | Enum           | Valores esperados (AD-5)  | Valores implementados (schema L716–727) | Uso                    | Resultado   |
    | -------------- | ------------------------- | --------------------------------------- | ---------------------- | ----------- |
    | `CfdiTaxScope` | `CFDI`, `CONCEPT`         | `CFDI`, `CONCEPT`                       | `CfdiTax.scope` (L759) | ✅ coincide |
    | `CfdiTaxType`  | `TRANSFER`, `WITHHOLDING` | `TRANSFER`, `WITHHOLDING`               | `CfdiTax.type` (L765)  | ✅ coincide |

  - **Sin desviaciones:** no existen valores adicionales, no falta ningún valor, **no hay `@map` ni defaults inventados**, y el orden coincide con AD-5. Los valores coinciden además con la forma de respuesta de API-0027 (Addendum §13.1: `"scope": "CFDI"/"CONCEPT"`, `"type": "TRANSFER | WITHHOLDING"`).
  - **No se requiere cambio en `schema.prisma`:** el esquema **no se modificó** en esta tarea (tarea puramente documental); `prisma validate` sigue verde.
  - **Nota:** no se marca `PASSED` — la auditoría formal independiente de T03 ocurre después de esta reconciliación.

#### E5-S1-T04 — CHECK `cfdi_taxes_scope_concept_check`

- **Objetivo:** añadir la única pieza de SQL manual del diseño, verificando la coherencia entre `scope`, `cfdiConceptId` y `conceptSlot`.
- **Archivos/módulos probables:** archivo de migración generado en `E5-S1-T07` (edición manual del SQL generado, nunca `db push`).
- **Dependencias:** `E5-S1-T02`, `E5-S1-T03`.
- **Precondiciones:** modelo `CfdiTax` ya migrado en el mismo cambio.
- **Acciones:** 1) Redactar el `CHECK` que impide las tres combinaciones inválidas (`scope=CFDI` con `cfdiConceptId` no nulo o `conceptSlot≠0`; `scope=CONCEPT` con `cfdiConceptId` nulo o `conceptSlot=0`). 2) Insertarlo en el archivo de migración versionado — nunca fuera de él, para no perderlo ante un `prisma migrate reset`.
- **Criterio de aceptación:** el `CHECK` existe en `information_schema` tras aplicar la migración y rechaza las tres combinaciones inválidas (gate G-29).
- **Pruebas requeridas:** integración — ver `E5-S1-T09`.
- **Riesgos:** escribirlo fuera del archivo de migración lo perdería en un reset futuro (riesgo ya registrado en Addendum §18).
- **Evidencia de cierre:** SQL del CHECK + consulta a `information_schema` confirmando su existencia.
- **Gate asociado:** G-29.
- **Estado inicial:** `BLOCKED`.
- **Estado actual:** `PASSED` — reauditado y aprobado por Codex el 2026-07-25 (tras corregir el hallazgo `MEDIUM`).
- **Auditoría independiente (2026-07-25):** auditor **Codex**. Auditoría inicial: **`CHANGES_REQUESTED`** — hallazgo **`MEDIUM`** (T07 sin `--create-only`); SQL del CHECK confirmado **correcto**. Corrección aplicada (T07 exige `--create-only` + secuencia generación→edición→revisión→aplicación→verificación). **Reauditoría: `PASSED`** — SQL aprobado, `--create-only` confirmado, sin hallazgos bloqueantes ni correctivos. **Autoriza reconciliar `E5-S1-T05`.** (La evidencia de preparación y la nota de corrección de abajo se conservan sin alterar; su inserción/aplicación real sigue siendo de `E5-S1-T07`/`E5-S1-T09`.)
- **Evidencia de preparación (2026-07-25):**
  - **Fuente exacta:** Addendum AD-5 §4.5.2, líneas 576–583 (bloque "Restricción CHECK — coherencia `scope` / `cfdiConceptId` / `conceptSlot`"). Tabla de reglas de nulidad/slot en §4.5.2 (líneas 596–599). Nombre del constraint y tabla confirmados contra el schema: `@@map("cfdi_taxes")`, columnas `scope`, `cfdi_concept_id` (`@map`), `concept_slot` (`@map`).
  - **SQL exacto preparado (verbatim de AD-5 §4.5.2, fuente de verdad):**

    ```sql
    ALTER TABLE cfdi_taxes
      ADD CONSTRAINT cfdi_taxes_scope_concept_check CHECK (
        (scope = 'CFDI'    AND cfdi_concept_id IS NULL     AND concept_slot = 0)
        OR
        (scope = 'CONCEPT' AND cfdi_concept_id IS NOT NULL AND concept_slot > 0)
      );
    ```

    Al insertarse en la migración de `E5-S1-T07`, los identificadores adoptarán el entrecomillado doble que genera Prisma (`"cfdi_taxes"`, `"scope"`, `"cfdi_concept_id"`, `"concept_slot"`) — semánticamente idéntico para identificadores snake_case en minúsculas; los literales `'CFDI'`/`'CONCEPT'` se castean al tipo enum `"CfdiTaxScope"`. No se altera la lógica de AD-5.

  - **Verdad lógica — CFDI (impuesto de comprobante):** válido **si y solo si** `cfdi_concept_id IS NULL` **y** `concept_slot = 0`.
  - **Verdad lógica — CONCEPT (impuesto de concepto):** válido **si y solo si** `cfdi_concept_id IS NOT NULL` **y** `concept_slot > 0` (donde `concept_slot` = `position` del concepto, cualquier `k ≥ 1`).
  - **Tabla de verdad verificada** (una fila es rechazada solo si la expresión es FALSE):

    | scope        | cfdi_concept_id | concept_slot | Resultado                                                                  |
    | ------------ | --------------- | -----------: | -------------------------------------------------------------------------- |
    | `CFDI`       | `NULL`          |          `0` | ✅ válido                                                                  |
    | `CFDI`       | UUID            |          `0` | ⛔ inválido                                                                |
    | `CFDI`       | `NULL`          |          `1` | ⛔ inválido                                                                |
    | `CFDI`       | UUID            |          `1` | ⛔ inválido                                                                |
    | `CONCEPT`    | UUID            |          `1` | ✅ válido                                                                  |
    | `CONCEPT`    | UUID            |          `5` | ✅ válido (slot = position k>0)                                            |
    | `CONCEPT`    | `NULL`          |          `1` | ⛔ inválido                                                                |
    | `CONCEPT`    | UUID            |          `0` | ⛔ inválido                                                                |
    | `CONCEPT`    | `NULL`          |          `0` | ⛔ inválido                                                                |
    | `CFDI`       | `NULL`          |         `-1` | ⛔ inválido (`concept_slot < 0`)                                           |
    | `CONCEPT`    | UUID            |         `-1` | ⛔ inválido (`-1` no `> 0`)                                                |
    | otro `scope` | cualquiera      |   cualquiera | imposible: `scope` es enum `CfdiTaxScope` NOT NULL (solo `CFDI`/`CONCEPT`) |

  - **Análisis de `NULL` (SQL de tres valores):** un `CHECK` rechaza la fila **solo** cuando la expresión evalúa a `FALSE`; si evalúa a `UNKNOWN`, PostgreSQL la **admite**. Aquí la expresión **nunca** es `UNKNOWN`: (1) `scope` y `concept_slot` son `NOT NULL`, así que `scope = 'CFDI'`, `concept_slot = 0` y `concept_slot > 0` siempre son `TRUE`/`FALSE`; (2) la nulabilidad de `cfdi_concept_id` se examina con `IS NULL`/`IS NOT NULL`, que **nunca** devuelven `UNKNOWN` (siempre `TRUE`/`FALSE`, incluso ante `NULL`). Por tanto la expresión es de **dos valores** y rechaza deterministamente todo estado incoherente. **Dependencia explícita:** esta garantía descansa en que `scope` y `concept_slot` sean `NOT NULL` en el modelo `CfdiTax` (ya implementado y auditado en `E5-S1-T02`); si alguna dejara de ser `NOT NULL`, la expresión podría volverse `UNKNOWN` y dejar pasar filas inválidas.
  - **Límite del CHECK (no es defecto):** el CHECK **no** valida que `concept_slot` sea igual a la `position` del `CfdiConcept` referenciado por `cfdi_concept_id` — esa igualdad es una invariante de repositorio + prueba (AD-5 §4.5.2, riesgo residual declarado), no del CHECK. No se añade trigger ni función (AD-5 lo prohíbe explícitamente).
  - **Ubicación:** SQL versionado **en esta tarjeta** del checklist. Es el destino autorizado porque el archivo de migración destino (`E5-S1-T07`) **aún no existe** y no debe fabricarse un `migration.sql` con timestamp inventado fuera de turno. `E5-S1-T07` insertará este fragmento manualmente en el `.sql` generado (con `--create-only`, editando antes de aplicar); `E5-S1-T09` lo verificará en PostgreSQL real (`information_schema.check_constraints`, gate G-29).
  - **No se creó migración, no se ejecutó SQL contra la BD, `schema.prisma` no se modificó.**
- **Riesgos pendientes:** el CHECK debe **quedar dentro** del archivo de migración versionado (nunca fuera), para no perderse ante un `prisma migrate reset` (riesgo AD-5 §18); su aplicación real y las pruebas de rechazo son de `E5-S1-T07`/`E5-S1-T09`.
- **Corrección posterior a auditoría (2026-07-25):**
  - **Auditor:** Codex. **Veredicto:** `CHANGES_REQUESTED`. **Severidad:** `MEDIUM`.
  - **SQL del CHECK:** confirmado **correcto** por Codex — **no se modificó** (se conserva verbatim arriba).
  - **Causa del hallazgo:** la tarjeta `E5-S1-T07` indicaba `prisma migrate dev` **sin `--create-only`**, lo que podía generar y **aplicar** la migración antes de incorporar manualmente el CHECK (quedando la restricción fuera de la migración versionada).
  - **Corrección aplicada:** se actualizó la acción de `E5-S1-T07` para exigir `--create-only` en la generación y separar las etapas generación → edición → revisión → aplicación → verificación. Cambio **exclusivamente documental** en `E5-S1-T07` (no se tocó `schema.prisma` ni el CHECK).
  - **Resultado:** la migración podrá **editarse antes de aplicarse**, garantizando que el CHECK quede dentro del `migration.sql` versionado.
  - **Estado de T04:** permanece **`READY_FOR_AUDIT`** — requiere **reauditoría independiente** de Codex (no se marca `PASSED`).

#### E5-S1-T05 — `@@unique([id, companyId])` en `Cfdi`

- **Objetivo:** agregar la restricción que el DoD del Addendum exige sobre el modelo `Cfdi` existente, necesaria como destino de FKs compuestas futuras.
- **Archivos/módulos probables:** `schema.prisma`, modelo `Cfdi` (línea 620 actual).
- **Dependencias:** ninguna de las anteriores de este sprint.
- **Precondiciones:** ninguna.
- **Acciones:** 1) Añadir `@@unique([id, companyId])` al modelo `Cfdi` ya existente, sin tocar sus campos actuales ni sus dos restricciones únicas ya vigentes (`documentId_companyId`, `companyId_folioFiscal`).
- **Criterio de aceptación:** la restricción existe sin romper ninguna migración previa.
- **Pruebas requeridas:** ninguna directa.
- **Riesgos:** ninguno — es una adición no destructiva.
- **Evidencia de cierre:** diff de `schema.prisma`.
- **Gate asociado:** precondición estructural de `E5-S1-T01`/`T02`.
- **Estado inicial:** `BLOCKED`.
- **Cobertura parcial (2026-07-25):** el `@@unique([id, companyId])` en `Cfdi` —objetivo de esta tarea— **ya existe en el schema**, aplicado por necesidad estructural durante `E5-S1-T01` (destino de la FK compuesta de `CfdiConcept`/`CfdiTax`).
- **Estado actual:** `PASSED` — auditado y aprobado por Codex el 2026-07-25.
- **Auditoría independiente (2026-07-25):** auditor **Codex**; veredicto **`PASSED`**; alcance propio confirmado: **`Cfdi.@@unique([id, companyId])`**; FK triple `CfdiTax → CfdiConcept` validada (3 columnas, no 2); `MATCH SIMPLE` + CHECK de T04 validados; **sin cambios adicionales de schema**; **sin migración propia**; **sin hallazgos**. **Autoriza `E5-S1-T06`.** Observación `INFO`: el checklist permanece **no rastreado** por Git (trazabilidad pendiente para el commit documental). (La reconciliación de abajo se conserva sin alterar.)
- **Reconciliación (2026-07-25):**
  - **Alcance exacto de T05 (según la tarjeta y AD-5):** añadir **`@@unique([id, companyId])` al modelo `Cfdi`** existente, como clave candidata destino de las FKs compuestas de los hijos. Es el alcance estricto de esta tarjeta; las claves candidatas y FKs de los _hijos_ (`CfdiConcept`, `CfdiTax`) son entregables de `E5-S1-T01`/`E5-S1-T02` (ya `PASSED`), no de T05 — así se evita el doble conteo.
  - **Nota sobre el enunciado ampliado:** un enunciado de reconciliación describió T05 como "soporte de integridad compuesta" e insinuó formas de **2 columnas** para la clave candidata de `CfdiConcept` (`@@unique([id, companyId])`) y para la FK `CfdiTax → CfdiConcept` (`[cfdiConceptId, companyId] → [id, companyId]`). **AD-5 §4.5.1 (línea 455) rechaza explícitamente la forma de 2 columnas** por insegura (permitiría a un impuesto apuntar a un concepto de **otro** CFDI de la misma empresa, criterio 35). El schema implementado usa correctamente las formas de **3 columnas** (`CfdiConcept.@@unique([id, cfdiId, companyId])`, FK `[cfdiConceptId, cfdiId, companyId] → [id, cfdiId, companyId]`). Se conserva el diseño de AD-5; **no se “corrige” hacia 2 columnas.**
  - **Claves candidatas compuestas verificadas contra AD-5:**

    | Modelo        | Restricción esperada (AD-5)                             | Implementada (schema) | Resultado           |
    | ------------- | ------------------------------------------------------- | --------------------- | ------------------- |
    | `Cfdi`        | `@@unique([id, companyId])` (§4.5.1)                    | L655                  | ✅ (alcance de T05) |
    | `CfdiConcept` | `@@unique([id, cfdiId, companyId])` (§4.5.1 L450)       | L706                  | ✅ (entregable T01) |
    | `CfdiConcept` | `@@unique([companyId, cfdiId, position])` (§4.5.1 L449) | L705                  | ✅ (entregable T01) |

  - **Relaciones compuestas verificadas contra AD-5:**

    | Relación                                 | fields                               | references                           | onDelete  | onUpdate            | Resultado             |
    | ---------------------------------------- | ------------------------------------ | ------------------------------------ | --------- | ------------------- | --------------------- |
    | `CfdiConcept → Cfdi` (L702)              | `[cfdiId, companyId]`                | `Cfdi[id, companyId]`                | `Cascade` | (default `Cascade`) | ✅ = AD-5 §4.5.1 L446 |
    | `CfdiTax → Cfdi` (L775)                  | `[cfdiId, companyId]`                | `Cfdi[id, companyId]`                | `Cascade` | (default `Cascade`) | ✅ = AD-5 §4.5.2 L536 |
    | `CfdiTax → CfdiConcept` (L776, opcional) | `[cfdiConceptId, cfdiId, companyId]` | `CfdiConcept[id, cfdiId, companyId]` | `Cascade` | (default `Cascade`) | ✅ = AD-5 §4.5.2 L537 |

    `onUpdate` no se declara en ninguna (AD-5 tampoco lo especifica) → Prisma aplica el default `Cascade`, coherente con las migraciones previas del repo. Sin desviación.

  - **FK opcional y `MATCH SIMPLE`:** en `CfdiTax → CfdiConcept`, `cfdiConceptId` es nullable y `cfdiId`/`companyId` son `NOT NULL`. Bajo `MATCH SIMPLE` (default de PostgreSQL, el que AD-5 §4.5.2 L565 asume — **no** se requiere `MATCH FULL`), si **cualquier** columna del FK es `NULL` la restricción **no se evalúa**. Combinado con el CHECK de T04: `scope='CFDI' ⟹ cfdi_concept_id IS NULL` (la FK no se evalúa — correcto, no hay concepto) y `scope='CONCEPT' ⟹ cfdi_concept_id IS NOT NULL` (la FK se evalúa por completo). CHECK + FK compuesta entregan juntos la garantía prevista.
  - **Aislamiento multi-tenant (impedido a nivel de dato):** `CfdiConcept.companyId=A → Cfdi.companyId=B` (rechazado por la FK a `Cfdi`); `CfdiTax.companyId=A → Cfdi.companyId=B` (ídem); `CfdiTax → CfdiConcept` de otra empresa **u otro CFDI** (rechazado por la FK de 3 columnas, que exige mismo `cfdiId` y `companyId`). Lo declara Prisma Schema, lo materializa la migración de T07, el CHECK de T04 cubre la nulabilidad, y T09 lo prueba en PostgreSQL real (gate G-28).
  - **Solape con T01/T02:** el `@@unique([id, companyId])` de `Cfdi` fue **imprescindible** para que T01 (FK de `CfdiConcept`) pasara `prisma validate` — Prisma exige que `references:[id, companyId]` apunte a una clave única. Sin él, T01/T02 no validaban. Archivos modificados en tareas previas: **solo `schema.prisma`**. **Trabajo técnico pendiente para T05: ninguno** — su contenido de schema está completo y correcto.
  - **Cambios técnicos en esta tarea:** **ninguno.** `schema.prisma` **no se modificó** (todo coincide con AD-5); reconciliación exclusivamente documental. `prisma validate` verde.
  - **Migración propia:** T05 **no** requiere migración separada — su `@@unique([id, companyId])` se materializa en la **única** migración de `E5-S1-T07`, junto con T01–T04. Verificación física en `E5-S1-T09`.
- **Riesgos pendientes:** materialización real en `E5-S1-T07`; pruebas de rechazo cross-tenant y de la FK compuesta en PostgreSQL real en `E5-S1-T09` (gate G-28).

#### E5-S1-T06 — `prisma validate` + `prisma generate`

- **Objetivo:** confirmar que el schema completo (incluida la relación opcional de nulabilidad mixta) compila antes de generar la migración.
- **Archivos/módulos probables:** `packages/database/`.
- **Dependencias:** `E5-S1-T01` a `E5-S1-T05`.
- **Precondiciones:** todos los modelos y enums añadidos.
- **Acciones:** 1) `pnpm --filter @contaia/database run generate` (o el comando real del paquete). 2) Confirmar que `prisma.cfdiConcept.upsert()` y `prisma.cfdiTax.upsert()` compilan con los `WhereUniqueInput` generados, **antes** de escribir cualquier lógica del worker (DoD explícito del Addendum).
- **Criterio de aceptación:** cero errores de `prisma validate`/`generate`; criterio 57 verificado.
- **Pruebas requeridas:** compilación TypeScript del cliente generado.
- **Riesgos:** un error aquí bloquea todo Sprint 2 en adelante.
- **Evidencia de cierre:** log de `prisma generate` en verde.
- **Gate asociado:** precondición de Sprint 2.
- **Estado inicial:** `BLOCKED`.
- **Estado actual:** `PASSED` — auditado y aprobado por Codex el 2026-07-25.
- **Auditoría independiente (2026-07-25):** auditor **Codex**; veredicto **`PASSED`**; `prisma validate`, `prisma generate` (Prisma Client 6.19.3), typecheck y upserts compuestos (`CfdiConceptUpsertArgs`/`CfdiTaxUpsertArgs` + `WhereUniqueInput` compuestos) confirmados. **Autoriza `E5-S1-T07`.** Observación `INFO` (no bloqueante): Prisma reporta disponibilidad de la major 7.9.0 — no se actualiza. (La evidencia de ejecución de abajo se conserva sin alterar.)
- **Evidencia de ejecución (2026-07-25):**
  - **`prisma validate`** (`dotenv -e ../../.env -- prisma validate`, sin conexión a BD) → `The schema at prisma\schema.prisma is valid 🚀` (exit 0).
  - **`prisma generate`** (`dotenv -e ../../.env -- prisma generate`) → `✔ Generated Prisma Client (v6.19.3) to .\generated\client in 375ms` (exit 0). El cliente se emite a `packages/database/generated/` — **directorio ignorado por Git** (`.gitignore:69`), por lo que **no** produce diff rastreado.
  - **DoD del Addendum verificado (criterio 57):** el cliente generado expone `prisma.cfdiConcept.upsert()` y `prisma.cfdiTax.upsert()` con sus `WhereUniqueInput` compuestos generados — confirmado en `generated/client/index.d.ts`: `CfdiConceptUpsertArgs`, `CfdiTaxUpsertArgs`, y las claves compuestas `companyId_cfdiId_position` (identidad de `CfdiConcept`), `companyId_cfdiId_conceptSlot_position` (identidad de `CfdiTax`) e `id_cfdiId_companyId` (clave candidata de 3 columnas). La identidad idempotente del worker (AD-10.1) es implementable sin índices parciales.
  - **Compilación TypeScript del cliente generado:** `tsc -p tsconfig.json --noEmit` → exit 0 (cero errores).
  - **Alcance:** solo lectura de schema y **codegen** hacia el directorio ignorado; **no** se creó migración, **no** se ejecutó `prisma migrate`/`db push`, **no** se modificó `schema.prisma` (coincide con AD-5 desde T01–T05) ni la base de datos.
- **Riesgos pendientes:** ninguno propio de T06; habilita Sprint 2. La materialización física del schema sigue reservada a `E5-S1-T07` y su verificación en PostgreSQL real a `E5-S1-T09`.

#### E5-S1-T07 — Migración Prisma incremental

- **Objetivo:** aplicar los cambios de `E5-S1-T01` a `E5-S1-T05` como una única migración versionada.
- **Archivos/módulos probables:** `packages/database/prisma/migrations/<timestamp>_ewo_005_block_e_cfdi_children/`.
- **Dependencias:** `E5-S1-T06`.
- **Precondiciones:** `prisma validate`/`generate` en verde; PostgreSQL disponible (`E5-S0-T08`).
- **Acciones (secuencia operativa segura — CORREGIDA tras auditoría de T04, ver nota abajo):** la migración se **genera sin aplicar**, se **edita** para incorporar el CHECK, se **revisa** y solo entonces se **aplica**. Nunca `db push` (prohibido en este proyecto — Addendum §18). Cinco etapas:
  - **Etapa 1 — Generación sin aplicación (`--create-only`):** ejecutar la variante real del repositorio de
    ```bash
    pnpm --filter @contaia/database run migrate:dev -- --name ewo_005_block_e_cfdi_children --create-only
    ```
    (equivale a `dotenv -e ../../.env -- prisma migrate dev --name ewo_005_block_e_cfdi_children --create-only`, según el script `migrate:dev` de `packages/database/package.json`). **`--create-only` es obligatorio:** genera la carpeta de migración y el `migration.sql` **sin** aplicarlos a la base de datos, dejando margen para la edición manual. Sin `--create-only`, Prisma aplicaría la migración antes de incorporar el CHECK.
  - **Etapa 2 — Edición manual:** abrir el `migration.sql` recién generado (`packages/database/prisma/migrations/<timestamp>_ewo_005_block_e_cfdi_children/migration.sql`) e insertar **exactamente** el CHECK aprobado en `E5-S1-T04` (sin modificarlo):
    ```sql
    ALTER TABLE "cfdi_taxes"
      ADD CONSTRAINT "cfdi_taxes_scope_concept_check" CHECK (
        ("scope" = 'CFDI' AND "cfdi_concept_id" IS NULL AND "concept_slot" = 0)
        OR
        ("scope" = 'CONCEPT' AND "cfdi_concept_id" IS NOT NULL AND "concept_slot" > 0)
      );
    ```
  - **Etapa 3 — Revisión previa (antes de aplicar):** revisar el diff completo del `migration.sql` y confirmar: creación de `CfdiConcept`; creación de `CfdiTax`; creación de los enums `CfdiTaxScope`/`CfdiTaxType`; FKs compuestas (`(cfdiId, companyId) → cfdis`, `(cfdiConceptId, cfdiId, companyId) → cfdi_concepts`); índices y unicidades (incl. `@@unique([id, companyId])` en `Cfdi`); **presencia del CHECK insertado**; y ausencia de cualquier cambio ajeno al Sprint 1.
  - **Etapa 4 — Aplicación (solo tras la revisión):** aplicar la migración editada con el procedimiento establecido del repositorio — candidatos: `pnpm --filter @contaia/database run migrate:dev` (reejecuta `prisma migrate dev`, que detecta y aplica la migración pendiente ya editada) o `pnpm --filter @contaia/database run migrate` (`prisma migrate deploy`). **El comando exacto de aplicación se confirmará en T07 antes de ejecutarse**, dado que el repositorio no fija inequívocamente cuál usar tras una edición `--create-only`. No ejecutar en esta tarjeta.
  - **Etapa 5 — Verificación:** T07 genera, edita y aplica; **`E5-S1-T09`** verifica en PostgreSQL real que el CHECK existe (`information_schema.check_constraints`) y prueba combinaciones válidas e inválidas de `scope`/`cfdiConceptId`/`conceptSlot` (gate **G-29**), además de las FKs compuestas (gate G-28).
- **Criterio de aceptación:** migración aplicada **con el CHECK ya incorporado**; `_prisma_migrations` con la fila `applied`; ninguna migración anterior alterada.
- **Pruebas requeridas:** `E5-S1-T09`.
- **Riesgos:** en Windows, el proxy TCP de Docker Desktop ha bloqueado migraciones en EWO-002/003/004 — mismo riesgo aquí, mismo workaround documentado (contenedor Linux efímero). **Riesgo de secuencia (ya mitigado por `--create-only`):** aplicar antes de insertar el CHECK dejaría la restricción fuera de la migración versionada; la etapa 1 lo previene.
- **Evidencia de cierre:** archivo de migración (con el CHECK) + confirmación de aplicación.
- **Gate asociado:** precondición de G-28, G-29.
- **Estado inicial:** `BLOCKED`.
- **Corrección post-auditoría (2026-07-25):** hallazgo **`MEDIUM`** de Codex (auditoría de `E5-S1-T04`) — la acción original decía `prisma migrate dev --name …` **sin `--create-only`**, lo que podía generar y **aplicar** la migración antes de insertar el CHECK. **Corregido:** la acción ahora exige `--create-only` en la etapa 1 y separa explícitamente generación → edición → revisión → aplicación → verificación. La tarea **permanece `BLOCKED`** (no se ejecuta aquí); solo se corrigió su documentación operativa.
- **Estado actual:** `BLOCKED` — **precondición de base de datos no satisfecha (2026-07-25).**
- **Intento de ejecución bloqueado (2026-07-25):**
  - **Precondición fallida:** PostgreSQL **no disponible**. `prisma migrate status` → **`P1001: Can't reach database server at localhost:5432`** (exit 1). Sonda TCP a `localhost:5432` → **Connection refused** (sin servidor escuchando). No hay contenedor Docker de PostgreSQL activo. El entorno objetivo declarado es **local de desarrollo** (`postgresql://contaia:****@localhost:5432/contaia`), no producción.
  - **Consecuencia:** no se puede ejecutar la secuencia de T07. `prisma migrate dev --create-only` **también requiere** conexión a la base (usa una _shadow database_ para calcular el diff), por lo que **no se generó** ninguna migración. Conforme a la regla de precondición de T07 ("si PostgreSQL no está disponible… `BLOCKED`; no improvises otra base, no uses producción"), la tarea se detiene.
  - **No se realizó:** ninguna carpeta de migración creada, ningún `migration.sql`, ningún `prisma migrate dev`/`deploy`/`reset`, ningún `db push`, ninguna escritura a la base, ninguna modificación de `schema.prisma`. El CHECK aprobado de `E5-S1-T04` sigue registrado y listo para insertarse cuando la base esté disponible.
  - **Validaciones previas que sí pasaron (sin BD):** `prisma validate` → verde; `prisma generate` → verde; typecheck → verde (todas de `E5-S1-T06`, ya `PASSED`).
  - **Desbloqueo requerido:** levantar el PostgreSQL de desarrollo autorizado (p. ej. el contenedor Docker/Linux efímero documentado en Addendum §18 para sortear el proxy TCP de Docker Desktop en Windows) y reintentar la secuencia `--create-only` → edición del CHECK → revisión → aplicación → `migrate status`.
- **Reanudación (2026-07-25) — precondición de BD resuelta, nuevo bloqueo distinto encontrado:**
  - **Infraestructura oficial localizada:** `docker-compose.yml` (raíz del repo), servicio `postgres` (`postgres:16-alpine`, contenedor `contaia-postgres`, puerto `5432`, healthcheck `pg_isready`), mecanismo documentado en `README.md` y en la propia tarjeta `E5-S0-T08`. **No se creó infraestructura nueva.**
  - **Hallazgo:** el motor de Docker Desktop no estaba en ejecución (`docker ps` → error de conexión al daemon); no había proceso ni servicio Docker activo. Se localizó el ejecutable ya instalado del usuario y se inició (`Docker Desktop.exe`, acción local y reversible — arrancar una aplicación ya instalada, no crear infraestructura). Tras iniciar el motor, `docker ps` mostró los contenedores `contaia-postgres`/`contaia-redis` **ya existentes desde hace 3 días** (`restart: unless-stopped`), que se reanudaron automáticamente — **no se crearon contenedores nuevos**, solo se reanudaron los ya provisionados por el mecanismo oficial.
  - **Verificación post-arranque:** `contaia-postgres` → `healthy` (`docker inspect`/`docker compose ps`); `prisma migrate status` → **`2 migrations found in prisma/migrations` / `Database schema is up to date!`** (exit 0) — sin migraciones fallidas, sin aplicación parcial, sin drift. Entorno confirmado: `localhost:5432`, base `contaia` (desarrollo, no producción).
  - **Validaciones previas de T07 (todas verdes):** `prisma -v` → `6.19.3`; `prisma validate` → `is valid 🚀`; `prisma generate` → `✔ Generated Prisma Client (v6.19.3)`; `tsc --noEmit` → exit 0; `git status --short` inspeccionado (solo `schema.prisma` acumulado de T01/T02 y un archivo exploratorio preexistente `test-prisma-upsert.ts`); migraciones existentes confirmadas (2, sin cambios).
  - **NUEVO bloqueo — creación de la migración:** se intentó `pnpm --filter @contaia/database run migrate:dev -- --name ewo_005_block_e_cfdi_children --create-only`. El wrapper de pnpm **duplicó el separador `--`** (comando efectivo impreso: `prisma migrate dev "--" "--name" "ewo_005_block_e_cfdi_children" "--create-only"`), y **además** — de forma independiente a ese artefacto — `prisma migrate dev` **rechazó ejecutarse**: `Error: Prisma Migrate has detected that the environment is non-interactive, which is not supported.` Se repitió invocando `prisma` directamente (sin pnpm, sin el `--` duplicado): `dotenv -e ../../.env -- prisma migrate dev --name ewo_005_block_e_cfdi_children --create-only` → **idéntico rechazo**, confirmando que la causa real es el requisito de terminal interactiva de `migrate dev` (verificación `isTTY` de Prisma), no el artefacto de argumentos de pnpm. El propio mensaje de error remite a `prisma migrate deploy` — que solo **aplica** migraciones ya existentes, no **crea** una nueva a partir de un diff de schema, por lo que no sustituye la creación exigida por T07.
  - **Por qué no se sorteó este bloqueo:** forzar una pseudo-terminal para engañar la detección de interactividad de Prisma **subvertiría una salvaguarda de diseño del propio Prisma Migrate** (existe deliberadamente para impedir que `migrate dev` se ejecute sin supervisión en entornos automatizados/CI). Está en la misma categoría que "no usar `--no-verify`" o "no saltar hooks de seguridad" — no se intenta sin autorización explícita del usuario. Tampoco se recurrió a `db push`, `migrate reset`, `migrate resolve` ni autoría manual del `migration.sql` fuera del flujo de Prisma — todos prohibidos o fuera de alcance de esta tarjeta.
  - **Estado dejado:** sin carpeta de migración creada, sin `migration.sql`, sin CHECK insertado, sin aplicación, sin escritura a la base más allá de las verificaciones read-only (`migrate status`). `schema.prisma` sin cambios. Contenedores Docker permanecen arriba (acción reversible, `docker compose down` los detiene si se desea).
  - **Desbloqueo real requerido:** ejecutar `pnpm --filter @contaia/database run migrate:dev -- --name ewo_005_block_e_cfdi_children --create-only` (o el `prisma migrate dev --create-only` equivalente) **desde una terminal interactiva real** (una sesión de shell con TTY que el usuario opere directamente), no desde este entorno de ejecución automatizado. Una vez generado el `migration.sql`, el resto de la secuencia (edición del CHECK, revisión, aplicación) puede continuar en este entorno si se autoriza.
- **Estado actual:** `READY_FOR_AUDIT` — secuencia completada el 2026-07-26 (pendiente de auditoría independiente de Codex antes de `PASSED`).
- **Migración principal aplicada por el usuario (`20260726020913`), confirmada:** el usuario ejecutó `prisma migrate dev --create-only` desde una terminal interactiva real y aplicó la migración. Verificado en esta sesión: carpeta `packages/database/prisma/migrations/20260726020913/` presente; `_prisma_migrations` la registra `applied` (`finished_at` 2026-07-26T02:09:13.682Z, `rolled_back_at` NULL); contiene exactamente los enums `CfdiTaxScope`/`CfdiTaxType`, las tablas `cfdi_concepts`/`cfdi_taxes` con todos sus campos/tipos/nulabilidad, los índices y `@@unique` de T01/T02/T05 (incluida `cfdis_id_company_id_key`), y las tres FKs compuestas correctas (`cfdi_concepts→cfdis`, `cfdi_taxes→cfdis`, `cfdi_taxes→cfdi_concepts` de **3 columnas**, todas `ON DELETE/UPDATE CASCADE`) — sin ningún cambio destructivo ni fuera del alcance del Bloque E.
- **Hallazgo — CHECK ausente en `20260726020913`:** verificado read-only (`pg_constraint` sobre `cfdi_taxes`) que el CHECK `cfdi_taxes_scope_concept_check` de `E5-S1-T04` **no** estaba presente ni en el archivo ni en PostgreSQL real, porque la migración se generó y aplicó **antes** de incorporar manualmente ese SQL (paso que en el flujo estándar de T07 va entre `--create-only` y la aplicación).
- **Migración correctiva (autorizada explícitamente por el usuario) — `20260726022147_ewo_005_block_e_cfdi_tax_scope_check`:**
  - **Por qué una migración separada, no una edición de `20260726020913`:** editar el archivo de una migración ya aplicada deja el checksum almacenado en `_prisma_migrations` desincronizado del contenido real del archivo — el texto versionado ya no describiría fielmente lo que se ejecutó, y el usuario prohibió expresamente tocar ese archivo. La corrección correcta y auditable es una migración nueva, exclusivamente con el SQL faltante.
  - **Restricción respetada:** `20260726020913/migration.sql` permanece **byte-idéntico** al aplicado (`diff` contra una copia tomada antes de cualquier intento → idéntico; checksum en `_prisma_migrations` sin cambios: `e0fa6b7ecde657fdc5e7f636e2c347dda42c1ed6746051e1512d72acb4cb52c9`).
  - **Contenido exacto de la migración correctiva** (solo esto, ningún otro SQL):
    ```sql
    ALTER TABLE "cfdi_taxes"
    ADD CONSTRAINT "cfdi_taxes_scope_concept_check"
    CHECK (
      (
        "scope" = 'CFDI'
        AND "cfdi_concept_id" IS NULL
        AND "concept_slot" = 0
      )
      OR
      (
        "scope" = 'CONCEPT'
        AND "cfdi_concept_id" IS NOT NULL
        AND "concept_slot" > 0
      )
    );
    ```
  - **Verificaciones previas (read-only, antes de crear/aplicar):** `pg_constraint` sobre `cfdi_taxes` → solo `_pkey` y las 2 FK compuestas, **sin CHECK**; búsqueda por nombre `cfdi_taxes_scope_concept_check` en toda la base → **vacía** (ninguna coincidencia, ni de nombre ni de semántica equivalente); entorno confirmado `localhost:5432/contaia` (`contaia-postgres` healthy, desarrollo, no producción).
  - **Cómo se creó (nota de transparencia):** `prisma migrate dev --create-only` **no puede ejecutarse en este entorno automatizado** (rechazo por terminal no interactiva, mismo límite documentado en el intento anterior de esta tarjeta) y el usuario no pidió repetir ese intento para esta migración puntual. Se creó manualmente la carpeta `packages/database/prisma/migrations/20260726022147_ewo_005_block_e_cfdi_tax_scope_check/` usando el timestamp UTC real del sistema (`date -u +%Y%m%d%H%M%S`, no inventado) en la convención de nombres de Prisma, con `migration.sql` conteniendo **únicamente** el SQL exacto arriba. **La aplicación sí se hizo mediante el flujo estándar y versionado de Prisma:** `dotenv -e ../../.env -- prisma migrate deploy` — el mecanismo oficial no interactivo de Prisma para aplicar migraciones pendientes desde disco, calculando su checksum y registrándolo en `_prisma_migrations`. No se usó `db execute`, `db push`, `migrate reset`, `migrate resolve`, ni edición directa de `_prisma_migrations`, ni SQL no versionado.
  - **Aplicación:** `prisma migrate deploy` → `Applying migration `20260726022147_ewo_005_block_e_cfdi_tax_scope_check`` / `All migrations have been successfully applied.` (exit 0).
- **Verificación posterior completa (2026-07-26):**

  | Validación                       | Comando                            | Resultado                                                                                                                                                                                                                                                                                                                        |
  | -------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Estado de migraciones            | `prisma migrate status`            | `4 migrations found` / `Database schema is up to date!` (exit 0)                                                                                                                                                                                                                                                                 |
  | Registro en `_prisma_migrations` | consulta read-only                 | 4 filas, todas con `finished_at` y `rolled_back_at = NULL`; `20260726020913` con checksum sin cambios                                                                                                                                                                                                                            |
  | Existencia física del CHECK      | `pg_constraint` sobre `cfdi_taxes` | presente: `cfdi_taxes_scope_concept_check`                                                                                                                                                                                                                                                                                       |
  | Definición exacta                | `pg_get_constraintdef`             | `CHECK ((((scope = 'CFDI'::"CfdiTaxScope") AND (cfdi_concept_id IS NULL) AND (concept_slot = 0)) OR ((scope = 'CONCEPT'::"CfdiTaxScope") AND (cfdi_concept_id IS NOT NULL) AND (concept_slot > 0))))` — semánticamente idéntica a AD-5/T04 (Postgres normaliza el formato de paréntesis y castea el enum, sin alterar la lógica) |
  | Validación estática              | `prisma validate`                  | `is valid 🚀` (exit 0)                                                                                                                                                                                                                                                                                                           |
  | Generación de cliente            | `prisma generate`                  | `✔ Generated Prisma Client (v6.19.3)` (exit 0)                                                                                                                                                                                                                                                                                   |
  | Compilación TS                   | `tsc --noEmit`                     | exit 0                                                                                                                                                                                                                                                                                                                           |
  | Higiene                          | `git diff --check`                 | limpio (solo avisos LF/CRLF)                                                                                                                                                                                                                                                                                                     |
  | Drift                            | `prisma migrate status`            | ninguno — `up to date`                                                                                                                                                                                                                                                                                                           |
  | `20260726020913` intacta         | `diff` contra copia pre-intento    | idéntica; checksum sin cambios                                                                                                                                                                                                                                                                                                   |
  - **Sin cambios destructivos:** ninguna tabla ajena al Bloque E alterada; ninguna pérdida de datos (tablas nuevas, vacías en el MVP); ninguna migración anterior modificada.

- **Riesgos pendientes:** las pruebas de rechazo reales (combinaciones inválidas de `scope`/`cfdi_concept_id`/`concept_slot`, y las FKs compuestas cross-tenant) son de `E5-S1-T09` — **no ejecutadas en esta tarea** (gates G-28/G-29 siguen abiertos hasta esa tarjeta).
- **Auditoría independiente de Codex (2026-07-26) — veredicto `CHANGES_REQUESTED`:** Codex confirmó el estado técnico (4 migraciones aplicadas, sin fallos ni rollbacks, checksums coincidentes, migración principal completa en enums/tablas/índices/únicos/FKs, migración correctiva con exclusivamente el CHECK correcto, CHECK físico validado y no duplicado, estado reproducible ejecutando las 4 migraciones en orden, `E5-S1-T09` correctamente `BLOCKED`), pero devolvió la tarjeta por **4 hallazgos documentales** (ninguno técnico/destructivo):

  | Hallazgo Codex                                                                 | Corrección documental                                                                                                                                                                                                                                                                                                                                                                        | Archivo                                                     |
  | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
  | H-1 — División en dos migraciones sin excepción formal                         | Registrada **D-008** (`brain/DECISIONS.md`) — excepción formal, alcance exclusivo a esta recuperación, que autoriza la división sin reescribir el historial aplicado                                                                                                                                                                                                                         | `brain/DECISIONS.md`                                        |
  | H-2 — Migración correctiva creada manualmente (no vía `--create-only` literal) | D-008 documenta expresamente: no se cumplió el flujo original de `--create-only`; no se presenta como cumplimiento literal; fue medida de recuperación puntual; aplicación vía `prisma migrate deploy`; no se modificó una migración ya aplicada; no se usó SQL no versionado, `db execute`, ni se alteró `_prisma_migrations` fuera de lo que el propio `migrate deploy` inserta al aplicar | `brain/DECISIONS.md` (D-008)                                |
  | H-3 — Ambas migraciones no versionadas en Git (`??`)                           | Documentado (esta tarjeta + D-008 + `MASTER_CONTEXT.md`): ambas carpetas deben incluirse en el próximo commit autorizado; ese commit es requisito para cerrar la reproducibilidad del árbol limpio; `E5-S1-T07` no pasa a `PASSED` mientras no formen parte del historial versionado, salvo indicación expresa en contrario de la política del proyecto                                      | esta tarjeta, `brain/DECISIONS.md`, `MASTER_CONTEXT.md` §26 |
  | H-4 — Nombre de `20260726020913` sin el sufijo `ewo_005_block_e_cfdi_children` | Documentada la desviación (no se renombra: ya aplicada, el nombre forma parte del historial); impacto limitado a trazabilidad/legibilidad, sin afectar integridad ni contenido                                                                                                                                                                                                               | `brain/DECISIONS.md` (D-008)                                |

  **Excepción formal registrada — D-008** (`brain/DECISIONS.md`): _"Recuperación de `E5-S1-T07` mediante migración correctiva versionada"_. **Estatus:** `ACEPTADA`, alcance limitado exclusivamente a esta recuperación. Declara expresamente: T07 exigía originalmente una sola migración consolidada; la principal se aplicó antes de incorporar el CHECK; editar/renombrar una migración ya aplicada fue descartado para preservar checksum e historial; se autorizó la migración correctiva exclusiva para el CHECK; se creó manualmente por la limitación no interactiva de Prisma; se aplicó con `prisma migrate deploy`; ambas migraciones forman una única unidad lógica del entregable de T07; no cambia D-007 ni resuelve Q-001; el estado técnico final cumple AD-5/T04; `E5-S1-T09` conserva la responsabilidad de probar físicamente G-28/G-29; ambas carpetas deben quedar versionadas en Git; el patrón no debe repetirse como flujo normal; toda migración futura con SQL manual debe seguir `migrate dev --create-only → editar → revisar → aplicar` desde terminal interactiva real.
  - **Validaciones read-only ejecutadas en esta corrección:** ambos `migration.sql` reconfirmados sin cambios (`diff` contra copias de referencia); `git status --short` — solo las mismas 2 carpetas `??` más `brain/DECISIONS.md` y `MASTER_CONTEXT.md` modificados (documentación); `git diff --check` — limpio; PostgreSQL no tocado (ningún comando Prisma que escriba archivos o toque la base se ejecutó en esta corrección); `E5-S1-T09` confirmado sin cambios (`BLOCKED`).
  - **Ciclo de estado de esta corrección:** `READY_FOR_AUDIT` (previo) → `CHANGES_REQUESTED` (veredicto Codex) → correcciones documentales aplicadas (D-008 + esta tarjeta + `MASTER_CONTEXT.md`) → **`READY_FOR_AUDIT`** (no se marca `PASSED`; requiere segunda auditoría de Codex, limitada a verificar únicamente estas 4 correcciones documentales).

- **Estado actual (post-corrección):** `READY_FOR_AUDIT`.

#### E5-S1-T08 — Permiso `cfdi.read` en el seed

- **Objetivo:** agregar el permiso que Addendum §12 exige, con la matriz de roles exacta ya verificada.
- **Archivos/módulos probables:** `packages/database/prisma/seed.ts` (líneas 65–67 del `PERMISSION_CATALOG`, líneas 100–134 de `ROLE_PERMISSIONS`).
- **Dependencias:** ninguna de este sprint.
- **Precondiciones:** ninguna.
- **Acciones:** 1) Agregar `{ key: 'cfdi.read', description: 'Consultar datos extraídos del CFDI', module: 'cfdi' }` al `PERMISSION_CATALOG`. 2) `ADMINISTRADOR` lo recibe automáticamente (`PERMISSION_CATALOG.map(p => p.key)`, sin cambio de lógica). 3) Agregar `'cfdi.read'` explícitamente a los arreglos de `CONTADOR` y `AUXILIAR`. 4) **No** agregarlo a `SUPERVISOR` ni `AUDITOR` — exclusión deliberada (RBAC ya verificado en Addendum §12).
- **Criterio de aceptación:** `ADMINISTRADOR`, `CONTADOR`, `AUXILIAR` tienen `cfdi.read`; `SUPERVISOR`, `AUDITOR` no.
- **Pruebas requeridas:** prueba de seed (verificar asignación de permisos por rol tras `db:seed`).
- **Riesgos:** agregarlo a `SUPERVISOR`/`AUDITOR` por error violaría el criterio de RBAC ya auditado.
- **Evidencia de cierre:** diff de `seed.ts` + resultado de `pnpm run db:seed` mostrando la asignación.
- **Gate asociado:** precondición de Sprint 7 (API-0027/0028).
- **Estado inicial:** `BLOCKED`.

#### E5-S1-T09 — Pruebas de base de datos (FKs y CHECK)

- **Objetivo:** verificar en PostgreSQL real que las restricciones rechazan los datos inválidos, no solo que el repositorio los valide en memoria.
- **Archivos/módulos probables:** `packages/database/` (pruebas de integración con Vitest, `vitest.integration.config.ts`).
- **Dependencias:** `E5-S1-T07`.
- **Precondiciones:** migración aplicada; PostgreSQL disponible.
- **Acciones:** 1) Prueba: `CfdiTax` con `cfdiConceptId` de **otro** `Cfdi` → rechazado por la FK compuesta en base de datos (gate G-28). 2) Prueba: las tres combinaciones inválidas de `scope`/`cfdiConceptId`/`conceptSlot` → rechazadas por el CHECK (gate G-29). 3) Prueba: el CHECK existe realmente tras la migración (`information_schema.check_constraints`).
- **Criterio de aceptación:** las tres pruebas pasan contra PostgreSQL real, no contra un mock.
- **Pruebas requeridas:** las tres descritas arriba.
- **Riesgos:** validar solo en el repositorio (sin la constraint real) dejaría un hueco si algún código futuro escribe con SQL directo.
- **Evidencia de cierre:** reporte de Vitest en verde.
- **Gate asociado:** G-28, G-29.
- **Estado inicial:** `BLOCKED`.

#### E5-S1-T10 — Rollback de migración documentado

- **Objetivo:** dejar registrado el procedimiento de reversión de la migración de `E5-S1-T07`, sin ejecutarlo.
- **Archivos/módulos probables:** nota en este checklist o en el propio directorio de la migración.
- **Dependencias:** `E5-S1-T07`.
- **Precondiciones:** migración aplicada.
- **Acciones:** 1) Documentar que la reversión es una **nueva migración** que elimina `CfdiConcept`/`CfdiTax`/el CHECK — nunca `prisma migrate reset` en un entorno con datos. 2) Confirmar que ninguna tabla de negocio ya poblada (`Cfdi`, `Document`, `Job`) se ve afectada por el rollback, dado que los modelos nuevos no tienen datos todavía en el MVP.
- **Criterio de aceptación:** procedimiento de rollback documentado y revisable, no ejecutado.
- **Pruebas requeridas:** ninguna.
- **Riesgos:** un rollback mal documentado podría tentar a alguien a usar `db push`/`reset` bajo presión, perdiendo datos.
- **Evidencia de cierre:** nota de rollback en el checklist.
- **Gate asociado:** ninguno.
- **Estado inicial:** `BLOCKED`.

---

## 10. Sprint 2 — Dominio y persistencia

> Bloqueado por Sprint 1 completo (`E5-S1-T09`). Ninguna tarea depende de Q-001.

#### E5-S2-T01 — Tipo de dominio del agregado en memoria

- **Objetivo:** definir el tipo TypeScript que representa el resultado de extracción **antes** de persistir nada (AD-10.1: "el worker construye el resultado de la extracción en memoria, de forma determinista").
- **Archivos/módulos probables:** nuevo `apps/api/src/modules/cfdi/cfdi-aggregate.types.ts` (o equivalente).
- **Dependencias:** `E5-S1-T09`.
- **Precondiciones:** modelos Prisma disponibles.
- **Acciones:** 1) Interfaz `ExtractedCfdiAggregate` con: encabezado (folioFiscal, rfcEmisor, rfcReceptor, issuedAt, subtotal, total, currency, tipoComprobante, ambiguousFields), `concepts: ExtractedConcept[]`, `cfdiTaxes: ExtractedTax[]` (conceptSlot=0), cada concepto con sus propios `taxes: ExtractedTax[]`. 2) Sin dependencia de Prisma — es el contrato entre el parser (Sprint 3) y la persistencia (este sprint).
- **Criterio de aceptación:** tipo compilable, usado como entrada única de la función de persistencia.
- **Pruebas requeridas:** ninguna directa (se ejercita en `E5-S2-T10`).
- **Riesgos:** acoplar este tipo a Prisma dificultaría probar el parser de forma aislada.
- **Evidencia de cierre:** diff del archivo de tipos.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S2-T02 — `CfdiRepository.create()`

- **Objetivo:** implementar la creación de la cabecera exactamente como AD-10.1.2 la especifica — `create()`, nunca `upsert({ update: {} })`, con el `findUnique` previo como guarda de invariante.
- **Archivos/módulos probables:** nuevo `apps/api/src/modules/cfdi/cfdi.repository.ts`.
- **Dependencias:** `E5-S2-T01`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) Método que recibe el `tx` de Prisma (nunca el cliente global) y el `ExtractedCfdiAggregate`. 2) `findUnique` por `documentId_companyId` — si existe, **lanzar** `ViolacionDeInvarianteError` (nunca reutilizar, nunca ramificar hacia una ruta de "recuperación"). 3) Si no existe, `tx.cfdi.create({ data: {...} })`.
- **Criterio de aceptación:** ninguna ruta del código llama a `upsert` sobre `Cfdi` (criterio 59); el `findUnique` previo nunca retorna un valor usado para continuar el flujo normal.
- **Pruebas requeridas:** unitaria — ver `E5-S2-T10`.
- **Riesgos:** este es el punto exacto donde la auditoría de Codex encontró el falso `PROCESSED` dos veces; máxima atención en la revisión.
- **Evidencia de cierre:** diff del repositorio + prueba unitaria que falla si alguien reintroduce `upsert({update:{}})`.
- **Gate asociado:** G-24 (parcialmente), precondición de G-01–G-05.
- **Estado inicial:** `BLOCKED`.

#### E5-S2-T03 — `CfdiConceptRepository` / `CfdiTaxRepository`

- **Objetivo:** persistir los hijos por identidad declarativa, con `upsert` (aquí sí es correcto — AD-10.1.2).
- **Archivos/módulos probables:** `apps/api/src/modules/cfdi/cfdi-concept.repository.ts`, `cfdi-tax.repository.ts`.
- **Dependencias:** `E5-S2-T02`.
- **Precondiciones:** cabecera ya creada en la misma transacción.
- **Acciones:** 1) `upsert` de cada concepto por `companyId_cfdiId_position`. 2) `upsert` de cada impuesto por `companyId_cfdiId_conceptSlot_position`, calculando `conceptSlot = 0` para impuestos de comprobante y `conceptSlot = concepto.position` para impuestos de concepto.
- **Criterio de aceptación:** los hijos se persisten sin duplicados ante un reintento del mismo Job (RUTA REUTILIZACIÓN de hijos, distinta de la cabecera).
- **Pruebas requeridas:** unitaria.
- **Riesgos:** confundir el `conceptSlot` con la `position` del concepto rompería la identidad declarativa (riesgo residual ya documentado en AD-5 §4.5.2 y en Addendum §18).
- **Evidencia de cierre:** diff de ambos repositorios.
- **Gate asociado:** precondición de G-28.
- **Estado inicial:** `BLOCKED`.

#### E5-S2-T04 — `DocumentsRepository.markAsProcessed`

- **Objetivo:** implementar la transición terminal condicional con `count === 1` exigido.
- **Archivos/módulos probables:** `apps/api/src/modules/documents/documents.repository.ts` (extender junto a `confirmUpload`, que ya usa este mismo patrón).
- **Dependencias:** `E5-S2-T01`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) `tx.document.updateMany({ where: { id, companyId, status: 'PROCESSING' }, data: { status: 'PROCESSED', checksumSha256 } })`. 2) Si `count !== 1`, lanzar `TransicionNoConfirmadaError('document', count)` — nunca continuar silenciosamente.
- **Criterio de aceptación:** criterio 58 (count === 1, cualquier otro valor aborta).
- **Pruebas requeridas:** unitaria — ver `E5-S2-T10`.
- **Riesgos:** reintroducir `count === 0` como única guarda (en vez de `!== 1`) dejaría pasar un `count > 1` teóricamente imposible sin aserción explícita.
- **Evidencia de cierre:** diff del repositorio.
- **Gate asociado:** G-06, G-24.
- **Estado inicial:** `BLOCKED`.

#### E5-S2-T05 — `JobsRepository`: `markAsProcessing`, `markAsCompleted`, `markAsFailed`, `findById`

- **Objetivo:** completar los métodos que el DoD del Addendum exige y que hoy no existen (`JobsRepository` solo tiene `findOrCreateQueued`).
- **Archivos/módulos probables:** `apps/api/src/modules/jobs/jobs.repository.ts`.
- **Dependencias:** `E5-S2-T01`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) `findById(id, companyId)` — tenant-safe. 2) `markAsProcessing`: `updateMany WHERE status IN ('QUEUED','PROCESSING')`. 3) `markAsCompleted`: `updateMany WHERE status IN ('QUEUED','PROCESSING') → COMPLETED + result`, exigiendo `count === 1` (criterio 64). 4) `markAsFailed`: `updateMany WHERE status IN ('QUEUED','PROCESSING') → FAILED + error`.
- **Criterio de aceptación:** `markAsCompleted` nunca retorna silenciosamente con `count !== 1` — debe forzar el rollback de la transacción que lo invoca.
- **Pruebas requeridas:** unitaria.
- **Riesgos:** exactamente el segundo punto donde Codex encontró la divergencia `Document`/`Job` — cierre sin comprobar `count`.
- **Evidencia de cierre:** diff del repositorio.
- **Gate asociado:** G-07, G-08–G-12.
- **Estado inicial:** `BLOCKED`.

#### E5-S2-T06 — Transacción A única (orquestación)

- **Objetivo:** implementar la función que orquesta `E5-S2-T02` a `E5-S2-T05` dentro de un único `prisma.$transaction(async (tx) => {...})`, exactamente en el orden de AD-10.1.2/§7 paso 10.
- **Archivos/módulos probables:** nuevo `apps/api/src/modules/cfdi/persist-cfdi-aggregate.ts` (o servicio equivalente, ubicado para evitar el ciclo de módulos de §8).
- **Dependencias:** `E5-S2-T02`, `E5-S2-T03`, `E5-S2-T04`, `E5-S2-T05`.
- **Precondiciones:** los cuatro repositorios completos.
- **Acciones:** 1) Forma interactiva, nunca de arreglo. 2) Orden: guarda de invariante de `Cfdi` → `create()` → checksum → hijos → releer/verificar conteos → transición terminal `Document` (count===1) → cierre `Job` (count===1). 3) Cualquier excepción intermedia propaga sin capturarse dentro del callback.
- **Criterio de aceptación:** un solo commit para todo el agregado; ningún `P2002` ni `TransicionNoConfirmadaError` se captura dentro del callback (criterio 55).
- **Pruebas requeridas:** unitaria (orquestación con mocks) + integración (`E5-S2-T10`, `E5-S4-T15`).
- **Riesgos:** es el punto de mayor riesgo de todo el Bloque E — cualquier desviación reintroduce el falso `PROCESSED`.
- **Evidencia de cierre:** diff del orquestador + prueba que verifica que el rollback revierte absolutamente todo.
- **Gate asociado:** G-01 a G-07, G-24, G-26.
- **Estado inicial:** `BLOCKED`.

#### E5-S2-T07 — Errores tipados

- **Objetivo:** definir las clases de error que el flujo necesita, distintas de las genéricas de Prisma.
- **Archivos/módulos probables:** `apps/api/src/modules/cfdi/cfdi.errors.ts`.
- **Dependencias:** `E5-S2-T02`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) `ViolacionDeInvarianteError` (Cfdi existente + Document PROCESSING). 2) `TransicionNoConfirmadaError('document'|'job', count)`. 3) Reutilizar `RecoverableError`/`UnrecoverableError` de BullMQ donde corresponda (AD-11), sin duplicar su semántica.
- **Criterio de aceptación:** cada rama de AD-10.1.2/AD-10.2 tiene un tipo de error distinguible en el `catch` externo, sin depender de `instanceof Prisma.PrismaClientKnownRequestError` como única señal.
- **Pruebas requeridas:** unitaria.
- **Riesgos:** ninguno significativo.
- **Evidencia de cierre:** diff de `cfdi.errors.ts`.
- **Gate asociado:** precondición de Sprint 5.
- **Estado inicial:** `BLOCKED`.

#### E5-S2-T08 — Tenant isolation en cada query

- **Objetivo:** confirmar que ninguna consulta de los repositorios nuevos omite `companyId`.
- **Archivos/módulos probables:** los cuatro repositorios de este sprint.
- **Dependencias:** `E5-S2-T02` a `E5-S2-T05`.
- **Precondiciones:** repositorios implementados.
- **Acciones:** 1) Revisión línea por línea: todo `WHERE`/`create`/`upsert` incluye `companyId` explícito, siguiendo el mismo patrón que `DocumentsRepository`/`JobsRepository` existentes.
- **Criterio de aceptación:** cero consultas sin `companyId` (BR-GLB-001).
- **Pruebas requeridas:** unitaria — intento de acceso cruzado entre empresas.
- **Riesgos:** un olvido aquí sería una fuga de datos entre Empresas.
- **Evidencia de cierre:** checklist de revisión + prueba negativa.
- **Gate asociado:** precondición de Sprint 9.
- **Estado inicial:** `BLOCKED`.

#### E5-S2-T09 — Logging mínimo de la transacción

- **Objetivo:** dejar los puntos de enganche mínimos para observabilidad (el detalle completo es Sprint 8).
- **Archivos/módulos probables:** `persist-cfdi-aggregate.ts`.
- **Dependencias:** `E5-S2-T06`.
- **Precondiciones:** orquestador implementado.
- **Acciones:** 1) Puntos de log (sin implementación final de formato) en: inicio de transacción, commit exitoso, cada tipo de error capturado en el `catch` externo.
- **Criterio de aceptación:** existen los puntos de enganche; el formato final se define en Sprint 8.
- **Pruebas requeridas:** ninguna en este sprint.
- **Riesgos:** ninguno.
- **Evidencia de cierre:** diff con los puntos de log marcados.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S2-T10 — Pruebas unitarias de persistencia

- **Objetivo:** cubrir con pruebas unitarias (mocks de Prisma) cada repositorio y el orquestador.
- **Archivos/módulos probables:** `*.spec.ts` junto a cada archivo de este sprint.
- **Dependencias:** `E5-S2-T01` a `E5-S2-T09`.
- **Precondiciones:** todo el sprint implementado.
- **Acciones:** 1) `CfdiRepository.create()` nunca invoca `upsert`. 2) Guarda de invariante lanza cuando el `Cfdi` ya existe. 3) `markAsProcessed`/`markAsCompleted` exigen `count === 1`. 4) El orquestador revierte todo ante cualquier fallo intermedio simulado.
- **Criterio de aceptación:** cobertura ≥ 80 % de los archivos de este sprint (consistente con el DoD general del Addendum).
- **Pruebas requeridas:** las cuatro descritas.
- **Riesgos:** ninguno adicional.
- **Evidencia de cierre:** reporte de cobertura + suite en verde.
- **Gate asociado:** precondición de auditoría de Sprint 2.
- **Estado inicial:** `BLOCKED`.

---

## 11. Sprint 3 — Parser CFDI

> Bloqueado por Sprint 1 (los tipos de dominio de `E5-S2-T01` son su contrato de salida). **No depende de Q-001** — este sprint es validación estructural pura; ninguna tarea aquí decide qué hacer ante un folio duplicado, esa decisión pertenece exclusivamente a Sprint 5/AD-10.2 CASO F.

#### E5-S3-T01 — Scaffold de `XmlProcessingModule`

- **Objetivo:** crear el módulo evitando el ciclo de dependencias descrito en Addendum §8.
- **Archivos/módulos probables:** nuevo `apps/api/src/modules/xml-processing/xml-processing.module.ts`.
- **Dependencias:** `E5-S1-T09`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) El módulo no debe vivir dentro de `JobsModule` ni importar `DocumentsService` directamente (ver grafo de módulos, Addendum §8). 2) Confirmar el punto de inyección de `StorageAdapter`, `DocumentsRepository`, `JobsRepository` y la persistencia CFDI sin introducir ciclos.
- **Criterio de aceptación:** `nest build` sin advertencias de dependencia circular.
- **Pruebas requeridas:** ninguna directa.
- **Riesgos:** un ciclo de módulos rompería el arranque de NestJS.
- **Evidencia de cierre:** diff del módulo + confirmación de build.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S3-T02 — Instalar `fast-xml-parser`

- **Objetivo:** agregar la dependencia que hoy no existe en el monorepo (confirmado: 0 resultados en `apps/api/package.json` y `pnpm-lock.yaml`).
- **Archivos/módulos probables:** `apps/api/package.json`, `pnpm-lock.yaml`.
- **Dependencias:** ninguna de este sprint.
- **Precondiciones:** ninguna.
- **Acciones:** 1) Confirmar versión estable compatible con las opciones de seguridad de §5.2. 2) `pnpm --filter @contaia/api add fast-xml-parser`.
- **Criterio de aceptación:** dependencia instalada, lockfile actualizado.
- **Pruebas requeridas:** ninguna directa.
- **Riesgos:** una versión con defaults inseguros exigiría revisar §5.2 contra la versión real antes de continuar (advertencia ya registrada en Addendum §18).
- **Evidencia de cierre:** diff de `package.json`/`pnpm-lock.yaml`.
- **Gate asociado:** precondición de `E5-S3-T04`.
- **Estado inicial:** `BLOCKED`.

#### E5-S3-T03 — Pre-validaciones de seguridad sobre el Buffer

- **Objetivo:** implementar el paso 7 de §7 — controles antes de invocar al parser.
- **Archivos/módulos probables:** `apps/api/src/modules/xml-processing/xml-pre-validation.ts`.
- **Dependencias:** `E5-S3-T01`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) Verificar tamaño `< XML_MAX_FILE_SIZE_BYTES` (config central, Sprint 1 de configuración — ver `E5-S4-T09`, compartida). 2) Detectar y eliminar BOM UTF-8; rechazar BOM UTF-16/32. 3) Verificar `encoding="UTF-8"` o ausencia de declaración. 4) Escanear el documento completo (no solo el inicio) buscando `<!DOCTYPE`/`<!ENTITY` — prevención XXE. 5) Verificar que el contenido comienza con `<` tras BOM/whitespace.
- **Criterio de aceptación:** cualquier fallo produce `XML_INVALID` vía Transacción C + `UnrecoverableError`, nunca un parseo con opciones inseguras.
- **Pruebas requeridas:** ver `E5-S3-T12`.
- **Riesgos:** un escaneo solo de los "primeros bytes" (en vez de todo el documento) dejaría pasar un `<!ENTITY` insertado más adelante en el archivo.
- **Evidencia de cierre:** diff del validador.
- **Gate asociado:** precondición de G-30 (indirecta, vía §5.4).
- **Estado inicial:** `BLOCKED`.

#### E5-S3-T04 — `XmlValidationService.validate()`

- **Objetivo:** controles estructurales tras el parseo — profundidad, nodos, atributos.
- **Archivos/módulos probables:** `apps/api/src/modules/xml-processing/xml-validation.service.ts`.
- **Dependencias:** `E5-S3-T02`, `E5-S3-T03`.
- **Precondiciones:** `fast-xml-parser` instalado; pre-validaciones pasadas.
- **Acciones:** 1) Configurar `fast-xml-parser` con las opciones exactas de §5.2 (verificar contra la versión real instalada). 2) Rechazar XML no bien formado. 3) Rechazar profundidad `> XML_MAX_DEPTH`. 4) Rechazar número de nodos `> XML_MAX_NODE_COUNT`. 5) Rechazar número de atributos `> XML_MAX_ATTRIBUTE_COUNT`.
- **Criterio de aceptación:** cada control excedido produce `XML_INVALID` vía Transacción C + `UnrecoverableError` (§7 paso 8).
- **Pruebas requeridas:** ver `E5-S3-T12`.
- **Riesgos:** una configuración por defecto de `fast-xml-parser` puede procesar entidades externas si no se desactivan explícitamente — verificar contra la versión real, no asumir.
- **Evidencia de cierre:** diff del servicio + configuración documentada.
- **Gate asociado:** precondición de G-30.
- **Estado inicial:** `BLOCKED`.

#### E5-S3-T05 — `CfdiExtractorService` (`Cfdi40Extractor`)

- **Objetivo:** detectar la versión del CFDI y rechazar lo no soportado (AD-8: MVP es únicamente CFDI 4.0).
- **Archivos/módulos probables:** `apps/api/src/modules/xml-processing/cfdi-40-extractor.service.ts`.
- **Dependencias:** `E5-S3-T04`.
- **Precondiciones:** XML válido estructuralmente.
- **Acciones:** 1) Detectar versión declarada en el comprobante. 2) `3.3` u otra no soportada → `UNSUPPORTED_CFDI_VERSION` (Transacción C + `UnrecoverableError`). 3) No es un CFDI (estructura raíz incorrecta) → `CFDI_STRUCTURE_INVALID`.
- **Criterio de aceptación:** CFDI 3.3 nunca se extrae, siempre se rechaza (§17 fuera de alcance, ya reconfirmado).
- **Pruebas requeridas:** ver `E5-S3-T12`.
- **Riesgos:** ninguno adicional.
- **Evidencia de cierre:** diff del extractor.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S3-T06 — Extracción de encabezado, emisor, receptor, folio fiscal

- **Objetivo:** poblar los campos obligatorios del `ExtractedCfdiAggregate` (encabezado).
- **Archivos/módulos probables:** `cfdi-40-extractor.service.ts`.
- **Dependencias:** `E5-S3-T05`.
- **Precondiciones:** versión CFDI confirmada como 4.0.
- **Acciones:** 1) `folioFiscal` (Timbre Fiscal Digital, UUID de 36 caracteres). 2) `rfcEmisor`, `rfcReceptor`, `issuedAt`, `subtotal`, `total` (como `Decimal`, nunca `Float` — BR-GLB-004), `currency`, `tipoComprobante`.
- **Criterio de aceptación:** campo obligatorio ausente (`subtotal`/`currency`/`tipoComprobante`) → `CFDI_STRUCTURE_INVALID` (criterio ya verificado en §16.1).
- **Pruebas requeridas:** ver `E5-S3-T12`.
- **Riesgos:** usar `number`/`Float` para montos violaría BR-GLB-004 (riesgo de redondeo).
- **Evidencia de cierre:** diff del extractor.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S3-T07 — Extracción de conceptos con `position` contigua

- **Objetivo:** poblar `concepts[]` del agregado, garantizando `position` sin huecos ni duplicados.
- **Archivos/módulos probables:** `cfdi-40-extractor.service.ts`.
- **Dependencias:** `E5-S3-T06`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) Asignar `position` en el orden en que aparecen en el XML, `{1..n}` contiguo. 2) **Ningún** concepto se omite dejando huecos (criterio ya verificado en §16.2 — "ningún concepto se omite dejando huecos de position").
- **Criterio de aceptación:** el conjunto de `position` de los conceptos extraídos es siempre `{1,...,n}` exacto.
- **Pruebas requeridas:** ver `E5-S3-T12`.
- **Riesgos:** un concepto con campo obligatorio no determinable debe rechazarse completo (`CFDI_STRUCTURE_INVALID`), nunca omitirse silenciosamente.
- **Evidencia de cierre:** diff del extractor.
- **Gate asociado:** precondición de AD-10.1 (verificación de conteos).
- **Estado inicial:** `BLOCKED`.

#### E5-S3-T08 — Extracción de impuestos (comprobante y concepto)

- **Objetivo:** poblar `cfdiTaxes[]` (nivel comprobante, `conceptSlot=0`) y `taxes[]` de cada concepto (`conceptSlot=position` del concepto).
- **Archivos/módulos probables:** `cfdi-40-extractor.service.ts`.
- **Dependencias:** `E5-S3-T07`.
- **Precondiciones:** conceptos ya extraídos con `position` asignada.
- **Acciones:** 1) Impuestos de comprobante → `scope=CFDI`, `conceptSlot=0`. 2) Impuestos de cada concepto → `scope=CONCEPT`, `conceptSlot=` la `position` de ese concepto exacto (nunca un valor derivado de otra fuente — mismo agregado en memoria, invariante ya registrado en Addendum §18). 3) `position` de cada grupo de impuestos, `{1..m}` contigua dentro de su contenedor.
- **Criterio de aceptación:** `conceptSlot` de cada `CfdiTax` de concepto coincide siempre con la `position` del concepto que referencia — misma fuente en memoria, sin desincronización posible.
- **Pruebas requeridas:** ver `E5-S3-T12`.
- **Riesgos:** derivar `conceptSlot` de una fuente distinta al mismo objeto en memoria reintroduciría el riesgo residual ya documentado en AD-5 §4.5.2.
- **Evidencia de cierre:** diff del extractor.
- **Gate asociado:** precondición de G-28.
- **Estado inicial:** `BLOCKED`.

#### E5-S3-T09 — Campos obligatorios / ambiguos / fuera de MVP (§3.3)

- **Objetivo:** aplicar exactamente la clasificación de campos que Addendum §3.3 ya fija — nunca inferir un campo ambiguo (BR-XML-002).
- **Archivos/módulos probables:** `cfdi-40-extractor.service.ts`.
- **Dependencias:** `E5-S3-T06`, `E5-S3-T07`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) Revisar Addendum §3.3 para la lista exacta de campos incluidos/excluidos del MVP. 2) Todo campo no determinable con certeza → `ambiguousFields[]`, nunca un valor inferido.
- **Criterio de aceptación:** `ambiguousFields` refleja fielmente la incertidumbre real, sin inferencias silenciosas (BR-XML-002).
- **Pruebas requeridas:** ver `E5-S3-T12`.
- **Riesgos:** inferir un campo ambiguo violaría BR-XML-002 directamente.
- **Evidencia de cierre:** diff del extractor.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S3-T10 — Checksum SHA-256 sobre el Buffer

- **Objetivo:** calcular el checksum **antes** de normalizar o parsear, sobre el Buffer descargado de Storage (AD-6, §7 paso 6).
- **Archivos/módulos probables:** worker (Sprint 4) invoca esta utilidad; función pura en `xml-processing`.
- **Dependencias:** ninguna de este sprint (depende de que el worker tenga el Buffer, Sprint 4).
- **Precondiciones:** ninguna en este sprint — se implementa aquí como utilidad, se invoca desde Sprint 4.
- **Acciones:** 1) `crypto.createHash('sha256').update(buffer).digest('hex')` con `node:crypto`, sin dependencias adicionales. 2) Documentar que el resultado se persiste dentro de la Transacción A (Sprint 2), nunca fuera de ella.
- **Criterio de aceptación:** el checksum se calcula sobre los bytes descargados, nunca sobre datos ya normalizados/parseados.
- **Pruebas requeridas:** unitaria — verificar que el hash coincide con un valor conocido para un fixture.
- **Riesgos:** calcular el checksum después de normalizar (p. ej. tras quitar el BOM) rompería su valor como evidencia de los bytes originales.
- **Evidencia de cierre:** diff de la utilidad.
- **Gate asociado:** precondición de AD-10.1.1.
- **Estado inicial:** `BLOCKED`.

#### E5-S3-T11 — Clasificación de errores del parser

- **Objetivo:** distinguir errores recuperables (I/O, timeout) de permanentes (`XML_INVALID`, `UNSUPPORTED_CFDI_VERSION`, `CFDI_STRUCTURE_INVALID`, `UNSUPPORTED_FILE_TYPE`) — AD-11.
- **Archivos/módulos probables:** `xml-processing.module.ts` (contrato de errores expuesto al worker).
- **Dependencias:** `E5-S3-T03` a `E5-S3-T09`.
- **Precondiciones:** todos los validadores/extractores implementados.
- **Acciones:** 1) Todo error de contenido del documento → permanente (Transacción C + `UnrecoverableError`, ejecutada por el worker que invoca al parser, no por el parser mismo). 2) Ningún error de este sprint depende de Q-001 — un folio duplicado **no** se detecta aquí, se detecta en Sprint 5 al intentar persistir.
- **Criterio de aceptación:** el criterio de frontera de AD-11 se respeta: "un error es permanente solo si el contenido del documento lo hace imposible de procesar".
- **Pruebas requeridas:** ver `E5-S3-T12`.
- **Riesgos:** clasificar mal un error de infraestructura como permanente causaría rechazos fiscales falsos.
- **Evidencia de cierre:** tabla de clasificación de errores del módulo.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S3-T12 — Pruebas con fixtures

- **Objetivo:** cubrir con fixtures reales cada rama de validación y extracción.
- **Archivos/módulos probables:** `apps/api/src/modules/xml-processing/__fixtures__/`, specs junto a cada servicio.
- **Dependencias:** `E5-S3-T01` a `E5-S3-T11`.
- **Precondiciones:** todo el sprint implementado.
- **Acciones:** fixtures mínimos: 1) CFDI 4.0 válido completo. 2) CFDI 3.3 → `UNSUPPORTED_CFDI_VERSION`. 3) XML malformado → `XML_INVALID`. 4) Payload con `<!DOCTYPE`/`<!ENTITY` (XXE) → `XML_INVALID`, sin ejecutar la entidad. 5) Profundidad/nodos/atributos excedidos → `XML_INVALID`. 6) Concepto con campo obligatorio ausente → `CFDI_STRUCTURE_INVALID`. 7) Campos ambiguos → `ambiguousFields` poblado, sin inferencia. 8) Al menos 3 CFDI reales del SAT antes de declarar el sprint DONE (riesgo ya registrado en Addendum §18: "namespaces CFDI en edge cases").
- **Criterio de aceptación:** las 8 pruebas pasan; cobertura ≥ 80 %.
- **Pruebas requeridas:** las 8 descritas.
- **Riesgos:** sin fixtures reales del SAT, un edge case de namespace podría pasar desapercibido hasta producción.
- **Evidencia de cierre:** reporte de pruebas + lista de fixtures usados.
- **Gate asociado:** precondición de auditoría de Sprint 3.
- **Estado inicial:** `BLOCKED`.

> **Restricción de alcance de este sprint:** ninguna tarea de Sprint 3 implementa ni simula la resolución de folio fiscal duplicado. La detección de esa colisión ocurre exclusivamente al intentar persistir (Sprint 2/`E5-S2-T02`, arbitrada en Sprint 5), nunca durante el parseo o la validación estructural.

---

## 12. Sprint 4 — Worker BullMQ

> Bloqueado por Sprint 2 (`E5-S2-T10`) y Sprint 3 (`E5-S3-T12`) completos. Depende parcialmente de la configuración central (`E5-S4-T09`) antes de poder cerrar.

#### E5-S4-T01 — `StorageAdapter.getObject()`

- **Objetivo:** agregar el método que hoy falta en el contrato y en `S3StorageAdapter` (AD-1: el worker descarga directamente).
- **Archivos/módulos probables:** `apps/api/src/modules/storage/storage.interface.ts`, `s3-storage.adapter.ts`, `disabled-storage.adapter.ts`.
- **Dependencias:** ninguna de este sprint.
- **Precondiciones:** ninguna.
- **Acciones:** 1) `getObject(key: string): Promise<Buffer>` en la interfaz. 2) Implementación real en `S3StorageAdapter` (GET, no HEAD — a diferencia de `getMetadata`/`exists`). 3) Implementación en `DisabledStorageAdapter` (lanzar error claro si `STORAGE_ENABLED=false`).
- **Criterio de aceptación:** el worker puede obtener el `Buffer` completo del objeto sin pasar por una URL prefirmada.
- **Pruebas requeridas:** unitaria + integración contra MinIO real.
- **Riesgos:** ninguno significativo — es una extensión aditiva del contrato ya existente.
- **Evidencia de cierre:** diff de los tres archivos.
- **Gate asociado:** precondición de todo el resto de Sprint 4.
- **Estado inicial:** `BLOCKED`.

#### E5-S4-T02 — `XmlExtractionProcessor` (consumer BullMQ)

- **Objetivo:** crear el primer consumer real de la cola `xml-extraction` — hoy no existe ningún `@Processor`/`WorkerHost` en el repositorio.
- **Archivos/módulos probables:** `apps/api/src/modules/xml-processing/xml-extraction.processor.ts`.
- **Dependencias:** `E5-S3-T01`.
- **Precondiciones:** módulo scaffolded.
- **Acciones:** 1) `@Processor(XML_EXTRACTION_QUEUE_NAME)` extendiendo `WorkerHost` (`@nestjs/bullmq` 11.x). 2) Registrar en `XmlProcessingModule`, no en `JobsModule` (evita el ciclo de §8).
- **Criterio de aceptación:** el processor arranca y consume Jobs de la cola ya existente sin modificar `JobsModule`.
- **Pruebas requeridas:** integración.
- **Riesgos:** registrar el processor en el módulo equivocado reintroduce el ciclo de dependencias que §8 previene.
- **Evidencia de cierre:** diff del módulo + processor.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S4-T03 — Validación del payload del Job

- **Objetivo:** implementar §7 pasos 1–2 exactamente.
- **Archivos/módulos probables:** `xml-extraction.processor.ts`.
- **Dependencias:** `E5-S4-T02`, `E5-S2-T05` (`JobsRepository.findById`).
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) Consultar `Job` por `jobId` únicamente (nunca filtrar por `companyId` del payload en la consulta). 2) Si no existe → error permanente de integridad. 3) Comparar `payload.companyId` contra `Job.companyId` persistido; si difieren → error permanente de integridad de payload. 4) Si `Job` ya es `COMPLETED`/`FAILED` → retornar sin error. 5) Consultar `Document`; si no está en `PROCESSING` → retornar sin error (idempotencia).
- **Criterio de aceptación:** el worker nunca confía en `payload.companyId` sin verificarlo contra lo persistido.
- **Pruebas requeridas:** unitaria — cada rama de retorno temprano.
- **Riesgos:** confiar ciegamente en el payload abriría una vía de manipulación de tenant (ver Sprint 9).
- **Evidencia de cierre:** diff del processor.
- **Gate asociado:** precondición de G-12.
- **Estado inicial:** `BLOCKED`.

#### E5-S4-T04 — Flujo completo del worker (§7 pasos 3–9)

- **Objetivo:** implementar `fileType`, `markAsProcessing`, descarga, checksum, pre-validación, validación XML, extracción — en el orden exacto de §7.
- **Archivos/módulos probables:** `xml-extraction.processor.ts`.
- **Dependencias:** `E5-S4-T01`, `E5-S4-T03`, todos los servicios de Sprint 3.
- **Precondiciones:** parser completo; `getObject()` disponible.
- **Acciones:** seguir §7 pasos 3 a 9 literalmente, sin reordenar ni omitir ninguno.
- **Criterio de aceptación:** cada paso produce exactamente la clasificación de error (recuperable/permanente) que §7 especifica.
- **Pruebas requeridas:** unitaria por paso + integración de extremo a extremo.
- **Riesgos:** reordenar pasos (p. ej. calcular checksum después de normalizar) invalidaría AD-6/AD-10.1.1.
- **Evidencia de cierre:** diff del processor.
- **Gate asociado:** precondición de Sprint 5.
- **Estado inicial:** `BLOCKED`.

#### E5-S4-T05 — PROHIBICIÓN EXPLÍCITA: nunca reutilizar un `Cfdi` existente

- **Objetivo:** dejar constancia, como tarea propia y verificable, de que el worker jamás implementa una rama de reutilización — es la instrucción explícita del encargo y el punto exacto de la última auditoría de Codex.
- **Archivos/módulos probables:** `xml-extraction.processor.ts`, `CfdiRepository.create()` (Sprint 2).
- **Dependencias:** `E5-S2-T02`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) Revisión de código dedicada: confirmar que ningún camino del worker llama a `cfdi.upsert()` ni contiene una rama "si existe, usarlo". 2) Confirmar que el único resultado posible al hallar un `Cfdi` preexistente con `Document` en `PROCESSING` es `ViolacionDeInvarianteError` + rollback total. 3) Agregar una prueba centinela que falle si alguien reintroduce `upsert({update:{}})` sobre `Cfdi` en cualquier punto del worker.
- **Criterio de aceptación:** cero instrucciones activas de "recuperar"/"reutilizar" un `Cfdi` en todo el código del worker (mismo criterio que la auditoría documental ya aplicó al Addendum).
- **Pruebas requeridas:** la prueba centinela descrita.
- **Riesgos:** este es el riesgo que motivó tres rondas de auditoría — máxima prioridad de revisión antes de cualquier merge.
- **Evidencia de cierre:** prueba centinela en verde + nota de revisión de código.
- **Gate asociado:** G-24.
- **Estado inicial:** `BLOCKED`.

#### E5-S4-T06 — `create()` de `Cfdi` dentro de la Transacción A

- **Objetivo:** invocar `E5-S2-T02` desde el worker, dentro del mismo `$transaction`.
- **Archivos/módulos probables:** `xml-extraction.processor.ts`.
- **Dependencias:** `E5-S4-T05`, `E5-S2-T06`.
- **Precondiciones:** orquestador de Sprint 2 disponible.
- **Acciones:** invocar el orquestador de `E5-S2-T06` con el `ExtractedCfdiAggregate` de Sprint 3.
- **Criterio de aceptación:** el worker nunca abre su propia transacción distinta a la del orquestador — reutiliza exactamente la función de Sprint 2.
- **Pruebas requeridas:** integración.
- **Riesgos:** duplicar lógica de transacción en el worker en vez de reutilizar el orquestador introduciría divergencia entre ambos.
- **Evidencia de cierre:** diff del processor mostrando la invocación directa.
- **Gate asociado:** G-01 a G-05.
- **Estado inicial:** `BLOCKED`.

#### E5-S4-T07 — Transición terminal `Document`: `count === 1`

- **Objetivo:** confirmar que el worker respeta el `count === 1` de `E5-S2-T04` sin bypasearlo.
- **Archivos/módulos probables:** ya cubierto por la invocación de `E5-S4-T06` — esta tarea es de verificación, no de nueva implementación.
- **Dependencias:** `E5-S4-T06`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** revisión de que el worker no tiene ninguna ruta alternativa que actualice `Document.status` fuera del orquestador de Sprint 2.
- **Criterio de aceptación:** criterio 58 verificado también en el contexto del worker real, no solo en el repositorio aislado.
- **Pruebas requeridas:** integración — gate G-06.
- **Riesgos:** ninguno adicional si `E5-S4-T06` se implementó correctamente.
- **Evidencia de cierre:** prueba de integración en verde.
- **Gate asociado:** G-06.
- **Estado inicial:** `BLOCKED`.

#### E5-S4-T08 — Cierre de `Job`: `count === 1`

- **Objetivo:** mismo tipo de verificación que `E5-S4-T07`, para el cierre del `Job`.
- **Archivos/módulos probables:** verificación, no nueva implementación.
- **Dependencias:** `E5-S4-T06`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** confirmar que el worker no cierra el `Job` por ninguna vía distinta a `E5-S2-T05` dentro de la misma transacción.
- **Criterio de aceptación:** criterio 64/65 verificado en el contexto real del worker.
- **Pruebas requeridas:** integración — gate G-07.
- **Riesgos:** ninguno adicional.
- **Evidencia de cierre:** prueba de integración en verde.
- **Gate asociado:** G-07.
- **Estado inicial:** `BLOCKED`.

#### E5-S4-T09 — Configuración central BullMQ/XML (14 variables)

- **Objetivo:** implementar las 14 variables de Addendum §10.3 en `@contaia/validation`/`@contaia/config`, siguiendo el patrón ya existente (`sharedEnvSchema`, `serverEnvSchema`, etc., compuestos con `.merge()` en `packages/config/src/server.ts`).
- **Archivos/módulos probables:** nuevo `jobsEnvSchema`/`xmlEnvSchema` en `packages/validation/`, merge en `packages/config/src/server.ts`, actualización de `.env.example`.
- **Dependencias:** ninguna de este sprint.
- **Precondiciones:** ninguna.
- **Acciones:** 1) Las 14 variables exactas: `XML_MAX_FILE_SIZE_BYTES`, `XML_MAX_DEPTH`, `XML_MAX_NODE_COUNT`, `XML_MAX_ATTRIBUTE_COUNT`, `JOBS_RECONCILIATION_ENABLED`, `JOBS_RECONCILIATION_INTERVAL_MS`, `JOBS_STALE_QUEUED_MS`, `JOBS_STALE_PROCESSING_MS`, `JOBS_ATTEMPTS`, `JOBS_BACKOFF_DELAY_MS`, `JOBS_REMOVE_ON_COMPLETE_COUNT`, `JOBS_REMOVE_ON_COMPLETE_AGE_SECONDS`, `JOBS_REMOVE_ON_FAIL_COUNT`, `JOBS_REMOVE_ON_FAIL_AGE_SECONDS`, con tipos/defaults/rangos exactos de la tabla de Addendum §10.3. 2) Decisión de fallo: valor fuera de rango → fallo de arranque (fail-fast); ausente → default MVP. 3) **Eliminar** las constantes `ATTEMPTS=3`/`BACKOFF_DELAY_MS=1000` hoy hardcodeadas en `BullMqJobsQueueAdapter` — deben leerse de la config central, no coexistir con ella (nota explícita de Addendum §10.3).
- **Criterio de aceptación:** ningún consumidor (productor, worker, reconciliador) declara un default local propio; `JOBS_ATTEMPTS=0` hace fallar el arranque (criterio de prueba ya especificado en §16.2).
- **Pruebas requeridas:** unitaria de validación de rangos + prueba de arranque con valor inválido.
- **Riesgos:** dejar las constantes hardcodeadas coexistiendo con la config central crearía dos fuentes de verdad divergentes.
- **Evidencia de cierre:** diff de `packages/validation/`, `packages/config/`, `.env.example`, y `bullmq-jobs-queue.adapter.ts` (constantes eliminadas).
- **Gate asociado:** precondición de AD-12 (retención de BullMQ).
- **Estado inicial:** `BLOCKED`.

#### E5-S4-T10 — Handler `@OnWorkerEvent('failed')`

- **Objetivo:** implementar la clasificación terminal/no-terminal de AD-4.2.
- **Archivos/módulos probables:** `xml-extraction.processor.ts`.
- **Dependencias:** `E5-S4-T02`, `E5-S4-T09`.
- **Precondiciones:** config central disponible (`JOBS_ATTEMPTS`).
- **Acciones:** 1) `esTerminal = (error instanceof UnrecoverableError) OR (job.attemptsMade >= (job.opts.attempts ?? 1))`. 2) No terminal → solo log (WARN), sin tocar `Document`/`Job`. 3) Terminal → Transacción C condicional (`WHERE Document.status='PROCESSING'`), `rejectionReason='PROCESSING_FAILED'` — **sujeto a `E5-S4-T11`**.
- **Criterio de aceptación:** el handler se dispara en cada intento fallido (no solo al agotarse), y solo actúa sobre estado persistido en su invocación terminal.
- **Pruebas requeridas:** prueba dedicada que fija la semántica real de `job.attemptsMade` en la versión instalada de BullMQ (ya exigida por AD-4.2/§16.1) — alternativa documentada `job.isFailed()` si la comparación no resulta fiable.
- **Riesgos:** una semántica distinta a la esperada en `bullmq@5.81.x` invalidaría la clasificación terminal — riesgo ya registrado en Addendum §18.
- **Evidencia de cierre:** diff del handler + prueba de semántica.
- **Gate asociado:** G-04.
- **Estado inicial:** `BLOCKED`.

#### E5-S4-T11 — Salvaguarda Q-001 en el handler terminal

- **Objetivo:** implementar §10.2.3 exactamente — impedir que el agotamiento de intentos convierta una colisión de folio pendiente en `REJECTED (PROCESSING_FAILED)`.
- **Archivos/módulos probables:** `xml-extraction.processor.ts` (handler terminal de `E5-S4-T10`).
- **Dependencias:** `E5-S4-T10`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) Antes de ejecutar la Transacción C con `PROCESSING_FAILED`, consultar `findUnique Cfdi WHERE companyId_folioFiscal` con `documentId` distinto al propio. 2) Si existe → **no** ejecutar la Transacción C; `Document` permanece `PROCESSING`; `Job = FAILED`; incidente `PENDIENTE_Q001_FOLIO_DUPLICADO` + métrica. 3) Si no existe → agotamiento genuino, proceder como en `E5-S4-T10`.
- **Criterio de aceptación:** ningún camino —incluido el agotamiento de intentos— produce `REJECTED` automático por folio duplicado mientras Q-001 siga abierta (criterio 76, gate G-16).
- **Pruebas requeridas:** gate G-16 — colisión provocada deliberadamente en el último intento.
- **Riesgos:** omitir esta salvaguarda reintroduciría exactamente el hallazgo que la auditoría de Codex marcó como bloqueante ("el agotamiento no puede rechazar por la puerta de atrás").
- **Evidencia de cierre:** diff del handler + gate G-16 en verde.
- **Gate asociado:** G-16.
- **Estado inicial:** `BLOCKED`.

#### E5-S4-T12 — Ausencia deliberada de locks adicionales

- **Objetivo:** documentar y verificar que el worker no introduce ningún mecanismo de lock (advisory lock, `SELECT FOR UPDATE`, Redis lock) — la exclusión la da exclusivamente `create()` + la restricción única de PostgreSQL (D-007, Alternativas D/F rechazadas).
- **Archivos/módulos probables:** revisión de todo `xml-extraction.processor.ts` y los repositorios de Sprint 2.
- **Dependencias:** `E5-S4-T06`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** confirmar ausencia de `$queryRaw` con `FOR UPDATE`, ausencia de `pg_advisory_lock`, ausencia de cualquier lock distribuido vía Redis.
- **Criterio de aceptación:** cero SQL crudo como mecanismo de exclusión (D-007, precisión sobre "sin SQL crudo").
- **Pruebas requeridas:** revisión de código.
- **Riesgos:** introducir un lock adicional "por seguridad" contradiría la decisión ya tomada y añadiría un mecanismo de fallo no auditado.
- **Evidencia de cierre:** nota de revisión.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S4-T13 — Correlación mínima en el worker

- **Objetivo:** dejar los campos de correlación (`jobId`, `documentId`, `companyId`) disponibles en cada log del worker (el detalle completo es Sprint 8).
- **Archivos/módulos probables:** `xml-extraction.processor.ts`.
- **Dependencias:** `E5-S4-T04`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** exponer los tres identificadores en cada punto de log ya insertado en `E5-S2-T09`.
- **Criterio de aceptación:** todo log del worker es correlacionable sin ambigüedad.
- **Pruebas requeridas:** ninguna en este sprint.
- **Riesgos:** ninguno.
- **Evidencia de cierre:** diff del processor.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S4-T14 — Pruebas unitarias del worker

- **Objetivo:** cubrir cada rama de §7 con mocks (Prisma, Storage, cola).
- **Archivos/módulos probables:** `xml-extraction.processor.spec.ts`.
- **Dependencias:** `E5-S4-T01` a `E5-S4-T13`.
- **Precondiciones:** todo el sprint implementado.
- **Acciones:** cubrir cada rama de retorno temprano, cada tipo de error permanente/recuperable, la guarda de invariante de `E5-S4-T05`, y la salvaguarda de `E5-S4-T11`.
- **Criterio de aceptación:** cobertura ≥ 80 %.
- **Pruebas requeridas:** las descritas.
- **Riesgos:** ninguno adicional.
- **Evidencia de cierre:** reporte de cobertura.
- **Gate asociado:** precondición de auditoría de Sprint 4.
- **Estado inicial:** `BLOCKED`.

#### E5-S4-T15 — Pruebas de integración del worker

- **Objetivo:** ejecutar el flujo completo contra PostgreSQL, Redis y MinIO reales, en contenedor Linux (mismo patrón que EWO-004: contenedor efímero `node:22-bookworm-slim` si el proxy TCP de Docker Desktop en Windows lo bloquea).
- **Archivos/módulos probables:** `apps/api/test/xml-extraction.e2e-spec.ts`.
- **Dependencias:** `E5-S4-T14`.
- **Precondiciones:** infraestructura Docker disponible y verificada (`E5-S0-T08`, `E5-S0-T09`).
- **Acciones:** flujo completo: carga → confirm-upload → Job encolado → worker procesa → `Document=PROCESSED`/`REJECTED` → `Job=COMPLETED`/`FAILED`.
- **Criterio de aceptación:** el flujo de extremo a extremo pasa contra infraestructura real, no mocks.
- **Pruebas requeridas:** la descrita, más los gates de concurrencia que dependen de dos workers reales (Sprint 5/`E5-S5-T09`).
- **Riesgos:** mismo riesgo de proxy Docker Desktop ya documentado en EWO-002/003/004.
- **Evidencia de cierre:** log de la suite de integración en verde.
- **Gate asociado:** G-01 a G-05, G-26, G-27.
- **Estado inicial:** `BLOCKED`.

---

## 13. Sprint 5 — Clasificación A–G

> Bloqueado por Sprint 4 completo. Implementa exactamente AD-10.2 (`catch` externo, tras el rollback de la Transacción A). El orden de evaluación es **D → C → A → B → E → F → G**, nunca otro — invertirlo puede clasificar una convergencia como conflicto fiscal o promover un documento ya rechazado (razón documentada en AD-10.2).

#### E5-S5-T00 — Guarda de invariante previa (dentro de la transacción)

- **Objetivo:** confirmar que la guarda de `E5-S2-T02`/`E5-S4-T05` (Cfdi existente + Document PROCESSING dentro de la tx) está correctamente conectada al arbitraje posterior — no es uno de los casos A–G, ocurre **antes** y siempre aborta.
- **Archivos/módulos probables:** verificación de integración entre `cfdi.repository.ts` y el `catch` externo del worker.
- **Dependencias:** `E5-S4-T15`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** confirmar que `ViolacionDeInvarianteError` lanzada dentro de la transacción se captura en el `catch` externo con su propio manejo — incidente + escalado, **sin** pasar por la clasificación A–G (que es exclusiva de `P2002`/`TransicionNoConfirmadaError`).
- **Criterio de aceptación:** criterio 24 del Addendum (violación de invariante nunca se resuelve heurísticamente).
- **Pruebas requeridas:** gate G-24.
- **Riesgos:** confundir esta guarda con el CASO B (que sí pertenece a la clasificación post-rollback) mezclaría dos mecanismos distintos.
- **Evidencia de cierre:** prueba de integración.
- **Gate asociado:** G-24.
- **Estado inicial:** `BLOCKED`.

#### E5-S5-T01 — Recolección de evidencia (PASO 0 de AD-10.2)

- **Objetivo:** implementar las cuatro consultas de evidencia que preceden a toda clasificación.
- **Archivos/módulos probables:** nuevo `apps/api/src/modules/cfdi/classify-rollback.ts`.
- **Dependencias:** `E5-S5-T00`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) `doc = findUnique Document WHERE {id, companyId}`. 2) `job = findUnique Job WHERE {id: jobId}` (comparar `job.companyId` después). 3) `own = findUnique Cfdi WHERE {documentId, companyId}`. 4) `dup = findUnique Cfdi WHERE {companyId, folioFiscal}`. Las cuatro **sobre el primario**, en una conexión nueva, nunca dentro de la transacción abortada.
- **Criterio de aceptación:** las cuatro consultas se ejecutan siempre, antes de cualquier rama de clasificación (criterio 66, 77).
- **Pruebas requeridas:** unitaria.
- **Riesgos:** consultar una réplica con retraso clasificaría erróneamente un CASO A como CASO E (advertencia ya documentada en AD-10.2).
- **Evidencia de cierre:** diff de `classify-rollback.ts`.
- **Gate asociado:** precondición de todos los casos A–G.
- **Estado inicial:** `BLOCKED`.

#### E5-S5-T02 — CASO D — `Document` ausente

- **Evidencia consultada:** `doc == null`.
- **Fuente de verdad:** PostgreSQL primario.
- **Estado de Document:** inexistente.
- **Estado de Job:** no evaluado (el `Document` ausente decide primero).
- **Existencia de Cfdi:** no evaluada.
- **Coincidencia de folio:** no evaluada.
- **Resultado permitido:** error permanente de integridad.
- **Escrituras permitidas:** ninguna.
- **Escrituras prohibidas:** cualquier intento de crear el `Document`, cualquier transición de estado.
- **Incidente:** ERROR.
- **Retry:** no — reintentar no hará aparecer el documento.
- **Escalamiento:** revisión manual de integridad de datos.
- **Prueba requerida:** gate G-14.
- **Archivos/módulos probables:** `classify-rollback.ts`.
- **Dependencias:** `E5-S5-T01`.
- **Estado inicial:** `BLOCKED`.

#### E5-S5-T03 — CASO C — `Document = REJECTED` (terminal preexistente)

- **Evidencia consultada:** `doc.status == 'REJECTED'`.
- **Fuente de verdad:** PostgreSQL primario.
- **Estado de Document:** `REJECTED`.
- **Estado de Job:** no relevante para la decisión.
- **Existencia de Cfdi:** no relevante.
- **Coincidencia de folio:** no relevante.
- **Resultado permitido:** terminar sin error — el resultado fiscal ya está decidido.
- **Escrituras permitidas:** ninguna.
- **Escrituras prohibidas:** promover a `PROCESSED` bajo ninguna circunstancia (§10.0 lo prohíbe sin excepción).
- **Incidente:** WARN (el worker estaba procesando un documento ya rechazado).
- **Retry:** no aplica.
- **Escalamiento:** ninguno — es un estado terminal correcto.
- **Prueba requerida:** verificar que CASO C se evalúa **antes** que CASO A en el orden de clasificación (para que un rechazo previo nunca se sobrescriba con un supuesto éxito).
- **Archivos/módulos probables:** `classify-rollback.ts`.
- **Dependencias:** `E5-S5-T02`.
- **Estado inicial:** `BLOCKED`.

#### E5-S5-T04 — CASO A — convergencia idempotente válida

- **Evidencia consultada:** `doc.status == 'PROCESSED'` **Y** `own != null` **Y** `own.documentId == documentId` **Y** `job != null` **Y** `job.status == 'COMPLETED'` **Y** `job.companyId == companyId`. Las seis condiciones, no un subconjunto.
- **Fuente de verdad:** PostgreSQL primario, las cuatro consultas de `E5-S5-T01`.
- **Estado de Document:** `PROCESSED`.
- **Estado de Job:** `COMPLETED`, mismo tenant.
- **Existencia de Cfdi:** propio, confirmado.
- **Coincidencia de folio:** no relevante para este caso.
- **Resultado permitido:** el Job **termina con éxito** — es la única convergencia idempotente válida del diseño.
- **Escrituras permitidas:** ninguna — el ganador ya dejó todo cerrado.
- **Escrituras prohibidas:** cualquier escritura (el CASO A por definición no escribe nada).
- **Incidente:** ninguno — no es un error.
- **Retry:** **no se consume** — el worker no relanza el error ni ejecuta Transacción C.
- **Escalamiento:** ninguno.
- **Prueba requerida:** gates G-01, G-02, G-04 (colisión en el último intento de BullMQ debe resolver en CASO A, nunca en rechazo).
- **Archivos/módulos probables:** `classify-rollback.ts`.
- **Dependencias:** `E5-S5-T03`.
- **Estado inicial:** `BLOCKED`.

#### E5-S5-T05 — CASO B — inconsistencia (agregado parcial / Job o tenant incompatible)

- **Evidencia consultada:** `doc.status == 'PROCESSED'` pero (`own == null` **o** `job == null` **o** `job.status` incompatible [`FAILED`/`CANCELLED`/`QUEUED`/`PROCESSING`] **o** `job.companyId != companyId`).
- **Fuente de verdad:** PostgreSQL primario.
- **Estado de Document:** `PROCESSED`.
- **Estado de Job:** ausente, o en un estado que no debería coexistir con `Document=PROCESSED`, o de otro tenant.
- **Existencia de Cfdi:** puede faltar — es exactamente lo que hace el caso inconsistente.
- **Coincidencia de folio:** no relevante.
- **Resultado permitido:** ninguno — no se declara éxito silencioso.
- **Escrituras permitidas:** ninguna.
- **Escrituras prohibidas:** promover, completar, o inventar el `Job`/`Cfdi` faltante.
- **Incidente:** ERROR — es una violación de invariante (§10.0.2) que requiere revisión manual.
- **Retry:** no aplica automáticamente — depende del diagnóstico.
- **Escalamiento:** reconciliación explícita / reprocesamiento controlado (nunca automático).
- **Prueba requerida:** gates G-08, G-09, G-10, G-11 (Job ausente/`FAILED`/`CANCELLED`/`COMPLETED` incompatible al cerrar), G-12 (tenant incompatible).
- **Archivos/módulos probables:** `classify-rollback.ts`.
- **Dependencias:** `E5-S5-T04`.
- **Estado inicial:** `BLOCKED`.

#### E5-S5-T06 — CASO E — carrera no demostrada

- **Evidencia consultada:** `doc.status == 'PROCESSING'` **Y** `own == null`.
- **Fuente de verdad:** PostgreSQL primario. Nota: bajo la semántica de bloqueo de PostgreSQL (restricción no diferible), si el `P2002` llegó al `catch`, el ganador **ya commiteó** — este caso no describe "el ganador aún no terminó", sino que ninguna de las evidencias conocidas demuestra qué ocurrió.
- **Estado de Document:** `PROCESSING` (sin confirmar).
- **Estado de Job:** no decide este caso.
- **Existencia de Cfdi:** ausente.
- **Coincidencia de folio:** no relevante para este caso.
- **Resultado permitido:** error recuperable.
- **Escrituras permitidas:** ninguna.
- **Escrituras prohibidas:** cualquier transición terminal.
- **Incidente:** registrado, para investigar la causa raíz (posible defecto de implementación, `companyId` inconsistente, u otra causa no prevista).
- **Retry:** sí — vía redelivery de BullMQ o reconciliación posterior según evidencia acumulada.
- **Escalamiento:** si se repite de forma persistente, revisión manual.
- **Prueba requerida:** ninguna prueba de "esperar al ganador" — la nota de AD-10.2 prohíbe explícitamente introducir backoff local para este caso.
- **Archivos/módulos probables:** `classify-rollback.ts`.
- **Dependencias:** `E5-S5-T05`.
- **Estado inicial:** `BLOCKED`.

#### E5-S5-T07 — CASO F — colisión de folio pendiente de Q-001

- **Evidencia consultada:** `dup != null` **Y** `dup.documentId != documentId`.
- **Fuente de verdad:** PostgreSQL primario, `@@unique([companyId, folioFiscal])`.
- **Estado de Document:** permanece `PROCESSING` — **nunca** se marca `REJECTED` mientras Q-001 esté abierta.
- **Estado de Job:** `FAILED` (el trabajo técnico terminó sin éxito), **nunca** vía `UnrecoverableError`.
- **Existencia de Cfdi:** existe uno **ajeno**, con el mismo folio y otro documento — confirmado por evidencia positiva.
- **Coincidencia de folio:** sí, con documento distinto — este es el caso que la define.
- **Resultado permitido:** error recuperable + incidente + métrica dedicada. **Ninguna resolución fiscal definitiva.**
- **Escrituras permitidas:** `Job = FAILED`; incidente con causa `PENDIENTE_Q001_FOLIO_DUPLICADO`.
- **Escrituras prohibidas:** `REJECTED`, `CFDI_DUPLICATE` terminal, `PROCESSING_FAILED`, `UnrecoverableError`, HTTP `409`.
- **Incidente:** con métrica dedicada para dimensionar el volumen afectado.
- **Retry:** clasificado como recuperable, pero la salvaguarda de `E5-S4-T11` impide que el agotamiento de intentos lo convierta en rechazo.
- **Escalamiento:** ninguno automático — la resolución depende de que Q-001 se apruebe.
- **Prueba requerida:** gates G-15, G-16.
- **Archivos/módulos probables:** `classify-rollback.ts`.
- **Dependencias:** `E5-S5-T06`.
- **Estado inicial:** `BLOCKED` — **adicionalmente marcado como dependiente de Q-001 para su cierre fiscal definitivo**; el comportamiento provisional (esta tarea) sí puede implementarse y cerrarse sin esperar a Q-001.

#### E5-S5-T08 — CASO G — ninguna evidencia conocida coincide

- **Evidencia consultada:** ninguna de las condiciones de los casos A–F se cumple.
- **Fuente de verdad:** PostgreSQL primario.
- **Estado de Document:** cualquiera no cubierto por los casos anteriores.
- **Estado de Job:** cualquiera no cubierto.
- **Existencia de Cfdi:** no coincide con ninguna hipótesis conocida.
- **Coincidencia de folio:** no aplica.
- **Resultado permitido:** error técnico recuperable.
- **Escrituras permitidas:** ninguna.
- **Escrituras prohibidas:** cualquier transición terminal; **nunca** inspeccionar `error.meta.target` para decidir esta rama (criterio 30, D-007).
- **Incidente:** ERROR — merece diagnóstico, ya que ninguna hipótesis conocida lo explica.
- **Retry:** sí, vía redelivery.
- **Escalamiento:** si se repite, revisión de si falta un caso nuevo en la clasificación.
- **Prueba requerida:** confirmar que este camino nunca lee `meta.target`.
- **Archivos/módulos probables:** `classify-rollback.ts`.
- **Dependencias:** `E5-S5-T07`.
- **Estado inicial:** `BLOCKED`.

#### E5-S5-T09 — Pruebas de concurrencia real (dos workers)

- **Objetivo:** ejercitar los siete casos con dos procesos worker reales, no con mocks — es la única forma de validar CASO A/E genuinamente.
- **Archivos/módulos probables:** `apps/api/test/cfdi-concurrency.e2e-spec.ts`.
- **Dependencias:** `E5-S5-T02` a `E5-S5-T08`, `E5-S4-T15`.
- **Precondiciones:** infraestructura completa (PostgreSQL, Redis, MinIO) disponible.
- **Acciones:** lanzar dos ejecuciones concurrentes del mismo `documentId`, y variantes forzadas para cada caso (folio de otro documento, `Document` ausente/`REJECTED`, `Job` en cada estado incompatible, tenant cruzado).
- **Criterio de aceptación:** gates G-01 a G-16 completos en verde.
- **Pruebas requeridas:** las 16 descritas en la tabla de gates (sección 19).
- **Riesgos:** una prueba de concurrencia mal aislada (sin `documentId` único por ejecución) produciría falsos positivos/negativos entre corridas.
- **Evidencia de cierre:** reporte de los 16 gates.
- **Gate asociado:** G-01 a G-16.
- **Estado inicial:** `BLOCKED`.

---

## 14. Sprint 6 — Reconciliación y recuperación operativa

> Bloqueado por Sprint 5 completo. El reconciliador es **únicamente diagnóstico** — ninguna tarea de este sprint puede escribir `PROCESSED` ni `COMPLETED` bajo ninguna circunstancia.

#### E5-S6-T01 — Reconciliador de arranque

- **Objetivo:** implementar `OnModuleInit` que re-encola Jobs `QUEUED` ausentes de la cola (§10.2, caso 1).
- **Archivos/módulos probables:** nuevo `apps/api/src/modules/xml-processing/reconciliation.service.ts`.
- **Dependencias:** `E5-S5-T09`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) En `OnModuleInit`, buscar `Job.status=QUEUED` ausentes de BullMQ (§10.1). 2) Re-encolar por `jobId` determinista — idempotente porque BullMQ ignora el encolado si el `jobId` ya existe. 3) Se admite omitir la confirmación en 2 ciclos aquí, por ser acción no destructiva.
- **Criterio de aceptación:** al reiniciar el proceso, ningún `Job QUEUED` legítimo queda huérfano.
- **Pruebas requeridas:** integración — Job `QUEUED` sin cola, reinicio simulado.
- **Riesgos:** ninguno significativo — re-encolar es seguro por diseño.
- **Evidencia de cierre:** diff del servicio + prueba en verde.
- **Gate asociado:** ninguno numerado directamente (cubre el caso 1 de §10.2).
- **Estado inicial:** `BLOCKED`.

#### E5-S6-T02 — Reconciliador periódico

- **Objetivo:** ejecutar la misma lógica de forma recurrente, según `JOBS_RECONCILIATION_INTERVAL_MS`.
- **Archivos/módulos probables:** `reconciliation.service.ts`.
- **Dependencias:** `E5-S6-T01`, `E5-S4-T09` (config central).
- **Precondiciones:** las 14 variables de configuración disponibles.
- **Acciones:** 1) Scheduler activado por `JOBS_RECONCILIATION_ENABLED`. 2) Intervalo exacto de `JOBS_RECONCILIATION_INTERVAL_MS`.
- **Criterio de aceptación:** el ciclo corre en el intervalo configurado, nunca hardcodeado.
- **Pruebas requeridas:** unitaria (scheduler) + integración.
- **Riesgos:** un intervalo mal calibrado frente a `JOBS_STALE_PROCESSING_MS` podría declarar atascado un Job en backoff legítimo (advertencia ya documentada en Addendum §10.3).
- **Evidencia de cierre:** diff del servicio.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S6-T03 — Determinación de presencia en BullMQ (§10.1)

- **Objetivo:** implementar las tres categorías — VIVO / TERMINAL RETENIDO / AUSENTE — y el contador de ciclos en memoria.
- **Archivos/módulos probables:** `reconciliation.service.ts`.
- **Dependencias:** `E5-S6-T01`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) VIVO: `waiting`, `waiting-children`, `delayed`, `prioritized`, `active` — no intervenir. 2) TERMINAL RETENIDO: `completed`, `failed` — leer y reconciliar **sin esperar** a `removeOnFail`/`removeOnComplete`. 3) AUSENTE: `getJob()===null` **y** `getJobState()==='unknown'`, confirmado en 2 ciclos consecutivos. 4) Contador de ciclos en memoria del proceso (mapa `jobId → nº de observaciones`), reiniciable de forma segura ante un reinicio (Addendum §10.1, ya documentado como seguro).
- **Criterio de aceptación:** ningún Job `VIVO` se trata como ausente; ningún terminal retenido se confunde con ausencia (criterios 73–75).
- **Pruebas requeridas:** gates G-17 a G-23.
- **Riesgos:** confundir terminal retenido con ausencia retrasaría innecesariamente la detección de un fallo ya conocido por BullMQ.
- **Evidencia de cierre:** diff del servicio.
- **Gate asociado:** G-17 a G-23.
- **Estado inicial:** `BLOCKED`.

#### E5-S6-T04 — Casos de la matriz que sí permiten escritura

- **Objetivo:** implementar los casos 1, 3, 9, 11, 12, 14 de la matriz §10.2 (PostgreSQL × Redis) — los que resultan en re-encolar o en `REJECTED (PROCESSING_FAILED)`, nunca en `PROCESSED`.
- **Archivos/módulos probables:** `reconciliation.service.ts`.
- **Dependencias:** `E5-S6-T03`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) `Job=QUEUED` ausente → re-encolar. 2) `Job=PROCESSING` ausente **sin** `Cfdi` → `Job=FAILED` + `Document=REJECTED(PROCESSING_FAILED)`, **con la misma salvaguarda Q-001 de `E5-S4-T11`** aplicada aquí también (§10.2.3 no es exclusiva del handler del worker). 3) `Job=FAILED` + `Document=PROCESSING` sin `Cfdi` → mismo tratamiento, misma salvaguarda. 4) `Document` terminal + Redis VIVO → divergencia, WARN, sin reescribir `Document`.
- **Criterio de aceptación:** cada escritura respeta §10.0 (nunca `REJECTED→PROCESSED`, nunca `PROCESSED→REJECTED`) y la salvaguarda de Q-001.
- **Pruebas requeridas:** integración por cada rama.
- **Riesgos:** omitir la salvaguarda Q-001 aquí reabriría el mismo hallazgo ya cerrado en el worker, por una vía distinta (la reconciliación en vez del handler).
- **Evidencia de cierre:** diff + pruebas.
- **Gate asociado:** ninguno numerado directamente además de los ya listados.
- **Estado inicial:** `BLOCKED`.

#### E5-S6-T05 — PROHIBICIÓN EXPLÍCITA: violaciones de invariante nunca se reparan solas

- **Objetivo:** implementar (como ausencia deliberada de código) los casos 4, 6, 7, 8, 10, 13, 15 de la matriz §10.2 — todos ellos violación de invariante, todos con el mismo tratamiento: cero escritura, incidente, escalado.
- **Archivos/módulos probables:** `reconciliation.service.ts`.
- **Dependencias:** `E5-S6-T04`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) `Cfdi` existe + `Document=PROCESSING` (con o sin Redis ausente/terminal) → incidente ERROR, **cero escritura**, nunca `PROCESSED`. 2) `Job=COMPLETED` + `Document=PROCESSING` → mismo tratamiento, desde el primer ciclo (no espera 3 ciclos, porque ambos estados son de PostgreSQL, sin ventana transitoria que descartar — §10.2.2). 3) `Document=PROCESSED` sin `Cfdi` → incidente, sin reversión. 4) `Job=COMPLETED`+`Document=REJECTED`, `Job=FAILED`+`Document=PROCESSED` → anomalías, sin escritura.
- **Criterio de aceptación:** ninguna prueba de este bloque puede esperar que el reconciliador produzca `PROCESSED`/`COMPLETED` en ningún escenario (criterio explícito del encargo).
- **Pruebas requeridas:** gates G-21, G-24, G-25.
- **Riesgos:** este es el segundo punto exacto (tras el worker) donde la corrupción silenciosa podría reintroducirse — máxima prioridad de auditoría.
- **Evidencia de cierre:** diff + prueba centinela que falla si el reconciliador escribe `PROCESSED` en cualquier escenario simulado.
- **Gate asociado:** G-21, G-24, G-25.
- **Estado inicial:** `BLOCKED`.

#### E5-S6-T06 — Métricas de incidentes y escalamiento

- **Objetivo:** exponer contadores para cada tipo de violación de invariante detectada.
- **Archivos/módulos probables:** `reconciliation.service.ts` + hooks de observabilidad (detalle en Sprint 8).
- **Dependencias:** `E5-S6-T05`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** contador por tipo de anomalía (violación de invariante, agotamiento genuino, folio pendiente de Q-001, divergencia `Document`/Redis).
- **Criterio de aceptación:** cada incidente es contable y distinguible por causa.
- **Pruebas requeridas:** unitaria.
- **Riesgos:** ninguno significativo.
- **Evidencia de cierre:** diff.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S6-T07 — Reprocesamiento controlado (re-encolar manual)

- **Objetivo:** definir cómo se dispara un reproceso manual ante una violación de invariante escalada — sin implementar un endpoint público nuevo si no hay decisión que lo respalde.
- **Archivos/módulos probables:** por definir.
- **Dependencias:** `E5-S6-T05`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** documentar el procedimiento operativo (probablemente un script o comando administrativo que re-encola el `Job` por `jobId`), sin exponerlo como endpoint público del Bloque E — el plan original ya excluye "replay manual de Jobs desde API" del alcance (§17 fuera de alcance).
- **Criterio de aceptación:** el procedimiento existe documentado; no se inventa un endpoint no aprobado.
- **Pruebas requeridas:** ninguna en este sprint si se mantiene como procedimiento operativo, no como código.
- **Riesgos:** exponer un endpoint de replay sin aprobación excedería el alcance ya fijado.
- **Evidencia de cierre:** nota de procedimiento.
- **Gate asociado:** ninguno.
- **Estado inicial:** `DEFERRED` — el plan original ya excluye esta capacidad del MVP; no se implementa código, solo se documenta el procedimiento manual.

#### E5-S6-T08 — Pruebas de reconciliación completas

- **Objetivo:** cubrir la matriz completa de 15 filas de §10.2 con pruebas de integración.
- **Archivos/módulos probables:** `apps/api/test/reconciliation.e2e-spec.ts`.
- **Dependencias:** `E5-S6-T01` a `E5-S6-T07`.
- **Precondiciones:** todo el sprint implementado.
- **Acciones:** una prueba por cada fila de la matriz PostgreSQL × Redis de §10.2, incluidos los 7 estados de Redis (`waiting`, `delayed`, `prioritized`, `active`, `completed`, `failed`, ausente).
- **Criterio de aceptación:** gates G-17 a G-25 completos en verde.
- **Pruebas requeridas:** las 15 filas de la matriz.
- **Riesgos:** ninguno adicional si los sprints anteriores están completos.
- **Evidencia de cierre:** reporte de la suite.
- **Gate asociado:** G-17 a G-25.
- **Estado inicial:** `BLOCKED`.

---

## 15. Sprint 7 — API

> Bloqueado por Sprint 2 (persistencia) y Sprint 1 (`cfdi.read` en seed). No requiere que Sprint 4/5/6 estén cerrados para los endpoints de **lectura** (API-0027/0028 leen `Cfdi` ya persistido, con independencia de cómo se llegó ahí), pero sí para declarar el sprint completo, dado que sin worker no hay datos reales que consultar en integración.

#### E5-S7-T01 — API-0026 `GET /documents/:documentId/download`

- **Objetivo:** implementar el endpoint de descarga ya especificado en AD-7 (scope confirmado del Bloque E).
- **Archivos/módulos probables:** `apps/api/src/modules/documents/documents.controller.ts` (extender), `document.read`.
- **Dependencias:** `E5-S4-T01` (`getObject()`, o `getPresignedDownloadUrl` si el diseño de AD-7 usa URL prefirmada — verificar contra AD-7 exacto antes de implementar).
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) Requiere `document.read`. 2) Restringido a `Document.status ∈ {PROCESSING, PROCESSED, REJECTED}` (no `PENDING_UPLOAD`, el archivo aún no existe).
- **Criterio de aceptación:** tenant-safe; roles correctos (`document.read`, no `cfdi.read`).
- **Pruebas requeridas:** contrato + tenant isolation.
- **Riesgos:** ninguno significativo.
- **Evidencia de cierre:** diff del controller + pruebas.
- **Gate asociado:** ninguno numerado directamente.
- **Estado inicial:** `BLOCKED`.

#### E5-S7-T02 — API-0027 `GET /documents/:documentId/cfdi`

- **Objetivo:** implementar el endpoint de datos CFDI extraídos, con la forma de respuesta exacta de Addendum §13.1 y el RBAC ya verificado.
- **Archivos/módulos probables:** nuevo `apps/api/src/modules/cfdi/cfdi.controller.ts`.
- **Dependencias:** `E5-S1-T08` (`cfdi.read` en seed), `E5-S2-T03` (hijos persistidos).
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) Requiere `cfdi.read` — permitido a `ADMINISTRADOR`, `CONTADOR`, `AUXILIAR`; rechazado (403) a `SUPERVISOR`, `AUDITOR`. 2) Forma de respuesta exacta de §13.1: encabezado + `concepts[]` (con `taxes[]` anidados) + `cfdiTaxes[]`, Decimales serializados como string, `concepts[]` ordenado por `position`, **`conceptSlot` nunca expuesto** (es un detalle interno de persistencia — el agrupamiento ya lo resuelve la anidación de la respuesta).
- **Criterio de aceptación:** roles correctos verificados; forma de respuesta byte-a-byte consistente con §13.1; ausencia total de `conceptSlot` en el JSON de salida.
- **Pruebas requeridas:** contrato (shape exacto), RBAC (permitidos/excluidos), tenant isolation.
- **Riesgos:** exponer `conceptSlot` filtraría un detalle de modelo de datos sin valor para el consumidor (ya decidido en §13.1).
- **Evidencia de cierre:** diff del controller + pruebas de contrato.
- **Gate asociado:** ninguno numerado directamente — cierra los criterios de RBAC de §12.
- **Estado inicial:** `BLOCKED`.

#### E5-S7-T03 — API-0028 `GET /companies/:companyId/cfdi`

- **Objetivo:** listado de CFDI por Empresa.
- **Archivos/módulos probables:** `cfdi.controller.ts`.
- **Dependencias:** `E5-S7-T02`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** mismo RBAC (`cfdi.read`) que API-0027; paginación consistente con el patrón ya usado en `DocumentsController.findManyByCompany`.
- **Criterio de aceptación:** mismo RBAC verificado; tenant-safe.
- **Pruebas requeridas:** contrato, RBAC, tenant isolation, paginación.
- **Riesgos:** ninguno significativo.
- **Evidencia de cierre:** diff + pruebas.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S7-T04 — API-0055 `GET /jobs/:jobId`

- **Objetivo:** consulta de estado de Job, tenant-safe.
- **Archivos/módulos probables:** nuevo `apps/api/src/modules/jobs/jobs.controller.ts` (hoy `JobsModule` no expone ningún controller).
- **Dependencias:** `E5-S2-T05` (`JobsRepository.findById`).
- **Precondiciones:** ninguna adicional.
- **Acciones:** forma de respuesta con `result` según AD-2 cuando `status=COMPLETED`; `null` en cualquier otro estado.
- **Criterio de aceptación:** `result` nunca parcial; tenant-safe.
- **Pruebas requeridas:** contrato + tenant isolation.
- **Riesgos:** ninguno significativo.
- **Evidencia de cierre:** diff + pruebas.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S7-T05 — Registro de `CfdiModule` en `AppModule`

- **Objetivo:** conectar el módulo nuevo sin introducir ciclos (Addendum §8).
- **Archivos/módulos probables:** `apps/api/src/app.module.ts`, `cfdi.module.ts`.
- **Dependencias:** `E5-S7-T02`, `E5-S7-T03`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** registrar `CfdiModule` y `XmlProcessingModule` en `AppModule`; confirmar ausencia de ciclos con `DocumentsModule`/`JobsModule`.
- **Criterio de aceptación:** `nest build` sin advertencias.
- **Pruebas requeridas:** ninguna directa.
- **Riesgos:** un registro incorrecto rompería el arranque completo del backend.
- **Evidencia de cierre:** diff de `app.module.ts`.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S7-T06 — Reutilización de guards existentes

- **Objetivo:** confirmar que `CompanyGuard`/`PermissionGuard`/`AuthenticationGuard` ya existentes cubren los 4 endpoints nuevos sin lógica condicional nueva basada en roles.
- **Archivos/módulos probables:** los cuatro controllers de este sprint.
- **Dependencias:** `E5-S7-T01` a `E5-S7-T04`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** aplicar los guards y decoradores ya existentes (`@Company()`, `@RequirePermission('cfdi.read')` o equivalente), sin crear ningún guard nuevo.
- **Criterio de aceptación:** ningún endpoint nuevo introduce lógica de autorización ad-hoc.
- **Pruebas requeridas:** las de RBAC ya cubiertas en cada endpoint.
- **Riesgos:** un guard ad-hoc divergería del patrón ya auditado en EWO-002/003/004.
- **Evidencia de cierre:** diff mostrando reutilización, no invención.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S7-T07 — Validación de tenant isolation por endpoint

- **Objetivo:** confirmar los 7 pasos de aislamiento multiempresa de `docs/11_SECURITY_ARCHITECTURE.md` §11 en cada uno de los 4 endpoints.
- **Archivos/módulos probables:** los cuatro controllers.
- **Dependencias:** `E5-S7-T06`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** revisión explícita del checklist de 7 pasos por endpoint (autenticación, Membresía, `companyId` explícito y consistente, etc.).
- **Criterio de aceptación:** los 4 endpoints pasan el checklist de 7 pasos sin excepción.
- **Pruebas requeridas:** intento de acceso cruzado entre Empresas (403/404 tenant-safe).
- **Riesgos:** un endpoint sin el `companyId` explícito sería una fuga de datos.
- **Evidencia de cierre:** checklist por endpoint + pruebas.
- **Gate asociado:** ninguno directo — precondición de Sprint 9.
- **Estado inicial:** `BLOCKED`.

#### E5-S7-T08 — Manejo de errores HTTP — sin `409` para Q-001

- **Objetivo:** confirmar que ningún endpoint nuevo introduce un `409` como resolución del folio duplicado — esa decisión sigue pendiente de Q-001 y ocurre en el worker, no en la API síncrona.
- **Archivos/módulos probables:** los cuatro controllers, manejo de excepciones.
- **Dependencias:** `E5-S7-T01` a `E5-S7-T04`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** 1) 404 tenant-safe sin exponer detalle técnico (BR-ERR-002). 2) Ningún handler de error mapea "folio duplicado" a `409` — ese caso ni siquiera es observable desde estos 4 endpoints de solo lectura.
- **Criterio de aceptación:** cero apariciones de `409` ligadas a folio duplicado en el código de este sprint.
- **Pruebas requeridas:** revisión de código + prueba negativa.
- **Riesgos:** reintroducir el `409` aquí repetiría el hallazgo ya cerrado en `docs/08_API_DESIGN.md`/`docs/15_UX_FLOWS.md`.
- **Evidencia de cierre:** revisión de código documentada.
- **Gate asociado:** ninguno numerado — cierra el criterio transversal de Q-001.
- **Estado inicial:** `BLOCKED`.

#### E5-S7-T09 — Actualizar OpenAPI/Swagger

- **Objetivo:** documentar los 4 endpoints nuevos en el esquema OpenAPI si el proyecto lo mantiene (`@nestjs/swagger` ya es dependencia de `apps/api`, verificado en `package.json`).
- **Archivos/módulos probables:** decoradores `@ApiOperation`/`@ApiResponse` en los 4 controllers.
- **Dependencias:** `E5-S7-T01` a `E5-S7-T04`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** documentar forma de respuesta, códigos de estado, roles requeridos.
- **Criterio de aceptación:** los 4 endpoints aparecen en el esquema generado.
- **Pruebas requeridas:** ninguna directa (verificación visual del esquema generado).
- **Riesgos:** ninguno significativo.
- **Evidencia de cierre:** esquema OpenAPI actualizado.
- **Gate asociado:** ninguno.
- **Estado inicial:** `BLOCKED`.

#### E5-S7-T10 — Pruebas de contrato

- **Objetivo:** verificar la forma exacta de cada respuesta contra lo documentado en §13.1/§13.2 y el RBAC de §12.
- **Archivos/módulos probables:** `apps/api/test/cfdi-api.e2e-spec.ts`, `jobs-api.e2e-spec.ts`.
- **Dependencias:** `E5-S7-T01` a `E5-S7-T09`.
- **Precondiciones:** todo el sprint implementado.
- **Acciones:** snapshot de la forma de respuesta; pruebas de RBAC exhaustivas por rol (6 roles × 4 endpoints).
- **Criterio de aceptación:** cobertura completa de la matriz rol × endpoint.
- **Pruebas requeridas:** las descritas.
- **Riesgos:** ninguno adicional.
- **Evidencia de cierre:** reporte de la suite.
- **Gate asociado:** ninguno numerado — cierra Sprint 7.
- **Estado inicial:** `BLOCKED`.

---

## 16. Sprint 8 — Observabilidad

> Bloqueado por Sprint 4 (worker) y Sprint 6 (reconciliador) — la observabilidad instrumenta código que debe existir primero.

#### E5-S8-T01 — Logs estructurados con correlación completa

- **Objetivo:** consolidar los puntos de log de `E5-S2-T09`/`E5-S4-T13` en un formato estructurado uniforme.
- **Archivos/módulos probables:** worker, reconciliador, orquestador de persistencia.
- **Dependencias:** `E5-S4-T15`, `E5-S6-T08`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** cada log incluye `correlationId`, `documentId`, `jobId`, `companyId` — nunca contenido fiscal (RFC completo, montos, folio fiscal) en logs de error genéricos (BR-SEC-003/BR-ERR-002).
- **Criterio de aceptación:** ningún log expone datos fiscales sensibles en claro.
- **Pruebas requeridas:** revisión de logs generados en pruebas de integración.
- **Riesgos:** un log con el XML completo o el folio fiscal en texto plano violaría BR-ERR-002.
- **Evidencia de cierre:** ejemplo de log estructurado + revisión.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S8-T02 — Métrica de incidentes de violación de invariante

- **Objetivo:** contador dedicado para el hallazgo más crítico del diseño — cualquier ocurrencia merece visibilidad inmediata.
- **Archivos/módulos probables:** `classify-rollback.ts`, `reconciliation.service.ts`.
- **Dependencias:** `E5-S5-T09`, `E5-S6-T05`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** contador `cfdi_invariant_violation_total`, con etiqueta de origen (worker vs. reconciliador).
- **Criterio de aceptación:** cualquier violación de invariante incrementa la métrica, sin excepción.
- **Pruebas requeridas:** unitaria.
- **Riesgos:** sin esta métrica, una violación de invariante recurrente pasaría desapercibida en producción.
- **Evidencia de cierre:** diff + prueba.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S8-T03 — Métrica de colisión de folio pendiente Q-001

- **Objetivo:** la métrica dedicada que §10.2.3 y AD-10.2 CASO F exigen explícitamente.
- **Archivos/módulos probables:** `classify-rollback.ts`.
- **Dependencias:** `E5-S5-T07`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** contador `cfdi_folio_duplicate_pending_q001_total`, con `companyId` como etiqueta (para dimensionar el volumen por Empresa, sin exponer el folio en la métrica).
- **Criterio de aceptación:** permite dimensionar el volumen afectado por la ausencia de resolución de Q-001, sin filtrar datos fiscales en el sistema de métricas.
- **Pruebas requeridas:** unitaria.
- **Riesgos:** sin esta métrica, sería imposible argumentar ante el responsable de producto la urgencia de resolver Q-001.
- **Evidencia de cierre:** diff + prueba.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S8-T04 — Métricas de retry/backoff

- **Objetivo:** contadores de intentos, agotamiento, y distribución de causas de fallo recuperable.
- **Archivos/módulos probables:** `xml-extraction.processor.ts`.
- **Dependencias:** `E5-S4-T10`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** contador por causa de error recuperable (I/O, timeout, carrera no demostrada, etc.).
- **Criterio de aceptación:** permite distinguir la causa dominante de reintentos.
- **Pruebas requeridas:** unitaria.
- **Riesgos:** ninguno significativo.
- **Evidencia de cierre:** diff.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S8-T05 — Métricas de clasificación A–G

- **Objetivo:** contador por caso (A a G) de la clasificación posterior al rollback.
- **Archivos/módulos probables:** `classify-rollback.ts`.
- **Dependencias:** `E5-S5-T09`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** un contador por caso, para monitorear la frecuencia real de carreras (CASO A) frente a anomalías (CASO B/G).
- **Criterio de aceptación:** los siete casos son observables independientemente.
- **Pruebas requeridas:** unitaria.
- **Riesgos:** ninguno significativo.
- **Evidencia de cierre:** diff.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S8-T06 — Redacción de datos sensibles en logs

- **Objetivo:** confirmar formalmente que ningún log/incidente expone el XML crudo, el folio fiscal completo, o montos sin redactar.
- **Archivos/módulos probables:** todos los puntos de log de este Bloque.
- **Dependencias:** `E5-S8-T01`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** revisión de redacción — usar identificadores internos (`Cfdi.id`) en vez de `folioFiscal` cuando el log no lo requiera explícitamente para el diagnóstico.
- **Criterio de aceptación:** cero datos fiscales en claro en logs no diseñados para auditoría fiscal explícita.
- **Pruebas requeridas:** revisión + prueba negativa (grep de logs generados en pruebas).
- **Riesgos:** una fuga de folio fiscal en logs de aplicación sería un incidente de privacidad.
- **Evidencia de cierre:** checklist de redacción.
- **Gate asociado:** precondición de Sprint 9.
- **Estado inicial:** `BLOCKED`.

#### E5-S8-T07 — Retención de logs/incidentes

- **Objetivo:** definir la ventana de retención, alineada con la pregunta ya abierta en `docs/09_DATABASE_DESIGN.md` línea 327 ("ventana de retención corta, pendiente de definir en `docs/11_SECURITY_ARCHITECTURE.md`" para Job/ClaveDeIdempotencia).
- **Archivos/módulos probables:** configuración de logging/observabilidad (fuera del alcance de `schema.prisma`).
- **Dependencias:** ninguna de este sprint.
- **Precondiciones:** ninguna.
- **Acciones:** verificar si `docs/11_SECURITY_ARCHITECTURE.md` ya fijó esa ventana; si no, registrar como pregunta abierta adicional (no inventar un valor).
- **Criterio de aceptación:** o bien se referencia una decisión ya tomada, o se registra explícitamente como pendiente — nunca se inventa un número.
- **Pruebas requeridas:** ninguna.
- **Riesgos:** inventar una ventana de retención sin respaldo violaría la regla de no inventar decisiones.
- **Evidencia de cierre:** nota de estado (definido/pendiente).
- **Gate asociado:** ninguno.
- **Estado inicial:** `NOT_STARTED` — depende de una verificación puntual, no de código.

#### E5-S8-T08 — Dashboards y alertas

- **Objetivo:** exponer las métricas de este sprint en un dashboard, si existe infraestructura de observabilidad ya desplegada.
- **Archivos/módulos probables:** por definir — `docs/25_DEVOPS.md` es, según verificación previa de este mismo equipo, un marcador de estructura vacío sin contenido técnico.
- **Dependencias:** `E5-S8-T02` a `E5-S8-T05`.
- **Precondiciones:** infraestructura de dashboards (Prometheus/Grafana o equivalente) ya decidida en otro documento — no verificada como existente en este momento.
- **Acciones:** ninguna en este sprint, dado que no hay evidencia de infraestructura de dashboards en el repositorio.
- **Criterio de aceptación:** no aplica hasta que exista esa decisión de infraestructura.
- **Pruebas requeridas:** ninguna.
- **Riesgos:** ninguno — diferir es la opción correcta ante la ausencia de evidencia.
- **Evidencia de cierre:** nota de diferimiento.
- **Gate asociado:** ninguno.
- **Estado inicial:** `DEFERRED` — sin infraestructura de observabilidad visible en el repositorio (`docs/25_DEVOPS.md` es un marcador vacío).

---

## 17. Sprint 9 — Seguridad

> Bloqueado por Sprint 7 (API) y Sprint 3 (parser). Complementa, no repite, las pruebas negativas ya especificadas en `docs/11_SECURITY_ARCHITECTURE.md` §17 (procesamiento de CFDI).

#### E5-S9-T01 — Autorización exhaustiva

- **Objetivo:** confirmar que ningún endpoint del Bloque E carece de guard.
- **Archivos/módulos probables:** los 4 controllers de Sprint 7.
- **Dependencias:** `E5-S7-T10`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** auditoría de cada ruta — ningún endpoint público sin `@UseGuards`.
- **Criterio de aceptación:** 100 % de cobertura de guards.
- **Pruebas requeridas:** prueba negativa — petición sin sesión → 401.
- **Riesgos:** un endpoint sin guard sería acceso no autenticado a datos fiscales.
- **Evidencia de cierre:** checklist de guards.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S9-T02 — Tenant isolation — pruebas negativas

- **Objetivo:** ampliar `E5-S7-T07` con casos explícitos de intento de acceso cruzado (`docs/11_SECURITY_ARCHITECTURE.md` §24 lo exige para APIs nuevas).
- **Archivos/módulos probables:** pruebas de los 4 endpoints.
- **Dependencias:** `E5-S7-T07`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** Usuario de Empresa A intenta leer CFDI/Job de Empresa B → 404, no 403 (no revelar existencia).
- **Criterio de aceptación:** ningún endpoint filtra existencia de un recurso de otra Empresa.
- **Pruebas requeridas:** las descritas para los 4 endpoints.
- **Riesgos:** un 403 en vez de 404 filtraría metadatos de existencia entre Empresas.
- **Evidencia de cierre:** reporte de pruebas.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S9-T03 — Pruebas negativas XXE/DOCTYPE/ENTITY

- **Objetivo:** las pruebas de seguridad negativas que Addendum §5.4 exige.
- **Archivos/módulos probables:** `xml-processing` specs.
- **Dependencias:** `E5-S3-T12`.
- **Precondiciones:** ninguna adicional (ya cubierto parcialmente en Sprint 3; aquí se profundiza con casos de seguridad adicionales).
- **Acciones:** payloads con entidades externas, referencias a archivos locales, bombas de entidad (billion laughs) — todos deben rechazarse sin ejecutar la entidad.
- **Criterio de aceptación:** ninguna entidad externa se resuelve jamás.
- **Pruebas requeridas:** las descritas.
- **Riesgos:** una XXE no bloqueada permitiría lectura de archivos del servidor.
- **Evidencia de cierre:** reporte de pruebas.
- **Gate asociado:** G-30 (relacionado, vía ausencia de dependencia en `meta.target`, y control de parser en general).
- **Estado inicial:** `BLOCKED`.

#### E5-S9-T04 — Límites de tamaño — pruebas negativas

- **Objetivo:** confirmar rechazo antes de cargar el archivo completo en memoria si excede `XML_MAX_FILE_SIZE_BYTES`.
- **Archivos/módulos probables:** `xml-pre-validation.ts`.
- **Dependencias:** `E5-S3-T03`, `E5-S4-T09`.
- **Precondiciones:** config central disponible.
- **Acciones:** archivo justo por encima y por debajo del límite configurado.
- **Criterio de aceptación:** el límite se respeta exactamente, sin cargar de más en memoria antes de rechazar.
- **Pruebas requeridas:** las descritas.
- **Riesgos:** un archivo sin límite de tamaño sería vector de agotamiento de memoria (DoS).
- **Evidencia de cierre:** reporte de pruebas.
- **Gate asociado:** ninguno numerado directamente.
- **Estado inicial:** `BLOCKED`.

#### E5-S9-T05 — Rate limiting

- **Objetivo:** confirmar que los 4 endpoints nuevos heredan `RATE_LIMIT_TTL_SECONDS`/`RATE_LIMIT_MAX_REQUESTS` ya configurados globalmente (verificado en `.env.example`), sin necesidad de configuración adicional.
- **Archivos/módulos probables:** los 4 controllers.
- **Dependencias:** `E5-S7-T05`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** confirmar que el guard de throttling global (`@nestjs/throttler`, ya dependencia de `apps/api`) aplica sin exclusión a estas rutas.
- **Criterio de aceptación:** los 4 endpoints están sujetos al mismo rate limiting que el resto del backend.
- **Pruebas requeridas:** verificación de configuración, no necesariamente prueba de carga.
- **Riesgos:** ninguno significativo.
- **Evidencia de cierre:** nota de verificación.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S9-T06 — Protección de archivos (Storage)

- **Objetivo:** confirmar que `getObject()` (Sprint 4) nunca expone una URL pública directa — el archivo pasa por el backend o por URL prefirmada de corta duración, nunca por acceso público al bucket.
- **Archivos/módulos probables:** `s3-storage.adapter.ts`.
- **Dependencias:** `E5-S4-T01`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** revisión de que el bucket de MinIO/S3 no es público, y que `getObject()` usa credenciales del backend, no una URL firmada expuesta al cliente.
- **Criterio de aceptación:** ningún archivo es accesible sin pasar por la autorización del backend.
- **Pruebas requeridas:** verificación de configuración del bucket.
- **Riesgos:** un bucket público expondría todos los documentos fiscales de todas las Empresas.
- **Evidencia de cierre:** nota de verificación.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S9-T07 — Logs sensibles (verificación cruzada con Sprint 8)

- **Objetivo:** prueba dedicada de seguridad sobre lo ya implementado en `E5-S8-T06`.
- **Archivos/módulos probables:** pruebas de integración con inspección de logs.
- **Dependencias:** `E5-S8-T06`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** ejecutar el flujo completo y confirmar por grep automatizado que ningún log contiene el XML crudo o el folio fiscal completo.
- **Criterio de aceptación:** cero coincidencias en el grep.
- **Pruebas requeridas:** la descrita.
- **Riesgos:** ninguno adicional si Sprint 8 se implementó correctamente.
- **Evidencia de cierre:** reporte de la prueba.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S9-T08 — Acceso operativo a `Job`

- **Objetivo:** confirmar que ningún endpoint público permite manipular `Job.status` directamente — solo el worker y el reconciliador escriben ese campo.
- **Archivos/módulos probables:** `jobs.controller.ts` (Sprint 7).
- **Dependencias:** `E5-S7-T04`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** confirmar que API-0055 es de solo lectura (`GET`), sin ningún `PATCH`/`PUT` expuesto sobre `Job`.
- **Criterio de aceptación:** cero rutas de escritura sobre `Job` fuera del worker/reconciliador.
- **Pruebas requeridas:** revisión de rutas registradas.
- **Riesgos:** un endpoint de escritura permitiría a un usuario forzar `COMPLETED` externamente — exactamente el falso `PROCESSED` por otra vía.
- **Evidencia de cierre:** checklist de rutas.
- **Gate asociado:** ninguno directo — refuerza G-24.
- **Estado inicial:** `BLOCKED`.

#### E5-S9-T09 — Replay

- **Objetivo:** confirmar que el `jobId` determinista (UUIDv5, ya usado en `JobsRepository.findOrCreateQueued`) evita que un reencolado malicioso duplique procesamiento.
- **Archivos/módulos probables:** `job-id.util.ts` (ya existente), worker.
- **Dependencias:** `E5-S4-T02`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** prueba de reencolar el mismo `jobId` repetidamente — BullMQ debe ignorarlo si ya existe.
- **Criterio de aceptación:** ningún reencolado del mismo `jobId` produce doble procesamiento.
- **Pruebas requeridas:** la descrita.
- **Riesgos:** ninguno significativo si `job-id.util.ts` ya es correcto.
- **Evidencia de cierre:** reporte de prueba.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

#### E5-S9-T10 — Checksum como control de integridad

- **Objetivo:** prueba de manipulación — objeto de Storage alterado entre la carga y el procesamiento.
- **Archivos/módulos probables:** `E5-S3-T10` (utilidad de checksum), worker.
- **Dependencias:** `E5-S3-T10`, `E5-S4-T04`.
- **Precondiciones:** ninguna adicional.
- **Acciones:** simular reemplazo del objeto en MinIO entre la confirmación de subida y el procesamiento del worker; confirmar que el flujo se comporta según lo documentado (no hay comparación de reutilización que aplicar, dado que sin `Cfdi` previo el flujo simplemente hace `create()` con el contenido real descargado).
- **Criterio de aceptación:** el checksum calculado siempre corresponde a los bytes efectivamente descargados y procesados.
- **Pruebas requeridas:** la descrita.
- **Riesgos:** ninguno adicional si `E5-S3-T10` es correcto.
- **Evidencia de cierre:** reporte de prueba.
- **Gate asociado:** ninguno directo.
- **Estado inicial:** `BLOCKED`.

---

## 18. Sprint 10 — Pruebas

> Transversal: cada grupo se ejecuta contra el código ya implementado en los sprints anteriores, no es un sprint de código nuevo. Ningún grupo se marca `PASSED` sin evidencia ejecutada — ninguna prueba de esta sección se ha corrido en este documento.

| Grupo           | Objetivo                                                                          | Entorno                                         | Fixtures                                                  | Criterio de aprobación                                                                                                                                                                               | Evidencia requerida                                                   |
| --------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Unitarias       | Cobertura de cada función/clase en aislamiento (mocks)                            | Jest, sin infraestructura externa               | Mocks de Prisma/Storage/BullMQ                            | ≥ 80 % cobertura por módulo del Bloque E                                                                                                                                                             | Reporte de cobertura                                                  |
| Integración     | Flujo real contra PostgreSQL/Redis/MinIO                                          | Contenedor Linux (patrón EWO-004)               | Fixtures de CFDI 4.0, XML inválido                        | Flujo de extremo a extremo en verde                                                                                                                                                                  | Log de `test:integration`                                             |
| Base de datos   | FKs compuestas, CHECK, constraints únicas                                         | PostgreSQL real                                 | Datos que violan cada constraint                          | Rechazo a nivel de base de datos, no solo de aplicación                                                                                                                                              | Gates G-28, G-29                                                      |
| Redis           | Estados VIVO/TERMINAL RETENIDO/AUSENTE                                            | Redis real + BullMQ                             | Jobs en cada estado                                       | Reconciliación distingue las 3 categorías correctamente                                                                                                                                              | Gates G-17 a G-23                                                     |
| BullMQ          | Reintentos, backoff, retención                                                    | BullMQ real, config central real                | Job con `attempts` configurado                            | `attemptsMade` se comporta según lo fijado en AD-4.1                                                                                                                                                 | Prueba dedicada de semántica de `attemptsMade`                        |
| Concurrencia    | Dos workers reales sobre el mismo documento                                       | PostgreSQL + Redis + MinIO reales, dos procesos | `documentId` único por corrida                            | Exactamente un `Cfdi`, un `PROCESSED`, un `Job COMPLETED`                                                                                                                                            | Gates G-01 a G-16                                                     |
| Idempotencia    | Reintento del mismo Job no duplica efectos                                        | Integración                                     | Job reintentado manualmente                               | Ningún duplicado en `Cfdi`/hijos/efectos externos                                                                                                                                                    | Prueba de reintento + revisión de idempotencia de efectos post-commit |
| Seguridad       | XXE, límites, tenant isolation, RBAC                                              | Integración                                     | Payloads maliciosos, usuarios de distintas Empresas/roles | Ver Sprint 9 completo                                                                                                                                                                                | Reportes de Sprint 9                                                  |
| Contratos       | Forma exacta de cada respuesta API                                                | Integración                                     | Snapshots de §13.1/§13.2                                  | Cero desviación de forma                                                                                                                                                                             | Reporte de Sprint 7                                                   |
| Regresión       | `confirmUpload`, `findOrCreateQueued` y demás código ya existente siguen intactos | `pnpm run check` completo                       | Baseline de `E5-S0-T11`                                   | Ningún test preexistente se rompe                                                                                                                                                                    | Diff de resultados contra el baseline                                 |
| Rendimiento     | Transacción A con el máximo de conceptos (999, límite CFDI 4.0 SAT)               | Integración                                     | CFDI sintético con 999 conceptos                          | La transacción completa dentro del timeout por defecto de `$transaction`, o con `timeout`/`maxWait` ajustado explícitamente — nunca dividiendo la transacción (riesgo ya registrado en Addendum §18) | Medición de tiempo de la transacción                                  |
| Recuperación    | Caída antes/después del commit                                                    | Integración con kill simulado del proceso       | Punto de caída controlado                                 | Gates G-26, G-27                                                                                                                                                                                     | Reportes de ambos gates                                               |
| Caos controlado | Fallos de conexión durante el PASO 0 de clasificación (AD-10.2)                   | Integración con inyección de fallo              | Desconexión simulada de PostgreSQL durante el arbitraje   | El fallo se clasifica como recuperable, nunca se malinterpreta como uno de los casos A–G por evidencia incompleta                                                                                    | Prueba de inyección de fallo                                          |

---

## 19. Gates G-01 a G-31

> Reconstruidos verbatim de Addendum §16.2.1. **Ninguno se ha ejecutado** — el propio Addendum lo declara explícitamente. Todos parten en `NOT_STARTED`; ninguno puede marcarse `PASSED` sin evidencia real.

| Gate | Objetivo                                                                                                                                         | Precondición                                              | Evidencia                                      | Bloquea implementación | Bloquea merge                                        | Estado           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------- | ---------------------- | ---------------------------------------------------- | ---------------- |
| G-01 | Carrera de dos workers sobre el mismo `documentId` → exactamente un `Cfdi`, un agregado, un `PROCESSED`, un `Job COMPLETED`                      | Sprint 4 y 5 completos                                    | Log de la prueba de concurrencia (`E5-S5-T09`) | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-02 | El ganador confirma → el perdedor recibe la violación ya definitiva y clasifica CASO A                                                           | Sprint 5 completo                                         | Log de la prueba                               | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-03 | El ganador revierte → el `INSERT` del perdedor continúa y él se convierte en ganador                                                             | Sprint 5 completo                                         | Log de la prueba                               | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-04 | Colisión en el último intento de BullMQ → `COMPLETED`, nunca `REJECTED`/`FAILED`                                                                 | Sprint 4 (`E5-S4-T10`)                                    | Log de la prueba                               | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-05 | Rollback ante fallo en cada escritura del agregado → sin rastro parcial en ninguna tabla                                                         | Sprint 2 completo                                         | Consulta a las 4 tablas tras fallo simulado    | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-06 | `Document updateMany.count === 0` → rollback total; clasificación por AD-10.2                                                                    | Sprint 2 (`E5-S2-T04`)                                    | Prueba de integración                          | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-07 | `Job updateMany.count === 0` → rollback total; `Document` NO queda `PROCESSED`                                                                   | Sprint 2 (`E5-S2-T05`)                                    | Prueba de integración                          | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-08 | `Job` ausente al cerrar → `count !== 1` → rollback → CASO B/D                                                                                    | Sprint 5 completo                                         | Prueba de integración                          | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-09 | `Job = FAILED` al cerrar → `count !== 1` → rollback → CASO B                                                                                     | Sprint 5 completo                                         | Prueba de integración                          | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-10 | `Job = CANCELLED` al cerrar → `count !== 1` → rollback → CASO B                                                                                  | Sprint 5 completo                                         | Prueba de integración                          | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-11 | `Job = COMPLETED` al cerrar → `count !== 1` → rollback → CASO A o B según evidencia                                                              | Sprint 5 completo                                         | Prueba de integración                          | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-12 | `Job` de otro tenant → `count !== 1` → rollback; ninguna escritura cruzada                                                                       | Sprint 5 completo                                         | Prueba de integración                          | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-13 | `Document = REJECTED` al arbitrar → CASO C: sin escritura, sin promoción                                                                         | Sprint 5 (`E5-S5-T03`)                                    | Prueba de integración                          | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-14 | `Document` ausente al arbitrar → CASO D: permanente de integridad, sin reintento ciego                                                           | Sprint 5 (`E5-S5-T02`)                                    | Prueba de integración                          | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-15 | Folio de otro documento → CASO F: recuperable + incidente; sin `REJECTED` (Q-001)                                                                | Sprint 5 (`E5-S5-T07`)                                    | Prueba de integración                          | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-16 | Agotamiento de intentos causado por folio duplicado → `PROCESSING`/`FAILED`, incidente `PENDIENTE_Q001_FOLIO_DUPLICADO`, sin `PROCESSING_FAILED` | Sprint 4 (`E5-S4-T11`)                                    | Prueba de integración                          | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-17 | Redis `waiting` → reconciliación no interviene                                                                                                   | Sprint 6 (`E5-S6-T03`)                                    | Prueba de integración                          | No                     | Sí                                                   | `NOT_STARTED`    |
| G-18 | Redis `delayed` (backoff) → reconciliación no interviene                                                                                         | Sprint 6                                                  | Prueba de integración                          | No                     | Sí                                                   | `NOT_STARTED`    |
| G-19 | Redis `prioritized` → reconciliación no interviene                                                                                               | Sprint 6                                                  | Prueba de integración                          | No                     | Sí                                                   | `NOT_STARTED`    |
| G-20 | Redis `active` → reconciliación no interviene                                                                                                    | Sprint 6                                                  | Prueba de integración                          | No                     | Sí                                                   | `NOT_STARTED`    |
| G-21 | Redis `completed` retenido + `Document PROCESSING` → violación de invariante: incidente, nunca `PROCESSED`                                       | Sprint 6 (`E5-S6-T05`)                                    | Prueba de integración                          | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-22 | Redis `failed` retenido + `Document PROCESSING` sin `Cfdi` → reconciliación actúa sin esperar a `removeOnFail`                                   | Sprint 6 (`E5-S6-T04`)                                    | Prueba de integración                          | No                     | Sí                                                   | `NOT_STARTED`    |
| G-23 | Redis ausente confirmado en 2 ciclos → rama de ausencia, distinta de los terminales retenidos                                                    | Sprint 6 (`E5-S6-T03`)                                    | Prueba de integración                          | No                     | Sí                                                   | `NOT_STARTED`    |
| G-24 | `Cfdi` existente + `Document PROCESSING` → violación de invariante: incidente, sin escritura                                                     | Sprint 4 (`E5-S4-T05`) y Sprint 6 (`E5-S6-T05`)           | Prueba centinela en ambos componentes          | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-25 | `Document = PROCESSED` sin `Cfdi` → violación de invariante: incidente, sin reversión                                                            | Sprint 6 (`E5-S6-T05`)                                    | Prueba de integración                          | Sí                     | Sí                                                   | `NOT_STARTED`    |
| G-26 | Caída antes del commit → sin rastro alguno; el reintento ejecuta el flujo completo                                                               | Sprint 4 (`E5-S4-T15`)                                    | Prueba con kill simulado                       | No                     | Sí                                                   | `NOT_STARTED`    |
| G-27 | Caída después del commit, antes de publicar efectos → estado correcto en PostgreSQL; el efecto externo se pierde                                 | Sprint 4/8                                                | Prueba con kill simulado                       | No                     | Sí                                                   | `NOT_STARTED`    |
| G-28 | FKs compuestas de `CfdiConcept`/`CfdiTax` → rechazo en base de datos, no solo en el repositorio                                                  | Sprint 1 (`E5-S1-T09`)                                    | Prueba de base de datos                        | No                     | Sí                                                   | `NOT_STARTED`    |
| G-29 | CHECK `cfdi_taxes_scope_concept_check` → existe tras las migraciones y rechaza combinaciones inválidas                                           | Sprint 1 (`E5-S1-T04`, `T09`)                             | Consulta a `information_schema`                | No                     | Sí                                                   | `NOT_STARTED`    |
| G-30 | Ausencia de `meta.target` en el flujo → ninguna ruta de control lo lee                                                                           | Sprint 5 (`E5-S5-T08`)                                    | Revisión de código + prueba                    | No                     | Sí                                                   | `NOT_STARTED`    |
| G-31 | Outbox, solo si se exige entrega garantizada → no aplicable mientras el outbox sea post-MVP                                                      | N/A — condición de revisión de D-007, no de este Bloque E | Ninguna en el MVP                              | No                     | No — **post-MVP, no bloquea el cierre del Bloque E** | `NOT_APPLICABLE` |

---

## 20. Matriz de trazabilidad

| Regla o decisión                                                                      | Tarea                                 | Prueba                                   | Gate                                     | Evidencia                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------- | ---------------------------------------- | ---------------------------------------------- |
| Transacción única (D-007, invariante 1)                                               | `E5-S2-T06`                           | Unitaria + integración de rollback total | G-05                                     | Addendum AD-10, §9                             |
| `Document updateMany.count === 1`                                                     | `E5-S2-T04`                           | Integración                              | G-06, G-24                               | Addendum AD-10.1.2, criterio 58                |
| `Job updateMany.count === 1`                                                          | `E5-S2-T05`                           | Integración                              | G-07, G-08–G-12                          | Addendum AD-10.1.2, criterio 64                |
| Rollback total ante fallo                                                             | `E5-S2-T06`                           | Integración                              | G-05, G-06, G-07                         | Addendum AD-10.1.2                             |
| PostgreSQL primario como autoridad                                                    | `E5-S5-T01`                           | Unitaria                                 | Ninguno numerado directo                 | Addendum AD-10.2, nota sobre réplicas          |
| `Cfdi` existente + `Document PROCESSING` = violación de invariante                    | `E5-S4-T05`, `E5-S6-T05`              | Centinela + integración                  | G-24                                     | Addendum §10.0.2                               |
| Nunca reutilizar `Cfdi`                                                               | `E5-S2-T02`, `E5-S4-T05`              | Centinela                                | G-24                                     | Addendum AD-10.1, criterio 79                  |
| Reconciliador nunca escribe `PROCESSED`/`COMPLETED`                                   | `E5-S6-T05`                           | Centinela                                | G-21, G-24, G-25                         | Addendum §10.0, criterios 71, 80               |
| Clasificación A–G en orden D→C→A→B→E→F→G                                              | `E5-S5-T02` a `T08`                   | Integración por caso                     | G-01 a G-16                              | Addendum AD-10.2                               |
| Q-001 sin `REJECTED`/`CFDI_DUPLICATE`/`409` automático                                | `E5-S5-T07`, `E5-S4-T11`, `E5-S7-T08` | Integración                              | G-15, G-16                               | `brain/QUESTIONS.md` Q-001; Addendum §10.2.3   |
| API-0027 RBAC (`ADMINISTRADOR`/`CONTADOR`/`AUXILIAR`, excluye `SUPERVISOR`/`AUDITOR`) | `E5-S1-T08`, `E5-S7-T02`              | Contrato + RBAC                          | Ninguno numerado directo                 | Addendum §12, `docs/08_API_DESIGN.md` §9.5     |
| BullMQ terminales retenidos ≠ ausencia                                                | `E5-S6-T03`                           | Integración                              | G-17 a G-23                              | Addendum §10.1                                 |
| Sin `P2002.meta.target`                                                               | `E5-S5-T08`                           | Revisión de código                       | G-30                                     | D-007, Addendum §9.6                           |
| Sin `upsert({update:{}})`                                                             | `E5-S2-T02`, `E5-S4-T05`              | Centinela                                | Ninguno numerado directo (refuerza G-24) | D-007, Addendum §9.6, criterio 59              |
| Outbox post-MVP                                                                       | `E5-S6-T-` (no aplica código)         | N/A                                      | G-31                                     | Addendum §9.5, riesgo R-010 (`brain/RISKS.md`) |
| Checksum SHA-256 dentro de la transacción                                             | `E5-S3-T10`, `E5-S2-T04`              | Unitaria                                 | Ninguno numerado directo                 | Addendum AD-6, AD-10.1.1                       |
| Configuración central sin defaults locales                                            | `E5-S4-T09`                           | Unitaria de rangos                       | Ninguno numerado directo                 | Addendum §10.3                                 |
| CHECK `cfdi_taxes_scope_concept_check`                                                | `E5-S1-T04`                           | Base de datos                            | G-29                                     | Addendum AD-5 §4.5.2                           |
| FKs compuestas `CfdiConcept`/`CfdiTax`                                                | `E5-S1-T01`, `T02`                    | Base de datos                            | G-28                                     | Addendum AD-5                                  |

---

## 21. Definición de terminado por sprint

Ningún sprint se considera terminado solo porque compile. Para cada uno:

| Sprint | Código                               | Pruebas                                                 | Documentación                                                                                                                   | Auditoría Codex                                      | Correcciones                         | Evidencia              | Aprobación                                  |
| ------ | ------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------ | ---------------------- | ------------------------------------------- |
| 0      | N/A (preparación)                    | Baseline registrado                                     | Este checklist actualizado                                                                                                      | No requiere auditoría de código                      | N/A                                  | `CHANGELOG.md`         | Responsable de producto (ratificación)      |
| 1      | Migración aplicada, seed actualizado | G-28, G-29 en verde                                     | `docs/09_DATABASE_DESIGN.md` actualizado (obligación ya registrada en Addendum §20, sincronización antes del cierre de EWO-005) | Sí, READ ONLY sobre el diff de schema/migración/seed | Cerradas antes de Sprint 2           | Reporte de `E5-S1-T09` | Codex `PASSED`                              |
| 2      | Repositorios + orquestador           | Cobertura ≥ 80 %, centinela anti-reutilización en verde | Ninguna nueva requerida (el Addendum ya lo especifica)                                                                          | Sí, foco en `E5-S2-T02`/`T06`                        | Cerradas antes de Sprint 4           | `E5-S2-T10`            | Codex `PASSED`                              |
| 3      | Parser + validación XML              | 8 fixtures + 3 CFDI reales del SAT                      | Ninguna nueva                                                                                                                   | Sí, foco en seguridad XML (§5)                       | Cerradas antes de Sprint 4           | `E5-S3-T12`            | Codex `PASSED`                              |
| 4      | Worker completo                      | Unitarias + integración de extremo a extremo            | Ninguna nueva                                                                                                                   | Sí — **máxima prioridad**, foco en `E5-S4-T05`/`T11` | Cerradas antes de Sprint 5           | `E5-S4-T14`, `T15`     | Codex `PASSED`                              |
| 5      | Clasificación A–G                    | Gates G-01 a G-16                                       | Ninguna nueva                                                                                                                   | Sí — **máxima prioridad**, foco en CASO A/F          | Cerradas antes de Sprint 6           | `E5-S5-T09`            | Codex `PASSED`                              |
| 6      | Reconciliador                        | Gates G-17 a G-25                                       | Ninguna nueva                                                                                                                   | Sí — foco en `E5-S6-T05` (prohibición de escritura)  | Cerradas antes de Sprint 7           | `E5-S6-T08`            | Codex `PASSED`                              |
| 7      | 4 endpoints                          | Contratos + RBAC completos                              | `docs/08_API_DESIGN.md` §9.5/§15 sincronizados (obligación ya registrada en Addendum §20)                                       | Sí, foco en RBAC y ausencia de `409`                 | Cerradas antes de merge              | `E5-S7-T10`            | Codex `PASSED`                              |
| 8      | Observabilidad                       | Verificación de redacción                               | Ninguna nueva                                                                                                                   | Sí, foco en fuga de datos sensibles                  | Cerradas antes de merge              | `E5-S8-T06`            | Codex `PASSED`                              |
| 9      | Endurecimiento de seguridad          | Todas las pruebas negativas                             | Ninguna nueva                                                                                                                   | Sí                                                   | Cerradas antes de merge              | Reportes de Sprint 9   | Codex `PASSED`                              |
| 10     | N/A (transversal)                    | Los 13 grupos de la sección 18                          | `EWO-005_DOCUMENTS_FISCAL_REPORT.md` creado (DoD del Addendum)                                                                  | Auditoría final integral                             | Cerradas antes del cierre de EWO-005 | Reporte consolidado    | Responsable de producto (cierre de EWO-005) |

---

## 22. Flujo de auditoría

1. Claude Code implementa una tarea o un bloque coherente de tareas de un mismo sprint (nunca varios sprints de riesgo alto a la vez — ver sección 6).
2. Claude entrega el diff junto con la evidencia de cierre exigida por cada tarea (sección correspondiente de este checklist).
3. Codex audita en modo **READ ONLY** — sin modificar código, verificando contra D-007, el Addendum, y este checklist.
4. El responsable de producto (o quien delegue como ChatGPT/rol equivalente) evalúa el dictamen de Codex.
5. Claude corrige los hallazgos, sin ampliar el alcance de la tarea auditada.
6. Codex reaudita específicamente los hallazgos corregidos.
7. Se marca el gate correspondiente como `PASSED` en la sección 19 de este documento.
8. Se avanza a la siguiente tarea/sprint, nunca antes de que el gate anterior esté `PASSED`.

---

## 23. Estrategia de commits

Commits pequeños y aislados por categoría, nunca mezclados:

- `docs`: cambios a este checklist, al Addendum, o a documentación de referencia.
- `schema`: cambios a `schema.prisma` (Sprint 1).
- `migration`: archivo de migración generado (Sprint 1) — siempre en un commit separado del cambio de schema que lo originó, para que el diff de la migración SQL sea revisable de forma aislada.
- `domain`: tipos de dominio, errores tipados (Sprint 2).
- `repositories`: `CfdiRepository`, `CfdiConceptRepository`, `CfdiTaxRepository`, extensiones a `DocumentsRepository`/`JobsRepository` (Sprint 2).
- `parser`: `XmlProcessingModule`, validación, extracción (Sprint 3).
- `worker`: `XmlExtractionProcessor`, handler de eventos, reconciliador (Sprints 4 y 6).
- `api`: los 4 controllers nuevos (Sprint 7).
- `tests`: cuando una prueba se agrega en un commit separado del código que prueba (aceptable, pero preferible junto al código cuando sea la misma unidad de trabajo).
- `observability`: logs, métricas (Sprint 8).

**No mezclar** en ningún commit de esta lista: archivos de `apps/web/*`, `packages/ui/*`, ni `.claude/skills/` — ninguno de ellos pertenece al Bloque E backend.

---

## 24. Riesgos de implementación

| Riesgo                                      | Sprint más expuesto | Mitigación                                                                                                                                              |
| ------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Falso `PROCESSED`                           | 4, 5, 6             | Prueba centinela en `E5-S4-T05` y `E5-S6-T05`; auditoría de máxima prioridad en ambos sprints (sección 21)                                              |
| Divergencia `Document`/`Job`                | 2, 4                | `count === 1` exigido en ambas transiciones (`E5-S2-T04`, `T05`), verificado en `E5-S4-T07`/`T08`                                                       |
| Colisión de folio no resuelta correctamente | 4, 5, 7             | Salvaguarda Q-001 en `E5-S4-T11` y `E5-S6-T04`; comportamiento provisional ya documentado, sin inventar resolución                                      |
| Redis desincronizado con PostgreSQL         | 6                   | Tres categorías explícitas (`E5-S6-T03`); PostgreSQL siempre gana como fuente de verdad (§10.0)                                                         |
| Reintentos mal clasificados                 | 4                   | Prueba dedicada de semántica real de `attemptsMade` (`E5-S4-T10`) — no asumir el comportamiento documentado sin verificarlo contra la versión instalada |
| Jobs huérfanos                              | 6                   | Reconciliador de arranque (`E5-S6-T01`) y periódico (`E5-S6-T02`)                                                                                       |
| Fuga entre Empresas (tenant leak)           | 2, 7, 9             | `E5-S2-T08`, `E5-S7-T07`, `E5-S9-T02` — verificación explícita en tres sprints distintos                                                                |
| Duplicación de agregado                     | 2, 4, 5             | `create()` + restricción única como detector fiable (D-007); nunca `upsert({update:{}})`                                                                |
| Migración insegura                          | 1                   | Prohibido `db push`/`reset`; CHECK dentro del archivo de migración versionado (`E5-S1-T04`)                                                             |
| XML malicioso (XXE, bombas de entidad)      | 3, 9                | Pre-validaciones (`E5-S3-T03`) + pruebas negativas dedicadas (`E5-S9-T03`)                                                                              |
| Observabilidad insuficiente                 | 8                   | Métricas dedicadas para violación de invariante y folio pendiente (`E5-S8-T02`, `T03`)                                                                  |
| Working tree mezclado                       | 0                   | Aislamiento explícito antes de cualquier commit de código (`E5-S0-T03` a `T05`) — evidencia ya recolectada en sección 4                                 |

---

## 25. Pendientes fuera del MVP

- **Outbox transaccional** — clasificado post-MVP en Addendum §9.5; gate G-31 marcado `NOT_APPLICABLE` mientras no exista un consumidor cuya pérdida de evento produzca un estado incorrecto.
- **Resolución definitiva de Q-001** — depende de una decisión de negocio del responsable de producto, no de este equipo de implementación. El Bloque E puede completarse y cerrarse con el comportamiento provisional ya documentado (§10.2.3); solo la resolución final de `CFDI_DUPLICATE` queda pendiente.
- **UX definitiva de folio duplicado** — declarada pendiente en `docs/15_UX_FLOWS.md` UXF-0012; depende de Q-001.
- **Mejoras operativas de reprocesamiento** (endpoint de replay manual, UI de dead jobs) — excluidas explícitamente del alcance del plan original (§17 "Fuera de alcance (reconfirmado)").
- **Automatización avanzada de reconciliación** (reparación automática de violaciones de invariante) — **prohibida por diseño**, no un pendiente a futuro; cualquier decisión que la habilitara requeriría reabrir D-007 explícitamente.
- **Recuperación automática mediante _claim_/_lease_** (Alternativa E de D-007) — diferida a post-MVP; solo se activaría si se aprueba una nueva condición de revisión de D-007 (OCR/IA con coste, carga elevada, SLA de reproceso más estricto).

---

## 26. Orden recomendado de ejecución

| Orden | Sprint    | Dependencia                                                 | Puede iniciar                                                                                                                | Gate de salida                        |
| ----- | --------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 1     | Sprint 0  | Ninguna                                                     | Inmediatamente                                                                                                               | `E5-S0-T13` cerrada                   |
| 2     | Sprint 1  | Sprint 0                                                    | Tras ratificación de D-007                                                                                                   | G-28, G-29                            |
| 3     | Sprint 2  | Sprint 1                                                    | Tras migración aplicada                                                                                                      | G-05, G-06, G-07                      |
| 4     | Sprint 3  | Sprint 1 (paralelo posible con Sprint 2, bajo acoplamiento) | Tras Sprint 1                                                                                                                | Cobertura de fixtures completa        |
| 5     | Sprint 4  | Sprint 2 y Sprint 3 completos                               | Tras ambos cerrados                                                                                                          | G-01 a G-05, G-24, G-26, G-27         |
| 6     | Sprint 5  | Sprint 4 completo                                           | Tras Sprint 4                                                                                                                | G-01 a G-16                           |
| 7     | Sprint 6  | Sprint 5 completo                                           | Tras Sprint 5                                                                                                                | G-17 a G-25                           |
| 8     | Sprint 7  | Sprint 1 (seed) y Sprint 2 (persistencia)                   | Puede iniciar en paralelo con Sprints 4–6 para los endpoints de solo lectura, pero no cierra sin datos reales de integración | Cobertura de contrato y RBAC completa |
| 9     | Sprint 8  | Sprint 4 y Sprint 6                                         | Tras ambos                                                                                                                   | Verificación de redacción de logs     |
| 10    | Sprint 9  | Sprint 7 y Sprint 3                                         | Tras ambos                                                                                                                   | Todas las pruebas negativas           |
| 11    | Sprint 10 | Todos los anteriores                                        | Transversal, se consolida al final                                                                                           | Los 13 grupos de la sección 18        |

---

## 27. Primera tarea implementable

**`E5-S1-T01` — Modelo `CfdiConcept`**, inmediatamente después de que `E5-S0-T01` (ratificación de D-007) cierre.

- **ID:** `E5-S1-T01`.
- **Objetivo:** crear el modelo Prisma `CfdiConcept` exactamente como lo especifica Addendum AD-5 §4.5.1 — campos, `@@unique([companyId, cfdiId, position])`, `@@unique([id, cfdiId, companyId])`, FK compuesta hacia `Cfdi`.
- **Archivos probables:** `packages/database/prisma/schema.prisma`.
- **Precondiciones:** D-007 ratificada (`E5-S0-T01`); Sprint 0 completo.
- **Criterio de aceptación:** el modelo compila con `prisma validate`; ningún campo fuera de los especificados en AD-5 §4.5.1.
- **Pruebas:** ninguna en la tarea misma — se cubre junto con `E5-S1-T02` en la prueba de integración de `E5-S1-T09`.
- **Riesgos:** un campo inventado o un tipo `Float` en vez de `Decimal` violaría BR-GLB-004.
- **Evidencia de cierre:** diff de `schema.prisma` + salida de `prisma validate`.

Es la primera tarea porque no depende de ningún código existente del Bloque E (a diferencia de `E5-S1-T02`, que depende de que `CfdiConcept` exista primero como destino de su FK opcional), y porque el modelo de datos es el cimiento de todos los sprints posteriores.

---

## 28. Checklist de inicio

- [x] D-007 ratificada — `brain/DECISIONS.md`, tabla "Ratificación" completa (Alejandro Reyes Bocanegra, Product Owner y Arquitecto de Producto de ContaIA, 2026-07-25), Estatus `ACEPTADA`.
- [ ] Rama de implementación limpia, separada de `feature/frontend-ux-audit` (`E5-S0-T05`).
- [ ] Commit documental separado del trabajo de frontend en curso (`E5-S0-T04`).
- [ ] PostgreSQL 16 disponible y healthy (`E5-S0-T08`).
- [ ] Redis disponible y healthy (`E5-S0-T09`).
- [ ] Baseline de `pnpm run check` registrado (`E5-S0-T11`).
- [ ] Variables de entorno base confirmadas; las 14 nuevas aún no agregadas (correcto en este punto — se agregan en Sprint 4).
- [ ] Responsables claros: quién ratifica D-007, quién implementa, quién audita (Codex), quién decide sobre Q-001.
- [ ] Q-001 registrada y visible en `brain/QUESTIONS.md` — confirmado: **Abierta**.
- [ ] Los 31 gates de la sección 19 conocidos por el equipo antes de escribir la primera línea de código del worker.

---

## 29. Estado global

## **READY TO IMPLEMENT**

Basado exclusivamente en evidencia verificada el 2026-07-25: `brain/DECISIONS.md` registra D-007 con Estatus **`ACEPTADA`**, ratificada por **Alejandro Reyes Bocanegra** (Product Owner y Arquitecto de Producto de ContaIA), con fecha y evidencia completas en su tabla "Ratificación". `E5-S0-T01` cierra en `PASSED`. La implementación del Bloque E queda **autorizada**.

Esto **no** significa que el Bloque E esté implementado, ni que ninguna prueba o gate se haya ejecutado — sigue siendo cierto que 0 líneas de código de este Bloque existen, que las 14 variables de configuración siguen ausentes, y que los 31 gates de la sección 19 permanecen `NOT_STARTED`. El resto de Sprint 0 (`E5-S0-T02` a `T13`) sigue sin ejecutarse y es la condición real para que Sprint 1 pueda comenzar (sección 8).

**Q-001 permanece abierta** (`brain/QUESTIONS.md`) — la ratificación de D-007 es una decisión arquitectónica distinta de la decisión de negocio sobre folio fiscal duplicado, y ninguna de las dos cierra a la otra.
