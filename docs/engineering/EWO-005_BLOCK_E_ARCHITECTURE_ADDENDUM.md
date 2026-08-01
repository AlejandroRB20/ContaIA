# EWO-005 Bloque E — Architecture Addendum

## Control del documento

| Campo              | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EWO                | EWO-005                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Documento base     | `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Título             | Bloque E — Addendum Arquitectónico: Worker XML, Módulo CFDI y endpoints de resultado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Estado             | **RATIFICADO — IMPLEMENTACIÓN AUTORIZADA.** Cinco auditorías de Codex, una validación técnica independiente (Gravity), una revisión arquitectónica de concurrencia, una auditoría independiente de Codex sobre D-007 y una auditoría final de residuos, todas cerradas entre el 2026-07-24 y el 2026-07-25 (rondas sexta a octava aplicadas, ver "Fecha corrección"). La decisión rectora **D-007 fue ratificada el 2026-07-25** por Alejandro Reyes Bocanegra (Product Owner y Arquitecto de Producto de ContaIA) — la implementación del Bloque E queda **autorizada** conforme a `docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md`. Este addendum permanece como la especificación técnica vigente y prevalece en cualquier tensión con el plan original mientras persista (§1) |
| Fecha original     | 2026-07-24                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Fecha corrección   | 2026-07-25 (sexta ronda: alineación con D-007 · séptima ronda: auditoría de Codex sobre D-007 · **octava ronda**: auditoría final — eliminación de la ruta de reutilización del `Cfdi`, prohibición total de `PROCESSED` por reconciliación, sincronización de `docs/08`, `docs/15`, `docs/20`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Decisión rectora   | **D-007** (`brain/DECISIONS.md`) — Estrategia de concurrencia y persistencia atómica del agregado CFDI. **Estado: ACEPTADA — ratificada el 2026-07-25 por Alejandro Reyes Bocanegra (Product Owner y Arquitecto de Producto de ContaIA).** La implementación del Bloque E queda autorizada (`docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md`). Ante cualquier tensión entre este addendum y D-007, **prevalece D-007**                                                                                                                                                                                                                                                                                                                                                            |
| Versiones objetivo | PostgreSQL 16+ · Prisma ORM 6.19.x (instalado: 6.19.3) · BullMQ 5.81.x (`bullmq@^5.81.1`, `@nestjs/bullmq@^11.0.4`) · NestJS 10.x · TypeScript 5.x                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Propósito          | Cerrar las preguntas abiertas que bloquearon la especificación del Bloque E y definir 12 decisiones arquitectónicas (AD-1 a AD-12) antes de iniciar la implementación                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Fuentes            | `docs/04_BUSINESS_RULES.md` §4.6–4.7, `docs/08_API_DESIGN.md` §9.5/§14/§15, `docs/09_DATABASE_DESIGN.md` §10, `docs/11_SECURITY_ARCHITECTURE.md` §16–17, `packages/database/prisma/schema.prisma`, análisis Bloque E 2026-07-24, auditoría Codex 2026-07-24                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Prerrequisitos     | Bloques A–D de EWO-005 implementados y comprometidos; `Document`, `Cfdi`, `Job` en schema.prisma y en `_prisma_migrations`; `JobsModule` operativo como productor (solo encola)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

---

## 1. Propósito

El análisis de preparación del Bloque E, realizado el 2026-07-24, concluyó con el veredicto:

> **BLOQUE E BLOQUEADO — FALTA DEFINICIÓN**

Las preguntas abiertas PA-1 a PA-8 identificadas en ese análisis no podían responderse con la documentación existente al momento. Este addendum registra las decisiones tomadas sobre cada una de ellas y cierra la especificación necesaria para que la implementación pueda comenzar.

Cinco rondas de auditoría de Codex y una validación técnica independiente (Gravity), todas del 2026-07-24, más una revisión arquitectónica de concurrencia del 2026-07-25, identificaron hallazgos sucesivos; este documento los corrige.

**Octava ronda (2026-07-25) — auditoría final de Codex.** Encontró que la séptima ronda había cerrado la reconciliación pero **dejado abierta la misma puerta en el worker**, más contradicciones de estado y de alcance documental:

| #          | Hallazgo                                                                                                                                                                                                                                                                                                                                                                                                 | Dónde queda resuelto                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| BLOQUEANTE | **AD-10.1 todavía permitía el falso `PROCESSED`**: la RUTA REUTILIZACIÓN localizaba un `Cfdi` preexistente, lo validaba por checksum, lo reutilizaba y **completaba la transacción promoviendo `Document → PROCESSED`**. Contradecía §10.0.2 desde dentro del worker. **Ruta eliminada por completo**: el `findUnique` es ahora una **guarda de invariante** cuya única salida no-nominal es el rollback | AD-10, AD-10.1, AD-10.1.1, AD-10.1.2, §7, §9, criterios 41/79/81 |
| BLOQUEANTE | **§10.0 autorizaba `PROCESSING → PROCESSED` «con la evidencia de §10.2.2»**, mientras §10.2.2 ya lo prohibía. Autorización **eliminada**: el reconciliador no tiene ninguna vía para escribir `PROCESSED`                                                                                                                                                                                                | §10.0, §10.2.2, criterios 53/80                                  |
| BLOQUEANTE | Las pruebas de §16.1 seguían esperando `Cfdi verificable → PROCESSED + COMPLETED`                                                                                                                                                                                                                                                                                                                        | §16.1 (filas del worker y de Reconciliación)                     |
| BLOQUEANTE | `docs/08_API_DESIGN.md`, `docs/15_UX_FLOWS.md` y `docs/20_BACKEND_IMPLEMENTATION_PLAN.md` ordenaban `409 DUPLICATE` de forma **vigente**, incompatible con Q-001                                                                                                                                                                                                                                         | Los tres documentos, marcados como sustituidos; criterio 83      |
| ALTO       | D-007 conservaba la frase «Decisión arquitectónica aprobada» pese a estar en `PROPUESTA — PENDIENTE DE RATIFICACIÓN`                                                                                                                                                                                                                                                                                     | `brain/DECISIONS.md`, addendum §9.2, criterio 82                 |
| ALTO       | El plan principal seguía marcado `APPROVED — listo para iniciar implementación`                                                                                                                                                                                                                                                                                                                          | Plan (Control del documento)                                     |
| MEDIO      | El diagrama del plan restringía API-0027 a CONTADOR y AUXILIAR, contradiciendo la matriz vigente que incluye ADMINISTRADOR                                                                                                                                                                                                                                                                               | Plan §4.1 (diagrama) y §4.4 (texto operativo)                    |

**Séptima ronda (2026-07-25) — auditoría independiente de Codex sobre D-007.** Confirmó la estrategia A + G pero encontró que varias secciones no se habían alineado con ella y que dos defectos nuevos podían producir falsos `PROCESSED` o rechazos fiscales no aprobados:

| #       | Hallazgo                                                                                                                                                                                                                                                                                                                                        | Dónde queda resuelto                                                        |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| CRÍTICO | La reconciliación seguía marcando `PROCESSED` cuando existía `Cfdi` con `Document = PROCESSING`, justificándose en la ventana «Transacción A / Transacción B» **que D-007 eliminó**. Bajo D-007 esa combinación es un **estado imposible**; completarla automáticamente produce un **falso `PROCESSED`** a partir de una heurística estructural | §10.0.1, §10.0.2, §10.2 (matriz), §10.2.1, §10.2.2, criterio 53             |
| CRÍTICO | El cierre `Job → COMPLETED` usaba `updateMany` **sin comprobar `count`**: el `Document` podía quedar `PROCESSED` con el `Job` sin cerrar → **divergencia** invisible al usuario                                                                                                                                                                 | AD-10.1.2, criterios 64/65, D-007                                           |
| ALTO    | `count === 0` en el CAS se leía como «otro worker ganó», sin distinguir documento ausente, terminal preexistente, `Job` incompatible ni carrera no demostrada                                                                                                                                                                                   | AD-10.2 (casos A–G), criterios 66-70                                        |
| ALTO    | Q-001 podía burlarse por el agotamiento de intentos: la colisión de folio, clasificada como recuperable, terminaba en `REJECTED (PROCESSING_FAILED)` — **una decisión fiscal tomada por omisión**                                                                                                                                               | §10.2.3, AD-11, criterios 20/21/76                                          |
| MEDIO   | `completed` y `failed` (terminales **retenidos** en Redis) se agrupaban con la ausencia bajo «NO VIVO», llevando a esperar a `removeOnFail` en vez de leer la evidencia disponible                                                                                                                                                              | §10.1 (tres categorías), §10.2 (matriz PostgreSQL × Redis), criterios 73-75 |
| MEDIO   | D-007 figuraba como «Aceptada» y a la vez «pendiente de ratificación formal»                                                                                                                                                                                                                                                                    | Estado corregido a **PROPUESTA — PENDIENTE DE RATIFICACIÓN**                |
| MEDIO   | «Ausencia de SQL crudo en el MVP» contradecía el CHECK `cfdi_taxes_scope_concept_check`, que es SQL de migración                                                                                                                                                                                                                                | §9.7, D-007 (fuerzas de decisión)                                           |
| MEDIO   | El comportamiento de `upsert({ update: {} })` se afirmaba como hecho pese a que el experimento sigue **PENDIENTE**                                                                                                                                                                                                                              | §9.6, §9.7 (tabla de redacción exigible)                                    |
| MEDIO   | El plan principal conservaba instrucciones operativas incompatibles (`ON CONFLICT → 409`, criterio 6, matriz `cfdi.read`, «3 reintentos» ambiguo) y una colisión de identificadores `D-01` / `D-007`                                                                                                                                            | Plan §4.2, §4.4, §2.1, criterio 6, §4.1                                     |
| BAJO    | R-006 citaba solo el criterio 58, que protege el `Document` pero no el `Job`; `MASTER_CONTEXT.md` seguía fechado el 2026-07-22                                                                                                                                                                                                                  | `brain/RISKS.md`, `MASTER_CONTEXT.md`                                       |

**Sexta ronda (2026-07-25) — revisión arquitectónica de concurrencia; deriva en la decisión D-007.** La revisión inspeccionó el repositorio real y encontró que las rondas anteriores razonaban sobre un flujo que **todavía no existe en código**, y que el mecanismo de exclusión adoptado en la quinta ronda (`upsert({ update: {} })`) no es un detector fiable de colisiones. Los hallazgos y su resolución:

| #       | Hallazgo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Dónde queda resuelto                            |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| CRÍTICO | `upsert({ update: {} })` **no es un mecanismo de exclusión**: no es elegible para upsert nativo en Prisma 6.19.3 y, al degradar al camino administrado (lectura interna + `INSERT`/`UPDATE`), puede **reutilizar silenciosamente la fila creada por otro worker sin lanzar `P2002`**. El perdedor creería haber creado la cabecera y colgaría de ella los hijos de **su** extracción → mezcla del agregado. Sustituido por `create()`, cuya violación de restricción única **siempre** lanza y aborta la transacción | AD-10.1.2, AD-10.2, §9, §7 — decisión **D-007** |
| ALTO    | El `Document` **ya llega al worker en `PROCESSING`**: la transición `PENDING_UPLOAD → PROCESSING` la ejecuta la confirmación síncrona de subida (`documents.repository.ts`, `confirmUpload`). El worker no dispone de ella como reclamo, de modo que dos ejecuciones del mismo Job no quedaban excluidas por ningún estado                                                                                                                                                                                           | AD-10, AD-10.1.2, §7, §9.1                      |
| ALTO    | Separar «Transacción A» (agregado) de «Transacción B» (`PROCESSED` + `COMPLETED`) abría una ventana en la que el `Cfdi` existe y el `Document` sigue en `PROCESSING`, delegando en la reconciliación algo que puede ser atómico. **Fusionadas en una única transacción**                                                                                                                                                                                                                                             | AD-10, AD-6, §7, §9                             |
| MEDIO   | Los modelos `CfdiConcept`, `CfdiTax` y el campo `conceptSlot` se citaban como si existieran; **no están en `schema.prisma`** (verificado). Se marcan como diseño pendiente de implementación                                                                                                                                                                                                                                                                                                                         | AD-5, §2.2, §9.2                                |
| MEDIO   | La política ante `folioFiscal` duplicado de **otro** documento se fijaba automáticamente como `REJECTED` sin regla de negocio aprobada. Queda **pendiente de business rule**                                                                                                                                                                                                                                                                                                                                         | AD-3, AD-10.2, §9.3, `brain/QUESTIONS.md`       |

> **Límite explícito de lo que D-007 garantiza.** La combinación adoptada garantiza **exclusión de commit**, atomicidad, convergencia idempotente e imposibilidad de confirmar dos agregados para el mismo documento. **No es un claim anticipado:** no impide que dos workers descarguen el archivo, lo parseen y consuman recursos antes de intentar persistir. Ver §9.1 y la alternativa futura de _claim_/_lease_ en §9.4.

**Quinta ronda — un hallazgo ALTO nuevo y tres ajustes, sobre semántica de ejecución.** La quinta auditoría confirmó los cinco hallazgos de la cuarta ronda como resueltos y encontró un defecto de ejecución que las rondas previas no examinaron:

| #     | Hallazgo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Dónde queda resuelto   |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| ALTO  | El flujo `create Cfdi → catch P2002 → findUnique` sobre el mismo `tx` es inviable: PostgreSQL aborta la transacción (`25P02`) y Prisma 6.19.x no usa savepoints por operación. **Sigue vigente** el diagnóstico: la discriminación se realiza **fuera** de la transacción abortada. _(La resolución que esta quinta ronda propuso —absorber la carrera con `upsert` sobre `documentId_companyId`— fue **superada por la sexta ronda / D-007**, que la rechaza por no ser un detector fiable de colisiones; el `catch` externo se conserva.)_ | AD-10.1.2, AD-10.2, §7 |
| MEDIO | La Transacción A se representaba como `$transaction([ … ])` (forma de arreglo), incompatible con la lógica ramificada descrita — debe ser la forma **interactiva**                                                                                                                                                                                                                                                                                                                                                                           | AD-10.1.2              |
| MEDIO | La relación opcional `cfdiConcept` de nulabilidad mixta y su dependencia de `MATCH SIMPLE` no estaban declaradas ni exigían `prisma validate`                                                                                                                                                                                                                                                                                                                                                                                                | AD-5 §4.5.2, DoD §20   |
| BAJO  | El contador de ciclos consecutivos de reconciliación no tenía ubicación especificada                                                                                                                                                                                                                                                                                                                                                                                                                                                         | §10.1                  |

**Cuarta ronda — hallazgos confirmados por dos revisiones independientes.** Corrigen suposiciones sobre el comportamiento real de BullMQ 5.81.x y Prisma 6.19.x que las rondas anteriores habían dado por buenas:

| #   | Hallazgo confirmado                                                                                                                                                                                  | Dónde queda resuelto                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | `@OnWorkerEvent('failed')` se dispara en **cada** intento fallido, no al agotarse los intentos; y `attempts: N` son N intentos **totales**, no N reintentos                                          | AD-4.1, AD-4.2, AD-11                                                       |
| 2   | Los índices únicos **parciales** creados por SQL manual **no generan `WhereUniqueInput`** en Prisma (no existe `upsert` sobre ellos), y `meta.target` **no garantiza** devolver el nombre del índice | AD-5 §4.5.2 (identidad declarativa vía `conceptSlot`), AD-10.1.2, AD-10.2   |
| 3   | La reconciliación podía aceptar un agregado parcial y **reescribir estados terminales** (incluido `REJECTED → PROCESSED`)                                                                            | §10.0, §10.2.1, §10.2.2                                                     |
| 4   | «No está en `active`» **no** significa «el Job desapareció»: `waiting`, `delayed`, `prioritized`, `waiting-children` y las ventanas de transición son estados legítimos                              | §10.1                                                                       |
| 5   | _(parcialmente confirmado)_ Suficiencia de validar solo conteos y posiciones del agregado                                                                                                            | AD-10.1.1 — resuelto con una síntesis justificada, no eligiendo una postura |

**Rondas anteriores** (vigentes): integridad relacional con FKs compuestas y CHECK, idempotencia del agregado fiscal completo, seguridad XML con límites de nodos/atributos y estado real de `fast-xml-parser`, configuración central con política de fallo explícita, separación entre `backoff.delay` y `defaultJobOptions.delay`, distinción entre campos CFDI obligatorios/fuera-de-MVP/opcionales/ambiguos, y sincronización documental exigida antes del cierre de EWO-005.

Este documento **complementa** el plan original. No reemplaza ninguna sección de `EWO-005_DOCUMENTS_FISCAL_PLAN.md`. Cuando este addendum y el plan original estén en tensión, **este addendum prevalece durante la implementación del Bloque E** — es la especificación más reciente. Esta precedencia rige mientras persista la tensión documental; el §20 (Definition of Done) exige sincronizar la documentación base antes del cierre de EWO-005.

---

## 2. Contexto

### 2.1 Qué está implementado (Bloques A–D)

| Componente                                                            | Estado                            |
| --------------------------------------------------------------------- | --------------------------------- |
| `DocumentsModule` — API-0023, 0024, 0025, confirm-upload              | Implementado y comprometido       |
| `StorageModule` — `StorageAdapter`, `S3StorageAdapter`                | Implementado y comprometido       |
| `JobsModule` — productor BullMQ, `JobsService.ensureXmlExtractionJob` | Implementado y comprometido       |
| Modelos Prisma `Document`, `Cfdi`, `Job` + enums                      | En schema y en migraciones        |
| Frontend — zona de carga, tabla de documentos, polling 5 s            | Implementado, pendiente de commit |
| Permisos `document.upload`, `document.read` en seed                   | Implementados y comprometidos     |

### 2.2 Qué NO existe todavía (Bloque E)

| Pieza                                                       | Estado                                            |
| ----------------------------------------------------------- | ------------------------------------------------- |
| `XmlProcessingModule`                                       | No existe                                         |
| `CfdiModule` — API-0027, 0028                               | No existe                                         |
| Worker `xml-extraction` (`@Processor`)                      | No existe                                         |
| `JobsController` — API-0055                                 | No existe                                         |
| `fast-xml-parser` instalado                                 | No instalado                                      |
| Permiso `cfdi.read` en seed                                 | Ausente                                           |
| API-0026 (`GET /documents/:documentId/download`)            | No implementada                                   |
| Métodos de actualización de estado en `JobsRepository`      | Ausentes                                          |
| Métodos de actualización de estado en `DocumentsRepository` | Ausentes                                          |
| Modelos `CfdiConcept`, `CfdiTax`                            | No existen (requieren nueva migración)            |
| Campo `conceptSlot` en `CfdiTax`                            | No existe (parte de la misma migración pendiente) |
| `StorageAdapter.getObject()`                                | Ausente en el contrato actual                     |

**Lo que sí existe y condiciona el diseño del worker** (NIVEL B, verificado en código): el modelo `Cfdi` **solo de cabecera**, con `@@unique([documentId, companyId])` y `@@unique([companyId, folioFiscal])`; la transición atómica `PENDING_UPLOAD → PROCESSING` en `DocumentsRepository.confirmUpload` (`updateMany` + comprobación de `count`), que se ejecuta **en la confirmación síncrona de subida, antes de encolar**; y `JobsModule` como productor BullMQ con `attempts: 3` y backoff exponencial de 1000 ms. Consecuencia: **el `Document` llega al worker ya en `PROCESSING`**, por lo que el worker no dispone de esa transición como reclamo (D-007, §9.1).

### 2.3 Flujo de trabajo detenido

```
✅ POST /companies/:companyId/documents
✅ PUT <uploadUrl>  (directo a MinIO)
✅ POST /documents/:documentId/confirm-upload  → Job QUEUED encolado en cola `xml-extraction`

🔴 DETENCIÓN — la cola tiene Jobs que nadie consume
     ↓ (pendiente de Bloque E)
⬜ Worker descarga objeto, valida XML, extrae CFDI
⬜ Document → PROCESSED o REJECTED
⬜ Job → COMPLETED o FAILED
⬜ GET /documents/:documentId/download  (API-0026)
⬜ GET /documents/:documentId/cfdi      (API-0027)
⬜ GET /companies/:companyId/cfdi       (API-0028)
⬜ GET /jobs/:jobId                     (API-0055)
```

---

## 3. Alcance

### 3.1 Alcance del Bloque E

| Componente                                                                          | Descripción                                                                                                                  |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `StorageAdapter.getObject()`                                                        | Nueva operación en el contrato del adaptador (AD-1)                                                                          |
| Migración Prisma — `CfdiConcept`, `CfdiTax` + `@@unique([id, companyId])` en `Cfdi` | Nuevos modelos relacionales para conceptos e impuestos CFDI; índice compuesto en `Cfdi` para habilitar FKs compuestas (AD-5) |
| `DocumentsRepository` — transiciones terminales                                     | `markAsProcessed`, `markAsRejected`                                                                                          |
| `JobsRepository` — transiciones de estado                                           | `markAsProcessing`, `markAsCompleted`, `markAsFailed`, `findById`                                                            |
| `XmlProcessingModule` — `XmlValidationService`, `CfdiExtractorService`              | Validación y extracción (sin Prisma, sin BullMQ)                                                                             |
| Worker `xml-extraction` — `XmlExtractionProcessor`                                  | Orquestación completa: descarga → validación → extracción → persistencia                                                     |
| `CfdiModule` — `CfdiService`, `CfdiController`, `CfdiRepository`                    | API-0027, API-0028                                                                                                           |
| `JobsController`                                                                    | API-0055                                                                                                                     |
| API-0026 (`GET /documents/:documentId/download`)                                    | Descarga segura via URL prefirmada (AD-7)                                                                                    |
| Seed — permiso `cfdi.read`                                                          | Asignado a ADMINISTRADOR, CONTADOR y AUXILIAR (AD nuevo — §12)                                                               |
| `fast-xml-parser` instalado                                                         | Dependencia de parsing XML                                                                                                   |
| BullMQ `removeOnComplete`/`removeOnFail`                                            | Política de retención desde el inicio (AD-12)                                                                                |
| Reconciliación startup + periódica                                                  | Jobs y documentos atascados (sección 10)                                                                                     |

### 3.2 Fuera del alcance del Bloque E

| Ítem                                                 | Razón                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| Soporte CFDI 3.3                                     | MVP solo CFDI 4.0 (AD-8); se rechaza con `UNSUPPORTED_CFDI_VERSION` |
| Soporte CFDI 5.0                                     | No existe al momento de esta especificación                         |
| Worker en proceso separado                           | Decisión D-01 y obs. 7 del plan original; misma NestJS instancia    |
| Webhook MinIO                                        | Plan original §3 — excluido explícitamente                          |
| Borrado físico de objetos REJECTED                   | Plan original §3 — deuda futura                                     |
| Vinculación CFDI-Póliza (BR-CFDI-003)                | EWO-006                                                             |
| UI operativa de dead jobs                            | No en MVP                                                           |
| Replay manual de Jobs desde API                      | No en MVP                                                           |
| DLQ avanzada                                         | No en MVP (Jobs fallidos consultables en PostgreSQL)                |
| Nómina, Carta Porte, Pagos, complementos adicionales | EWO posterior                                                       |
| Páginas frontend para CFDI (UI-0015, UI-0016)        | Scope de frontend pendiente de revisión                             |
| Validación criptográfica del sello SAT               | No en MVP (BR-CFDI-001)                                             |
| Validación fiscal ante SAT/PAC                       | No en MVP (Etapa 4)                                                 |

### 3.3 Campos CFDI 4.0 incluidos y excluidos en el MVP

El modelo `Cfdi` del Bloque E extrae los campos necesarios para la funcionalidad inicial. Los campos CFDI 4.0 no incluidos en el schema deben registrarse en `ambiguousFields[]` si el extractor los encuentra, o simplemente ignorarse. Esta tabla es informativa — el schema Prisma es la fuente de verdad.

**Campos CFDI 4.0 incluidos en el MVP (presentes en el modelo `Cfdi`):**

| Campo CFDI 4.0       | Campo en `Cfdi`   |
| -------------------- | ----------------- |
| `UUID` (del TFD)     | `folioFiscal`     |
| `RfcEmisor`          | `rfcEmisor`       |
| `RfcReceptor`        | `rfcReceptor`     |
| `Fecha` (de emisión) | `issuedAt`        |
| `SubTotal`           | `subtotal`        |
| `Total`              | `total`           |
| `Moneda`             | `currency`        |
| `TipoDeComprobante`  | `tipoComprobante` |

**Campos CFDI 4.0 explícitamente excluidos del MVP** (fuera del schema, no se persistirán):

| Campo CFDI 4.0                                   | Motivo de exclusión                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `NombreEmisor`                                   | No está en el schema `Cfdi`; solo se persiste `rfcEmisor`                                   |
| `NombreReceptor`                                 | No está en el schema `Cfdi`; solo se persiste `rfcReceptor`                                 |
| `RegimenFiscal` (emisor)                         | No en schema                                                                                |
| `DomicilioFiscalReceptor`                        | No en schema                                                                                |
| `RegimenFiscalReceptor`                          | No en schema                                                                                |
| `UsoCFDI`                                        | No en schema                                                                                |
| `FormaPago`                                      | No en schema                                                                                |
| `MetodoPago`                                     | No en schema                                                                                |
| `LugarExpedicion`                                | No en schema                                                                                |
| `CondicionesDePago`                              | Opcional en CFDI 4.0; no en schema                                                          |
| `TipoCambio`                                     | No en schema; `currency` ya indica la moneda                                                |
| `Exportacion`                                    | Nuevo en CFDI 4.0; no en schema                                                             |
| `Sello`, `NoCertificado`, `Certificado`          | Validación criptográfica fuera de alcance del MVP (BR-CFDI-001)                             |
| Complemento `TimbreFiscalDigital` (excepto UUID) | Solo `folioFiscal` (UUID) se extrae del TFD; los demás campos del sello SAT no se almacenan |

El extractor `Cfdi40Extractor` **no debe fallar** por la presencia de los campos de la tabla "excluidos" en el XML — simplemente los omite.

**Distinción obligatoria entre tipos de campo (no deben tratarse igual):**

| Tipo de campo                                                     | Definición                                                                                                                                                                                    | Comportamiento si falta o es inválido                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campo obligatorio del agregado                                    | Los 8 campos `NOT NULL` del modelo `Cfdi` (tabla "incluidos" arriba): `folioFiscal`, `rfcEmisor`, `rfcReceptor`, `issuedAt`, `subtotal`, `total`, `currency`, `tipoComprobante`               | El `Cfdi` **no se persiste**. Transacción C: `Document = REJECTED (CFDI_STRUCTURE_INVALID)`, `Job = FAILED` → `UnrecoverableError`. Nunca se registra como `ambiguousFields` — es un rechazo estructural, no una ambigüedad                                                                              |
| Campo deliberadamente fuera del MVP                               | Los 14 campos de la tabla "excluidos" arriba                                                                                                                                                  | Se ignora silenciosamente — ni se persiste ni se registra en `ambiguousFields`, porque no forma parte del contrato de extracción de este bloque                                                                                                                                                          |
| Campo opcional del agregado (presente en el schema pero nullable) | P. ej. `noIdentificacion`, `unidad`, `descuento` en `CfdiConcept`; `tasaOCuota`, `base`, `importe` en `CfdiTax` cuando `tipoFactor = 'Exento'`                                                | Se persiste como `null` — comportamiento normal, no error, no ambigüedad                                                                                                                                                                                                                                 |
| Campo ambiguo                                                     | Un campo del agregado (obligatorio u opcional) presente en el schema, cuyo valor en el XML no puede determinarse con certeza (formato inesperado, valor fuera de catálogo SAT conocido, etc.) | Se registra en `Cfdi.ambiguousFields[]`. **Excepción:** si el campo ambiguo es uno de los 8 obligatorios, el resultado es el mismo que "campo obligatorio ausente" — un campo obligatorio con valor incierto no puede persistirse, el rechazo estructural tiene prioridad sobre el registro como ambiguo |

**Regla explícita:** "Ignorar silenciosamente" se aplica **únicamente** a los campos fuera del MVP (segunda fila de la tabla). Nunca se aplica a un campo obligatorio ausente o ambiguo — eso siempre resulta en `CFDI_STRUCTURE_INVALID`, nunca en una omisión sin registro ni en un `ambiguousFields` que oculte el rechazo.

---

## 4. Decisiones arquitectónicas (AD-1 a AD-12)

### AD-1 — `StorageAdapter.getObject()`: descarga directa por el worker

**Problema (PA-1):** La interfaz `StorageAdapter` publicada en Bloques A–D no tiene un método para descargar el contenido del objeto. El worker necesita el Buffer del archivo para parsear el XML.

**Decisión:** Agregar `getObject(key: string): Promise<Buffer>` al contrato `StorageAdapter` **sin modificar ninguna firma existente**.

Las firmas actuales del contrato son (informativas — no cambiarlas):

```typescript
getPresignedUploadUrl(key: string, contentType: string): Promise<PresignedUrl>;
getPresignedDownloadUrl(key: string): Promise<PresignedUrl>;
exists(key: string): Promise<boolean>;
getMetadata(key: string): Promise<ObjectMetadata | null>;
deleteObject(key: string): Promise<void>;
```

La nueva firma que se agrega:

```typescript
// apps/api/src/modules/storage/storage.interface.ts  ← SOLO agregar esta firma
getObject(key: string): Promise<Buffer>;
```

**Implementación en `S3StorageAdapter`:** usar `GetObjectCommand` del SDK de AWS (el import ya existe en `s3-storage.adapter.ts`), leer el `Body` del response como stream y convertirlo a `Buffer`. Aplicar el mismo patrón de errores (`StorageError`) ya presente en los demás métodos.

**Nota:** El adaptador concreto se llama `S3StorageAdapter` (en `apps/api/src/modules/storage/s3-storage.adapter.ts`). Este adaptador es S3-compatible y funciona con MinIO mediante protocolo S3 (`forcePathStyle: true`). Cualquier referencia anterior a `MinioStorageAdapter` en este documento era incorrecta.

**Alternativa rechazada:** URL prefirmada de descarga + `fetch` interno. Rechazada porque: rompe la abstracción, la URL caduca antes de que el worker procese el Job en reintentos tardíos, complica las pruebas unitarias, e introduce tráfico HTTP interno innecesario.

---

### AD-2 — Forma del campo `result` cuando `Job.status = COMPLETED`

**Problema (PA-2):** El campo `result` del modelo `Job` es `Json?`. El plan original menciona "referencia al recurso final" pero no define la forma exacta.

**Decisión:** Para Jobs de tipo `XML_EXTRACTION`, cuando `status = COMPLETED`:

```typescript
interface XmlExtractionJobResult {
  resourceType: 'cfdi';
  resourceId: string; // ID del registro Cfdi creado
  documentId: string; // ID del Document procesado
}
```

Ejemplo serializado:

```json
{
  "resourceType": "cfdi",
  "resourceId": "a3f1e2b4-...",
  "documentId": "7c9d0f1a-..."
}
```

**Restricción:** `result = null` cuando `status` es `QUEUED`, `PROCESSING`, `FAILED` o `CANCELLED`. Nunca un `result` parcial.

---

### AD-3 — CFDI con `folioFiscal` duplicado detectado por el worker

**Problema (PA-3):** El worker no puede devolver un HTTP 409 al cliente. Solo puede actuar sobre estados persistidos.

> ⚠ **BUSINESS RULE PENDIENTE — la política de esta decisión NO está aprobada (D-007, §9.3).** Registrada en `brain/QUESTIONS.md` **Q-001**. Lo que sigue describe el **mecanismo de detección** (aprobado) y una **propuesta de tratamiento** (no aprobada). Hasta que el responsable de producto apruebe la regla, el worker **no debe fijar `REJECTED`/`CFDI_DUPLICATE` de forma automática**: clasifica como **error recuperable con log de incidente y métrica dedicada**, sin transición terminal del `Document`. Motivo: rechazar un comprobante fiscal es una decisión de negocio con consecuencias contables para el usuario, y `CLAUDE.md` regla 6 impide fijarla sin fuente validada.

**Mecanismo de detección (aprobado):** ver AD-10.2 — evidencia positiva, nunca `meta.target`.

**Tratamiento propuesto, sujeto a aprobación:**

```
Document.status          = REJECTED
Document.rejectionReason = 'CFDI_DUPLICATE'
Job.status               = FAILED
Job.error                = mensaje sanitizado (sin IDs internos ni detalles de DB)
```

**Alternativas que la business rule debe resolver** (ninguna preseleccionada): (a) rechazar el documento duplicado, como arriba; (b) aceptarlo y marcarlo como duplicado no bloqueante, dejando ambos visibles para revisión humana; (c) escalarlo a revisión manual sin estado terminal automático. La elección depende de si un mismo folio fiscal cargado dos veces en la misma Empresa constituye un error del usuario, una recarga legítima, o un caso de sustitución — cuestión contable, no técnica.

**Cómo se detecta (procedimiento normativo en AD-10.2):** el duplicado se confirma por **evidencia positiva** — existe otro `Cfdi` con el mismo `companyId` + `folioFiscal` cuyo `documentId` es **distinto** al que se está procesando. No se deduce del nombre de la restricción violada ni del texto del error: `error.meta.target` no ofrece esa garantía en Prisma 6.19.x (AD-10.2).

**Restricciones:**

- El worker no debe crear un segundo registro `Cfdi`.
- El worker no debe vincular el nuevo documento al `Cfdi` existente.
- El worker no debe sobrescribir ni borrar el `Cfdi` existente.
- `Job.error` nunca expone IDs de base de datos, stack traces ni mensajes de driver Prisma.
- **`CFDI_DUPLICATE` sería la única clasificación permanente originada en la capa de persistencia** — y sólo una vez aprobada su business rule (§9.3). Un `folioFiscal` repetido en el **mismo** documento (reintento del mismo Job) es idempotencia, no duplicado: se resuelve por el retorno idempotente del paso 2 del flujo (§7, `Document` ya no está en `PROCESSING`) o por la **convergencia idempotente** del `catch` externo con evidencia completa (AD-10.2 CASO A). **Nunca** por reutilización de un `Cfdi` dentro de la transacción, ruta que ya no existe.

**Distinción con el flujo API:** El plan original §4.2 documenta una respuesta 409 desde `confirm-upload` si el `folioFiscal` ya existía. Ese flujo es diferente al de esta decisión, que cubre solo el caso detectado durante el procesamiento asíncrono del worker.

---

### AD-4 — Estado del Document cuando el worker agota todos los intentos

**Problema (PA-4):** Si BullMQ agota todos los intentos, el Job pasa a `failed` en BullMQ pero el Document podría quedar indefinidamente en `PROCESSING`.

#### AD-4.1 — Semántica real de `attempts` y del evento `failed` en BullMQ 5.x

Dos comportamientos de BullMQ que este addendum documentó incorrectamente en revisiones anteriores y que ahora se corrigen. Ambos fueron verificados contra la documentación oficial de BullMQ 5.x (versión instalada: `bullmq@^5.81.1`, `@nestjs/bullmq@^11.0.4`):

**1. `attempts: N` significa N intentos TOTALES, no N reintentos.**

```
JOBS_ATTEMPTS = 3  ⟹  1 intento inicial + 2 reintentos = 3 ejecuciones como máximo
```

Toda referencia a "los 3 reintentos" en versiones anteriores de este documento era incorrecta. La redacción correcta es "los 3 intentos" o "1 intento inicial + 2 reintentos".

**2. `@OnWorkerEvent('failed')` se dispara en CADA intento fallido, no solo al agotarse los intentos.**

Este es el hallazgo de mayor impacto sobre el diseño anterior. El evento `failed` de BullMQ se emite cada vez que una ejecución individual del processor lanza un error — tanto si BullMQ va a reintentar como si no. Con `attempts: 3`, un Job que falla siempre emite el evento **tres veces**, no una.

Por lo tanto, **el handler NO puede ejecutar la Transacción C incondicionalmente**: hacerlo marcaría el Document como `REJECTED` en el primer fallo recuperable, cancelando de facto los reintentos que la propia configuración de la cola pretende habilitar. El diseño anterior de este addendum tenía exactamente ese defecto.

#### AD-4.2 — Decisión: el handler debe determinar la terminalidad antes de actuar

**Decisión:** El handler `@OnWorkerEvent('failed')` clasifica cada invocación como terminal o no-terminal, y **solo actúa sobre el estado persistido cuando es terminal**.

```
@OnWorkerEvent('failed') — se ejecuta en CADA intento fallido:

  esTerminal =
      (error instanceof UnrecoverableError)     ← BullMQ no reintentará
      OR
      (job.attemptsMade >= (job.opts.attempts ?? 1))   ← intentos agotados

  Si NO esTerminal:
    → registrar diagnóstico sanitizado en log (nivel WARN)
    → NO tocar Document ni Job — el Document permanece en PROCESSING,
      el Job permanece en PROCESSING; BullMQ reintentará
    → return

  Si esTerminal:
    → ejecutar Transacción C de forma CONDICIONAL:
        markAsRejected  WHERE Document.status = 'PROCESSING'
        markAsFailed    WHERE Job.status IN ('QUEUED', 'PROCESSING')
    → registrar diagnóstico sanitizado en log (nivel ERROR)
