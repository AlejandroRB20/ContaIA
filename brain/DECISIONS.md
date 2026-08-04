# Decisiones

## Propósito

Registro de decisiones técnicas y de producto tomadas durante el proyecto.

## Estado

Activo — primera decisión registrada el 2026-07-18

## Fecha de creación

2026-07-18

> Nota: Este documento aún no debe usarse para programar. Cada entrada sigue el formato: fecha; contexto; alternativas; decisión; motivo; consecuencias; responsable; estatus (`MASTER_CONTEXT.md`, sección 22).

---

## D-001 — Política oficial de gestión de colisiones de numeración de `docs/`

- **Fecha:** 2026-07-18
- **Contexto:** desde AWO-001 hasta la Maintenance Work Order previa a esta decisión, cada colisión entre un documento nuevo del Architecture Workflow y un marcador de estructura vacío del esqueleto inicial del proyecto (`docs/13_SECURITY.md`, `docs/17_UI_UX_DESIGN.md`, `docs/18_TESTING_STRATEGY.md`, `docs/23_RAG_ARCHITECTURE.md`, `docs/19_DEVOPS.md`, entre otros) se resolvió caso por caso dentro de la propia Work Order que la detectaba, con una advertencia anticipatoria repetida en las Observaciones del Arquitecto de casi cada documento desde AWO-007.
- **Alternativas consideradas:** (a) continuar resolviendo cada colisión individualmente al momento de detectarla, sin política formal; (b) reservar de forma preventiva un bloque completo de numeración para las fases futuras conocidas del Architecture Workflow y reubicar automáticamente cualquier documento auxiliar que lo ocupe, sin esperar a que cada colisión bloquee una Work Order.
- **Decisión:** se adopta la alternativa (b). Se reserva formalmente `docs/19` a `docs/24` para los seis documentos de planeación de implementación del Architecture Workflow (`FRONTEND_IMPLEMENTATION_PLAN`, `BACKEND_IMPLEMENTATION_PLAN`, `DATABASE_MIGRATION_PLAN`, `INFRASTRUCTURE_IMPLEMENTATION_PLAN`, `TESTING_AND_QA_PLAN`, `RELEASE_PLAN`). Cualquier documento auxiliar que ocupe una posición de ese bloque se reubica automáticamente al siguiente bloque libre de documentación complementaria, sin requerir una Maintenance Work Order separada salvo que el cambio afecte una decisión arquitectónica. El detalle completo de la política vive en `MASTER_CONTEXT.md`, sección 27.4.
- **Motivo:** el objetivo explícito del responsable de producto es garantizar la continuidad del Architecture Workflow sin interrupciones por colisiones de numeración — un patrón que se había repetido en al menos ocho documentos consecutivos y que ya generaba advertencias anticipatorias recurrentes sin resolverse de raíz.
- **Consecuencias:** en la misma fecha se ejecutó la reorganización masiva del bloque (`docs/20_LOCAL_DEVELOPMENT.md` → `docs/26`, `docs/21_LEGAL_COMPLIANCE.md` → `docs/27`, `docs/22_GLOSSARY.md` → `docs/28`, `docs/23_RAG_ARCHITECTURE.md` → `docs/29`, `docs/24_TESTING_STRATEGY.md` → `docs/30`), dejando `docs/19` a `docs/24` completamente libres para las seis Work Orders de implementación siguientes. Ningún contenido técnico, arquitectónico o de reglas de negocio se modificó. Quedan pendientes, fuera del alcance de esta decisión, las referencias históricas ya desactualizadas a `docs/17_UI_UX_DESIGN.md` y `docs/18_TESTING_STRATEGY.md` en varios documentos aprobados (ver `MASTER_CONTEXT.md`, sección 27.4, nota de alcance).
- **Responsable:** Responsable de producto de ContaIA.
- **Estatus:** Aprobada y vigente.

---

## D-002 — Multi-tenancy de EWO-002 preserva el patrón Membresía de `docs/09`

- **Fecha:** 2026-07-19
- **Contexto:** el prompt de EWO-002 (Authentication & Authorization) pedía literalmente `companyId`/`isOwner` directos en la entidad `User` (una empresa por usuario). `docs/09_DATABASE_DESIGN.md` (AWO-005, ya aprobado) define en cambio una entidad `Membresía` de primera clase: relación N:M (Usuario, Empresa, Rol) con `isOwner`/`status` en la membresía, no en el usuario — sostiene BR-USR-002 ("modelo de datos usuario-empresa-rol como relación many-to-many") y BR-EMP-004 (un mismo usuario puede tener roles distintos en empresas distintas).
- **Alternativas consideradas:** (a) implementar literalmente lo pedido por EWO-002 (companyId/isOwner en User), tratando esto como una actualización deliberada de la arquitectura de multi-tenencia; (b) preservar el patrón Membresía ya aprobado y remapear los campos de EWO-002 a él, documentando la equivalencia.
- **Decisión:** se adopta la alternativa (b), confirmada explícitamente por el responsable de producto tras plantearle el conflicto. `User` no tiene `companyId` ni `isOwner` propios. Se crea `Membership` (equivalente en código de `Membresía`) con `userId`, `companyId`, `roleId`, `isOwner`, `status`, `version`. El "System Administrator" de EWO-002 se modela como `User.isPlatformAdmin=true` sin ninguna fila de `Membership` — el patrón ya soporta ese caso sin necesidad de un `companyId` nulable.
- **Motivo:** cambiar a un `companyId` directo habría contradicho una decisión arquitectónica ya aprobada y roto la capacidad, ya garantizada por BR-EMP-004, de que un mismo usuario tenga roles distintos en distintas empresas (caso real: un Contador independiente que atiende varios clientes).
- **Consecuencias:** el `UserRole` que EWO-002 pedía como tabla separada no existe — la asignación de Rol por Empresa vive en `Membership.roleId`; `Role`/`Permission`/`RolePermission` sí son catálogos globales normalizados (compatible con `docs/08_API_DESIGN.md` sección 7, que permite evolucionar RBAC a algo más granular sin romper el modelo). Ver `docs/engineering/EWO-002_AUTH_REPORT.md` para el detalle de implementación.
- **Responsable:** Responsable de producto de ContaIA (confirmado vía pregunta directa antes de implementar).
- **Estatus:** Aprobada y vigente.

### D-002.1 — Corrección de nombres de campo (no es una nueva decisión arquitectónica)

