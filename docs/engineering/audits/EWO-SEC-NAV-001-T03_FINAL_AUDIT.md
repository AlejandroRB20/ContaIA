# EWO-SEC-NAV-001 — T03: Auditoría final independiente

## 1. Control del documento

| Campo             | Valor                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Work Order        | `EWO-SEC-NAV-001 — Tenant Isolation & Navigation Contracts`                                        |
| Tarea             | `T03 — Permisos de Auditor y Supervisor (`cfdi.read`, `document.download`)`                        |
| Decisión auditada | `D-011 — Permisos de lectura de CFDI para Auditor y Supervisor; separación de `document.download`` |
| Fecha             | 2026-08-06                                                                                         |
| Auditor           | Antigravity-01 (misión `CONTAIA-EWO-SEC-NAV-001-T03-FINAL-AUDIT`)                                  |
| Tipo              | Auditoría final independiente `READ ONLY`                                                          |
| Snapshot auditado | `feature/frontend-ux-audit`, árbol de trabajo actual (no commiteado)                               |
| Veredicto         | **REQUIERE CAMBIOS**                                                                               |

## 2. Work Order y tarea

`T03` implementa el contrato vinculante de `D-011` (`brain/DECISIONS.md`): concede `cfdi.read` a Auditor y Supervisor en modo estrictamente lectura, y resuelve `document.download` como clave independiente de descarga de binario para Administrador, Contador, Auxiliar, Supervisor y Auditor. La tarea se ejecutó en tres turnos documentados por el propio plan de la EWO: implementación parcial (2026-08-04, §19), resolución de `document.download` (2026-08-05, §20) y ratificación arquitectónica + cierre documental (2026-08-06, §21).

## 3. Snapshot

El repositorio no está limpio: la implementación completa de `T01`–`T04` vive en el árbol de trabajo sin commitear sobre `feature/frontend-ux-audit`. `packages/database/prisma/permissions-catalog.ts` y `packages/database/src/permissions-catalog.test.ts` son archivos nuevos sin trackear (`??`); `packages/database/prisma/seed.ts` está modificado (`M`, 82 líneas eliminadas / 2 insertadas — las declaraciones locales del catálogo se movieron al nuevo módulo). `schema.prisma` no tiene diferencia alguna y no existen migraciones nuevas.

## 4. Auditor

Antigravity-01. No participé en la implementación de `T01`–`T06` de `EWO-SEC-NAV-001`. Mi única intervención previa en este repositorio relacionada con la familia de tareas de esta EWO fue una preauditoría independiente y estrictamente de lectura de `T04`/`D-012` (misión distinta, sin relación con `T03`/`D-011`, sin producir artefacto de auditoría) y la corrección de la observación `T02-OBS-01` (prueba directa del botón "Cambiar empresa" en `AppShell`, sin relación con permisos CFDI). Ninguna de las dos actividades toca el catálogo de permisos, `seed.ts` ni la documentación auditada aquí.

## 5. READ ONLY

Esta auditoría no modificó `permissions-catalog.ts`, `seed.ts`, `permissions-catalog.test.ts`, ningún archivo de `docs/`, `brain/` ni código de `apps/api`/`apps/web`. El único archivo escrito por esta misión es el presente artefacto. No se ejecutó `git add`, `git commit` ni `git push`. No se ejecutó `pnpm run seed` contra ninguna base de datos.

## 6. Alcance

Verificación independiente de:

- El catálogo de permisos (`permissions-catalog.ts`, consumido por `seed.ts`) contra el contrato vinculante de `D-011`.
- La matriz canónica `BR-PERM-004` (`docs/04_BUSINESS_RULES.md`) y su sincronización con el catálogo, `docs/08`, `docs/11`, `docs/15`, `docs/16`, `docs/31`, `docs/32`.
- Las 22 pruebas de `permissions-catalog.test.ts`, ejecutadas de forma independiente.
- El aislamiento del delta de `T03` frente a `T01`, `T02`, `T04` y `D-010`/`D-012`.
- Los guards de resolución de permisos (`PermissionGuard`, `RolesRepository`), únicamente para confirmar que el catálogo es utilizable sin lista fija en código.
- Validaciones estáticas: pruebas dirigidas, `tsc --noEmit`, ESLint acotado, `git diff --check`.

