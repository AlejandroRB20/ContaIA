# EWO-003 — Reporte de Ejecución: Organization & Company Management

## 1. Metadatos

| Campo              | Valor                                                                                                                                                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Work Order         | EWO-003 — Organization & Company Management                                                                                                                                                                                                                                                        |
| Fecha de ejecución | 2026-07-19                                                                                                                                                                                                                                                                                         |
| Ejecutado por      | Claude Code (autónomo, dentro del alcance definido y confirmado)                                                                                                                                                                                                                                   |
| Entorno            | Windows 11 Pro, pnpm 11.15.0, sin Docker Desktop instalado (mismo bloqueo de infraestructura ya documentado en EWO-001/EWO-002)                                                                                                                                                                    |
| Resultado final    | **BLOCKED** — código completo y `pnpm run check` (lint, typecheck, test, test:integration, build) en verde; primer commit de Git creado (`756358d`); único bloqueo restante: la migración inicial real de Prisma requiere Docker/PostgreSQL, no disponible en este entorno (ver secciones 14 y 15) |

> **Adenda (2026-07-19, mismo día):** el responsable de producto pidió cerrar la inconsistencia documental de BR-EMP-004 registrada en la sección 9 antes de iniciar EWO-004. Corrección de trazabilidad documental únicamente, sin cambio de comportamiento del sistema ni nueva decisión arquitectónica: BR-EMP-004 quedó definida en `docs/04_BUSINESS_RULES.md` sección 4.3 (Unicidad y especificidad de la Membresía por empresa), consistente con el comportamiento que el sistema ya implementaba y que esta Work Order y EWO-002 ya usaban. Ver sección 9 (nota) y `MASTER_CONTEXT.md` para el registro completo.
>
> **Adenda 2 (2026-07-19, mismo día) — Ampliación de alcance de EWO-003:** el responsable de producto envió un texto de Work Order EWO-003 más detallado, que amplía el alcance ya entregado (perfil fiscal, domicilio fiscal, configuración regional, nombre comercial) y vuelve a pedir explícitamente "estado de empresa" (activar/desactivar). Se confirmó con el responsable de producto, mediante `AskUserQuestion`, mantener la exclusión de "estado de empresa" ya decidida (sección 3) — la documentación aprobada tiene prioridad sobre el prompt, tal como el propio texto de la Work Order indica. Se implementó el resto del alcance ampliado. Ver sección 13 para el detalle completo.
>
> **Adenda 3 (2026-07-19, mismo día) — Cierre técnico de EWO-003:** el responsable de producto pidió una revisión de cierre completa (Tech Lead) antes de avanzar a EWO-004: consulta de miembros de la Empresa (API-0016, nunca implementada), protección contra revocar al último propietario activo (BR-EMP-001 como invariante permanente), y limpieza de un evento de auditoría declarado pero nunca emitido (`PERMISSION_CHANGED`, código muerto desde EWO-002). Los tres se corrigieron. `prisma format`/`prisma validate`/`prisma generate` ejecutados y en verde; `prisma migrate dev` sigue bloqueado por ausencia de Docker — documentado como pendiente real, no simulado. Ver sección 14 para el detalle completo.
>
> **Adenda 4 (2026-07-19, mismo día) — Primer commit de Git:** el responsable de producto autorizó explícitamente crear el primer commit del repositorio, condicionado a reconfirmar antes que el árbol estuviera en un estado válido y seguro. Se reconfirmó (`git status`, `pnpm run check`, `prisma validate`/`generate`, revisión de secretos), se descubrió y corrigió de raíz un defecto pre-existente que impedía el commit — el hook `pre-commit` (Husky + lint-staged) nunca había funcionado porque invocaba `eslint` desde la raíz, donde no se resuelve (sin `eslint.config.*` de raíz y sin `eslint` como dependencia de raíz) — y se creó el commit **`756358d`** con hooks activos (sin `--no-verify`). Estado formal actualizado a **BLOCKED**: el único criterio de cierre pendiente es la migración inicial real, que sigue requiriendo Docker. **No se hizo push, no se abrió PR, no se reescribió historia. EWO-004 no se inició.** Ver sección 15 para el detalle completo.

## 2. Resumen ejecutivo

Se implementó el módulo de administración de Empresas (Companies) que EWO-002 dejó explícitamente diferido (decisión D-005, `brain/DECISIONS.md`): autoservicio de creación de Empresa con asignación atómica de Administrador propietario (BR-EMP-001), consulta/listado/actualización de datos generales (BR-EMP-003, BR-CFG-001/002), y el alcance mínimo de la entidad Organización que `docs/04_BUSINESS_RULES.md` (BR-ORG-001/002) y `docs/01_PRD.md` sección 11 exigen como agrupador de Empresas.

Antes de escribir código se detectaron dos contradicciones reales entre el texto de la Work Order recibida y la documentación ya aprobada — se resolvieron con el responsable de producto mediante `AskUserQuestion` antes de tocar el esquema (sección 3), en vez de asumir una resolución unilateral.

Todas las validaciones ejecutables en este entorno (`typecheck`, `lint`, pruebas unitarias, pruebas de integración sin Postgres real, `build`) terminan en verde. La migración real contra PostgreSQL (`prisma migrate dev`) y la verificación de extremo a extremo con el backend real corriendo no pudieron ejecutarse por la misma ausencia de Docker ya documentada en EWO-001/EWO-002 — reconfirmado al intentarlo (sección 7). El frontend nuevo sí se verificó en un navegador real (dev server de Next.js), confirmando renderizado correcto, validación de formulario y manejo de errores sin backend disponible (sección 6).

## 3. Decisiones confirmadas antes de implementar

- **Organización (BR-ORG-001/002):** la Work Order recibida no mencionaba la entidad Organización, pero `docs/04_BUSINESS_RULES.md` y `docs/06_SYSTEM_WORKFLOWS.md` (Workflow 4) la exigen como parte del flujo de creación de Empresa, con endpoints propios documentados (API-0009/API-0010). Se confirmó implementarla en **alcance mínimo**: modelo `Organization`, relación `Organization → Company`, agrupación automática (Organización implícita en la primera Empresa de un usuario, o asociación a una Organización ya administrada), y únicamente los dos endpoints documentados — sin edición, eliminación, transferencias, invitaciones o facturación de Organización. Se registra como implementación mínima de un modelo ya aprobado, no como nueva decisión arquitectónica.
- **Activación/baja de Empresa:** la Work Order pedía "activar o desactivar una empresa" y "baja lógica", pero ninguna regla de negocio define ese comportamiento — `docs/09_DATABASE_DESIGN.md` y `docs/05_SYSTEM_DOMAIN_MODEL.md` marcan explícitamente la baja de Empresa como **fuera del alcance funcional del MVP**. Se confirmó **omitir** esa funcionalidad en esta Work Order: `CompanyStatus` y `deletedAt` permanecen en el esquema (capacidad reservada), pero ningún endpoint expone activar/desactivar/eliminar una Empresa, y no se inventó ninguna regla de negocio nueva para ese comportamiento.