- **Fecha:** 2026-07-19
- **Naturaleza:** esto **no** es una decisión nueva — es la resolución de una contradicción en la redacción del prompt de EWO-002, que pedía explícitamente "no agregues... `status`... directamente en `User`" mientras el código ya construido bajo D-002 sí tenía un campo `User.status` (el estado de la cuenta: `PENDING_VERIFICATION/ACTIVE/SUSPENDED/DEACTIVATED`) y un `Membership.status` homónimo pero conceptualmente distinto (el estado de la pertenencia: `PENDING/ACTIVE/REVOKED`). El responsable de producto confirmó que ambos campos son necesarios y correctos (son conceptos ortogonales — cuenta global vs. pertenencia a una empresa concreta), pero pidió eliminar la ambigüedad de nombre.
- **Corrección aplicada:** `User.status` → `User.accountStatus` (mismo enum `UserStatus`, mismos valores). `Membership.status` → `Membership.membershipStatus` (mismo enum `MembershipStatus`, mismos valores). Se agregó además `Membership.deletedAt` (baja lógica, consistente con `User.deletedAt`/`Company.deletedAt` ya existentes y con BR-INT-002 — nunca eliminación física de datos de negocio), distinto de `membershipStatus=REVOKED` (una transición normal de negocio): `deletedAt` está reservado para corrección de datos (ej. una invitación aceptada por error), fuera de cualquier listado incluso como "revocada".
- **Alcance de la corrección:** `packages/database/prisma/schema.prisma`, `packages/database/prisma/seed.ts`, `apps/api/src/modules/users/repositories/users.repository.ts`, `apps/api/src/modules/users/users.service.ts`, `apps/api/src/modules/roles-permissions/repositories/memberships.repository.ts` (+ filtro `deletedAt: null` en las consultas), `apps/api/src/modules/roles-permissions/services/memberships.service.ts`, `apps/api/src/common/guards/authentication.guard.ts`, `apps/api/src/modules/authentication/services/auth.service.ts`, `packages/types/src/auth.ts`, y los specs afectados. No se tocó ningún guard, decorador, resolución de tenant ni endpoint — la lógica de autorización ya resolvía el rol/permiso desde `Membership` para el `companyId` explícito de cada petición, exactamente como esta corrección pedía confirmar.
- **Responsable:** Responsable de producto de ContaIA.
- **Estatus:** Aplicada.

---

## D-003 — Sesión de EWO-002: JWT de acceso + refresh token aleatorio (no Better Auth como mecanismo principal)

- **Fecha:** 2026-07-19
- **Contexto:** el prompt de EWO-002 pedía explícitamente "Better Auth" y "Session Database" con la instrucción "NO utilizar JWT como autenticación principal". `docs/20_BACKEND_IMPLEMENTATION_PLAN.md` (secciones 2 y 18, ya aprobado) especifica en cambio: JWT de acceso de corta duración (~15 min) + refresh token de vida más larga almacenado hasheado en base de datos, ambos en cookie `HttpOnly`/`Secure`.
- **Alternativas consideradas:** (a) adoptar Better Auth con su modelo de sesión en base de datos (token opaco), reemplazando el diseño JWT de `docs/20`; (b) mantener la arquitectura ya aprobada en `docs/20` sin sustituirla solo porque el prompt la mencionara.
- **Decisión:** se adopta la alternativa (b), confirmada explícitamente por el responsable de producto. Se implementa Access Token JWT de corta duración (claims mínimos: `userId`, `activeCompanyId`, `membershipId`, `sessionId` — nunca permisos completos) + Refresh Token aleatorio de alta entropía (no JWT), hasheado con SHA-256 en la tabla `Session`, con rotación en cada renovación y revocación individual/global. Ambos tokens viajan en cookies `HttpOnly`+`Secure`+`SameSite=Lax`. Better Auth **no se instala como dependencia** — el flujo se implementa directamente con `argon2`, `otplib`, `qrcode`, `@nestjs/jwt` y `crypto` nativo, evitando reconciliar el modelo de sesión/usuario propio de Better Auth con el esquema Prisma ya decidido.
- **Motivo:** la arquitectura de `docs/20` ya está aprobada y detallada (incluyendo diagrama de secuencia); reemplazarla unilateralmente solo porque el prompt de una Work Order posterior nombra una tecnología distinta habría sido un cambio arquitectónico no solicitado explícitamente como tal. Los permisos/roles siempre se resuelven en cada petición desde la `Membership` correspondiente, nunca desde el JWT.
- **Consecuencias:** ninguna dependencia nueva de Better Auth; el módulo de Auth es más simple de auditar al depender solo de librerías de propósito único ya estándar en el ecosistema Node/NestJS.
- **Responsable:** Responsable de producto de ContaIA (confirmado vía pregunta directa antes de implementar).
- **Estatus:** Aprobada y vigente.

---

## D-004 — MFA/TOTP se implementa completo en EWO-002

- **Fecha:** 2026-07-19
- **Contexto:** BR-AUTH-002 (ya aprobada) exige MFA obligatorio para todos los roles excepto Estudiante, y `docs/20_BACKEND_IMPLEMENTATION_PLAN.md` sección 10 ya fija TOTP como el mecanismo concreto. El prompt de EWO-002 no incluía MFA en su lista explícita de "Debe implementar → Autenticación", pese a pedir que el módulo quedara "listo para producción".
- **Alternativas consideradas:** (a) omitir MFA en esta Work Order por no estar en la lista explícita del prompt, dejándolo como deuda técnica futura; (b) implementarlo completo ahora, dado que ya es un requisito obligatorio y aprobado, y su ausencia dejaría el módulo genuinamente no listo para producción según BR-AUTH-002.
- **Decisión:** se adopta la alternativa (b), confirmada explícitamente por el responsable de producto. Se implementa el flujo TOTP completo: activación (`/auth/mfa/setup`), generación de secreto + QR (`otpauth://`, compatible con Google/Microsoft/Authy), confirmación (`/auth/mfa/enable`), verificación durante login, códigos de recuperación de un solo uso, regeneración de códigos, desactivación con confirmación de contraseña, y auditoría de cada acción. MFA es obligatorio en la lógica de negocio para Administrador/Contador/Auxiliar/Supervisor/Auditor; opcional para Estudiante — aunque ver la nota de alcance en `docs/engineering/EWO-002_AUTH_REPORT.md` sobre la diferencia entre "MFA obligatorio al iniciar sesión si ya está activado" y "flujo de enrolamiento forzoso en el primer login", que no se construyó en esta Work Order.
- **Motivo:** la documentación ya aprobada tiene prioridad sobre una omisión del prompt de una Work Order posterior — construir un módulo de Auth "para producción" sin cerrar un control de seguridad ya obligatorio habría sido inconsistente con `MASTER_CONTEXT.md` principio 10.6 (seguridad y privacidad desde el diseño).
- **Consecuencias:** nuevas dependencias `otplib` y `qrcode` en `apps/api`; nuevo campo `User.mfaSecretEncrypted` (cifrado AES-256-GCM) y tabla `MfaRecoveryCode`.
- **Responsable:** Responsable de producto de ContaIA (confirmado vía pregunta directa antes de implementar).
- **Estatus:** Aprobada y vigente.