## 7. Fuera de alcance

- `T01`, `T02`, `T04` y sus decisiones (`D-010`, `D-012`) — no se tocaron ni se re-auditaron.
- Implementación de `API-0026`/`API-0027`/`API-0028` — no existen controladores; no corresponde a `T03` construirlos.
- `T05` (sincronización documental general) y `T06` (auditoría final de la EWO completa).
- Corrección de hallazgos: esta auditoría es `READ ONLY` y no aplica ninguna corrección, aunque encuentre defectos.
- Reseed de bases de datos reales.

## 8. Evidencia inspeccionada

- `brain/DECISIONS.md` — `D-011` completa (Contexto, Problema, Alternativas, Análisis, Decisión, Contrato vinculante, Distinción normativa de recursos, Impacto, Riesgos, Validación, Estado, Historial) y `D-010`/`D-012` (para confirmar que no fueron alteradas).
- `brain/DECISION_INDEX.md` — fila `D-011`.
- `docs/04_BUSINESS_RULES.md` — `BR-PERM-001`, `BR-PERM-004`, matriz base §5.1.
- `docs/08_API_DESIGN.md` — `API-0023` a `API-0028`, notas `*`/`†`.
- `docs/11_SECURITY_ARCHITECTURE.md` — §9 (matriz gruesa `L`/nota de subordinación a `BR-PERM-004`) y clasificación de Documentos XML.
- `docs/15_UX_FLOWS.md` — `UXF-0011`.
- `docs/16_WIREFRAMES_SPECIFICATION.md` — `WF-0012`, `WF-0013`, `WF-0015`, `WF-0016`, `WF-0017`, y el catálogo completo de wireframes (§54).
- `docs/31_MASTER_SCREEN_MAP.md` — `PAGE-0019` a `PAGE-0023`.
- `docs/32_MASTER_NAVIGATION_ARCHITECTURE.md` — línea 246 (matriz de roles).
- `packages/database/prisma/permissions-catalog.ts`, `packages/database/prisma/seed.ts`, `packages/database/src/permissions-catalog.test.ts`.
- `packages/database/prisma/schema.prisma` — `enum RoleName`.
- `apps/api/src/common/guards/permission.guard.ts`, `apps/api/src/modules/roles-permissions/repositories/roles.repository.ts`.
- `docs/engineering/EWO-SEC-NAV-001_TENANT_ISOLATION_PLAN.md` §14–21 (reportes de `T01`, corrección de `T01`, `T02`, `T04`, y los tres turnos de `T03`).
- `AI_CONTEXT.md`, `CHANGELOG.md` (entradas del 2026-08-04 al 2026-08-06).
- `git status`, `git diff --stat`, `git diff --check` sobre el árbol de trabajo completo y acotado a los archivos de `T03`.

## 9. Catálogo

Verificación punto por punto de la Tarea 2 del encargo:

1. **Claves únicas** — confirmado por prueba (`no existen claves de permiso duplicadas en el catalogo`) y por inspección manual de las 20 entradas de `PERMISSION_CATALOG`: sin duplicados.
2. **Descripciones correctas** — `cfdi.read`: "Consultar datos extraídos del CFDI"; `document.download`: "Descargar el archivo original o el XML del CFDI (binario almacenado)". Ambas coinciden con el alcance del contrato vinculante de `D-011` (puntos 6 y 10).
3. **Asignación por los seis roles** — `ADMINISTRADOR` recibe todo el catálogo vía `PERMISSION_CATALOG.map((p) => p.key)`; `CONTADOR`, `AUXILIAR`, `SUPERVISOR`, `AUDITOR` tienen listas explícitas; `ESTUDIANTE` no tiene entrada en `ROLE_PERMISSIONS` (sandbox, sin permisos reales, conforme a `docs/11` §9 y el comentario del propio archivo).
4. **Ausencia de roles inventados** — `enum RoleName` en `schema.prisma` define exactamente seis roles; `Object.keys(ROLE_PERMISSIONS)` no contiene ninguna clave fuera de ese enum (prueba: "los unicos roles con permisos son los seis roles oficiales").
5. **Ausencia de privilegios implícitos para Platform Admin** — `isPlatformAdmin` no es un valor de `RoleName`; no puede aparecer en `ROLE_PERMISSIONS` por construcción del tipo. `PermissionGuard` (línea 14-19 de su comentario) documenta explícitamente que no repite ninguna decisión de bypass — `CompanyGuard` ya deniega antes a un Administrador de plataforma sin `Membership`. Los guards `company.guard.ts`, `ownership.guard.ts`, `role.guard.ts` tienen pruebas dedicadas ("D-010: rechaza a un Administrador de plataforma sin contexto de Membership, aunque `isPlatformAdmin` sea `true`") que confirman ausencia de herencia implícita.
6. **Separación entre `document.read`, `document.download` y `cfdi.read`** — tres claves en dos módulos distintos (`document`, `cfdi`); prueba dedicada confirma que son "permisos distintos" y que `cfdi.read` "no implica descarga de binario".
7. **Ausencia de permisos CFDI de escritura no aprobados** — el módulo `cfdi` del catálogo contiene exactamente `cfdi.generate`, `cfdi.cancel`, `cfdi.read` (prueba: `cfdiKeys.sort()).toEqual(['cfdi.cancel', 'cfdi.generate', 'cfdi.read'])`) — ningún permiso de modificación o eliminación, conforme al contrato vinculante punto 8 (`BR-INT-002`, CFDI inmutable).
8. **Idempotencia del seed** — `seedRolesAndPermissions` usa `upsert` para `Role`, `Permission` y `RolePermission` (líneas 70, 80, 99 de `seed.ts`), con claves naturales (`name`, `key`, `roleId_permissionId`) — reejecutar el seed no duplica filas.
9. **Fuente única del catálogo** — `permissions-catalog.ts` es la única declaración de `PERMISSION_CATALOG`/`ROLE_PERMISSIONS`; `seed.ts` los importa (`import { PERMISSION_CATALOG, ROLE_PERMISSIONS } from './permissions-catalog.js'`) y el test los importa del mismo módulo.
10. **Ausencia de duplicación entre `seed.ts` y `permissions-catalog.ts`** — confirmado por `git diff --stat`: `seed.ts` perdió 82 líneas (las declaraciones locales) y ganó 2 (el `import`); no quedó una segunda copia del catálogo.

**Resultado de la Tarea 2: sin hallazgos.**

## 10. Matriz por rol/acción

| Recurso    | Acción                         | Clave               | Roles en catálogo                                      | Roles en `BR-PERM-004`                                      | Coincide |
| ---------- | ------------------------------ | ------------------- | ------------------------------------------------------ | ----------------------------------------------------------- | -------- |
| Documento  | Metadatos                      | `document.read`     | Administrador, Contador, Auxiliar, Supervisor, Auditor | Mismos                                                      | Sí       |
| Documento  | Descargar original             | `document.download` | Administrador, Contador, Auxiliar, Supervisor, Auditor | Mismos                                                      | Sí       |
| Documento  | Cargar                         | `document.upload`   | Administrador, Contador, Auxiliar                      | Mismos                                                      | Sí       |
| CFDI       | Listar/resumen/estructurado    | `cfdi.read`         | Administrador, Contador, Auxiliar, Supervisor, Auditor | Mismos                                                      | Sí       |
| CFDI       | Descargar XML original         | `document.download` | (mismo binario, misma clave)                           | Mismos                                                      | Sí       |
| CFDI       | Generar/cargar                 | `cfdi.generate`     | Administrador, Contador, Auxiliar                      | Mismos                                                      | Sí       |
| CFDI       | Cancelar                       | `cfdi.cancel`       | Administrador, Contador                                | No tabulada en `BR-PERM-004` (fuera del alcance de `D-011`) | N/A      |
| CFDI       | Modificar/eliminar             | —                   | No existe                                              | No existe por diseño (`BR-INT-002`)                         | Sí       |
| Estudiante | Cualquier clave de este bloque | —                   | Sin entrada                                            | Sin entrada                                                 | Sí       |

