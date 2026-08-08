# EWO-SEC-NAV-001 — T01: Auditoría final independiente

## Control del documento

| Campo             | Valor                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| Work Order        | `EWO-SEC-NAV-001 — Tenant Isolation & Navigation Contracts`              |
| Tarea             | `T01 — Platform Admin y tenant isolation`                                |
| Decisión          | `D-010 — Platform Admin no hereda autorización company-scoped`           |
| Fecha             | 2026-08-04                                                               |
| Auditor           | Codex                                                                    |
| Tipo              | Auditoría final independiente `READ ONLY`                                |
| Snapshot auditado | `feature/frontend-ux-audit` · `b5b289d32fdcc8d7ab61fd62ecfe0316b8c75be8` |
| Veredicto         | **PASSED CON OBSERVACIONES**                                             |

## Alcance

Confirmar que T01 implementa D-010 de forma fail-closed, sin Membership implícita para Platform Admin, y que conserva los flujos legítimos con Membership activa. La revisión cubrió guards, servicio de Memberships, evento y listener de auditoría, controladores y las pruebas dirigidas de autorización HTTP.

## Fuera de alcance

- `API-0053`, Support Access Grant y soporte JIT, que no están implementados.
- T02–T06, permisos CFDI, rutas de CFDI, migraciones y base de datos real.
- Cambios locales ajenos presentes en el árbol de trabajo.

## Evidencia inspeccionada

- [Plan EWO-SEC-NAV-001](../EWO-SEC-NAV-001_TENANT_ISOLATION_PLAN.md), `brain/DECISIONS.md` (D-010), `brain/DECISION_INDEX.md`, `AI_CONTEXT.md`, `PROJECT_INDEX.md` y `CHANGELOG.md`.
- `CompanyGuard`, `PermissionGuard`, `RoleGuard`, `OwnershipGuard` y sus specs.
- `MembershipsService` y su spec.
- `AUTH_EVENTS`, `AuditService` y `audit.service.spec.ts`.
- `CompaniesController`, `MembershipsController`, `@Company()` y contexto de request.
- `platform-admin-tenant-isolation.e2e-spec.ts`.

## Confirmación de D-010

- `CompanyGuard` resuelve incondicionalmente `findActiveByUserAndCompany(userId, companyId)`. Si no hay Membership activa, deniega; `isPlatformAdmin` solo determina la emisión del evento de auditoría, nunca autoriza.
- `PermissionGuard`, `RoleGuard` y `OwnershipGuard` operan sobre `request.membership`; no conservan bypass universal por Platform Admin.
- `MembershipsService.assertActorIsCompanyAdmin` exige Membership activa con rol `ADMINISTRADOR` en la empresa del recurso objetivo. Para Platform Admin sin esa Membership emite el evento y deniega.
- `@Company()` permanece como defensa en profundidad: extrae el contexto ya resuelto y lanza 403 si falta. No sustituye al guard como barrera primaria.
- No se encontró `API-0053`, Membership sintética ni contexto JIT simulado.

## Verificación de endpoints

| Endpoint                                        | Autenticación y autorización                               | Empresa resuelta / denegación                                                       | Evidencia y resultado                                                                                                      |
| ----------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `PATCH /v1/companies/:companyId/fiscal-profile` | `AuthenticationGuard` → `CompanyGuard` → `PermissionGuard` | `companyId` de ruta; `CompanyGuard` deniega 403 sin Membership                      | HTTP: Platform Admin sin Membership 403; Administrador legítimo y Platform Admin con Membership activa obtienen 200.       |
| `PATCH /v1/companies/:companyId/address`        | `AuthenticationGuard` → `CompanyGuard` → `PermissionGuard` | `companyId` de ruta; denegación en `CompanyGuard`                                   | HTTP: Platform Admin sin Membership 403; guard preserva el contexto para actor legítimo.                                   |
| `PATCH /v1/companies/:companyId/settings`       | `AuthenticationGuard` → `CompanyGuard` → `PermissionGuard` | `companyId` de ruta; denegación en `CompanyGuard`                                   | HTTP: Platform Admin sin Membership 403; guard preserva el contexto para actor legítimo.                                   |
| `GET /v1/companies/:companyId/memberships`      | `AuthenticationGuard` → `CompanyGuard` → `RoleGuard`       | `companyId` de ruta; denegación en `CompanyGuard`                                   | HTTP: Platform Admin sin Membership 403; Administrador legítimo obtiene 200.                                               |
| `PATCH /v1/memberships/:membershipId`           | `AuthenticationGuard` → `MembershipsService`               | Empresa tomada de la Membership objetivo; denegación en `assertActorIsCompanyAdmin` | HTTP: Platform Admin sin Membership 403 y no actualiza; spec de servicio conserva actualización para Administrador activo. |
| `DELETE /v1/memberships/:membershipId`          | `AuthenticationGuard` → `MembershipsService`               | Empresa tomada de la Membership objetivo; denegación en `assertActorIsCompanyAdmin` | HTTP: Platform Admin sin Membership 403 y no revoca; spec de servicio conserva revocación para Administrador activo.       |