---

## D-005 — Límites de alcance de EWO-002: módulo Companies, envío real de correo y enrolamiento forzoso de MFA quedan fuera

- **Fecha:** 2026-07-19
- **Contexto:** al implementar EWO-002 surgieron tres necesidades reales no cubiertas explícitamente por el prompt ni por documentación previa: (1) `docs/11_SECURITY_ARCHITECTURE.md` sección 20 marca "Correo | Fuera del MVP" — pero verificación de correo, reset de contraseña e invitaciones necesitan _alguna_ forma de entregar un token; (2) EWO-002 pide la relación obligatoria Usuario-Empresa pero no pide un CRUD completo de Companies, y `docs/20_BACKEND_IMPLEMENTATION_PLAN.md` sección 3 ya trata "Companies" como un módulo del que depende "Roles & Permissions" (implica que se construye aparte); (3) MFA obligatorio (D-004) podría leerse como "forzar el enrolamiento en el primer login", una decisión de UX/producto no solicitada.
- **Decisión:** (1) se implementa toda la lógica de tokens de un solo uso end-to-end, pero el envío real se abstrae detrás de una interfaz `EmailSender` con una implementación `LoggingEmailSender` que registra el correo simulado en el logger de la aplicación — nunca en la respuesta HTTP — hasta que exista un módulo de Notificaciones real; (2) `Company` se modela con los campos mínimos para la relación y las semillas ("Empresa Demo"), sin controller público de CRUD — la incorporación a una empresa ocurre únicamente vía `Invitation` (aceptar invitación crea la `Membership`); (3) no se construyó un flujo que bloquee a un usuario de roles no-Estudiante hasta que complete el enrolamiento MFA — el desafío MFA en login solo se activa si el usuario ya tiene `mfaEnabled=true`.
- **Motivo:** `CLAUDE.md` regla 5 ("no inventes requisitos, funcionalidades ni alcances que no hayan sido indicados") — construir un módulo Companies completo, una integración real de correo, o una política de enrolamiento forzoso habría excedido lo pedido sin una confirmación explícita del responsable de producto, y la documentación existente (`docs/11` sección 20) explícitamente excluye el correo real del MVP.
- **Consecuencias:** el "Registro" de un nuevo usuario crea el `User` pero no una `Company` — un usuario recién registrado necesita una invitación para unirse a una empresa existente; no hay todavía un flujo de autoservicio de "crear mi empresa" (llegará con el módulo Companies). El enrolamiento MFA queda como una acción que el usuario debe iniciar voluntariamente desde su perfil, no como un bloqueo — documentado como brecha conocida, no como "listo para producción" en sentido estricto de BR-AUTH-002 hasta que se decida la política de enrolamiento.
- **Responsable:** Responsable de producto de ContaIA (decisión de alcance registrada durante la implementación; no requirió pregunta directa por ser de menor impacto arquitectónico que D-002/D-003/D-004).
- **Estatus:** Aprobada y vigente para Companies e integración real de correo — pendientes de una Work Order futura. La política de enrolamiento MFA quedó **resuelta** en la sesión de cierre de EWO-002 (2026-07-19) — ver D-006.

---

## D-006 — Política de enrolamiento forzoso de MFA (cierre de EWO-002)

- **Fecha:** 2026-07-19
- **Contexto:** BR-AUTH-002 exige "el sistema DEBE exigir un segundo factor antes de conceder acceso a datos reales" para todo Rol distinto de Estudiante, pero la implementación original de EWO-002 solo activaba el desafío MFA en login si el usuario **ya** tenía `mfaEnabled=true` — sin ningún mecanismo que forzara el enrolamiento inicial. D-005 había dejado esto explícitamente pendiente. El responsable de producto pidió cerrarlo como parte del cierre completo de EWO-002, antes de iniciar EWO-003.
- **Pregunta de diseño no resuelta por BR-AUTH-002 ni por `docs/20_BACKEND_IMPLEMENTATION_PLAN.md` sección 10:** el secreto TOTP y `mfaEnabled` viven en `User` (campo global, no por Empresa — D-002/D-003 ya establecieron que Membership es la única entidad por-Empresa), pero el Rol que activa la obligatoriedad vive en `Membership` (por Empresa, BR-EMP-004). Un mismo Usuario puede tener un Rol Estudiante en una Empresa y Contador en otra.
- **Decisión:** MFA es obligatorio si el Usuario tiene **al menos una** Membership activa con Rol distinto de Estudiante — evaluado contra el conjunto completo de sus Membership, no solo la de la Empresa que intenta usar en ese momento (dado que el secreto/`mfaEnabled` son globales, la condición más estricta de cualquiera de sus Empresas aplica a todas). Un Usuario sin ninguna Membership (recién registrado, aún sin invitación aceptada) no tiene la obligación todavía. Mecanismo: `AuthService.login()` no establece sesión si aplica y `mfaEnabled=false` — devuelve un token de enrolamiento de corta duración (mismo mecanismo ya aprobado en D-004 para el desafío MFA) que dos endpoints nuevos, sin sesión previa, consumen para generar el QR y confirmar el TOTP; la sesión real solo se emite después de confirmar.
- **Motivo:** es la única lectura de BR-AUTH-002 consistente con el modelo de datos ya aprobado (Membership por Empresa, MFA global por Usuario) sin proponer un cambio de esos modelos — evaluar "por Empresa" habría requerido mover el secreto TOTP a Membership, contradiciendo D-002/D-003 sin que se haya pedido ese cambio.
- **Consecuencias:** un Usuario con roles mixtos (Estudiante en una Empresa, Contador en otra) queda con MFA obligatorio en cuanto acepta la segunda invitación, aunque solo quisiera operar como Estudiante ese día — aceptado como comportamiento correcto (el riesgo de seguridad de tener el segundo factor desactivado es el mismo sin importar con qué Empresa esté operando en ese momento, porque el `User` y su sesión son los mismos).
- **Responsable:** Responsable de producto de ContaIA (alcance de la sesión de cierre de EWO-002, confirmado por instrucción directa).
- **Estatus:** Aprobada y vigente.

---

## D-007 — Estrategia de concurrencia y persistencia atómica del agregado CFDI (EWO-005 Bloque E)