La comparación fila por fila contra `BR-PERM-004` la ejecuta además, de forma automatizada, el bloque `it.each` de `permissions-catalog.test.ts` (22 pruebas totales, ver §13) — confirmado en ejecución independiente.

**Discrepancia encontrada fuera de `BR-PERM-004`:** el catálogo de wireframes (`docs/16` §54) contradice esta misma matriz para cuatro pantallas — ver Hallazgo `T03-OBS-01` en §15.

## 11. API

- **`API-0026`** (`GET /documents/{documentId}/download`) exige `document.download` — confirmado en `docs/08_API_DESIGN.md` línea 187 y nota `†` (línea 193).
- **`API-0027`** (`GET /documents/{documentId}/cfdi`) exige `cfdi.read` — confirmado línea 188.
- **`API-0028`** (`GET /companies/{companyId}/cfdi`) exige `cfdi.read` — confirmado línea 189.
- **Administrador** aparece explícitamente en las cuatro filas de `API-0023` a `API-0028` — confirmado; la corrección de `API-0028` (que lo omitía) se verificó como aplicada.
- **Ningún controlador se presenta como implementado sin serlo**: `BR-PERM-004` distingue expresamente "Implementado (API-0024, API-0025)" de "Aprobado... endpoint aún no implementado" (`document.download`) y "Catálogo implementado... sin endpoint todavía (API-0027/API-0028 no implementadas)" (`cfdi.read`). Confirmado además por inspección directa de `apps/api/src/modules/documents/documents.controller.ts` (sin ruta de descarga ni CFDI) y de `apps/api/src/modules/cfdi/` (solo repositorios y persistencia, sin controlador).
- La nota de grupo de `docs/08` §9.5 declara explícitamente que la clave de permiso "se suma" a Membership y aislamiento por Empresa, nunca los sustituye — no hay ambigüedad de que la descarga dependa solo de Membership.

**Resultado de la Tarea 4: sin hallazgos.**

## 12. Documentación

Verificación de la Tarea 3 (matriz canónica) y Tarea 5 (sincronización documental) contra los patrones de riesgo enumerados en el encargo:

| Patrón de riesgo buscado                                    | Resultado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Administrador omitido                                       | **Encontrado** en `docs/16_WIREFRAMES_SPECIFICATION.md` §54 (catálogo de wireframes), filas `WF-0012`, `WF-0013`, `WF-0015`, `WF-0016` — ver Hallazgo `T03-OBS-01`. No encontrado en `docs/31`, `docs/08`, `docs/04`, ni en la sección de prosa de `docs/16` (líneas 224–256), que sí incluyen a Administrador.                                                                                                                                                                                                                    |
| Auditor o Supervisor excluidos                              | **Encontrado**, mismo hallazgo: `WF-0012` (tabla) omite a Supervisor y Auditor por completo.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Estudiante incluido                                         | No encontrado en ninguna fuente.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Descarga cubierta solo por Membership                       | No encontrado — `API-0026` exige `document.download` explícitamente.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `document.download` declarado pendiente                     | No encontrado en el estado actual de ninguna fuente canónica (`docs/04`, `docs/08`, `docs/11`, `docs/15`, `docs/16` prosa, `docs/31`). Las menciones a "pendiente"/"a resolver en T03" que existen en `brain/DECISIONS.md` (líneas 513, 515, 532) pertenecen a las secciones `Contexto`/`Riesgos` de `D-011`, redactadas el 2026-08-04 antes de la resolución — son narrativa histórica correcta, no un estado vigente contradictorio; el bloque `Estado`/`Historial` de la misma decisión (líneas 545–553) refleja la resolución. |
| XML gobernado por `cfdi.read` en vez de `document.download` | No encontrado — `docs/08` nota `†`, `docs/16` línea 258 y `BR-PERM-004` fila "CFDI — Descargar XML original" son consistentes en que `cfdi.read` no autoriza la descarga.                                                                                                                                                                                                                                                                                                                                                          |
| Textos con "cualquier rol"                                  | Tres apariciones, todas en `docs/15_UX_FLOWS.md` líneas 278/286/293, referidas al asistente de chat de IA — no relacionadas con Documento/CFDI ni con `D-011`. Sin relevancia para este contrato.                                                                                                                                                                                                                                                                                                                                  |