La suite HTTP usa `AppModule`, JWT y cookie reales para recorrer la cadena de NestJS; no invoca guards ni controladores de forma directa.

## Evento de auditoría

`AUTH_EVENTS.PLATFORM_ADMIN_COMPANY_ACCESS_DENIED` se persiste mediante `AuditService.onPlatformAdminCompanyAccessDenied` con `actorUserId`, `companyId`, acción `security.platform_admin_company_access_denied`, recurso `Company`, `result: 'FAILURE'`, correlación, IP y agente. No contiene secreto, RFC, régimen fiscal, XML ni `reason` de un soporte JIT inexistente.

La prueba directa cubre tanto el payload como el rechazo de `AuditRepository.append()`. El 403 se conserva porque el guard emite sin esperar el listener y arroja inmediatamente su excepción; la prueba HTTP simula ese fallo y confirma la respuesta 403.

## Pruebas ejecutadas

| Comando                                                                                                      | Resultado                                                                  |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `pnpm --filter @contaia/api exec jest src/modules/audit/audit.service.spec.ts --runInBand`                   | 1 suite, 6/6 PASS                                                          |
| `pnpm --filter @contaia/api run test:integration -- platform-admin-tenant-isolation.e2e-spec.ts --runInBand` | 1 suite, 10/10 PASS; el log de fallo de repositorio es simulado y esperado |
| Specs de los cuatro guards y `MembershipsService`                                                            | 5 suites, 40/40 PASS                                                       |
| `pnpm --filter @contaia/api run typecheck`                                                                   | PASS                                                                       |
| ESLint acotado a archivos T01                                                                                | PASS, sin advertencias                                                     |
| `pnpm --filter @contaia/api run build`                                                                       | PASS                                                                       |

No se repitió la suite completa de backend: los cambios auditados se limitan a las superficies cubiertas por estas pruebas dirigidas, incluida la cadena HTTP completa de los seis endpoints.

## Resultados de validación

Los criterios técnicos y documentales de T01 se mantienen: EWO-SEC-NAV-001 está `EN PROGRESO`; T01 sigue `IMPLEMENTADA · PENDIENTE DE REAUDITORÍA` y D-010 `IMPLEMENTADA · PENDIENTE DE AUDITORÍA FINAL` hasta el cierre administrativo posterior. No se alteraron esos estados durante esta auditoría.

## Hallazgos

| ID         | Severidad | Ubicación                            | Problema y evidencia                                                                                                   | Impacto                                                                           | Corrección mínima                                                         | Estado                 |
| ---------- | --------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------- |
| T01-OBS-01 | BAJO      | `AI_CONTEXT.md` encabezado de estado | El encabezado dice `Estado actual (2026-08-03)`, mientras el mismo estado vivo registra trabajo de T01 del 2026-08-04. | Metadato temporal inconsistente; no cambia la autorización ni el estado de D-010. | Actualizar solo la fecha del encabezado durante el cierre administrativo. | ABIERTO, no bloqueante |

## Riesgos residuales

El flujo futuro de soporte JIT continúa fuera de alcance y no debe inferirse de `isPlatformAdmin`. La protección vigente es deliberadamente denegar sin Membership activa.

## Veredicto final

**PASSED CON OBSERVACIONES**

T01 cumple D-010: no existe bypass de Platform Admin, la autorización company-scoped es fail-closed, los seis endpoints quedan protegidos por la cadena real y los flujos legítimos conservan autorización basada en Membership activa. Solo permanece una observación documental BAJA no bloqueante.

## Estado recomendado de T01

`T01: PASSED`

## Estado recomendado de D-010

`D-010: IMPLEMENTADA · PASSED`

## Historial

| Fecha      | Evento                                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-04 | Creación de la auditoría final independiente `READ ONLY`; no modifica código, pruebas, decisiones, Work Order ni estados administrativos. |