```

**Por qué la Transacción C del handler es idempotente y segura ante doble ejecución:** cuando el error es permanente (AD-11), el processor **ya ejecutó** la Transacción C antes de lanzar `UnrecoverableError`. La Transacción C del handler encuentra entonces el Document en `REJECTED` (no en `PROCESSING`) y el Job en `FAILED`, por lo que sus `UPDATE ... WHERE` no afectan ninguna fila. El resultado es un no-op — no se sobrescribe el `rejectionReason` específico (p. ej. `XML_INVALID`) con el genérico `PROCESSING_FAILED`. Esta es la razón por la que ambas cláusulas `WHERE` son obligatorias y no una optimización.

**Restricción de implementación — verificar `attemptsMade` contra la versión instalada:** la semántica exacta del contador `job.attemptsMade` en el momento en que se emite `failed` (si ya incluye el intento actual o no) debe verificarse contra `bullmq@5.81.x` durante la implementación, con una prueba dedicada que confirme que el handler solo ejecuta la Transacción C en el último intento. Si la verificación mostrara que la comparación no es fiable en esa versión, la alternativa aceptada es consultar `await job.isFailed()` dentro del handler (verdadero solo cuando el Job ya está en el conjunto `failed` de BullMQ, es decir, cuando no habrá más reintentos). **No se admite** inferir la terminalidad a partir del texto del mensaje de error ni de un contador propio mantenido en memoria del proceso.

#### AD-4.3 — Tres capas de garantía

| Capa                                       | Cubre                                                                                       | Limitación                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **1 — Processor (AD-11)**                  | Errores permanentes: ejecuta Transacción C y lanza `UnrecoverableError` en el mismo intento | No cubre errores recuperables que agotan intentos          |
| **2 — Handler `failed` terminal (AD-4.2)** | Errores recuperables cuyos intentos se agotaron, con el proceso NestJS vivo                 | No se ejecuta si el proceso muere antes del último intento |
| **3 — Reconciliación (§10)**               | Proceso muerto, evento perdido, o Job desaparecido de Redis                                 | Actúa con retraso (`JOBS_RECONCILIATION_INTERVAL_MS`)      |

Las tres capas son complementarias y todas idempotentes — ninguna es la única garantía, y ejecutarlas todas sobre el mismo Job no produce estados inconsistentes.

**Forma de `rejectionReason`:** Código estable, sanitizado, adecuado para mostrar en UI. Nunca stack traces, nombres de tablas, mensajes de driver ni detalles de infraestructura. Valores estables: `'XML_INVALID'`, `'UNSUPPORTED_CFDI_VERSION'`, `'CFDI_STRUCTURE_INVALID'`, `'CFDI_DUPLICATE'`, `'STORAGE_OBJECT_NOT_FOUND'`, `'UNSUPPORTED_FILE_TYPE'`, `'PROCESSING_FAILED'` (para errores recuperables cuyos intentos se agotaron).

---

### AD-5 — Persistencia de conceptos e impuestos: modelos relacionales `CfdiConcept` y `CfdiTax`

> ⚠ **DISEÑO PENDIENTE DE IMPLEMENTACIÓN.** `CfdiConcept`, `CfdiTax` y el campo `conceptSlot` **no existen en `packages/database/prisma/schema.prisma`** (verificado — NIVEL B). El modelo `Cfdi` implementado representa **únicamente la cabecera**. Todo lo que sigue es especificación que requerirá una migración nueva; ninguna restricción, índice o CHECK descrito aquí está aplicado hoy en la base de datos.

**Problema (PA-5):** BR-CFDI-002 exige extraer "emisor, receptor, conceptos, montos e impuestos". El modelo `Cfdi` actual solo tiene campos de encabezado. Persistirlos como JSON en `Cfdi` impediría consultas fiscales eficientes y violaría restricciones de Prisma sobre campos `Json?` en índices.

**Decisión:** Crear dos modelos relacionales nuevos que requieren una nueva migración de Prisma: `CfdiConcept` y `CfdiTax`.

#### 4.5.1 Modelo `CfdiConcept`

Representa cada `<cfdi:Concepto>` del XML del comprobante.

| Campo              | Tipo             | Restricción            | Notas                                                                      |
| ------------------ | ---------------- | ---------------------- | -------------------------------------------------------------------------- |
| `id`               | `String` (UUID)  | PK                     | Generado por el servidor                                                   |
| `companyId`        | `String`         | FK compuesta, NOT NULL | Tenant safety — parte de `(cfdiId, companyId) → Cfdi(id, companyId)`       |
| `cfdiId`           | `String`         | FK compuesta, NOT NULL | Relación con `Cfdi` — parte de `(cfdiId, companyId) → Cfdi(id, companyId)` |
| `position`         | `Int`            | NOT NULL, positivo     | Orden original del concepto en el XML (1-based)                            |
| `claveProdServ`    | `String`         | NOT NULL               | Clave SAT del producto/servicio                                            |
| `noIdentificacion` | `String?`        |                        | Identificación interna del emisor; opcional en CFDI 4.0                    |
| `cantidad`         | `Decimal(18,6)`  | NOT NULL               | Cantidad; precisión compatible con CFDI                                    |
| `claveUnidad`      | `String`         | NOT NULL               | Clave SAT de unidad de medida                                              |
| `unidad`           | `String?`        |                        | Descripción de la unidad; opcional en CFDI 4.0                             |
| `descripcion`      | `String`         | NOT NULL               | Descripción del bien o servicio                                            |
| `valorUnitario`    | `Decimal(18,6)`  | NOT NULL               | Precio unitario antes de descuentos                                        |
| `importe`          | `Decimal(18,6)`  | NOT NULL               | Importe del concepto                                                       |
| `descuento`        | `Decimal(18,6)?` |                        | Descuento aplicado; `null` si no aplica                                    |
| `objetoImp`        | `String`         | NOT NULL               | Clave SAT de objeto de impuesto (`01`, `02`, `03`)                         |
| `createdAt`        | `DateTime`       | NOT NULL               |                                                                            |
| `updatedAt`        | `DateTime`       | NOT NULL               |                                                                            |

**Prerrequisito de la migración — `@@unique([id, companyId])` en `Cfdi`:**

El modelo `Cfdi` actual no tiene `@@unique([id, companyId])` — solo tiene `@@id([id])` individual, `@@unique([documentId, companyId])` y `@@unique([companyId, folioFiscal])`. Prisma solo puede expresar una FK compuesta `(cfdiId, companyId) → Cfdi(id, companyId)` si el lado referenciado tiene un índice único compuesto sobre exactamente esos campos. Sin `@@unique([id, companyId])` en `Cfdi`, la garantía multiempresa solo puede darse en la capa de aplicación.

**La migración del Bloque E debe agregar `@@unique([id, companyId])` al modelo `Cfdi` existente.** Este índice es inocuo para los datos actuales (ya garantizados por el PK único de `id`) y habilita la FK compuesta en los modelos nuevos:

```prisma
// Fragmento informativo — se agrega a Cfdi en la migración del Bloque E
model Cfdi {
  // ... campos y relaciones existentes sin cambios ...
  @@unique([id, companyId])         // ← NUEVO en Bloque E: habilita FK compuesta desde CfdiConcept/CfdiTax
  // @@unique([documentId, companyId]) ← existente, sin cambios
  // @@unique([companyId, folioFiscal]) ← existente, sin cambios
}

// FK compuesta en CfdiConcept (garantía DB-level de tenant safety)
model CfdiConcept {
  id        String @id @default(uuid()) @db.Uuid
  cfdiId    String @map("cfdi_id") @db.Uuid
  companyId String @map("company_id") @db.Uuid
  position  Int
  cfdi      Cfdi   @relation(fields: [cfdiId, companyId], references: [id, companyId], onDelete: Cascade)
  // ... demás campos ...

  @@unique([companyId, cfdiId, position])   // ← identidad idempotente (genera el WhereUniqueInput del upsert) + orden determinista
  @@unique([id, cfdiId, companyId])         // ← OBLIGATORIO: habilita la FK compuesta de 3 columnas desde CfdiTax
  @@map("cfdi_concepts")                    // ← nombre de tabla en snake_case, consistente con el resto del schema
}
```

**Por qué `@@unique([id, cfdiId, companyId])` y no solo `@@unique([id, companyId])`:** `id` ya es único globalmente por sí solo (PK), pero eso no basta para declarar una FK compuesta de 3 columnas — PostgreSQL exige que el lado referenciado tenga un índice único **sobre exactamente el mismo conjunto de columnas** que la FK usa. `CfdiTax` necesita demostrar, a nivel de base de datos, que un `cfdiConceptId` referenciado pertenece al **mismo** `cfdiId` que el propio `CfdiTax` — no solo a la misma empresa. Una FK de solo 2 columnas `(cfdiConceptId, companyId) → CfdiConcept(id, companyId)` permitiría que un impuesto de un CFDI apunte a un concepto de **otro** CFDI de la misma empresa, sin que la base de datos lo detecte (criterio 35, §15, ya identificado en la auditoría anterior). La FK de `CfdiTax` hacia `CfdiConcept` debe ser de tres columnas — `(cfdiConceptId, cfdiId, companyId) → CfdiConcept(id, cfdiId, companyId)` — y eso exige que `CfdiConcept` declare la unicidad exacta sobre esas tres columnas, no sobre dos.

**Relación e integridad multiempresa:**

La restricción `@@unique([companyId, cfdiId, position])` es la **identidad idempotente** de `CfdiConcept` (usada por el worker para upsert, ver AD-10) y garantiza orden determinista dentro de un CFDI. La FK compuesta `(cfdiId, companyId) → Cfdi(id, companyId)` garantiza integridad multiempresa a nivel de base de datos — si el `companyId` del concepto no coincide con el del `Cfdi` padre, la FK rechaza la inserción en DB. El repositorio de `CfdiConcept` debe igualmente verificar esta coincidencia antes de insertar (defensa en profundidad; la BD es la garantía final, el repositorio es la primera línea).

**Índices conceptuales:**

```
@@unique([companyId, cfdiId, position])      ← identidad idempotente + orden determinista + tenant isolation
@@unique([id, cfdiId, companyId])            ← habilita FK compuesta de 3 columnas desde CfdiTax
@@index([cfdiId])                             ← consultas por comprobante
@@index([companyId])                          ← tenant safety en consultas directas
```

**Eliminación en cascada:** Si se elimina un `Cfdi`, sus `CfdiConcept` se eliminan automáticamente (CASCADE DELETE). Si se elimina un `CfdiConcept`, sus `CfdiTax` de tipo `scope=CONCEPT` se eliminan automáticamente (vía la FK compuesta de `CfdiTax`, ver §4.5.2).

#### 4.5.2 Modelo `CfdiTax`

Representa impuestos a nivel de comprobante (`<cfdi:Impuestos>`) y a nivel de concepto (`<cfdi:Concepto><cfdi:Impuestos>`).

| Campo           | Tipo             | Restricción            | Notas                                                                                                                                                                                                                                                                                         |
| --------------- | ---------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | `String` (UUID)  | PK                     | Generado por el servidor                                                                                                                                                                                                                                                                      |
| `companyId`     | `String`         | FK compuesta, NOT NULL | Tenant safety — parte de `(cfdiId, companyId) → Cfdi(id, companyId)`                                                                                                                                                                                                                          |
| `cfdiId`        | `String`         | FK compuesta, NOT NULL | Relación con `Cfdi` — parte de `(cfdiId, companyId) → Cfdi(id, companyId)`                                                                                                                                                                                                                    |
| `cfdiConceptId` | `String?`        | FK compuesta nullable  | `null` = impuesto a nivel comprobante; valor = nivel concepto — parte de `(cfdiConceptId, cfdiId, companyId) → CfdiConcept(id, cfdiId, companyId)`. **Integridad referencial únicamente — NO forma parte de la identidad** (ver "Identidad idempotente" abajo)                                |
| `scope`         | `CfdiTaxScope`   | NOT NULL               | `CFDI` \| `CONCEPT`; coherencia con `cfdiConceptId` y `conceptSlot` garantizada por CHECK (ver abajo)                                                                                                                                                                                         |
| `conceptSlot`   | `Int`            | NOT NULL, ≥ 0          | **Discriminador de contenedor, NOT NULL por diseño.** `0` = impuesto a nivel comprobante; `k > 0` = impuesto del concepto cuya `position = k`. Existe para que la identidad del impuesto sea expresable como `@@unique` declarativo en Prisma sin columnas nulables (ver justificación abajo) |
| `position`      | `Int`            | NOT NULL, positivo     | Orden dentro de su contenedor XML (1-based); **reinicia en 1** por cada contenedor — los impuestos globales tienen su propia secuencia 1..n, y cada concepto tiene su propia secuencia 1..n. Identidad idempotente junto con `companyId` + `cfdiId` + `conceptSlot`                           |
| `type`          | `CfdiTaxType`    | NOT NULL               | `TRANSFER` \| `WITHHOLDING`                                                                                                                                                                                                                                                                   |
| `impuesto`      | `String`         | NOT NULL               | Clave SAT (`001`=ISR, `002`=IVA, `003`=IEPS)                                                                                                                                                                                                                                                  |
| `tipoFactor`    | `String`         | NOT NULL               | `Tasa`, `Cuota` o `Exento`                                                                                                                                                                                                                                                                    |
| `tasaOCuota`    | `Decimal(18,6)?` |                        | `null` cuando `tipoFactor = 'Exento'`                                                                                                                                                                                                                                                         |
| `base`          | `Decimal(18,6)?` |                        | Base gravable; presente en impuestos trasladados a nivel concepto                                                                                                                                                                                                                             |
| `importe`       | `Decimal(18,6)?` |                        | Monto del impuesto; `null` cuando `tipoFactor = 'Exento'`                                                                                                                                                                                                                                     |
| `createdAt`     | `DateTime`       | NOT NULL               |                                                                                                                                                                                                                                                                                               |
| `updatedAt`     | `DateTime`       | NOT NULL               |                                                                                                                                                                                                                                                                                               |

**Enums nuevos:**

```
enum CfdiTaxScope {
  CFDI      // impuesto a nivel comprobante (<cfdi:Impuestos>)
  CONCEPT   // impuesto a nivel concepto (<cfdi:Concepto><cfdi:Impuestos>)
}

enum CfdiTaxType {
  TRANSFER    // impuesto trasladado
  WITHHOLDING // impuesto retenido
}
```

**Identidad idempotente — por qué existe `conceptSlot` (decisión arquitectónica central)**

La identidad natural de un impuesto sería `companyId + cfdiId + cfdiConceptId + position`. Ese diseño **no es viable** por dos motivos que se refuerzan entre sí:

1. **Semántica de `NULL` en PostgreSQL.** `cfdiConceptId` es `NULL` para los impuestos globales. En un índice `UNIQUE` estándar, PostgreSQL trata cada `NULL` como distinto de cualquier otro, por lo que un `@@unique([companyId, cfdiId, cfdiConceptId, position])` **no impediría** dos impuestos globales con la misma `position`. (PostgreSQL 15+ ofrece `NULLS NOT DISTINCT`, pero Prisma no lo expone en `schema.prisma`, así que tampoco sería declarable.)

2. **Los índices únicos parciales creados por SQL manual son invisibles para Prisma Client.** Un `CREATE UNIQUE INDEX ... WHERE ...` ejecutado en la migración **no genera ninguna entrada en el `WhereUniqueInput`** del modelo. En consecuencia, con Prisma 6.19.x **no existe** un `prisma.cfdiTax.upsert()` ni un `findUnique()` que pueda usar esa identidad: el cliente no la conoce. Una revisión anterior de este addendum propuso exactamente eso — era inimplementable. Este mismo límite ya está documentado en el proyecto: el comentario del modelo `Job` en `schema.prisma` señala que un índice único parcial "no es expresable en Prisma" y lo relega a "refuerzo opcional en SQL crudo".

**Decisión: introducir `conceptSlot Int NOT NULL` como discriminador de contenedor**, y construir la identidad sobre él:

```
conceptSlot = 0   ⟺  impuesto a nivel comprobante  (scope = CFDI,    cfdiConceptId IS NULL)
conceptSlot = k   ⟺  impuesto del concepto en position = k  (scope = CONCEPT, cfdiConceptId NOT NULL)
```

Con `conceptSlot` la identidad queda **libre de nulos** y por tanto **declarable en `schema.prisma`**:

```prisma
model CfdiTax {
  id            String       @id @default(uuid()) @db.Uuid
  cfdiId        String       @map("cfdi_id") @db.Uuid
  companyId     String       @map("company_id") @db.Uuid
  scope         CfdiTaxScope
  conceptSlot   Int          @map("concept_slot")      // 0 = comprobante; k>0 = concepto en position k
  position      Int
  cfdiConceptId String?      @map("cfdi_concept_id") @db.Uuid   // solo integridad referencial
  // ... demás campos ...

  cfdi        Cfdi         @relation(fields: [cfdiId, companyId], references: [id, companyId], onDelete: Cascade)
  cfdiConcept CfdiConcept? @relation(fields: [cfdiConceptId, cfdiId, companyId], references: [id, cfdiId, companyId], onDelete: Cascade)

  @@unique([companyId, cfdiId, conceptSlot, position])   // ← IDENTIDAD: declarativa, sin nulos, Prisma-expresable
  @@index([cfdiId])
  @@index([companyId])
  @@index([cfdiConceptId])
  @@map("cfdi_taxes")
}
```

**Consecuencias de esta decisión (todas deseables):**

- `prisma.cfdiTax.upsert({ where: { companyId_cfdiId_conceptSlot_position: {...} }, ... })` **sí existe** — Prisma genera ese `WhereUniqueInput` a partir del `@@unique` declarativo. El flujo de persistencia idempotente de AD-10.1 es implementable.
- Ante un `P2002`, la restricción violada es una restricción **conocida por Prisma**, no un índice opaco creado por fuera del schema.
- Ya **no se requiere ningún índice único parcial** en SQL manual. La única pieza de SQL manual que subsiste es el `CHECK` de coherencia (abajo), que no participa de ninguna consulta de Prisma Client.

**Redundancia deliberada entre `conceptSlot` y `cfdiConceptId`:** ambas columnas describen el mismo vínculo, y eso es intencional. Cada una cumple una función que la otra no puede cumplir:

| Columna         | Función                                                                        | Garantizada por            |
| --------------- | ------------------------------------------------------------------------------ | -------------------------- |
| `conceptSlot`   | Identidad idempotente sin nulos, expresable en Prisma                          | `@@unique` declarativo     |
| `cfdiConceptId` | Integridad referencial: el concepto existe y pertenece al mismo CFDI y empresa | FK compuesta de 3 columnas |

**FK compuestas — qué garantiza la base de datos:**

- `(cfdiId, companyId) → Cfdi(id, companyId)`: el `companyId` del impuesto coincide con el del `Cfdi` padre. Ambas columnas son `NOT NULL`, así que esta FK se evalúa siempre.
- `(cfdiConceptId, cfdiId, companyId) → CfdiConcept(id, cfdiId, companyId)`: el concepto referenciado pertenece al **mismo** `Cfdi` y a la **misma** empresa. Esto cierra en la base de datos — no solo en el repositorio — el caso que los criterios 35 y 36 (§15) exigen rechazar.

**Relación opcional de nulabilidad mixta y semántica `MATCH SIMPLE` (a validar con `prisma validate`):** la segunda FK mezcla un campo nulable (`cfdiConceptId String?`) con dos `NOT NULL` (`cfdiId`, `companyId`), lo que hace la relación `cfdiConcept CfdiConcept?` opcional. Su comportamiento descansa en la semántica **`MATCH SIMPLE`** de PostgreSQL (el default): cuando **cualquier** columna del FK es `NULL`, la restricción **no se comprueba**. Esto es exactamente lo deseado:

- Impuesto global (`scope = CFDI`, `conceptSlot = 0`, `cfdiConceptId = NULL`): no hay concepto que referenciar; la FK a `CfdiConcept` no se evalúa. La integridad de `cfdiId`/`companyId` la sigue garantizando la primera FK (a `Cfdi`), que sí es `NOT NULL` y siempre se evalúa.
- Impuesto de concepto (`scope = CONCEPT`, las tres columnas presentes): la FK se evalúa por completo y garantiza la pertenencia al mismo `Cfdi` y empresa.

Compartir los scalars `cfdiId`/`companyId` entre las dos relaciones (`cfdi` y `cfdiConcept`) es un patrón ya presente en el `schema.prisma` del proyecto (el modelo `Cfdi` comparte `companyId` entre sus relaciones `company` y `document`), por lo que no introduce un patrón nuevo. Aun así, **la implementación debe confirmar con `prisma validate` + `prisma generate` que Prisma 6.19.x acepta esta relación opcional de nulabilidad mixta** antes de escribir la migración (ver DoD §20). El doble camino de `CASCADE` hacia `CfdiTax` (vía `Cfdi` y vía `CfdiConcept`) es válido en PostgreSQL 16 —que tolera múltiples rutas de cascada— y es una de las razones por las que este diseño se especifica contra PostgreSQL y no contra motores que las rechazan.

**Restricción CHECK — coherencia `scope` / `cfdiConceptId` / `conceptSlot`:**

Prisma no expone un atributo para declarar un `CHECK` multi-columna en `schema.prisma`. Se agrega mediante SQL manual dentro del archivo de migración generado con `prisma migrate dev --create-only`, editando el `.sql` antes de aplicarlo:

```sql
ALTER TABLE cfdi_taxes
  ADD CONSTRAINT cfdi_taxes_scope_concept_check CHECK (
    (scope = 'CFDI'    AND cfdi_concept_id IS NULL     AND concept_slot = 0)
    OR
    (scope = 'CONCEPT' AND cfdi_concept_id IS NOT NULL AND concept_slot > 0)
  );
```

Este `CHECK` ata las tres columnas entre sí: hace **imposible** que un impuesto global lleve `conceptSlot > 0`, o que uno de concepto lleve `conceptSlot = 0` o `cfdiConceptId` nulo. Es la pieza que impide que la redundancia deliberada derive en incoherencia.

**Invariante que la base de datos NO garantiza (y cómo se cubre):** que `conceptSlot` sea igual a la `position` del `CfdiConcept` referenciado por `cfdiConceptId`. Expresarlo a nivel de base de datos requeriría un `TRIGGER` (una FK no puede validar la igualdad entre una columna propia y una columna de la fila referenciada), y este addendum **no introduce triggers** — añaden una superficie de mantenimiento desproporcionada frente al riesgo real. Se cubre así:

- El worker deriva `conceptSlot` y `CfdiConcept.position` del **mismo agregado en memoria** (AD-10.1), por lo que una divergencia solo sería posible por un defecto del propio worker, no por datos de entrada.
- Es una invariante de repositorio, verificada antes de insertar.
- Existe una prueba de integración obligatoria dedicada (§16.2).
- **Lo relevante para seguridad multiempresa no depende de esta invariante:** que el concepto sea de otro CFDI o de otra empresa lo impide la FK compuesta, siempre, a nivel de base de datos. Una divergencia `conceptSlot`/`position` sería una anomalía de agrupación en la respuesta de API-0027, nunca una fuga entre empresas.

**Reglas de nulidad y de slot según `scope` (garantizadas por el CHECK):**

| `scope`   | `cfdiConceptId`       | `conceptSlot`                                      |
| --------- | --------------------- | -------------------------------------------------- |
| `CFDI`    | Debe ser `null`       | Debe ser `0`                                       |
| `CONCEPT` | Requerido (no `null`) | Debe ser `> 0`, igual a la `position` del concepto |

**Nota de decisión arquitectónica — `conceptSlot` frente a índices únicos parciales:**

_Decisión aceptada; registrada para la auditoría._

1. **Por qué no se mantienen los índices únicos parciales.** Un índice único parcial (`CREATE UNIQUE INDEX ... WHERE ...` en SQL manual) **no genera `WhereUniqueInput`** en Prisma Client: la restricción existiría en la base de datos, pero no habría una clave única que el cliente conozca. En consecuencia **impediría usar `upsert` declarativo** — el flujo idempotente del worker (AD-10.1) tendría que degradarse a "buscar y, si no existe, crear", con una carrera entre el `SELECT` y el `INSERT`.

2. **Por qué se introduce `conceptSlot`.** Colapsar el discriminador de contenedor a una columna `Int NOT NULL` (`0` = comprobante, `k` = concepto en posición `k`) da una **identidad única sin `NULL`**, lo que permite una **`@@unique` declarativa** (`@@unique([companyId, cfdiId, conceptSlot, position])`) que Prisma sí traduce a `WhereUniqueInput`, y por tanto un **`upsert` atómico** contra una restricción que el cliente conoce.

3. **Riesgo residual (declarado expresamente).** `conceptSlot` debe coincidir con la `position` del `CfdiConcept` que referencia `cfdiConceptId`, pero **esa igualdad no queda garantizada directamente por la base de datos**: una FK no puede validar que una columna propia sea igual a una columna de la fila referenciada, y este addendum no introduce triggers. Un código futuro que escribiera un `CfdiTax` con `conceptSlot` divergente de la `position` del concepto no sería detenido ni por el `@@unique`, ni por el CHECK, ni por la FK.

4. **Mitigaciones obligatorias.**
   - `conceptSlot` y `CfdiConcept.position` se derivan del **mismo agregado en memoria** (AD-10.1) — una divergencia solo sería posible por un defecto del worker, nunca por datos de entrada.
   - Solo el repositorio de persistencia CFDI puede escribir `CfdiTax` — no existe otra ruta de escritura de esta entidad.
   - Validación de la igualdad `conceptSlot == CfdiConcept.position` **previa a la persistencia**, en ese repositorio.
   - Pruebas unitarias (repositorio) y de integración (§16.2) que fijan la invariante.
   - `conceptSlot` **no se expone en la API** (§13.1): es un artefacto de modelado, no un dato del dominio CFDI.

5. **Alternativa descartada — dos tablas separadas** (una para impuestos globales, otra para impuestos por concepto). Elimina de raíz los `NULL` y la redundancia, y cada tabla tendría una identidad limpia sin `conceptSlot`. Se descartó por **duplicar el modelo, los repositorios y la lógica de extracción** para dos entidades que comparten todos sus campos salvo el contenedor — un coste de mantenimiento mayor que el de una columna redundante contenida por el CHECK. Queda registrada como la vía preferente si una auditoría exigiera cerrar el riesgo residual por diseño en lugar de por prueba.

**Eliminación en cascada:** Desde `Cfdi` hacia `CfdiTax` (CASCADE DELETE, vía la FK compuesta `cfdi`). Desde `CfdiConcept` hacia `CfdiTax` de tipo `scope=CONCEPT` (CASCADE DELETE al eliminar el concepto, vía la FK compuesta `cfdiConcept`).

#### 4.5.3 Relación actualizada del modelo `Cfdi`

```
Cfdi (1) ──── (*) CfdiConcept   [CASCADE DELETE; FK compuesta (cfdiId, companyId)]
Cfdi (1) ──── (*) CfdiTax       [scope=CFDI, conceptSlot=0, CASCADE DELETE;
                                 position reinicia en 1 por Cfdi]
