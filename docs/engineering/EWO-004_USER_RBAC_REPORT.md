# EWO-004 — User, RBAC & Workspace Context — Informe de Ingeniería

## Control del documento

| Campo           | Valor                                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EWO             | EWO-004                                                                                                                                                                   |
| Título          | User, RBAC & Workspace Context                                                                                                                                            |
| Estado          | **BLOCKED** — código completo; `pnpm run check` en verde; único bloqueo: migración inicial de Prisma pendiente (sin Docker)                                               |
| Entorno         | Windows 11 Pro, pnpm 11.15.0, sin Docker Desktop instalado (mismo bloqueo de infraestructura documentado en EWO-001/002/003)                                              |
| Resultado final | Workspace context operativo en frontend; app shell `[companyId]` con validación de membresía y carga de permisos; perfil de usuario; cambio de contraseña desde el perfil |

---

## 1. Alcance aprobado

EWO-004 entrega el **contexto de Workspace** — el mecanismo por el cual el frontend mantiene la Empresa activa como estado de cliente, carga los permisos del Rol del usuario para esa Empresa, y renderiza el shell principal de la aplicación con navegación basada en roles.

Decisión de Workspace Context ya confirmada antes de iniciar (ver MASTER_CONTEXT.md):

- La Empresa activa reside en Zustand (cliente), nunca en el servidor.
- Cada petición al backend incluye `companyId` explícito en la ruta.
- No existe endpoint de "cambiar empresa activa".
- El backend permanece stateless respecto a la Empresa activa.

---

## 2. Resumen ejecutivo

EWO-004 no encontró ningún conflicto entre la documentación aprobada y el código existente. Todo lo que EWO-002 y EWO-003 dejaron pendiente para esta Work Order estaba claramente identificado: los guards, decoradores, servicios de RBAC y el store de Zustand ya existían; faltaba conectarlos en un shell de aplicación real con rutas protegidas por `companyId` y la carga efectiva de permisos.

Se agregó un único endpoint nuevo en el backend (`POST /auth/change-password`) para cubrir el caso de uso de cambio de contraseña desde el perfil, que el flujo de `password-reset` ya existente no cubre (requiere token de recuperación, no la sesión activa).

---

## 3. Archivos creados

### Backend

| Archivo                                                          | Descripción                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/authentication/dto/change-password.dto.ts` | DTO con validación de contraseña actual y nueva (mismo patrón de `PasswordResetConfirmDto`) |

### Frontend

| Archivo                                            | Descripción                                                                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app/[companyId]/layout.tsx`          | Shell principal: valida membresía en la Empresa del parámetro de ruta; carga permisos; renderiza `AppShell`          |
| `apps/web/src/app/[companyId]/app-shell.tsx`       | Barra lateral + encabezado: navegación filtrada por permisos, indicador de Empresa activa, cambio de empresa, logout |
| `apps/web/src/app/[companyId]/inicio/page.tsx`     | Dashboard inicial con bienvenida por nombre y rol; tarjetas placeholder para módulos futuros                         |
| `apps/web/src/app/configuracion/personal/page.tsx` | Perfil personal: edición de nombre/teléfono y cambio de contraseña con estado de éxito/error                         |
| `apps/web/src/hooks/use-my-permissions.ts`         | Carga `GET /companies/:id/my-permissions`; sincroniza resultado en Zustand `permissions[]`                           |
| `apps/web/src/hooks/use-has-permission.ts`         | Helper cosmético: comprueba `useSessionStore().permissions.includes(key)`                                            |
| `apps/web/src/hooks/use-update-profile.ts`         | Mutación TanStack Query para `PATCH /users/me`; invalida caché `['session', 'me']`                                   |
| `apps/web/src/hooks/use-change-password.ts`        | Mutación TanStack Query para `POST /auth/change-password`                                                            |
| `apps/web/src/lib/roles-client.ts`                 | Cliente tipado para `GET /companies/:id/my-permissions`                                                              |

---

## 4. Archivos modificados

| Archivo                                                            | Cambio                                                                                                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/api/src/modules/authentication/authentication.controller.ts` | Endpoint `POST /auth/change-password` con `AuthenticationGuard`                                                                                              |
| `apps/api/src/modules/authentication/services/auth.service.ts`     | Método `changePassword(userId, currentPassword, newPassword, context)`: verifica Argon2, actualiza hash, revoca todas las sesiones, emite `PASSWORD_CHANGED` |
| `apps/web/src/lib/auth-client.ts`                                  | Funciones `updateProfile` y `changePassword`                                                                                                                 |
| `packages/types/src/auth.ts`                                       | Tipos `UpdateProfileInput` y `UpdateProfileResponse`                                                                                                         |
| `apps/web/src/app/seleccionar-empresa/company-selector.tsx`        | Redirige a `/{companyId}/inicio` por defecto al seleccionar empresa (antes: `/`)                                                                             |

---

## 5. Comportamiento del Workspace Context

```
Usuario selecciona Empresa
  → setActiveCompany(companyId) [Zustand]
  → router.push(`/${companyId}/inicio`)
  → [companyId]/layout.tsx monta
  → useSession() verifica membresía del companyId en la URL
  → useMyPermissions(companyId) carga GET /companies/:companyId/my-permissions
  → setPermissions(keys) [Zustand]
  → AppShell filtra navegación por permissions[]
  → Cada petición de negocio incluye companyId explícito en la ruta
