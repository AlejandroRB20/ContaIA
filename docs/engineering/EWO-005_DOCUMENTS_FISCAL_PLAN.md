# EWO-005 Technical Planning — Documents & Fiscal

## Control del documento

| Campo          | Valor                                                                                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EWO            | EWO-005                                                                                                                                                                                                                                     |
| Título         | Documents & Fiscal (Carga de documentos, procesamiento XML y extracción de CFDI)                                                                                                                                                            |
| Estado         | **APPROVED** — correcciones de auditoría aplicadas el 2026-07-23; listo para iniciar implementación                                                                                                                                         |
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

Enumeraciones nuevas:

- `DocumentStatus`: `PENDING_UPLOAD`, `PROCESSING`, `PROCESSED`, `REJECTED`
- `DocumentFileType`: `XML`, `PDF`, `OTHER` — tipo del archivo cargado; no ampliar valores sin evidencia funcional
- `JobStatus`: `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`
- `JobType`: `XML_EXTRACTION`

### 2.3 Frontend

| Ruta                                        | Descripción                                                                                                                                             | UI Spec |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `/{companyId}/documentos`                   | Lista de documentos con estado y filtros básicos                                                                                                        | UI-0012 |
| `/{companyId}/documentos/cargar`            | Zona de carga múltiple (`UIC-18`); polling de estado vía `useJobStatus`                                                                                 | UI-0013 |
| `/{companyId}/documentos/{documentId}`      | Detalle del documento: estado, metadatos, motivo de rechazo                                                                                             | UI-0014 |
| `/{companyId}/fiscal/cfdi`                  | Lista de CFDI procesados con filtros                                                                                                                    | UI-0015 |
| `/{companyId}/documentos/{documentId}/cfdi` | Detalle de CFDI extraído: emisor, receptor, conceptos, campos ambiguos (`D-012` — identidad canónica por `documentId`, nunca `cfdiId` ni `folioFiscal`) | UI-0016 |

Hooks nuevos: `useDocumentUpload`, `useDocuments`, `useDocument`, `useJobStatus`, `useCfdiList`, `useCfdi`.
Servicios nuevos: `documentsService` (grupo 9.5 de `docs/08_API_DESIGN.md`), `fiscalService`.

---

## 3. Fuera de alcance

| Ítem                                                 | Razón                                                                                                                                                        | EWO prevista    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| Vinculación CFDI → Póliza (BR-CFDI-003)              | Depende de `JournalEntriesService` (Accounting module)                                                                                                       | EWO-006         |
| Catálogo de Cuentas y Pólizas                        | Phase 5 del plan de implementación                                                                                                                           | EWO-006         |
| Timbrado o validación ante el SAT/PAC                | Prohibido en el MVP (BR-CFDI-001, BR-GLB-005)                                                                                                                | Etapa 4         |
| Ejercicios fiscales (FiscalYear)                     | Lógicamente es extensión de Companies; se agrega en EWO-006 cuando Contabilidad lo requiera                                                                  | EWO-006         |
| Módulo de Reportes                                   | Phase 7 — depende de Accounting                                                                                                                              | EWO-007         |
| Módulo de IA / Asistente                             | Phase 6 — depende de Accounting                                                                                                                              | EWO-007+        |
| Administration / Notificaciones                      | Phase 8                                                                                                                                                      | EWO-008         |
| Configuración de infraestructura MinIO en producción | Fuera del MVP — no fija proveedor cloud (`docs/20` §2)                                                                                                       | Infraestructura |
| E2E / Playwright                                     | Testing strategy define scope de E2E fuera del MVP de cada EWO                                                                                               | Separado        |
| `FiscalModule` (módulo NestJS propio)                | docs/20 §3 lo lista como módulo independiente; EWO-005 sólo implementa CfdiModule; FiscalModule, si se requiere como orquestador propio, es scope de EWO-006 | EWO-006         |
| Webhook MinIO (`s3:ObjectCreated:*`)                 | Añade configuración de infraestructura, complica trazabilidad y pruebas; no necesario para MVP                                                               | EWO-006+        |
| Borrado físico automático de objetos en MinIO        | No declarado en docs/08 ni en EWO-005; puede ser deuda futura si se requiere limpieza de REJECTED                                                            | EWO posterior   |
| Adaptador S3 producción (`S3StorageAdapter`)         | `StorageAdapter` lo hará posible sin cambios en lógica de negocio; se implementa en infraestructura productiva                                               | Infraestructura |