- **Fecha:** 2026-07-25 (propuesta) — **ratificada el 2026-07-25**
- **Estatus:** **ACEPTADA.** Ratificada formalmente por Alejandro Reyes Bocanegra (Product Owner y Arquitecto de Producto de ContaIA) el 25 de julio de 2026. La implementación del Bloque E queda **autorizada** a partir de esta fecha. D-007 no describe código existente: el worker **sigue sin implementarse** — la ratificación autoriza el inicio de la implementación, no la da por completada. Ver "Estado de implementación" y "Ratificación".

### Contexto

EWO-005 Bloque E debe extraer datos de un CFDI y persistir un **agregado** compuesto por: cabecera `Cfdi`, checksum de extracción, conceptos, impuestos globales, impuestos por concepto, estado terminal de `Document` y estado de `Job`. La decisión se toma **antes** de escribir el worker, con el repositorio inspeccionado. Hechos verificados en código (NIVEL B):

1. **El worker/processor BullMQ no existe.** `JobsModule` está declarado explícitamente como productor-only (`jobs.module.ts`): registra la `Queue` y el producer, sin consumer. No hay ningún `@Processor` ni `WorkerHost` en el repositorio.
2. **`CfdiConcept` y `CfdiTax` no existen** en `schema.prisma`; el modelo `Cfdi` implementado es **solo la cabecera**, con `@@unique([documentId, companyId])` y `@@unique([companyId, folioFiscal])`.
3. **La transición `Document: PENDING_UPLOAD → PROCESSING` ya ocurre en la confirmación síncrona de subida** (`DocumentsRepository.confirmUpload`), _antes_ de encolar el Job. El `Document` por tanto **llega al worker ya en `PROCESSING`**.
4. **El repositorio ya usa el patrón de transición atómica condicional**: `updateMany` con guarda de estado en el `WHERE` + comprobación de `count`, exactamente en ese mismo `confirmUpload`.
5. BullMQ está configurado con `attempts: 3` y backoff exponencial de 1000 ms **en el productor**; sin consumidor, esa semántica todavía no se ejerce.

Además, BullMQ puede **reentregar** un Job (recuperación de _stalled jobs_), y su deduplicación por `jobId` protege el **encolado**, no la **ejecución**. El riesgo prioritario, declarado como tal, es la **corrupción silenciosa del agregado**.

### Problema

Cómo permitir que **únicamente una ejecución confirme el agregado completo**, mientras las ejecuciones concurrentes **convergen sin mezclar datos** y sin depender de que BullMQ conceda otro intento.

### Fuerzas de decisión

Atomicidad del agregado; idempotencia ante reentrega; consistencia (cabecera e hijos del **mismo** resultado de extracción); compatibilidad con Prisma 6.19.3 y PostgreSQL 16+; BullMQ 5.81.1; **ausencia de SQL crudo como mecanismo de exclusión o resolución de concurrencia** (Prisma y las restricciones declarativas son la vía principal; esto **no** prohíbe el SQL de migración necesario para CHECKs u otras constraints de base de datos, como el CHECK `cfdi_taxes_scope_concept_check` de AD-5); **ausencia de migración adicional para resolver la concurrencia**; observabilidad (poder saber qué pasó); mantenibilidad y coherencia con los patrones ya presentes en el repositorio; facilidad de pruebas; recuperación ante caída del worker; y coste de los efectos externos previos a la persistencia.

### Alternativas consideradas

|       | Alternativa                                                                             | Valoración                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A** | `create()` de `Cfdi` y agregado completo en una transacción                             | **Adoptada (con G).** Un `INSERT` que viola una restricción única **siempre** lanza y aborta la transacción: es un detector de colisión fiable. Sin SQL crudo, sin migración                                                                                                                                                                                                                                                                                                                                                                                                          |
| **B** | `upsert({ update: {} })` administrado por Prisma                                        | **RECHAZADA como mecanismo de exclusión.** No ofrece una **garantía contractual** de propagar `P2002` ante una carrera: Prisma no documenta esa semántica para el upsert administrado, cuya resolución puede pasar por una lectura interna y reutilizar la fila del otro worker. Sin garantía explícita no es un detector de colisiones, y el perdedor podría creer que creó la cabecera y colgar de ella **sus** hijos → mezcla del agregado. _(La caracterización empírica exacta sigue **PENDIENTE**: el rechazo se funda en la ausencia de garantía, no en un resultado medido.)_ |
| **C** | Upsert nativo con actualización escalar (`update: { updatedAt }`)                       | **RECHAZADA como árbitro.** Fuerza el upsert nativo, pero **no informa si la fila fue creada o reutilizada** — justo el dato que la decisión necesita                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **D** | `SELECT … FOR UPDATE` sobre `Document`                                                  | Descartada para el MVP: da exclusión real, pero **exige SQL crudo** (Prisma 6 no lo expone en la API fluida) y añade riesgo de deadlock/starvation frente a alternativas que no lo necesitan                                                                                                                                                                                                                                                                                                                                                                                          |
| **E** | _Claim_/_lease_ explícito con ownership y expiración                                    | **Diferida a post-MVP.** Es la mejor opción para **recuperación tras caída** y para excluir _antes_ de la extracción, pero **exige migración** y campos nuevos. Se conserva como alternativa futura (ver "Condiciones para revisar")                                                                                                                                                                                                                                                                                                                                                  |
| **F** | Advisory locks de PostgreSQL derivados de `companyId + documentId`                      | Descartada para el MVP: limpia y auto-liberada al cerrar la transacción, pero **requiere SQL crudo** y obliga a razonar sobre colisiones de hash y sobre el pool de conexiones                                                                                                                                                                                                                                                                                                                                                                                                        |
| **G** | Transición condicional terminal de `Document` **dentro** de la transacción del agregado | **Adoptada (con A).** Es el idioma que el repositorio ya usa; sin SQL crudo, sin migración, atómico y trivialmente testeable                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

**A y G no compiten: son complementarias.** G aporta el árbitro a nivel de documento; A aporta la detección fiable de colisión a nivel de cabecera. Ambas viven en la misma transacción. La decisión **no se deriva de una suma de puntuaciones**, sino de los invariantes: B y C son las únicas alternativas que pueden violar el invariante 2 (mezcla de agregado), y eso las descalifica con independencia de cualquier otra ventaja.

### Decisión

Se adopta la combinación **A + G**:

1. **`create()`** para la cabecera `Cfdi` — nunca `upsert({ update: {} })` ni upsert con actualización escalar. El `findUnique` previo es una **guarda de invariante**, no una ramificación de reutilización: si el `Cfdi` ya existe con el `Document` en `PROCESSING`, se aborta con rollback total (estado imposible bajo la transacción única). **Un `Cfdi` preexistente nunca se reutiliza para completar un agregado nuevo.**
2. **Restricción única** `@@unique([documentId, companyId])` como detector de la carrera del mismo documento; `@@unique([companyId, folioFiscal])` como detector del duplicado fiscal.
3. **Una única transacción interactiva** (`prisma.$transaction(async (tx) => …)`) que contiene: cabecera + conceptos + impuestos + checksum + **transición terminal condicional `Document: PROCESSING → PROCESSED`** + **cierre del `Job`**. Ambas transiciones usan `updateMany` y exigen **`count === 1`**; cualquier otro valor aborta la transacción. Si el `Document` se marcó `PROCESSED` pero el `Job` no pudo cerrarse, **no se declara éxito**: se revierte todo. **Un solo commit.**
4. **Rollback completo** ante cualquier fallo: no queda ningún agregado parcial visible.
5. **Clasificación posterior por evidencia positiva**, fuera de la transacción abortada, sobre la **instancia primaria** (nunca una réplica) y **nunca** por `P2002.meta.target`. Se reúne evidencia completa —existencia y `companyId` del `Document`, su estado, existencia y estado del `Job`, existencia del `Cfdi`, relación `Cfdi`↔`Document`, colisión de folio— y se clasifica en siete casos (detalle en el addendum AD-10.2):
   - **A** — `Document = PROCESSED` + `Cfdi` propio + `Job = COMPLETED` → **convergencia idempotente**: el job perdedor termina **correctamente**, **sin consumir otro retry**;
   - **B** — `Document = PROCESSED` con `Job` o `Cfdi` incompatible → **inconsistencia**: incidente, sin éxito silencioso;
   - **C** — `Document = REJECTED` → terminal preexistente, **no** es carrera ganada; sin escritura;
   - **D** — `Document` ausente → error de integridad; sin reintento ciego;
   - **E** — `Document = PROCESSING` sin agregado → carrera **no demostrada**: recuperable;
   - **F** — folio de **otro** documento → **pendiente de Q-001**; nunca `REJECTED` automático;
   - **G** — sin coincidencia → error técnico recuperable.
6. **Efectos externos estrictamente post-commit** (eventos, notificaciones, ack). Post-commit evita efectos **prematuros** pero **no garantiza la entrega**: si el proceso cae entre el commit y la publicación, el efecto se pierde. El _outbox_ transaccional es el mecanismo recomendado cuando se exija entrega garantizada; **no está implementado** y se clasifica como **post-MVP** para el Bloque E, donde el resultado se consulta por _polling_ y ningún consumidor depende del evento. Riesgo abierto R-007.

### Alcance de la garantía — exclusión de commit, NO claim anticipado

Esta es una limitación **declarada**, no un defecto. La combinación garantiza: exclusión de commit; atomicidad; convergencia idempotente; e imposibilidad de confirmar dos agregados para el mismo documento.

**No evita** que dos workers descarguen el archivo, hagan parsing, ejecuten OCR, llamen a una IA o consuman recursos **antes** de intentar persistir. Ese trabajo se descarta en el rollback del perdedor: es coste, no corrupción. Se acepta porque hoy las operaciones previas son de lectura y repetibles. La transición terminal `PROCESSING → PROCESSED` **no debe describirse como un claim inicial**: el `Document` ya llega en `PROCESSING`, de modo que el reclamo sólo puede ser terminal.

### Invariantes que la solución debe garantizar

1. Un documento no puede producir dos agregados CFDI activos.
2. Una cabecera no puede contener hijos de otra extracción.
3. Conceptos e impuestos deben provenir del mismo resultado de extracción.
4. Un worker perdedor no puede modificar datos confirmados por el ganador.
5. Cabecera, hijos, checksum y transición terminal deben compartir commit.
6. No pueden quedar agregados parciales visibles.
7. El rollback debe cubrir todas las escrituras del agregado.
8. Un retry no debe duplicar efectos externos.
9. Una colisión del mismo documento debe converger como **éxito idempotente**.
10. El último intento de BullMQ no puede provocar un falso rechazo.
11. La deduplicación de `jobId` **no sustituye** la exclusión transaccional.
12. El estado final debe derivarse de evidencia confirmada en PostgreSQL.
13. Un conflicto del mismo documento no debe confundirse con un conflicto de folio.
14. La política de folio duplicado depende de una business rule expresa.
15. Los efectos externos se ejecutan después del commit o mediante _outbox_.

### Motivo

Se elige A + G porque son las **únicas** alternativas que satisfacen los quince invariantes **sin exigir migración ni SQL crudo de concurrencia**, y porque su garantía descansa en semántica de PostgreSQL (un `INSERT` que viola una restricción única siempre falla; un `UPDATE` con guarda de estado afecta a una fila o a ninguna) en lugar de en el comportamiento interno de un ORM. B y C se descartan porque **pueden violar el invariante 2** (mezcla del agregado): ninguna de las dos permite saber de forma garantizada si la fila fue creada o reutilizada, y esa ambigüedad es exactamente la puerta a la corrupción silenciosa que la decisión existe para cerrar. D y F resolverían la exclusión, pero exigen SQL crudo para un problema que ya se resuelve sin él. E es superior en recuperación tras caída, pero exige migración y complejidad operativa que el MVP no necesita todavía. Además, G reproduce un patrón **ya presente y probado en el repositorio** (`DocumentsRepository.confirmUpload`), lo que reduce el riesgo de implementación y el coste de revisión.

### Consecuencias positivas

Un único commit para todo el agregado; ausencia de mezcla de datos entre extracciones; **independencia del comportamiento interno del upsert de Prisma** (la garantía se apoya en semántica de PostgreSQL, estable entre versiones); resolución correcta incluso si la colisión ocurre en el último intento; convergencia idempotente sin consumir reintentos; **ninguna migración necesaria para esta decisión**; y coherencia con el patrón `updateMany` + `count` ya presente en el repositorio.

### Consecuencias negativas

Trabajo previo potencialmente duplicado (descarga, parsing) entre workers concurrentes; **no existe claim anticipado**; la recuperación tras una caída **antes** del commit depende de la reentrega de BullMQ y de la reconciliación, no de un _lease_; y si los efectos previos llegaran a ser costosos, la decisión deberá revisarse hacia la alternativa E.

### Riesgos