CfdiConcept (1) ── (*) CfdiTax  [scope=CONCEPT, conceptSlot=position del concepto, CASCADE DELETE;
                                 FK compuesta (cfdiConceptId, cfdiId, companyId);
                                 position reinicia en 1 por concepto]
```

**Precisión decimal:** Todos los campos monetarios usan `Decimal(18,6)` — compatible con el estándar SAT y consistente con `subtotal`, `total` del modelo `Cfdi` actual.

**Nota sobre campos ambiguos — un concepto NUNCA se omite:**

Los campos **opcionales** no determinables se registran en `Cfdi.ambiguousFields[]` (campo existente, BR-XML-002) y se persisten como `null`.

Un concepto o un impuesto con **campos obligatorios** no determinables **no se omite del agregado**: el documento completo se rechaza con `CFDI_STRUCTURE_INVALID` (§3.3). Dos razones, ambas vinculantes:

1. **Coherencia con la verificación de agregado.** AD-10.1 exige que las `position` de `CfdiConcept` formen `{1..n}` contiguo. Omitir un concepto dejaría un hueco permanente que el worker interpretaría, en cada reintento, como agregado incompleto — el Job no convergería nunca.
2. **Fidelidad fiscal.** Un comprobante persistido al que le falta un concepto es un documento fiscal **incorrecto**, no uno parcialmente extraído: sus totales no cuadrarían con la suma de sus conceptos. BR-CFDI-002 exige extracción fiel; ante la duda, el rechazo explícito es preferible a un dato fiscal silenciosamente incompleto.

Revisiones anteriores de este addendum indicaban que "el concepto completo se omite" — esa instrucción queda derogada por contradecir AD-10.1 y §3.3.

---

### AD-6 — Cálculo y persistencia del checksum SHA-256

**Problema (PA-6):** El campo `Document.checksumSha256` existe en el schema pero nunca se ha poblado.

**Decisión:** El worker calcula el SHA-256 del Buffer descargado de Storage y lo persiste en `Document.checksumSha256` **dentro de la Transacción A única** (junto con el agregado fiscal y la transición terminal), nunca en una transacción posterior.

**Por qué en la misma transacción y no al marcar `PROCESSED`:** el checksum es la evidencia que permite verificar, en un intento posterior o desde la reconciliación, que un agregado ya persistido proviene de los mismos bytes (AD-10.1.1 y §10.2.1). Si se escribiera en una segunda transacción, ese dato solo existiría **después** del punto que pretende validar: un `Cfdi` persistido por un intento que murió antes de esa segunda transacción no tendría checksum, y ni el worker ni el reconciliador podrían demostrar nada sobre él. Escribirlo en la misma transacción hace que la implicación **«el `Cfdi` existe ⟹ su checksum existe ⟹ el `Document` está `PROCESSED`»** sea cierta por atomicidad — con D-007 la cadena completa se confirma en un solo commit.

**Orden de operaciones en el worker:**

1. Descargar el objeto como Buffer (`StorageAdapter.getObject`).
2. Calcular `sha256 = crypto.createHash('sha256').update(buffer).digest('hex')` usando `node:crypto` — sin dependencias adicionales.
3. Continuar con la validación y extracción XML.
4. **Transacción A (única):** comparar contra el `checksumSha256` ya persistido si lo hubiera (AD-10.1.1); persistirlo si era `null`; escribir el agregado fiscal; y **en la misma transacción** ejecutar la transición terminal condicional `PROCESSING → PROCESSED` y `Job → COMPLETED` (AD-10). Un solo commit.
5. _(Derogado por D-007 — ya no existe una segunda transacción de cierre.)_

**Restricciones:**

- El checksum se calcula sobre el objeto descargado de Storage, no sobre datos del cliente.
- No usar el checksum como mecanismo de deduplicación entre documentos distintos. La deduplicación fiscal usa `folioFiscal` (AD-3); el checksum sirve para verificar la identidad de contenido **del mismo documento** entre intentos.
- Para documentos que terminan en `REJECTED` antes de la descarga, `checksumSha256` queda `null`.
- Un `Cfdi` cuyo `Document.checksumSha256` sea `null` no puede servir como evidencia de procedencia (AD-10.1.1) ni reconciliarse automáticamente. En ningún caso se reutiliza: la reutilización de un `Cfdi` no existe en el diseño.

---

### AD-7 — API-0026 es scope del Bloque E

**Problema (PA-7):** API-0026 no fue implementada en Bloques A–D. Era ambiguo si quedaba para un bloque posterior.

**Decisión:** `GET /documents/:documentId/download` forma parte del alcance del Bloque E.

**Contrato:**

```
GET /documents/:documentId/download
Authorization: Bearer <token>
Permiso: document.read

Respuesta 200:
{
  "url": "<URL prefirmada de S3/MinIO>",
  "expiresAt": "<ISO 8601>"
}

Duración de la URL prefirmada: 300 segundos (constante `DOWNLOAD_URL_EXPIRY_SECONDS` ya existente en S3StorageAdapter)
```

**Estados del documento en que se permite la descarga:**

| Estado           | Descarga permitida | Razón                                                |
| ---------------- | ------------------ | ---------------------------------------------------- |
| `PENDING_UPLOAD` | No                 | El objeto puede no existir todavía en Storage        |
| `PROCESSING`     | Sí                 | El objeto ya fue subido (confirm-upload lo verificó) |
| `PROCESSED`      | Sí                 | Normal                                               |
| `REJECTED`       | Sí                 | El archivo original aún es evidencia válida          |

**Restricciones:**

- La respuesta nunca expone el campo `storageReference` del documento.
- El contenido del archivo se considera siempre **no confiable** (`docs/11_SECURITY_ARCHITECTURE.md` §16) — la API devuelve solo una URL prefirmada temporal, nunca sirve el contenido directamente.
- El endpoint usa el patrón de rutas planas del proyecto (ver sección 11 — Autorización de rutas planas).
- Auditoría: Sí, conforme a `docs/08_API_DESIGN.md` §9.5.

---

### AD-8 — Versiones CFDI: MVP es CFDI 4.0; arquitectura preparada para extensión

**Problema (PA-8):** No estaba definido qué versiones CFDI procesar en el MVP.

**Decisión:** El Bloque E procesa únicamente CFDI versión 4.0. La arquitectura usa una interfaz de versionado para permitir extractores futuros sin modificar el worker.

**Interfaz de versionado:**

```typescript
// apps/api/src/modules/xml-processing/cfdi-version-extractor.interface.ts
export interface CfdiVersionExtractor {
  readonly version: string; // p. ej. '4.0'
  supports(version: string): boolean;
  extract(xml: string): CfdiExtractionResult;
}
```

`CfdiExtractorService` recibe un array de `CfdiVersionExtractor` inyectado por NestJS y usa el primero que responda `supports(version) = true`. En el Bloque E, solo se implementa `Cfdi40Extractor`.

**Detección de versión:** Inspeccionar el atributo `Version` del elemento raíz `<cfdi:Comprobante ...>`. El namespace estándar de CFDI 4.0 es `http://www.sat.gob.mx/cfd/4`.

**Comportamiento con versiones no soportadas:**

```
Document.status          = REJECTED
Document.rejectionReason = 'UNSUPPORTED_CFDI_VERSION'
Job.status               = FAILED
```

Clasificado como error permanente (AD-11) — no reintentable vía `UnrecoverableError`.

**CFDI 3.3:** Rechazado como `UNSUPPORTED_CFDI_VERSION`. Si en el futuro se requiere soporte para 3.3, se implementa `Cfdi33Extractor` sin modificar el worker ni `CfdiExtractorService`.

---

### AD-9 — El extractor CFDI solo procesa documentos con `fileType = XML`

**Decisión:** El worker verifica `Document.fileType` al inicio del procesamiento:

```
Si document.fileType ≠ 'XML':
  Document.status          = REJECTED
  Document.rejectionReason = 'UNSUPPORTED_FILE_TYPE'
  Job.status               = FAILED
  → No intentar descargar ni parsear el archivo
```

**Punto de verificación:** Antes de llamar a `StorageAdapter.getObject`. Error permanente — `UnrecoverableError`.

**Nota:** `ensureXmlExtractionJob` encola Jobs para cualquier tipo de archivo (comportamiento existente, no se modifica en Bloque E). El worker es responsable de rechazar archivos no procesables.

---

### AD-10 — Idempotencia del worker: comportamiento ante reintentos y reinicios

El worker debe ser completamente seguro frente a reintentos de BullMQ, reinicios del proceso NestJS, y Jobs concurrentes.

**Reglas de idempotencia:**

| Estado al inicio del intento                                                                    | Acción del worker                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Job.status = QUEUED`                                                                           | Proceder normalmente                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `Job.status = PROCESSING`                                                                       | Reintento legítimo — verificar estado de `Document` y continuar desde el punto seguro                                                                                                                                                                                                                                                                                                                                                 |
| `Job.status = COMPLETED` o `FAILED`                                                             | Estado terminal — no hacer nada; retornar sin error                                                                                                                                                                                                                                                                                                                                                                                   |
| `Document.status = PROCESSED` o `REJECTED`                                                      | Resultado ya persistido — no sobreescribir; actualizar `Job` a terminal correspondiente si aún no lo está                                                                                                                                                                                                                                                                                                                             |
| `Cfdi` ya existe para el `documentId` y `companyId`, **con `Document` todavía en `PROCESSING`** | ⚠ **VIOLACIÓN DE INVARIANTE (§10.0.2).** **NUNCA se reutiliza.** Bajo D-007, si el `Cfdi` existe es porque su transacción commiteó, y ese commit incluyó `Document = PROCESSED`: encontrarlo junto a un `Document` en `PROCESSING` es un estado imposible. Se aborta la transacción (rollback total), se registra incidente y se escala. **Ni se reutiliza el agregado ajeno, ni se completa sobre él, ni se promueve el `Document`** |

**Transacciones Prisma — unidades lógicas indivisibles (conforme a D-007):**

| Transacción                       | Contenido                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Transacción A (éxito) — ÚNICA** | **Crear `Cfdi` con `create()` o abortar** — nunca recuperar ni reutilizar uno existente (hallar un `Cfdi` con el `Document` en `PROCESSING` es violación de invariante → rollback, §10.0.2) + upsert de `CfdiConcept[]` + upsert de `CfdiTax[]` + persistir `Document.checksumSha256` + verificación del agregado escrito en este intento (AD-10.1) + **transición terminal condicional `Document: PROCESSING → PROCESSED`** + `Job → COMPLETED` con su `result`. **Un solo commit.** |
| Transacción C (fallo)             | `DocumentsRepository.markAsRejected(documentId, companyId, reason)` + `JobsRepository.markAsFailed(jobId, companyId, error)`                                                                                                                                                                                                                                                                                                                                                          |

> **La antigua «Transacción B» queda derogada.** Las rondas anteriores separaban la persistencia del agregado (A) de la transición terminal del `Document` y el `Job` (B). Esa separación abría una ventana en la que el `Cfdi` existía y el `Document` seguía en `PROCESSING`, obligando a la reconciliación a resolver algo que puede ser atómico. **D-007 las fusiona en una única transacción.** Toda referencia a «Transacción B» en documentación anterior debe leerse como parte de la Transacción A.

**Atomicidad de la Transacción A — requisito arquitectónico, no recomendación.** La Transacción A debe ejecutarse como **una sola** `prisma.$transaction(async (tx) => { … })` — la forma **interactiva** (la forma de arreglo `$transaction([…])` no admite la lógica ramificada que el flujo requiere; ver AD-10.1.2). No se admite dividirla en varias transacciones ni ejecutar parte de sus escrituras fuera de ella. Esta atomicidad es la premisa sobre la que descansan la verificación de agregado (AD-10.1) y la reconciliación (§10.2.1): **si el `Cfdi` existe, entonces todos sus hijos, su `checksumSha256` y el `Document.status = PROCESSED` también existen.** Sin atomicidad real, ninguna de las dos garantías se sostiene, y un agregado parcialmente persistido pasaría a ser un estado alcanzable. La discriminación de un `P2002` (que abortaría la transacción) ocurre **fuera** de ella, en el `catch` externo (AD-10.2) — nunca capturándolo dentro del callback.

**Exclusión por transición terminal condicional, no por claim inicial.** El `Document` **ya llega al worker en `PROCESSING`** (la transición `PENDING_UPLOAD → PROCESSING` la ejecutó la confirmación síncrona de subida — `DocumentsRepository.confirmUpload`, evidencia NIVEL B). El worker, por tanto, **no dispone de esa transición como reclamo**. El árbitro de exclusión es la transición **terminal** `PROCESSING → PROCESSED`, ejecutada **dentro** de la Transacción A con la misma forma condicional que el repositorio ya usa (`updateMany` con `WHERE status = 'PROCESSING'` + comprobación de `count`):

- Si `count > 0` → este worker es el ganador; la transacción continúa hasta el commit.
- Si `count === 0` → otro worker ya cerró el documento; se lanza para **forzar el rollback** de todo el agregado de este intento, y la resolución se decide fuera con evidencia positiva (AD-10.2).

Esta exclusión es **de commit**, no anticipada: ver el límite declarado en §9.1.

**Restricciones de idempotencia:** Todos los `UPDATE` usan `WHERE status IN ('QUEUED', 'PROCESSING')` para Jobs y `WHERE status = 'PROCESSING'` para Documents — nunca revertir estados terminales.

#### AD-10.1 — Verificación del agregado escrito en ESTE intento

> ⚠ **DEROGADA LA REUTILIZACIÓN (D-007, corrección de la auditoría final).** Las revisiones anteriores usaban estas comprobaciones para decidir si un `Cfdi` **preexistente** podía reutilizarse como resultado válido de un intento anterior y así completar la transacción. **Esa ruta queda eliminada por completo.**
>
> **Por qué ya no existe.** Bajo D-007 el `Cfdi`, sus hijos, el checksum, `Document = PROCESSED` y `Job = COMPLETED` se confirman **en un único commit**. De ahí se sigue que **si el `Cfdi` existe, el `Document` ya está `PROCESSED`** — y en ese caso el worker ni siquiera alcanza la transacción: el paso 2 del flujo (§7) retorna idempotentemente al ver que el `Document` no está en `PROCESSING`. Por tanto, **encontrar un `Cfdi` dentro de la transacción, con el `Document` aún en `PROCESSING`, es un estado imposible** (§10.0.2), no un intento anterior recuperable.
>
> **Regla inequívoca:** un `Cfdi` preexistente **nunca** se reutiliza para completar un agregado nuevo, **nunca** habilita la transición terminal y **nunca** produce éxito idempotente dentro de la transacción. Se aborta con rollback y se escala.

**Qué verifica ahora esta sección: el agregado que ESTE intento acaba de escribir.** El worker construye el resultado de la extracción **en memoria, de forma determinista**, antes de persistir nada — esa es la única fuente de verdad de qué hijos debe tener este CFDI (principio 6 de §10.0.1). Tras escribir los hijos, y **antes** de la transición terminal, relee y compara lo persistido contra ese agregado esperado:

| #   | Verificación                                                                                 | Contra qué se compara                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | **No existe ningún `Cfdi` previo** para `documentId + companyId` al entrar en la transacción | Si existe → **violación de invariante**: abortar con rollback, incidente, escalar (§10.0.2). **No se reutiliza, no se compara, no se continúa**                     |
| 1   | `Cfdi.documentId` y `Cfdi.companyId` del registro **creado en este intento**                 | Deben coincidir con el `Document` que el worker procesa                                                                                                             |
| 2   | `Document.checksumSha256`                                                                    | Es el SHA-256 calculado en **este** intento, escrito en **esta** transacción (AD-6): coincide por construcción, no se compara contra un valor ajeno (ver AD-10.1.1) |
| 3   | Número de `CfdiConcept` persistidos                                                          | Número de `<cfdi:Concepto>` extraídos en este intento                                                                                                               |
| 4   | Conjunto de `position` de `CfdiConcept`                                                      | Exactamente `{1, 2, …, n}`, sin huecos ni duplicados                                                                                                                |
| 5   | Número de `CfdiTax` con `conceptSlot = 0`                                                    | Número de impuestos globales extraídos en este intento                                                                                                              |
| 6   | Número de `CfdiTax` con `conceptSlot > 0`, agrupado por `conceptSlot`                        | Número de impuestos de cada concepto extraídos en este intento, concepto a concepto                                                                                 |
| 7   | Conjunto de `position` de `CfdiTax` dentro de cada `conceptSlot`                             | Exactamente `{1, 2, …, m}` para cada contenedor, sin huecos ni duplicados                                                                                           |

##### AD-10.1.1 — El checksum: de criterio de reutilización a evidencia de procedencia

**Historial de esta subsección.** Dos revisiones independientes discreparon sobre si conteos y posiciones bastaban para aceptar un agregado preexistente. La síntesis entonces adoptada añadía una comparación O(1) del `Document.checksumSha256` persistido contra el calculado en el intento, y **habilitaba la reutilización** cuando coincidían.

> ⚠ **La rama de reutilización queda derogada (D-007).** No porque el argumento del checksum fuera débil —sigue siendo correcto que la forma no prueba el contenido—, sino porque **la pregunta ya no se plantea**: con la transacción única, un `Cfdi` preexistente junto a un `Document` en `PROCESSING` es un estado imposible (§10.0.2), no un candidato a reutilizar. Ninguna comparación de checksum puede convertir una violación de invariante en un éxito.

**Qué conserva su valor, y dónde:**

| Uso                                                                                                                         | Estado                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Escribir el checksum en la misma transacción que el agregado (AD-6)                                                         | **Vigente y obligatorio** — hace cierta la implicación «el `Cfdi` existe ⟹ su checksum existe ⟹ el `Document` está `PROCESSED`» |
| Comparar el checksum persistido contra el calculado, **para reutilizar** un agregado                                        | **DEROGADO** — no existe ruta de reutilización                                                                                  |
| Comparar el checksum contra los **bytes originales de Storage** al diagnosticar una violación de invariante o al reprocesar | **Vigente** — es la única comparación que demuestra **procedencia**, y solo el worker puede hacerla (principio 5 de §10.0.1)    |

**Por qué la comparación de procedencia sigue importando.** Cuando se escala una violación de invariante (§10.0.2), la vía aprobada de resolución es **re-encolar**: el worker descarga el objeto, recalcula el SHA-256 sobre los bytes reales y puede entonces afirmar —o negar— que el agregado persistido proviene de ese documento. Esa es evidencia de procedencia; la coherencia interna del agregado no lo es. El reconciliador, que no descarga nada, **nunca** puede sustituirla (§10.2.1).

##### AD-10.1.2 — Transacción A: forma, secuencia y frontera de errores

**Forma: transacción interactiva, no de arreglo.** La Transacción A es `prisma.$transaction(async (tx) => { … })`, **no** la forma de arreglo `$transaction([ … ])`. La forma de arreglo ejecuta operaciones independientes y no permite leer un resultado intermedio para decidir el siguiente paso; la secuencia de abajo —consultar, ramificar, `upsert`, releer, verificar— solo es expresable con la forma interactiva.

**Semántica de aborto que gobierna el diseño (PostgreSQL 16 + Prisma 6.19.x).** Cuando un statement dentro de una transacción viola una restricción única, PostgreSQL marca la transacción como **abortada** (SQLSTATE `25P02`) y rechaza todo comando posterior hasta el `ROLLBACK`. Prisma **no** envuelve cada operación de una transacción interactiva en un savepoint, de modo que **es imposible capturar un `P2002` dentro del callback y seguir consultando sobre el mismo `tx`** — la siguiente consulta fallaría con "current transaction is aborted". Consecuencia de diseño, vinculante:

> Dentro de la Transacción A **no se captura ningún `P2002`**. Se deja propagar; la transacción entera revierte; y la discriminación (idempotencia vs. `CFDI_DUPLICATE`) se realiza **fuera**, en el `catch` externo, sobre consultas nuevas en una conexión limpia (AD-10.2).

```
try {
  await prisma.$transaction(async (tx) => {

    // GUARDA DE INVARIANTE — NO es una ramificación de reutilización (D-007).
    // Bajo la transacción única, si el Cfdi existe entonces su commit ya dejó
    // Document = PROCESSED, y el paso 2 del flujo (§7) habría retornado antes de
    // llegar aquí. Encontrarlo con el Document aún en PROCESSING es IMPOSIBLE.
    existing = await tx.cfdi.findUnique({
      where: { documentId_companyId: { documentId, companyId } }
    })

    if (existing)
      throw new ViolacionDeInvarianteError('cfdi_preexistente_con_document_processing')
      // → rollback total. NO se reutiliza. NO se completa sobre él.
      // → NO se promueve el Document. NO es éxito idempotente.
      // → incidente (ERROR) + escalado en el catch externo (§10.0.2)

    // CREACIÓN — create() (NUNCA upsert({update:{}})), D-007:
    //   un INSERT que viola una restricción única SIEMPRE lanza y aborta la tx.
    //   Ése es exactamente el comportamiento que se busca: un detector de colisión
    //   fiable. Un upsert administrado podría resolver la carrera con una lectura
    //   interna y REUTILIZAR la fila del otro worker sin lanzar — el perdedor
    //   colgaría entonces SUS hijos de la cabecera ajena (mezcla del agregado).
    cfdi = await tx.cfdi.create({ data: { …encabezado… } })

    await tx.document.update({
      where: { id_companyId: { id: documentId, companyId } },
      data:  { checksumSha256: sha256DeEsteIntento }   // NO cambia Document.status todavía
    })

    // upsert de hijos — claves @@unique DECLARATIVAS (§4.5.2); ningún índice parcial interviene
    for (concepto of conceptosEsperados)
      await tx.cfdiConcept.upsert({
        where:  { companyId_cfdiId_position: { companyId, cfdiId: cfdi.id, position } },
        create: { … }, update: { … }
      })
    for (impuesto of impuestosEsperados)
      await tx.cfdiTax.upsert({
        where:  { companyId_cfdiId_conceptSlot_position: { companyId, cfdiId: cfdi.id, conceptSlot, position } },
        create: { … }, update: { … }
      })

    // relectura y verificación estructural (verificaciones 3–7 de AD-10.1)
    if (conteos o posiciones no coinciden con el agregado esperado)
      throw new RecoverableError()   // aborta la tx (rollback) → recuperable

    // TRANSICIÓN TERMINAL CONDICIONAL — dentro de esta MISMA transacción (D-007).
    // Es el árbitro de exclusión: el Document ya llegó en PROCESSING, así que
    // el reclamo no puede ser inicial, sino terminal.
    const d = await tx.document.updateMany({
      where: { id: documentId, companyId, status: 'PROCESSING' },
      data:  { status: 'PROCESSED' }
    })
    if (d.count !== 1)
      throw new TransicionNoConfirmadaError('document', d.count)   // rollback total

    // CIERRE DEL JOB — la comprobación de count es OBLIGATORIA, igual que arriba.
    // Sin ella, el Document quedaría PROCESSED con el Job sin cerrar: divergencia.
    const j = await tx.job.updateMany({
      where: { id: jobId, companyId, status: { in: ['QUEUED', 'PROCESSING'] } },
      data:  { status: 'COMPLETED', result: { resourceType: 'cfdi', resourceId: cfdi.id, documentId } }
    })
    if (j.count !== 1)
      throw new TransicionNoConfirmadaError('job', j.count)        // rollback total
  })
  // ÚNICO COMMIT: agregado + checksum + Document PROCESSED + Job COMPLETED.
  // Efectos externos (eventos, notificaciones, ack) SOLO después de este punto (§9.5).

} catch (e) {
  if (esViolacionDeInvariante(e))    → §10.0.2: incidente (ERROR) + escalado.
                                        NI Transacción C, NI transición terminal,
                                        NI éxito. El Document queda como estaba.
  else if (esP2002(e))               → AD-10.2  // consultas NUEVAS, fuera de la tx abortada
  else if (esTransicionNoConfirmada(e)) → AD-10.2  // mismo arbitraje por evidencia positiva
  else if (esRecuperable(e))         → relanzar el error nativo (BullMQ reintenta), sin Transacción C
  // (un error permanente detectado aguas arriba ya ejecutó su propia Transacción C — AD-11)
}
```

**No hay ruta de reutilización dentro de la transacción.** El `findUnique` inicial **no** ramifica entre «reutilizar» y «crear»: es una **guarda de invariante** con una única salida no-nominal, el rollback. La única convergencia idempotente válida ocurre **fuera** de la transacción, en AD-10.2 CASO A, y exige **evidencia completa**: mismo documento, `Cfdi` confirmado, `Document = PROCESSED`, `Job = COMPLETED` y relaciones consistentes. Ninguna de esas condiciones puede comprobarse desde dentro de una transacción que aún no ha commiteado.

**Por qué `count !== 1` y no `count === 0`.** Ambas transiciones deben afectar **exactamente una fila**. `count === 0` significa que la guarda de estado no se cumplió (otro worker cerró, el estado ya no es el esperado, o el `companyId` no corresponde). `count > 1` sería imposible con una clave primaria en el `WHERE`, pero exigir `=== 1` convierte esa imposibilidad en una aserción explícita en vez de una suposición tácita — y protege ante un `WHERE` mal construido en el futuro.

**Por qué el `Job` también aborta la transacción.** Si el `Document` pasara a `PROCESSED` y el cierre del `Job` no confirmara ninguna fila, el commit dejaría **divergencia `Document`/`Job`**: un documento procesado con un Job que nunca se cerró, invisible para el usuario que consulta API-0055 y que la reconciliación tendría que resolver a posteriori. Al abortar, no se declara éxito parcial: **o se confirman ambos, o no se confirma nada.** Las causas posibles de `count !== 1` en el `Job` —ausente, ya `COMPLETED`, `FAILED`, `CANCELLED`, en otro estado incompatible, de otro tenant, o con relación inconsistente respecto al `Document`— se discriminan **después** del rollback, en AD-10.2, nunca dentro de la transacción abortada.

El `findUnique` de `Cfdi` y los `upsert` de `CfdiConcept` y `CfdiTax` usan claves compuestas **declaradas con `@@unique` en `schema.prisma`**, por lo que Prisma Client genera sus `WhereUniqueInput` (`documentId_companyId`, `companyId_cfdiId_position` y `companyId_cfdiId_conceptSlot_position`). No se invoca ninguna API que Prisma no exponga.

**Por qué `create()` y no `upsert({ update: {} })` (D-007).** La diferencia no es estilística, es de garantía:

|                               | `create()`                                        | `upsert({ update: {} })`                                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colisión de restricción única | **Siempre** lanza `P2002` y aborta la transacción | **Puede no lanzar**: al no ser elegible para upsert nativo en Prisma 6.19.3, degrada al camino administrado (lectura interna + `INSERT`/`UPDATE`) y puede **reutilizar la fila creada por otro worker** |
| ¿Informa si creó o reutilizó? | Sí — por construcción, si retorna es porque creó  | **No**                                                                                                                                                                                                  |
| Riesgo sobre el agregado      | Ninguno: el perdedor solo revierte                | **Mezcla**: el perdedor cree haber creado la cabecera y cuelga de ella los hijos de _su_ extracción                                                                                                     |

Un upsert nativo forzado con una actualización escalar (`update: { updatedAt: … }`) tampoco sirve como árbitro: garantiza que la fila exista, pero **no informa si fue creada o reutilizada**, que es justo el dato que la decisión necesita. Ambas variantes quedan **rechazadas** como mecanismo de exclusión (§9.6).

**Qué escapa de la transacción y qué no.** Con `create()`, **dos excepciones pueden escapar y abortar la transacción**, y ambas se arbitran fuera con evidencia positiva (AD-10.2):

1. `P2002` sobre `documentId_companyId` — carrera del **mismo** documento: otro worker ya insertó la cabecera. Es una **convergencia esperada**, no un fallo.
2. `P2002` sobre `companyId_folioFiscal` — el `folioFiscal` ya pertenece a **otro** documento: duplicado fiscal genuino, sujeto a business rule pendiente (§9.3).

A ellas se suma la pérdida de la transición terminal condicional (`count === 0`), que se arbitra por el mismo camino. Los `upsert` de hijos siguen absorbiendo sus propias carreras dentro de la transacción, porque ahí sí se opera sobre una identidad declarativa ya conocida y no se necesita distinguir creación de reutilización.

**Nota sobre el checksum:** ya no existen «dos rutas». El checksum se escribe siempre en la misma transacción que crea el `Cfdi` (AD-6), por lo que «persistido» y «calculado» coinciden por construcción — no se verifica contra sí mismo. La comparación de checksum conserva valor únicamente **fuera** de este flujo, contra los bytes originales de Storage, al diagnosticar una violación de invariante o al reprocesar (AD-10.1.1).

**Restricciones explícitas:**

- Encontrar un `Cfdi` con el `documentId` y `companyId` correctos dentro de la transacción **no habilita nada**: es una violación de invariante (§10.0.2) que aborta el intento. No se reutiliza aunque supere cualquier verificación estructural.
- El worker nunca duplica hijos: toda escritura de `CfdiConcept`/`CfdiTax` es un `upsert` por identidad declarativa.
- Un agregado que no puede demostrarse consistente se trata como **error recuperable**, nunca como rechazo fiscal: es un estado transitorio de un intento interrumpido, no un defecto del comprobante.
- El worker nunca borra `CfdiConcept` ni `CfdiTax` existentes. Si sobraran hijos respecto al agregado esperado (verificaciones 3/5/6), es una inconsistencia → error recuperable + log de incidente, nunca un `DELETE` correctivo automático.

#### AD-10.2 — Discriminación de `P2002` fuera de la transacción abortada, sin `meta.target`

La discriminación descansa en dos premisas, ambas correcciones de revisiones anteriores:

**Premisa 1 — no se usa `meta.target`.** Una revisión anterior enrutaba las decisiones según el nombre de la restricción violada, leído de `error.meta.target`. Ese enfoque se retira. En Prisma 6.19.x el contenido de `meta.target` **no está garantizado** de forma estable: su forma varía según el conector y la versión (puede ser un arreglo de campos del modelo o el nombre del índice de la base de datos), y para índices creados fuera de `schema.prisma` puede no corresponder a ningún identificador que el cliente conozca. **`meta.target` no debe gobernar ningún flujo de control**; se admite únicamente como dato de diagnóstico en logs.

**Premisa 2 — toda colisión se arbitra fuera, con consultas de estado positivo.** Como fija AD-10.1.2, un `P2002` dentro de la Transacción A la deja abortada (`25P02`) y Prisma no ofrece savepoints por operación: es **imposible** capturarlo dentro del callback y seguir consultando sobre el mismo `tx`. Por eso ninguna excepción se captura dentro; todas propagan, revierten la transacción entera, y se analizan **después**, en el `catch` externo, sobre consultas nuevas en una conexión limpia.

**Decisión: arbitrar por estado consultado, no por nombre de error.** El estado de la base de datos es observable y determinista; el formato del error no lo es. La clasificación se hace con **consultas positivas** sobre las dos restricciones únicas que el diseño conoce, en este orden:

**Evidencia que debe consultarse (siempre completa, antes de clasificar):** existencia del `Document`; su `companyId`; su `status` actual; existencia y `status` del `Job`; existencia del `Cfdi`; la relación entre `Cfdi` y `Document`; y la colisión de `folioFiscal`. Un `count === 0` en el CAS **no significa por sí solo** que otro worker ganó — significa únicamente que la guarda no se cumplió, y las razones son varias.

```
En el catch externo, tras el ROLLBACK de la Transacción A,
cuando esP2002(e) o esTransicionNoConfirmada(e):

  PASO 0 — reunir evidencia (consultas nuevas, conexión limpia, primario):
     doc  = findUnique Document WHERE id_companyId = { documentId, companyId }
     job  = findUnique Job      WHERE id = jobId            (comparar job.companyId)
     own  = findUnique Cfdi     WHERE documentId_companyId = { documentId, companyId }
     dup  = findUnique Cfdi     WHERE companyId_folioFiscal = { companyId, folioFiscal }

  PASO 1 — clasificar:

  CASO D — doc == null
     → el Document no existe (integridad rota, o recurso eliminado)
     → ERROR PERMANENTE de integridad + INCIDENTE (ERROR)
     → NO reintentar ciegamente: reintentar no hará aparecer el documento

  CASO C — doc.status == 'REJECTED'
     → hay un terminal PREEXISTENTE. NO es una carrera ganada por otro worker
     → NO escribir nada; NO promover a PROCESSED (§10.0 lo prohíbe)
     → terminar sin error (el resultado fiscal ya está decidido)
     → INCIDENTE (WARN) registrando la causa: el worker estaba procesando
       un documento que ya había sido rechazado

  CASO A — doc.status == 'PROCESSED'  Y  own != null  Y  own.documentId == documentId
            Y  job != null  Y  job.status == 'COMPLETED'  Y  job.companyId == companyId
     → CARRERA DEL MISMO DOCUMENTO, agregado COMPLETAMENTE confirmado
     → CONVERGENCIA IDEMPOTENTE → este Job termina CON ÉXITO
     → NO se consume otro retry; NO Transacción C; NO se relanza el error
     → NO se escribe nada: el ganador ya dejó todo cerrado

  CASO B — doc.status == 'PROCESSED'  pero  own == null
            o  job == null  o  job.status incompatible (FAILED/CANCELLED/QUEUED/PROCESSING)
            o  job.companyId != companyId
     → INCONSISTENCIA. NO declarar éxito silencioso: el estado no cuadra
     → NO escribir nada
     → INCIDENTE (ERROR) + reconciliación explícita (§10.0.2 — violación de invariante)

  CASO E — doc.status == 'PROCESSING'  Y  own == null
     → la carrera NO está demostrada: nadie confirmó nada
     → ERROR RECUPERABLE (redelivery / reconciliación según evidencia) + INCIDENTE
     → Ver la nota sobre la semántica de bloqueo de PostgreSQL más abajo

  CASO F — dup != null  Y  dup.documentId != documentId
     → FOLIO FISCAL DE OTRO DOCUMENTO, confirmado por evidencia positiva
     → ⚠ Q-001 PENDIENTE: NO emitir REJECTED / CFDI_DUPLICATE / UnrecoverableError
     → ERROR RECUPERABLE + INCIDENTE + métrica dedicada
     → Aplica además la salvaguarda de §10.2.3: el agotamiento de intentos
       tampoco puede convertir esto en REJECTED (PROCESSING_FAILED)

  CASO G — ninguna evidencia conocida coincide
     → error técnico u otra constraint no prevista
     → ERROR RECUPERABLE + INCIDENTE (ERROR)
     → NO inspeccionar meta.target para decidir