---

## 4. Arquitectura

### 4.1 Flujo de carga de documento (Workflow 6)

```
Cliente (browser)
  │
  ├─ 1. POST /companies/{companyId}/documents (API-0023)
  │       Headers: Idempotency-Key: <uuid>
  │       Body: { filename, mimeType, fileType }
  │       → Backend crea Document en PENDING_UPLOAD
  │       → StorageAdapter.getPresignedUploadUrl()
  │       ← 202: { documentId, presignedUrl, expiresAt }
  │
  ├─ 2. PUT <presignedUrl>   (cliente → MinIO/S3 directo, nunca pasa por NestJS)
  │       ← 200 OK (del almacenamiento de objetos)
  │
  ├─ 3. POST /documents/{documentId}/confirm-upload   ← TRIGGER DEL WORKER (decisión D-01)
  │       → Backend valida: documento pertenece a empresa activa; estado permite confirmación;
  │         objeto existe en almacenamiento; tamaño y metadatos coherentes.
  │       → Crea o actualiza Job (idempotente: no genera múltiples Jobs activos)
  │       → Encola trabajo en cola BullMQ `xml-extraction`
  │       → Document.status = PROCESSING
  │       ← 202: { jobId }
  │
  ├─ 4. GET /jobs/{jobId} (API-0055) — polling cada N segundos hasta estado terminal
  │       → Worker xml-extraction ejecuta:
  │             XmlValidationService.validate()
  │               Si inválido → Document.status = REJECTED + rejectionReason
  │               Si válido XML → CfdiService.extract() → Document.status = PROCESSED + Cfdi record
  │       ← { status: COMPLETED|FAILED, resourceId, resourceType }
  │
  └─ 5. GET /documents/{documentId}/cfdi (API-0027)   [ADMINISTRADOR, CONTADOR, AUXILIAR, SUPERVISOR, AUDITOR — cfdi.read, D-011]
          ← datos extraídos del CFDI (emisor, receptor, conceptos, folioFiscal, etc.)
```

