# EWO-SEC-NAV-001 — Tenant Isolation & Navigation Contracts

## Control del documento

| Campo          | Valor                                                                                                                                                                                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Work Order     | EWO-SEC-NAV-001                                                                                                                                                                                                                                                              |
| Título         | Tenant Isolation & Navigation Contracts                                                                                                                                                                                                                                      |
| Tipo           | **Corrección prioritaria de seguridad y contratos de navegación** — no es una Work Order de funcionalidad nueva                                                                                                                                                              |
| Estado         | **EN PROGRESO.** `T01` — `PASSED` (auditoría final `READ ONLY` de Codex, `PASSED CON OBSERVACIONES`, ver §17). `T02` — `PASSED` (idem, ver §17). `T03` — `IMPLEMENTADA · PENDIENTE DE REAUDITORÍA` (`D-011`, ver §§19–23). `T04` — `IMPLEMENTADA · PENDIENTE DE REAUDITORÍA` (`D-012`, ver §18). `T05`/`T06` pendientes. `D-010` `IMPLEMENTADA · PASSED`; `D-011` y `D-012` `IMPLEMENTADA · PENDIENTE DE REAUDITORÍA` |
| Severidad      | **CRÍTICA** (`T01`) · ALTA (`T02`, `T03`, `T04`)                                                                                                                                                                                                                             |
| Fecha del plan | 2026-08-04                                                                                                                                                                                                                                                                   |
| Baseline       | `feature/frontend-ux-audit` · HEAD `b5b289d32fdcc8d7ab61fd62ecfe0316b8c75be8`                                                                                                                                                                                                |
| Origen         | Auditoría independiente de navegación (veredicto `RECHAZADO`, cuatro bloqueadores) y análisis de confirmación contra el código, 2026-08-04                                                                                                                                    |
| Decisiones     | [`D-010`](../../brain/DECISIONS.md), [`D-011`](../../brain/DECISIONS.md), [`D-012`](../../brain/DECISIONS.md)                                                                                                                                                                |
| Fuentes        | `docs/04_BUSINESS_RULES.md`, `docs/08_API_DESIGN.md`, `docs/09_DATABASE_DESIGN.md`, `docs/11_SECURITY_ARCHITECTURE.md`, `docs/14_INFORMATION_ARCHITECTURE.md`, `docs/15_UX_FLOWS.md`, `docs/16_WIREFRAMES_SPECIFICATION.md`, `docs/31_MASTER_SCREEN_MAP.md`, `docs/32_MASTER_NAVIGATION_ARCHITECTURE.md`, `docs/engineering/EWO-004_USER_RBAC_REPORT.md` §10, `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md` |
| Prerrequisitos | `D-010`, `D-011` y `D-012` registradas y aprobadas — **cumplido el 2026-08-04**                                                                                                                                                                                              |

---

> **Esta Work Order no sustituye ni cierra EWO-005.** Ambas coexisten. Ver §8 para la relación exacta, incluidas las superficies congeladas y las que continúan.

> **Estado de implementación vigente: `EWO-SEC-NAV-001` `EN PROGRESO`.** `T01` `PASSED`; `D-010` `IMPLEMENTADA · PASSED`; `T02` `PASSED` — ambas con auditoría final independiente `READ ONLY` de Codex, veredicto `PASSED CON OBSERVACIONES` (dos hallazgos `BAJO`, no bloqueantes, registrados como seguimiento — ver §17). `T03` y `D-011`: `IMPLEMENTADA · PENDIENTE DE REAUDITORÍA` (ver §§19–23). `T04` y `D-012`: `IMPLEMENTADA · PENDIENTE DE REAUDITORÍA` (ver §18). `T05`/`T06` pendientes. Fuente detallada del estado vigente: tabla de control del documento arriba y §13.

---

## 1. Objetivo

Cerrar el defecto **fail-open** de autorización company-scoped y fijar los contratos de navegación, permisos e identidad de CFDI que la auditoría independiente detectó sin definir.

El defecto central no es que los guards permitan el paso a un Administrador de plataforma — eso es intencional y está documentado en `D-002`. El defecto es que **la denegación es opt-in por endpoint**: depende de que cada controlador recuerde inyectar `@Company()`. Esta Work Order traslada la decisión a un punto central que deniega por defecto, de modo que la corrección elimine la **clase** de defecto y no solo sus seis instancias actuales.

## 2. Alcance

| Incluye                                                                                    | Tarea |
| ------------------------------------------------------------------------------------------ | ----- |
| Los cuatro guards de `apps/api/src/common/guards/` y `assertActorIsCompanyAdmin`           | `T01` |
| Contrato de navegación del selector de Empresa y del shell de aplicación                   | `T02` |
| Catálogo de permisos (`Permission`/`RolePermission`) y resolución de `document.download`    | `T03` |
| Ruta canónica de detalle de CFDI en documentación y frontend                                | `T04` |
| Sincronización del corpus documental afectado                                               | `T05` |
| Auditoría final independiente                                                               | `T06` |

## 3. Fuera de alcance

- **`API-0053` y el flujo de soporte JIT completo.** Pertenece al módulo Administration, Fase 8 — determinación ya registrada en `EWO-004_USER_RBAC_REPORT.md` §10.2. `D-010` cierra el acceso no autorizado; **no** implementa el acceso autorizado.
- Modelo `SupportAccessGrant`, migraciones asociadas y `PAGE-0033` (Panel de soporte).
- `E5-S3-T06` y cualquier tarea del Bloque E de EWO-005.
- Modificación de `D-001` a `D-009`.
- Rediseño visual, sistema de diseño y prototipo navegable.
- Creación de permisos de modificación o eliminación de CFDI — son operaciones **inexistentes por diseño** (`D-011` contrato 8), no capacidades pendientes.

## 4. Dependencias

| Dependencia                                                | Estado                       |
| ---------------------------------------------------------- | ---------------------------- |
| `D-010` aprobada antes de iniciar `T01`                    | ✅ Cumplida (2026-08-04)     |
| `D-011` aprobada antes de iniciar `T03`                    | ✅ Cumplida (2026-08-04)     |
| `D-012` aprobada antes de iniciar `T04`                    | ✅ Cumplida (2026-08-04)     |
| Resolución explícita de `document.download`                | ✅ Cumplida (2026-08-05) — aprobada para Administrador, Contador, Auxiliar, Supervisor, Auditor; Estudiante excluida |
| `T01` cerrada antes de `T05`                               | ⛔ Pendiente                 |
| `T01`–`T05` cerradas antes de `T06`                        | ⛔ Pendiente                 |

## 5. Tareas

### T01 — Platform Admin y tenant isolation

**Severidad `CRÍTICA`. Implementa `D-010`.**

- Centralizar la denegación en el punto de decisión empresarial: resolver un contexto de empresa autorizado o denegar.
- Eliminar los bypasses incondicionales de `PermissionGuard`, `RoleGuard`, `OwnershipGuard` y `assertActorIsCompanyAdmin`, alineándolos con el contexto autorizado.
- Mantener `@Company()` como defensa en profundidad — **no se elimina**.
- Cubrir los **seis endpoints confirmados**:

| Endpoint                                        | Capacidad expuesta hoy                            |
| ----------------------------------------------- | ------------------------------------------------- |
| `PATCH /v1/companies/:companyId/fiscal-profile` | Modificar régimen fiscal de cualquier Empresa     |
| `PATCH /v1/companies/:companyId/address`        | Modificar domicilio fiscal de cualquier Empresa   |
| `PATCH /v1/companies/:companyId/settings`       | Modificar configuración regional                  |
| `GET /v1/companies/:companyId/memberships`      | Leer PII de terceros (correos, roles, `isOwner`)  |
| `PATCH /v1/memberships/:membershipId`           | Cambiar el Rol de cualquier usuario               |
| `DELETE /v1/memberships/:membershipId`          | Revocar cualquier Membership                      |

- Registrar el intento denegado con la capacidad vigente de `AuditService`, **sin inventar un contexto JIT**.
- Agregar pruebas que impidan la reaparición del patrón, no solo que cubran las seis instancias.

### T02 — Company switch

**Severidad `ALTA`.** Corrige la pérdida silenciosa de la elección de Empresa.

Contrato de navegación:

- **Cambio manual:** el origen navega a `/seleccionar-empresa` **sin `next`**. Destino siempre `/{chosenCompanyId}/inicio`.
- **Recuperación de sesión o deep link:** conservar `next` **únicamente** cuando se cumplan las cuatro condiciones:
  1. es ruta interna segura (`safeInternalPath`);
  2. su primer segmento coincide con la Empresa elegida;
  3. existe Membership activa en esa Empresa;
  4. el recurso continúa autorizado.
- Si falla cualquiera, **degradar a `/{chosenCompanyId}/inicio`** — nunca a la Empresa anterior.

La validación de cliente permanece cosmética por diseño: la autorización real sigue siendo server-side en cada petición.

### T03 — Permisos de Auditor y Supervisor

**Severidad `ALTA`. Implementa `D-011`.**

- Aplicar la concesión de `cfdi.read` a Auditor y Supervisor, estrictamente de lectura.
- **Resolver `document.download`**: aprobar la clave separada o denegarla de forma explícita. No debe quedar resuelta por omisión bajo `document.read`.
- Sincronizar catálogo de permisos, contrato de `API-0027` y documentación.
- **No crear** permisos para modificar o eliminar CFDI.

### T04 — Identidad canónica de CFDI

**Severidad `ALTA`. Implementa `D-012`.**

- Adoptar `/{companyId}/documentos/{documentId}/cfdi` como ruta canónica única.
- Unificar documentación y frontend; **eliminar** las formas retiradas, no solo añadir la nueva.
- Mantener `cfdiId` como identificador interno de persistencia.
- **No usar `folioFiscal` en URLs.**
- La ruta debe resolver durante `PENDING_UPLOAD`, `PROCESSING`, `PROCESSED` y estados de fallo permitidos, **incluso sin fila `Cfdi`**.

### T05 — Sincronización documental

Fuentes a sincronizar, como mínimo:

`docs/04_BUSINESS_RULES.md` · `docs/08_API_DESIGN.md` · `docs/11_SECURITY_ARCHITECTURE.md` · `docs/14_INFORMATION_ARCHITECTURE.md` · `docs/15_UX_FLOWS.md` · `docs/16_WIREFRAMES_SPECIFICATION.md` · `docs/31_MASTER_SCREEN_MAP.md` · `docs/32_MASTER_NAVIGATION_ARCHITECTURE.md` · `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md` · índices y contexto operativo que correspondan.

Contradicciones conocidas a resolver, con su autoridad determinada:

| Contradicción                                                                     | Autoridad que prevalece                        |
| --------------------------------------------------------------------------------- | ---------------------------------------------- |
| `docs/31` línea 78 («fiscal») vs. línea 120 (`PAGE-0020` sin Auditor)             | `D-011` y `docs/04` §5.1                       |
| `docs/31` línea 120 omite al Administrador vs. `API-0027` que lo incluye          | `docs/08_API_DESIGN.md`                        |
| Tres formas de ruta de CFDI en `docs/14`, `docs/31`, `docs/32` y plan de EWO-005  | `D-012`                                        |
| `docs/14` `ROUTE-0019` (`{cfdiId}`) vs. ruta canónica adoptada                    | `D-012` — `docs/14` debe reflejarla            |

### T06 — Auditoría independiente final

- Ejecutada por **Codex**, `READ ONLY`.
- Debe verificar **código, pruebas y documentación** — no solo código.
- Veredicto requerido para cierre: **`PASSED`**.
- Conforme a `AI_PLAYBOOK.md`, ninguna tarea puede autocertificarse.

## 6. Orden de ejecución

```text
T01 → (T02 || T03 || T04) → T05 → T06
```

`T01` es prioritaria por severidad `CRÍTICA`. `T02`, `T03` y `T04` son mutuamente independientes y pueden ejecutarse en paralelo una vez cerrada `T01`. `T05` requiere las cuatro anteriores cerradas para no sincronizar contra un blanco móvil.

## 7. Criterios de aceptación

### T01

1. Platform Admin sin Membership obtiene `403` en los seis endpoints confirmados.
2. **Un endpoint company-scoped nuevo nace protegido aunque omita `@Company()`.**
3. Ningún guard conserva un bypass universal incompatible con `D-010`.
4. No se crea Membership implícita, rol sintético, `isOwner` artificial ni permiso derivado de un rol inexistente.
5. **No se implementa `API-0053`.**
6. Existen pruebas directas y de regresión por endpoint.
7. Se registra el intento denegado según la capacidad vigente, sin inventar un contexto JIT.

### T02

1. Seleccionar B desde A lleva **siempre** a B.
2. Un `next` perteneciente a A **no se honra** después de seleccionar B.
3. Los deep links válidos de B **pueden** conservarse.
4. Las autorizaciones permanecen server-side.

### T03