```

**Orden de evaluación y por qué.** Se comprueban primero los estados que **invalidan** cualquier lectura de carrera (D: documento ausente; C: terminal preexistente), después el éxito (A), después la inconsistencia (B), y solo entonces las hipótesis de carrera y folio (E, F). Evaluar F antes que A clasificaría como conflicto fiscal lo que puede ser una simple convergencia; evaluar A antes que C podría promover un documento ya rechazado.

Las consultas corren **fuera** de la transacción abortada, sobre claves `@@unique` que Prisma conoce (`documentId_companyId`, `companyId_folioFiscal`, PK de `Job`) — ningún `meta.target`, ningún índice parcial. Confirman el resultado **por evidencia positiva**, no por descarte a partir de un nombre de error.

**Consultar siempre el primario, nunca una réplica.** El arbitraje decide un resultado fiscal a partir del estado observado. Una réplica con retraso puede no reflejar todavía el commit del ganador, lo que produciría un CASO E espurio donde en realidad corresponde un CASO A. Las cuatro consultas del PASO 0 deben dirigirse a la instancia primaria.

**Semántica de bloqueo de PostgreSQL — por qué no hace falta un backoff local para «esperar al ganador».** Para una restricción única **no diferible**, cuando dos transacciones intentan insertar la misma clave, PostgreSQL **bloquea a la segunda** hasta que la primera confirme o revierta; no devuelve una violación mientras el conflicto siga sin resolverse:

- si el ganador **confirma** → el perdedor recibe la violación de unicidad, **ya definitiva**;
- si el ganador **revierte** → el `INSERT` del perdedor **continúa** con normalidad.

Consecuencia de diseño: cuando el perdedor llega al `catch` con un `P2002`, el ganador **ya commiteó** — su estado es visible en el primario. **No procede introducir un backoff local para «dar tiempo» al ganador**; hacerlo solo añadiría latencia sin cambiar el resultado. Lo que sí debe contemplarse son los fallos de conexión durante el PASO 0 (tratados como recuperables) y la prohibición de clasificar contra una réplica. Y no debe afirmarse en ninguna parte que el ganador pueda seguir sin commit después de que el perdedor recibió una violación definitiva — es falso bajo esta semántica.

El CASO E, por tanto, no describe «el ganador todavía no commiteó» tras un `P2002`: describe la situación en que la transición condicional no confirmó filas **sin** que exista agregado alguno, lo que apunta a otra causa (estado cambiado por otra vía, `companyId` inconsistente, o defecto de implementación).

**Resolución sin consumir reintento.** La convergencia del caso (1) se resuelve **dentro del mismo processor**: no se relanza el error, de modo que BullMQ no cuenta un intento adicional. Esto es lo que hace que el diseño sea correcto **incluso si la colisión ocurre en el último intento** — no existe falso rechazo por agotamiento (invariante I-10, §9).

**`P2002` en los `upsert` de hijos:** un `upsert` sobre su clave única declarada resuelve por sí mismo el caso "ya existe"; su carrera se absorbe dentro de la transacción, sin escapar. No es un rechazo fiscal.

**Regla explícita:** ninguna violación relacionada con `CfdiConcept`, `CfdiTax`, ni con el mismo `documentId`, produce jamás un rechazo fiscal — son señales de idempotencia o de carrera transitoria. Y `CFDI_DUPLICATE` **no puede emitirse todavía de forma automática**: depende de la business rule pendiente de §9.3.

---

### AD-11 — Clasificación de errores: permanentes vs. recuperables

#### Errores permanentes (no reintentables)

Se implementan con `UnrecoverableError` de BullMQ. **Antes de lanzar `UnrecoverableError`**, el processor debe ejecutar la Transacción C (`markAsRejected` + `markAsFailed`) — la persistencia en DB ocurre primero, el error se lanza después como señal a BullMQ de que no debe reintentar.

| Error                                                                                                                                                                                                                                                                           | `rejectionReason`                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| XML malformado                                                                                                                                                                                                                                                                  | `XML_INVALID`                            |
| Archivo no XML (`fileType ≠ 'XML'`)                                                                                                                                                                                                                                             | `UNSUPPORTED_FILE_TYPE`                  |
| Versión CFDI no soportada                                                                                                                                                                                                                                                       | `UNSUPPORTED_CFDI_VERSION`               |
| Estructura CFDI inválida                                                                                                                                                                                                                                                        | `CFDI_STRUCTURE_INVALID`                 |
| ⚠ CFDI con `folioFiscal` duplicado — confirmado por evidencia positiva en el `catch` externo (otro documento con el mismo `folioFiscal`, AD-10.2). **BLOQUEADO: business rule pendiente (§9.3).** Hasta su aprobación se trata como recuperable + incidente, no como permanente | `CFDI_DUPLICATE` _(no emitible todavía)_ |
| Objeto de Storage definitivamente inexistente                                                                                                                                                                                                                                   | `STORAGE_OBJECT_NOT_FOUND`               |

#### Errores recuperables (reintentables)

El processor relanza el error nativo sin `UnrecoverableError`. El documento permanece en `PROCESSING` durante los intentos restantes. La Transacción C NO se ejecuta en este caso.

| Tipo                                          | Ejemplos                                                                                                                                                                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storage temporalmente no disponible           | MinIO 503, timeout de red                                                                                                                                                                                                                               |
| Base de datos temporalmente no disponible     | Conexión PostgreSQL fallida                                                                                                                                                                                                                             |
| Timeout transitorio                           | Operación I/O que excede el timeout                                                                                                                                                                                                                     |
| Agregado no verificable (AD-10.1)             | Conteos o posiciones del agregado escrito **en este intento** que no coinciden con lo esperado tras el upsert de hijos. _(Un `Cfdi` **preexistente** no cae aquí: hallarlo es violación de invariante, §10.0.2, no un error recuperable de contenido.)_ |
| Carrera entre intentos concurrentes (AD-10.2) | `P2002` en un `upsert` de hijo; `P2002` al hacer `create()` del `Cfdi` que el arbitraje por evidencia positiva no logra explicar (casos (2) con business rule pendiente y (3) de AD-10.2)                                                               |

> **No confundir con la convergencia idempotente.** El caso (1) de AD-10.2 —el `Cfdi` propio existe y el `Document` está `PROCESSED`— **no es un error de ninguna clase**: es un **éxito**. El processor retorna normalmente, sin relanzar, sin Transacción C y sin consumir un reintento. Clasificarlo como recuperable haría que una carrera perfectamente resuelta gastara intentos y pudiera terminar en un rechazo falso al agotarlos.

**Criterio de frontera entre ambas clases:** un error es permanente solo si **el contenido del documento** lo hace imposible de procesar — un XML mal formado seguirá mal formado en el siguiente intento. Las inconsistencias de agregado y las carreras son propiedades del **estado transitorio del sistema**, no del documento, y por eso son siempre recuperables: reintentarlas converge. Clasificarlas como permanentes produciría rechazos fiscales falsos.

**Agotamiento de intentos:** Cuando se agotan los `JOBS_ATTEMPTS` intentos totales (1 inicial + N−1 reintentos) para un error recuperable, el handler `@OnWorkerEvent('failed')` — **solo en su invocación terminal**, según el criterio de AD-4.2 — ejecuta la Transacción C con `rejectionReason = 'PROCESSING_FAILED'`. En las invocaciones no-terminales del mismo handler no se toca ningún estado persistido.

> ⚠ **Salvaguarda obligatoria de Q-001 antes de todo `PROCESSING_FAILED` (§10.2.3).** Como la colisión de folio con otro documento se clasifica hoy como **recuperable** (Q-001 pendiente), el agotamiento de intentos convertiría esa colisión en `REJECTED (PROCESSING_FAILED)` — **tomando por omisión la decisión fiscal que Q-001 prohíbe tomar**. Por eso el handler terminal debe comprobar primero, con una consulta de evidencia positiva, si existe un `Cfdi` con el mismo `companyId_folioFiscal` y **distinto** `documentId`:
>
> - **Sí existe** → **no** se ejecuta la Transacción C. `Document` permanece en `PROCESSING`; `Job = FAILED`; incidente con causa `PENDIENTE_Q001_FOLIO_DUPLICADO` + métrica. La decisión fiscal queda **detenida**, no resuelta.
> - **No existe** → agotamiento genuino → Transacción C con `PROCESSING_FAILED`, como estaba previsto.
>
> Ningún estado nuevo se introduce: `PROCESSING` y `FAILED` ya existen en los enums del schema.

#### Propietario de transiciones terminales

```
Error permanente detectado en processor:
  1. Ejecutar Transacción C  ← DB primero
  2. Lanzar UnrecoverableError  ← señal a BullMQ después (no reintenta)
  3. El handler 'failed' se dispara una vez, clasifica como terminal,
     y su Transacción C resulta no-op (WHERE no encuentra filas) — AD-4.2

Error recuperable detectado en processor (intento NO terminal):
  1. Relanzar el error nativo  ← BullMQ reintenta
  2. NO ejecutar Transacción C
  3. El handler 'failed' SÍ se dispara, pero clasifica como NO terminal
     y no toca ningún estado — el Document sigue en PROCESSING

Error recuperable en el ÚLTIMO intento (handler 'failed' terminal, AD-4.2):
  1. Ejecutar Transacción C condicional (PROCESSING_FAILED)
  2. Reconciliación (§10) como respaldo si el handler nunca corrió
```

---

### AD-12 — Política de retención en BullMQ: `removeOnComplete` y `removeOnFail`

**Decisión:** Configurar retención combinada (count + age) y reintentos en `BullModule.registerQueue` del `JobsModule`, leyendo todos los valores de la configuración central (§10.3) — ningún número hardcodeado:

```typescript
BullModule.registerQueue({
  name: XML_EXTRACTION_QUEUE_NAME,
  defaultJobOptions: {
    attempts: config.JOBS_ATTEMPTS,
    backoff: { type: 'exponential', delay: config.JOBS_BACKOFF_DELAY_MS },
    removeOnComplete: {
      count: config.JOBS_REMOVE_ON_COMPLETE_COUNT,
      age: config.JOBS_REMOVE_ON_COMPLETE_AGE_SECONDS,
    },
    removeOnFail: {
      count: config.JOBS_REMOVE_ON_FAIL_COUNT,
      age: config.JOBS_REMOVE_ON_FAIL_AGE_SECONDS,
    },
  },
});
```

**`backoff.delay` no es `defaultJobOptions.delay` — no confundir los dos:** BullMQ tiene dos opciones distintas con nombres parecidos:

- **`backoff.delay`** (la que usa esta decisión): el retraso **entre reintentos** de un Job que falló — solo se aplica cuando BullMQ reintenta.
- **`defaultJobOptions.delay`**: retrasaría la **primera ejecución de todo Job nuevo**, incluidos los que nunca fallan. **No debe configurarse** en `registerQueue` — su presencia retrasaría innecesariamente cada extracción XML desde el momento en que se encola, incluso en el caso feliz sin ningún reintento.

Este addendum usa exclusivamente `backoff.delay = JOBS_BACKOFF_DELAY_MS`. En ningún lugar de esta especificación se propone establecer `defaultJobOptions.delay`, y la implementación no debe agregarlo.

**Alineación con `BullMqJobsQueueAdapter` — fuente única de verdad:**

El archivo `apps/api/src/modules/jobs/bullmq-jobs-queue.adapter.ts` (Bloque D) actualmente pasa opciones por-Job en `queue.add()`:

```typescript
const ATTEMPTS = 3;
const BACKOFF_DELAY_MS = 1000;
// ...
await this.queue.add(XML_EXTRACTION_JOB_NAME, payload, {
  jobId: payload.jobId,
  attempts: ATTEMPTS,
  backoff: { type: 'exponential', delay: BACKOFF_DELAY_MS },
});
```

marcadas explícitamente en el código como "Configuracion tecnica provisional (Bloque D, seccion 9)". Al implementar el Bloque E:

- Las constantes `ATTEMPTS` y `BACKOFF_DELAY_MS`, y las opciones `attempts`/`backoff` pasadas en `queue.add()`, **deben eliminarse** de `enqueueXmlExtraction()`.
- Ninguna opción de reintento, backoff, `removeOnComplete` ni `removeOnFail` debe pasarse por-Job en `queue.add()` — la única fuente de verdad es `registerQueue.defaultJobOptions`, leída de la configuración central (§10.3). Si ambas coexistieran, las opciones por-Job sobrescribirían silenciosamente las de `defaultJobOptions`, invalidando esta decisión sin ningún error visible.
- **No se identifica ninguna excepción a esta regla para el Bloque E** — ningún caso conocido en este bloque requiere que un Job individual tenga opciones de reintento distintas al resto de la cola `xml-extraction`. Si en el futuro surge esa necesidad, debe documentarse explícitamente como excepción en un addendum posterior, no reintroducirse silenciosamente en el adapter.
- El valor de `JOBS_BACKOFF_DELAY_MS` (default MVP `5000` ms, §10.3) reemplaza al provisional `1000` ms — justificado por la latencia observada de S3/MinIO y Prisma bajo carga.

**Criterio:**

- Los valores son **iniciales de MVP** — no constituyen contratos fiscales permanentes (rangos válidos completos en §10.3).
- La fuente de verdad de estado para API-0055 es PostgreSQL (tabla `jobs`), no Redis. Redis es caché operativa de cola.
- Jobs completados: PostgreSQL conserva el registro completo indefinidamente; Redis puede liberar según `JOBS_REMOVE_ON_COMPLETE_COUNT` / `JOBS_REMOVE_ON_COMPLETE_AGE_SECONDS` — lo que ocurra primero.
- Jobs fallidos: Redis conserva según `JOBS_REMOVE_ON_FAIL_COUNT` / `JOBS_REMOVE_ON_FAIL_AGE_SECONDS` para diagnóstico operativo; PostgreSQL los conserva indefinidamente con el `error` sanitizado.
- `removeOnFail` no constituye una DLQ. Jobs fallidos en PostgreSQL son la fuente para diagnóstico y eventual replay manual futuro (fuera de alcance del Bloque E).

---

## 5. Seguridad XML — endurecimiento del parser

Todo archivo cargado se considera **no confiable por defecto** (`docs/11_SECURITY_ARCHITECTURE.md` §16). Para el parser XML, esto implica controles adicionales específicos:

### 5.1 Principios generales

- El contenido del XML nunca se ejecuta, interpreta como código ni se usa como instrucción.
- La extensión `.xml` y el MIME type declarado por el cliente no son prueba de que el archivo sea XML válido ni seguro — solo el parser decide.
- El análisis de seguridad documental se aplica antes del análisis semántico CFDI.

### 5.2 Configuración requerida de `fast-xml-parser`

**Estado real de la dependencia (actualizado 2026-07-31, `E5-S3-T02`):** `fast-xml-parser` **ya está instalado** en `apps/api/package.json` (`dependencies`), en la **versión exacta y fijada `5.10.1`** — sin `^`, `~`, `>=` ni `latest`, conforme a la política de versión fija de esta sección. Cualquier cambio de versión exige una nueva revisión de esta sección contra la API real de la versión destino.

**Alcance de `E5-S3-T02`:** la tarea **solo instala la dependencia**. No aporta configuración, providers, servicios ni lógica de parseo. Los controles de seguridad de esta sección —**XXE, `DOCTYPE`, `ENTITY`, profundidad, número de nodos, número de atributos, `encoding` y BOM**— **siguen pendientes** y corresponden a `E5-S3-T03` (pre-validaciones sobre el Buffer) y `E5-S3-T04` (configuración del parser y límites estructurales). Instalar la dependencia **no** activa ninguna de esas protecciones.

**Superficie de API aprobada para el pipeline CFDI:**

- **`XMLParser`** — es la clase que usará Sprint 3 para el parseo del CFDI entrante.
- **`XMLValidator`** — puede utilizarse cuando corresponda, con una advertencia verificada contra la versión instalada: en `5.10.1` tanto la clase `XMLValidator` como la sobrecarga `XMLParser.parse(xmlData, validationOptions)` están marcadas **`@deprecated`** por el mantenedor, que remite al paquete separado `fast-xml-validator`. Ambas siguen presentes y funcionales en `5.10.1`; adoptar `fast-xml-validator` sería una dependencia nueva y queda **fuera del alcance de Sprint 3** — decisión diferida, no resuelta aquí.
- **`XMLBuilder`** — **queda fuera del alcance del pipeline CFDI.** El Bloque E solo consume XML entrante; nunca genera ni serializa XML. Esta exclusión es vinculante.

**Cambios de API verificados entre la línea `4.x` y `5.10.1`** (inspección directa de los tipos instalados, no supuestos): las seis opciones que esta sección requiere —`preserveOrder`, `ignoreAttributes`, `parseTagValue`, `parseAttributeValue`, `stopNodes`, `processEntities`— existen en `5.10.1` con los mismos nombres. `processEntities` acepta además un objeto de límites (`enabled`, `maxEntitySize`, `maxExpansionDepth`, `maxTotalExpansions`, `maxExpandedLength`, `maxEntityCount`, `allowedTags`, `tagFilter`), y existen `maxNestedTags`, `strictReservedNames` y `onDangerousProperty`. `addEntity()` está `@deprecated` en favor de `entityDecoder`. La firma de `tagFilter` cambió de `(tagName, jPath)` a `(tagName, jPathOrMatcher)`.

Antes de escribir código de parseo en el Bloque E, la implementación debe:

1. Mantener `fast-xml-parser` con una versión concreta y fijada (no rango abierto) en `apps/api/package.json` — **cumplido: `5.10.1`**.
2. Revisar la API real de esa versión instalada — los nombres de opciones de `fast-xml-parser` han cambiado entre versiones mayores; no asumir que las opciones descritas abajo existen literalmente con esos nombres.
3. Comprobar qué controles de la tabla siguiente el parser soporta **nativamente** vía sus opciones de configuración.
4. Para los controles que el parser **no** soporte nativamente (p. ej., límite de nodos o de atributos totales — `fast-xml-parser` no expone típicamente estos dos como opciones de configuración), implementar un recorrido/conteo manual adicional sobre el árbol ya parseado o durante el parseo — la seguridad de este bloque **no depende únicamente** de la configuración del parser.
5. No documentar en el código, comentarios ni tests opciones de `fast-xml-parser` que no existan en la versión realmente instalada.

Las siguientes opciones deben configurarse explícitamente y revisarse contra la versión instalada antes de la implementación (paso 2 arriba):

| Control                    | Configuración requerida                                                                                                         | Riesgo que mitiga                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| DTD / DOCTYPE              | Rechazar cualquier XML que contenga `<!DOCTYPE`                                                                                 | XXE, Entity injection                               |
| ENTITY externas            | Deshabilitar resolución de entidades externas                                                                                   | SSRF, XXE, lectura de filesystem                    |
| Entidades parametricas     | Deshabilitar                                                                                                                    | Billion Laughs, Entity Expansion                    |
| Recursos externos          | No resolver ninguna URL ni path durante parsing                                                                                 | SSRF                                                |
| Acceso a red/filesystem    | Cero — el parser no debe salir de la memoria del proceso                                                                        | SSRF                                                |
| Transformaciones XSLT      | No ejecutar                                                                                                                     | Ejecución de código arbitrario                      |
| Profundidad máxima         | `XML_MAX_DEPTH` (config central, §10.3)                                                                                         | Ataques de profundidad                              |
| Tamaño máximo del Buffer   | `XML_MAX_FILE_SIZE_BYTES` (config central, §10.3) — verificado antes de pasar al parser                                         | Memory exhaustion                                   |
| Número máximo de nodos     | `XML_MAX_NODE_COUNT` (config central, §10.3) — recorrido manual si el parser no lo soporta nativamente (ver paso 4 arriba)      | Memory/CPU exhaustion (explosión de nodos pequeños) |
| Número máximo de atributos | `XML_MAX_ATTRIBUTE_COUNT` (config central, §10.3) — recorrido manual si el parser no lo soporta nativamente (ver paso 4 arriba) | Memory/CPU exhaustion (explosión de atributos)      |

No depender únicamente de la configuración del parser para estos dos últimos controles: si la versión instalada no los soporta nativamente, el conteo debe implementarse como código propio de `XmlValidationService`, ejecutado sobre el resultado del parseo o durante un recorrido dedicado.

### 5.3 Pre-validaciones antes del parser

**Implementadas en `E5-S3-T03`** (`apps/api/src/modules/xml-processing/xml-pre-validation.ts`) como **función pura** `preValidateXmlBuffer(buffer, limits)`, sin NestJS y sin importar `fast-xml-parser`.

**Frontera de responsabilidad con Sprint 4 (regla vinculante).** `E5-S3-T03` decide únicamente sobre bytes y texto previos al parseo, y su única salida ante un fallo es **un error tipado interno** (`XmlPreValidationError`, con `code` discriminante). `E5-S3-T03` **no** traduce a `XML_INVALID`, **no** ejecuta la Transacción C y **no** envuelve nada en `UnrecoverableError`. Esa clasificación externa pertenece al worker de **Sprint 4** (AD-11), que es quien: (a) traduce el `code` recibido a `XML_INVALID`; (b) ejecuta la Transacción C (`REJECTED: XML_INVALID` + `Job FAILED`); y (c) determina `UnrecoverableError` para BullMQ. Ningún criterio de aceptación de `E5-S3-T03` debe exigirle ejecutar (a), (b) ni (c).

**Política fail-closed de `DOCTYPE`/`ENTITY` (regla vinculante de `E5-S3-T03`).** El escaneo del paso 4 es **textual sobre el documento completo** y rechaza aunque la cadena aparezca dentro de un comentario XML o de una sección `CDATA`. Es deliberado: distinguir el contexto exigiría parsear contenido no confiable, exactamente lo que esta prevalidación existe para evitar. Se acepta el falso positivo teórico sobre un documento que contuviera `<!DOCTYPE` o `<!ENTITY` como texto literal — un CFDI legítimo no lo contiene, y la dirección segura del error es rechazar.

**Orden obligatorio de los controles** (el orden es parte del contrato de seguridad): precondiciones de programación → Buffer vacío → tamaño → BOM sobre bytes crudos → byte `NUL` sobre bytes crudos → decodificación UTF-8 estricta → declaración de encoding → `DOCTYPE`/`ENTITY` → forma mínima. El escaneo de `NUL` **no** es redundante con la decodificación estricta: `U+0000` es UTF-8 válido, de modo que un UTF-16LE sin BOM con contenido ASCII atraviesa un decodificador `fatal: true` sin error y podría ocultar un `<!ENTITY` de un escaneo hecho solo sobre el texto decodificado.

Antes de pasar el Buffer a `fast-xml-parser`:

1. **Tamaño:** verificar que el Buffer no exceda `XML_MAX_FILE_SIZE_BYTES` (config central, §10.3). Si excede → error permanente.
2. **Normalización de BOM:** detectar y remover BOM UTF-8 (`0xEF 0xBB 0xBF`) si está presente antes de parsear. BOM en UTF-16 o UTF-32 → rechazar (encoding no soportado).
3. **Encoding:** validar que el XML declare `encoding="UTF-8"` o no declare encoding (default UTF-8). Encoding distinto de UTF-8 → rechazar con error permanente `XML_INVALID`.
4. **DOCTYPE/ENTITY scan completo:** escanear el XML normalizado completo (tras eliminar BOM y whitespace inicial, pasos 2 y 3 anteriores) para detectar `<!DOCTYPE` o `<!ENTITY` — **no solo los primeros bytes**, ya que estas declaraciones pueden aparecer en cualquier posición del prólogo XML. Rechazar inmediatamente si se encuentran; no es necesario pasar por `fast-xml-parser` para este control.
5. **Archivo binario:** si el Buffer no comienza con `<` (tras remover BOM y whitespace inicial), rechazar como `XML_INVALID` antes de parsear.

### 5.4 Pruebas negativas de seguridad requeridas

**Ubicación de cada prueba según la capa que decide.** Las pruebas de esta tabla se reparten entre dos suites distintas, conforme a la frontera de §5.3:

- **Prevalidación (`E5-S3-T03`)** → `apps/api/src/modules/xml-processing/xml-pre-validation.spec.ts`. Cubre lo que se decide sobre bytes y texto previos al parseo: `DOCTYPE`, `ENTITY`, XXE, Billion Laughs, BOM, encoding declarado, XML vacío, archivo binario/PDF renombrado. La aserción es el `code` de `XmlPreValidationError`, no `valid: false`/`XML_INVALID` — ver la frontera de §5.3.
- **`XmlValidationService` (`E5-S3-T04`)** → suite propia del servicio. Cubre lo que exige un árbol parseado: XML no bien formado, profundidad, número de nodos y número de atributos.

La columna "Resultado esperado" de abajo describe el **efecto observable de extremo a extremo** una vez integrado el worker de Sprint 4; en la suite unitaria de `E5-S3-T03` ese mismo caso se verifica como el `code` correspondiente.

El conjunto de pruebas negativas debe incluir:

| Caso                                                    | Resultado esperado                  |
| ------------------------------------------------------- | ----------------------------------- |
| XML con `<!DOCTYPE`                                     | `valid: false`, `XML_INVALID`       |
| XML con `<!ENTITY`                                      | `valid: false`, `XML_INVALID`       |
| XXE — `<!ENTITY ext SYSTEM "file:///etc/passwd">`       | `valid: false`, `XML_INVALID`       |
| Billion Laughs — entidad anidada exponencial            | `valid: false`, `XML_INVALID`       |
| Encoding UTF-16 declarado                               | `valid: false`, `XML_INVALID`       |
| BOM UTF-8 al inicio                                     | normalizado y procesado normalmente |
| BOM UTF-16 al inicio                                    | `valid: false`, `XML_INVALID`       |
| XML con profundidad > `XML_MAX_DEPTH`                   | `valid: false`, `XML_INVALID`       |
| XML con número de nodos > `XML_MAX_NODE_COUNT`          | `valid: false`, `XML_INVALID`       |
| XML con número de atributos > `XML_MAX_ATTRIBUTE_COUNT` | `valid: false`, `XML_INVALID`       |
| Archivo PDF renombrado como `.xml`                      | `valid: false`, `XML_INVALID`       |
| Archivo binario con extensión `.xml`                    | `valid: false`, `XML_INVALID`       |
| XML vacío                                               | `valid: false`, `XML_INVALID`       |

---

## 6. Modelo de datos conceptual (después del Bloque E)

```
Document (1) ──── (1) Cfdi   [@@unique(id, companyId) — nuevo, habilita FKs compuestas]
                        │
                        ├──── (*) CfdiConcept  [@@unique(companyId, cfdiId, position);
                        │              │        @@unique(id, cfdiId, companyId) — nuevo]
                        │              │
                        │              └──── (*) CfdiTax  [scope=CONCEPT, conceptSlot = position del concepto,
                        │                                  cfdiConceptId NOT NULL]
                        │
                        └──── (*) CfdiTax  [scope=CFDI, conceptSlot = 0, cfdiConceptId = null]

    Identidad única de CfdiTax (declarativa, sin nulos):
        @@unique([companyId, cfdiId, conceptSlot, position])
    + CHECK cfdi_taxes_scope_concept_check  (ata scope ↔ cfdiConceptId ↔ conceptSlot)

Document (1) ──── (1) Job
```

### 6.1 Ciclo de vida del Document

```
PENDING_UPLOAD
    │
    │ confirm-upload (verificación de objeto en Storage, creación de Job)
    ▼
PROCESSING
    │
    ├─── worker: XML válido CFDI 4.0 + Cfdi creado ──► PROCESSED
    │                                                      (checksumSha256 persistido)
    │
    └─── worker: error permanente (AD-11) ────────────► REJECTED
              (rejectionReason = código estable)         (visible en UI)
```

**Invariante:** Un Document nunca regresa a `PROCESSING` desde `PROCESSED` o `REJECTED`.

### 6.2 Ciclo de vida del Job

```
QUEUED
    │
    │ worker inicia procesamiento
    ▼
PROCESSING
    │
    ├─── resultado exitoso ──────────────────────────► COMPLETED
    │         result = { resourceType: 'cfdi', resourceId, documentId }
    │
    └─── error permanente o intentos agotados ──────► FAILED
              error = mensaje sanitizado