OCR o IA duplicados si entran en alcance con coste real; **política no definida para folios duplicados** (ver abajo); divergencia entre `Document` y `Job` si alguien volviera a separarlos en transacciones distintas; eventos emitidos antes del commit en la futura implementación; e implementación futura incompleta de los hijos (`CfdiConcept`/`CfdiTax` aún no existen, de modo que la atomicidad no ejerce todavía su caso más exigente).

### Business rule pendiente — folio fiscal duplicado

**No aprobada.** Qué debe ocurrir cuando llega un `folioFiscal` que ya pertenece a **otro** documento de la misma Empresa es una decisión **contable**, no técnica: puede ser un error del usuario, una recarga legítima o una sustitución. Hasta que el responsable de producto la apruebe, el worker **no fija `REJECTED`/`CFDI_DUPLICATE` automáticamente**: registra incidente y clasifica como recuperable (`CLAUDE.md` regla 6). Registrada en `brain/QUESTIONS.md`.

### Estado de implementación

**Decisión ratificada — implementación autorizada, todavía no ejecutada.** No existe worker, no existen `CfdiConcept`/`CfdiTax`/`conceptSlot`, y **ninguna prueba de concurrencia se ha ejecutado**. La ratificación de esta decisión (ver "Ratificación") autoriza el inicio de la implementación conforme a `docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md`; no sustituye esa implementación ni la evidencia que debe generarse durante ella. Existe un script exploratorio no ejecutado (`packages/database/test-prisma-upsert.ts`) que caracterizaría el comportamiento del upsert; **no bloquea esta decisión**, porque la opción adoptada no depende de ese comportamiento.

### Plan de validación

- **Unitarias:** clasificador por evidencia positiva (mismo documento / folio de otro documento / sin coincidencia) sin leer `meta.target`; guarda de estado de entrada.
- **Integración:** persistencia del agregado completo en una transacción; rollback total ante fallo en cualquier hijo.
- **Concurrencia:** dos workers reales sobre el mismo `documentId` → exactamente un `Cfdi`, un agregado, un `PROCESSED`; el perdedor converge en éxito sin tocar datos del ganador.
- **Rollback:** violación de restricción única revierte los hijos ya escritos; `count === 0` en la transición terminal fuerza rollback.
- **BullMQ:** reentrega de _stalled job_ idempotente; colisión en el **último** intento → éxito, no rechazo.
- **Recuperación:** caída antes del commit (sin rastro) y después del commit (reentrega idempotente).
- **Regresión:** `confirmUpload` sigue siendo atómico; el duplicado de folio no produce rechazo automático mientras su regla siga pendiente.

### Criterios de aceptación

Verificables, numerados 55 a 63 en `docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md` §15.

### Condiciones para revisar esta decisión

Adopción de OCR o IA **con coste o créditos** antes de la persistencia; incremento sustancial de carga que haga caro el trabajo duplicado; necesidad de exclusión **antes** de la extracción; cambio del nivel de aislamiento transaccional; actualización mayor de Prisma; problemas recurrentes de reconciliación; requisitos de SLA de reproceso; o necesidad demostrada de _lease_. Cualquiera de ellas dispara la evaluación de la **alternativa E**.

### Ratificación

| Campo                 | Valor                                                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Ratificada?          | **Sí.**                                                                                                                                                                                                                               |
| Quién ratificó        | Alejandro Reyes Bocanegra — Product Owner y Arquitecto de Producto de ContaIA                                                                                                                                                         |
| Fecha de ratificación | 2026-07-25                                                                                                                                                                                                                            |
| Evidencia documental  | Instrucción explícita en sesión de trabajo: registrar formalmente la ratificación de D-007, con responsable, rol y fecha indicados arriba; estatus fijado a `ACEPTADA`; autorización expresa de inicio de implementación del Bloque E |
| Autoría del análisis  | Claude Code, en rol de Principal Software Architect, por encargo del responsable de producto (análisis: 2026-07-25; ratificación: 2026-07-25)                                                                                         |

**Qué habilita esta ratificación.** D-007 es ahora una decisión arquitectónica **aprobada**, no solo una propuesta técnica. La implementación del Bloque E (Sprints 1–10 de `docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md`) queda **autorizada** a partir de esta fecha. Esto **no** implica que el worker ya exista, que las pruebas ya se hayan ejecutado, ni que los 31 gates de concurrencia estén cerrados — esa evidencia sigue pendiente de generarse durante la implementación misma.

**Qué NO cambia con esta ratificación.** La business rule **Q-001** (`brain/QUESTIONS.md` — política ante `folioFiscal` duplicado de otro documento) **permanece abierta**. Ratificar D-007 aprueba el _mecanismo_ de concurrencia y persistencia; no resuelve la _decisión de negocio_ sobre qué hacer ante un folio duplicado, que sigue siendo una pregunta distinta, pendiente de su propia aprobación explícita.

- **Responsable:** Alejandro Reyes Bocanegra (Product Owner y Arquitecto de Producto de ContaIA) — ratificó formalmente el 2026-07-25; análisis y redacción por Claude Code en rol de Principal Software Architect.
- **Estatus:** **ACEPTADA.** Implementación del Bloque E autorizada. Business rule de folio duplicado (Q-001) **sigue abierta** — no queda cerrada por esta ratificación.

---

## D-008 — Recuperación de `E5-S1-T07` mediante migración correctiva versionada (EWO-005 Bloque E)