> **Decisión D-01 — trigger del worker BullMQ:** se usa el endpoint `POST /documents/{id}/confirm-upload` en lugar de un webhook de MinIO. Razón: el webhook añade configuración de infraestructura externa, complica la trazabilidad de errores y no es necesario para el MVP. El endpoint es consistente con el contrato REST ya documentado en `docs/08_API_DESIGN.md` y permite entregar el `jobId` al cliente en la misma respuesta HTTP. Los webhooks de MinIO podrán evaluarse en una etapa futura si el volumen de cargas justifica eliminar el round-trip del cliente.

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
// apps/api/src/modules/storage/storage.interface.ts   ← ubicación CORRECTA (capa de aplicación NestJS)
interface StorageAdapter {
  getPresignedUploadUrl(key: string, expiresInSeconds: number): Promise<string>;
  getPresignedDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

// apps/api/src/modules/storage/minio.adapter.ts  (implementación concreta — dev/test)
// apps/api/src/modules/storage/s3.adapter.ts      (producción futura — misma interfaz)
```

`StorageAdapter` pertenece a la **capa de aplicación NestJS** (`apps/api/`), no al paquete de base de datos (`packages/database/`). `packages/database/` define únicamente el schema de Prisma y los tipos de entidades — nunca un contrato de infraestructura de almacenamiento.

`DocumentsModule` inyecta `StorageAdapter` como token NestJS, nunca el cliente concreto de MinIO (`Minio.Client`) directamente — coherente con el principio de inversión de dependencias de `docs/07_SOFTWARE_ARCHITECTURE.md` §5 y `docs/20_BACKEND_IMPLEMENTATION_PLAN.md` §4. Esta abstracción permite sustituir `MinioStorageAdapter` por `S3StorageAdapter` en producción sin modificar ningún servicio de negocio.

### 4.4 Impacto sobre la guarda de RBAC

> **Matriz actualizada el 2026-08-06 para reflejar `D-011`** (`brain/DECISIONS.md`, `EWO-SEC-NAV-001` `T03`). Esta sección tuvo dos correcciones sucesivas: la primera (addendum §12, §19.1 contradicción 3) añadió a ADMINISTRADOR a `cfdi.read`, pero conservó la exclusión de SUPERVISOR y AUDITOR vigente en ese momento. `D-011` (2026-08-04/05) revisó ese criterio y les concede `cfdi.read` en modo estrictamente lectura. La matriz canónica vigente por acción, con la que esta sección debe permanecer sincronizada, es **`BR-PERM-004`** en `docs/04_BUSINESS_RULES.md`; ante cualquier divergencia futura, `BR-PERM-004` prevalece sobre esta sección. Esta corrección es exclusivamente documental — no modifica ningún guard, código ni el contrato vinculante de `D-011`.

Los permisos que gobiernan Documentos y CFDI, registrados en la tabla `permissions` y asignados a roles:

| Permiso             | Descripción                                                                         | Roles (`D-011`, `BR-PERM-004`)                         |
| ------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `document.upload`   | Cargar documentos a la Empresa                                                      | ADMINISTRADOR, CONTADOR, AUXILIAR                      |
| `document.read`     | Consultar metadatos del documento (nombre, tipo, estado, fecha) — **no** el binario | ADMINISTRADOR, CONTADOR, AUXILIAR, SUPERVISOR, AUDITOR |
| `document.download` | Descargar el archivo original o el XML del CFDI (binario almacenado, API-0026)      | ADMINISTRADOR, CONTADOR, AUXILIAR, SUPERVISOR, AUDITOR |
| `cfdi.read`         | Listar CFDI, ver resumen y ver datos fiscales estructurados — estrictamente lectura | ADMINISTRADOR, CONTADOR, AUXILIAR, SUPERVISOR, AUDITOR |

Ningún permiso de esta tabla se concede a ESTUDIANTE (sandbox, sin permisos reales, `docs/11_SECURITY_ARCHITECTURE.md` §9). `isPlatformAdmin` no forma parte de la matriz de roles empresariales — no es un valor de `RoleName` y no hereda ninguna de estas claves de forma implícita (`D-010`).

**Distinción crítica (`docs/08_API_DESIGN.md` §9.5):**

- `document.read` protege API-0024 (lista) y API-0025 (detalle de metadatos) — **nunca** la descarga del binario. `document.read` no debe asumirse equivalente a obtener el archivo original (`D-011`, contrato vinculante punto 10).
- `document.download` protege **API-0026** (descarga del archivo original) — clave independiente de `document.read`, con los mismos cinco roles.
- `cfdi.read` protege API-0027 (datos CFDI estructurados de un documento) y API-0028 (lista de CFDI de la Empresa). Los cinco roles indicados arriba están autorizados; SUPERVISOR y AUDITOR acceden en modo **estrictamente lectura** — nunca `cfdi.generate` ni `cfdi.cancel`. `cfdi.read` **no** autoriza descargar el XML original: esa descarga depende de `document.download` (mismo binario que el Documento origen), no de `cfdi.read`.
- `PermissionGuard` aplica el permiso granular correcto por endpoint. No se crea ninguna lógica condicional basada directamente en roles.

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
  jobs.controller.ts          (API-0055 polling)
  jobs.service.ts
  jobs.service.spec.ts

apps/api/src/workers/
  xml-extraction.worker.ts
  xml-extraction.worker.spec.ts

packages/database/prisma/
  permissions-catalog.ts      ← Catálogo central de permisos de Documento/CFDI
                                Define: document.upload, document.read, document.download, cfdi.read
  seed.ts                     ← Consume el catálogo central al sembrar Permission/RolePermission
```

**Frontend:**

```
apps/web/src/app/[companyId]/documentos/
  page.tsx                      (lista)
  cargar/page.tsx               (upload)
  [documentId]/
    page.tsx                    (detalle)
    cfdi/page.tsx               (detalle CFDI; identidad canónica: documentId)

apps/web/src/app/[companyId]/fiscal/
  cfdi/page.tsx                 (lista CFDI)

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

| Archivo                                            | Cambio                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `apps/api/src/app.module.ts`                       | Importar DocumentsModule, CfdiModule, XmlProcessingModule, StorageModule, JobsModule |
| `docker-compose.yml`                               | Agregar servicio `minio` (imagen `minio/minio`) con health check y volumen local     |
| `packages/database/prisma/schema.prisma`           | Agregar modelos Document, Cfdi, Job + enums (incluido DocumentFileType)              |
| `apps/web/src/app/[companyId]/app-shell.tsx`       | Agregar ítems de navegación Documentos y Fiscal                                      |
| `docs/20_BACKEND_IMPLEMENTATION_PLAN.md` línea 246 | ✅ YA APLICADO — nota de migración actualizada al 2026-07-22 (EWO-004 DONE)          |

> El catálogo vigente de permisos de Documento/CFDI vive en `packages/database/prisma/permissions-catalog.ts`; `seed.ts` lo consume al sembrar `Permission` y `RolePermission`. Esta es la única fuente de catálogo para `document.upload`, `document.read`, `document.download` y `cfdi.read` (BR-PERM-004).

---

## 6. Estrategia de implementación

### 6.1 Orden recomendado

| Paso | Tarea                                                                                                                                                                                                                                                                                                               | Dependencia                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 1    | Añadir modelos `Document`, `Cfdi`, `Job` + enums (`DocumentStatus`, `DocumentFileType`, `JobStatus`, `JobType`) a `schema.prisma` + generar y aplicar migración Prisma. Si Prisma falla desde Windows, usar el mismo procedimiento Linux/Docker validado en EWO-004 (`node:22-bookworm-slim` en `contaia_network`). | Ninguna                            |
| 2    | Definir o actualizar el catálogo central `packages/database/prisma/permissions-catalog.ts` con `document.upload`, `document.read`, `document.download` y `cfdi.read`, asignados a los roles correctos (§4.4, BR-PERM-004); `seed.ts` lo consume.                                                                    | Paso 1                             |
| 3    | Extender `docker-compose.yml` con servicio `minio` (imagen `minio/minio`) con health check, volumen local y bucket inicial.                                                                                                                                                                                         | Ninguna (paralelo con paso 1)      |
| 4    | Implementar contrato `StorageAdapter` en `apps/api/src/modules/storage/storage.interface.ts` + `StorageModule`.                                                                                                                                                                                                     | Paso 1                             |
| 5    | Implementar `MinioStorageAdapter` en `apps/api/src/modules/storage/minio.adapter.ts` + pruebas unitarias.                                                                                                                                                                                                           | Pasos 3, 4                         |
| 6    | Implementar `DocumentsModule` (servicio + controlador API-0023 a 0026 + repositorio) + pruebas unitarias.                                                                                                                                                                                                           | Pasos 1, 4, 5                      |
| 7    | Implementar `JobsModule` (`JobsService` + controlador API-0055 polling).                                                                                                                                                                                                                                            | Paso 1                             |
| 8    | Implementar endpoint `POST /documents/{id}/confirm-upload` en `DocumentsController`: validar existencia del objeto, crear Job, encolar en BullMQ `xml-extraction`. Idempotente — no genera múltiples Jobs activos.                                                                                                  | Pasos 6, 7                         |
| 9    | Implementar `XmlProcessingModule` (`XmlValidationService` + `CfdiExtractorService`) + pruebas unitarias con CFDI 4.0 reales.                                                                                                                                                                                        | Ninguna (sin DB)                   |
| 10   | Implementar worker BullMQ `xml-extraction` dentro del mismo proceso NestJS (mismo proceso que el servidor HTTP, via `@Processor` + `BullModule.registerQueue`). Orquesta: XmlValidationService → CfdiExtractorService → actualizar Document y crear Cfdi. Separación a proceso independiente es evolución futura.   | Pasos 7, 8, 9                      |
| 11   | Implementar `CfdiModule` (servicio + controlador API-0027, 0028 + repositorio con permiso `cfdi.read`) + pruebas unitarias.                                                                                                                                                                                         | Pasos 1, 9                         |
| 12   | Verificar guards RBAC para los cuatro permisos de Documento/CFDI (`document.upload`, `document.read`, `document.download`, `cfdi.read`) en endpoints de DocumentsModule y CfdiModule. Reutilizar cadena `AuthenticationGuard → CompanyGuard → PermissionGuard` sin modificarla.                                     | Pasos 2, 6, 8, 11                  |
| 13   | Pruebas unitarias backend: cobertura mínima ≥80% en todos los servicios nuevos.                                                                                                                                                                                                                                     | Pasos 6–12                         |
| 14   | Frontend: hooks + servicios (`useDocumentUpload`, `useDocuments`, `useDocument`, `useJobStatus`, `useCfdiList`, `useCfdi`).                                                                                                                                                                                         | Pasos 6–11 (una vez la API exista) |
| 15   | Frontend: páginas UI-0012 a UI-0016 + ítems de navegación en `app-shell.tsx`.                                                                                                                                                                                                                                       | Paso 14                            |
| 16   | Integration tests (flujo completo: API-0023 → confirm-upload → polling API-0055 → API-0027; deduplicación 409; rechazo XML) con MinIO y PostgreSQL reales dentro del contenedor Linux.                                                                                                                              | Pasos 1–15                         |

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

| #   | Criterio                                                                                                                                                                                                                                                                                                                                                                                                                               | Regla de negocio                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | Un usuario con Membresía puede cargar un XML válido y obtener un `documentId` + URL prefirmada                                                                                                                                                                                                                                                                                                                                         | BR-DOC-001, BR-DOC-002, API-0023                                          |
| 2   | El archivo se sube directamente al almacenamiento de objetos (MinIO en dev) sin pasar por NestJS                                                                                                                                                                                                                                                                                                                                       | `docs/12_FRONTEND_ARCHITECTURE.md` §9                                     |
| 3   | El worker procesa el XML: si es CFDI válido → `Document.status = PROCESSED` + `Cfdi` record                                                                                                                                                                                                                                                                                                                                            | BR-XML-001, BR-CFDI-002                                                   |
| 4   | Si el XML está mal formado → `Document.status = REJECTED` + `rejectionReason` visible                                                                                                                                                                                                                                                                                                                                                  | BR-XML-001                                                                |
| 5   | Campos no determinables en el CFDI aparecen en `ambiguousFields[]`, nunca inferidos                                                                                                                                                                                                                                                                                                                                                    | BR-XML-002                                                                |
| 6   | Cargar un XML con `folioFiscal` ya existente en la misma Empresa → 409 DUPLICATE                                                                                                                                                                                                                                                                                                                                                       | `docs/08_API_DESIGN.md` §13                                               |
| 7   | Un documento de la Empresa A no es visible para la Empresa B                                                                                                                                                                                                                                                                                                                                                                           | BR-DOC-001, BR-GLB-001                                                    |
| 8   | `GET /documents/{documentId}/download` devuelve URL prefirmada de duración corta, no una ruta pública permanente                                                                                                                                                                                                                                                                                                                       | `docs/08_API_DESIGN.md` §14                                               |
| 9   | Ninguna pantalla ni endpoint ofrece timbrado o validación ante el SAT                                                                                                                                                                                                                                                                                                                                                                  | BR-CFDI-001                                                               |
| 10  | Usuario con Rol AUDITOR o SUPERVISOR puede leer metadatos (`document.read`), descargar el archivo original o el XML (`document.download`) y consultar datos CFDI estructurados en modo estrictamente lectura (`cfdi.read` — API-0027/API-0028 devuelven 200, nunca `cfdi.generate`/`cfdi.cancel`), pero no puede cargar (`document.upload`). Usuario con Rol ESTUDIANTE recibe 403 en las cuatro claves (sin permisos reales, sandbox) | `D-011` (`brain/DECISIONS.md`), `docs/04_BUSINESS_RULES.md` `BR-PERM-004` |
| 11  | El estado del Job es consultable vía API-0055 hasta un estado terminal                                                                                                                                                                                                                                                                                                                                                                 | `docs/08_API_DESIGN.md` §15                                               |
| 12  | `pnpm run check` verde en los 9 paquetes (lint, typecheck, test, test:integration, build)                                                                                                                                                                                                                                                                                                                                              | Estándar del proyecto                                                     |

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
- [ ] Permisos `document.upload`, `document.read`, `document.download` y `cfdi.read` presentes en la tabla `permissions` y asignados a los roles correctos (§4.4, BR-PERM-004).
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

EWO-005 **no modifica** ningún guard, decorator ni lógica de RBAC existente. Define los cuatro permisos de Documento/CFDI (`document.upload`, `document.read`, `document.download`, `cfdi.read`) en el catálogo central `packages/database/prisma/permissions-catalog.ts`; `seed.ts` los asigna a los roles correspondientes conforme a BR-PERM-004. La cadena de guards `AuthenticationGuard → CompanyGuard → PermissionGuard` se mantiene sin cambios.

No se crea ningún endpoint sin protección de RBAC. No se modifica el Workspace Context. No se toca el `schema.prisma` de entidades de identidad o RBAC.

---

## 12. Observaciones del Arquitecto

1. **FiscalYear (Ejercicio):** la entidad `Ejercicio` está prevista en el módulo Companies (`docs/20_BACKEND_IMPLEMENTATION_PLAN.md` §3) y es necesaria para Accounting (EWO-006). EWO-005 no la requiere directamente — los documentos no se agrupan por ejercicio en el MVP; la vinculación CFDI-Póliza (que sí usa el Ejercicio) es scope de EWO-006. Recomendación: implementar `FiscalYear` al inicio de EWO-006, no en EWO-005, para no cargar esta Work Order con lógica de negocio contable.

2. **Nota de consistencia documental:** `docs/20_BACKEND_IMPLEMENTATION_PLAN.md` línea 246 debe actualizarse para reflejar que la migración inicial ya fue aplicada (2026-07-22). Esta corrección forma parte del scope inicial de EWO-005 como tarea documental de arranque, antes de comenzar la implementación.

3. **MinIO en `docker-compose.yml`:** agregar el servicio MinIO es el único cambio de infraestructura de desarrollo local autorizado. No modifica el comportamiento de PostgreSQL ni Redis. El healthcheck de MinIO debe verificarse antes de ejecutar integration tests.

4. **Clave de idempotencia en API-0023:** la carga de documentos es una mutación de creación y debe aceptar el encabezado `Idempotency-Key` (`docs/08_API_DESIGN.md` §13). Si el mismo `Idempotency-Key` se recibe dos veces, el servidor devuelve la respuesta original del primer `documentId` sin crear un segundo documento.

5. **Nomenclatura "Files" vs "DocumentsModule":** `docs/20_BACKEND_IMPLEMENTATION_PLAN.md` §3, §16 y el diagrama Mermaid §18.6 denominan la Fase 3 como "Files". `DocumentsModule` es el nombre técnico del módulo NestJS de esta EWO. No son dos módulos distintos: "Files" es el nombre histórico de la fase en la documentación de planificación; `DocumentsModule` es el nombre oficial del módulo de código. No existe un módulo NestJS llamado `FilesModule`.

6. **`FiscalModule` — exclusión explícita:** `docs/20_BACKEND_IMPLEMENTATION_PLAN.md` §3 lista "Fiscal" como módulo independiente con su propia `FiscalService`. EWO-005 **no implementa** ese módulo. La funcionalidad CFDI se cubre con `CfdiModule`; si se necesita una capa de orquestación `FiscalModule` adicional, se evaluará en EWO-006 una vez `CfdiModule` esté estable. La entrada de §3 (fuera de alcance) documenta esta decisión.

7. **Worker BullMQ — mismo proceso:** en EWO-005 el worker `xml-extraction` operará dentro del mismo proceso NestJS que el servidor HTTP, mediante `@Processor()` + `BullModule.registerQueue()`. No se crea un proceso Node.js separado. La separación a proceso independiente es una evolución futura que no requiere cambios en los contratos de los servicios gracias al diseño modular.

8. **`DocumentFileType` — enum nuevo:** se añade el enum `DocumentFileType` (valores: `XML`, `PDF`, `OTHER`) al schema de Prisma. No ampliar valores sin evidencia funcional aprobada por el responsable de producto. Este enum no estaba en el plan original y se agregó en la corrección de auditoría del 2026-07-23.