## 4. Alcance ejecutado

### Base de datos (`packages/database/prisma/schema.prisma`)

- **`Organization`** (nuevo): `id`, `name`, timestamps, `deletedAt`. Relación 1:N con `Company`.
- **`Company`** (extendido): se agregan `organizationId` (FK obligatoria a `Organization`), `businessActivity` (el giro exigido por BR-EMP-003 — `name` ya sostenía la razón social desde EWO-002) y `version` (bloqueo optimista para `PATCH /companies/:id`, mismo patrón que `Membership.version`). `status`/`deletedAt` se mantienen sin uso funcional todavía (sección 3).
- `prisma generate` ejecutado y validado; `prisma migrate dev` **no** pudo ejecutarse (sin Postgres real, sección 7) — no existe carpeta `migrations/` en el repositorio (el esquema se ha aplicado hasta ahora sin migraciones formales registradas); queda pendiente generar la migración real la primera vez que haya un entorno con Docker disponible.
- Semilla (`seed.ts`) actualizada: crea una "Organización Demo" y asocia la "Empresa Demo" existente a ella, con `businessActivity` de ejemplo.

### Backend (`apps/api/src`)

- **`modules/organizations`** (nuevo): `OrganizationsRepository` (`findById`, `create`), `OrganizationsService` (`createOrganization` — API-0009; `getOrganization` — API-0010, filtra las Company devueltas a solo aquellas donde el usuario solicitante tiene Membership activa, BR-ORG-002), `OrganizationsController` (`POST /organizations`, `GET /organizations/:organizationId`, solo `AuthenticationGuard` — la autorización de la segunda ruta se resuelve dentro del service, mismo patrón que las rutas planas de `MembershipsController`).
- **`modules/companies`** (completado — EWO-002 solo dejó `CompaniesRepository.findById`): `CompaniesService.createCompany` (transacción atómica Organización [si aplica] + Company + Membership Administrador/`isOwner=true`, BR-EMP-001), `listForUser` (reusa `MembershipsRepository.findAllForUser` — BR-GLB-001), `getCompany`/`updateCompany` (bloqueo optimista vía `If-Match`, BR-EMP-003/BR-CFG-002). `CompaniesController`: `POST/GET /companies` solo con `AuthenticationGuard`; `GET/PATCH /companies/:companyId` añaden `CompanyGuard` + `PermissionGuard` contra los permisos ya sembrados `company.read`/`company.update` (nunca un `RoleGuard` ad-hoc, para no hardcodear la autorización fuera del catálogo Role/Permission/RolePermission).
- **No se implementó `POST /companies/:companyId/select`**, pese a que el texto de la Work Order lo sugería como ejemplo — `docs/08_API_DESIGN.md` sección 5 decide explícitamente que "empresa activa" es una noción de interfaz, nunca de API; el propio texto de la Work Order subordina esos nombres a la documentación como fuente de verdad.
- **Eventos y auditoría:** `OrganizationCreatedEvent`, `CompanyCreatedEvent`, `CompanyUpdatedEvent` (con `beforeState`/`afterState` para BR-CFG-002) agregados a `common/events/auth.events.ts`, con sus `@OnEvent` en `AuditService` — nunca se llama `AuditRepository` directo, mismo patrón que Auth/Roles & Permissions.
- **Whitelist deliberado:** `CreateCompanyDto`/`UpdateCompanyDto` nunca exponen `isOwner`/`status`/`version` — esos campos son responsabilidad exclusiva del servidor (BR-PERM-003: ownership nunca es asignable por el cliente).

### Frontend (`apps/web`)

- `lib/companies-client.ts` (nuevo, mismo patrón plano que `auth-client.ts`) y 4 hooks de TanStack Query: `use-companies`, `use-company`, `use-create-company`, `use-update-company`.
- 3 pantallas nuevas: `/crear-empresa` (UI-0006, formulario razón social/giro/RFC con Zod + React Hook Form), `/empresas` (UI-0010, listado con estados vacío/carga/error), `/empresas/[companyId]` (UI-0011, detalle + edición condicionada al Rol Administrador — nunca a `isOwner`, BR-PERM-003).
- `/seleccionar-empresa` (`company-selector.tsx`) extendido con la acción "Crear Empresa" — se levanta el bloqueo de alcance de D-005 que esa pantalla documentaba explícitamente.
- `packages/types/src/companies.ts` (nuevo): contratos compartidos `CompanySummary`, `CompanyDetail`, `CreateCompanyInput`, `UpdateCompanyInput`, `OrganizationDetail`.

## 5. Comandos ejecutados y resultado

