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
