# EWO-005 Technical Planning — Documents & Fiscal

## Control del documento

| Campo          | Valor                                                                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EWO            | EWO-005                                                                                                                                                                                                                                     |
| Título         | Documents & Fiscal (Carga de documentos, procesamiento XML y extracción de CFDI)                                                                                                                                                            |
| Estado         | **PLANNING** — plan técnico aprobado para inicio en la siguiente sesión                                                                                                                                                                     |
| Fase           | Fase 3 del Plan de Implementación (`docs/19_FRONTEND_IMPLEMENTATION_PLAN.md`, sección 17)                                                                                                                                                   |
| Fecha del plan | 2026-07-22                                                                                                                                                                                                                                  |
| Fuentes        | `docs/04_BUSINESS_RULES.md` §4.5–4.7, `docs/06_SYSTEM_WORKFLOWS.md` §6-7, `docs/08_API_DESIGN.md` §9.5/§14, `docs/09_DATABASE_DESIGN.md` §10, `docs/19_FRONTEND_IMPLEMENTATION_PLAN.md` §4/§17, `docs/20_BACKEND_IMPLEMENTATION_PLAN.md` §3 |
| Prerrequisitos | EWO-004 DONE (migración inicial aplicada, RBAC operativo, app shell activo)                                                                                                                                                                 |

---

## 1. Objetivo

Implementar el módulo de **carga, almacenamiento y procesamiento de documentos** de ContaIA, incluyendo la extracción estructurada de datos de CFDI (comprobantes fiscales digitales), conforme a los flujos de trabajo 6 y 7 de `docs/06_SYSTEM_WORKFLOWS.md`.

Al término de EWO-005 el sistema debe permitir a un usuario autenticado con Membresía vigente:

1. Cargar archivos (XML, PDF, u otros) al repositorio de su Empresa.
2. Recibir confirmación del estado de procesamiento (polling).
3. Consultar los datos extraídos de un CFDI procesado.
4. Listar los documentos y CFDI de su Empresa con filtrado básico.

El módulo no timbra ni valida ante el SAT (BR-CFDI-001). No genera Pólizas. No vincula CFDI a Pólizas (BR-CFDI-003 — depende del módulo Accounting, EWO-006).

---

## 2. Alcance

### 2.1 Backend

| Módulo NestJS         | Responsabilidad                                                                                  | APIs cubiertas                         |
| --------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------- |
| `DocumentsModule`     | Carga (URL prefirmada), listado, consulta de estado, descarga                                    | API-0023, API-0024, API-0025, API-0026 |
| `CfdiModule`          | Datos extraídos de CFDI, listado por Empresa, deduplicación por Folio Fiscal                     | API-0027, API-0028                     |
| `XmlProcessingModule` | Validación estructural de XML (BR-XML-001), servicio interno sin controlador propio              | —                                      |
| `StorageModule`       | Adaptador MinIO/S3 para URLs prefirmadas — inversión de dependencias (`StorageAdapter` interfaz) | —                                      |
| `JobsModule`          | Estado de operaciones asíncronas (extracción XML)                                                | API-0055                               |
| Cola BullMQ           | Worker `xml-extraction` — validación + extracción CFDI, con 3 reintentos y backoff exponencial   | —                                      |

### 2.2 Base de datos (nuevos modelos Prisma)

| Modelo     | Descripción                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------ |
| `Document` | Metadatos del archivo cargado; `storageReference` a objeto S3/MinIO; estado del ciclo de vida    |
| `Cfdi`     | Datos extraídos del XML fiscal; `(companyId, folioFiscal)` único — deduplicación a nivel de dato |
| `Job`      | Operación asíncrona (extracción XML, generación de reportes futuros); expuesto via API-0055      |