| Comando                                                  | Resultado                                                                                                                                                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @contaia/database run generate`           | ✅ OK — cliente Prisma regenerado dos veces (tras agregar `Organization`/campos de `Company`, y tras agregar `Company.version`)                                                                      |
| `pnpm run lint`                                          | ✅ OK (12/12 tareas, 0 errores, 0 warnings)                                                                                                                                                          |
| `pnpm run typecheck`                                     | ✅ OK (12/12 tareas)                                                                                                                                                                                 |
| `pnpm run test:unit`                                     | ✅ OK (11/11 tareas — 18 pruebas nuevas: 12 en `apps/api` para `CompaniesService`/`OrganizationsService`, 3 para `CompaniesList` en `apps/web`, más las 76 preexistentes)                            |
| `pnpm run test:integration`                              | ✅ OK (`apps/api`: 17/17, incluyendo 6 pruebas nuevas de contrato HTTP para Companies/Organizations; `packages/database`: 2 omitidas — Postgres no disponible, motivo impreso, no cuenta como fallo) |
| `pnpm run build`                                         | ✅ OK (7/7 tareas — `apps/web` genera las 3 rutas nuevas: `/crear-empresa`, `/empresas`, `/empresas/[companyId]`)                                                                                    |
| Verificación en navegador (`next dev`, sin backend real) | ✅ Manual — ver sección 6                                                                                                                                                                            |
| `prisma migrate dev` / seed real / e2e con Postgres real | ⛔ No ejecutado — Docker no disponible en este entorno (sección 7)                                                                                                                                   |

## 6. Verificación manual en navegador

Con el backend deliberadamente apagado (para confirmar manejo de errores sin infraestructura real), se levantó `apps/web` con `next dev` y se verificó:

- `/crear-empresa`: renderiza los 3 campos (razón social, giro, RFC); el envío vacío muestra los 2 mensajes de validación esperados sin llamar a la red; el envío completo intenta la llamada real y muestra "No se pudo crear la empresa." de forma controlada (sin excepción no manejada) cuando el backend no responde.
- `/empresas`: renderiza el estado de error ("No se pudo cargar el listado de empresas." + botón "Reintentar") cuando la consulta falla — ver hallazgo de corrección en esta misma sección.
- `/empresas/[companyId]`: renderiza el estado de error equivalente para un `companyId` inexistente/sin backend.
- `/seleccionar-empresa`: build de producción genera la ruta sin errores; el enlace "Crear empresa" se agregó al estado vacío y al listado de Empresas existentes.

**Hallazgo corregido durante esta verificación:** `CompaniesList` inicialmente usaba `companies.data ?? []` para decidir el estado vacío, lo que — bajo una condición específica de este entorno de vista previa donde TanStack Query deja una consulta fallida en estado `paused` en vez de `error` (comportamiento de su `onlineManager`, no reproducible con Postgres real ni observado en el resto del código) — mostraba "Aún no tienes ninguna empresa" en vez de un error, un mensaje engañoso si el usuario sí tuviera Empresas pero la carga hubiera fallado. Se corrigió a `companies.isError || !companies.data`, igualando el patrón defensivo que `company-selector.tsx` (EWO-002) ya usaba (`session.isError || !session.data`). Cubierto por una prueba unitaria nueva (`companies-list.test.tsx`) que fuerza un rechazo de red real y confirma el estado de error, no el vacío.

## 7. Bloqueo no crítico: infraestructura en vivo no disponible (idéntico a EWO-001/EWO-002)

Reconfirmado al inicio de esta Work Order: Docker sigue sin estar instalado. Esto bloquea:

- `prisma migrate dev` contra Postgres real — no existe todavía una carpeta `migrations/` en el repositorio (el esquema no se ha versionado con migraciones formales hasta ahora); esta Work Order tampoco pudo crear la primera. **Acción pendiente cuando haya Docker:** `docker compose up -d postgres && pnpm --filter @contaia/database run migrate:dev` para generar y aplicar la migración inicial que incluya `Organization`/los campos nuevos de `Company`.
- Seed real (`pnpm run db:seed`) contra una base viva.
- La prueba de aislamiento cruzado entre Empresas con datos reales (`docs/23_TESTING_AND_QA_PLAN.md` sección 9, "la prueba más crítica del sistema") — cubierta hoy solo a nivel de guards ya existentes (`CompanyGuard`, ya probado unitariamente desde EWO-002) y de lógica de servicio mockeada, no con Postgres real.
- Arranque real de `apps/api` con `apps/web` contra el flujo completo crear→seleccionar→ver→editar empresa.

**Por qué no se declara `BLOCKED`:** ninguna validación de código (lint, typecheck, pruebas unitarias, pruebas de integración sin DB, build) falló; el bloqueo es exclusivamente de infraestructura del entorno, igual que en EWO-001/EWO-002.

## 8. Deuda no crítica pendiente

- **Migración real y verificación con Docker** — igual que EWO-001/EWO-002, sigue bloqueado por ausencia de Docker en este entorno. Comando exacto pendiente documentado en la sección 14.2.
- ✅ **CERRADO (sección 15):** primer commit de Git creado (`756358d`) con hooks activos, tras autorización explícita. Incluye la corrección del hook `pre-commit` que nunca había funcionado.
- **Organización — administración completa** (editar nombre, eliminar, transferir Company entre Organizaciones, invitar usuarios a nivel Organización) — explícitamente fuera de alcance por la decisión de la sección 3; queda para una Work Order futura si el negocio lo requiere.
- **Activación/baja de Empresa** — explícitamente fuera de alcance por la decisión de la sección 3, **reconfirmada en la sección 13.1** ante una segunda Work Order que volvió a pedirla; requiere que primero se apruebe una regla de negocio (quién puede desactivar, efecto sobre Membership/sesiones activas, reversibilidad) antes de construirse.
- **Transferencia de ownership** — la Work Order pedía explícitamente no implementarla salvo que la documentación ya la exigiera; no la exige (BR-PERM-003 solo cubre la ausencia de permisos técnicos extra de `isOwner`, no un flujo de transferencia). No implementada. La protección contra perder al último propietario (sección 14.1) sí se implementó, por ser un invariante ya aprobado, distinto de un flujo de transferencia.
- **Catálogo oficial de regímenes fiscales SAT** — `CompanyFiscalProfile.taxRegime` es texto libre por diseño (sección 13.1); un catálogo cerrado y validado de regímenes queda para una Work Order fiscal futura.
- **Reactivación de Membership revocada** — ninguna regla de negocio define este flujo (ni `docs/06_SYSTEM_WORKFLOWS.md` ni `docs/04_BUSINESS_RULES.md` lo mencionan); no implementado, consistente con no inventar comportamiento no documentado.

## 9. Inconsistencias documentales encontradas

- ✅ **CERRADO (adenda, mismo día) — BR-EMP-004 no estaba definida.** Ocho referencias en seis documentos (`docs/04_BUSINESS_RULES.md` como dependencia de BR-USR-002, `docs/05_SYSTEM_DOMAIN_MODEL.md`, `docs/06_SYSTEM_WORKFLOWS.md`, `docs/08_API_DESIGN.md` ×2, `docs/09_DATABASE_DESIGN.md`, `docs/11_SECURITY_ARCHITECTURE.md`, `docs/14_INFORMATION_ARCHITECTURE.md`, más `brain/DECISIONS.md` D-002/D-006 y `packages/database/prisma/schema.prisma`) citaban `BR-EMP-004` como regla existente, pero `docs/04_BUSINESS_RULES.md` sección 4.3 solo definía BR-EMP-001 a BR-EMP-003 — confirmado por lectura completa del documento. El comportamiento que esas referencias ya describían de forma consistente entre sí (Rol como atributo de la Membresía, nunca global al usuario; unicidad de la relación usuario-empresa, ya implementada como `@@unique([userId, companyId])` en `Membership` desde EWO-002) quedó formalizado como **BR-EMP-004 — Membresía única por par usuario-empresa, con Rol propio de esa relación** en `docs/04_BUSINESS_RULES.md` sección 4.3, sin modificar comportamiento del sistema ni registrar nueva decisión arquitectónica — es una corrección de trazabilidad documental, pedida explícitamente así por el responsable de producto.
- **Unicidad de `Membership` más estricta que lo descrito.** `docs/09_DATABASE_DESIGN.md` describe la unicidad como "único par activo a la vez" (dando a entender que una fila histórica/inactiva podría coexistir con una nueva), pero el esquema real (desde EWO-002, no modificado en esta Work Order por ser arquitectura ya aprobada) tiene `@@unique([userId, companyId])` incondicional — un flujo futuro de "revocar y reinvitar" al mismo usuario a la misma Empresa chocaría con este constraint. No afecta a EWO-003 (la creación de Empresa no revoca/reinvita), pero queda como riesgo conocido para cuando se trabaje en gestión avanzada de Membership.

## 13. Ampliación de alcance (segunda sesión, mismo día) — perfil fiscal, domicilio, configuración regional

Un texto de Work Order EWO-003 más detallado pidió explícitamente cubrir configuración fiscal, domicilio fiscal y configuración regional (sección 5.7/5.8), además de volver a pedir "estado de empresa" (activar/desactivar, sección 5.6).

### 13.1 Decisión confirmada antes de implementar

**Estado de empresa (activar/desactivar):** se mantuvo la exclusión ya decidida en la sección 3 de este reporte. Se confirmó con el responsable de producto (`AskUserQuestion`) que la documentación aprobada tiene prioridad sobre el prompt: `docs/09_DATABASE_DESIGN.md` sigue marcando la baja de Empresa como "fuera del alcance funcional del MVP"; `docs/13_DESIGN_SYSTEM.md` no tiene patrón de confirmación definido para desactivar una Empresa (solo para "Eliminar Empresa", igualmente fuera de alcance); `docs/15_UX_FLOWS.md` no tiene ningún flujo de cambio de estado de Empresa; `docs/07_SOFTWARE_ARCHITECTURE.md` solo nombra dos eventos de dominio para el contexto Organizations (`EmpresaCreada`, `EjercicioCerrado`), ninguno de cambio de estado. **No se implementó** `ChangeCompanyStatus`, `PATCH /companies/:companyId/status`, `COMPANY_STATUS_CHANGED`, ni la prueba E2E de empresa inhabilitada — se documenta como alcance explícitamente excluido del MVP, no como deuda técnica ni implementación incompleta.

**Perfil fiscal, domicilio y configuración regional:** a diferencia del punto anterior, ningún documento aprobado excluye esto ni lo define — `docs/09_DATABASE_DESIGN.md` no modela ningún campo de negocio de Empresa más allá de `companyId` (confirmado por búsqueda dirigida: cero coincidencias para "CompanyFiscalProfile", "CompanyAddress", "CompanySettings", "régimen fiscal", "domicilio fiscal", "zona horaria", "moneda"). Sin una decisión previa que contradecir, se diseñó esta sub-estructura directamente desde la propia especificación de la Work Order (campos listados en sus secciones 5.7/5.8), tratando `Company` como aggregate root (`docs/07_SOFTWARE_ARCHITECTURE.md` sección 5) con tres sub-recursos 1:1 (`CompanyFiscalProfile`, `CompanyAddress`, `CompanySettings`) que comparten el bloqueo optimista de `Company.version` — nunca un `version` propio por sub-tabla.

### 13.2 Base de datos

- **`Company`**: se agrega `tradeName` (nombre comercial).
- **`CompanyFiscalProfile`** (nuevo, 1:1): `taxRegime` — texto libre/código, sin catálogo de regímenes SAT hardcodeado (CLAUDE.md regla 6: ninguna información fiscal sin validar por el usuario). El código postal fiscal para CFDI se resuelve desde `CompanyAddress.postalCode` — no se duplica.
- **`CompanyAddress`** (nuevo, 1:1): `street`, `exteriorNumber`, `interiorNumber`, `neighborhood`, `municipality`, `state`, `postalCode`, `country` (default `MX`).
- **`CompanySettings`** (nuevo, 1:1): `timeZone` (default `America/Mexico_City`), `baseCurrency` (default `MXN`), `language` (default `es-MX`), `country` (default `MX`) — valores iniciales coherentes con una empresa mexicana, siempre configurables.
- Los tres sub-recursos se crean vacíos/por defecto en la misma transacción que `Company` + Membership owner (`CompaniesRepository.createWithOwnerMembership`) — nunca queda un agregado incompleto.
- `prisma generate` ejecutado y validado; `prisma migrate dev` sigue sin poder ejecutarse (sección 7, sin cambios).
- Semilla actualizada: la "Empresa Demo" recibe un perfil fiscal, domicilio y configuración de ejemplo.

### 13.3 Backend

- `CompaniesRepository.findAggregateById` — consulta el agregado completo (general + fiscal + domicilio + configuración) en una sola llamada; `updateFiscalProfile`/`updateAddress`/`updateSettings` — cada uno incrementa `Company.version` y actualiza el sub-recurso en la misma transacción (bloqueo optimista a nivel de aggregate root, nunca por sub-tabla).
- `CompaniesService`: `getCompany` ahora devuelve el agregado completo; `updateFiscalProfile`/`updateAddress`/`updateSettings` con auditoría antes/después.
- `CompaniesController`: `PATCH /companies/:companyId/fiscal-profile`, `PATCH /companies/:companyId/address` (ambos con `@Permissions('company.fiscal.update')` — domicilio fiscal se agrupa bajo el mismo permiso que perfil fiscal, sección 5.7 de la Work Order los lista juntos), `PATCH /companies/:companyId/settings` (`@Permissions('company.settings.update')`).
- Permisos nuevos en el catálogo (`seed.ts`): `company.fiscal.update`, `company.settings.update` — ambos otorgados únicamente a `ADMINISTRADOR` (BR-CFG-001), sin duplicar `company.update` existente.
- Eventos y auditoría: `CompanyFiscalProfileUpdatedEvent`, `CompanyAddressUpdatedEvent`, `CompanySettingsUpdatedEvent` con `beforeState`/`afterState`, cada uno con su `@OnEvent` en `AuditService` (acciones `companies.fiscal_profile_updated`, `companies.address_updated`, `companies.settings_updated`).
- **`COMPANY_VIEWED` no implementado** — ninguna política aprobada exige auditar lecturas (ninguna consulta se audita hoy en el resto del sistema), consistente con la condición que la propia Work Order puso ("solo si la política aprobada exige auditar lecturas").
- **`ACTIVE_COMPANY_CHANGED` no implementado como evento de servidor** — `docs/08_API_DESIGN.md` sección 5 y el reporte de EWO-002 (sección 12.1) ya establecen que cambiar de empresa activa es responsabilidad exclusiva del cliente, sin operación de API ni estado de servidor que auditar.

### 13.4 Frontend

- `packages/types/src/companies.ts`: `CompanyFiscalProfile`, `CompanyAddress`, `CompanySettings`, `tradeName` en `CompanySummary`/`CompanyDetail`/`Create`/`UpdateCompanyInput`, más los `Update*Input` de los tres sub-recursos.
- `lib/companies-client.ts` + 3 hooks nuevos: `use-update-fiscal-profile`, `use-update-address`, `use-update-settings`.
- `/empresas/[companyId]` reestructurado en 4 secciones con pestañas (General, Fiscal, Domicilio, Configuración — EWO-003 sección 11), cada una con su propio formulario/edición independiente, gate de edición por Rol Administrador (nunca por `isOwner`, BR-PERM-003) y estados de error distinguidos (`AUTHORIZATION_ERROR` vs `NOT_FOUND` vs genérico).
- `/seleccionar-empresa`: se agrega indicador visual de "Empresa activa" en la tarjeta correspondiente (EWO-003 sección 11: "identificar la empresa activa").

### 13.5 Pruebas y validaciones

- 6 pruebas unitarias nuevas en `companies.service.spec.ts` (`getCompany` con agregado completo, `updateFiscalProfile`/`updateAddress`/`updateSettings`, incluyendo conflicto de versión y Company inexistente) — 14/14 en el archivo, 85/85 en `apps/api`.
- 3 pruebas E2E nuevas de contrato HTTP (401 sin sesión) para los 3 endpoints nuevos — 20/20 en `apps/api`.
- `pnpm run lint`, `pnpm run typecheck`, `pnpm run test:unit`, `pnpm run test:integration`, `pnpm run build` — los 5 en verde de punta a punta en todo el monorepo, re-ejecutados después de cada cambio de esta sección.
- Verificación manual en navegador (backend apagado): `/empresas/[companyId]` renderiza el estado de error correctamente (sin backend disponible) sin excepciones no controladas. La verificación visual de las 4 pestañas con datos reales poblados **no pudo completarse en este entorno de vista previa**: al interceptar `fetch` con una respuesta simulada, TanStack Query permaneció en `fetchStatus: 'paused'` (el mismo comportamiento de su `onlineManager` ya documentado en la sección 6, específico de este entorno de vista previa, no reproducido con Postgres/backend real) incluso tras forzar eventos `online`/`offline` y `refetch()` manual — confirmado que el mock de red respondía correctamente (200, cuerpo válido) al invocarlo directamente desde la consola del navegador. Las 4 secciones quedan cubiertas por revisión de código y por las pruebas unitarias del servicio que producen exactamente la forma de datos que estas pantallas consumen.

## 14. Cierre técnico de EWO-003 (tercera sesión, mismo día)

Revisión de cierre solicitada explícitamente como Tech Lead, antes de avanzar a EWO-004. No se encontró ningún archivo ni observación de "Codex" en el repositorio (búsqueda exhaustiva, sin resultados) — la revisión se hizo desde cero contra el código y la documentación reales.

### 14.1 Hallazgos y correcciones

- **`GET /companies/:companyId/memberships` (API-0016) nunca se había implementado** — confirmado por inspección directa de `MembershipsController` (EWO-002 solo dejó invitar/aceptar/rechazar/cambiar-rol/revocar). Se agregó: `MembershipsRepository.findAllForCompany` (historial completo, activas y revocadas, BR-USR-003), `MembershipsService.listMembersForCompany` (forma segura: sin `passwordHash` ni otros campos internos de `User`), y la ruta con `AuthenticationGuard`+`CompanyGuard`+`RoleGuard`+`@Roles(ADMINISTRADOR, SUPERVISOR)` — el mismo par de roles que documenta API-0016, usando el guard de Rol ya existente en vez de inventar un permiso granular nuevo.
- **Sin protección contra revocar al último propietario activo de una Empresa.** BR-EMP-001 dice "toda empresa tiene al menos un Administrador propietario **desde su creación**" — una redacción de invariante permanente, no solo de un chequeo al momento de crear. `MembershipsService.revoke()` no lo validaba: revocar la única Membership con `isOwner=true` de una Empresa la habría dejado sin propietario activo. Se agregó `MembershipsRepository.countActiveOwners(companyId)` y una validación en `revoke()`: si la Membership objetivo es propietaria y es la única activa, se rechaza con una excepción nueva (`LastOwnerException`, 409 `CONFLICT`). Se clasifica como corrección de implementación de un invariante ya aprobado (BR-EMP-001), no como una decisión arquitectónica nueva — no se inventó ninguna regla de transferencia de ownership (eso sigue fuera de alcance, sección 8).
- **`AUTH_EVENTS.PERMISSION_CHANGED` era código muerto desde EWO-002** — declarado pero nunca emitido (ningún `events.emit` lo referenciaba), sin clase de evento propia y sin consumidor en `AuditService`. Confirmado por grep exhaustivo contra los otros 19 eventos declarados, todos los cuales sí tienen emisor y consumidor. No existe ningún endpoint que edite `RolePermission` en tiempo de ejecución (el catálogo es solo de semilla), así que no había nada legítimo que conectar — se eliminó la constante.
- **Revisado y sin hallazgos adicionales:** payloads de eventos consistentes entre emisor y consumidor (mismos nombres de campo); sin duplicación de registros de auditoría; sin dependencias circulares (`AppModule` arranca correctamente en las 21 pruebas E2E); sin imports/tipos rotos (`pnpm run typecheck` en verde en los 9 paquetes); sin acciones sensibles sin trazabilidad (creación/actualización de Company, Organization, Membership, perfil fiscal, domicilio y configuración auditadas; revocación y cambio de rol de Membership también).

### 14.2 Persistencia y Prisma

- `prisma format` ejecutado — sin cambios de contenido, solo alineación de espacios en el modelo `Company` (arrastrada de ediciones manuales de sesiones previas).
- `prisma validate` ejecutado — **"The schema... is valid"**.
- `prisma generate` re-ejecutado tras el formateo — cliente regenerado sin errores.
- **Docker reconfirmado no disponible** en este entorno (`docker`, `docker compose` — comando no encontrado). Por lo tanto, siguiendo exactamente el procedimiento que esta misma Work Order especifica para ese caso (sección 11): no se simuló ninguna migración, no se declaró como completada, se validó el esquema y se generó Prisma Client (ambos arriba). **No existe ninguna carpeta `migrations/` en el repositorio** — ninguna Work Order (EWO-001 a EWO-003) ha generado jamás una migración real; el esquema completo evolucionó sin una sola migración versionada.
- **Comando exacto pendiente**, a ejecutar en cuanto haya Docker disponible:
  ```
  docker compose up -d postgres redis
  pnpm --filter @contaia/database run migrate:dev -- --name init
  pnpm run db:seed
  ```
  Esto generará la primera migración real (llamada `init`, dado que sería la primera) reflejando el estado acumulado de EWO-001 a EWO-003, y aplicará el seed sobre una base de datos real.

### 14.3 Validación técnica completa

| Comando                                                                                     | Resultado                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm --filter api run typecheck` (tras las 3 correcciones)                                 | ✅ OK                                                                                                                                                                                                                                                                                                                          |
| `pnpm --filter api run lint` (tras las 3 correcciones)                                      | ✅ OK, 0 errores/warnings                                                                                                                                                                                                                                                                                                      |
| `pnpm --filter api run test:unit -- memberships`                                            | ✅ OK — 14/14 (7 nuevas: 3 de `revoke`/último-propietario, 1 de `listMembersForCompany`, más las 10 preexistentes de invitación/rol)                                                                                                                                                                                           |
| `pnpm run check` (raíz: lint → typecheck → test → test:integration → build, los 9 paquetes) | ✅ **OK de punta a punta** — `apps/api`: 89/89 unitarias, 21/21 integración (incluye la nueva ruta `GET .../memberships`); `apps/web`: 6/6; `packages/database` integración: 2 omitidas (Postgres no disponible, motivo impreso, no cuenta como fallo); build de `apps/web` (16 rutas) y `apps/api` (`nest build`) sin errores |