```

Cambio de Empresa:

```
Usuario hace click "Cambiar empresa"
  → router.push('/seleccionar-empresa?next=/{companyId}/inicio')
  → Selecciona otra empresa
  → setActiveCompany(nuevoCompanyId) [Zustand, permissions = []]
  → router.push(`/${nuevoCompanyId}/inicio`)
  → useMyPermissions carga nuevos permisos para la nueva clave de caché
  → TanStack Query invalida automáticamente toda caché con el companyId anterior
    al hacer nuevas peticiones con el nuevo companyId en la clave
```

---

## 6. Pruebas ejecutadas

`pnpm run check` completo en verde:

- lint (ESLint, 0 warnings, 0 errors)
- typecheck (TypeScript, 0 errores en los 9 paquetes)
- test (Vitest: todas las suites existentes en verde)
- test:integration (20.1 s; `@contaia/database` omitido por ausencia de Docker)
- build (Next.js 17 páginas generadas; NestJS compilado)

---

## 7. Validaciones de arquitectura

| Regla                                                             | Estado                                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Empresa activa en estado del cliente, nunca en servidor           | ✅ Zustand únicamente                                                                       |
| `companyId` explícito en cada petición de negocio                 | ✅ Todas las rutas de API incluyen `:companyId`                                             |
| Sin endpoint "cambiar empresa activa"                             | ✅ No se creó ninguno                                                                       |
| Permisos cosméticamente en cliente; autorización real en servidor | ✅ `useHasPermission` es solo para UI; `AuthenticationGuard` + `PermissionGuard` en backend |
| Membresía validada antes de renderizar contenido de Empresa       | ✅ `[companyId]/layout.tsx` redirige si no hay Membresía activa                             |
| Cambio de contraseña revoca todas las sesiones                    | ✅ `sessionsRepository.revokeAllForUser` en `AuthService.changePassword`                    |
| Caché de permisos con clave que incluye `companyId`               | ✅ `queryKey: ['permissions', companyId]`                                                   |

---

## 8. Riesgos y deuda técnica

| Ítem                                                 | Detalle                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migración de Prisma pendiente                        | Igual que EWO-001/002/003 — requiere Docker/PostgreSQL. Sin este paso, el backend no puede arrancar con base de datos real.                                                                                                                                                 |
| `app/[companyId]/` puede colidir con rutas estáticas | El segmento dinámico `[companyId]` captura cualquier ruta de primer nivel no reconocida. Las rutas existentes (`/empresas`, `/seleccionar-empresa`, etc.) están fuera de `[companyId]/` y no se ven afectadas. Monitorear si se agregan rutas de primer nivel en el futuro. |
| Dashboard es un placeholder                          | `[companyId]/inicio` no tiene datos reales todavía — los módulos de Contabilidad, Documentos e IA llegan en EWO-005+.                                                                                                                                                       |
| Navegación de barra lateral mínima                   | Solo muestra "Inicio" y "Empresas" porque no existen módulos adicionales aún. Crecerá con cada EWO de módulo.                                                                                                                                                               |
| No hay prueba unitaria para los nuevos hooks         | `useMyPermissions`, `useUpdateProfile`, `useChangePassword`: candidatos para pruebas en una WO de testing (docs/30_TESTING_STRATEGY.md).                                                                                                                                    |

---

## 9. Estado de EWO

**BLOCKED** — mismo bloqueo de infraestructura que EWO-003: la migración inicial de Prisma requiere Docker/PostgreSQL no disponible en este entorno.

Cuando Docker esté disponible, ejecutar exactamente:

```bash
cd apps/api
pnpm run db:migrate
# nombre sugerido: initial_schema
pnpm run db:seed
```

Después de la migración:

```bash
git add packages/database/prisma/migrations/
git commit -m "feat(database): generate initial Prisma migration (EWO-001/002/003/004 schema)"
```

---

## 10. Historial de cambios del informe

| Fecha      | Cambio                                                           | Responsable                  |
| ---------- | ---------------------------------------------------------------- | ---------------------------- |
| 2026-07-20 | Creación del informe de EWO-004 — User, RBAC & Workspace Context | Claude Code (implementación) |