`docs/32_MASTER_NAVIGATION_ARCHITECTURE.md` línea 246 confirmada sin cambios y sin contradicción (ya concedía "Fiscal" al Auditor antes de `D-011`). `docs/11_SECURITY_ARCHITECTURE.md` §9 confirmada con la nota de subordinación a `BR-PERM-004` aplicada.

## 13. Pruebas

Ejecución independiente (no confío en el reporte de implementación; reproducido en esta sesión):

| Comando                                                                                                                    | Resultado                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @contaia/database exec vitest run src/permissions-catalog.test.ts`                                          | ✅ **22/22 verdes** (reproducido)                                                                                               |
| `pnpm --filter @contaia/database run typecheck`                                                                            | ✅ sin errores (reproducido)                                                                                                    |
| `pnpm --filter @contaia/database exec eslint prisma/seed.ts prisma/permissions-catalog.ts src/permissions-catalog.test.ts` | ✅ sin errores ni advertencias (reproducido)                                                                                    |
| `git diff --check` (árbol completo)                                                                                        | ✅ sin marcadores de conflicto ni espacios en blanco reales; únicamente avisos de normalización LF→CRLF, no atribuibles a `T03` |

Cobertura confirmada por lectura directa de las 22 pruebas: Auditor y Supervisor con `cfdi.read` (2 pruebas), los cinco roles con `document.download` (1 prueba agregada), Estudiante excluido de ambas claves (2 pruebas), separación de claves `document.read`/`document.download`/`cfdi.read` (2 pruebas), ausencia de escritura CFDI (1 prueba), roles oficiales sin `isPlatformAdmin` (1 prueba), ausencia de duplicados (1 prueba), invariante `document.download` ⟹ `document.read` (1 prueba), y 8 pruebas `it.each` que comparan `BR-PERM-004` contra el catálogo fila por fila más 1 prueba de cobertura de lectura de la tabla.

**Robustez de la prueba que lee Markdown** (`describe('BR-PERM-004 (docs/04) coincide con el catalogo sembrado')`):

- **Mecanismo:** lee `docs/04_BUSINESS_RULES.md` con `readFileSync`, recorta desde `#### BR-PERM-004` hasta el siguiente `\n## `, parsea filas de tabla Markdown (`split('|')`), filtra por columna "clave" con la forma exacta `modulo.accion` vía regex `/^[a-z]+\.[a-z]+$/`.
- **Riesgo de falsos positivos:** bajo. El regex exige minúsculas y un solo punto, lo que excluye celdas de prosa o `API-00XX`; si ninguna fila sobrevive el filtro, la prueba de cobertura (`expect([...] ).toEqual([...6 claves...])`) falla en lugar de pasar en vacío — no hay forma de que una tabla vacía o mal formada produzca una suite verde.
- **Dependencia del formato:** alta pero declarada explícitamente por el propio archivo de prueba (comentario líneas 113–118): depende de que la tabla mantenga columnas `| Recurso | Acción | Clave | Roles | Estado |` y de que la clave esté entre acentos graves. Un cambio de formato de tabla (no de contenido) rompería la prueba — es un acoplamiento aceptado y documentado, no oculto.
- **Valor real:** alto. No es una prueba tautológica: compara dos fuentes independientes (el texto del documento vs. el objeto `ROLE_PERMISSIONS` en memoria) y falla si divergen.
- **Comportamiento demostrado por mutación:** el reporte de implementación (`EWO-SEC-NAV-001_TENANT_ISOLATION_PLAN.md` §21, líneas 708) documenta que se eliminó temporalmente "Supervisor" de la fila `document.download` en `docs/04`, la suite falló en la prueba esperada, y se revirtió el documento. **No reproduje esta mutación yo mismo**: hacerlo exige editar `docs/04_BUSINESS_RULES.md`, y mi `ALLOWED_WRITE` se limita al artefacto de auditoría — modificar documentación, aunque sea temporalmente y revertida, excede mi alcance autorizado. Verifiqué en su lugar, por lectura estática del código de la prueba (líneas 162–179), que la lógica de comparación (`expect(rolesDelCatalogo).toEqual(rolesDocumentados)`) no puede pasar si las listas de roles difieren — confirmo la robustez por análisis de código, no por reproducción empírica de la mutación.