No se usó `any`, `@ts-ignore`, desactivación global de ESLint, mocks sin comportamiento, pruebas vacías ni exclusiones arbitrarias en ninguna de las correcciones de esta sesión.

### 14.4 Revisión de Git

`git status`/`git diff` confirman: **el repositorio no tiene ningún commit todavía** — ni de EWO-001, ni de EWO-002, ni de esta Work Order; los 321 archivos que `git add -A` incluiría son 100% del árbol de trabajo actual. Revisado explícitamente:

- `.env` y `apps/web/.env.local` están correctamente ignorados (`.gitignore`) — no se incluirían.
- `.env.example` sí se incluiría — inspeccionado línea por línea: contiene únicamente valores de ejemplo explícitamente marcados como no reales (`dev_only_change_me_...`, contraseñas de desarrollo), consistente con su propio comentario de cabecera.
- `node_modules/`, `dist/`, `.next/`, `generated/`, `coverage/`, `.turbo/` están todos cubiertos por `.gitignore` — no aparecen en `git add -A --dry-run`.
- Ningún archivo `.pem`, credencial, token o log aparece en el árbol.

**No se ejecutó `git commit`** — por instrucción explícita de no hacer `push` ni abrir PR, y porque crear el primer commit del repositorio es una acción que debe confirmarse explícitamente, no asumirse. Commit recomendado, listo para ejecutar:

```
git add .
git commit -m "feat: implement ContaIA foundation, authentication, and company/organization management (EWO-001–EWO-003)"
```

Nota sobre el mensaje sugerido en la sección 15 de la Work Order ("feat: complete company and organization management"): dado que este sería el **primer commit del repositorio completo** (no hay historia previa que separar), ese mensaje describiría solo una fracción de lo que el commit realmente contiene (fundación técnica + autenticación completa + gestión de empresas). Se recomienda el mensaje de arriba por precisión; si se prefiere mantener el mensaje original de la Work Order, también es válido — es una preferencia de estilo, no una corrección técnica.

## 10. Evaluación de preparación para el siguiente EWO

- ✅ El flujo de autoservicio "crear mi empresa" que EWO-002 dejó pendiente (sección 8 de `EWO-002_AUTH_REPORT.md`) está cerrado.
- ✅ Cualquier módulo de negocio futuro (CFDI, Contabilidad) puede depender de `Company`/`Organization` completos sin reestructurar el modelo de datos.
- ⚠️ Recomendado: generar y aplicar la primera migración real (`prisma migrate dev`) en cuanto haya un entorno con Docker — hoy el esquema evolucionó cuatro Work Orders (EWO-001 a EWO-003) sin una sola migración versionada.
- ⚠️ Recomendado: correr la prueba de aislamiento cruzado entre Empresas con Postgres real antes de considerar este módulo "listo para producción" en el sentido estricto de `docs/23_TESTING_AND_QA_PLAN.md` sección 9.