```

**Estado `CANCELLED`:** Reservado para cancelación explícita (no implementada en Bloque E).

---

## 7. Flujo completo del worker (Bloque E)

```
BullMQ dispara Job { jobId, documentId, companyId }
    │
    ├─ 1. Consultar Job en PostgreSQL por jobId únicamente (no filtrar por companyId del payload)
    │       Si no existe → error permanente de integridad (BullMQ no debería encolar un Job que no esté persistido)
    │       Comparar payload.companyId con Job.companyId del registro persistido
    │       Si difieren → rechazar como error permanente de integridad de payload
    │       Si Job ya es COMPLETED/FAILED → retornar sin error (idempotencia)
    │
    ├─ 2. Consultar Document en PostgreSQL por documentId + companyId
    │       Si Document no está en PROCESSING → retornar sin error (idempotencia)
    │
    ├─ 3. Verificar document.fileType
    │       Si ≠ 'XML':
    │         Transacción C (REJECTED: UNSUPPORTED_FILE_TYPE + FAILED)
    │         → UnrecoverableError
    │
    ├─ 4. JobsRepository.markAsProcessing(jobId, companyId)
    │       WHERE status IN ('QUEUED', 'PROCESSING')
    │
    ├─ 5. StorageAdapter.getObject(document.storageReference) → Buffer
    │       Error de red → Error recuperable → relanzar (BullMQ reintenta)
    │       Objeto definitivamente inexistente:
    │         Transacción C (REJECTED: STORAGE_OBJECT_NOT_FOUND + FAILED)
    │         → UnrecoverableError
    │
    ├─ 6. Calcular SHA-256 del Buffer (node:crypto) — antes de normalizar o parsear
    │
    ├─ 7. [Pre-validación de seguridad] — inspeccionar el Buffer descargado
    │       Verificar tamaño del Buffer < XML_MAX_FILE_SIZE_BYTES (config central, §10.3)
    │       Escanear el XML normalizado completo (tras eliminar BOM y whitespace inicial)
    │         para detectar <!DOCTYPE y <!ENTITY — no solo los primeros bytes,
    │         ya que estas declaraciones pueden aparecer en cualquier posición del documento
    │       Detectar y eliminar BOM UTF-8 (0xEF 0xBB 0xBF) si presente (normalización)
    │       Rechazar BOM UTF-16 o UTF-32 → XML_INVALID
    │       Verificar que el documento declare encoding="UTF-8" o no declare encoding
    │         (encoding distinto de UTF-8 → XML_INVALID)
    │       Verificar que el Buffer comienza con '<' tras BOM y whitespace inicial
    │       Si cualquier control falla:
    │         Transacción C (REJECTED: XML_INVALID + FAILED)
    │         → UnrecoverableError
    │
    ├─ 8. XmlValidationService.validate(buffer) — parseo + controles estructurales (§5.2/§5.3)
    │       XML malformado (no bien formado):
    │         Transacción C (REJECTED: XML_INVALID + FAILED)
    │         → UnrecoverableError
    │       Profundidad de nodos > XML_MAX_DEPTH:
    │         Transacción C (REJECTED: XML_INVALID + FAILED)
    │         → UnrecoverableError
    │       Número de nodos > XML_MAX_NODE_COUNT:
    │         Transacción C (REJECTED: XML_INVALID + FAILED)
    │         → UnrecoverableError
    │       Número de atributos > XML_MAX_ATTRIBUTE_COUNT:
    │         Transacción C (REJECTED: XML_INVALID + FAILED)
    │         → UnrecoverableError
    │
    ├─ 9. CfdiExtractorService.extract(xmlString)
    │       Detectar versión CFDI
    │         No soportada:
    │           Transacción C (REJECTED: UNSUPPORTED_CFDI_VERSION + FAILED)
    │           → UnrecoverableError
    │       No es comprobante CFDI:
    │         Transacción C (REJECTED: CFDI_STRUCTURE_INVALID + FAILED)
    │         → UnrecoverableError
    │       Extraer: encabezado, emisor, receptor, conceptos (con position), impuestos, ambiguousFields[]
    │
    ├─ 10. Transacción A — ÚNICA, prisma.$transaction INTERACTIVA (D-007, AD-10.1.2):
    │         try {
    │           await prisma.$transaction(async (tx) => {
    │             a. findUnique Cfdi por documentId_companyId — GUARDA DE INVARIANTE
    │                  existe   → throw ViolacionDeInvarianteError (rollback total)
    │                             NUNCA reutilizar · NUNCA completar sobre él
    │                             NUNCA promover el Document · NO es éxito (§10.0.2)
    │                  no existe → create() Cfdi  ← NUNCA upsert({update:{}})
    │                             + persistir Document.checksumSha256
    │             b. upsert de cada CfdiConcept  → where companyId_cfdiId_position
    │             c. upsert de cada CfdiTax      → where companyId_cfdiId_conceptSlot_position
    │             d. releer y comparar conteos y posiciones; discrepancia → throw RecoverableError
    │             e. TRANSICIÓN TERMINAL CONDICIONAL (árbitro de exclusión):
    │                  updateMany Document WHERE id+companyId+status='PROCESSING' → PROCESSED
    │                  count !== 1 → throw TransicionNoConfirmadaError (rollback total)
    │             f. CIERRE DEL JOB — comprobación de count OBLIGATORIA:
    │                  updateMany Job WHERE id+companyId+status IN ('QUEUED','PROCESSING')
    │                                 → COMPLETED + result
    │                  count !== 1 → throw TransicionNoConfirmadaError (rollback total)
    │                  (Document PROCESSED sin Job cerrado NO es éxito: se revierte todo)
    │           })
    │           // ÚNICO COMMIT: agregado + checksum + Document PROCESSED + Job COMPLETED
    │           // Escapan y abortan la tx: P2002 (documentId_companyId | companyId_folioFiscal)
    │           //                          y cualquier transición con count !== 1
    │         } catch (e) {
    │           esViolacionDeInvariante(e) → §10.0.2: incidente (ERROR) + escalado;
    │                 ninguna escritura, ninguna transición terminal, ningún éxito
    │           esP2002(e) o esTransicionNoConfirmada(e) → AD-10.2:
    │                 PASO 0 — evidencia completa (Document, Job, Cfdi propio, Cfdi por folio)
    │                          sobre el PRIMARIO, nunca una réplica
    │                 CASO D  Document ausente        → permanente de integridad + incidente
    │                 CASO C  Document REJECTED       → terminal preexistente; sin escritura
    │                 CASO A  PROCESSED + Cfdi propio + Job COMPLETED
    │                                                 → ÉXITO idempotente, SIN consumir retry
    │                 CASO B  PROCESSED pero Job/Cfdi incompatible
    │                                                 → inconsistencia: incidente, sin éxito
    │                 CASO E  PROCESSING sin agregado → carrera no demostrada: recuperable
    │                 CASO F  folio de OTRO documento → Q-001 PENDIENTE: recuperable +
    │                                                    incidente (NUNCA REJECTED)
    │                 CASO G  sin coincidencia        → técnico: recuperable + incidente
    │           esRecuperable(e)  → relanzar (BullMQ reintenta), sin Transacción C
    │         }
    │
    └─ 11. Efectos externos — SOLO después del commit (§9.5):
              eventos de dominio, notificaciones, telemetría, ack a BullMQ.
              Nunca antes del commit. Ninguno participa de la transacción.

@OnWorkerEvent('failed') — SE DISPARA EN CADA INTENTO FALLIDO, no solo al agotarse (AD-4.1):
    esTerminal = (error instanceof UnrecoverableError)
                 OR (job.attemptsMade >= (job.opts.attempts ?? 1))
    Si NO esTerminal:
      → solo log sanitizado (WARN); NO tocar Document ni Job; BullMQ reintentará
    Si esTerminal:
      → SALVAGUARDA Q-001 PREVIA (§10.2.3) — consultar evidencia positiva:
          ¿existe Cfdi con mismo companyId_folioFiscal y OTRO documentId?
            SÍ → NO ejecutar Transacción C. Document sigue PROCESSING;
                 Job = FAILED; incidente PENDIENTE_Q001_FOLIO_DUPLICADO + métrica
            NO → Transacción C condicional (WHERE Document.status='PROCESSING')
                 con rejectionReason = PROCESSING_FAILED
      → log sanitizado (ERROR)
    [La reconciliación (§10) actúa como tercera capa si el handler nunca corrió]
```

---

## 8. Grafo de módulos — evitar dependencias circulares

El worker necesita acceso a: `StorageAdapter`, `DocumentsRepository`, `JobsRepository`, `XmlProcessingModule` y persistencia de CFDI. Si el processor vive dentro de `JobsModule` y accede a `DocumentsService`, se genera el ciclo:

```
DocumentsModule → JobsModule → DocumentsModule  ← CIRCULAR, NO PERMITIDO
```

**Arquitectura de módulos recomendada:**

```
DocumentsModule
  imports: [StorageModule, JobsModule]
  exports: [DocumentsService]
  providers: [DocumentsController, DocumentsService, DocumentsRepository, DocumentsAuthorizationService]

JobsModule  (productor, ya existente)
  imports: [BullModule (condicional)]
  exports: [JobsService]
  providers: [JobsService, JobsRepository, JOBS_QUEUE_ADAPTER]
  ← NO importa DocumentsModule ni CfdiModule

XmlProcessingModule  (nuevo)
  imports: [StorageModule, BullModule.registerQueue (condicional)]
  providers: [
    XmlExtractionProcessor,    ← el @Processor vive aquí
    XmlValidationService,
    CfdiExtractorService,
  ]
  ← Inyecta directamente: DocumentsRepository y JobsRepository (no los servicios completos)
  ← DocumentsModule y JobsModule exportan sus respectivos Repositories si es necesario,
     o XmlProcessingModule accede a ellos via PrismaService directamente con sus propias instancias de repositorio

CfdiModule  (nuevo)
  providers: [CfdiController, CfdiService, CfdiRepository]
  exports: [CfdiRepository]   ← exportado para que XmlProcessingModule lo use
```

**Regla clave:** El worker (`XmlExtractionProcessor`) no debe depender de `DocumentsService` ni de `JobsService` completos — solo necesita los métodos de repositorio para actualizar estados. Si exportar `DocumentsRepository` o `JobsRepository` desde sus módulos padre crea acoplamiento innecesario, el worker puede instanciar repositorios propios usando `PrismaService` directamente, siempre que ejecute las mismas queries con los mismos patrones de tenant safety.

**Prohibición:** No usar `forwardRef` como solución predeterminada para resolver ciclos. Si un ciclo aparece durante la implementación, debe resolverse mediante este grafo o mediante segregación de interfaces, no mediante referencias circulares diferidas.

---

## 9. Idempotencia y transacciones (resumen)

> Esta sección resume la decisión **D-007** (`brain/DECISIONS.md`), que es la fuente de verdad.

| Operación                                             | Idempotente                                                      | Mecanismo                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crear `Cfdi`                                          | Sí (por retorno idempotente del §7 paso 2, no por reutilización) | `findUnique` como **guarda de invariante** (si existe → rollback, §10.0.2; **nunca** reutilización) → **`create()`** dentro de la tx única. El `P2002` propaga (nunca se captura dentro: la tx queda abortada, `25P02`) y el arbitraje por **evidencia positiva** corre en el `catch` externo (AD-10.2), nunca por `meta.target`. El checksum **no** autoriza reutilización alguna (AD-10.1.1). **`upsert({ update: {} })` está prohibido aquí** (§9.6) |
| Crear/completar `CfdiConcept`, `CfdiTax`              | Sí (misma tx)                                                    | `upsert` por identidad **declarativa** (`@@unique`), verificación de conteos y posiciones antes de continuar (AD-10.1). Aquí sí es correcto: la identidad ya es conocida y no se necesita distinguir creación de reutilización                                                                                                                                                                                                                          |
| Transición terminal `Document PROCESSING → PROCESSED` | Sí                                                               | `updateMany WHERE status = 'PROCESSING'` + comprobación de `count`, **dentro de la misma tx** — árbitro de exclusión de commit (AD-10)                                                                                                                                                                                                                                                                                                                  |
| `Job → COMPLETED`                                     | Sí                                                               | `updateMany WHERE status IN ('QUEUED','PROCESSING')`, **dentro de la misma tx** — evita divergencia `Document`/`Job`                                                                                                                                                                                                                                                                                                                                    |
| Transacción A completa                                | Sí (atómica)                                                     | Una sola `prisma.$transaction` **interactiva**: agregado + checksum + transición terminal + `Job` en **un solo commit**. Un agregado parcial no es alcanzable, y no existe ventana «`Cfdi` existe pero `Document` sigue en `PROCESSING`»                                                                                                                                                                                                                |
| `markAsRejected`                                      | Sí                                                               | `UPDATE WHERE status = 'PROCESSING'` (Transacción C, sólo en fallo)                                                                                                                                                                                                                                                                                                                                                                                     |
| `markAsFailed`                                        | Sí                                                               | `UPDATE WHERE status IN ('QUEUED', 'PROCESSING')` (Transacción C)                                                                                                                                                                                                                                                                                                                                                                                       |

### 9.1 Lo que D-007 garantiza — y lo que explícitamente no

**Garantiza:**

- **Exclusión de commit** — sólo una ejecución puede confirmar el agregado.
- **Atomicidad** — cabecera, hijos, checksum y estado terminal comparten commit.
- **Convergencia idempotente** — el perdedor termina con éxito, sin consumir reintento.
- **Imposibilidad de dos agregados confirmados** para el mismo documento.

**NO garantiza (limitación declarada, no defecto):** la exclusión es **de commit, no un claim anticipado**. Dos workers pueden, antes de intentar persistir:

- descargar el mismo archivo de Storage;
- parsearlo y validarlo;
- ejecutar OCR o llamadas a IA, si el flujo llegara a incorporarlas;
- consumir CPU, memoria, ancho de banda y —en el futuro— créditos de terceros.

Ese trabajo duplicado se **descarta** en el rollback del perdedor: es coste, no corrupción. Se acepta en el MVP porque las operaciones previas son de lectura y repetibles. **Si en el futuro esas operaciones tuvieran coste, créditos o efectos irreversibles, deberá evaluarse una estrategia de _claim_/_lease_ previo** (§9.4) — condición de revisión registrada en D-007.

### 9.2 Estado de implementación — qué es diseño y qué es código

| Pieza                                                                               | Estado real (verificado contra el repositorio)                                                                              |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `Document`, `Cfdi` (solo cabecera), `Job` en `schema.prisma`                        | **Implementado** — NIVEL B                                                                                                  |
| Transición `PENDING_UPLOAD → PROCESSING` con `updateMany` + `count`                 | **Implementado** en `DocumentsRepository.confirmUpload` — NIVEL B                                                           |
| `JobsModule` como **productor** BullMQ (`attempts: 3`, backoff exponencial 1000 ms) | **Implementado**, sin consumidor — NIVEL B                                                                                  |
| Worker / processor `xml-extraction`                                                 | **NO EXISTE** — diseño pendiente de implementación                                                                          |
| Modelos `CfdiConcept`, `CfdiTax`, campo `conceptSlot`                               | **NO EXISTEN** en `schema.prisma` — diseño pendiente, requieren migración                                                   |
| Transacción A única, `create()`, transición terminal condicional                    | **Decisión arquitectónica ratificada (D-007, ACEPTADA el 2026-07-25), implementación autorizada — todavía no implementada** |

Ninguna afirmación de este addendum sobre el worker describe código existente. Toda la §7 es especificación.

### 9.3 Business rule pendiente — `folioFiscal` duplicado de otro documento

**No aprobada.** Ver AD-3 y `brain/QUESTIONS.md` **Q-001**. Hasta que exista regla de negocio aprobada por el responsable de producto, el worker **no fija `REJECTED`/`CFDI_DUPLICATE` automáticamente**: registra incidente y clasifica como recuperable. Este es el único punto de D-007 que queda deliberadamente abierto.

### 9.4 Alternativa futura — _claim_ / _lease_ explícito (post-MVP, NO parte de D-007)

Si la exclusión debe adelantarse **antes** de la extracción (por coste de OCR/IA, carga elevada, o requisitos de SLA de reproceso), la alternativa evaluada y **diferida** es un _claim_ con expiración sobre `Document`, mediante campos de ownership (por ejemplo `processingOwner`, `processingToken`, `processingStartedAt`, `leaseExpiresAt`). Ventaja principal: mejor recuperación tras caída del worker, sin esperar a la reconciliación periódica. Coste: **requiere migración**, campos nuevos, gestión de expiración y mayor complejidad operativa. **No se adopta hoy**: D-007 resuelve la corrupción del agregado sin migración alguna, y el trabajo previo duplicado es coste aceptable mientras las operaciones previas sean de lectura. Los campos concretos **no** se dan por decididos: se listan como ejemplo conceptual y deberán diseñarse si la condición de revisión se cumple.

### 9.5 Efectos externos y frontera transaccional

Todo lo revertible (cabecera, hijos, checksum, `Document.status`, `Job.status`) va **dentro** de la transacción única. Todo efecto externo va **estrictamente después del commit**, y debe ser idempotente o pasar por _outbox_:

| Efecto                                       | ¿Duplicable?             | Antes/después del commit | Tratamiento                                                                                   |
| -------------------------------------------- | ------------------------ | ------------------------ | --------------------------------------------------------------------------------------------- |
| Descarga del objeto de Storage               | Sí, pero es lectura pura | Antes                    | Aceptable — repetible sin efecto                                                              |
| Eventos de dominio (`@nestjs/event-emitter`) | Sí                       | **Después**              | Post-commit; _outbox_ si se requiere garantía de entrega                                      |
| Notificaciones                               | Sí                       | **Después**              | Post-commit; _outbox_                                                                         |
| Telemetría / logs                            | Sí                       | Ambos                    | Tolerable                                                                                     |
| Ack / estado del Job en Redis (BullMQ)       | Sí                       | **Después**              | Irreversible por naturaleza; por eso la fuente de verdad es PostgreSQL (§10)                  |
| OCR / IA con coste (no en MVP)               | Sí                       | Antes                    | **Condición de revisión de D-007**: exigiría clave idempotente y probablemente _lease_ (§9.4) |

Ningún efecto externo ejecutado antes del commit puede condicionar una decisión de negocio.

**Post-commit ≠ entrega garantizada.** Son dos propiedades distintas y no deben confundirse:

| Propiedad                       | Qué resuelve                                                                                                                       | Qué NO resuelve                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Ejecutar después del commit** | Evita efectos **prematuros**: nada se publica sobre un estado que luego revierte                                                   | **No evita la pérdida**: si el proceso cae entre el commit y la publicación, el efecto **no ocurre nunca** y nada lo detecta |
| **Outbox transaccional**        | Persiste la intención de publicar **dentro** del mismo commit; un publicador posterior la entrega con reintentos y _at-least-once_ | Exige consumidores idempotentes y añade una tabla y un publicador                                                            |

**Estado del _outbox_ en ContaIA: NO implementado y NO decidido.** No existe ninguna tabla de outbox en `schema.prisma` ni ningún publicador en el código (NIVEL B). D-007 **no** lo declara implementado ni lo introduce.

**Alcance para el Bloque E:** hoy ningún efecto externo post-commit del worker es crítico para la corrección fiscal — el resultado vive en PostgreSQL y el cliente lo consulta por _polling_ (API-0055/API-0027), no por notificación. Por eso **el Bloque E no requiere outbox** y se documenta como **post-MVP**. Esta clasificación deja de ser válida en cuanto exista un consumidor cuya pérdida de evento produzca un estado incorrecto o una acción omitida hacia el usuario (por ejemplo, notificaciones reales o integraciones salientes): en ese momento el outbox pasa a ser **requisito**, y la decisión debe registrarse formalmente. Riesgo abierto **R-007** en `brain/RISKS.md`.

### 9.6 Mecanismos rechazados (no reintroducir)

| Mecanismo                                                         | Por qué se rechaza                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `upsert({ update: {} })` como escudo de colisión                  | **No ofrece una garantía contractual de lanzar ante colisión.** Prisma no documenta que un `upsert` administrado propague siempre `P2002` frente a una carrera; su resolución puede pasar por una lectura interna y reutilizar la fila ajena. Sin esa garantía explícita, no es un detector de colisiones — y usarlo como tal arriesga la mezcla del agregado. **(Caracterización empírica: PENDIENTE, §9.7/§16.3 — el rechazo no depende de ella, ver abajo)** |
| Upsert nativo con actualización escalar (`update: { updatedAt }`) | Garantiza existencia pero **no informa si creó o reutilizó** — inútil como árbitro                                                                                                                                                                                                                                                                                                                                                                              |
| Tratar `create()` y `upsert({update:{}})` como equivalentes       | No lo son: sólo el primero lanza siempre ante colisión                                                                                                                                                                                                                                                                                                                                                                                                          |
| `P2002.meta.target` como contrato de negocio                      | Su forma no está garantizada entre conectores/versiones; sólo se admite como dato de diagnóstico en logs                                                                                                                                                                                                                                                                                                                                                        |
| Dedup por `jobId` de BullMQ como exclusión                        | Protege el **encolado**, no la **ejecución**: la recuperación de _stalled jobs_ puede reentregar un Job                                                                                                                                                                                                                                                                                                                                                         |
| Asumir que BullMQ tendrá otro intento                             | La colisión puede ocurrir en el último intento; por eso la convergencia se resuelve **dentro del processor**, sin relanzar                                                                                                                                                                                                                                                                                                                                      |
| Dividir agregado y transición terminal en dos transacciones       | Abre la ventana «`Cfdi` existe, `Document` en `PROCESSING`» que D-007 elimina                                                                                                                                                                                                                                                                                                                                                                                   |

### 9.7 Niveles de evidencia usados en este addendum

| Nivel         | Significado                                             | Ejemplos en este documento                                                                                                                                                                                  |
| ------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NIVEL A**   | Prueba ejecutada o log real                             | _(ninguno todavía en el eje de concurrencia — ver §16)_                                                                                                                                                     |
| **NIVEL B**   | Código del repositorio o de la versión exacta instalada | `Document`/`Cfdi`/`Job` en `schema.prisma`; `confirmUpload` con `updateMany`+`count`; `JobsModule` productor-only; `attempts: 3` + backoff 1000 ms; ausencia de worker; ausencia de `CfdiConcept`/`CfdiTax` |
| **NIVEL C**   | Documentación oficial                                   | Semántica de `attempts` y del evento `failed` en BullMQ 5.x; aborto de transacción (`25P02`) en PostgreSQL; ausencia de savepoints por operación en transacciones interactivas de Prisma                    |
| **NIVEL D**   | Inferencia arquitectónica                               | Ausencia de ventana entre agregado y estado terminal con la transacción única; orden de las consultas de arbitraje en AD-10.2                                                                               |
| **PENDIENTE** | No demostrado                                           | Comportamiento interno exacto de `upsert({update:{}})` en Prisma 6.19.3 (existe un script no ejecutado, §16.3); política de folio duplicado (§9.3)                                                          |

**Cómo debe enunciarse el rechazo de `upsert({ update: {} })` — precisión exigible.** El experimento que caracterizaría su comportamiento exacto **no se ha ejecutado** (§16.3). Por tanto:

| ✅ Se puede afirmar                                                                       | ❌ No se puede afirmar                                      |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Que **no existe garantía contractual suficiente** para usarlo como mecanismo de exclusión | Que se ha **comprobado** que reutiliza la fila sin lanzar   |
| Que **D-007 lo rechaza** por no ofrecer una semántica confiable y explícita               | Que un resultado experimental lo demuestra                  |
| Que `create()` **sí** tiene semántica explícita y estable                                 | Presentar como NIVEL A cualquier conclusión sobre el upsert |

Toda redacción de este addendum sobre el upsert debe leerse bajo esta regla: el argumento es **la ausencia de garantía**, no un resultado medido.

**Advertencia de dependencia de versión.** La decisión adoptada **no depende del comportamiento interno del upsert**: `create()` + restricción única es semántica de PostgreSQL, estable entre versiones — ésa es una de las razones para preferirla. Aun así, cualquier actualización mayor de Prisma debe revalidar §9.6.

**Precisión sobre «sin SQL crudo».** La ausencia de SQL crudo que D-007 invoca como fuerza de decisión se refiere **exclusivamente al mecanismo de exclusión y resolución de concurrencia**: éste se implementa con Prisma y restricciones declarativas, sin `$queryRaw`, sin `FOR UPDATE` y sin advisory locks. **No prohíbe el SQL de migración** necesario para constraints de base de datos — en particular el CHECK `cfdi_taxes_scope_concept_check` de AD-5, que es SQL manual dentro de una migración versionada y sigue siendo parte del diseño aprobado.

---

## 10. Reconciliación PostgreSQL ↔ Redis

**Problema:** Si el proceso NestJS muere abruptamente, BullMQ puede perder Jobs o no ejecutar `@OnWorkerEvent('failed')`. PostgreSQL conserva el estado; Redis puede quedar inconsistente.

### 10.0 Invariante rectora — la reconciliación nunca reescribe un estado terminal

Antes de cualquier caso concreto, esta regla gobierna toda la sección y **no admite excepciones**:

```
ÚNICA transición que la reconciliación puede aplicar sobre un Document:

    PROCESSING → REJECTED      (por agotamiento/atasco demostrado,
                                sujeto a la salvaguarda de Q-001, §10.2.3)

    PROCESSING → PROCESSED     ← PROHIBIDO A LA RECONCILIACIÓN, sin excepción
                                 Solo la Transacción A del worker puede
                                 escribir PROCESSED, y siempre en el mismo
                                 commit que el agregado (D-007).

Cualquier Document que ya esté en PROCESSED o en REJECTED es INTOCABLE
para la reconciliación. En particular:

    REJECTED → PROCESSED   ← PROHIBIDO, sin excepción
    PROCESSED → REJECTED   ← PROHIBIDO, sin excepción
    PENDING_UPLOAD → *     ← fuera del alcance de la reconciliación
```

> **Corrección (auditoría final).** Una revisión anterior autorizaba aquí `PROCESSING → PROCESSED` «con la evidencia de §10.2.2», mientras §10.2.2 ya lo prohibía. **Esa autorización queda eliminada.** El reconciliador **no tiene ninguna vía** para escribir `PROCESSED`: no posee el XML, no puede recalcular el checksum contra los bytes originales y no puede demostrar la procedencia del agregado. Escribir `PROCESSED` es competencia exclusiva del worker, dentro de la transacción única.

Toda consulta de la reconciliación que pueda derivar en una escritura sobre `Document` debe filtrar explícitamente por `status = 'PROCESSING'`, y todo `UPDATE` debe llevar además `WHERE status = 'PROCESSING'` — el filtro de lectura no basta, porque el estado puede cambiar entre la lectura y la escritura.

Una revisión anterior de este addendum condicionaba el caso principal a `Document.status ≠ PROCESSED`, lo que incluía `REJECTED` y por tanto **permitía resucitar un documento ya rechazado fiscalmente**. Ese defecto queda cerrado por esta invariante.

Simétricamente, sobre `Job`: la reconciliación solo escribe cuando `Job.status IN ('QUEUED', 'PROCESSING')`. Un `Job` en `COMPLETED` o `FAILED` es evidencia histórica y nunca se reescribe.

#### 10.0.1 Principios rectores de la reconciliación (D-007)

Estos doce principios gobiernan toda la §10 y prevalecen sobre cualquier caso concreto:

1. **La reconciliación no crea evidencia que no existe.** Solo observa y, cuando la evidencia es concluyente, cierra.
2. **No puede marcar `PROCESSED` basándose en que la estructura del agregado parezca coherente.** La coherencia interna no demuestra procedencia.
3. **Un estado imposible bajo D-007 es una violación de invariante**, no un caso a reparar automáticamente.
4. **Los datos fiscales confirmados requieren procedencia demostrable**, no plausibilidad.
5. **El checksum se compara contra la evidencia original** cuando esa evidencia esté disponible; el reconciliador no la tiene.
6. **Los conteos esperados provienen del XML o de la extracción original**, nunca se deducen únicamente del agregado almacenado (eso sería usar el dato para validarse a sí mismo).
7. **Si no hay evidencia suficiente, se escala.** Nunca se inventa un éxito.
8. **PostgreSQL es la fuente de verdad persistente.**
9. **Redis es estado operativo**, pero sus **terminales retenidos** (`completed`, `failed`) son observables y deben leerse — no equivalen a ausencia.
10. **La reconciliación es idempotente.**
11. **Ningún reconciliador modifica datos del ganador.**
12. **Ningún flujo puede producir un `PROCESSED` falso.**

#### 10.0.2 Estados imposibles bajo D-007 — violación de invariante

Con la transacción única de D-007, el agregado, el `checksumSha256`, `Document = PROCESSED` y `Job = COMPLETED` se confirman **en un solo commit**. De ahí se sigue, de forma estricta:

```
ANTES del commit:  no existe NINGÚN Cfdi visible para ese Document.
DESPUÉS del commit: existen Cfdi + hijos + checksum
                    + Document = PROCESSED + Job = COMPLETED.

No hay estado intermedio observable.
```

Por tanto, las siguientes combinaciones **no son alcanzables** por el camino normal y constituyen **violación de invariante**:

| Combinación observada                           | Diagnóstico                 |
| ----------------------------------------------- | --------------------------- |
| Existe `Cfdi` **y** `Document = PROCESSING`     | **VIOLACIÓN DE INVARIANTE** |
| Existe `Cfdi` **y** `Job` no es `COMPLETED`     | **VIOLACIÓN DE INVARIANTE** |
| `Job = COMPLETED` **y** `Document = PROCESSING` | **VIOLACIÓN DE INVARIANTE** |
| `Document = PROCESSED` **y** no existe `Cfdi`   | **VIOLACIÓN DE INVARIANTE** |

**Tratamiento obligatorio de una violación de invariante — sin excepciones:**

```
1. NO escribir nada. En particular, NO marcar PROCESSED.
2. NO cerrar el caso mediante heurística estructural.
3. Registrar INCIDENTE (ERROR) con la evidencia observada, sanitizada.
4. Conservar el estado tal cual: es la evidencia del defecto.
5. Escalar a revisión: reparación controlada o reprocesamiento explícito,
   conforme a una política operativa aprobada — nunca de forma automática.