**Resultado de la Tarea 5: sin hallazgos sobre la calidad de la prueba.** Ver §15 para la limitación metodológica de esta auditoría (no reproduje la mutación).

## 14. Riesgos futuros

Distinguidos de defectos de `T03` porque el propio plan los declara como deuda explícita, no oculta:

- **Claves aprobadas sin controlador implementado** (`RW-03`): `cfdi.read` y `document.download` viven en el catálogo pero ningún endpoint las exige todavía. No genera falsa sensación de protección porque no existe endpoint que proteger — riesgo latente, no defecto actual. Debe reverificarse cuando `API-0026`/`0027`/`0028` se implementen.
- **Reseed pendiente en entornos existentes**: cualquier entorno sembrado antes del 2026-08-05 no tiene la fila `document.download`. Fuera del alcance de esta tarea (requiere autorización humana explícita para tocar una base real, `.claude/rules/20-fiscal-data-safety.md`).
- **Auditoría futura de descargas**: cuando `API-0026` exista, debe añadirse la prueba HTTP autenticada correspondiente (rol con la clave → `200`; rol sin ella → `403`). No aplica hoy porque el endpoint no existe.
- **Protección HTTP futura**: el guard (`PermissionGuard`) ya resuelve correctamente contra el catálogo; falta únicamente que los controladores declaren el decorador `@Permissions(...)`. No es un defecto de `T03` — `T03` es responsable del catálogo, no de los controladores.
- **`WF-0017` dependiente de otra decisión**: `WF-0017` (Comparación de duplicados) usa `Auxiliar, Contador` de forma consistente entre prosa y catálogo — correctamente excluye a Auditor/Supervisor porque depende de `cfdi.generate`, no de `cfdi.read`. Verificado sin contradicción; no es un riesgo de `T03`.
- **Alcance de la prueba de sincronización**: cubre únicamente `BR-PERM-004` (Documento/CFDI); el resto del catálogo (`company.*`, `journal.*`, `inventory.*`, `sat.*`, `users.*`) no tiene matriz canónica equivalente ni prueba de sincronización — candidato ya identificado por el propio plan para `T05`, no un defecto de `T03`.

## 15. Hallazgos

| ID           | Severidad | Ubicación                                                                                                            | Problema                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Evidencia                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Impacto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Corrección mínima                                                                                                                                                                                 | Estado                                                                                                       |
| ------------ | --------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `T03-OBS-01` | **MEDIO** | `docs/16_WIREFRAMES_SPECIFICATION.md` §54 "Catálogo de wireframes", filas `WF-0012`, `WF-0013`, `WF-0015`, `WF-0016` | El catálogo índice del propio documento contradice la sección de prosa del mismo documento y `BR-PERM-004`. `WF-0012` (línea 626): tabla dice "Auxiliar, Contador"; la prosa (línea 224) y `BR-PERM-004` dicen "Administrador, Contador, Auxiliar, Supervisor, Auditor" — la tabla omite tres roles completos, incluidos Supervisor y Auditor. `WF-0013` (línea 627): tabla omite a Administrador frente a la prosa (línea 232). `WF-0015`/`WF-0016` (líneas 629–630): tabla dice "Auxiliar, Contador, Supervisor, Auditor", omitiendo a Administrador frente a la prosa (líneas 248, 256) y `BR-PERM-004`. | Comparación directa de líneas 224/232/248/256 (prosa, correctas) contra líneas 626/627/629/630 (catálogo índice, desactualizado) del mismo archivo. Otros wireframes no relacionados con `D-011` (`WF-0009`, `WF-0021`, `WF-0024`) sí mantienen coherencia entre su prosa y su fila de catálogo, lo que descarta que la tabla sea una compresión intencional y confirma que es una sincronización incompleta específica de las filas que `T03` debía tocar. | Un lector que consulte únicamente la tabla §54 (diseñada como índice rápido) concluiría que Administrador no puede cargar ni consultar Documentos/CFDI, y que Supervisor y Auditor no pueden acceder a la Biblioteca de Documentos — exactamente la contradicción que `D-011` fue creada para eliminar, reaparecida en el mismo archivo que `T03 §21` declaró sincronizado. Es un riesgo documental, no una brecha de autorización en código: el catálogo real (`permissions-catalog.ts`) y los guards no se ven afectados. | Actualizar las cuatro filas de la tabla §54 para que reflejen los mismos roles que sus secciones de prosa correspondientes (líneas 224, 232, 248, 256), ya correctas. Diff de una línea por fila. | ABIERTO, no bloqueante para el catálogo/código, pero cumple el umbral `MEDIO` del contrato de esta auditoría |