- **Fecha:** 2026-07-26
- **Contexto:** la tarjeta `E5-S1-T07` del checklist (`docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md`) exigía **una única migración consolidada**: generar con `prisma migrate dev --create-only`, insertar manualmente dentro de ese mismo archivo el CHECK `cfdi_taxes_scope_concept_check` aprobado en `E5-S1-T04` (Addendum AD-5 §4.5.2), revisar, y solo entonces aplicar. En la ejecución real, el usuario generó y aplicó la migración principal (`20260726020913`, vía terminal interactiva propia) **antes** de que el CHECK se insertara — quedó completa en enums, tablas, índices, `@@unique` y las tres FKs compuestas (incluida la de 3 columnas `cfdi_taxes → cfdi_concepts`), pero sin el CHECK. Verificado read-only (`pg_constraint`) que el CHECK no existía ni en el archivo ni en PostgreSQL.
- **Alternativas consideradas:** (a) editar `20260726020913/migration.sql` para insertar el CHECK retroactivamente; (b) usar `prisma db execute` para aplicar el CHECK directo contra la base, dejando el archivo de la migración principal sin ese SQL; (c) crear una migración correctiva nueva, exclusiva para el CHECK, y aplicarla con `prisma migrate deploy`.
- **Decisión:** se adopta la alternativa (c). Se descartó (a) porque editar el archivo de una migración **ya aplicada** desincroniza su contenido del checksum ya almacenado en `_prisma_migrations` — el texto versionado dejaría de describir fielmente lo que realmente se ejecutó contra la base, y el usuario prohibió expresamente tocar ese archivo. Se descartó (b) (y también `db push`/`migrate reset`/`migrate resolve`/edición directa de `_prisma_migrations`/SQL no versionado) por dejar el CHECK fuera del historial de migraciones versionado, con el mismo riesgo que motivó exigir "SQL manual siempre dentro de una migración" en Addendum AD-5/§18: se perdería ante un futuro `prisma migrate reset`. Se creó la migración correctiva `20260726022147_ewo_005_block_e_cfdi_tax_scope_check`, conteniendo **exclusivamente** el `ALTER TABLE "cfdi_taxes" ADD CONSTRAINT "cfdi_taxes_scope_concept_check" CHECK (...)` verbatim de AD-5/T04, y se aplicó mediante `prisma migrate deploy` (mecanismo oficial no interactivo de Prisma para aplicar migraciones pendientes desde disco).
- **Sobre la creación manual de la carpeta:** el flujo original de T07 exige generar cada migración con `prisma migrate dev --create-only` desde una terminal interactiva. En el entorno de ejecución automatizado de esta sesión, `migrate dev` (con o sin `--create-only`) rechaza ejecutarse por detección de entorno no interactivo (sin TTY) — límite ya documentado en dos intentos previos de esta misma tarjeta. Para esta migración puntual y ya con el usuario informado de la limitación, se creó manualmente la carpeta `packages/database/prisma/migrations/20260726022147_ewo_005_block_e_cfdi_tax_scope_check/` con el timestamp UTC real del sistema (`date -u +%Y%m%d%H%M%S`, no inventado) en la convención de nombres de Prisma, y `migration.sql` con únicamente el SQL aprobado. **Esto no debe presentarse como cumplimiento literal del flujo `--create-only`** — es una medida de recuperación puntual, no un reemplazo general de ese flujo. La _aplicación_ sí se realizó por el mecanismo oficial (`migrate deploy`); no se usó SQL no versionado, no se usó `db execute`, y no se alteró `_prisma_migrations` fuera de la inserción atómica que el propio `migrate deploy` realiza como parte de su función.
- **Motivo:** preservar la integridad del historial de migraciones ya aplicado (nunca reescribir checksums ni contenido de una migración aplicada) tenía prioridad sobre lograr una única migración consolidada. Dividir en dos migraciones — la principal (estructura completa) y la correctiva (solo el CHECK) — es la única vía que no reescribe historial, no ejecuta SQL fuera del sistema de migraciones de Prisma, y dexa el estado final reproducible ejecutando las cuatro migraciones en orden.
- **Consecuencias:**
  - Ambas migraciones (`20260726020913` y `20260726022147_ewo_005_block_e_cfdi_tax_scope_check`) se tratan como **una única unidad lógica** de implementación de `E5-S1-T07` — ninguna de las dos, por separado, representa el entregable completo de la tarjeta.
  - La carpeta `20260726020913` **no** lleva el sufijo `ewo_005_block_e_cfdi_children` que T07 esperaba (fue nombrada así por el propio `prisma migrate dev` del usuario en su terminal). No se renombra — ya está aplicada y su nombre forma parte del historial. Impacto limitado a trazabilidad/legibilidad del nombre de carpeta; no afecta la integridad ni el contenido de la migración.
  - Ambas carpetas de migración permanecen **sin seguimiento de Git** (`??`) al momento de esta decisión — deben incluirse en el próximo commit documental/técnico autorizado para que el árbol de trabajo sea reproducible por otro desarrollador. `E5-S1-T07` no debe pasar a `PASSED` mientras esa condición no se cumpla, salvo indicación expresa en contrario de la política del proyecto.
  - Esta excepción es **puntual**: no convierte la creación manual de carpetas de migración en flujo estándar. Toda migración futura con SQL manual (CHECK, triggers, índices parciales, etc.) debe seguir la secuencia completa `migrate dev --create-only → editar → revisar → aplicar`, ejecutada desde una terminal interactiva real.
  - Esta decisión **no modifica D-007** (sigue `ACEPTADA`, sin reinterpretación) y **no resuelve Q-001** (sigue abierta — la decisión de negocio sobre folio fiscal duplicado es independiente de esta recuperación técnica de migraciones).
  - `E5-S1-T09` conserva íntegramente su responsabilidad: probar físicamente en PostgreSQL real las FKs compuestas (gate G-28) y el CHECK (gate G-29) — no ejecutada por esta decisión.
- **Responsable:** Claude Code (Senior Software Architect / Documentation Engineer), registrando la recuperación técnica ya ejecutada y autorizada explícitamente por el usuario en la sesión de trabajo del 2026-07-26.
- **Estatus:** **ACEPTADA.** Alcance limitado exclusivamente a la recuperación de `E5-S1-T07` descrita arriba.

## D-009 — Semántica de `Fecha` CFDI 4.0 y namespace oficial del Timbre Fiscal Digital (EWO-005 Bloque E)

- **Fecha:** 2026-08-02
- **Contexto:** el análisis técnico previo de `E5-S3-T06` (extracción del encabezado CFDI 4.0) detectó dos criterios fiscales sin fuente validada en el repositorio, ambos bloqueantes para implementar la tarea. El responsable de producto aportó la evidencia normativa del SAT que faltaba.
- **Evidencia normativa aportada (fuente oficial SAT):**
  - El atributo `Fecha` de CFDI 4.0 tiene formato `AAAA-MM-DDThh:mm:ss`, corresponde a la **hora local del lugar de expedición** y **no incorpora offset** en el valor XML.
  - El namespace oficial del Timbre Fiscal Digital 1.1 es `http://www.sat.gob.mx/TimbreFiscalDigital`.
  - El atributo `UUID` del Timbre es requerido, de tipo `string`, de longitud 36, con patrón RFC 4122.