6. El Document permanece en PROCESSING; el Job permanece como esté.
```

**Por qué no se «completa» automáticamente.** Que el agregado exista y sea internamente coherente **no demuestra** que provenga de la extracción del documento que se está reconciliando: el reconciliador no tiene el XML, no puede recalcular el checksum contra los bytes originales, y no puede saber cuántos conceptos declaraba el comprobante. Cerrar el caso como `PROCESSED` sería exactamente el **falso `PROCESSED`** que el principio 12 prohíbe. Si estos estados aparecen, o bien hay un defecto de implementación (alguien dividió la transacción), o bien hubo escritura fuera del flujo — ambos casos requieren diagnóstico humano, no una corrección silenciosa.

**Vía correcta cuando se necesita resolver el caso:** re-encolar el Job. El worker es el único componente que puede descargar el objeto, recalcular el checksum, re-extraer y comparar (AD-10.1.1). Re-encolar es seguro e idempotente. La reparación la hace quien tiene la evidencia, no quien solo ve el residuo.

### 10.1 Determinación de presencia en BullMQ — el ciclo de vida real

**Premisa corregida:** revisiones anteriores usaban el criterio _"sin Job activo en BullMQ"_ para concluir que un Job había desaparecido. Ese criterio es incorrecto: `active` es solo uno de varios estados en los que un Job puede encontrarse legítimamente, y tratarlo como el único estado vivo haría que la reconciliación considerase «desaparecido» un Job que simplemente está esperando su turno o su backoff.

**Estados de un Job en BullMQ 5.x y su tratamiento:**

| Estado devuelto por `getState()` | Significado                                                                 | Tratamiento por la reconciliación                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `waiting`                        | En cola, pendiente de ser tomado                                            | **VIVO** — no intervenir                                                                                                |
| `waiting-children`               | Esperando a Jobs hijos                                                      | **VIVO** — no intervenir                                                                                                |
| `delayed`                        | Programado para más tarde (incluye el backoff entre reintentos, AD-12)      | **VIVO** — no intervenir                                                                                                |
| `prioritized`                    | En la cola de prioridad                                                     | **VIVO** — no intervenir                                                                                                |
| `active`                         | Siendo procesado ahora                                                      | **VIVO** — no intervenir                                                                                                |
| `completed`                      | **TERMINAL RETENIDO** — terminado con éxito y **todavía presente** en Redis | **OBSERVABLE Y CONCLUYENTE** — es evidencia positiva de que BullMQ dio el Job por terminado. **No equivale a ausencia** |
| `failed`                         | **TERMINAL RETENIDO** — terminado con fallo y **todavía presente** en Redis | **OBSERVABLE Y CONCLUYENTE** — evidencia positiva de fallo terminal. **No equivale a ausencia**                         |
| `unknown`                        | BullMQ no encuentra el Job (`getJob()` devuelve `null`)                     | **AUSENTE / INDETERMINADO** — ver abajo; nunca concluyente por sí solo                                                  |

> **Distinción obligatoria: terminal retenido ≠ ausente.** Una revisión anterior agrupaba `completed` y `failed` bajo la etiqueta «NO VIVO», junto a la ausencia. Es incorrecto y peligroso: un Job en `failed` **está presente en Redis y dice algo** —que BullMQ agotó los intentos—, mientras que un Job ausente **no dice nada**. Confundirlos lleva a esperar pasivamente a que `removeOnFail` elimine el Job para «detectar» el fallo, en vez de leerlo de inmediato. **La reconciliación debe consultar el estado terminal retenido y actuar sobre él, sin esperar a la retención.**

**Tres categorías, no dos:**

| Categoría             | Estados                                                           | Qué significa                                                                                              |
| --------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **VIVO**              | `waiting`, `waiting-children`, `delayed`, `prioritized`, `active` | BullMQ sigue a cargo. **No intervenir.**                                                                   |
| **TERMINAL RETENIDO** | `completed`, `failed`                                             | BullMQ terminó y aún conserva el registro. **Evidencia observable — leerla y reconciliar explícitamente.** |
| **AUSENTE**           | `getJob() === null` **y** `getJobState() === 'unknown'`           | Sin información en Redis. Requiere el procedimiento reforzado de abajo.                                    |

**Sobre `stalled`:** no es un estado devuelto por `getState()`, sino una condición transitoria — un Job en `active` cuyo _lock_ expiró porque el worker dejó de renovarlo. BullMQ lo detecta y lo devuelve a `waiting` automáticamente. Durante esa ventana el Job aparece como `active` o `waiting` según el instante de la consulta. **La reconciliación no debe intentar detectar ni resolver Jobs `stalled`** — es responsabilidad de BullMQ, y duplicarla produciría doble procesamiento.

**Por qué `unknown` no significa «desaparecido»:** existen al menos tres razones legítimas por las que un `jobId` no se encuentra en Redis, y solo una es un problema:

1. **Retención (AD-12).** `removeOnComplete`/`removeOnFail` **eliminan** los Jobs de Redis al terminar. Para cualquier Job cuyo estado en PostgreSQL ya sea `COMPLETED` o `FAILED`, `unknown` es el resultado **esperado**, no una anomalía.
2. **Ventana de transición.** Entre dos estados hay instantes en que la consulta puede no resolver de forma estable.
3. **Pérdida real** (Redis reiniciado sin persistencia, cola purgada) — el único caso que la reconciliación debe atender.

**Procedimiento obligatorio para concluir ausencia:**

```
Un Job se considera AUSENTE DE LA COLA solo si se cumplen TODAS estas condiciones:

  a. Su estado en PostgreSQL es QUEUED o PROCESSING
     (nunca se evalúa la ausencia de un Job ya terminal en PostgreSQL — punto 1 arriba)

  b. await queue.getJob(jobId)  → devuelve null/undefined
     Y
     await queue.getJobState(jobId)  → devuelve 'unknown'
     (ambas comprobaciones, no una sola)

  c. La condición (b) se observa en 2 ciclos consecutivos de reconciliación
     (≈ 2 × JOBS_RECONCILIATION_INTERVAL_MS), para descartar la ventana de transición

  d. Ha transcurrido además el umbral de antigüedad correspondiente
     (JOBS_STALE_QUEUED_MS o JOBS_STALE_PROCESSING_MS, según el estado)
```

La búsqueda se hace **siempre por `jobId` determinista** (`queue.getJob(jobId)`), nunca recorriendo `getActive()`, `getWaiting()` ni ningún listado: esos métodos paginan, no garantizan una vista consistente bajo carga, y su coste crece con el tamaño de la cola.

**Dónde vive el contador de ciclos consecutivos (condición c, y la escalada "3 ciclos" de §10.2.2):** es **estado en memoria del proceso reconciliador** — un mapa `jobId → nº de observaciones consecutivas de la anomalía`, no una columna nueva ni una tabla (este addendum no altera el schema). Un reinicio del proceso reinicia el contador desde cero; eso es **seguro**: no provoca ninguna acción indebida, solo pospone la detección hasta volver a acumular los ciclos. La confirmación multi-ciclo es una salvaguarda contra ventanas transitorias, no un dato que deba sobrevivir a reinicios; degradar hacia "detectar más tarde" ante un reinicio es exactamente el sesgo conservador que la sección busca.

### 10.2 Reconciliación en arranque y periódica

**En arranque (`OnModuleInit` de `XmlProcessingModule`):** re-encolar los Jobs con `status = QUEUED` en PostgreSQL que resulten ausentes de la cola según §10.1, usando el `jobId` determinista (UUIDv5). BullMQ ignora el encolado si el `jobId` ya existe, por lo que la operación es idempotente. Registrar en log cuántos Jobs se reconciliaron.

En el arranque se admite omitir la condición (c) de §10.1 —la confirmación en dos ciclos— porque re-encolar es una acción **no destructiva e idempotente**: si el Job en realidad existía, BullMQ descarta el duplicado. La confirmación en dos ciclos es exigible solo para las acciones que escriben estados terminales.

**Periódica** (intervalo `JOBS_RECONCILIATION_INTERVAL_MS`, config central §10.3; activable con `JOBS_RECONCILIATION_ENABLED`):

**Matriz de reconciliación PostgreSQL × Redis.** Se evalúa siempre el par (estado persistido, estado en la cola), nunca uno solo. `Cfdi?` indica si existe un `Cfdi` para el `Document`.

| #   | PostgreSQL                                   | Redis                               | `Cfdi`?    | Acción                                                                                                                                                                               |
| --- | -------------------------------------------- | ----------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `Job = QUEUED`                               | **AUSENTE** (§10.1)                 | —          | Re-encolar en BullMQ (idempotente por `jobId`)                                                                                                                                       |
| 2   | `Job = QUEUED` o `PROCESSING`                | **VIVO**                            | —          | **No intervenir.** BullMQ sigue a cargo                                                                                                                                              |
| 3   | `Job = PROCESSING`, `Document = PROCESSING`  | **AUSENTE** (§10.1)                 | **No**     | `Job = FAILED` + `Document = REJECTED (PROCESSING_FAILED)` — con la salvedad de Q-001 (§10.2.3)                                                                                      |
| 4   | `Job = PROCESSING`, `Document = PROCESSING`  | **AUSENTE** (§10.1)                 | **Sí**     | ⚠ **VIOLACIÓN DE INVARIANTE** (§10.0.2). **NO marcar `PROCESSED`.** Incidente (ERROR) + escalar. No escribir nada                                                                    |
| 5   | `Job = PROCESSING`, `Document = PROCESSING`  | **`failed` (terminal retenido)**    | **No**     | **Leer el terminal retenido sin esperar a la retención.** `Job = FAILED` + `Document = REJECTED (PROCESSING_FAILED)` — con la salvedad de Q-001 (§10.2.3)                            |
| 6   | `Job = PROCESSING`, `Document = PROCESSING`  | **`failed` (terminal retenido)**    | **Sí**     | ⚠ **VIOLACIÓN DE INVARIANTE** (§10.0.2). Incidente + escalar. No escribir nada                                                                                                       |
| 7   | `Job = PROCESSING`, `Document = PROCESSING`  | **`completed` (terminal retenido)** | cualquiera | ⚠ **VIOLACIÓN DE INVARIANTE**: BullMQ dio el Job por completado pero PostgreSQL no registró el commit. Incidente + escalar. **Nunca marcar `PROCESSED`**                             |
| 8   | `Job = COMPLETED`, `Document = PROCESSING`   | cualquiera                          | cualquiera | ⚠ **VIOLACIÓN DE INVARIANTE** — §10.2.2                                                                                                                                              |
| 9   | `Job = FAILED`, `Document = PROCESSING`      | cualquiera                          | **No**     | `Document = REJECTED (PROCESSING_FAILED)` — con la salvedad de Q-001 (§10.2.3)                                                                                                       |
| 10  | `Job = FAILED`, `Document = PROCESSING`      | cualquiera                          | **Sí**     | ⚠ **VIOLACIÓN DE INVARIANTE**. Incidente + escalar. No escribir nada                                                                                                                 |
| 11  | `Document` terminal (`PROCESSED`/`REJECTED`) | **VIVO**                            | —          | **Divergencia.** PostgreSQL manda (§10.0). No reescribir el `Document`. Registrar incidente (WARN); dejar que BullMQ termine — el worker es idempotente y no reescribirá un terminal |
| 12  | `Document` terminal                          | **TERMINAL RETENIDO** o **AUSENTE** | —          | **Estado consistente esperado.** Ninguna acción, ningún incidente                                                                                                                    |
| 13  | `Job = COMPLETED`, `Document = REJECTED`     | cualquiera                          | —          | **Anomalía.** Incidente (ERROR), sin escritura — §10.0 prohíbe `REJECTED → PROCESSED`                                                                                                |
| 14  | `Job = FAILED`, `Document = PROCESSED`       | cualquiera                          | —          | **Anomalía.** Incidente (ERROR), sin escritura                                                                                                                                       |
| 15  | `Document = PROCESSED`, sin `Cfdi`           | cualquiera                          | **No**     | ⚠ **VIOLACIÓN DE INVARIANTE** (§10.0.2). Incidente (ERROR), sin escritura. **Nunca revertir a `REJECTED`**                                                                           |

> **Cambio respecto de la revisión anterior — y por qué.** La tabla anterior tenía un caso 2 que, ante «`Job = PROCESSING` ausente **con** `Cfdi` verificable», marcaba `Document = PROCESSED` + `Job = COMPLETED`. Ese caso se justificaba en la ventana entre «Transacción A commiteada» y «Transacción B» — **una ventana que D-007 eliminó al fusionar ambas en un único commit**. Bajo D-007 esa combinación ya no es un cierre pendiente sino un **estado imposible**, y completarlo automáticamente produciría precisamente el falso `PROCESSED` que el principio 12 prohíbe. Los casos 4, 6, 7, 8, 10 y 15 recogen ahora esas combinaciones como violaciones de invariante.
>
> **Consecuencia deliberada:** la reconciliación **ya nunca escribe `Job.result`**, porque ya no completa cierres. `Job.result` solo lo escribe la Transacción A del worker (AD-2).

**No esperar a `removeOnFail`/`removeOnComplete`.** Los casos 5, 6 y 7 se resuelven leyendo el estado terminal **mientras sigue retenido**. Diseñar la reconciliación para que actúe solo cuando el Job haya desaparecido de Redis introduce una latencia innecesaria (dependiente de la política de retención de AD-12) y confunde dos señales distintas: «BullMQ falló» y «no hay información».

**Restricciones:**

- Rige §10.0 sin excepciones.
- La reconciliación es idempotente — ejecutarla con cualquier frecuencia no produce inconsistencias.
- Si no puede completar una transición (p. ej., DB no disponible), registra el error y reintenta en el siguiente ciclo.
- Todos los valores de tiempo son iniciales de MVP (rangos válidos en §10.3).

#### 10.2.1 Qué puede demostrar el reconciliador — y qué no debe intentar

El reconciliador **no tiene el XML**: no descarga el objeto de Storage ni re-ejecuta la extracción. Por tanto **no puede** comparar los hijos persistidos contra "los conceptos que el XML declaraba" — esa comprobación pertenece al worker (AD-10.1), que sí tiene el documento en memoria. Exigírsela al reconciliador sería exigir información que no posee.

> **Corrección de alcance (D-007).** Una revisión anterior de esta subsección concluía que, siendo la transacción atómica, «al reconciliador le basta con confirmar que el `Cfdi` existe y es coherente consigo mismo». **Esa conclusión queda derogada.** Es un razonamiento circular: usa el agregado almacenado para validarse a sí mismo. La coherencia interna demuestra que **algo** se escribió atómicamente; **no** demuestra de qué extracción proviene, ni que corresponda a los bytes de este `Document`. Bajo D-007, además, la premisa cambia: si el `Cfdi` existe, el `Document` **ya debe estar `PROCESSED`** — de modo que encontrar un `Cfdi` junto a un `Document` en `PROCESSING` no es un cierre pendiente, sino una **violación de invariante** (§10.0.2).

**Qué son ahora estas comprobaciones: condición NECESARIA, nunca SUFICIENTE.** Ya no habilitan ninguna transición a `PROCESSED`. Su único uso legítimo es **diagnóstico**: caracterizar el estado observado al registrar un incidente, y distinguir un agregado estructuralmente íntegro de uno visiblemente roto. Ambos casos escalan igual; la diferencia solo informa al humano que investiga.

**Los conteos esperados no pueden deducirse del agregado almacenado** (principio 6 de §10.0.1). Provienen del XML o de la extracción original, y sólo el worker los tiene. Por eso la vía de resolución es re-encolar, no ampliar el reconciliador.

**Definición operativa de «`Cfdi` estructuralmente íntegro» (solo para diagnóstico e incidencia):**

| #   | Comprobación                                                                                      | Fuente          |
| --- | ------------------------------------------------------------------------------------------------- | --------------- |
| 1   | Existe un `Cfdi` con `documentId` = el del `Document` y `companyId` = el del `Job`                | `cfdis`         |
| 2   | `Document.checksumSha256` no es `null`                                                            | `documents`     |
| 3   | `Document.checksumSha256` es hexadecimal de 64 caracteres                                         | `documents`     |
| 4   | El `Cfdi` tiene ≥ 1 `CfdiConcept`                                                                 | `cfdi_concepts` |
| 5   | Las `position` de sus `CfdiConcept` forman `{1..n}` contiguo, sin huecos ni duplicados            | `cfdi_concepts` |
| 6   | Toda `CfdiTax` con `conceptSlot > 0` tiene un `CfdiConcept` con esa `position` en el mismo `Cfdi` | `cfdi_taxes`    |
| 7   | Las `position` de `CfdiTax` dentro de cada `conceptSlot` forman `{1..m}` contiguo                 | `cfdi_taxes`    |

Las comprobaciones 2 y 3 son posibles **porque el checksum se escribe en la misma transacción que el agregado** (AD-6). El checksum persistido solo puede compararse contra la **evidencia original** (los bytes del objeto en Storage) — comparación que el reconciliador no puede hacer y el worker sí (principio 5 de §10.0.1).

**Lo que el reconciliador tiene prohibido hacer:**

- **Marcar `Document = PROCESSED` apoyándose en estas comprobaciones.** Son diagnósticas, no habilitantes. Ninguna combinación de ellas autoriza una transición a `PROCESSED`.
- Descargar el objeto de Storage o recalcular el checksum (es trabajo del worker; multiplicaría el tráfico y el coste sin aportar garantía nueva).
- Crear, modificar o borrar `Cfdi`, `CfdiConcept` o `CfdiTax`. La reconciliación **solo** escribe `Document.status`, `Document.rejectionReason`, `Job.status` y `Job.error` — **ya no escribe `Job.result`**, porque ya no completa cierres (§10.2).
- Inferir completitud a partir de conteos «razonables», heurísticas, o del propio agregado almacenado.

**Cuando la evidencia no alcanza, se re-encola.** El worker es el único componente que puede descargar el objeto, recalcular el checksum contra los bytes originales, re-extraer y comparar (AD-10.1.1). Re-encolar es seguro e idempotente por diseño, y es la única vía aprobada para resolver una violación de invariante que requiera reparación.

#### 10.2.2 Violación de invariante — `Job = COMPLETED` con `Document = PROCESSING`

`Job = COMPLETED` y `Document = PROCESSED` se escriben **en el mismo commit** de la Transacción A única (D-007). Por tanto esta combinación **no es alcanzable** por el camino normal: es una **violación de invariante** (§10.0.2), no un cierre pendiente.

> **Derogación explícita.** La revisión anterior de esta subsección resolvía el caso marcando `Document = PROCESSED` tras seis comprobaciones estructurales. **Ese procedimiento queda derogado.** Se apoyaba en la ventana entre «Transacción A» y «Transacción B» que D-007 eliminó, y constituía exactamente la **heurística estructural hacia `PROCESSED`** que el principio 2 de §10.0.1 prohíbe: `Job.result` y el agregado almacenado son artefactos del propio proceso bajo sospecha, no evidencia independiente de su procedencia.

**Esta subsección es EXCLUSIVAMENTE de diagnóstico.** No autoriza ninguna escritura. De forma expresa, el procedimiento de §10.2.2:

- **nunca escribe `PROCESSED`**;
- **nunca escribe `COMPLETED`**;
- **nunca reconstruye un éxito** a partir de artefactos del proceso bajo sospecha;
- **nunca usa la coherencia estructural como prueba suficiente**;
- **nunca deduce procedencia fiscal**;
- **nunca modifica el agregado existente** (`Cfdi`, `CfdiConcept`, `CfdiTax`).

**Condición de entrada:** `Job.status = 'COMPLETED'` **y** `Document.status = 'PROCESSING'`. Si el `Document` está en `REJECTED`, aplica el caso 13 de §10.2 (incidente, sin escritura) — §10.0.

**Tratamiento — sin excepciones:**

```
1. NO escribir nada. En particular:
     → NO marcar Document = PROCESSED   (sería un falso PROCESSED)
     → NO marcar Document = REJECTED    (sería un rechazo fiscal falso)
     → NO reescribir el Job             (COMPLETED es evidencia histórica)

2. Registrar INCIDENTE (ERROR) desde la primera observación, con la evidencia
   sanitizada: existencia y estado del Cfdi, presencia del checksum,
   integridad estructural (§10.2.1, solo como diagnóstico), estado en Redis.

3. Escalar para reparación controlada o reprocesamiento explícito
   conforme a política operativa aprobada. La vía técnica aprobada es
   RE-ENCOLAR el Job: solo el worker puede recalcular el checksum contra
   los bytes originales y demostrar la procedencia del agregado.

4. El Document permanece en PROCESSING hasta que la reparación lo resuelva.
```

**Por qué se registra como ERROR desde el primer ciclo, y no tras tres.** La confirmación multi-ciclo existe para descartar **ventanas transitorias** de Redis (§10.1), donde la consulta puede no resolver de forma estable. Aquí no hay ventana que descartar: ambos estados se leen de PostgreSQL, que es transaccional y consistente. Si la combinación se observa, ya es definitiva.

**Por qué no se degrada a `FAILED + REJECTED`:** `COMPLETED` es evidencia de que el trabajo se realizó. Convertirlo en rechazo sin poder probar lo contrario arriesga rechazar fiscalmente un documento correctamente procesado y destruye la evidencia del intento. **Y por qué tampoco se promueve a `PROCESSED`:** el reconciliador no puede demostrar la procedencia del agregado. Un documento detenido en `PROCESSING` con un incidente visible es un estado incómodo pero **honesto**; tanto un `REJECTED` falso como un `PROCESSED` falso son datos fiscales incorrectos. Se prefiere lo primero.

#### 10.2.3 Salvaguarda de Q-001 — el agotamiento no puede rechazar por la puerta de atrás

Mientras Q-001 siga pendiente, una colisión de `folioFiscal` con **otro** documento se clasifica como **error recuperable** (AD-10.2 caso F). Esa clasificación tiene una consecuencia que debe cerrarse explícitamente:

```
folio duplicado → recuperable → BullMQ reintenta → vuelve a colisionar
  → se agotan los intentos → el handler terminal marcaría
     Document = REJECTED (PROCESSING_FAILED)

  ← Eso es una DECISIÓN FISCAL tomada por omisión, tras haberla prohibido.
```

**Regla vinculante.** Antes de aplicar cualquier `REJECTED (PROCESSING_FAILED)` —tanto en el handler terminal (AD-4.2/AD-11) como en los casos 3, 5 y 9 de §10.2— **debe comprobarse si la causa raíz es una colisión de folio pendiente de Q-001**:

```
Consulta:  findUnique Cfdi WHERE companyId_folioFiscal = { companyId, folioFiscal }
           → encontrado con documentId DISTINTO al nuestro

SÍ  → NO marcar REJECTED. NO marcar PROCESSING_FAILED.
      → Document permanece en PROCESSING
      → Job = FAILED (el trabajo técnico sí terminó sin éxito)
      → Registrar INCIDENTE con causa 'PENDIENTE_Q001_FOLIO_DUPLICADO'
      → Conservar la evidencia; la decisión fiscal queda DETENIDA
      → Métrica dedicada para dimensionar el volumen afectado