## 11. Archivos creados o modificados

**Base de datos:** `packages/database/prisma/schema.prisma` (`Organization`, `Company` con `tradeName`/`businessActivity`/`version`, `CompanyFiscalProfile`, `CompanyAddress`, `CompanySettings` — estos últimos cuatro agregados en la sección 13); `packages/database/prisma/seed.ts`; `packages/database/src/prisma-types.ts`.

**Backend:** `apps/api/src/modules/organizations/**` (nuevo); `apps/api/src/modules/companies/companies.controller.ts` (nuevo), `companies.service.ts` (nuevo, +spec), `companies.module.ts`, `dto/create-company.dto.ts`/`dto/update-company.dto.ts`/`dto/update-fiscal-profile.dto.ts` (nuevo)/`dto/update-address.dto.ts` (nuevo)/`dto/update-settings.dto.ts` (nuevo), `repositories/companies.repository.ts`; `apps/api/src/common/events/auth.events.ts`; `apps/api/src/common/exceptions/auth.exceptions.ts`; `apps/api/src/modules/audit/audit.service.ts`; `apps/api/src/app.module.ts`; `apps/api/test/companies.e2e-spec.ts` (nuevo, ampliado en la sección 13).

**Frontend:** `packages/types/src/companies.ts` (nuevo, ampliado en la sección 13); `apps/web/src/lib/companies-client.ts` (nuevo, ampliado); `apps/web/src/hooks/use-companies.ts`/`use-company.ts`/`use-create-company.ts`/`use-update-company.ts`/`use-update-fiscal-profile.ts` (nuevo)/`use-update-address.ts` (nuevo)/`use-update-settings.ts` (nuevo); `apps/web/src/app/crear-empresa/**` (nuevo); `apps/web/src/app/empresas/**` (nuevo, `[companyId]/` reestructurado en 4 secciones en la sección 13: `company-general-section.tsx`, `company-fiscal-section.tsx`, `company-address-section.tsx`, `company-settings-section.tsx`); `apps/web/src/app/seleccionar-empresa/company-selector.tsx` (indicador de empresa activa agregado en la sección 13).

**Infraestructura de desarrollo:** `.claude/launch.json` (nuevo, en la raíz de `contai/` — permite levantar `apps/web` con el navegador de vista previa; no existía ningún launch config en el repositorio). `scripts/lint-staged-eslint.mjs` (nuevo, sección 15.2 — corrige el hook `pre-commit` que nunca había funcionado); `package.json` (`lint-staged` reconfigurado).