- **Decisión (parte 1 — namespace TFD, `ACEPTADA`):** se registra `TFD_11_NAMESPACE_URI = 'http://www.sat.gob.mx/TimbreFiscalDigital'` como constante arquitectónica vinculante en Addendum §5.3quater. Hasta ahora ese URI solo existía en _fixtures_ de pruebas, nunca como norma. `E5-S3-T06` deberá resolverlo **por URI efectivo**, nunca por el prefijo textual `tfd` (verificado empíricamente que el prefijo puede reasignarse a un URI falso), localizar el Timbre únicamente como hijo directo de `Complemento`, exigir `UUID` de longitud exacta 36, y nunca registrarlo en logs ni en mensajes de error. Esto resuelve el bloqueante `I-15`.
- **Decisión (parte 2 — prohibición de conversión de `Fecha`, `ACEPTADA`):** el parser tiene **prohibido derivar un instante** a partir de `Fecha`. Quedan prohibidos `new Date(fecha)`, `Date.parse(fecha)`, agregar `Z`, interpretar como UTC, fijar `America/Mexico_City` o cualquier otra zona, y usar la zona horaria del servidor. Motivo medido, no teórico: sobre un host en `America/Mexico_City`, `new Date('2026-07-15T10:30:00')` produce `2026-07-15T16:30:00.000Z`, mientras que el mismo valor con `Z` explícito produce `10:30:00.000Z` — el instante persistido dependería de la zona horaria del proceso, lo que rompe la extracción determinista exigida por AD-10.1 y obligaría a asumir una zona implícita que `docs/08_API_DESIGN.md` §"Convenciones" ya prohíbe para toda la API. `E5-S3-T06` debe preservar el valor exacto como `string` (`issuedAtLocal`); mientras conserve hora local sin offset, el campo **no puede llamarse** `issuedAt: Date`.
- **Alternativas consideradas para el contrato:** (A) mantener `Date`/`Timestamptz` interpretando UTC — **rechazada**, asume una zona implícita prohibida y falsea el instante; (B) mantener `Date`/`Timestamptz` fijando `America/Mexico_City` — **rechazada**, no cubre comprobantes expedidos en las demás zonas horarias de México ni en el extranjero, y seguiría siendo una zona asumida; (C) conservar el string exacto en el contrato del parser y diferir la conversión — **preferida**; (D) cambiar la persistencia a `timestamp without time zone` — viable, pero el cliente de Prisma sigue entregando `Date` en JavaScript, así que por sí sola no elimina el riesgo de conversión dependiente del host; (E) guardar dos campos (valor local original + instante normalizado opcional) — mayor fidelidad y reversibilidad, pero amplía el modelo más allá del MVP.
- **Decisión (parte 3 — corrección de contrato, `APROBADA` el 2026-08-02):** el responsable de producto autorizó expresamente la **alternativa (C)**. El contrato definitivo es:
  - `ExtractedCfdiAggregate.issuedAtLocal: string` — sustituye a `issuedAt: Date`, sin coexistencia de ambos campos ni alias ambiguos.
  - Formato obligatorio `AAAA-MM-DDThh:mm:ss`, conservado **exactamente** como se recibe: sin `trim`, sin normalizar, sin añadir offset.
  - Persistencia textual exacta. Modelo Prisma aprobado: `issuedAtLocal String @map("issued_at") @db.VarChar(19)`; la columna física conserva el nombre `issued_at` para minimizar la ruptura del schema, pero deja de ser `timestamptz`.
  - Prohibido inferir zona horaria por cualquier vía (`Date`, `new Date()`, `Date.parse()`, sufijo `Z`, UTC, `America/Mexico_City`, zona del host).
  - La corrección se ejecuta como **tarea arquitectónica independiente**, con **migración correctiva nueva** — nunca editando migraciones ya aplicadas (mismo principio de D-008).
  - `E5-S3-T06` **no se inicia** hasta que esta corrección quede cerrada por auditoría independiente.
- **Estado de ejecución de la parte 3: IMPLEMENTADA el 2026-08-04.** Una primera ejecución (2026-08-02) se detuvo antes de tocar nada porque el servidor PostgreSQL no respondía y **no podía demostrarse que la tabla `cfdis` estuviera vacía** — se aplicó la regla de no afirmar ausencia de datos por suposición. Reanudada con la base disponible, se verificó por consulta directa `SELECT COUNT(*) FROM cfdis` = **0**, tanto antes de generar la migración como antes de aplicarla. Al no existir filas, la cláusula `USING` no evalúa ningún valor: **no se convirtió ningún instante**, no se usó `AT TIME ZONE`, no se usó `issued_at::text` y no se asumió UTC.
  - Migración correctiva nueva: `20260804013104_preserve_cfdi_local_issue_datetime`. No se editó ninguna migración previamente aplicada (principio de D-008).
  - Se usó `ALTER COLUMN ... TYPE` en lugar del `DROP` + `ADD COLUMN` que Prisma genera por defecto, para conservar la posición ordinal de la columna física; verificado en una base de pruebas desechable que PostgreSQL preserva `NOT NULL` y reconstruye el índice dependiente conservando su nombre (`cfdis_company_id_issued_at_idx`).
  - Verificación posterior a aplicar: `character varying(19)`, `NOT NULL`, índice presente, 0 filas, sin migraciones pendientes y sin drift de schema.
- **Consecuencias:**
  - `E5-S3-T06` queda **habilitada y no iniciada**, bloqueada ahora únicamente por el cierre auditado de esta corrección. `I-14` e `I-15` quedan **resueltos**.
  - La corrección modificó artefactos ya auditados —`ExtractedCfdiAggregate` (`E5-S2-T01`), `CfdiRepository` (`E5-S2-T02`), sus pruebas (`E5-S2-T06`/`T10`), `Cfdi.issuedAt` (`E5-S1-T05`) y la columna que materializa (`E5-S1-T07`/`T09`)— por lo que queda **`READY_FOR_AUDIT`** y **exige reauditoría independiente** antes de considerarse cerrada. Regresión completa revalidada: 40 suites / 598 pruebas `PASSED`.
  - `E5-S3-T07`–`T12` conservan su estado vigente (`BLOCKED`). Sprint 3 continúa `IN_PROGRESS`.
  - La forma de respuesta de API-0027 (Addendum §13.1) se actualizó a `issuedAtLocal` con su formato explícito. Los endpoints siguen "Por implementar", así que no hubo código de API afectado.
  - Esta decisión **no modifica** D-007 ni D-008, y **no resuelve** Q-001.
- **Responsable:** Claude Code (Principal Software Architect / Data Modeling Engineer), registrando la evidencia normativa y la autorización expresa del responsable de producto en la sesión del 2026-08-02, y ejecutando la implementación el 2026-08-04 tras verificar la seguridad de la migración.
- **Estatus:** **APROBADA E IMPLEMENTADA** en sus tres partes. Partes 1 y 2 (namespace TFD y prohibición de conversión) registradas en Addendum §5.3quater. Parte 3 (contrato `issuedAtLocal`, schema y migración correctiva) aplicada el 2026-08-04 y en estado **`READY_FOR_AUDIT`** — no `PASSED`: requiere reauditoría independiente `READ ONLY` por haber modificado artefactos ya auditados de Sprint 1 y Sprint 2.