1. Existe una **matriz única por acción**. ✅ — `docs/04_BUSINESS_RULES.md` BR-PERM-004 es la matriz canónica; `docs/08`, `docs/31`, `docs/15`, `docs/16` la referencian sin contradicción.
2. Auditor y Supervisor reciben únicamente lectura de CFDI. ✅ — `cfdi.read` en `packages/database/prisma/permissions-catalog.ts`; sin `cfdi.generate`/`cfdi.cancel`.
3. No aparecen permisos de escritura inexistentes. ✅ — ningún `cfdi.update`/`cfdi.delete` creado (BR-INT-002).
4. La descarga de archivos queda resuelta **explícitamente**. ✅ — `document.download` aprobada (2026-08-05) para Administrador, Contador, Auxiliar, Supervisor, Auditor (Estudiante excluida); clave creada en `packages/database/prisma/permissions-catalog.ts`, nunca por omisión bajo `document.read` (ver §20).

### T04

1. Existe una sola ruta canónica.
2. API, documentación y frontend usan `documentId`.
3. El flujo funciona **aunque todavía no exista una fila `Cfdi`**.
4. `folioFiscal` no aparece en la URL.

### T05

1. No quedan contradicciones conocidas entre las fuentes sincronizadas.

### T06

1. Veredicto final **`PASSED`**.

## 8. Relación con EWO-005

Registro expreso, conforme al análisis de superficies compartidas:

- **`E5-S3-T06` puede continuar.** Es trabajo del parser XML: no expone endpoints, no toca guards, no toca navegación ni rutas de CFDI.
- **No comparte superficie con esta corrección.** Ninguna de las seis rutas afectadas por `T01` pertenece al Bloque E; el módulo `cfdi/` implementado contiene repositorios y persistencia, sin controlador.
- **Se congelan los endpoints company-scoped nuevos hasta cerrar `T01`.** Mientras la denegación siga siendo opt-in, cada endpoint nuevo es una instancia potencial del mismo defecto.
- **Se congela la implementación definitiva del detalle de CFDI hasta cerrar `T04`.** Afecta a `apps/web/src/app/[companyId]/documentos/**`, hoy sin versionar.
- **Esta Work Order no sustituye ni cierra EWO-005.** EWO-005 conserva su estado, su checklist y su secuencia de sprints sin alteración.

Ejecución **paralela como corrección prioritaria separada**, no interrupción formal de EWO-005: detener EWO-005 pararía trabajo que no comparte superficie con ninguno de los cuatro bloqueadores.

## 9. Pruebas obligatorias

| Tarea | Prueba                                                                                                          |
| ----- | --------------------------------------------------------------------------------------------------------------- |
| `T01` | Rechazo de Platform Admin por **cada** endpoint company-scoped                                                  |
| `T01` | **Un endpoint nuevo sin `@Company()` sigue protegido** — prueba de la clase de defecto, no de sus instancias    |
| `T01` | Regresión: ningún usuario con Membership válida cambia de comportamiento                                        |
| `T02` | Caso A (cambio manual) y Caso B (deep link), incluido un `next` perteneciente a otra Empresa                     |
| `T03` | Permisos por rol contra el catálogo sembrado, para los seis roles oficiales                                     |
| `T04` | Resolución de la ruta con Documento en `PENDING_UPLOAD` y en `PROCESSING` (sin fila `Cfdi`)                      |

La ausencia de la primera clase de prueba es la causa directa de que la regresión de `EWO-004` §10.3 pasara inadvertida.

## 10. Riesgos

| ID       | Riesgo                                                                        | Mitigación                                                                       |
| -------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `RW-01`  | `T01` rompe flujos internos que hoy dependan del bypass                       | Inventariar antes de modificar. No se conoce ninguno; verificar, no asumir       |
| `RW-02`  | Falsa sensación de cumplimiento de `BR-SEC-004`                               | Declarar expresamente que la parte positiva sigue pendiente hasta `API-0053`     |
| `RW-03`  | `T03` amplía la lectura de datos fiscales a dos roles                         | Estrictamente lectura; descarga gobernada por clave separada                     |
| `RW-04`  | `document.download` queda sin resolver y la descarga hereda `document.read`   | **Resuelto (2026-08-05)** — clave aprobada y creada; ver §20 |
| `RW-05`  | `T04` invalida deep links previos                                             | Sin usuarios en producción; el costo es nulo ahora y crece con el primer tenant  |
| `RW-06`  | Reintroducción de `cfdiId` en URLs por inercia de `docs/31`/`docs/32`         | `T05` elimina las formas retiradas, no solo añade la nueva                       |
| `RW-07`  | Presión operativa por reabrir el bypass ante una urgencia de soporte          | `D-010` contrato 2 y 12: la vía es `API-0053`, nunca una excepción puntual       |

## 11. Rollback

| Tarea | Reversibilidad                                                                 |
| ----- | ------------------------------------------------------------------------------ |
| `T01` | Revert directo. **Sin migración**                                              |
| `T02` | Revert directo. Solo frontend                                                  |
| `T03` | Requiere reseed del catálogo de permisos                                       |
| `T04` | Documental más rutas de frontend                                               |
| `T05` | Documental                                                                     |

**Ninguna tarea introduce migración de base de datos.** Es una propiedad deliberada del diseño de `D-010` y una razón material para haber preferido la alternativa (D) sobre implementar el flujo JIT completo: una corrección de seguridad debe poder revertirse sin tocar datos.

## 12. Documentación afectada

`brain/DECISIONS.md` · `brain/DECISION_INDEX.md` · `AI_CONTEXT.md` · `CHANGELOG.md` · `PROJECT_INDEX.md` · `docs/04_BUSINESS_RULES.md` · `docs/08_API_DESIGN.md` · `docs/11_SECURITY_ARCHITECTURE.md` · `docs/14_INFORMATION_ARCHITECTURE.md` · `docs/15_UX_FLOWS.md` · `docs/16_WIREFRAMES_SPECIFICATION.md` · `docs/31_MASTER_SCREEN_MAP.md` · `docs/32_MASTER_NAVIGATION_ARCHITECTURE.md` · `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md`

## 13. Estado por tarea

| Tarea | Estado                                       | Decisión que implementa | Auditoría |
| ----- | ---------------------------------------------- | ----------------------- | --------- |
| `T01` | **PASSED**                                   | `D-010`                 | Final: `PASSED CON OBSERVACIONES` (Codex, `READ ONLY`, 2026-08-04) — [`EWO-SEC-NAV-001-T01_FINAL_AUDIT.md`](audits/EWO-SEC-NAV-001-T01_FINAL_AUDIT.md), ver §17 |
| `T02` | **PASSED**                                   | —                       | Final: `PASSED CON OBSERVACIONES` (Codex, `READ ONLY`, 2026-08-04) — [`EWO-SEC-NAV-001-T02_FINAL_AUDIT.md`](audits/EWO-SEC-NAV-001-T02_FINAL_AUDIT.md), ver §17 |
| `T03` | **IMPLEMENTADA · PENDIENTE DE REAUDITORÍA**  | `D-011`                 | Pendiente reauditoría independiente (Codex, `READ ONLY`) |
| `T04` | **IMPLEMENTADA · PENDIENTE DE REAUDITORÍA**  | `D-012`                 | Pendiente reauditoría independiente (Codex, `READ ONLY`), ver §18 |
| `T05` | **PENDIENTE**                                | —                       | Pendiente |
| `T06` | **PENDIENTE**                                | —                       | —         |

`T01` y `T02` cierran administrativamente el 2026-08-04 tras auditoría final independiente `READ ONLY` de Codex, ambas con veredicto `PASSED CON OBSERVACIONES` — ver §17 para el detalle y las dos observaciones `BAJO` registradas como seguimiento no bloqueante. `T04` implementada el 2026-08-04 (documentación de arquitectura de información, sin cambios de código) — ver §18.

## 14. Reporte de implementación de T01 (2026-08-04)

### 14.1 Causa raíz corregida

`CompanyGuard` dejó de retornar `true` para `isPlatformAdmin` sin resolver Membership. Ahora resuelve Membership **siempre**; si no existe, deniega con `403` — sin distinguir si el actor es Administrador de plataforma. La protección deja de depender de que un controlador use `@Company()`: nace en el guard, que ya se aplica en toda ruta `:companyId` existente.

### 14.2 Inventario previo (Tarea 1)

Rutas company-scoped inventariadas y su dependencia real del bypass, verificada contra el código antes de editar:

| Ruta | `CompanyGuard` aplicado | Dependía del bypass |
| --- | --- | --- |
| `GET /v1/companies/:companyId` | Sí | No (ya usaba `@Company()`) |
| `PATCH /v1/companies/:companyId` | Sí | No (ya usaba `@Company()`) |
| `POST /v1/companies/:companyId/invitations` | Sí | No (ya usaba `@Company()`) |
| `GET /v1/companies/:companyId/my-permissions` | Sí | No (ya usaba `@Company()`) |
| `POST /v1/companies/:companyId/documents` | Sí | No (ya usaba `@Company()`) |
| `GET /v1/companies/:companyId/documents` | Sí | No (ya usaba `@Company()`) |
| `PATCH /v1/companies/:companyId/fiscal-profile` | Sí | **Sí** — sin `@Company()`, protegido solo por el guard tras esta corrección |
| `PATCH /v1/companies/:companyId/address` | Sí | **Sí** — idem |
| `PATCH /v1/companies/:companyId/settings` | Sí | **Sí** — idem |
| `GET /v1/companies/:companyId/memberships` | Sí | **Sí** — idem |
| `PATCH /v1/memberships/:membershipId` | No (ruta plana) | **Sí** — vía `assertActorIsCompanyAdmin` |
| `DELETE /v1/memberships/:membershipId` | No (ruta plana) | **Sí** — vía `assertActorIsCompanyAdmin` |
| `GET /v1/documents/:documentId` | No (ruta plana) | No — `DocumentsAuthorizationService` ya excluía el bypass deliberadamente |
| `POST /v1/documents/:documentId/confirm-upload` | No (ruta plana) | No — idem |

**Hallazgo del inventario:** las cuatro rutas de `companies.controller.ts` marcadas "No" ya estaban protegidas por `@Company()`/`extractMembership()` — la corrección de `CompanyGuard` las deja intactas en su comportamiento observable, pero elimina su dependencia de ese decorador como única barrera. Ningún flujo platform-scoped legítimo se encontró mezclado dentro de una ruta company-scoped: `RoleGuard`, `PermissionGuard` y `OwnershipGuard` no se aplican hoy fuera del contexto ya resuelto por `CompanyGuard`.

**Pruebas que afirmaban el bypass como correcto**, identificadas y corregidas: `company.guard.spec.ts`, `permission.guard.spec.ts`, `role.guard.spec.ts`, `ownership.guard.spec.ts` — las cuatro tenían un caso `it('un Administrador de plataforma satisface/no requiere/permite...')` que se sustituyó por un caso que verifica el rechazo.

### 14.3 Archivos modificados

| Archivo | Cambio |
| --- | --- |
| `apps/api/src/common/guards/company.guard.ts` | Bypass eliminado; resolución de Membership incondicional; emisión de evento al denegar a un Platform Admin |
| `apps/api/src/common/guards/permission.guard.ts` | Bypass eliminado; opera solo sobre `request.membership` |
| `apps/api/src/common/guards/role.guard.ts` | Bypass eliminado; comentario actualizado |
| `apps/api/src/common/guards/ownership.guard.ts` | Bypass eliminado |
| `apps/api/src/modules/roles-permissions/services/memberships.service.ts` | `assertActorIsCompanyAdmin` ya no retorna temprano por `isPlatformAdmin`; emite el mismo evento de denegación; `context` propagado desde `updateRole`/`revoke` |
| `apps/api/src/common/events/auth.events.ts` | Nuevo evento `PLATFORM_ADMIN_COMPANY_ACCESS_DENIED` + clase `PlatformAdminCompanyAccessDeniedEvent` |
| `apps/api/src/modules/audit/audit.service.ts` | Nuevo listener `onPlatformAdminCompanyAccessDenied`, `result: 'FAILURE'`, sin campo `reason` |
| `apps/api/src/common/guards/company.guard.spec.ts` | Reescrito: casos de denegación, verificación de evento, y prueba de regresión estructural (endpoint sin `@Company()`) |
| `apps/api/src/common/guards/permission.guard.spec.ts` | Caso de bypass sustituido por caso de denegación + caso de Membership ya resuelta |
| `apps/api/src/common/guards/role.guard.spec.ts` | Idem |
| `apps/api/src/common/guards/ownership.guard.spec.ts` | Idem |
| `apps/api/src/modules/roles-permissions/services/memberships.service.spec.ts` | +3 pruebas: denegación en `updateRole`, denegación en `revoke`, no-emisión del evento para un actor no-Platform-Admin |

**Sin cambios fuera de `apps/api/src/`.** Ningún controlador, frontend, `schema.prisma`, `seed.ts` ni migración fue tocado.

### 14.4 Auditoría de intentos denegados (Tarea 6)

Se reutilizó el bus de eventos existente (`EventEmitter2`, ya registrado globalmente por `EventEmitterModule.forRoot()` en `app.module.ts`) en vez de inyectar `AuditRepository` directamente en los guards — el mismo patrón desacoplado que ya usan `CompaniesService`/`MembershipsService` para el resto de eventos de auditoría. Esto evita cualquier dependencia circular entre `CommonModule` (global, contiene los guards) y `AuditModule`: los guards emiten, `AuditService` escucha, sin que ninguno importe al otro.