**Backend (cierre, sección 14):** `apps/api/src/modules/roles-permissions/repositories/memberships.repository.ts` (`findAllForCompany`, `countActiveOwners`); `apps/api/src/modules/roles-permissions/services/memberships.service.ts` (`listMembersForCompany`, protección de último propietario en `revoke`, +spec); `apps/api/src/modules/roles-permissions/memberships.controller.ts` (`GET companies/:companyId/memberships`); `apps/api/src/common/exceptions/auth.exceptions.ts` (`LastOwnerException`); `apps/api/src/common/events/auth.events.ts` (`PERMISSION_CHANGED` eliminado); `apps/api/test/auth.e2e-spec.ts` (prueba nueva).

**Documentación:** este reporte; `MASTER_CONTEXT.md` (sección de historial de cambios).

## 15. Primer commit de Git y estado formal BLOCKED (cuarta sesión, mismo día)

El responsable de producto autorizó explícitamente crear el primer commit del repositorio, condicionado a reconfirmar antes que el árbol de trabajo estuviera en un estado válido y seguro. Secuencia ejecutada:

### 15.1 Reconfirmación previa

- `git status` — rama `master`, **sin ningún commit** todavía; 321 archivos sin seguimiento (todo el árbol).
- `git diff` — vacío por definición (no hay `HEAD` contra el cual comparar).
- `pnpm run check` — verde de punta a punta (lint 12/12, typecheck 12/12, unit 89/89 en `apps/api`, integración 21/21 en `apps/api` + 2 omitidas en `packages/database` por falta de Postgres, build 7/7).
- `prisma validate` — "The schema is valid"; `prisma generate` — cliente generado sin errores.
- **Revisión de secretos** — `.env` y `apps/web/.env.local` correctamente ignorados (probado con `git check-ignore -v`); el único archivo de entorno preparado es `.env.example`, con solo valores de ejemplo (`dev_only_change_me_...`); ningún `node_modules/`, `dist/`, `.next/`, `generated/`, `coverage/`, log, `.pem`, `.key`, token ni credencial aparece en el conjunto preparado (321 archivos).

### 15.2 Defecto pre-existente descubierto y corregido: el hook `pre-commit` nunca había funcionado

Al intentar el commit, el hook `pre-commit` (Husky → `pnpm exec lint-staged`) falló. Causa raíz: la configuración de `lint-staged` en `package.json` invocaba `eslint --fix` **desde la raíz** del monorepo, pero:

1. `eslint` no es una dependencia de la raíz — no se resuelve desde `./node_modules/.bin` (`Command "eslint" not found`).
2. No existe ningún `eslint.config.*` en la raíz — cada paquete tiene el suyo, y ESLint v9 (flat config) resuelve la configuración desde el `cwd`, no desde la ubicación del archivo.

Este hook nunca había funcionado (los cero commits del repo lo confirman). Corrección **de raíz, sin `--no-verify`**:

- Nuevo `scripts/lint-staged-eslint.mjs`: agrupa los archivos preparados por workspace y corre `pnpm --filter "./<workspace>" exec eslint --fix --no-warn-ignored` en cada grupo (así cada archivo se valida con la configuración plana de su propio paquete). Omite los workspaces sin `eslint.config.*` (`packages/eslint-config`, `packages/typescript-config`, que no se lintean en ninguna parte) y procesa en lotes para no exceder el límite de longitud de línea de comandos de Windows en un commit grande.
- `package.json` (`lint-staged`): se reemplaza `eslint --fix` de raíz por `node scripts/lint-staged-eslint.mjs`, y se corrige además un solapamiento de globs que causaba una condición de carrera (los mismos archivos `.ts/.js` los tocaban dos entradas concurrentes) — ahora eslint y prettier corren en serie sobre el mismo glob.

Ambos cambios forman parte del commit `756358d`. Con el hook corregido, `lint-staged` corrió ESLint por-workspace y Prettier sobre los archivos preparados; Prettier reformateó parte del árbol (tablas Markdown, formato de código) y re-preparó los archivos — comportamiento esperado del hook.

### 15.3 Commit creado

| Campo     | Valor                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Hash      | `756358df9893f3947fbc769935c071aabee20ef0` (`756358d`)                                                                         |
| Rama      | `master`                                                                                                                       |
| Mensaje   | `feat: establish ContaIA foundation and company management` (+ cuerpo y `Co-Authored-By`)                                      |
| Archivos  | 322 archivos, 41 008 inserciones                                                                                               |
| Hooks     | `pre-commit` (lint-staged) y `commit-msg` (commitlint, Conventional Commits) — **ambos activos y en verde**, sin `--no-verify` |
| Push / PR | **Ninguno** — no se hizo push, no se abrió PR, no se reescribió historia, no se crearon ramas                                  |

Nota: en un primer intento el mensaje de commit se rechazó por `commit-msg` (commitlint) debido a un error de sintaxis del propio comando (se uso sintaxis de here-string de PowerShell en un shell Bash); corregido con un heredoc válido, el segundo intento paso commitlint sin cambios de contenido.

Tras el commit se re-ejecutó `pnpm run check` sobre el estado ya comiteado (reformateado por Prettier) — **verde de punta a punta** (89/89 unit, 21/21 integración, build 7/7, exit 0), confirmando que el reformateo del hook no rompió nada.

### 15.4 Estado formal y único bloqueo restante

**EWO-003: `BLOCKED`.** Código completo, todas las validaciones en verde, primer commit creado. El único criterio de cierre pendiente es la **migración inicial real de Prisma**, que requiere Docker/PostgreSQL — no disponible en este entorno (reconfirmado: `docker` / `docker compose` no encontrados). No se declara `DONE` hasta que esa migración se genere, aplique y verifique. Comando exacto pendiente (sección 14.2):

```
docker compose up -d postgres redis
pnpm --filter @contaia/database run migrate:dev -- --name init
pnpm run db:seed
```

**EWO-004 no se inició.**

## 12. Resultado final

**BLOCKED**

Justificación: todas las validaciones ejecutables sobre el código en este entorno (lint, typecheck, pruebas unitarias — 89/89 en `apps/api` —, pruebas de integración — 21/21 sin Postgres real —, build, `prisma format`/`validate`/`generate`) pasan en verde de punta a punta, incluyendo Organización, Companies completo, perfil fiscal/domicilio/configuración regional, y las tres correcciones de cierre de la sección 14 (consulta de miembros, protección de último propietario, limpieza de evento muerto). El **primer commit de Git ya se creó** (`756358d`, sección 15), lo que resuelve uno de los dos pendientes que antes mantenían el estado en `IN PROGRESS`. Siguiendo el criterio explícito de esta Work Order (sección 18: "si algún criterio no puede completarse por una limitación real del entorno... déjalo como `BLOCKED`"), se declara **`BLOCKED`** porque queda un único criterio de cierre sin completar — la migración inicial real de Prisma — bloqueado exclusivamente por la ausencia de Docker/PostgreSQL en este entorno, no por ningún defecto del código; su procedimiento y comando exactos están documentados (secciones 14.2 y 15.4), listos para ejecutarse en cuanto haya Docker. "Estado de empresa" (activar/desactivar) permanece explícitamente fuera de alcance, reconfirmado dos veces con el responsable de producto (secciones 3 y 13.1) — no es un pendiente, es alcance excluido. **EWO-004 no se inició.**