No se encontraron hallazgos `CRÍTICO` ni `ALTO`. No se encontraron permisos excesivos, herencia implícita de `isPlatformAdmin`, permisos de escritura CFDI no aprobados, ni contradicción entre el catálogo real y `BR-PERM-004`.

## 16. Veredicto

**REQUIERE CAMBIOS.**

Justificación mecánica conforme al contrato de esta auditoría: existe exactamente un hallazgo `MEDIO` (`T03-OBS-01`). Las reglas de veredicto de esta misión son explícitas — "`REQUIERE CAMBIOS`: al menos un hallazgo `MEDIO`" — y no admiten excepción por el tamaño de la corrección. El hallazgo es puramente documental (una tabla índice desincronizada dentro de un archivo que `T03` ya sincronizó parcialmente), no afecta al catálogo de permisos implementado (`permissions-catalog.ts`), no afecta a `seed.ts`, no afecta a los guards, y las 22 pruebas automatizadas pasan sin excepción. El contrato vinculante de `D-011` está correctamente implementado en el sistema real; el defecto vive exclusivamente en una tabla de referencia rápida dentro de la documentación de wireframes.

## 17. Estado recomendado T03

**No se recomienda `PASSED`.** Se recomienda mantener `T03: IMPLEMENTADA · PENDIENTE DE AUDITORÍA` hasta corregir `T03-OBS-01`, o alternativamente `PASSED CON OBSERVACIONES` si el responsable de producto determina que una discrepancia puramente documental en una tabla índice (sin efecto en catálogo, código, guards o pruebas) no debe bloquear el cierre — esa es una decisión de tolerancia al riesgo que corresponde al responsable de producto, no a este auditor. Bajo las reglas mecánicas explícitas de esta misión (hallazgo `MEDIO` ⟹ `REQUIERE CAMBIOS`), el veredicto formal de este artefacto es `REQUIERE CAMBIOS`.

## 18. Estado recomendado D-011

**No se recomienda `IMPLEMENTADA · PASSED`.** El contrato vinculante de `D-011` está correctamente implementado y verificado en el catálogo real; `D-011` mantiene su estado actual `IMPLEMENTADA · PENDIENTE DE AUDITORÍA` hasta que `T03-OBS-01` se resuelva y una auditoría posterior confirme cierre limpio.

## 19. Historial

- **2026-08-06** — Auditoría final independiente `READ ONLY` ejecutada por Antigravity-01 sobre el árbol de trabajo de `feature/frontend-ux-audit`. Verificación reproducida de 22/22 pruebas, `typecheck` y `ESLint` limpios, `git diff --check` sin hallazgos atribuibles. Confirmado el aislamiento del delta: `D-010`/`D-012` intactas, sin migraciones, sin cambios de frontend productivo, sin cambios de guards. Un hallazgo `MEDIO` (`T03-OBS-01`) detectado en `docs/16_WIREFRAMES_SPECIFICATION.md` §54: el catálogo índice de wireframes no fue sincronizado en el mismo turno que corrigió la prosa de las mismas pantallas (`T03 §21`, 2026-08-06). Veredicto: `REQUIERE CAMBIOS`. No se creó ni modificó ningún otro archivo.