El evento se emite **únicamente** cuando el actor denegado tiene `isPlatformAdmin=true` — una denegación ordinaria (usuario sin Membership, sin ser Platform Admin) no genera este registro, verificado por prueba explícita. Payload: `actorUserId`, `companyId` (siempre disponible: es el parámetro de ruta o el `companyId` de la Membership objetivo, nunca dato fiscal), `correlationId`, `ipAddress`, `deviceInfo`, `result: 'FAILURE'`. Sin `reason`, sin simular contexto JIT.

### 14.5 Validación ejecutada

| Comando | Resultado |
| --- | --- |
| `tsc --noEmit` (apps/api) | Sin errores |
| `eslint src` (apps/api, árbol completo) | Sin errores ni advertencias |
| `nest build` (apps/api) | Compila sin errores |
| `jest` — suites de guards, memberships, companies, documents | 8 suites, verde |
| `jest` — suite completa de apps/api | **40 suites, 608 pruebas, todas verdes** (598 antes de esta tarea + 10 nuevas) |

## 15. Corrección de hallazgos de la primera auditoría de T01 (2026-08-04)

Auditoría independiente sobre la implementación de T01 (§14): veredicto **`PENDIENTE DE CORRECCIÓN`**, tres hallazgos, ninguno sobre la corrección de seguridad en sí (los guards, `assertActorIsCompanyAdmin` y el evento de auditoría quedaron sin objeciones).

### 15.1 Hallazgo 1 (MEDIO) — pruebas HTTP autenticadas faltantes

**Problema:** la validación de T01 se apoyaba en pruebas unitarias de guard/servicio; faltaban pruebas HTTP reales, autenticadas, de extremo a extremo por la cadena de guards.

**Corrección:** nueva suite [`test/platform-admin-tenant-isolation.e2e-spec.ts`](../../apps/api/test/platform-admin-tenant-isolation.e2e-spec.ts), reutilizando exactamente el patrón ya establecido por `auth.e2e-spec.ts`/`companies.e2e-spec.ts` (`Test.createTestingModule({ imports: [AppModule] })` + `supertest`, sin PostgreSQL real) — no se creó una infraestructura E2E paralela. Se extendió únicamente con `.overrideProvider(...)`, técnica estándar de `@nestjs/testing`, sobre los repositorios que la autenticación/autorización consultan (`SessionsRepository`, `UsersRepository`, `MembershipsRepository`, `CompaniesRepository`, `RolesRepository`, `AuditRepository`). Se firma un JWT real con el `JwtService` de la aplicación compilada y se autentica con la cookie `contaia_access_token` real — ninguna prueba invoca el guard ni el método del controller directamente.

10 pruebas: los seis endpoints confirmados devuelven `403` para un Platform Admin sin Membership, con verificación explícita de que la mutación sensible (`CompaniesRepository.updateFiscalProfile/updateAddress/updateSettings`, `MembershipsRepository.updateRole/revoke/findAllForCompany`) nunca se invoca; las dos rutas planas por `membershipId` usan una Membership objetivo perteneciente a `OTHER_COMPANY_ID` y confirman por aserción que `companyId` se resuelve desde el propio recurso (`membershipsRepository.findActiveByUserAndCompany` se llama con ese `companyId`, nunca uno elegido por el cliente); tres casos positivos (Administrador de Empresa con Membership real opera con éxito; un Platform Admin que **también** sostiene Membership `ADMINISTRADOR` real es autorizado por esa Membership, no por el booleano); una prueba adicional que fuerza el fallo de `AuditRepository.append()` y confirma que el `403` no se ve afectado.

### 15.2 Hallazgo 2 (MEDIO) — estados documentales contradictorios

**Problema:** tras implementar T01, algunos registros seguían describiéndola como pendiente de implementar mientras otros ya la daban por implementada, sin un estado único y consistente.

**Corrección:** sincronizados a los estados exactos: `T01` → `IMPLEMENTADA · PENDIENTE DE REAUDITORÍA`; `D-010` → `IMPLEMENTADA · PENDIENTE DE AUDITORÍA FINAL`; `EWO-SEC-NAV-001` → `EN PROGRESO`. Actualizados: este documento (control del documento, §13), `brain/DECISIONS.md` (Historial + Estado de D-010), `brain/DECISION_INDEX.md`, `AI_CONTEXT.md` (estado actual, decisiones activas, siguiente paso). Ninguna se marcó `PASSED`; `T02`–`T06` conservan `NO INICIADA`.

### 15.3 Hallazgo 3 (BAJO) — sin prueba directa del listener de auditoría

**Problema:** el evento `PLATFORM_ADMIN_COMPANY_ACCESS_DENIED` y su listener en `AuditService` no tenían prueba propia; su comportamiento solo se inferí­a indirectamente.

**Corrección:** nueva suite [`src/modules/audit/audit.service.spec.ts`](../../apps/api/src/modules/audit/audit.service.spec.ts), mismo patrón unitario que el resto de listeners de `AuditService` (instanciación directa, sin `TestingModule`). Verifica el payload persistido exacto (`actorUserId`, `companyId`, `action`, `resourceType`, `resourceId`, `result: 'FAILURE'`, `correlationId`, `ipAddress`, `deviceInfo` — sin `reason` ni ningún campo ajeno) y el comportamiento cuando `AuditRepository.append()` falla: el rechazo se propaga desde el método del listener sin ser silenciado, exactamente el mismo patrón (ausencia de `try/catch`) que ya tienen todos los demás listeners de este servicio. No se introdujo manejo de errores nuevo — la prueba no reveló ningún defecto que lo justificara.

La garantía de que un fallo de auditoría **no puede alterar la decisión de autorización** es estructural, no del listener: `CompanyGuard` llama `this.events.emit(...)` sin `await` y arroja `MembershipNotFoundException` en la línea siguiente, incondicionalmente — el `403` ya está decidido antes de que el listener asíncrono empiece a ejecutarse. Esa garantía se probó a nivel HTTP real en el Hallazgo 1 (§15.1, última prueba), donde `EventEmitter2` internamente capturó y registró el rechazo simulado (`[Nest] ERROR [Event] ...`) sin afectar el código de respuesta.

### 15.4 Validación de la corrección

| Comando | Resultado |
| --- | --- |
| `tsc --noEmit` (apps/api) | Sin errores |
| `eslint src test` (apps/api) | Sin errores |
| `nest build` (apps/api) | Compila sin errores |
| `git diff --check` | Sin advertencias |
| `jest` unitario completo | **41 suites, 614 pruebas** (608 antes de esta corrección) |
| `jest --config test/jest-e2e.json` (integración) | **4 suites, 33 pruebas** (23 antes de esta corrección) |

Ningún archivo fuera de `apps/api/src/` y `apps/api/test/` (más los registros de gobierno listados en §15.2) fue modificado. No se tocó ningún guard, controlador, `schema.prisma`, `seed.ts`, ni `T02`–`T06`.

## 16. Reporte de implementación de T02 (2026-08-04)

**Solo frontend**, `apps/web/src/` exclusivamente. Sin cambios en backend, guards, permisos, rutas CFDI, `D-010`, `D-011` ni `D-012`. `T02` queda **`IMPLEMENTADA · PENDIENTE DE AUDITORÍA`** — no `PASSED`.

- **Causa raíz corregida:** el botón "Cambiar empresa" (`app-shell.tsx`) enviaba `next=/{companyId actual}/inicio` al selector de Empresa, que lo usaba ciegamente como destino sin validar a qué Empresa pertenecía — de ahí el regreso automático a la Empresa anterior tras un cambio manual.
- **Punto único de decisión:** nueva función `resolveDestination(next, chosenCompanyId, memberships)` en `apps/web/src/lib/safe-navigation.ts`, reutilizando `safeInternalPath` como capa de validación de forma. Un `next` solo se conserva si es interno, pertenece a la Empresa elegida y el usuario tiene Membership activa sobre ella; en cualquier otro caso resuelve a `/{chosenCompanyId}/inicio`.
- **Cambio manual (Caso A):** `app-shell.tsx` deja de enviar `next` al navegar a `/seleccionar-empresa`.
- **Deep link (Caso B):** sin cambios — `login-form.tsx` y el redirect de `[companyId]/layout.tsx` siguen conservando `next` para recuperación de contexto; `company-selector.tsx` ahora resuelve el destino final a través de `resolveDestination`.
- **Pruebas añadidas:** 6 casos unitarios de `resolveDestination` (`safe-navigation.test.ts`) y 2 casos adicionales en `company-selector.test.tsx` (deep link válido conservado, deep link de otra Empresa descartado); los 4 casos preexistentes de `company-selector.test.tsx` siguen verdes sin modificación.
- **Validación:** `vitest` (archivos afectados) 19/19 verdes · `tsc --noEmit` sin errores en los archivos modificados · `eslint` sin errores ni advertencias · `next build` compila sin errores · `git diff --check` sin advertencias.
- Detalle completo del reporte de implementación: historial de conversación de esta sesión (no versionado aparte).

## 17. Cierre administrativo de T01 y T02 (2026-08-04)

**Solo documentación.** Sin cambios de código, pruebas, guards, `schema.prisma`, `seed.ts`, migraciones, rutas ni permisos CFDI. No inicia `T03`–`T06`. No modifica `D-011` ni `D-012`.

- **Evidencia:** auditorías finales independientes `READ ONLY` de Codex — [`EWO-SEC-NAV-001-T01_FINAL_AUDIT.md`](audits/EWO-SEC-NAV-001-T01_FINAL_AUDIT.md) y [`EWO-SEC-NAV-001-T02_FINAL_AUDIT.md`](audits/EWO-SEC-NAV-001-T02_FINAL_AUDIT.md), ambas sobre el snapshot `feature/frontend-ux-audit` · `b5b289d32fdcc8d7ab61fd62ecfe0316b8c75be8`, veredicto **`PASSED CON OBSERVACIONES`**. Ningún hallazgo `CRÍTICO`, `ALTO` ni `MEDIO` abierto — solo una observación `BAJO` por auditoría.
- **`T01` → `PASSED`; `D-010` → `IMPLEMENTADA · PASSED`.** La auditoría confirma que `D-010` se cumple: sin bypass de Platform Admin, autorización company-scoped fail-closed en los seis endpoints, flujos legítimos con Membership activa intactos.
- **`T02` → `PASSED`.** La auditoría confirma el contrato de cambio manual: `resolveDestination` es el único punto de decisión, el cambio manual nunca reutiliza `next`, los deep links válidos se conservan y el fallback opera correctamente ante otra Empresa, ruta externa/inválida o Membership ausente.
- **`T03`/`T04` quedan desbloqueadas, no iniciadas** — conforme al orden de ejecución (§6), mutuamente independientes entre sí, ejecutables ahora que `T01` cierra. `T05`/`T06` permanecen pendientes (requieren `T02`–`T04` cerradas).

### Observaciones BAJAS registradas (seguimiento, no bloqueante)

| ID | Origen | Descripción | Estado |
| --- | --- | --- | --- |
| T01-OBS-01 | Auditoría final de `T01` | Encabezado de estado de `AI_CONTEXT.md` mostraba una fecha desfasada (`2026-08-03`) respecto al trabajo del mismo día registrado en su tabla. | **RESUELTO** en este cierre — encabezado actualizado a `2026-08-04`. |
| T02-OBS-01 | Auditoría final de `T02` | Falta una prueba de interacción directa del botón "Cambiar empresa" (`app-shell.tsx`) que asegure `router.push('/seleccionar-empresa')` sin `next`; el handler y el resolver ya tienen cobertura dirigida indirecta. | **MEJORA FUTURA** — no reabre `T02`; pendiente de una tarea posterior. |

### Estados sincronizados

`docs/engineering/EWO-SEC-NAV-001_TENANT_ISOLATION_PLAN.md` (este documento, control del documento + §13) · `brain/DECISIONS.md` (D-010, Estado + Historial) · `brain/DECISION_INDEX.md` · `AI_CONTEXT.md` (estado actual, decisiones activas, siguiente paso, encabezado) · `PROJECT_INDEX.md` · `CHANGELOG.md`.

## 18. Reporte de implementación de T04 (2026-08-04)

**Solo documentación de arquitectura de información.** Sin cambios de código, frontend, backend, `schema.prisma`, permisos ni endpoints nuevos. No se inicia `T03`. `D-011` sin cambios. `D-012` **no se modificó en su contenido** (Contexto, Problema, Alternativas, Análisis, Decisión, Contrato vinculante) — solo su sección `Estado` se actualiza para reflejar la implementación, siguiendo el mismo patrón administrativo que `D-010` tras `T01`. `T04` queda **`IMPLEMENTADA · PENDIENTE DE AUDITORÍA`** — no `PASSED`.

### Causa raíz corregida

Existían tres formas de ruta incompatibles para el detalle de CFDI, exactamente las que `D-012` documenta:

| Fuente | Ruta anterior | Ruta canónica adoptada |
| --- | --- | --- |
| `docs/14_INFORMATION_ARCHITECTURE.md` `ROUTE-0019` | `/{companyId}/fiscal/cfdi/{cfdiId}` | `/{companyId}/documentos/{documentId}/cfdi` |
| `docs/31_MASTER_SCREEN_MAP.md` `PAGE-0020` | `/{companyId}/fiscal/cfdi/{cfdiId}` | `/{companyId}/documentos/{documentId}/cfdi` |
| `docs/32_MASTER_NAVIGATION_ARCHITECTURE.md` (árbol de navegación) | `/fiscal/cfdi` → `/{cfdiId}` | `/documentos/{documentId}` → `/cfdi` |
| `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md` (tabla de rutas frontend) | `/{companyId}/fiscal/{documentId}` | `/{companyId}/documentos/{documentId}/cfdi` |
| `docs/08_API_DESIGN.md` `API-0027` | `GET /documents/{documentId}/cfdi` | **Sin cambio** — ya usaba `documentId`, es el contrato de detalle vigente (`D-012` contrato #6) |

### Documentos inspeccionados

`docs/08_API_DESIGN.md`, `docs/09_DATABASE_DESIGN.md`, `docs/14_INFORMATION_ARCHITECTURE.md`, `docs/15_UX_FLOWS.md`, `docs/16_WIREFRAMES_SPECIFICATION.md`, `docs/17_PROTOTYPE_SPECIFICATION.md`, `docs/31_MASTER_SCREEN_MAP.md`, `docs/32_MASTER_NAVIGATION_ARCHITECTURE.md`, `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md`, `PROJECT_INDEX.md`, `AI_CONTEXT.md`. Buscadas las cadenas `cfdiId`, `documentId`, `folioFiscal`, `ROUTE-0019`, `PAGE-0020`, `API-0027`, "CFDI Detail", "Detalle CFDI", "Fiscal Detail", "Deep Link", "Rutas fiscales".

### Documentos modificados

- [`docs/14_INFORMATION_ARCHITECTURE.md`](../14_INFORMATION_ARCHITECTURE.md) — `ROUTE-0019` corregida a la ruta canónica; nota añadida bajo la tabla de rutas citando `D-012`/`T04`.
- [`docs/31_MASTER_SCREEN_MAP.md`](../31_MASTER_SCREEN_MAP.md) — ruta de `PAGE-0020` corregida.
- [`docs/32_MASTER_NAVIGATION_ARCHITECTURE.md`](../32_MASTER_NAVIGATION_ARCHITECTURE.md) — árbol de navegación: el CFDI pasa a colgar de `/documentos/{documentId}/cfdi`; el nodo `/fiscal/cfdi` se conserva solo como listado, anotado como tal.
- [`docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md`](EWO-005_DOCUMENTS_FISCAL_PLAN.md) — fila de ruta de detalle de CFDI en la tabla de rutas frontend corregida.
- `brain/DECISIONS.md` (D-012, solo `Estado` + `Historial`) · `brain/DECISION_INDEX.md` (fila D-012) · `AI_CONTEXT.md` · `PROJECT_INDEX.md` · `CHANGELOG.md` — sincronización de estado, sin tocar el contrato de `D-012`.

**No modificados** (inspeccionados, sin referencias afectadas o ya coherentes): `docs/08_API_DESIGN.md` (`API-0027` ya usa `documentId`), `docs/09_DATABASE_DESIGN.md` (`cfdiId` ahí describe el nombre interno de la PK de `Cfdi.id`, nunca una ruta — coherente con el contrato vinculante #3 de `D-012`), `docs/15_UX_FLOWS.md`, `docs/16_WIREFRAMES_SPECIFICATION.md` (`PAGE-0020 / ROUTE-0019` es una referencia por ID, no repite la URL), `docs/17_PROTOTYPE_SPECIFICATION.md` (sin coincidencias).

### Referencias corregidas

1. **Regla 1 (documentId como resolución):** cumplida — las tres fuentes con URL alternativa convergen en `/{companyId}/documentos/{documentId}/cfdi`.
2. **Regla 2 (sin `cfdiId` en rutas oficiales):** cumplida — `ROUTE-0019`, `PAGE-0020` y el árbol de navegación ya no usan `{cfdiId}`. `docs/09` conserva `cfdiId` como nombre de campo interno, no como ruta.
3. **Regla 3 (sin `folioFiscal` en rutas):** ya cumplida en todo el corpus inspeccionado — ninguna ruta oficial lo usaba; las apariciones existentes son criterio de búsqueda/deduplicación de datos (`docs/08` §13, `docs/09`, `EWO-005_DOCUMENTS_FISCAL_PLAN.md`), consistente con el contrato #4 de `D-012`. Se dejó explícito en la nota añadida a `docs/14`.
4. **Regla 4 (convergencia):** cumplida — una sola forma de ruta en `docs/14`, `docs/31`, `docs/32` y `EWO-005_DOCUMENTS_FISCAL_PLAN.md`.
5. **Regla 5 (estabilidad del deep link por estado):** no requiere cambio adicional — la ruta por `documentId` ya es estable por construcción (existe desde `PENDING_UPLOAD`); no depende de que exista fila `Cfdi`.
6. **Regla 6 (documento sin `Cfdi` sigue direccionable):** ya cumplida por el mismo motivo — `documentId` existe desde la creación del `Document`.

### Validación

| Verificación | Resultado |
| --- | --- |
| No quedan rutas oficiales usando `cfdiId` | ✅ (grep en `docs/`, sin coincidencias fuera de `docs/09` como nombre de campo y las descripciones históricas de `D-012`/este plan) |
| No quedan rutas oficiales usando `folioFiscal` | ✅ (ninguna coincidencia como parámetro de ruta) |
| Todas las referencias usan `documentId` | ✅ `docs/14`, `docs/31`, `docs/32`, `EWO-005_DOCUMENTS_FISCAL_PLAN.md`, `docs/08` (`API-0027`, sin cambio) |
| Sin contradicciones entre `docs/08`, `14`, `15`, `16`, `17`, `31`, `32` | ✅ |
| `D-012` intacta (Contexto/Problema/Alternativas/Análisis/Decisión/Contrato) | ✅ — solo `Estado`/`Historial` actualizados |
| `D-011` sin modificar | ✅ |
| `T03` continúa `NO INICIADA` (desbloqueada) | ✅ |
| Código, frontend, backend sin modificar | ✅ |
| `git diff --check` | Sin advertencias de contenido |

### Hallazgos

Ninguno de severidad `CRÍTICO`, `ALTO`, `MEDIO` ni `BAJO`. Las tres formas de ruta conflictivas identificadas por `D-012` se resolvieron sin dejar residuo textual fuera del registro histórico de la propia decisión y de este plan (que documentan el problema original deliberadamente, no un estado vigente).

### Riesgos residuales

- **Frontend de documentos sin versionar** (`apps/web/src/app/[companyId]/documentos/**`) puede haberse construido antes de fijar esta ruta canónica — riesgo ya registrado por `D-012` (`RW-06`). No verificado en este turno por ser código, fuera de alcance de `T04`.
- Ninguna prueba automatizada valida que la documentación no vuelva a divergir; el control sigue siendo manual/por auditoría.

### Estado recomendado de T04

`T04: IMPLEMENTADA · PENDIENTE DE AUDITORÍA`

### Estado recomendado de D-012

`D-012: IMPLEMENTADA · PENDIENTE DE AUDITORÍA`

## 19. Reporte de implementación de T03 (2026-08-04)

**Catálogo de permisos y documentación exclusivamente.** Sin cambios de frontend, navegación, rutas CFDI, guards de `D-010`, código de `T01`/`T02`, `schema.prisma` ni migraciones. No se inicia `T04`–`T06`. `T03` queda **`PARCIALMENTE IMPLEMENTADA · PENDIENTE DE AUDITORÍA`** — no `PASSED` — porque `document.download` no quedó resuelta.

### Verificación previa de D-011 (obligatoria antes de tocar el catálogo)

1. Auditor recibe `cfdi.read` — **sí**, contrato vinculante punto 1.
2. Supervisor recibe `cfdi.read` — **sí**, contrato vinculante punto 2.
3. Contador y Auxiliar conservan `cfdi.read` — **sí**, ya estaban en el árbol de trabajo sin commitear (contrato puntos 3–4); confirmado en `seed.ts` antes de editar.
4. Estudiante permanece sin `cfdi.read` — **sí**, no tiene entrada en `ROLE_PERMISSIONS` (sandbox, sin permisos reales).
5. `document.download` formalmente aprobado — **no**. D-011 solo *ordena evaluarla* ("debe evaluarse y, si procede, aprobarse la clave separada `document.download`", contrato punto 9) y su propio `Estado` original decía "la aprobación... queda pendiente de resolución explícita dentro de `T03`" — eso es una delegación de la decisión a `T03`, no una aprobación. Ninguna otra fuente canónica (`docs/04`, `docs/08`, `docs/11`) aprueba la clave. Conclusión: **no aprobada**, no se crea.
6. Qué cubre `cfdi.read` — listar, ver resumen, ver datos fiscales estructurados (contrato punto 6).
7. Qué queda prohibido — generar, cancelar, modificar, eliminar CFDI vía `cfdi.read` (contrato punto 7); ningún permiso nuevo de escritura CFDI (punto 8, BR-INT-002).

### Inventario de permisos (Tarea 1)

| Recurso | Acción | Clave | Roles autorizados (antes) | Roles autorizados (después) | Estado implementado | Estado documentado (antes) | Contradicción |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Documento | Listar / metadatos | `document.read` | Administrador, Contador, Auxiliar, Supervisor, Auditor | Sin cambio | API-0024/0025 implementadas | Consistente | Ninguna |
| Documento | Descargar original | `document.download` | No existe | **Sin cambio — no existe** | No implementada (API-0026 sin permiso propio) | `docs/08` no la exige; D-011 la señala como faltante | **Persiste** — pendiente de decisión de producto |
| CFDI | Listar | `cfdi.read` | Contador, Auxiliar (Auditor/Supervisor sin ella) | + Auditor, Supervisor | Catálogo sí; endpoint no (API-0028 sin controlador) | `docs/31`/`docs/08` excluían a Auditor/Supervisor | **Resuelta** |
| CFDI | Ver resumen / datos estructurados | `cfdi.read` | Contador, Auxiliar | + Auditor, Supervisor | Catálogo sí; endpoint no (API-0027 sin controlador) | `docs/15` UXF-0011 excluía explícitamente a Auditor/Supervisor | **Resuelta** |
| CFDI | Descargar XML original | `document.download` | No existe | **Sin cambio — no existe** | No implementada | Mismo binario que Documento origen (D-011) | **Persiste** |
| CFDI | Exportar | — | No existe | Sin cambio | No implementada | Sin mención canónica | Ninguna (fuera de alcance) |
| CFDI | Modificar | — | No existe | Sin cambio | No existe por diseño | BR-INT-002 | Ninguna |
| CFDI | Eliminar | — | No existe | Sin cambio | No existe por diseño | BR-INT-002 | Ninguna |

### Cambios de catálogo (Tarea 2)

- **Nuevo:** `packages/database/prisma/permissions-catalog.ts` — extrae `PERMISSION_CATALOG` y `ROLE_PERMISSIONS` de `seed.ts` para hacerlos importables por pruebas unitarias sin conectar a PostgreSQL (`seed.ts` ejecuta `main()` al importarse). Contenido idéntico al que tenía `seed.ts`, salvo:
  - `ROLE_PERMISSIONS.SUPERVISOR` gana `'cfdi.read'`.
  - `ROLE_PERMISSIONS.AUDITOR` gana `'cfdi.read'`.
- **Modificado:** `packages/database/prisma/seed.ts` — importa `PERMISSION_CATALOG`/`ROLE_PERMISSIONS` desde el nuevo módulo en vez de declararlos localmente; sin cambio de comportamiento del seed más allá de la concesión descrita.
- **No creado:** ninguna clave `document.download`. No se tocó `schema.prisma`. No se generó migración (los permisos se administran por seed, conforme al alcance).

### Tarea 3 — `document.download`

**No resuelta — bloqueada por falta de aprobación explícita.** Conforme a las instrucciones de esta tarea y a `.claude/rules/00-governance.md` ("no inventar requisitos, estado, aprobaciones"), no se creó la clave. `D-011` únicamente ordena *evaluarla*; ninguna fuente canónica la aprueba. Queda registrada en `docs/04_BUSINESS_RULES.md` BR-PERM-004 como "sin aprobar", y en `EWO-SEC-NAV-001` §4/§7 como pendiente explícito — no resuelta por omisión bajo `document.read` (D-011 contrato punto 10, respetado: no se afirma en ningún documento que `document.read` cubra la descarga).

### Cambios documentales (Tarea 4)

- [`docs/04_BUSINESS_RULES.md`](../04_BUSINESS_RULES.md) — nueva `BR-PERM-004`: matriz canónica única de Documento/CFDI por acción, referenciando D-011.
- [`docs/08_API_DESIGN.md`](../08_API_DESIGN.md) — `API-0027`/`API-0028`: roles ampliados a Supervisor y Auditor (`cfdi.read`), con nota al pie.
- [`docs/31_MASTER_SCREEN_MAP.md`](../31_MASTER_SCREEN_MAP.md) — `PAGE-0019`/`PAGE-0020`: roles ampliados a Supervisor y Auditor.
- [`docs/15_UX_FLOWS.md`](../15_UX_FLOWS.md) — `UXF-0011`: eliminada la frase que excluía explícitamente a Supervisor/Auditor de `cfdi.read` (contradecía a D-011 directamente) y la equivalencia incorrecta `document.read` = descarga; tabla resumen actualizada.
- [`docs/16_WIREFRAMES_SPECIFICATION.md`](../16_WIREFRAMES_SPECIFICATION.md) — `WF-0015`/`WF-0016`: Supervisor añadido (Auditor ya figuraba).
- `brain/DECISIONS.md` (D-011, solo `Estado` + `Historial`) · `brain/DECISION_INDEX.md` (fila D-011) · `AI_CONTEXT.md` · `PROJECT_INDEX.md` · `CHANGELOG.md` — sincronización de estado.

**No modificados:** `docs/32_MASTER_NAVIGATION_ARCHITECTURE.md` (línea 246 ya decía "Fiscal" para Auditor — ya coherente con la concesión; Supervisor no tenía frase contradictoria), `D-010`, `D-012`, código/guards/frontend de `T01`/`T02`.

### Pruebas (Tarea 5)

`packages/database/src/permissions-catalog.test.ts` (nuevo, `vitest`, 8 pruebas) sobre el catálogo real importado (no HTTP — API-0027/0028 no tienen controlador todavía):

- Auditor obtiene `cfdi.read`.
- Supervisor obtiene `cfdi.read`.
- Contador y Auxiliar conservan `cfdi.read`.
- Estudiante no obtiene `cfdi.read` (sin entrada en `ROLE_PERMISSIONS`).
- Auditor/Supervisor nunca obtienen `cfdi.generate`/`cfdi.cancel` junto con `cfdi.read`.
- Los únicos roles con permisos son los seis oficiales (`isPlatformAdmin` no es un `RoleName`, por lo que no puede aparecer en esta prueba — confirma que no recibe permisos empresariales por este cambio).
- No existen claves de escritura/eliminación de CFDI más allá de `cfdi.generate`/`cfdi.cancel` (BR-INT-002).
- `document.download` no existe en el catálogo (documenta el bloqueo, no lo oculta).

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| Pruebas unitarias del catálogo | `pnpm --filter @contaia/database exec vitest run src/permissions-catalog.test.ts` | ✅ 8/8 verdes |
| TypeScript del paquete | `pnpm --filter @contaia/database run typecheck` | ✅ sin errores (`prisma/` no está en `rootDir` del proyecto tsc; verificado además con ESLint type-aware) |
| ESLint | `pnpm --filter @contaia/database exec eslint prisma/seed.ts prisma/permissions-catalog.ts src/permissions-catalog.test.ts` | ✅ sin errores ni advertencias |
| Prisma / schema | No aplica — sin cambios a `schema.prisma` | — |
| `git diff --check` | Pendiente de ejecutar como parte del cierre de esta entrega | — |

**No ejecutado:** `pnpm run seed` contra una base real (prohibido sin autorización humana expresa, `.claude/rules/20-fiscal-data-safety.md`) — la cobertura del catálogo se limita a la prueba unitaria sobre los datos en memoria, no a una corrida real contra PostgreSQL.

### Confirmaciones de alcance

- `D-010` intacta — no tocada.
- `D-012` intacta — no tocada.
- `T01`/`T02` siguen `PASSED` — sin cambios de código en sus áreas.
- `T04` sigue `IMPLEMENTADA · PENDIENTE DE AUDITORÍA` — sin cambios.
- `T05`/`T06` no se iniciaron.
- Sin cambios de frontend ni de rutas.

### Hallazgos

| Severidad | Ubicación | Problema | Impacto | Corrección mínima |
| --- | --- | --- | --- | --- |
| **ALTO** | D-011 / `document.download` | La clave sigue sin resolverse: ni aprobada ni denegada explícitamente por el responsable de producto. `API-0026` (descarga del Documento) queda sin permiso propio exigido — hoy no implementada, así que no hay riesgo de ejecución, pero el criterio de aceptación 4 de `T03` no se cumple. | Cuando se implemente `API-0026`/el detalle de descarga de CFDI, sin esta decisión el equipo podría (a) asumir por omisión que `document.read` cubre la descarga (prohibido por D-011 punto 10) o (b) bloquear la funcionalidad indefinidamente. | Decisión explícita del responsable de producto: aprobar `document.download` como clave separada (y asignarla a los roles que corresponda) o denegarla formalmente y decidir el mecanismo alterno de autorización de descarga. |
| **BAJO** | `docs/31_MASTER_SCREEN_MAP.md` `API-0028` (`GET /companies/{companyId}/cfdi`) | Administrador no aparece en la lista de roles de `API-0028`, pese a tener todos los permisos incluido `cfdi.read`. Contradicción preexistente a D-011 (no está en su tabla de contradicciones ni en su contrato vinculante), por lo que no se corrigió en este turno para no ampliar el alcance de `T03` sin autorización. | Cosmético — Administrador ya está autorizado vía el catálogo (`ADMINISTRADOR` recibe todos los permisos); ningún endpoint deniega el acceso realmente porque `API-0028` no está implementada. | Añadir "Administrador" a la lista de roles de `API-0028` en `docs/08_API_DESIGN.md` en una tarea de documentación separada, o incluirlo expresamente en el alcance de `T05` (sincronización documental general). |

### Riesgos residuales

- **`document.download` bloquea el criterio de aceptación 4 de `T03` y el `RW-04` del plan.** No se resuelve por este turno — requiere decisión humana explícita, conforme a las instrucciones de esta tarea.
- **Ejecución fuera de orden (`RW-03`):** la concesión de `cfdi.read` a Auditor/Supervisor vive en el catálogo, pero ningún endpoint la exige todavía (API-0027/0028 sin controlador) — no genera falsa sensación de protección porque no hay endpoint que proteger todavía, pero debe verificarse de nuevo cuando esos controladores se implementen.
- **`seed.ts` no fue ejecutado contra una base real** en esta sesión (prohibido). El catálogo en memoria fue verificado por prueba unitaria; el reseed real de un entorno de desarrollo/staging queda a criterio del equipo, fuera de esta entrega.

### Estado recomendado de T03

`T03: PARCIALMENTE IMPLEMENTADA · document.download PENDIENTE DE DECISIÓN DE PRODUCTO · PENDIENTE DE AUDITORÍA`

### Estado recomendado de D-011

`D-011: PARCIALMENTE IMPLEMENTADA · PENDIENTE DE AUDITORÍA`

### Siguiente paso recomendado

1. Responsable de producto decide `document.download`: aprobar (con roles) o denegar explícitamente.
2. Solicitar auditoría independiente `READ ONLY` de Codex sobre esta entrega parcial de `T03` (catálogo + documentación), igual que `T01`/`T02`/`T04`.
3. Una vez resuelto `document.download`, completar `T03` (crear la clave si se aprueba, actualizar `API-0026`/documentación, cerrar el hallazgo `ALTO`) y solicitar cierre administrativo conjunto.

## 20. Resolución de `document.download` y cierre de implementación de T03 (2026-08-05)

**Catálogo de permisos, corrección de `API-0028` y documentación exclusivamente.** Sin cambios de frontend, navegación, rutas, guards de `D-010`, código de `T01`/`T02`, `schema.prisma` ni migraciones. No se inicia `T04`–`T06`. `T03` queda **`IMPLEMENTADA · PENDIENTE DE AUDITORÍA` — no `PASSED`** — la certificación requiere auditoría independiente `READ ONLY` de Codex.

### Decisión de producto

El responsable de producto aprueba la clave independiente `document.download`, tal como §19 la dejó pendiente (hallazgo `ALTO`):

- Roles autorizados: Administrador, Contador, Auxiliar, Supervisor, Auditor.
- Estudiante: **no** la recibe.
- `isPlatformAdmin` no recibe el permiso de forma implícita (no es un `RoleName` empresarial).
- Alcance: descargar el archivo original y el XML del CFDI (binario almacenado). No incluye modificar, eliminar, cancelar, reemplazar ni conceder otros permisos.
- Sigue sujeta a Membership activa, aislamiento por empresa y autorización server-side (sin cambio respecto al resto del catálogo).

### Implementación

- `packages/database/prisma/permissions-catalog.ts`: nueva entrada `document.download` en `PERMISSION_CATALOG` (módulo `document`); agregada a `ROLE_PERMISSIONS.CONTADOR`, `.AUXILIAR`, `.SUPERVISOR`, `.AUDITOR`; `ADMINISTRADOR` la recibe automáticamente vía `PERMISSION_CATALOG.map((p) => p.key)`.
- `packages/database/prisma/seed.ts`: **sin cambios** — ya consumía el catálogo canónico desde la resolución parcial de §19; no hubo necesidad de tocarlo para esta resolución.
- `docs/08_API_DESIGN.md`: `API-0028` corregida para incluir a Administrador en la lista de roles (hallazgo `BAJO` de §19, línea 555, ahora `RESOLVED`).
- `docs/04_BUSINESS_RULES.md` `BR-PERM-004`: las dos filas de `document.download` (Documento — archivo original; CFDI — XML original) pasan de "sin aprobar" a los cinco roles autorizados.
- `brain/DECISIONS.md` (D-011, solo `Estado` + `Historial`) · `brain/DECISION_INDEX.md` (fila D-011) · `AI_CONTEXT.md` · `PROJECT_INDEX.md` · `CHANGELOG.md` — sincronización de estado.

**No modificados:** `docs/15_UX_FLOWS.md` y `docs/16_WIREFRAMES_SPECIFICATION.md` — revisados, no contienen ninguna afirmación que excluya `document.download` de los roles aprobados ni que la trate como no aprobada; no requerían corrección. `docs/31`/`docs/32` — sin menciones de `document.download` que requieran sincronización en este turno. `D-010`, `D-012`, código/guards/frontend de `T01`/`T02`, `schema.prisma`, migraciones.

### Pruebas

`packages/database/src/permissions-catalog.test.ts` — se elimina la prueba que documentaba la ausencia de `document.download` (obsoleta tras esta resolución) y se agregan cinco pruebas nuevas. Total: **13 pruebas** (8 preexistentes de §19 + 5 nuevas):

1. `document.download` existe en el catálogo.
2. Se concede a Administrador, Contador, Auxiliar, Supervisor y Auditor.
3. No se concede a Estudiante.
4. `document.read` y `document.download` son permisos distintos (módulo `document`, dos claves).
5. `cfdi.read` y `document.download` son claves independientes (módulos distintos: `cfdi` y `document`).

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| Pruebas unitarias del catálogo | `pnpm --filter @contaia/database exec vitest run src/permissions-catalog.test.ts` | ✅ 13/13 verdes |
| TypeScript del paquete | `pnpm --filter @contaia/database run typecheck` | ✅ sin errores |
| ESLint | `pnpm --filter @contaia/database exec eslint prisma/seed.ts prisma/permissions-catalog.ts src/permissions-catalog.test.ts` | ✅ sin errores ni advertencias |
| Prisma / schema | `prisma validate` falla solo por `DATABASE_URL` ausente en el shell (entorno, no contenido) — `schema.prisma` confirmado sin cambios vía `git status` | Sin cambios de schema |
| `git diff --check` | Ejecutado sobre el diff completo del worktree | Sin hallazgos nuevos atribuibles a esta entrega |

**No ejecutado:** `pnpm run seed` contra una base real (prohibido sin autorización humana expresa).

### Confirmaciones de alcance

- `D-010` intacta — no tocada.
- `D-012` intacta — no tocada.
- `T01`/`T02` siguen `PASSED` — sin cambios de código en sus áreas.
- `T04` sigue `IMPLEMENTADA · PENDIENTE DE AUDITORÍA` — sin cambios.
- `T05`/`T06` no se iniciaron.
- Sin cambios de frontend ni de rutas ni de guards de `D-010`.

### Hallazgos

Ninguno nuevo. El hallazgo `ALTO` de §19 (`document.download` sin resolver) y el hallazgo `BAJO` de §19 (`API-0028` sin Administrador) quedan **`RESOLVED`** por esta entrega.

### Riesgos residuales

- **Ejecución fuera de orden (`RW-03`, sin cambio):** la concesión de `cfdi.read`/`document.download` vive en el catálogo, pero ningún endpoint la exige todavía (`API-0026`/`0027`/`0028` sin controlador) — no genera falsa sensación de protección porque no hay endpoint que proteger todavía; debe verificarse de nuevo cuando esos controladores se implementen.
- **`seed.ts` no fue ejecutado contra una base real** en esta sesión (prohibido). El catálogo en memoria fue verificado por prueba unitaria; el reseed real de un entorno de desarrollo/staging queda a criterio del equipo, fuera de esta entrega.

### Estado de T03 y D-011

`T03: IMPLEMENTADA · PENDIENTE DE AUDITORÍA`

`D-011: IMPLEMENTADA · PENDIENTE DE AUDITORÍA`

### Siguiente paso recomendado

1. Solicitar auditoría independiente `READ ONLY` de Codex sobre esta entrega de `T03` (catálogo + documentación), igual que `T01`/`T02`/`T04`.
2. No iniciar `T04` (ya implementada, pendiente de su propia auditoría) ni `T05`/`T06` hasta que `T03` (y el resto de tareas requeridas) tengan su auditoría independiente.

## 21. Ratificación arquitectónica de `document.download` y cierre documental de T03 (2026-08-06)

**Documentación y pruebas exclusivamente.** Sin cambios de catálogo (`permissions-catalog.ts` intacto), `seed.ts`, `schema.prisma`, migraciones, frontend, guards, rutas ni código de `T01`/`T02`/`T04`. No se inicia `T05`–`T06`. `T03` permanece **`IMPLEMENTADA · PENDIENTE DE AUDITORÍA` — no `PASSED`**: la certificación requiere auditoría independiente `READ ONLY` de Codex.

### Pregunta resuelta

Se pidió determinar cuál de tres opciones es arquitectónicamente correcta, sin inventar la decisión: **(A)** crear `document.download`, **(B)** no crearla nunca, **(C)** integrarla dentro de `document.read`.

Estado de partida verificado contra el árbol de trabajo (no inferido): la opción **(A)** ya está implementada y aprobada por el responsable de producto el 2026-08-05 (§20, `D-011` `Historial`). Este turno **no reabre** esa aprobación: la somete a la verificación técnica que §20 no documentó, y cierra el residuo documental que sí quedó abierto.

### Análisis técnico — por qué (A) es la única opción correcta

1. **Mínimo privilegio (BR-PERM-001, denegar por defecto).** Consultar metadatos (nombre, tipo, estado, fecha) y obtener el binario almacenado son exposiciones materialmente distintas. El XML contiene RFC, importes, impuestos y las partes del comprobante — clasificados **Confidencial**/**Altamente sensible** en `docs/11` §3 — y, una vez descargado, sale del perímetro donde ContaIA puede aplicar aislamiento por Empresa, trazabilidad o revocación. **(C)** haría imposible conceder consulta sin conceder extracción, fijando un piso de privilegio permanente que BR-PERM-001 prohíbe ("permitir solo explícitamente"). **(B)** es **(C)** por omisión, con el agravante de dejar `API-0026` sin clave que exigir.
2. **Consistencia con `D-011` (contrato vinculante).** El punto 10 prohíbe expresamente asumir `document.read` como equivalente a descargar el binario, y la *Distinción normativa de recursos* asigna el XML original del CFDI a la clave de descarga, no a `cfdi.read`. **(B)** y **(C)** exigirían **modificar** el contrato vinculante de una decisión aprobada; **(A)** es la única que lo cumple sin enmendarlo. Además, dos filas de `BR-PERM-004` quedarían sin clave bajo **(B)**/**(C)**, obligando a la matriz canónica a afirmar justo lo que `D-011` prohíbe.
3. **Escalabilidad.** La autorización se resuelve en `PermissionGuard` contra `Role`/`Permission`/`RolePermission`, con semántica **AND** sobre las claves declaradas y sin bypass por `isPlatformAdmin`. Añadir una clave ortogonal cuesta una fila de seed y un decorador `@Permissions`; el guard no cambia. Bajo **(C)**, restringir la descarga a un rol en el futuro (Auditor externo, Supervisor sin extracción de evidencia) obligaría a partir la clave **después** de que las concesiones ya viven en bases reales — migración de permisos concedidos más reescritura de todo endpoint que exija `document.read`. El costo de **(A)** se paga una vez, hoy; el de **(C)** se paga más tarde y con intereses. El catálogo ya usa este patrón: `sat.download` existe como clave de descarga propia — **(C)** sería la excepción, no la regla.
4. **BR-SEC y evidencia auditable.** `API-0026` está marcada como auditada y `docs/11` §3 exige auditoría de "carga, descarga" del Documento XML. Un evento de auditoría solo es evidencia si corresponde a una decisión de autorización distinguible: bajo **(C)**, "descargó" y "consultó" provienen de la misma concesión y el registro pierde poder probatorio frente a BR-SEC-004/BR-AUD-002. BR-SEC-001 refuerza lo mismo: la URL firmada es el punto exacto donde el activo cifrado en reposo deja de estar bajo control del sistema, y ese punto merece su propia puerta.
5. **Irreversibilidad.** El Documento se conserva indefinidamente y no admite eliminación física una vez ligado a un CFDI o a una Póliza definitiva (`docs/11` §3, BR-INT-002). Una capacidad cuyos efectos son permanentes e irrecuperables no debe viajar implícita dentro de una capacidad de listado.

**Objeción considerada y respondida:** hoy los cinco roles con `document.read` tienen también `document.download`, por lo que la separación no produce diferenciación *actual* y puede parecer redundante. Se sostiene igualmente porque (i) sí diferencia frente a Estudiante y frente a cualquier rol futuro; (ii) es la única forma de que la restricción futura no sea un cambio rompiente; y (iii) `BR-PERM-004` es una matriz **por acción**, no una optimización del número de claves. La redundancia es deliberada y queda documentada, no es un descuido.

**Conclusión:** se ratifica **(A)**. `(B)` y `(C)` se rechazan por violar BR-PERM-001 y el punto 10 del contrato vinculante de `D-011`, y por trasladar a una migración futura un costo evitable hoy.

### Hallazgos de este turno — ocho contradicciones residuales que §19/§20 dieron por cerradas y no lo estaban

| Severidad | Ubicación | Problema | Estado |
| --- | --- | --- | --- |
| **ALTO** | `docs/15_UX_FLOWS.md` `UXF-0011` | Afirmaba "la clave `document.download` **sigue sin aprobar**" — contradicción directa con `BR-PERM-004`, con el `Estado` de `D-011` y con el catálogo implementado. §20 declaró que `docs/15` "no requería corrección"; esa verificación fue incorrecta. | **Corregido** |
| **ALTO** | `docs/08_API_DESIGN.md` `API-0026` | El contrato de API de la descarga declaraba actor "Cualquier Rol con Membresía" y permiso "Pertenencia a la Empresa" — sin `document.download`. Quien implementara el endpoint leyendo `docs/08` habría construido exactamente la descarga sin clave que `D-011` punto 10 prohíbe. | **Corregido** |
| **MEDIO** | `docs/08_API_DESIGN.md` `API-0023`/`0024`/`0025` | La columna **Permiso** no enunciaba la clave del catálogo (`document.upload`/`document.read`), pese a que el código ya las exige; `API-0023` omitía a Administrador y `API-0024`/`0025` decían "Cualquier Rol con Membresía", lo que incluiría a un Estudiante con Membresía que el catálogo deniega. | **Corregido** |
| **MEDIO** | `docs/04_BUSINESS_RULES.md` `BR-PERM-004` | La celda de estado decía "(API-0026 sin permiso propio)" después de aprobar la clave: la matriz canónica se contradecía a sí misma. | **Corregido** |
| **MEDIO** | `docs/31_MASTER_SCREEN_MAP.md` `PAGE-0021`/`0022`/`0023` | Roles base "Auxiliar, Contador" en las pantallas de Documentos, con acción explícita "Ver estado/**descargar**" — misma clase de contradicción que originó `D-011` (excluir de la pantalla a roles que el catálogo autoriza). | **Corregido** |
| **MEDIO** | `docs/31` `PAGE-0019`/`PAGE-0020` · `docs/16` `WF-0013`/`WF-0015`/`WF-0016` | **Administrador omitido** de las pantallas de CFDI y de la carga documental, pese a poseer `cfdi.read`/`document.upload` y a figurar en `API-0027`/`API-0028`. Es exactamente la contradicción que la sección *Problema* de `D-011` nombró ("`docs/31` línea 120 contradice a `API-0027` al omitir al Administrador"): §19 la corrigió en `docs/08` pero no en las pantallas, y §20 no la revisó. | **Corregido** |
| **BAJO** | `docs/16_WIREFRAMES_SPECIFICATION.md` `WF-0012`/`WF-0016` | Acciones de descarga (lote en la biblioteca, evidencia en el detalle de CFDI) sin nombrar la clave que las gobierna; `WF-0012` con la misma lista de roles incompleta. | **Corregido** |
| **BAJO** | `docs/11_SECURITY_ARCHITECTURE.md` §9 | La matriz de permisos no tiene símbolo para "descarga": `L` sobre Documentos podía leerse como si incluyera el binario. No era una contradicción sino un vacío de granularidad explotable por interpretación. | **Corregido** (nota al pie que subordina la granularidad a `BR-PERM-004`) |

### Cambios documentales

- [`docs/08_API_DESIGN.md`](../08_API_DESIGN.md) §9.5 — columna **Permiso** con la clave real de `API-0023`–`API-0028`; actores alineados a `BR-PERM-004`; nota de grupo que declara que la clave se **suma** a Membresía y aislamiento, nunca los sustituye; nota al pie `†`: `API-0026` exige `document.download`, y ni `document.read` ni `cfdi.read` autorizan el binario.
- [`docs/04_BUSINESS_RULES.md`](../04_BUSINESS_RULES.md) `BR-PERM-004` — `Regla` ampliada con la prohibición explícita de derivar una capacidad de otra; celdas de estado de las dos filas de descarga actualizadas al contrato de API ya fijado; `Impacto técnico` documenta la prueba automatizada de sincronización.
- [`docs/15_UX_FLOWS.md`](../15_UX_FLOWS.md) `UXF-0011` — sustituida la afirmación obsoleta por el estado real de la clave y la condición de habilitación de la acción "descargar".
- [`docs/16_WIREFRAMES_SPECIFICATION.md`](../16_WIREFRAMES_SPECIFICATION.md) `WF-0012`/`WF-0013`/`WF-0015`/`WF-0016` — claves nombradas en las acciones de descarga y carga; listas de roles alineadas a la matriz canónica (Administrador incluido).
- [`docs/31_MASTER_SCREEN_MAP.md`](../31_MASTER_SCREEN_MAP.md) `PAGE-0019`–`PAGE-0023` — roles base alineados a la matriz canónica, con la clave entre paréntesis; Administrador incorporado a las pantallas de CFDI.
- [`docs/11_SECURITY_ARCHITECTURE.md`](../11_SECURITY_ARCHITECTURE.md) §9 — nota al pie: `L` no incluye descarga; `BR-PERM-004` prevalece ante cualquier diferencia de granularidad.
- `brain/DECISIONS.md` (`D-011`, solo `Estado` + `Historial`) · `brain/DECISION_INDEX.md` · `AI_CONTEXT.md` · `CHANGELOG.md` — sincronización de estado.

**No modificados:** `packages/database/prisma/permissions-catalog.ts` y `seed.ts` (la decisión ya estaba implementada correctamente; nada que cambiar), `schema.prisma`, migraciones, `docs/32` (sin afirmación contradictoria: su línea 246 ya concede "Fiscal" al Auditor y no menciona descargas), frontend, guards, `D-010`, `D-012`, contrato vinculante de `D-011`.

### Pruebas

`packages/database/src/permissions-catalog.test.ts` — de 13 a **22 pruebas**. Añadidas:

1. **Invariante de coherencia:** todo rol con `document.download` tiene también `document.read` — nadie puede descargar lo que no puede ver.
2. **Sincronización documentación ↔ catálogo (8 pruebas, `it.each`):** la prueba lee `docs/04_BUSINESS_RULES.md`, extrae las filas de `BR-PERM-004` que declaran una clave `modulo.accion` y compara, fila por fila, los roles documentados contra `ROLE_PERMISSIONS`. Incluye una prueba de cobertura que verifica que la tabla se pudo leer y que las seis claves esperadas están presentes — si el formato de la tabla cambia, la prueba **falla** en vez de pasar en vacío.

Esto responde al riesgo que §18 dejó registrado ("ninguna prueba automatizada valida que la documentación no vuelva a divergir"): a partir de ahora, divergir entre `BR-PERM-004` y el catálogo rompe la suite.

**Verificación por mutación (obligatoria para no entregar una prueba decorativa):** se eliminó temporalmente "Supervisor" de la fila `document.download` de `docs/04` y la suite falló en la prueba esperada (`Documento — Descargar archivo original (document.download)`, `expected [ …5 ] to deeply equal [ …4 ]`); revertido el documento, la suite vuelve a verde. La prueba detecta la divergencia real, no la simula.

### Validaciones ejecutadas

| Validación | Comando | Resultado |
| --- | --- | --- |
| Pruebas unitarias del catálogo | `pnpm --filter @contaia/database exec vitest run src/permissions-catalog.test.ts` | ✅ 22/22 verdes |
| Verificación por mutación de la prueba de sincronización | Edición temporal de `docs/04` + reejecución + reversión | ✅ 1 fallo esperado; verde tras revertir |
| ESLint | `pnpm --filter @contaia/database exec eslint prisma/seed.ts prisma/permissions-catalog.ts src/permissions-catalog.test.ts` | ✅ sin errores ni advertencias |
| TypeScript del paquete | `pnpm --filter @contaia/database run typecheck` | ✅ sin errores |
| Prisma / schema | No aplica — sin cambios a `schema.prisma` | — |

**No ejecutado:** `pnpm run seed` contra una base real (prohibido sin autorización humana expresa, `.claude/rules/20-fiscal-data-safety.md`). Sin `commit` ni `push` — no solicitados.

### Confirmaciones de alcance

- Catálogo de permisos **sin cambios** — la decisión de producto de §20 se conserva íntegra.
- `D-010`, `D-012` intactas. Contrato vinculante de `D-011` intacto (solo `Estado` e `Historial`).
- `T01`/`T02` siguen `PASSED`; `T04` sigue `IMPLEMENTADA · PENDIENTE DE AUDITORÍA`; `T05`/`T06` no iniciadas.
- Sin cambios de frontend, rutas, guards ni migraciones.

### Riesgos residuales

- **`RW-03` (sin cambio):** `cfdi.read` y `document.download` viven en el catálogo pero ningún endpoint las exige todavía (`API-0026`/`0027`/`0028` sin controlador). No hay falsa sensación de protección — no hay endpoint que proteger —, pero debe reverificarse al implementar esos controladores. **Control añadido:** `docs/08` §9.5 ya declara la clave exacta que cada uno debe exigir, de modo que la implementación futura no tenga que inferirla.
- **Frontend de descarga aún inexistente.** La única mención de descarga en `apps/web` está en la vista **demo** (`apps/web/src/app/demo/(app)/documentos/documents-view.tsx`), sin datos reales ni autorización — no contradice la matriz. Cuando exista el botón real, debe ocultarse con `document.download` (filtrado cosmético) y autorizarse en servidor con la misma clave.
- **`seed.ts` no ejecutado contra una base real** en esta sesión. Los entornos ya sembrados **antes** del 2026-08-05 no tienen la fila `document.download`: requieren reseed para reflejar el catálogo vigente. Fuera de esta entrega, a criterio del equipo.
- **Alcance de la prueba de sincronización:** cubre `BR-PERM-004` (Documento/CFDI). El resto del catálogo (`company.*`, `journal.*`, `inventory.*`, `sat.*`, `users.*`) sigue sin matriz canónica equivalente ni prueba de sincronización — candidato natural de `T05`.

### Estado recomendado de T03

`T03: IMPLEMENTADA · PENDIENTE DE AUDITORÍA` — sin bloqueos abiertos. `document.download` queda resuelta, ratificada técnicamente y sin contradicción documental conocida.

### Estado recomendado de D-011

`D-011: IMPLEMENTADA · PENDIENTE DE AUDITORÍA` — sin cambio de contrato.

### Siguiente paso recomendado

1. Solicitar auditoría independiente `READ ONLY` de Codex sobre `T03` (catálogo + documentación + pruebas), igual que `T01`/`T02`/`T04`.
2. Al implementar `API-0026`, exigir `document.download` en el controlador y añadir la prueba HTTP autenticada correspondiente (rol con la clave: `200`; rol sin ella: `403`).
3. Evaluar en `T05` extender la matriz canónica y su prueba de sincronización al resto de los módulos del catálogo.

## 22. Corrección de contradicciones documentales residuales de T03/D-011 (2026-08-06)

**Documentación exclusivamente.** Sin cambios de catálogo (`permissions-catalog.ts` intacto), `seed.ts`, `schema.prisma`, migraciones, código, frontend productivo, rutas de `T04`, ni implementación de `API-0026`/`API-0027`/`API-0028`. No se toca `D-010`, `D-012`, `D-013` ni el contrato vinculante de `D-011`. `T03` permanece **`IMPLEMENTADA · PENDIENTE DE AUDITORÍA` — no `PASSED`**: ninguna tarea se marca `PASSED` por este turno; esa certificación sigue requiriendo auditoría independiente `READ ONLY` de Codex.

### Origen

Auditoría final independiente `READ ONLY` de `T03` ejecutada por otro agente (Antigravity-01, misión `CONTAIA-EWO-SEC-NAV-001-T03-FINAL-AUDIT`, 2026-08-06) — [`EWO-SEC-NAV-001-T03_FINAL_AUDIT.md`](audits/EWO-SEC-NAV-001-T03_FINAL_AUDIT.md). Confirmó que el catálogo de permisos real (`permissions-catalog.ts`), `seed.ts` y las 22 pruebas de `permissions-catalog.test.ts` implementan correctamente el contrato vinculante de `D-011`, sin hallazgos `CRÍTICO`/`ALTO`. Encontró un hallazgo `MEDIO` (`T03-OBS-01`): el catálogo índice de `docs/16_WIREFRAMES_SPECIFICATION.md` §54 contradecía la propia prosa normativa del mismo documento (ya corregida en §21) para las filas `WF-0012`, `WF-0013`, `WF-0015`, `WF-0016` — reaparición del patrón "Administrador/Supervisor/Auditor omitidos" que `D-011` fue creada para eliminar, esta vez en una tabla índice que §21 no verificó. Veredicto de esa auditoría: `REQUIERE CAMBIOS`, mecánico por ese único hallazgo `MEDIO`.

### Alcance de este turno

Corregir exclusivamente `T03-OBS-01` y las contradicciones equivalentes que una búsqueda global confirmó en los mismos términos (Supervisor/Auditor excluidos de `cfdi.read`, lista de roles desactualizada, descarga de XML atribuida a la clave equivocada) dentro de los archivos autorizados. No se rediseñan permisos, no se amplían roles más allá del contrato ya vigente de `D-011`, no se modifica el contrato de `D-011`.

### Correcciones aplicadas

1. **`docs/16_WIREFRAMES_SPECIFICATION.md` §54 (Tarea 1, hallazgo `T03-OBS-01`).** Las cuatro filas del catálogo índice se alinean con su propia prosa normativa (líneas 224, 232, 248, 256, ya correctas desde §21) y con `BR-PERM-004`: `WF-0012` y `WF-0015`/`WF-0016` ganan Administrador, Supervisor y Auditor; `WF-0013` gana Administrador. Ningún otro wireframe del catálogo se tocó.

2. **`docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md` (Tarea 2).** La matriz RBAC final de §12 excluía a `SUPERVISOR`/`AUDITOR` de `cfdi.read` — criterio de 2026-07-24, anterior a `D-011`. Se actualiza la tabla (añade columna `document.download`, ambos roles pasan a "Sí (D-011)"), se agrega una nota de cabecera que declara la actualización y referencia cruzada a `D-011`/`BR-PERM-004` para evitar futuras divergencias, y se aclara explícitamente que la descarga del XML depende de `document.download`, nunca de `cfdi.read`. Una búsqueda dirigida dentro del mismo archivo encontró tres referencias adicionales a la matriz original, todas en secciones normativas vigentes (no snapshots datados) que también se corrigieron por consistencia interna: la fila de "Componentes nuevos requeridos" (§3.1, línea 162), y dos filas de "Criterios de aceptación actualizados" (§15, criterios 28 y 34) — esta última sección se titula explícitamente "actualizados" y no es un registro histórico. Se corrigió además, en el DoD de cierre del Bloque E, un ítem pendiente (`- [ ]`, sin marcar) que atribuía la protección de `API-0026` a `document.read` en vez de `document.download` — mismo defecto de raíz que motivó la Tarea 3, encontrado por la búsqueda global de este turno dentro de un archivo ya autorizado. **No se tocó** la arquitectura de concurrencia del worker (`D-007`, AD-1 a AD-12) ni ningún otro contenido del addendum.

3. **`docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md` (Tarea 3).** La regla invariante #9 de §5 ("Reglas que no pueden reinterpretarse", explícitamente "vigentes con independencia del sprint en curso") declaraba a `SUPERVISOR`/`AUDITOR` excluidos con `403` de `API-0027`. Se corrige para reflejar `D-011`: los cinco roles con `cfdi.read` (`ADMINISTRADOR`, `CONTADOR`, `AUXILIAR`, `SUPERVISOR`, `AUDITOR`) permitidos, estrictamente lectura para Supervisor/Auditor; `ESTUDIANTE` excluido; se distingue explícitamente que la descarga de XML depende de `document.download`, no de `cfdi.read`. La tarjeta de tarea `E5-S7-T02` (línea 2187) recibe la misma corrección en sus "Acciones" y "Criterio de aceptación" — **su `Estado inicial` permanece `BLOCKED`, sin marcar como implementada**, conforme a la instrucción explícita de esta misión. La fila de trazabilidad "API-0027 RBAC" (línea 2655) se corrige para no repetir la lista de roles obsoleta.

   **La tarjeta `E5-S1-T08` (línea 664, ya cerrada `PASSED` el 2026-07-25) no se reescribió.** Su texto de "Acciones" y "Criterio de aceptación" original (que documentaba la exclusión deliberada de Supervisor/Auditor, correcta en esa fecha bajo el Addendum §12 original) se conserva íntegro como registro histórico exacto de lo que se ejecutó y certificó entonces — reescribirlo habría alterado un registro histórico legítimo, prohibido por el encargo de esta misión. En su lugar se añadió una nota de vigencia inmediatamente antes de la tarjeta, que remite a `D-011`/`BR-PERM-004` como el estado real vigente del catálogo y aclara explícitamente que esta revisión no reabre ni exige reejecutar `E5-S1-T08`.

   La sección 4 "Estado real del repositorio" (línea 76, fila "Permiso `cfdi.read` en seed") **no se tocó**: está explícitamente fechada ("Verificado directamente por inspección de código el 2026-07-25") y describe con exactitud lo que era cierto en esa fecha (`cfdi.read` no existía todavía en el seed) — es un snapshot histórico legítimo, no una contradicción vigente.

4. **`AI_CONTEXT.md`.** La fila "Corrección prioritaria abierta" afirmaba que el cierre de `T03` en §21 (2026-08-06) quedó "sin bloqueos abiertos" — inexacto tras el hallazgo `T03-OBS-01` de la auditoría independiente. Se corrige para reflejar el hallazgo, su origen (auditoría de Antigravity-01) y su corrección en este mismo turno, sin alterar el resto del estado vigente de `D-011`/`T03`.

### Búsqueda global (Tarea 4)

Patrones buscados en todo `docs/`, `brain/` y el árbol de trabajo: "Supervisor excluido de CFDI", "Auditor excluido de CFDI", "ADMINISTRADOR, CONTADOR, AUXILIAR" como única lista de `cfdi.read`, "`document.download` todavía pendiente", "descarga de XML gobernada por `cfdi.read`".

| Ubicación | Clasificación | Acción |
| --- | --- | --- |
| `docs/16_WIREFRAMES_SPECIFICATION.md` §54, filas `WF-0012`/`0013`/`0015`/`0016` | Norma vigente, contradictoria | **Corregida** (Tarea 1) |
| `docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md` §12, §3.1 (línea 162), §15 (criterios 28, 34), DoD de cierre (`document.download` de `API-0026`) | Norma vigente, contradictoria | **Corregida** (Tarea 2 + hallazgos adicionales de la búsqueda global, mismo archivo autorizado) |
| `docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md` §5 regla 9, tarjeta `E5-S7-T02`, fila de trazabilidad "API-0027 RBAC" | Norma vigente, contradictoria | **Corregida** (Tarea 3) |
| `docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md` tarjeta `E5-S1-T08` (Acciones/Criterio originales) | Registro histórico legítimo de una tarjeta ya `PASSED` bajo el criterio vigente en su fecha | **No alterado** — se añadió nota de vigencia sin tocar el texto histórico |
| `docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md` §4 "Estado real del repositorio", línea 76 | Snapshot histórico fechado (2026-07-25), correcto para esa fecha | **No alterado** |
| `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md` líneas 140, 198–207 (incluida una nota "⚠ Corrección" previa que también quedó obsoleta frente a `D-011`) | Norma vigente, contradictoria — **misma clase de defecto** | **No corregida.** `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md` no está en el `ALLOWED_WRITE` de esta misión. Reportado como hallazgo abierto, no oculto — ver §"Riesgos residuales". |
| `docs/engineering/EWO-SEC-NAV-001_TENANT_ISOLATION_PLAN.md` §18–§21, `brain/DECISIONS.md` (D-011) | Texto histórico legítimo (documenta la contradicción original, ya resuelta, con fecha) | **No alterado** |
| `docs/04_BUSINESS_RULES.md` `BR-PERM-004`, `docs/08_API_DESIGN.md`, `docs/31_MASTER_SCREEN_MAP.md`, `docs/32_MASTER_NAVIGATION_ARCHITECTURE.md`, `packages/database/prisma/permissions-catalog.ts` | Ya correctos (verificado por lectura) | Sin acción |

### Validaciones ejecutadas

| Validación | Comando/método | Resultado |
| --- | --- | --- |
| Pruebas del catálogo | `pnpm --filter @contaia/database exec vitest run src/permissions-catalog.test.ts` | ✅ 22/22 verdes — sin cambios de catálogo, resultado idéntico al de turnos anteriores |
| TypeScript del paquete de base de datos | `pnpm --filter @contaia/database run typecheck` | ✅ sin errores |
| Búsquedas globales dirigidas | `grep` sobre los patrones de la Tarea 4, acotado primero a los tres archivos autorizados y después a todo `docs/`/`brain/` | Ver tabla de Búsqueda global |
| `git diff --check` | Acotado a los archivos modificados por este turno | Sin marcadores de conflicto ni contenido inválido — solo avisos de normalización de fin de línea LF→CRLF, preexistentes en todo el repositorio |
| Confirmación de alcance | Lectura de `permissions-catalog.ts`, `seed.ts`, `schema.prisma` | Sin diferencias — ninguno de los tres fue tocado en este turno |

### Confirmaciones de alcance

- Catálogo de permisos, `seed.ts`, `schema.prisma`, migraciones: **sin cambios**.
- Contrato vinculante de `D-011`: **sin cambios** — solo se corrigió documentación derivada que se había desincronizado de él.
- `D-010`, `D-012`, `D-013`: **no tocadas**.
- Rutas de `T04`, implementación de `API-0026`/`API-0027`/`API-0028`: **fuera de alcance, no tocadas**.
- Ninguna tarea se marca `PASSED` por este turno. `E5-S1-T08` conserva su estado `PASSED` histórico sin reabrirse. `E5-S7-T02` conserva `BLOCKED`.
- Sin `git add`, `commit` ni `push`.

### Riesgos residuales

- **`docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md` líneas 140/198–207 siguen contradiciendo `D-011`** (afirman explícitamente que "SUPERVISOR y AUDITOR no deben acceder" a `API-0027`/`API-0028`, con una nota "⚠ Corrección" previa que documentó la inclusión de Administrador pero nunca la de Supervisor/Auditor). No corregible bajo el `ALLOWED_WRITE` de esta misión — requiere una Work Order que incluya explícitamente ese archivo.
- **Alcance de esta corrección limitado a `cfdi.read`/`document.download`.** No se auditó el resto del catálogo (`company.*`, `journal.*`, `inventory.*`, `sat.*`, `users.*`) en `EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md` ni en `EWO-005_IMPLEMENTATION_CHECKLIST.md` en busca de contradicciones equivalentes fuera del alcance de `D-011` — no se buscó porque no corresponde a esta misión.
- **Reseed pendiente en entornos existentes** (riesgo ya registrado en turnos anteriores, sin cambio): cualquier entorno sembrado antes del 2026-08-05 no tiene la fila `document.download`, ni Supervisor/Auditor en `cfdi.read` si se sembró antes del 2026-08-04.

### Estado de T03 y D-011

`T03: IMPLEMENTADA · PENDIENTE DE AUDITORÍA` — el hallazgo `MEDIO` `T03-OBS-01` que forzaba el veredicto `REQUIERE CAMBIOS` de la auditoría independiente queda corregido; no se recomienda `PASSED` por este turno (ninguna corrección documental por sí sola certifica una tarea — esa certificación sigue requiriendo una nueva auditoría independiente `READ ONLY` de Codex sobre este turno).

`D-011: IMPLEMENTADA · PENDIENTE DE AUDITORÍA` — sin cambio de contrato.

### Siguiente paso recomendado

1. Solicitar una nueva auditoría independiente `READ ONLY` (Codex o equivalente) sobre el estado de `T03` tras esta corrección, para confirmar que `T03-OBS-01` y los hallazgos equivalentes quedaron resueltos sin introducir contradicciones nuevas.
2. Autorizar explícitamente una Work Order que incluya `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md` en su `ALLOWED_WRITE` para corregir el residuo documentado arriba (líneas 140, 198–207).
3. Mantener sin cambio el plan de `T05` (sincronizar el resto del catálogo con una matriz canónica y pruebas de sincronización análogas a `BR-PERM-004`).

## 23. Corrección del último residuo normativo de T03/D-011 en EWO-005 (2026-08-06)

**Documentación exclusivamente**, un solo archivo (`docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md`). Sin cambios de catálogo (`permissions-catalog.ts` intacto), `seed.ts`, `schema.prisma`, migraciones, código, frontend, rutas de `T04`, `E5-S3-T06`, `D-010`, `D-012`, ni del contrato vinculante de `D-011`. `Addendum` y `Checklist` **no tocados** — ya corregidos por la misión anterior (§22). `T03` permanece **`IMPLEMENTADA · PENDIENTE DE AUDITORÍA` — no `PASSED`**.

### Origen

§22 dejó un hallazgo abierto y reportado, no oculto: `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md` (líneas 140, 198–207 en su numeración de entonces) seguía afirmando en secciones vigentes que Supervisor y Auditor no deben acceder a `API-0027`/`API-0028` — la misma clase de contradicción que `Addendum` y `Checklist` ya habían resuelto, pero ese archivo no estaba en el `ALLOWED_WRITE` de esa misión. Esta misión (`CONTAIA-EWO-SEC-NAV-001-T03-LAST-RESIDUAL`) lo autoriza explícitamente.

### Precondiciones verificadas antes de escribir

- Repositorio, rama (`feature/frontend-ux-audit`) y `HEAD` (`b5b289d3...`) confirmados.
- `git status --short` capturado antes de editar.
- Sin indicios de edición concurrente sobre el archivo objetivo: hash de contenido estable (`md5sum`) entre la primera lectura y el momento de editar; ninguna otra herramienta lo tocó en el intervalo.
- Se encontró una copia divergente del mismo archivo dentro de `.claude/worktrees/agent-a4b02bb46c9bc7841/` (worktree aislado de otro agente, rama `worktree-agent-a4b02bb46c9bc7841`, mismo `HEAD` base) — **no es el árbol de trabajo de esta misión** (`.claude/rules/40-parallel-work.md` #3: un agente no corrige silenciosamente el trabajo de otro). No se tocó; reportado como residuo fuera de alcance en Riesgos residuales.
- Ruta de listado de `T04` (`/{companyId}/fiscal/cfdi`, línea 80) releída antes y verificada intacta después de editar.

### Corrección aplicada

`docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md` §4.4 ("Impacto sobre la guarda de RBAC") — reescrita para reflejar `D-011`/`BR-PERM-004`:

- Tabla de permisos ampliada de tres a cuatro filas: se separa `document.download` de `document.read` (antes la descripción de `document.read` incluía "descarga del archivo original", la misma equivalencia incorrecta que `D-011` punto 10 prohíbe). Las cuatro claves quedan con los cinco roles (`ADMINISTRADOR`, `CONTADOR`, `AUXILIAR`, `SUPERVISOR`, `AUDITOR`) donde corresponde; `document.upload` conserva sus tres roles originales.
- La nota "⚠ Corrección" que declaraba "SUPERVISOR y AUDITOR siguen **excluidos**" (cierta cuando se escribió, el 2026-08-04, antes de `D-011`) se sustituye por una nota de vigencia que explica las dos correcciones sucesivas (Administrador primero, Supervisor/Auditor después por `D-011`) y remite a `BR-PERM-004` como fuente prevaleciente ante cualquier divergencia futura — mismo patrón ya usado en `Addendum` §12 y `Checklist` regla 9 por la misión anterior.
- Los tres bullets de "Distinción crítica" se reescriben: `document.read` deja de mencionarse como protector de la descarga (era la causa raíz del error, atribuía `API-0026` a la clave equivocada); se añade un bullet propio para `document.download`/`API-0026`; el bullet de `cfdi.read` deja de excluir a Supervisor/Auditor y aclara explícitamente que la descarga del XML depende de `document.download`, nunca de `cfdi.read`.
- Diagrama de flujo (línea ~140): la anotación `[ADMINISTRADOR, CONTADOR, AUXILIAR]` de `GET /documents/{documentId}/cfdi (API-0027)` se corrige a los cinco roles, con referencia a `cfdi.read`/`D-011`.
- Tabla de criterios de aceptación de EWO-005 (fila 10, "deben estar verificados antes de declarar EWO-005 DONE" — norma vigente, no histórica, a diferencia de la fila 6 que sí lleva su propia marca `⚠ SUSTITUIDO`): reescrita para afirmar que Auditor/Supervisor acceden en modo lectura a las tres claves (`document.read`, `document.download`, `cfdi.read` estrictamente lectura) y que solo Estudiante recibe `403`.

### Texto histórico preservado

- Línea ~22 ("Secciones de este plan SUSTITUIDAS por D-007/Q-001... la fila de `cfdi.read` de §4.4 (omitía ADMINISTRADOR)"): **no se tocó**. Describe con exactitud un hecho histórico distinto (la omisión original de Administrador, ya resuelta antes de esta misión) y está explícitamente enmarcada como registro histórico bajo el mismo bloque de notas que ya usa `D-007`/`Q-001` como precedente de formato. Ampliarla no era necesario para cumplir el objetivo de esta misión (eliminar la contradicción de Supervisor/Auditor) y se prefirió el cambio mínimo.
- Fila 6 de la tabla de criterios de aceptación (`⚠ SUSTITUIDO por D-007 / Q-001`): no relacionada con `D-011`, no tocada.
- Ninguna decisión (`D-007`, `D-009`, `D-010`, `D-011`, `D-012`, `D-013`) fue editada; solo se leyeron para verificar el contrato vigente.

### Búsqueda global (READ ONLY)

Patrones de la Tarea 3 sobre todo el repositorio (excluyendo el propio archivo ya corregido y los artefactos de auditoría, que documentan intencionalmente el estado histórico):

| Resultado | Ubicación | Clasificación |
| --- | --- | --- |
| Sin contradicciones vigentes nuevas | `docs/04`, `docs/08`, `docs/11`, `docs/15`, `docs/16`, `docs/31`, `docs/32`, `Addendum`, `Checklist`, `AI_CONTEXT.md`, `brain/DECISIONS.md`, `brain/DECISION_INDEX.md`, `CHANGELOG.md` | Ya correctos (verificado por lectura/grep dirigido) |
| Residuo divergente, mismo defecto | `.claude/worktrees/agent-a4b02bb46c9bc7841/{CHANGELOG.md, docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md, docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md, docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md}` | Worktree aislado de otro agente — **no tocado**, fuera de `ALLOWED_WRITE`, reportado |
| Texto histórico correctamente enmarcado | `docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md` tarjeta `E5-S1-T08` (ya `PASSED`) y su sección 4 fechada; `brain/DECISIONS.md` `D-011` Contexto/Riesgos/Historial; `EWO-SEC-NAV-001_TENANT_ISOLATION_PLAN.md` §14–§22 | Sin acción — ya corregidos/anotados por la misión anterior |

### Validaciones ejecutadas

| Validación | Comando/resultado |
| --- | --- |
| Pruebas del catálogo | `pnpm --filter @contaia/database exec vitest run src/permissions-catalog.test.ts` → ✅ 22/22 verdes, sin cambio de catálogo |
| Búsquedas globales | `grep` dirigido, ver tabla de arriba |
| Ruta de listado de `T04` | `/{companyId}/fiscal/cfdi` confirmada intacta en línea 80 antes y después de editar |
| `git diff --check` | Acotado a `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md` → sin advertencias de ningún tipo |
| Confirmación de alcance | `git status --short` sobre `permissions-catalog.ts`, `seed.ts`, `schema.prisma`, `Addendum`, `Checklist`, `brain/DECISIONS.md` → sin diferencias nuevas atribuibles a este turno |

### Confirmaciones de alcance

- Único archivo modificado por Tarea 1/2: `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md`.
- Catálogo, `seed.ts`, `schema.prisma`, `Addendum`, `Checklist`: **sin cambios en este turno**.
- `D-010`, `D-011`, `D-012` en `brain/DECISIONS.md`: **no tocadas**.
- `T04`, `E5-S3-T06`: **no tocadas**.
- Ninguna tarea se marca `PASSED`.
- Sin `git add`, `commit` ni `push`.

### Riesgos residuales

- **Worktree ajeno `.claude/worktrees/agent-a4b02bb46c9bc7841/` contiene una versión divergente y desactualizada de cuatro archivos** (`CHANGELOG.md`, `Addendum`, `Checklist`, este plan de fiscal), con un razonamiento que **excluye explícitamente** a Supervisor/Auditor de `cfdi.read` — contradice `D-011` frontalmente. No corresponde a esta misión resolverlo (no es "el repositorio" de `EXPECTED_REPOSITORY` en el sentido de mi árbol de trabajo activo, y ningún `ALLOWED_WRITE` lo cubre). Requiere decisión humana: si ese worktree sigue vivo, debe reconciliarse contra `D-011` o descartarse explícitamente — nunca fusionarse tal cual.
- **`docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md` línea ~22** conserva una nota histórica que solo documenta la omisión original de Administrador, no la posterior inclusión de Supervisor/Auditor por `D-011` — no es una contradicción (está correctamente marcada como histórica), pero un lector apurado podría no encontrar ahí el contexto completo. No se amplió por ser cambio mínimo fuera del objetivo estricto de esta misión.

### Estado de T03 y D-011

`T03: IMPLEMENTADA · PENDIENTE DE AUDITORÍA` — con esta corrección, no quedan contradicciones normativas vigentes conocidas dentro del árbol de trabajo activo (`.claude/worktrees/` de otros agentes excluido). No se recomienda `PASSED`: la certificación sigue requiriendo una nueva auditoría independiente `READ ONLY`.

`D-011: IMPLEMENTADA · PENDIENTE DE AUDITORÍA` — sin cambio de contrato.

### Siguiente paso recomendado

1. Solicitar una nueva auditoría independiente `READ ONLY` sobre `T03`, ahora que los tres documentos de arquitectura de EWO-005 (`Addendum`, `Checklist`, este plan) están sincronizados con `D-011`.
2. Decisión humana sobre el worktree `.claude/worktrees/agent-a4b02bb46c9bc7841/`: reconciliar o descartar explícitamente antes de cualquier fusión.
3. Mantener sin cambio el plan de `T05` (extender la matriz canónica y sus pruebas de sincronización al resto del catálogo).