NO  → agotamiento genuino → REJECTED (PROCESSING_FAILED), como estaba previsto
```

**No se inventa ningún estado nuevo.** `Document` permanece en `PROCESSING` (valor ya existente en el enum `DocumentStatus`) y `Job` pasa a `FAILED` (valor ya existente en `JobStatus`). No se añade ninguna columna ni valor al schema: la distinción vive en el log de incidentes y en la métrica, no en el modelo de datos.

**Coste asumido y documentado:** los documentos afectados quedan detenidos en `PROCESSING` hasta que Q-001 se resuelva. Es deliberado — es preferible un documento visiblemente detenido a un rechazo fiscal no aprobado (`CLAUDE.md` regla 6). El riesgo está registrado como **R-005** en `brain/RISKS.md`.

### 10.3 Configuración central — variables obligatorias

Todas las constantes operativas del worker, la validación XML, y BullMQ deben provenir de la configuración central validada (`@contaia/config`), nunca estar hardcodeadas en el producer, el worker o el reconciliador.

**Decisión de fallo:** Si cualquiera de estas variables está definida con un valor fuera del rango válido en el arranque de la aplicación, la aplicación **debe fallar al iniciar** (fail-fast) — no existe un fallback silencioso a un valor "seguro" cuando la configuración declarada es inválida. Si la variable simplemente está ausente, se aplica el default de MVP. Todos los consumidores (producer en `JobsModule`, worker en `XmlProcessingModule`, reconciliador) leen la misma instancia de configuración validada — ninguno declara su propio default local ni número hardcodeado.

| Variable                              | Tipo              | Default MVP        | Rango válido                         | Ausente            | Valor inválido (fuera de rango) |
| ------------------------------------- | ----------------- | ------------------ | ------------------------------------ | ------------------ | ------------------------------- |
| `XML_MAX_FILE_SIZE_BYTES`             | `number` (entero) | `10485760` (10 MB) | `1024` – `104857600` (1 KB – 100 MB) | Aplica default MVP | Fallo de arranque               |
| `XML_MAX_DEPTH`                       | `number` (entero) | `50`               | `5` – `200`                          | Aplica default MVP | Fallo de arranque               |
| `XML_MAX_NODE_COUNT`                  | `number` (entero) | `100000`           | `100` – `1000000`                    | Aplica default MVP | Fallo de arranque               |
| `XML_MAX_ATTRIBUTE_COUNT`             | `number` (entero) | `50000`            | `100` – `500000`                     | Aplica default MVP | Fallo de arranque               |
| `JOBS_RECONCILIATION_ENABLED`         | `boolean`         | `true`             | `true` \| `false`                    | Aplica default MVP | Fallo de arranque               |
| `JOBS_RECONCILIATION_INTERVAL_MS`     | `number` (entero) | `300000` (5 min)   | `60000` – `3600000` (1 min – 1 h)    | Aplica default MVP | Fallo de arranque               |
| `JOBS_STALE_QUEUED_MS`                | `number` (entero) | `600000` (10 min)  | `60000` – `7200000` (1 min – 2 h)    | Aplica default MVP | Fallo de arranque               |
| `JOBS_STALE_PROCESSING_MS`            | `number` (entero) | `900000` (15 min)  | `60000` – `7200000` (1 min – 2 h)    | Aplica default MVP | Fallo de arranque               |
| `JOBS_ATTEMPTS`                       | `number` (entero) | `3`                | `1` – `10`                           | Aplica default MVP | Fallo de arranque               |
| `JOBS_BACKOFF_DELAY_MS`               | `number` (entero) | `5000`             | `100` – `60000`                      | Aplica default MVP | Fallo de arranque               |
| `JOBS_REMOVE_ON_COMPLETE_COUNT`       | `number` (entero) | `1000`             | `10` – `100000`                      | Aplica default MVP | Fallo de arranque               |
| `JOBS_REMOVE_ON_COMPLETE_AGE_SECONDS` | `number` (entero) | `86400` (24 h)     | `3600` – `2592000` (1 h – 30 días)   | Aplica default MVP | Fallo de arranque               |
| `JOBS_REMOVE_ON_FAIL_COUNT`           | `number` (entero) | `5000`             | `10` – `100000`                      | Aplica default MVP | Fallo de arranque               |
| `JOBS_REMOVE_ON_FAIL_AGE_SECONDS`     | `number` (entero) | `604800` (7 días)  | `3600` – `7776000` (1 h – 90 días)   | Aplica default MVP | Fallo de arranque               |

**Notas:**

- Los valores y rangos son **iniciales de MVP** — deben revisarse contra la carga real observada antes de producción.
- **`JOBS_ATTEMPTS` cuenta ejecuciones totales, no reintentos** (AD-4.1): `3` significa 1 intento inicial + 2 reintentos. El mínimo admitido, `1`, significa "sin reintentos"; por eso el rango empieza en `1` y no en `0` — `0` intentos dejaría el Job sin ejecutarse nunca.
- `JOBS_ATTEMPTS` y `JOBS_BACKOFF_DELAY_MS` reemplazan las constantes `ATTEMPTS` / `BACKOFF_DELAY_MS` hoy hardcodeadas en `BullMqJobsQueueAdapter` (ver AD-12) — esas constantes deben eliminarse del adapter durante la implementación del Bloque E, no coexistir con la configuración central.
- `JOBS_STALE_PROCESSING_MS` debe holgadamente exceder el tiempo total que un Job puede pasar legítimamente en reintentos con backoff exponencial (`JOBS_ATTEMPTS` × `JOBS_BACKOFF_DELAY_MS` creciente). Con los defaults MVP el peor caso de backoff es del orden de decenas de segundos frente a los 15 min del umbral, así que hay margen suficiente; si se elevan `JOBS_ATTEMPTS` o `JOBS_BACKOFF_DELAY_MS`, debe revisarse este umbral para no declarar atascado un Job que solo está esperando su siguiente reintento.
- Ningún consumidor (producer, worker, reconciliador) debe declarar un valor por defecto propio distinto al de esta tabla — la única fuente de verdad es la configuración central validada.

---

## 11. Autorización de rutas planas

Las siguientes APIs del Bloque E **no contienen `companyId` en el path**:

```
GET /documents/:documentId/download   (API-0026)
GET /documents/:documentId/cfdi       (API-0027)
GET /jobs/:jobId                      (API-0055)
```

**Patrón establecido en el proyecto** (verificado en `documents-authorization.service.ts` y `documents.controller.ts`):

1. La ruta declara `@UseGuards(AuthenticationGuard)` únicamente a nivel de route — no `CompanyGuard` (que depende de `companyId` en el path).
2. El servicio llama a `DocumentsAuthorizationService.assertHasPermission(actorUserId, companyId, permissionKey)` — donde `companyId` se obtiene del recurso ya cargado desde DB, no del path.
3. `assertHasPermission` verifica: (a) Membership activa del actor en la empresa del recurso; (b) que el Rol de esa Membership incluye el permiso requerido.

**Política de respuesta (patrón actual del proyecto):**

```
Sin relación con la empresa (sin Membership activa)  →  404  NOT_FOUND
Membership activa pero sin el permiso requerido      →  404  NOT_FOUND
Recurso inexistente                                  →  404  NOT_FOUND
```

El proyecto devuelve deliberadamente `404` en los tres casos para no filtrar la existencia del recurso a actores sin acceso (comentario explícito en `DocumentsAuthorizationService`). **No se diferencia entre "no membresía" y "sin permiso"** — ambas situaciones devuelven el mismo código para no revelar si el documento existe. Este patrón debe mantenerse en las nuevas rutas del Bloque E.

**Aplicación a las nuevas rutas:**

| Ruta                                  | Permiso requerido              | Guard de ruta         | Autorización                                         |
| ------------------------------------- | ------------------------------ | --------------------- | ---------------------------------------------------- |
| `GET /documents/:documentId/download` | `document.read`                | `AuthenticationGuard` | `DocumentsAuthorizationService` o patrón equivalente |
| `GET /documents/:documentId/cfdi`     | `cfdi.read`                    | `AuthenticationGuard` | Servicio de autorización de CfdiModule               |
| `GET /jobs/:jobId`                    | (membresía en empresa del Job) | `AuthenticationGuard` | Servicio de autorización de JobsModule               |

---

## 12. Matriz RBAC final — `cfdi.read`

**Decisión:** `cfdi.read` debe agregarse al `PERMISSION_CATALOG` del seed. Los roles con acceso son:

| Rol             | `document.read` | `cfdi.read` | Razonamiento                                                                                                    |
| --------------- | --------------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| `ADMINISTRADOR` | Sí              | **Sí**      | Obtiene todos los permisos del catálogo automáticamente (`PERMISSION_CATALOG.map(p => p.key)` — línea del seed) |
| `CONTADOR`      | Sí              | **Sí**      | Requiere datos fiscales para contabilidad                                                                       |
| `AUXILIAR`      | Sí              | **Sí**      | Requiere datos fiscales para captura                                                                            |
| `SUPERVISOR`    | Sí              | **No**      | Puede ver metadatos y descargar archivo original, no datos CFDI extraídos                                       |
| `AUDITOR`       | Sí              | **No**      | Puede ver metadatos y descargar archivo original, no datos CFDI extraídos                                       |

**Aclaraciones:**

- `document.read` no implica `cfdi.read`. Son permisos distintos con propósitos distintos.
- Acceder al archivo XML original (download) y acceder a los datos fiscales extraídos (CFDI) son operaciones con diferente sensibilidad fiscal.
- El plan original §4.4 especificaba `cfdi.read` solo para CONTADOR y AUXILIAR. Esta decisión amplía el acceso a ADMINISTRADOR, coherente con el patrón general del seed donde ADMINISTRADOR recibe todos los permisos. La documentación del plan original §4.4 deberá actualizarse para incluir a ADMINISTRADOR.
- En el seed actual, `ADMINISTRADOR` ya recibe todos los permisos explícitamente — no requiere cambio en la lógica del seed, solo agregar `cfdi.read` al `PERMISSION_CATALOG`.

---

## 13. Contratos API afectados por el Bloque E

| API      | Método + Ruta                         | Estado          | Cambio                                                     |
| -------- | ------------------------------------- | --------------- | ---------------------------------------------------------- |
| API-0026 | `GET /documents/:documentId/download` | Por implementar | Nuevo; solo en estados `PROCESSING/PROCESSED/REJECTED`     |
| API-0027 | `GET /documents/:documentId/cfdi`     | Por implementar | Requiere `cfdi.read`; incluye `concepts[]` y `cfdiTaxes[]` |
| API-0028 | `GET /companies/:companyId/cfdi`      | Por implementar | Requiere `cfdi.read`; paginado                             |
| API-0055 | `GET /jobs/:jobId`                    | Por implementar | `result` con forma definida en AD-2 cuando `COMPLETED`     |

### 13.1 Forma de respuesta API-0027

```json
{
  "id": "string",
  "documentId": "string",
  "companyId": "string",
  "folioFiscal": "string",
  "rfcEmisor": "string",
  "rfcReceptor": "string",
  "issuedAt": "ISO 8601",
  "subtotal": "string (Decimal serializado para preservar precisión)",
  "total": "string (Decimal serializado)",
  "currency": "string",
  "tipoComprobante": "string",
  "ambiguousFields": ["string"],
  "concepts": [
    {
      "id": "string",
      "position": 1,
      "claveProdServ": "string",
      "noIdentificacion": "string | null",
      "cantidad": "string",
      "claveUnidad": "string",
      "unidad": "string | null",
      "descripcion": "string",
      "valorUnitario": "string",
      "importe": "string",
      "descuento": "string | null",
      "objetoImp": "string",
      "taxes": [
        {
          "id": "string",
          "position": 1,
          "scope": "CONCEPT",
          "type": "TRANSFER | WITHHOLDING",
          "impuesto": "string",
          "tipoFactor": "string",
          "tasaOCuota": "string | null",
          "base": "string | null",
          "importe": "string | null"
        }
      ]
    }
  ],
  "cfdiTaxes": [
    {
      "id": "string",
      "position": 1,
      "scope": "CFDI",
      "type": "TRANSFER | WITHHOLDING",
      "impuesto": "string",
      "tipoFactor": "string",
      "tasaOCuota": "string | null",
      "base": "string | null",
      "importe": "string | null"
    }
  ],
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

**Consistencia del contrato de impuestos:** Los campos `position`, `scope`, `type`, `impuesto`, `tipoFactor`, `tasaOCuota`, `base`, `importe` son **idénticos** en `taxes[]` (nivel concepto) y `cfdiTaxes[]` (nivel comprobante). El campo `base` es siempre parte del contrato — puede ser `null` cuando `tipoFactor = 'Exento'` o cuando el nivel del comprobante no desglosa la base individualmente.

**Ordenamiento determinista:** `concepts[]` se ordena por `position` ascendente; `taxes[]` dentro de cada concepto y `cfdiTaxes[]` se ordenan por su propia `position` ascendente. La respuesta nunca depende del orden de inserción ni del plan de consulta.

**`conceptSlot` no se expone en la API.** Es un discriminador interno de persistencia (AD-5 §4.5.2): la API ya expresa esa misma información estructuralmente — los impuestos de concepto viajan anidados dentro de su concepto (`concepts[].taxes[]`) y los globales en `cfdiTaxes[]`. Exponerlo sería filtrar un detalle del modelo de datos sin valor para el consumidor. El agrupamiento se resuelve en el servicio: `cfdiTaxes[]` son los registros con `conceptSlot = 0`, y cada `concepts[i].taxes[]` los que tienen `conceptSlot = concepts[i].position`.

**Nota sobre decimales:** Los campos `Decimal` de Prisma se serializan como strings para preservar precisión exacta y evitar pérdida de dígitos significativos.

### 13.2 Forma de respuesta API-0055 (Job completado)

```json
{
  "jobId": "string",
  "type": "XML_EXTRACTION",
  "status": "COMPLETED",
  "companyId": "string",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601",
  "result": {
    "resourceType": "cfdi",
    "resourceId": "string",
    "documentId": "string"
  },
  "error": null
}
```

---

## 14. Seguridad y tenant isolation

| Regla                                                                      | Aplicación en Bloque E                                                                                                                                                  |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `companyId` siempre del documento persistido, nunca del cliente            | Worker lee `companyId` del Job persistido en tabla `jobs`, creado por `DocumentsService`                                                                                |
| Ninguna operación de repositorio omite `companyId`                         | `markAsProcessed`, `markAsRejected`, `findById` en `DocumentsRepository`; ídem en `JobsRepository`, `CfdiRepository`                                                    |
| `CfdiConcept.companyId` coincide con `Cfdi.companyId`                      | Garantizado por FK compuesta en base de datos (`(cfdiId, companyId) → Cfdi(id, companyId)`, AD-5); repositorio verifica además antes de insertar                        |
| `CfdiTax.companyId` coincide con `Cfdi.companyId`                          | Garantizado por FK compuesta en base de datos (`(cfdiId, companyId) → Cfdi(id, companyId)`, AD-5); repositorio verifica además antes de insertar                        |
| `CfdiTax.cfdiConceptId` apunta a concepto del mismo `cfdiId` y `companyId` | Garantizado por FK compuesta en base de datos (`(cfdiConceptId, cfdiId, companyId) → CfdiConcept(id, cfdiId, companyId)`, AD-5) — no solo por el repositorio            |
| `CfdiTax.scope`, `cfdiConceptId` y `conceptSlot` mutuamente coherentes     | Garantizado por CHECK en base de datos (`cfdi_taxes_scope_concept_check`, AD-5)                                                                                         |
| La reconciliación no puede alterar datos fiscales                          | Solo escribe `Document.status`/`rejectionReason` y `Job.status`/`result`/`error`; tiene prohibido crear, modificar o borrar `Cfdi`, `CfdiConcept` y `CfdiTax` (§10.2.1) |
| Rutas planas: autorización interna, no vía `CompanyGuard`                  | Patrón establecido: `AuthenticationGuard` + verificación de Membership en servicio                                                                                      |
| API-0055 no permite acceso entre empresas                                  | Verificar Membership del actor en la empresa del Job                                                                                                                    |
| API-0027, 0028 requieren `cfdi.read`                                       | `PermissionGuard` con `@RequiredPermission('cfdi.read')` para rutas company-scoped; autorización interna para rutas planas                                              |
| `storageReference` nunca expuesto                                          | API-0026 devuelve solo la URL prefirmada temporal                                                                                                                       |
| Contenido del archivo es no confiable                                      | La API nunca sirve el contenido directamente; solo URL prefirmada; controles de §5                                                                                      |

---

## 15. Criterios de aceptación actualizados

Los criterios 1–12 del plan original (§7) siguen vigentes. Criterios adicionales derivados de este addendum:

| #   | Criterio                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Origen                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 13  | Un CFDI 4.0 válido crea registros `Cfdi`, `CfdiConcept` (con `position`) y `CfdiTax` en PostgreSQL                                                                                                                                                                                                                                                                                                                                                                               | AD-5                                                                      |
| 14  | API-0027 devuelve `concepts[]`, `concepts[].taxes[]` y `cfdiTaxes[]` ordenados por `position` ascendente, y no expone `conceptSlot`                                                                                                                                                                                                                                                                                                                                              | AD-5, §13.1                                                               |
| 15  | Un XML con versión CFDI 3.3 termina en `REJECTED` con `rejectionReason = 'UNSUPPORTED_CFDI_VERSION'`                                                                                                                                                                                                                                                                                                                                                                             | AD-8                                                                      |
| 16  | Un XML con versión CFDI 4.0 pero sin estructura de comprobante termina en `REJECTED` con `rejectionReason = 'CFDI_STRUCTURE_INVALID'`                                                                                                                                                                                                                                                                                                                                            | AD-8                                                                      |
| 17  | Un documento PDF o de tipo OTHER enviado al worker termina en `REJECTED` con `rejectionReason = 'UNSUPPORTED_FILE_TYPE'` sin intentar parsear                                                                                                                                                                                                                                                                                                                                    | AD-9                                                                      |
| 18  | `Document.checksumSha256` contiene el SHA-256 del objeto descargado cuando el documento es `PROCESSED`                                                                                                                                                                                                                                                                                                                                                                           | AD-6                                                                      |
| 19  | `Job.result` cuando `COMPLETED` tiene forma `{ resourceType: 'cfdi', resourceId, documentId }`                                                                                                                                                                                                                                                                                                                                                                                   | AD-2                                                                      |
| 20  | ⚠ **SUSPENDIDO POR Q-001.** Un CFDI cuyo `folioFiscal` ya pertenece a **otro** documento se detecta por evidencia positiva y **no** produce `REJECTED`/`CFDI_DUPLICATE` automático: `Document` permanece en `PROCESSING`, `Job = FAILED`, incidente `PENDIENTE_Q001_FOLIO_DUPLICADO` + métrica. En ningún caso se crean duplicados en `cfdi`. _(La redacción anterior —terminar en `REJECTED (CFDI_DUPLICATE)`— queda **sustituida** hasta que Q-001 se apruebe.)_               | AD-3, §9.3, §10.2.3                                                       |
| 21  | Un documento que agota sus `JOBS_ATTEMPTS` intentos **totales** (1 inicial + N−1 reintentos) por error recuperable termina en `REJECTED (PROCESSING_FAILED)`, no queda en `PROCESSING` — **salvo** que la causa raíz sea una colisión de folio pendiente de Q-001, en cuyo caso permanece en `PROCESSING` con incidente y `Job = FAILED`                                                                                                                                         | AD-4, AD-11, §10.2.3                                                      |
| 22  | Reintentar el mismo Job no crea duplicados de `Cfdi`, `CfdiConcept` ni `CfdiTax`                                                                                                                                                                                                                                                                                                                                                                                                 | AD-10                                                                     |
| 23  | `GET /documents/:documentId/download` retorna 200 cuando el documento está en `PROCESSING`, `PROCESSED` o `REJECTED`                                                                                                                                                                                                                                                                                                                                                             | AD-7                                                                      |
| 24  | `GET /documents/:documentId/download` retorna 404 cuando el documento está en `PENDING_UPLOAD`                                                                                                                                                                                                                                                                                                                                                                                   | AD-7                                                                      |
| 25  | XML con `<!DOCTYPE`, `<!ENTITY` o contenido XXE → `REJECTED (XML_INVALID)`                                                                                                                                                                                                                                                                                                                                                                                                       | §5                                                                        |
| 26  | XML con BOM UTF-8 → procesado normalmente tras normalización                                                                                                                                                                                                                                                                                                                                                                                                                     | §5                                                                        |
| 27  | XML con BOM UTF-16 o encoding no UTF-8 → `REJECTED (XML_INVALID)`                                                                                                                                                                                                                                                                                                                                                                                                                | §5                                                                        |
| 28  | API-0027 y API-0028 devuelven 403/404 para SUPERVISOR y AUDITOR                                                                                                                                                                                                                                                                                                                                                                                                                  | §12                                                                       |
| 29  | ADMINISTRADOR puede acceder a API-0027 y API-0028                                                                                                                                                                                                                                                                                                                                                                                                                                | §12                                                                       |
| 30  | Un usuario de otra empresa que intenta acceder a una ruta plana recibe 404                                                                                                                                                                                                                                                                                                                                                                                                       | §11                                                                       |
| 31  | Jobs completados y fallidos no se acumulan ilimitadamente en Redis                                                                                                                                                                                                                                                                                                                                                                                                               | AD-12                                                                     |
| 32  | Jobs en `QUEUED` sin entrada en Redis son re-encolados en el arranque del worker                                                                                                                                                                                                                                                                                                                                                                                                 | §10                                                                       |
| 33  | Jobs en `PROCESSING` sin actividad durante más del umbral configurado son reconciliados                                                                                                                                                                                                                                                                                                                                                                                          | §10                                                                       |
| 34  | `cfdi.read` existe en la tabla `permissions` y está asignado a ADMINISTRADOR, CONTADOR y AUXILIAR                                                                                                                                                                                                                                                                                                                                                                                | §12                                                                       |
| 35  | `CfdiTax` de concepto no puede referenciar un concepto de otro CFDI, incluso en la misma empresa — rechazado por FK compuesta en base de datos                                                                                                                                                                                                                                                                                                                                   | AD-5                                                                      |
| 36  | Un `CfdiConcept`/`CfdiTax` con `companyId` que no coincide con el de su `Cfdi` padre es rechazado por la FK compuesta en base de datos, no solo por el repositorio                                                                                                                                                                                                                                                                                                               | AD-5                                                                      |
| 37  | Un `CfdiTax` con `scope`/`cfdiConceptId` incoherentes (p. ej. `scope=CFDI` con `cfdiConceptId` no nulo) es rechazado por el CHECK de base de datos                                                                                                                                                                                                                                                                                                                               | AD-5                                                                      |
| 38  | Dos `CfdiTax` con `conceptSlot = 0` y la misma `position` para el mismo `Cfdi` violan `@@unique([companyId, cfdiId, conceptSlot, position])`                                                                                                                                                                                                                                                                                                                                     | AD-5                                                                      |
| 39  | Dos `CfdiTax` con el mismo `conceptSlot > 0` y la misma `position` violan la misma restricción única declarativa                                                                                                                                                                                                                                                                                                                                                                 | AD-5                                                                      |
| 40  | `prisma.cfdiTax.upsert()` y `prisma.cfdiConcept.upsert()` son invocables con sus `WhereUniqueInput` generados (`companyId_cfdiId_conceptSlot_position` y `companyId_cfdiId_position`) — la identidad no depende de ningún índice parcial                                                                                                                                                                                                                                         | AD-5, AD-10.1.2                                                           |
| 41  | Reintentar un Job cuyo `Document` ya está `PROCESSED` retorna idempotentemente **antes** de abrir la transacción (§7 paso 2). Si aun así se hallara un `Cfdi` preexistente dentro de la transacción con el `Document` en `PROCESSING`, se aborta como violación de invariante: **no se reutiliza, no se duplican hijos, no se promueve el `Document`**                                                                                                                           | §7, AD-10.1, §10.0.2                                                      |
| 42  | Un CFDI con `subtotal`, `currency` o `tipoComprobante` ausente o ambiguo termina en `REJECTED (CFDI_STRUCTURE_INVALID)`, nunca en `ambiguousFields` silencioso                                                                                                                                                                                                                                                                                                                   | §3.3                                                                      |
| 43  | Configuración fuera de rango (cualquier variable de §10.3) impide el arranque de la aplicación                                                                                                                                                                                                                                                                                                                                                                                   | §10.3                                                                     |
| 44  | BullMQ aplica `backoff.delay` únicamente entre reintentos; el primer intento de un Job nuevo no sufre el retraso de `defaultJobOptions.delay` (que nunca se configura)                                                                                                                                                                                                                                                                                                           | AD-12                                                                     |
| 45  | El handler `@OnWorkerEvent('failed')` NO modifica `Document` ni `Job` en un intento no terminal — un fallo recuperable intermedio deja el Document en `PROCESSING` y BullMQ reintenta                                                                                                                                                                                                                                                                                            | AD-4.1, AD-4.2                                                            |
| 46  | Con `JOBS_ATTEMPTS = 3`, un Job que falla siempre se ejecuta exactamente 3 veces y el handler `failed` se dispara 3 veces, ejecutando la Transacción C solo en la tercera                                                                                                                                                                                                                                                                                                        | AD-4.1                                                                    |
| 47  | La Transacción C del handler terminal es un no-op cuando el processor ya la ejecutó por error permanente — el `rejectionReason` específico no se sobrescribe con `PROCESSING_FAILED`                                                                                                                                                                                                                                                                                             | AD-4.2                                                                    |
| 48  | Hallar un `Cfdi` preexistente al entrar en la transacción (con el `Document` en `PROCESSING`) es **violación de invariante** (§10.0.2): rollback, incidente, escalado — **nunca** se compara su checksum para decidir reutilización, porque la reutilización no existe. La comparación de checksum solo cabe **fuera** del flujo, contra los bytes originales de Storage, al diagnosticar o reprocesar                                                                           | AD-10.1.1, §10.0.2                                                        |
| 49  | Un `P2002` al crear el `Cfdi` se resuelve re-consultando el estado **en el `catch` externo, fuera de la transacción abortada**, sin leer `error.meta.target`; el duplicado por folio de otro documento se confirma con evidencia positiva y, mientras su business rule siga pendiente (§9.3), **no** produce `REJECTED` automático                                                                                                                                               | AD-10.2                                                                   |
| 50  | La reconciliación nunca transiciona un `Document` desde `REJECTED` ni desde `PROCESSED` — `REJECTED → PROCESSED` es imposible por diseño                                                                                                                                                                                                                                                                                                                                         | §10.0                                                                     |
| 51  | Un Job en `waiting`, `delayed`, `prioritized` o `waiting-children` NO es tratado como ausente por la reconciliación                                                                                                                                                                                                                                                                                                                                                              | §10.1                                                                     |
| 52  | Un Job ausente de Redis por la política de retención (AD-12), cuyo estado en PostgreSQL ya es terminal, no genera ninguna acción de reconciliación                                                                                                                                                                                                                                                                                                                               | §10.1                                                                     |
| 53  | ⚠ **SUSTITUIDO POR D-007.** Un Job `PROCESSING` ausente de Redis **con** `Cfdi` existente es una **violación de invariante**: la reconciliación efectúa **cero escrituras automáticas** — ni `PROCESSED`, ni `COMPLETED`, ni `REJECTED`, ni sobre el agregado; registra incidente (ERROR) y escala a reprocesamiento controlado. _(La redacción anterior —resolverlo como `PROCESSED + COMPLETED`— se apoyaba en la ventana «Transacción A / Transacción B» que D-007 eliminó.)_ | §10.0.2, §10.2 caso 4                                                     |
| 54  | `Document.checksumSha256` queda persistido en el mismo commit que lleva el Document a `PROCESSED` — nunca en una transacción separada                                                                                                                                                                                                                                                                                                                                            | AD-6                                                                      |
| 55  | La Transacción A es interactiva (`$transaction(async (tx) => …)`), **única** (agregado + checksum + `Document → PROCESSED` + `Job → COMPLETED` en un solo commit) y el `Cfdi` se resuelve con **`create()`**; ningún `P2002` se captura dentro — la transacción revierte íntegra y el arbitraje ocurre después, sin ningún "current transaction is aborted"                                                                                                                      | AD-10, AD-10.1.2, AD-10.2, D-007                                          |
| 56  | Una carrera del mismo documento (dos ejecuciones solapadas) termina con **exactamente un** agregado confirmado; el perdedor revierte por completo y **converge como éxito idempotente** tras confirmar por evidencia positiva (`Cfdi` propio + `Document = PROCESSED`), **sin consumir un reintento**, sin Transacción C y sin emitir `CFDI_DUPLICATE`                                                                                                                           | AD-10.2 CASO A, D-007                                                     |
| 57  | `prisma validate` + `prisma generate` aceptan la relación opcional `cfdiConcept` de nulabilidad mixta; un impuesto global (`cfdiConceptId = NULL`) inserta sin evaluar esa FK (MATCH SIMPLE), mientras `cfdiId`/`companyId` siguen cubiertos por la FK a `Cfdi`                                                                                                                                                                                                                  | AD-5 §4.5.2                                                               |
| 58  | La transición terminal `Document PROCESSING → PROCESSED` se ejecuta **dentro** de la Transacción A con `updateMany` y exige **`count === 1`**; cualquier otro valor fuerza el rollback completo del agregado de ese intento                                                                                                                                                                                                                                                      | AD-10, D-007                                                              |
| 59  | Ningún punto del código usa `upsert({ update: {} })` ni un upsert con actualización escalar como mecanismo de exclusión o detección de colisión sobre `Cfdi`                                                                                                                                                                                                                                                                                                                     | §9.6, D-007                                                               |
| 60  | Una colisión que ocurre en el **último** intento de BullMQ no produce un rechazo falso: si el otro worker confirmó el agregado, el Job termina en éxito                                                                                                                                                                                                                                                                                                                          | AD-10.2 caso (1), §9.1                                                    |
| 61  | Tras un rollback no queda ningún agregado parcial visible: ni `Cfdi`, ni hijos, ni `checksumSha256`, ni cambio de estado del `Document` o del `Job`                                                                                                                                                                                                                                                                                                                              | AD-10, §9                                                                 |
| 62  | Ningún efecto externo (evento, notificación, ack) se emite antes del commit de la Transacción A                                                                                                                                                                                                                                                                                                                                                                                  | §9.5                                                                      |
| 63  | El worker no depende de la dedup por `jobId` de BullMQ para excluir ejecuciones concurrentes: una reentrega de _stalled job_ converge correctamente                                                                                                                                                                                                                                                                                                                              | §9.6, AD-10                                                               |
| 64  | El cierre `Job → COMPLETED` se ejecuta **dentro** de la Transacción A y exige **`count === 1`**; cualquier otro valor fuerza el rollback                                                                                                                                                                                                                                                                                                                                         | AD-10.1.2, D-007                                                          |
| 65  | Si el `Document` se marcó `PROCESSED` pero el `Job` no pudo cerrarse (`count !== 1`), **no se declara éxito**: la transacción revierte por completo                                                                                                                                                                                                                                                                                                                              | AD-10.1.2                                                                 |
| 66  | El arbitraje posterior al rollback consulta **toda** la evidencia (existencia y `companyId` del `Document`, su estado, existencia y estado del `Job`, existencia del `Cfdi`, relación `Cfdi`↔`Document`, colisión de folio) antes de clasificar                                                                                                                                                                                                                                  | AD-10.2                                                                   |
| 67  | **CASO A** — mismo documento con agregado completamente confirmado (`Document = PROCESSED` + `Cfdi` propio + `Job = COMPLETED`) → éxito idempotente, sin escritura y sin consumir reintento                                                                                                                                                                                                                                                                                      | AD-10.2                                                                   |
| 68  | **CASO B** — `Document = PROCESSED` con `Job` incompatible o ausente, o sin `Cfdi` propio → **inconsistencia**: no se declara éxito silencioso; incidente (ERROR) y escalado                                                                                                                                                                                                                                                                                                     | AD-10.2, §10.0.2                                                          |
| 69  | **CASO C** — `Document = REJECTED` → **no** se clasifica como carrera ganada; se aplica la política de terminal preexistente y se registra la causa; ninguna escritura                                                                                                                                                                                                                                                                                                           | AD-10.2, §10.0                                                            |
| 70  | **CASO D** — `Document` ausente → error de integridad; **no** se reintenta ciegamente                                                                                                                                                                                                                                                                                                                                                                                            | AD-10.2                                                                   |
| 71  | `Cfdi` existente junto a `Document = PROCESSING` → **violación de invariante**: incidente y escalado; **jamás** transición automática a `PROCESSED`                                                                                                                                                                                                                                                                                                                              | §10.0.2, §10.2 casos 4/6/7                                                |
| 72  | El reconciliador **no** marca `PROCESSED` apoyándose en la integridad estructural del agregado; las comprobaciones de §10.2.1 son diagnósticas, no habilitantes                                                                                                                                                                                                                                                                                                                  | §10.0.1 (principios 2 y 6), §10.2.1                                       |
| 73  | Redis `failed` **retenido** con `Document = PROCESSING` → la reconciliación actúa leyendo ese terminal, **sin esperar** a `removeOnFail`                                                                                                                                                                                                                                                                                                                                         | §10.1, §10.2 casos 5/6                                                    |
| 74  | Redis `completed` **retenido** con `Document = PROCESSING` → violación de invariante: incidente, nunca `PROCESSED` automático                                                                                                                                                                                                                                                                                                                                                    | §10.1, §10.2 caso 7                                                       |
| 75  | Redis **ausente** (`getJob() === null` y `getJobState() === 'unknown'`, confirmado en 2 ciclos) se distingue de los terminales retenidos y se reconcilia por su propia rama                                                                                                                                                                                                                                                                                                      | §10.1, §10.2 casos 1/3/4                                                  |
| 76  | Mientras Q-001 siga pendiente, **ningún** camino produce `REJECTED` automático por folio duplicado — incluido el agotamiento de intentos, que debe comprobar la causa raíz antes de aplicar `PROCESSING_FAILED`                                                                                                                                                                                                                                                                  | §9.3, §10.2.3, AD-11                                                      |
| 77  | El arbitraje consulta la instancia **primaria** de PostgreSQL, nunca una réplica con retraso                                                                                                                                                                                                                                                                                                                                                                                     | AD-10.2                                                                   |
| 78  | Los efectos externos post-commit no tienen garantía de entrega sin _outbox_; el diseño declara explícitamente si el _outbox_ es requisito MVP o post-MVP                                                                                                                                                                                                                                                                                                                         | §9.5                                                                      |
| 79  | **Ningún `Cfdi` preexistente se reutiliza** para completar un agregado nuevo: hallarlo dentro de la transacción con el `Document` en `PROCESSING` aborta el intento con rollback total                                                                                                                                                                                                                                                                                           | AD-10.1, AD-10.1.2, §10.0.2                                               |
| 80  | **El reconciliador nunca escribe `PROCESSED` ni `COMPLETED`** — no existe ninguna ruta que se lo permita; escribir `PROCESSED` es competencia exclusiva de la Transacción A del worker                                                                                                                                                                                                                                                                                           | §10.0, §10.2.2                                                            |
| 81  | La convergencia idempotente exige **evidencia completa** (mismo documento, `Cfdi` confirmado, `Document = PROCESSED`, `Job = COMPLETED`, relaciones consistentes); ninguna evidencia parcial la habilita                                                                                                                                                                                                                                                                         | AD-10.2 CASO A                                                            |
| 82  | Ningún documento del repositorio describe D-007 como aprobada, aceptada, `APPROVED`, ratificada, congelada ni lista para iniciar implementación                                                                                                                                                                                                                                                                                                                                  | `brain/DECISIONS.md`, plan, addendum, `MASTER_CONTEXT.md`, `CHANGELOG.md` |
| 83  | Ningún documento vigente (`docs/08`, `docs/15`, `docs/20`, plan) ordena `409 DUPLICATE` ni rechazo automático por folio duplicado mientras Q-001 siga abierta; las referencias históricas están marcadas como sustituidas                                                                                                                                                                                                                                                        | §9.3, §10.2.3, Q-001                                                      |

---

## 16. Pruebas requeridas

### 16.1 Pruebas unitarias

| Componente                                                       | Casos de prueba mínimos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `XmlValidationService`                                           | XML malformado, XML válido no CFDI, CFDI 4.0 válido, todas las pruebas de §5.4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `CfdiExtractorService` (`Cfdi40Extractor`)                       | CFDI 4.0 completo con conceptos e impuestos, campos opcionales ausentes → `ambiguousFields`, versión 3.3 → error, `position` preservado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `XmlExtractionProcessor` (worker)                                | Job ya COMPLETED, Job ya FAILED, Document ya PROCESSED → retorno idempotente antes de abrir la transacción; error permanente → REJECTED sin reintento; error recuperable → relanza; **`Cfdi` preexistente hallado dentro de la transacción con `Document` en `PROCESSING` → violación de invariante: rollback total, incidente, CERO escrituras — NO se reutiliza, NO se marca `PROCESSED`, NO es éxito** (§10.0.2, AD-10.1); agregado incompleto tras la relectura → error recuperable (no COMPLETED); campo obligatorio ausente (subtotal/currency/tipoComprobante) → CFDI_STRUCTURE_INVALID                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `CfdiRepository` / `CfdiConceptRepository` / `CfdiTaxRepository` | Cabecera resuelta con **`create()`** (prueba explícita de que **no** se usa `upsert({ update: {} })`, criterio 59); hijos con `upsert` por identidad declarativa (`companyId_cfdiId_position`, `companyId_cfdiId_conceptSlot_position`). El `catch` externo arbitra **por evidencia positiva** en el orden de AD-10.2: (1) `Cfdi` propio + `Document = PROCESSED` → **éxito idempotente sin relanzar ni consumir reintento**; (2) folio de otro documento → mientras la business rule siga pendiente (§9.3), recuperable + incidente, **nunca `REJECTED` automático**; (3) sin coincidencia → recuperable + incidente. Prueba explícita de que ningún `P2002` se captura dentro de la transacción (no aparece "current transaction is aborted"). **Ninguna prueba debe depender del contenido de `error.meta.target`**                                                                                                                                                                                                                                                                                |
| `@OnWorkerEvent('failed')` handler                               | Invocación no terminal (intento 1 de 3) → no escribe nada, Document sigue en `PROCESSING`; invocación terminal (intento 3 de 3) → ejecuta Transacción C; invocación terminal tras `UnrecoverableError` con Transacción C ya aplicada → no-op, no sobrescribe `rejectionReason`; prueba dedicada que fija la semántica de `attemptsMade` en la versión instalada de BullMQ (AD-4.2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `CfdiService`                                                    | Tenant safety en `findByDocumentId`, paginación en `findManyByCompany`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `DocumentsRepository`                                            | `markAsProcessed`, `markAsRejected` — tenant safety, sin efecto en estado terminal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `JobsRepository`                                                 | `markAsProcessing`, `markAsCompleted`, `markAsFailed`, `findById` — tenant safety                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Reconciliación                                                   | Idempotencia; **`REJECTED` nunca transiciona** (§10.0); **el reconciliador NUNCA escribe `PROCESSED` ni `COMPLETED` en ningún caso** — prueba explícita de que no existe camino que lo produzca (§10.0, criterios 71/72); cada estado vivo de BullMQ (`waiting`, `waiting-children`, `delayed`, `prioritized`, `active`) → no interviene (§10.1); terminales **retenidos** (`completed`, `failed`) → se leen y se reconcilian sin esperar a la retención, distinguidos de la ausencia (§10.1); `unknown` en un solo ciclo → no actúa; `unknown` confirmado en 2 ciclos + umbral → actúa; Job terminal en PostgreSQL ausente de Redis por retención → sin acción; **`PROCESSING` ausente de Redis CON `Cfdi` → violación de invariante: incidente (ERROR), CERO escrituras, escalado (antes: `PROCESSED + COMPLETED`)**; `PROCESSING` ausente **sin** `Cfdi` → `REJECTED (PROCESSING_FAILED)` previa salvaguarda Q-001 (§10.2.3); caso `COMPLETED`+`PROCESSING` (§10.2.2) → violación de invariante desde el primer ciclo: incidente, sin escritura, ni `PROCESSED` ni degradación a `FAILED+REJECTED` |
| Configuración central (§10.3)                                    | Variable ausente → aplica default MVP; variable fuera de rango → falla el arranque de la aplicación                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `BullMqJobsQueueAdapter` / `registerQueue`                       | `backoff.delay` se aplica entre reintentos con el valor de `JOBS_BACKOFF_DELAY_MS`; `defaultJobOptions.delay` no está presente en la configuración; opciones por-Job (`attempts`, `backoff`) ausentes de `queue.add()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### 16.2 Pruebas de integración

| Caso                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Infraestructura                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Flujo completo: API-0023 → upload real → confirm → polling API-0055 → API-0027 con conceptos e impuestos                                                                                                                                                                                                                                                                                                                                                          | PostgreSQL + MinIO en red Docker |
| ⚠ **SUSTITUIDO por Q-001.** Deduplicación: segundo upload de un `folioFiscal` que ya pertenece a **otro** documento → el `Document` permanece en `PROCESSING`, `Job = FAILED`, incidente `PENDIENTE_Q001_FOLIO_DUPLICADO` + métrica; **ningún** `REJECTED` ni `CFDI_DUPLICATE` automático, tampoco al agotar los intentos (gates G-15/G-16). _(La expectativa anterior —`REJECTED (CFDI_DUPLICATE)`— se reactivará solo cuando Q-001 se apruebe en ese sentido.)_ | PostgreSQL + MinIO               |
| XML malformado → Document REJECTED, API-0055 muestra FAILED                                                                                                                                                                                                                                                                                                                                                                                                       | PostgreSQL + MinIO               |
| Versión CFDI 3.3 → REJECTED (UNSUPPORTED_CFDI_VERSION)                                                                                                                                                                                                                                                                                                                                                                                                            | PostgreSQL + MinIO               |
| XML con DOCTYPE → REJECTED (XML_INVALID), sin procesamiento                                                                                                                                                                                                                                                                                                                                                                                                       | PostgreSQL + MinIO               |
| XML con ENTITY → REJECTED (XML_INVALID)                                                                                                                                                                                                                                                                                                                                                                                                                           | PostgreSQL + MinIO               |
| SUPERVISOR: accede API-0026 → 200; accede API-0027 → 404                                                                                                                                                                                                                                                                                                                                                                                                          | PostgreSQL                       |
| AUDITOR: accede API-0026 → 200; accede API-0028 → 404                                                                                                                                                                                                                                                                                                                                                                                                             | PostgreSQL                       |
| ADMINISTRADOR: accede API-0027 → 200                                                                                                                                                                                                                                                                                                                                                                                                                              | PostgreSQL                       |
| API-0026 con documento en PENDING_UPLOAD → 404                                                                                                                                                                                                                                                                                                                                                                                                                    | PostgreSQL + MinIO               |
| API-0026 con documento en REJECTED → 200 con URL prefirmada                                                                                                                                                                                                                                                                                                                                                                                                       | PostgreSQL + MinIO               |
| Usuario de Empresa A consulta Job de Empresa B → 404                                                                                                                                                                                                                                                                                                                                                                                                              | PostgreSQL                       |
| Usuario de Empresa A consulta CFDI de Empresa B → 404                                                                                                                                                                                                                                                                                                                                                                                                             | PostgreSQL                       |
| `CfdiTax` de concepto con `cfdiConceptId` de otro CFDI → rechazado por FK compuesta en base de datos (no solo por el repositorio)                                                                                                                                                                                                                                                                                                                                 | PostgreSQL                       |
| `CfdiTax` con `scope`/`cfdiConceptId`/`conceptSlot` incoherente (las tres combinaciones inválidas) → rechazado por el CHECK `cfdi_taxes_scope_concept_check`                                                                                                                                                                                                                                                                                                      | PostgreSQL                       |
| `conceptSlot` de un `CfdiTax` coincide con la `position` del `CfdiConcept` que referencia — invariante de repositorio (§4.5.2)                                                                                                                                                                                                                                                                                                                                    | PostgreSQL                       |
| Tras aplicar las migraciones, el `CHECK` `cfdi_taxes_scope_concept_check` existe realmente en la base de datos (consulta a `information_schema`)                                                                                                                                                                                                                                                                                                                  | PostgreSQL                       |
| Un CFDI cuyo concepto tiene un campo obligatorio no determinable → `REJECTED (CFDI_STRUCTURE_INVALID)`; **ningún** concepto se omite dejando huecos de `position`                                                                                                                                                                                                                                                                                                 | PostgreSQL + MinIO               |
| Reintento de Job: resultado idempotente, sin duplicados de conceptos ni impuestos                                                                                                                                                                                                                                                                                                                                                                                 | PostgreSQL + MinIO               |
| Caída simulada del proceso **antes** del commit de la Transacción A → no queda ningún rastro del agregado (ni `Cfdi`, ni hijos, ni checksum, ni cambio de estado); al reintentar, el flujo se ejecuta completo y converge a `PROCESSED`                                                                                                                                                                                                                           | PostgreSQL + MinIO               |
| Caída simulada **después** del commit pero antes del ack a BullMQ → la reentrega del Job encuentra el `Document` ya en `PROCESSED` y termina idempotentemente, sin reescribir nada                                                                                                                                                                                                                                                                                | PostgreSQL + MinIO               |
| Objeto en Storage reemplazado entre dos intentos del mismo Job: si el primer intento **commiteó**, el `Document` ya está `PROCESSED` y el segundo retorna idempotentemente (§7 paso 2); si **no** commiteó, no existe `Cfdi` y el segundo procede con `create()`. Hallar un `Cfdi` con el `Document` en `PROCESSING` sería violación de invariante (rollback, incidente) — en ningún caso se compara checksum para sobrescribir ni reutilizar el agregado previo  | PostgreSQL + MinIO               |
| Dos intentos concurrentes del mismo Job → convergencia idempotente sin duplicados; ninguna ruta produce `CFDI_DUPLICATE`                                                                                                                                                                                                                                                                                                                                          | PostgreSQL                       |
| Un `folioFiscal` ya usado por OTRO documento provoca `P2002` sobre `companyId_folioFiscal` al hacer `create()` del `Cfdi`; la transacción revierte íntegra y la confirmación externa por evidencia positiva identifica el duplicado — sin ningún error "current transaction is aborted" en logs. **Mientras la business rule siga pendiente (§9.3), el resultado esperado es error recuperable + incidente, NO `REJECTED`**                                       | PostgreSQL + MinIO               |
| **Carrera real del mismo documento**: dos workers ejecutan el flujo completo en paralelo sobre el mismo `documentId` → exactamente **un** `Cfdi`, un agregado, un `PROCESSED`; el perdedor revierte por completo y termina **en éxito** por convergencia idempotente, **sin consumir un reintento** y sin emitir `CFDI_DUPLICATE`                                                                                                                                 | PostgreSQL                       |
| El perdedor de la carrera **no modifica ningún dato del ganador**: los hijos, el checksum y los importes persistidos son exactamente los del worker que commiteó                                                                                                                                                                                                                                                                                                  | PostgreSQL                       |
| Pérdida de la transición terminal (`updateMany` con `count === 0` porque otro worker cerró el documento) → rollback total del agregado de ese intento; ningún hijo queda persistido                                                                                                                                                                                                                                                                               | PostgreSQL                       |
| Colisión provocada deliberadamente en el **último** intento de BullMQ → el Job termina en `COMPLETED`, **no** en `REJECTED` ni `FAILED`                                                                                                                                                                                                                                                                                                                           | PostgreSQL + Redis               |
| XML con número de nodos > `XML_MAX_NODE_COUNT` → REJECTED (XML_INVALID)                                                                                                                                                                                                                                                                                                                                                                                           | PostgreSQL + MinIO               |
| XML con número de atributos > `XML_MAX_ATTRIBUTE_COUNT` → REJECTED (XML_INVALID)                                                                                                                                                                                                                                                                                                                                                                                  | PostgreSQL + MinIO               |
| Worker reiniciado con Job en QUEUED → reconciliación y reencola                                                                                                                                                                                                                                                                                                                                                                                                   | PostgreSQL + Redis               |
| Job en `delayed` por backoff entre reintentos → la reconciliación **no** lo toca (§10.1)                                                                                                                                                                                                                                                                                                                                                                          | PostgreSQL + Redis               |
| Job en `waiting` bajo cola saturada durante más que `JOBS_STALE_PROCESSING_MS` → la reconciliación **no** lo toca                                                                                                                                                                                                                                                                                                                                                 | PostgreSQL + Redis               |
| Job terminal en PostgreSQL, eliminado de Redis por `removeOnComplete`/`removeOnFail` → la reconciliación no genera ninguna acción ni incidente                                                                                                                                                                                                                                                                                                                    | PostgreSQL + Redis               |
| `unknown` observado en un solo ciclo → sin acción; observado en 2 ciclos consecutivos + umbral → acción                                                                                                                                                                                                                                                                                                                                                           | PostgreSQL + Redis               |
| Job `PROCESSING` ausente de Redis **sin** `Cfdi` → `REJECTED (PROCESSING_FAILED)` — **previa** comprobación de la salvaguarda Q-001 (§10.2.3): si la causa raíz es un folio de otro documento, permanece en `PROCESSING`                                                                                                                                                                                                                                          | PostgreSQL + Redis               |
| ⚠ **SUSTITUIDO por D-007.** Job `PROCESSING` ausente de Redis **con** `Cfdi` existente → **violación de invariante**: incidente (ERROR) y escalado; **ni `PROCESSED` ni `REJECTED`**; ninguna escritura _(antes: `PROCESSED + COMPLETED`)_                                                                                                                                                                                                                        | PostgreSQL + Redis               |
| Job `PROCESSING` + Redis **`failed` retenido** (aún no eliminado por `removeOnFail`) sin `Cfdi` → la reconciliación actúa de inmediato leyendo ese terminal, sin esperar a la retención                                                                                                                                                                                                                                                                           | PostgreSQL + Redis               |
| Job `PROCESSING` + Redis **`completed` retenido** → violación de invariante: incidente, **nunca `PROCESSED`**                                                                                                                                                                                                                                                                                                                                                     | PostgreSQL + Redis               |
| `Document` terminal en PostgreSQL + Job **VIVO** en Redis → divergencia: PostgreSQL manda, sin reescribir el `Document`; incidente (WARN)                                                                                                                                                                                                                                                                                                                         | PostgreSQL + Redis               |
| `Document` en `REJECTED` con `Job = COMPLETED` → la reconciliación registra incidente y **no escribe nada**; el Document sigue `REJECTED`                                                                                                                                                                                                                                                                                                                         | PostgreSQL + Redis               |
| `Document` en `PROCESSED` con `Job = FAILED` → incidente, sin escritura                                                                                                                                                                                                                                                                                                                                                                                           | PostgreSQL + Redis               |
| `Document` en `PROCESSED` **sin** `Cfdi` → violación de invariante: incidente, sin escritura; **nunca** revertir a `REJECTED`                                                                                                                                                                                                                                                                                                                                     | PostgreSQL                       |
| Job `COMPLETED` + Document `PROCESSING` (con o sin checksum, con o sin `Cfdi` íntegro) → **violación de invariante desde el primer ciclo**: incidente (ERROR), sin escritura; **jamás** `PROCESSED` por comprobaciones estructurales                                                                                                                                                                                                                              | PostgreSQL + Redis               |
| Variable de configuración fuera de rango (p. ej. `JOBS_ATTEMPTS = 0`) → la aplicación falla al iniciar                                                                                                                                                                                                                                                                                                                                                            | Proceso NestJS                   |

### 16.2.1 Gates de concurrencia y reconciliación — obligatorios antes del DONE

> **Ninguno de estos gates se ha ejecutado.** Son especificación. Todos permanecen **PENDIENTES**.

| #    | Gate                                                                                   | Resultado esperado                                                                                                                |
| ---- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| G-01 | Carrera de dos workers sobre el mismo `documentId`                                     | Exactamente un `Cfdi`, un agregado, un `PROCESSED`, un `Job COMPLETED`                                                            |
| G-02 | El ganador **confirma**                                                                | El perdedor recibe la violación **ya definitiva** y clasifica CASO A → éxito                                                      |
| G-03 | El ganador **revierte**                                                                | El `INSERT` del perdedor continúa y **él** se convierte en ganador                                                                |
| G-04 | Colisión en el **último** intento de BullMQ                                            | `COMPLETED`, nunca `REJECTED`/`FAILED`                                                                                            |
| G-05 | Rollback ante fallo en **cada** escritura del agregado (cabecera, cada hijo, checksum) | Sin rastro parcial en ninguna tabla                                                                                               |
| G-06 | `Document updateMany.count === 0`                                                      | Rollback total; clasificación por AD-10.2                                                                                         |
| G-07 | `Job updateMany.count === 0`                                                           | Rollback total; **`Document` NO queda `PROCESSED`**                                                                               |
| G-08 | `Job` ausente al cerrar                                                                | `count !== 1` → rollback → CASO B/D                                                                                               |
| G-09 | `Job = FAILED` al cerrar                                                               | `count !== 1` → rollback → CASO B                                                                                                 |
| G-10 | `Job = CANCELLED` al cerrar                                                            | `count !== 1` → rollback → CASO B                                                                                                 |
| G-11 | `Job = COMPLETED` al cerrar                                                            | `count !== 1` → rollback → CASO A o B según evidencia                                                                             |
| G-12 | `Job` de **otro tenant**                                                               | `count !== 1` → rollback; ninguna escritura cruzada                                                                               |
| G-13 | `Document = REJECTED` al arbitrar                                                      | CASO C: sin escritura, sin promoción a `PROCESSED`                                                                                |
| G-14 | `Document` ausente al arbitrar                                                         | CASO D: permanente de integridad, sin reintento ciego                                                                             |
| G-15 | Folio de **otro** documento                                                            | CASO F: recuperable + incidente; **sin `REJECTED`** (Q-001)                                                                       |
| G-16 | Agotamiento de intentos **causado por** folio duplicado                                | `Document` sigue `PROCESSING`, `Job = FAILED`, incidente `PENDIENTE_Q001_FOLIO_DUPLICADO` — **sin `PROCESSING_FAILED`** (§10.2.3) |
| G-17 | Redis `waiting`                                                                        | Reconciliación no interviene                                                                                                      |
| G-18 | Redis `delayed` (backoff)                                                              | Reconciliación no interviene                                                                                                      |
| G-19 | Redis `prioritized`                                                                    | Reconciliación no interviene                                                                                                      |
| G-20 | Redis `active`                                                                         | Reconciliación no interviene                                                                                                      |
| G-21 | Redis `completed` **retenido** + `Document PROCESSING`                                 | Violación de invariante: incidente, **nunca `PROCESSED`**                                                                         |
| G-22 | Redis `failed` **retenido** + `Document PROCESSING` sin `Cfdi`                         | Reconciliación actúa **sin esperar** a `removeOnFail`                                                                             |
| G-23 | Redis **ausente** confirmado en 2 ciclos                                               | Rama de ausencia, distinta de los terminales retenidos                                                                            |
| G-24 | `Cfdi` existente + `Document PROCESSING`                                               | **Violación de invariante**: incidente, sin escritura                                                                             |
| G-25 | `Document = PROCESSED` sin `Cfdi`                                                      | Violación de invariante: incidente, sin reversión                                                                                 |
| G-26 | Caída **antes** del commit                                                             | Sin rastro alguno; el reintento ejecuta el flujo completo                                                                         |
| G-27 | Caída **después** del commit, antes de publicar efectos                                | Estado correcto en PostgreSQL; **el efecto externo se pierde** — evidencia de que post-commit no garantiza entrega (§9.5)         |
| G-28 | FKs compuestas de `CfdiConcept`/`CfdiTax`                                              | Rechazo en base de datos, no solo en el repositorio                                                                               |
| G-29 | CHECK `cfdi_taxes_scope_concept_check`                                                 | Existe tras las migraciones (`information_schema`) y rechaza las combinaciones inválidas                                          |
| G-30 | Ausencia de `meta.target` en el flujo                                                  | Ninguna ruta de control lo lee                                                                                                    |
| G-31 | _Outbox_, **solo si** se exige entrega garantizada                                     | No aplicable mientras el outbox sea post-MVP (§9.5)                                                                               |

### 16.3 Validación experimental pendiente — no ejecutada

> **Ninguna prueba de concurrencia de esta sección se ha ejecutado.** Todas son especificación. No deben citarse como evidencia.

Existe en el repositorio un script de exploración, `packages/database/test-prisma-upsert.ts`, escrito para observar qué SQL emite Prisma 6.19.3 ante `upsert({ update: {} })` frente a `upsert({ update: { updatedAt } })`, y qué ocurre al violar una restricción única distinta de la del árbitro. **No ha sido ejecutado** (requiere una base PostgreSQL viva y datos de fixture). Su ejecución elevaría de **PENDIENTE** a **NIVEL A** la caracterización del upsert.

**No bloquea D-007.** La decisión adoptada no depende de ese comportamiento: se apoya en que `create()` **siempre** lanza ante colisión, que es semántica de PostgreSQL (NIVEL C), no de Prisma. El script sirve para documentar por qué se rechazó la alternativa, no para sostener la elegida.

---

## 17. Fuera de alcance (reconfirmado)

Confirmadas las exclusiones del plan original §3 y las adicionales del Bloque E:

- CFDI 3.3 — rechazado como `UNSUPPORTED_CFDI_VERSION`
- Timbrado ante el SAT — prohibido (BR-CFDI-001)
- Vinculación CFDI-Póliza — EWO-006 (BR-CFDI-003)
- Worker en proceso separado — evolución futura
- Webhook MinIO — excluido del plan original
- UI operativa de dead jobs — fuera de alcance
- Replay manual de Jobs desde API — fuera de alcance
- DLQ avanzada — Jobs fallidos en PostgreSQL son la fuente de diagnóstico
- Nómina, Carta Porte, Pagos, complementos CFDI adicionales — EWO posterior

---

## 18. Riesgos residuales

| Riesgo                                                                                                                                                        | Probabilidad                       | Impacto    | Mitigación                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fast-xml-parser` con namespaces CFDI en edge cases                                                                                                           | Media                              | Medio      | Validar con ≥ 3 CFDI reales del SAT antes de declarar DONE; el plan original §9 ya lo señala                                                                                                                                                                                                                                                     |
| Configuración de `fast-xml-parser` insegura por defecto                                                                                                       | Media                              | Alto       | §5 especifica opciones requeridas; deben revisarse contra la versión instalada antes de implementar                                                                                                                                                                                                                                              |
| Transacción A (Cfdi + Concept + Tax) muy larga                                                                                                                | Baja                               | Bajo       | CFDI 4.0 estándar SAT tiene máximo 999 conceptos; suficientemente pequeño para una transacción. Si el timeout por defecto de `$transaction` resultara insuficiente con conceptos en el extremo alto del rango, ajustar `timeout`/`maxWait` en la propia llamada — **nunca** dividir la transacción, porque la atomicidad es un requisito (AD-10) |
| `@OnWorkerEvent('failed')` no ejecutado si NestJS muere                                                                                                       | Baja                               | Alto       | Tercera capa: reconciliación (§10). Las tres capas de AD-4.3 son complementarias                                                                                                                                                                                                                                                                 |
| Semántica de `job.attemptsMade` distinta a la esperada en `bullmq@5.81.x`                                                                                     | Media                              | Alto       | Prueba dedicada obligatoria (AD-4.2, §16.1) que fija el comportamiento antes de confiar en él; alternativa documentada (`await job.isFailed()`) si la comparación no resulta fiable                                                                                                                                                              |
| Divergencia entre `CfdiTax.conceptSlot` y la `position` del concepto referenciado                                                                             | Baja                               | Bajo       | Ambos derivan del mismo agregado en memoria; invariante de repositorio + prueba dedicada (§16.2). No afecta el aislamiento multiempresa, que la FK compuesta garantiza siempre (AD-5 §4.5.2)                                                                                                                                                     |
| `CHECK` en SQL manual perdido en un `prisma migrate reset`/`db push`                                                                                          | Media                              | Medio      | El `CHECK` vive en el archivo de migración versionado, no fuera de él; prohibido usar `db push` en este proyecto para cambios de schema. Prueba de integración que verifica la existencia del `CHECK` tras aplicar migraciones (§16.2)                                                                                                           |
| Worker en el mismo proceso que el HTTP server                                                                                                                 | Baja                               | Medio      | Decisión del plan original (obs. 7); reinicio automático de proceso                                                                                                                                                                                                                                                                              |
| Migración Prisma bloqueada por proxy TCP de Docker Desktop                                                                                                    | Alta                               | Medio      | Contenedor Linux efímero `node:22-bookworm-slim` en `contaia_network` (patrón EWO-004)                                                                                                                                                                                                                                                           |
| Complementos CFDI (Nómina, Carta Porte, Pagos)                                                                                                                | Alta (EWO futura)                  | Bajo ahora | `CfdiConcept`/`CfdiTax` no bastarán; se necesitará modelo de complementos adicional                                                                                                                                                                                                                                                              |
| **Trabajo previo duplicado** — dos workers descargan y parsean el mismo archivo antes de que uno pierda la carrera (D-007 excluye el commit, no la ejecución) | Media                              | Bajo hoy   | Aceptado en el MVP: las operaciones previas son de lectura y repetibles; su coste es CPU/ancho de banda, no corrupción. **Condición de revisión**: si se incorpora OCR/IA con coste o créditos, evaluar _claim_/_lease_ (§9.4)                                                                                                                   |
| **OCR o IA duplicados con coste real** (no en el MVP)                                                                                                         | Baja hoy, Alta si entra en alcance | Alto       | Ninguna mitigación en D-007. Dispara la revisión de la decisión: exigiría clave idempotente y probablemente _lease_ previo (§9.4)                                                                                                                                                                                                                |
| **Política de folio duplicado no definida** — el worker no puede rechazar automáticamente                                                                     | Alta                               | Medio      | Business rule pendiente (§9.3, `brain/QUESTIONS.md`). Entretanto se clasifica como recuperable + incidente + métrica, nunca `REJECTED` automático. Riesgo asumido: documentos duplicados se reintentan sin resolverse hasta que exista la regla                                                                                                  |
| **Divergencia `Document` / `Job`** si alguien vuelve a separarlos en transacciones distintas                                                                  | Baja                               | Alto       | D-007 los fusiona en un único commit; criterio de aceptación 58 y DoD lo verifican explícitamente                                                                                                                                                                                                                                                |
| **Eventos emitidos antes del commit** en la futura implementación                                                                                             | Media                              | Alto       | §9.5 fija la frontera; criterio de aceptación 62. Si se requiere garantía de entrega, patrón _outbox_                                                                                                                                                                                                                                            |
| **Implementación futura incompleta de los hijos** — `CfdiConcept`/`CfdiTax` no existen todavía; el agregado hoy es solo cabecera                              | Alta                               | Medio      | §9.2 marca el estado real. La atomicidad de D-007 debe re-verificarse cuando los hijos entren en el schema, porque hasta entonces la transacción no ejerce su caso más exigente                                                                                                                                                                  |
| **Recuperación tras caída del worker antes del commit** depende de reentrega de BullMQ + reconciliación, no de un _lease_                                     | Media                              | Medio      | §10 (reconciliación) es la red de seguridad. Si el SLA de reproceso se endurece, revisar D-007 hacia la alternativa de _lease_ (§9.4)                                                                                                                                                                                                            |

---

## 19. Impactos sobre documentación existente

| Documento                          | Sección               | Actualización requerida                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/08_API_DESIGN.md`            | §9.5 (tabla de APIs)  | Agregar `concepts[]` y `cfdiTaxes[]` en descripción de API-0027; forma de `result` en API-0055                                                                                                                                                                                                                                                                           |
| `docs/08_API_DESIGN.md`            | §15 (Jobs)            | Documentar la forma exacta de `result` para `XML_EXTRACTION` (AD-2)                                                                                                                                                                                                                                                                                                      |
| `docs/09_DATABASE_DESIGN.md`       | §10 (modelos)         | Agregar `CfdiConcept`, `CfdiTax` (incluye `conceptSlot`) y los enums `CfdiTaxScope`, `CfdiTaxType`; documentar `@@unique([id, companyId])` en `Cfdi`, `@@unique([id, cfdiId, companyId])` en `CfdiConcept` y `@@unique([companyId, cfdiId, conceptSlot, position])` en `CfdiTax`; documentar el CHECK `cfdi_taxes_scope_concept_check` (única pieza de SQL manual, AD-5) |
| `docs/04_BUSINESS_RULES.md`        | §4.7 (BR-CFDI-002)    | Aclarar que "conceptos e impuestos" se persisten en tablas relacionales propias                                                                                                                                                                                                                                                                                          |
| `EWO-005_DOCUMENTS_FISCAL_PLAN.md` | §4.3 (StorageAdapter) | Agregar `getObject` al contrato de interfaz; corregir que el adaptador se llama `S3StorageAdapter`                                                                                                                                                                                                                                                                       |
| `EWO-005_DOCUMENTS_FISCAL_PLAN.md` | §2.2 (modelos DB)     | Agregar `CfdiConcept` y `CfdiTax` a la tabla de modelos                                                                                                                                                                                                                                                                                                                  |
| `EWO-005_DOCUMENTS_FISCAL_PLAN.md` | §4.4 (permisos)       | Agregar ADMINISTRADOR a los roles con `cfdi.read`                                                                                                                                                                                                                                                                                                                        |

### 19.1 Contradicciones detectadas y resueltas

**Contradicción 1 — `StorageAdapter` en el plan original §4.3 vs. código real:**

El plan §4.3 muestra 3 métodos en `StorageAdapter`; el código tiene 5; este addendum agrega el 6.°. La descripción §4.3 es parcial. La fuente de verdad es el código en `storage.interface.ts`. Resuelto en AD-1.

**Contradicción 2 — Nombre del adaptador: plan §4.3 menciona `minio.adapter.ts` vs. código real `s3-storage.adapter.ts`:**

El plan §5.1 lista `minio.adapter.ts` como archivo a crear; el código implementado usa `S3StorageAdapter` (en `s3-storage.adapter.ts`). Este addendum usa el nombre real del código. Registrado en §19 para actualizar el plan.

**Contradicción 3 — RBAC `cfdi.read` en plan §4.4 (CONTADOR y AUXILIAR) vs. lógica del seed (ADMINISTRADOR recibe todo):**

El plan §4.4 especifica `cfdi.read` solo para CONTADOR y AUXILIAR. La lógica del seed da a ADMINISTRADOR todos los permisos del catálogo. Este addendum (§12) amplía la matriz para incluir a ADMINISTRADOR de forma explícita, coherente con el patrón general. Registrado en §19 para actualizar el plan.

---

## 20. Definition of Done — Bloque E

El Bloque E se declara **DONE** cuando:

- [ ] `StorageAdapter.getObject(key: string): Promise<Buffer>` implementado en la interfaz y en `S3StorageAdapter`.
- [ ] Migración Prisma aplicada con: `@@unique([id, companyId])` agregado a `Cfdi`; modelo `CfdiConcept` (`position`, `@@unique([companyId, cfdiId, position])`, `@@unique([id, cfdiId, companyId])`); modelo `CfdiTax` (`conceptSlot` NOT NULL, `position`, `@@unique([companyId, cfdiId, conceptSlot, position])`, FKs compuestas hacia `Cfdi` y `CfdiConcept`) + enums `CfdiTaxScope`, `CfdiTaxType`. **Única pieza de SQL manual:** el CHECK `cfdi_taxes_scope_concept_check`. **No se crea ningún índice único parcial** — la identidad de `CfdiTax` es declarativa para que Prisma Client genere su `WhereUniqueInput` (AD-5 §4.5.2).
- [ ] `prisma validate` + `prisma generate` verdes con el schema del Bloque E — confirmando en particular que Prisma 6.19.x acepta la relación opcional `cfdiConcept` de nulabilidad mixta (`cfdiConceptId?` + `cfdiId`/`companyId` NOT NULL) (AD-5 §4.5.2).
- [ ] Verificado que `prisma.cfdiConcept.upsert()` y `prisma.cfdiTax.upsert()` compilan con los `WhereUniqueInput` generados, antes de escribir la lógica del worker.
- [ ] `DocumentsRepository` tiene `markAsProcessed` y `markAsRejected`.
- [ ] `JobsRepository` tiene `markAsProcessing`, `markAsCompleted`, `markAsFailed`, `findById`.
- [ ] `fast-xml-parser` instalado en `apps/api`.
- [ ] `XmlProcessingModule` con `XmlValidationService` (incluye todos los controles de §5) y `CfdiExtractorService` (`Cfdi40Extractor`) implementados y con pruebas.
- [ ] Worker `XmlExtractionProcessor` en `XmlProcessingModule`, implementado con todos los flujos de AD-10, AD-11 y §10; Transacción A como **una sola** `prisma.$transaction` **interactiva** (`async (tx) => …`) que incluye agregado + checksum + transición terminal condicional + cierre del `Job` en **un único commit** (D-007), con el arbitraje de `P2002` en el `catch` externo (AD-10.1.2 / AD-10.2) — ninguna captura de `P2002` dentro de la transacción.
- [ ] El `Cfdi` se resuelve con **`create()`**; ninguna ruta usa `upsert({ update: {} })` ni upsert con actualización escalar como mecanismo de exclusión (§9.6, criterio 59).
- [ ] Las transiciones `Document PROCESSING → PROCESSED` **y** `Job → COMPLETED` usan `updateMany` **dentro** de la transacción y exigen **`count === 1`**; cualquier otro valor fuerza rollback (criterios 58, 64, 65).
- [ ] El arbitraje posterior al rollback implementa los siete casos A–G de AD-10.2 sobre el **primario**, con evidencia completa (criterios 66-70, 77).
- [ ] La reconciliación **nunca** marca `PROCESSED` por heurística estructural; los estados imposibles bajo D-007 se tratan como violación de invariante con incidente y escalado (criterios 71, 72; §10.0.1, §10.0.2).
- [ ] La reconciliación distingue **terminal retenido** (`completed`/`failed`) de **ausente**, y actúa sobre los terminales retenidos sin esperar a `removeOnFail` (criterios 73-75).
- [ ] Ningún camino —incluido el agotamiento de intentos— produce `REJECTED` automático por folio duplicado mientras Q-001 siga pendiente (criterio 76; §10.2.3).
- [x] **D-007 ratificada por el responsable de producto** — Alejandro Reyes Bocanegra (Product Owner y Arquitecto de Producto de ContaIA), 2026-07-25, registrada en `brain/DECISIONS.md` ("Ratificación"). La implementación del worker queda **autorizada** a partir de esta fecha; el resto de los ítems de este DoD sigue pendiente de ejecutarse.
- [ ] Gates de concurrencia y reconciliación G-01 a G-31 (§16.2.1) ejecutados y en verde.
- [ ] Ningún efecto externo (evento, notificación, ack) se emite antes del commit (§9.5, criterio 62).
- [ ] Prueba de concurrencia real (dos workers sobre el mismo `documentId`) en verde, incluida la variante en el **último** intento de BullMQ (§16.2, criterios 56 y 60).
- [ ] Handler `@OnWorkerEvent('failed')` implementado con clasificación terminal/no-terminal (AD-4.2), y prueba dedicada que fija la semántica de `attemptsMade` en la versión instalada de BullMQ.
- [ ] Ninguna ruta de código decide control de flujo a partir de `error.meta.target` (AD-10.2).
- [ ] No hay dependencias circulares entre módulos (§8).
- [ ] Reconciliación en startup y periódica implementadas, respetando §10.0 (jamás transiciona un `Document` terminal) y §10.1 (todos los estados vivos de BullMQ).
- [ ] `CfdiModule` con API-0027 y API-0028 implementados; requieren `cfdi.read`.
- [ ] `JobsController` con API-0055 implementado; tenant-safe.
- [ ] API-0026 implementada en `DocumentsController`; requiere `document.read`; restringida a estados `PROCESSING/PROCESSED/REJECTED`.
- [ ] Permiso `cfdi.read` en seed, asignado automáticamente a ADMINISTRADOR (via catálogo) y explícitamente a CONTADOR y AUXILIAR.
- [ ] BullMQ configurado con `removeOnComplete` y `removeOnFail` combinados (count + age) en `registerQueue.defaultJobOptions` (AD-12); opciones por-Job provisionales eliminadas de `BullMqJobsQueueAdapter.enqueueXmlExtraction()`.
- [ ] `XmlProcessingModule` y `CfdiModule` registrados en `AppModule`.
- [ ] Configuración central (§10.3) implementada con las 14 variables, validación de rango y fallo de arranque ante valor inválido — ningún consumidor con default local ni número hardcodeado.
- [ ] Todos los criterios de aceptación 1–83 verificados.
- [ ] **Business rule de `folioFiscal` duplicado aprobada por el responsable de producto** (§9.3) e implementada conforme a lo aprobado. Mientras siga pendiente, el Bloque E **no puede declararse DONE** con rechazo automático por duplicado.
- [ ] Pruebas unitarias ≥ 80 % en todos los servicios y el worker.
- [ ] Pruebas de integración pasando en contenedor Linux.
- [ ] `pnpm run check` verde.
- [ ] `docs/engineering/EWO-005_DOCUMENTS_FISCAL_REPORT.md` creado con el informe de cierre.

**Sincronización documental — obligatoria antes del cierre de EWO-005 (no antes de iniciar la implementación):**

No es necesario actualizar los siguientes documentos antes de comenzar a implementar el Bloque E — mientras persista la tensión documental, este addendum prevalece (§1). Pero **sí son obligatorios antes de: la auditoría final del Bloque E, el commit final, y el cierre de EWO-005**:

- [ ] `docs/04_BUSINESS_RULES.md` actualizado (§4.7 — persistencia relacional de conceptos/impuestos, ver §19)
- [ ] `docs/08_API_DESIGN.md` actualizado (§9.5, §15 — contratos API-0026/0027/0028/0055, ver §19)
- [ ] `docs/09_DATABASE_DESIGN.md` actualizado (§10 — `CfdiConcept`, `CfdiTax` con `conceptSlot`, enums, FKs compuestas, restricciones únicas declarativas, CHECK, ver §19)
- [ ] `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md` actualizado (§2.2, §4.3, §4.4 — ver §19.1 de este addendum)
- [ ] `MASTER_CONTEXT.md` actualizado