---

## Observaciones del Arquitecto

**Decisiones tomadas:**

- Organización implementada en alcance mínimo (modelo + 2 endpoints documentados), confirmado con el responsable de producto antes de tocar el esquema.
- Activación/baja de Empresa omitida por falta de regla de negocio aprobada; `CompanyStatus`/`deletedAt` quedan reservados en el esquema sin exponerse.
- `Company.version` agregado (no solicitado explícitamente en el texto de la Work Order) porque `docs/08_API_DESIGN.md` API-0014 ya exige `PATCH /companies/:id` idempotente vía `If-Match`, y no puede implementarse ese contrato ya aprobado sin un campo de versión — es la implementación necesaria de un contrato de API existente, no una decisión nueva.
- `role`/`isOwner` de la Membership resuelta por `CompanyGuard` se devuelven en las respuestas de `GET`/`PATCH /companies/:companyId` (no solicitado explícitamente) para que el frontend pueda decidir si mostrar la acción "Editar" sin una segunda solicitud — cambio menor, reversible, y consistente con datos que el propio guard ya resuelve por cada solicitud.
- (Sección 13) Activación/baja de Empresa reconfirmada como excluida — segunda vez que se pide y segunda vez que se decide, junto con el responsable de producto, mantener la exclusión por falta de regla de negocio aprobada y ausencia total de patrón UX/evento de dominio documentado.
- (Sección 13) Perfil fiscal, domicilio y configuración regional diseñados como tres sub-recursos 1:1 del aggregate root `Company` (nunca entidades independientes con su propio bloqueo optimista) — decisión de diseño propia, sin documentación previa que contradecir, siguiendo `docs/07_SOFTWARE_ARCHITECTURE.md` sección 5.
- (Sección 13) `taxRegime` implementado como texto libre, sin catálogo de regímenes SAT — evita fabricar un catálogo fiscal no validado por el usuario (CLAUDE.md regla 6).
- (Sección 13) Domicilio fiscal agrupado bajo el mismo permiso `company.fiscal.update` que el perfil fiscal (la Work Order no nombra un permiso de domicilio separado y los agrupa en su propia sección 5.7) — evita duplicar un permiso equivalente, per la instrucción explícita de la Work Order.
- (Sección 14) Protección de último propietario agregada a `revoke()` como corrección de un invariante ya aprobado (BR-EMP-001), no como decisión nueva — se basó en la lectura literal de "toda empresa tiene al menos un Administrador propietario" como invariante permanente, no solo de creación.
- (Sección 14) `GET /companies/:companyId/memberships` autorizado con `RoleGuard`+`@Roles(ADMINISTRADOR, SUPERVISOR)` en vez de un permiso granular — porque `docs/08_API_DESIGN.md` API-0016 documenta el actor exacto como "Administrador, Supervisor", no un permiso nombrado.
- (Sección 14) `AUTH_EVENTS.PERMISSION_CHANGED` eliminado por ser código muerto verificado (sin emisor, sin clase de evento, sin consumidor, sin endpoint que lo justifique) — no una decisión, una limpieza.

**Riesgos detectados:**

- Sin migración real generada todavía (ningún EWO hasta ahora la ha creado) — riesgo de que el primer `prisma migrate dev` real, cuando haya Docker, deba reconciliar cuatro Work Orders de cambios de esquema de una sola vez, ahora con 3 tablas adicionales (sección 13).
- Unicidad incondicional de `Membership` (sección 9) — riesgo conocido para un futuro flujo de revocar-y-reinvitar, no para esta Work Order.
- ✅ **CERRADO (adenda, mismo día):** BR-EMP-004 sin definir — ver sección 9.
- (Sección 13) Verificación visual en navegador de las 4 pestañas del perfil de Empresa con datos reales poblados no pudo completarse por un comportamiento del `onlineManager` de TanStack Query específico de este entorno de vista previa — mitigado con pruebas unitarias que cubren la forma de datos exacta que consumen esas pantallas; recomendable repetir la verificación visual en un entorno con backend/Postgres reales.
- ✅ **CERRADO (sección 15):** repositorio sin ningún commit — resuelto con el primer commit `756358d`. Se descubrió y corrigió de paso que el hook `pre-commit` (lint-staged) nunca había funcionado (invocaba `eslint` desde la raíz, donde no se resuelve).

**Mejoras futuras recomendadas:**

- ✅ **CERRADO (adenda, mismo día):** cerrar el hueco de BR-EMP-004 en `docs/04_BUSINESS_RULES.md`.
- Definir una regla de negocio explícita para activación/baja de Empresa si el producto la necesita, antes de construirla — pedida dos veces ya en Work Orders de EWO-003, señal de que probablemente sea prioritaria para una Work Order futura dedicada.
- Generar la primera migración Prisma real en cuanto haya un entorno con Docker disponible (comando exacto en sección 14.2).
- Ejecutar el primer commit de Git en cuanto se confirme explícitamente (comando exacto en sección 14.4).
- (Sección 13) Evaluar un catálogo oficial de regímenes fiscales SAT cuando se aborde el módulo fiscal/CFDI real.
- (Sección 14) Definir si se necesita un flujo de reactivación de Membership revocada — no documentado hoy, no implementado.

**Documentos que podrían necesitar actualización:**

- ✅ **CERRADO (adenda, mismo día):** `docs/04_BUSINESS_RULES.md` (BR-EMP-004 faltante) — ver sección 9.
- `docs/19_FRONTEND_IMPLEMENTATION_PLAN.md`/`docs/20_BACKEND_IMPLEMENTATION_PLAN.md` podrían anotar que el módulo Companies (Fase 2) ya está implementado, para mantener el roadmap sincronizado con el estado real del código.
- `docs/09_DATABASE_DESIGN.md` podría documentar `CompanyFiscalProfile`/`CompanyAddress`/`CompanySettings` a nivel lógico, ya que hoy no modela ningún campo de negocio de Empresa más allá de `companyId` (sección 13.1).
- `docs/04_BUSINESS_RULES.md` podría formalizar explícitamente el invariante "toda Empresa conserva al menos un propietario activo" como su propia regla (hoy se infiere de BR-EMP-001, que solo habla de creación) — solo si el producto quiere hacerlo explícito; el comportamiento ya está implementado (sección 14.1).