Enumeraciones nuevas: `DocumentStatus` (`PENDING_UPLOAD`, `PROCESSING`, `PROCESSED`, `REJECTED`), `JobStatus` (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`), `JobType` (`XML_EXTRACTION`).

### 2.3 Frontend

| Ruta                                   | Descripción                                                             | UI Spec |
| -------------------------------------- | ----------------------------------------------------------------------- | ------- |
| `/{companyId}/documentos`              | Lista de documentos con estado y filtros básicos                        | UI-0012 |
| `/{companyId}/documentos/cargar`       | Zona de carga múltiple (`UIC-18`); polling de estado vía `useJobStatus` | UI-0013 |
| `/{companyId}/documentos/{documentId}` | Detalle del documento: estado, metadatos, motivo de rechazo             | UI-0014 |
| `/{companyId}/fiscal`                  | Lista de CFDI procesados con filtros                                    | UI-0015 |
| `/{companyId}/fiscal/{documentId}`     | Detalle de CFDI extraído: emisor, receptor, conceptos, campos ambiguos  | UI-0016 |

Hooks nuevos: `useDocumentUpload`, `useDocuments`, `useDocument`, `useJobStatus`, `useCfdiList`, `useCfdi`.
Servicios nuevos: `documentsService` (grupo 9.5 de `docs/08_API_DESIGN.md`), `fiscalService`.

---

## 3. Fuera de alcance

| Ítem                                                 | Razón                                                                                       | EWO prevista    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------- |
| Vinculación CFDI → Póliza (BR-CFDI-003)              | Depende de `JournalEntriesService` (Accounting module)                                      | EWO-006         |
| Catálogo de Cuentas y Pólizas                        | Phase 5 del plan de implementación                                                          | EWO-006         |
| Timbrado o validación ante el SAT/PAC                | Prohibido en el MVP (BR-CFDI-001, BR-GLB-005)                                               | Etapa 4         |
| Ejercicios fiscales (FiscalYear)                     | Lógicamente es extensión de Companies; se agrega en EWO-006 cuando Contabilidad lo requiera | EWO-006         |
| Módulo de Reportes                                   | Phase 7 — depende de Accounting                                                             | EWO-007         |
| Módulo de IA / Asistente                             | Phase 6 — depende de Accounting                                                             | EWO-007+        |
| Administration / Notificaciones                      | Phase 8                                                                                     | EWO-008         |
| Configuración de infraestructura MinIO en producción | Fuera del MVP — no fija proveedor cloud (`docs/20` §2)                                      | Infraestructura |
| E2E / Playwright                                     | Testing strategy define scope de E2E fuera del MVP de cada EWO                              | Separado        |

---

## 4. Arquitectura

### 4.1 Flujo de carga de documento (Workflow 6)

```
Cliente (browser)
  │
  ├─ 1. POST /companies/{companyId}/documents (API-0023)
  │       Body: { filename, mimeType, fileType }
  │       → Backend crea Document en PENDING_UPLOAD
  │       → StorageAdapter.getPresignedUploadUrl()
  │       ← 202: { documentId, presignedUrl, expiresAt }
  │
  ├─ 2. PUT <presignedUrl>   (cliente → MinIO/S3 directo, nunca pasa por NestJS)
  │       ← 200 OK (del almacenamiento de objetos)
  │
  ├─ 3. Webhook o polling GET /jobs/{jobId} (API-0055) cada N segundos
  │       → BullMQ worker xml-extraction se dispara al completar el upload
  │       → XmlValidationService.validate()
  │             Si inválido → Document.status = REJECTED + rejectionReason
  │             Si válido XML → CfdiService.extract() → Document.status = PROCESSED + Cfdi record
  │       ← { status: COMPLETED|FAILED, resourceId, resourceType }
  │
  └─ 4. GET /documents/{documentId}/cfdi (API-0027)
          ← datos extraídos del CFDI (emisor, receptor, conceptos, folioFiscal, etc.)
```

### 4.2 Deduplicación de CFDI (Workflow 7, sección 13 de docs/08)

```
CfdiService.extract(documentId, companyId)
  → parsea XML
  → extrae folioFiscal
  → INSERT INTO cfdi (companyId, folioFiscal, ...)
       ON CONFLICT (companyId, folioFiscal) → 409 DUPLICATE
         body: { existingDocumentId, existingCfdiId }
  → marca campos ambiguos en ambiguousFields[] (BR-XML-002)
```

### 4.3 Inversión de dependencias — StorageAdapter

```typescript
// packages/database/src/storage/storage.interface.ts
interface StorageAdapter {
  getPresignedUploadUrl(key: string, expiresInSeconds: number): Promise<string>;
  getPresignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

// apps/api/src/modules/storage/minio.adapter.ts  (implementación concreta)
// apps/api/src/modules/storage/s3.adapter.ts      (producción futura)
```

`DocumentsModule` inyecta `StorageAdapter` como token, nunca el cliente concreto de MinIO — coherente con el principio de inversión de dependencias de `docs/07_SOFTWARE_ARCHITECTURE.md` §5 y `docs/20_BACKEND_IMPLEMENTATION_PLAN.md` §4.

### 4.4 Impacto sobre la guarda de RBAC

Dos nuevos permisos deben registrarse en la tabla `permissions` y asignarse a roles:

| Permiso           | Descripción                    | Roles (`docs/04_BUSINESS_RULES.md` §4.1)               |
| ----------------- | ------------------------------ | ------------------------------------------------------ |
| `document.upload` | Cargar documentos a la Empresa | ADMINISTRADOR, CONTADOR, AUXILIAR                      |
| `document.read`   | Consultar documentos y CFDI    | ADMINISTRADOR, CONTADOR, AUXILIAR, SUPERVISOR, AUDITOR |

Los guards existentes (`PermissionGuard`, `CompanyGuard`) son suficientes — no se crea ningún guard nuevo.

---

## 5. Archivos afectados

### 5.1 Nuevos (a crear)

**Backend:**

```
apps/api/src/modules/documents/
  documents.module.ts
  documents.controller.ts
  documents.service.ts
  documents.service.spec.ts
  documents.repository.ts
  dto/
    upload-document.dto.ts
    document-response.dto.ts
    list-documents-query.dto.ts

apps/api/src/modules/cfdi/
  cfdi.module.ts
  cfdi.controller.ts
  cfdi.service.ts
  cfdi.service.spec.ts
  cfdi.repository.ts
  dto/
    cfdi-response.dto.ts
    list-cfdi-query.dto.ts

apps/api/src/modules/xml-processing/
  xml-processing.module.ts
  xml-validation.service.ts
  xml-validation.service.spec.ts
  cfdi-extractor.service.ts
  cfdi-extractor.service.spec.ts

apps/api/src/modules/storage/
  storage.module.ts
  storage.interface.ts
  minio.adapter.ts
  minio.adapter.spec.ts

apps/api/src/modules/jobs/
  jobs.module.ts
  jobs.controller.ts
  jobs.service.ts
  jobs.service.spec.ts

apps/api/src/workers/
  xml-extraction.worker.ts
  xml-extraction.worker.spec.ts
```

**Frontend:**

```
apps/web/src/app/[companyId]/documentos/
  page.tsx                      (lista)
  cargar/page.tsx               (upload)
  [documentId]/page.tsx         (detalle)

apps/web/src/app/[companyId]/fiscal/
  page.tsx                      (lista CFDI)
  [documentId]/page.tsx         (detalle CFDI)

apps/web/src/hooks/
  use-document-upload.ts
  use-documents.ts
  use-document.ts
  use-job-status.ts
  use-cfdi-list.ts
  use-cfdi.ts

apps/web/src/lib/
  documents-client.ts
  fiscal-client.ts
```

**Base de datos:**

```
packages/database/prisma/schema.prisma   (nuevos modelos Document, Cfdi, Job + enums)
packages/database/prisma/migrations/     (nueva migración generada con Prisma)
```

### 5.2 Modificados (a editar)

| Archivo                                                            | Cambio                                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `apps/api/src/app.module.ts`                                       | Importar DocumentsModule, CfdiModule, XmlProcessingModule, StorageModule, JobsModule |
| `docker-compose.yml`                                               | Agregar servicio `minio` (imagen `minio/minio`) con health check y volumen local     |
| `packages/database/prisma/schema.prisma`                           | Agregar modelos Document, Cfdi, Job + enums                                          |
| `apps/api/src/modules/roles-permissions/seeds/permissions.seed.ts` | Agregar permisos `document.upload` / `document.read`                                 |
| `apps/web/src/app/[companyId]/app-shell.tsx`                       | Agregar ítems de navegación Documentos y Fiscal                                      |
| `docs/20_BACKEND_IMPLEMENTATION_PLAN.md` línea 246                 | Actualizar nota de migración (ahora aplicada)                                        |

---

## 6. Estrategia de implementación

### 6.1 Orden recomendado

| Paso | Tarea                                                                                                   | Dependencia                             |
| ---- | ------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1    | Extender `docker-compose.yml` con servicio MinIO                                                        | Ninguna                                 |
| 2    | Añadir modelos `Document`, `Cfdi`, `Job` a `schema.prisma` + generar migración                          | MinIO disponible para integration tests |
| 3    | Implementar `StorageModule` (interfaz + adaptador MinIO) + pruebas unitarias                            | Paso 2                                  |
| 4    | Implementar `XmlProcessingModule` (`XmlValidationService` + `CfdiExtractorService`) + pruebas unitarias | Ninguna (sin DB)                        |
| 5    | Implementar `JobsModule` (`JobsService` + controlador API-0055)                                         | Paso 2                                  |
| 6    | Implementar `DocumentsModule` (servicio + controlador API-0023 a 0026 + repositorio) + pruebas          | Pasos 2, 3, 5                           |
| 7    | Implementar `CfdiModule` (servicio + controlador API-0027, 0028 + repositorio) + pruebas                | Pasos 2, 4                              |
| 8    | Implementar worker BullMQ `xml-extraction` que orquesta pasos 4 + 7                                     | Pasos 4, 5, 6, 7                        |
| 9    | Seed de permisos `document.upload` / `document.read`                                                    | Paso 2                                  |
| 10   | Frontend: hooks + servicios (`useDocumentUpload`, `useJobStatus`, `useCfdi`)                            | Pasos 6, 7, 8                           |
| 11   | Frontend: páginas de documentos y fiscal                                                                | Paso 10                                 |
| 12   | Integration tests (con MinIO y PostgreSQL reales, dentro de contenedor)                                 | Pasos 1–9                               |
| 13   | `pnpm run check` completo (lint, typecheck, test, build)                                                | Pasos 1–12                              |

### 6.2 Dependencias de npm a agregar

| Paquete                         | Propósito                                        | Workspace  |
| ------------------------------- | ------------------------------------------------ | ---------- |
| `@aws-sdk/client-s3`            | Cliente S3 compatible con MinIO                  | `apps/api` |
| `@aws-sdk/s3-request-presigner` | URLs prefirmadas                                 | `apps/api` |
| `bullmq`                        | Colas y workers                                  | `apps/api` |
| `@nestjs/bullmq`                | Integración NestJS-BullMQ                        | `apps/api` |
| `fast-xml-parser`               | Parsing de XML (CFDI) — sin dependencias nativas | `apps/api` |

> Redis ya está en `docker-compose.yml` (EWO-004). No se agrega nuevo servicio de infraestructura para colas.

### 6.3 Estrategia de testing

| Tipo        | Herramienta                                                      | Cobertura mínima                                                                                                                                |
| ----------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | Jest (existente)                                                 | `XmlValidationService`, `CfdiExtractorService`, `DocumentsService`, `CfdiService`, `JobsService` — con mocks de repositorios y `StorageAdapter` |
| Unit        | Jest                                                             | Worker `xml-extraction` — mock de todas las dependencias                                                                                        |
| Integration | Jest + contenedor efímero `node:22-bookworm-slim` + MinIO en red | Flujo completo: API-0023 → upload real → API-0055 polling → API-0027                                                                            |
| Integration | Jest + contenedor                                                | Deduplicación: segundo upload del mismo `folioFiscal` → 409                                                                                     |
| Integration | Jest + contenedor                                                | Rechazo XML malformado → `Document.status = REJECTED`                                                                                           |

---

## 7. Criterios de aceptación

Los siguientes comportamientos deben estar verificados antes de declarar EWO-005 DONE:

| #   | Criterio                                                                                                         | Regla de negocio                      |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 1   | Un usuario con Membresía puede cargar un XML válido y obtener un `documentId` + URL prefirmada                   | BR-DOC-001, BR-DOC-002, API-0023      |
| 2   | El archivo se sube directamente al almacenamiento de objetos (MinIO en dev) sin pasar por NestJS                 | `docs/12_FRONTEND_ARCHITECTURE.md` §9 |
| 3   | El worker procesa el XML: si es CFDI válido → `Document.status = PROCESSED` + `Cfdi` record                      | BR-XML-001, BR-CFDI-002               |
| 4   | Si el XML está mal formado → `Document.status = REJECTED` + `rejectionReason` visible                            | BR-XML-001                            |
| 5   | Campos no determinables en el CFDI aparecen en `ambiguousFields[]`, nunca inferidos                              | BR-XML-002                            |
| 6   | Cargar un XML con `folioFiscal` ya existente en la misma Empresa → 409 DUPLICATE                                 | `docs/08_API_DESIGN.md` §13           |
| 7   | Un documento de la Empresa A no es visible para la Empresa B                                                     | BR-DOC-001, BR-GLB-001                |
| 8   | `GET /documents/{documentId}/download` devuelve URL prefirmada de duración corta, no una ruta pública permanente | `docs/08_API_DESIGN.md` §14           |
| 9   | Ninguna pantalla ni endpoint ofrece timbrado o validación ante el SAT                                            | BR-CFDI-001                           |
| 10  | Usuario con Rol AUDITOR o SUPERVISOR puede leer pero no cargar (`document.upload` requerido para carga)          | `docs/04_BUSINESS_RULES.md` §4.1      |
| 11  | El estado del Job es consultable vía API-0055 hasta un estado terminal                                           | `docs/08_API_DESIGN.md` §15           |
| 12  | `pnpm run check` verde en los 9 paquetes (lint, typecheck, test, test:integration, build)                        | Estándar del proyecto                 |

---

## 8. Definition of Done

EWO-005 se declara **DONE** cuando:

- [ ] Todos los criterios de aceptación de la sección 7 están verificados.
- [ ] Modelos `Document`, `Cfdi`, `Job` presentes en `schema.prisma` y en `_prisma_migrations`.
- [ ] Migración aplicada y validada en PostgreSQL (`prisma migrate status` → "Database schema is up to date!").
- [ ] APIs API-0023 a API-0028 y API-0055 implementadas y respondiendo conforme a `docs/08_API_DESIGN.md`.
- [ ] Páginas de documentos y fiscal renderizan con datos reales (no placeholders) en el frontend.
- [ ] Worker BullMQ `xml-extraction` procesa un CFDI real de prueba de punta a punta.
- [ ] Deduplicación verificada en integration test.
- [ ] Permisos `document.upload` / `document.read` presentes en la tabla `permissions` y asignados a los roles correctos.
- [ ] `pnpm run check` verde.
- [ ] `docs/engineering/EWO-005_DOCUMENTS_FISCAL_REPORT.md` creado con el informe de cierre.
- [ ] `MASTER_CONTEXT.md` actualizado con la entrada de historial de EWO-005.

---

## 9. Riesgos

| Riesgo                                                                                      | Probabilidad                                                                             | Impacto | Mitigación                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Migración Prisma bloqueada por proxy TCP de Docker Desktop** (mismo problema que EWO-004) | Alta — misma infraestructura                                                             | Alto    | Mismo workaround: contenedor Linux efímero `node:22-bookworm-slim` en `contaia_network`. Documentado en EWO-004 §10.8.                                                                                                                                |
| **MinIO presignedUrl en dev ≠ S3 en producción**                                            | Media                                                                                    | Medio   | `StorageAdapter` interfaz abstracta desde el inicio. El adaptador MinIO se usa únicamente en dev/test; `S3Adapter` futuro implementa la misma interfaz sin cambios en la lógica de negocio.                                                           |
| **Estructura de CFDI 4.0 con variantes de emisor**                                          | Media                                                                                    | Medio   | `CfdiExtractorService` debe tolerar campos opcionales del estándar SAT; campos no mapeados van a `ambiguousFields[]` (BR-XML-002), nunca provocan un fallo de extracción.                                                                             |
| **Tamaño máximo de archivo sin definir**                                                    | Alta — pendiente de validación del responsable de producto (`docs/08_API_DESIGN.md` §22) | Medio   | Usar un límite provisional razonable (10 MB para XML de CFDI) hasta que el responsable de producto valide el valor definitivo. Registrar como pregunta abierta en `brain/QUESTIONS.md`.                                                               |
| **Worker BullMQ con Redis reiniciado**                                                      | Baja                                                                                     | Medio   | Jobs en estado `QUEUED`/`PROCESSING` sin resultado tras reinicio del worker deben reintentarse; configurar `removeOnComplete`/`removeOnFail` y DLQ desde el inicio — no añadir como deuda técnica.                                                    |
| **API integration tests de `apps/api` siguen sin ejecutarse desde Windows**                 | Alta — mismo proxy TCP                                                                   | Bajo    | Todos los integration tests se ejecutan dentro del contenedor Linux (patrón EWO-004). No bloquea el cierre.                                                                                                                                           |
| **`fast-xml-parser` vs CFDI con namespaces**                                                | Media                                                                                    | Medio   | Validar con al menos 3 CFDI reales del SAT durante el desarrollo, antes de declarar el extractor como DONE. Los namespaces de CFDI 4.0 (`cfdi:`, `tfd:`) son estándar y `fast-xml-parser` los soporta con configuración de `ignoreAttributes: false`. |

---

## 10. Estimación de complejidad

| Área                              | Complejidad      | Justificación                                                                                                                                                    |
| --------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| StorageModule + MinIO adapter     | Media            | Interfaz conocida (S3 API); complejidad en las URLs prefirmadas y la gestión de expiración                                                                       |
| XmlValidationService              | Baja             | fast-xml-parser es simple; la complejidad es en los edge cases de CFDI                                                                                           |
| CfdiExtractorService              | **Alta**         | CFDI 4.0 tiene complejidades: namespaces, complementos opcionales (`cfdi:Complemento`), variaciones de versiones, campos que pueden ser montos string vs numeric |
| DocumentsModule (backend)         | Media            | CRUD estándar + ciclo de vida de estado; complejidad en la integración con Storage y el trigger de BullMQ                                                        |
| CfdiModule (backend)              | Baja-Media       | Principalmente lectura; la complejidad real está en el extractor                                                                                                 |
| JobsModule                        | Baja             | Esencialmente lectura del estado de BullMQ; sin lógica de negocio propia                                                                                         |
| Worker xml-extraction             | Media            | Orquestación de 3 servicios; manejo correcto de fallos y reintentos                                                                                              |
| Frontend (hooks + servicios)      | Media            | Polling con `refetchInterval` hasta estado terminal; upload directo a MinIO con barra de progreso                                                                |
| Frontend (páginas UI-0012 a 0016) | Media            | UIC-18 (zona de carga) es el componente más complejo; tablas paginadas son estándar                                                                              |
| Migración Prisma                  | Baja             | Modelos claros; el workaround del contenedor ya está documentado                                                                                                 |
| **Total**                         | **~3-4 sprints** | Cohorente con "2-3 sprints" estimados en `docs/19` §17 para Fase 3 + complejidad real del extractor CFDI                                                         |

---

## 11. Dependencias con otros módulos

### 11.1 Módulos que EWO-005 consume (ya implementados)

| Módulo                | Qué consume EWO-005                                                                  |
| --------------------- | ------------------------------------------------------------------------------------ |
| `AuditModule`         | `AuditService.log()` en cada acción de carga, procesamiento y descarga (BR-TRZ-001)  |
| `CompaniesModule`     | Validar que `companyId` existe y está activa antes de aceptar cualquier carga        |
| `AuthenticationGuard` | Toda ruta de documentos requiere sesión válida                                       |
| `CompanyGuard`        | Toda ruta de documentos valida Membresía vigente en la Empresa del parámetro de ruta |
| `PermissionGuard`     | Protege API-0023 (document.upload) y las rutas de lectura (document.read)            |

### 11.2 Módulos que consumirán lo que EWO-005 produce (futuros)

| Módulo futuro                | Qué usará                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `AccountingModule` (EWO-006) | `Cfdi.id` como origen opcional de una Póliza en borrador (BR-CFDI-003)                   |
| `AiModule` (EWO-007+)        | `Document.storageReference` para contexto en consultas al Agente                         |
| `ReportsModule` (EWO-007)    | No consume Documents directamente, pero el Agente puede referenciar evidencia documental |

### 11.3 Impacto sobre autenticación y RBAC

EWO-005 **no modifica** ningún guard, decorator ni lógica de RBAC existente. Únicamente agrega dos permisos nuevos (`document.upload`, `document.read`) a la tabla `permissions` y los asigna a los roles correspondientes mediante un seed ejecutable. La cadena de guards `AuthenticationGuard → CompanyGuard → PermissionGuard` se mantiene sin cambios.

No se crea ningún endpoint sin protección de RBAC. No se modifica el Workspace Context. No se toca el `schema.prisma` de entidades de identidad o RBAC.

---

## 12. Observaciones del Arquitecto

1. **FiscalYear (Ejercicio):** la entidad `Ejercicio` está prevista en el módulo Companies (`docs/20_BACKEND_IMPLEMENTATION_PLAN.md` §3) y es necesaria para Accounting (EWO-006). EWO-005 no la requiere directamente — los documentos no se agrupan por ejercicio en el MVP; la vinculación CFDI-Póliza (que sí usa el Ejercicio) es scope de EWO-006. Recomendación: implementar `FiscalYear` al inicio de EWO-006, no en EWO-005, para no cargar esta Work Order con lógica de negocio contable.

2. **Nota de consistencia documental:** `docs/20_BACKEND_IMPLEMENTATION_PLAN.md` línea 246 debe actualizarse para reflejar que la migración inicial ya fue aplicada (2026-07-22). Esta corrección forma parte del scope inicial de EWO-005 como tarea documental de arranque, antes de comenzar la implementación.

3. **MinIO en `docker-compose.yml`:** agregar el servicio MinIO es el único cambio de infraestructura de desarrollo local autorizado. No modifica el comportamiento de PostgreSQL ni Redis. El healthcheck de MinIO debe verificarse antes de ejecutar integration tests.

4. **Clave de idempotencia en API-0023:** la carga de documentos es una mutación de creación y debe aceptar el encabezado `Idempotency-Key` (`docs/08_API_DESIGN.md` §13). Si el mismo `Idempotency-Key` se recibe dos veces, el servidor devuelve la respuesta original del primer `documentId` sin crear un segundo documento.
