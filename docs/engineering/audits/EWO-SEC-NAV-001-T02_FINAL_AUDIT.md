# EWO-SEC-NAV-001 — T02: Auditoría final independiente

## Control del documento

| Campo             | Valor                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| Work Order        | `EWO-SEC-NAV-001 — Tenant Isolation & Navigation Contracts`              |
| Tarea             | `T02 — Company Switch`                                                   |
| Fecha             | 2026-08-04                                                               |
| Auditor           | Codex                                                                    |
| Tipo              | Auditoría final independiente `READ ONLY`                                |
| Snapshot auditado | `feature/frontend-ux-audit` · `b5b289d32fdcc8d7ab61fd62ecfe0316b8c75be8` |
| Veredicto         | **PASSED CON OBSERVACIONES**                                             |

## Alcance

Confirmar que el cambio manual de Empresa no conserva el contexto de la Empresa anterior y que un deep link solo se conserva cuando es interno, pertenece exactamente a la Empresa elegida y existe Membership activa.

## Fuera de alcance

- T01 y T03–T06, permisos, backend, migraciones, rutas CFDI y D-010/D-011/D-012.
- Rediseño del selector y cambios locales ajenos, incluidos los artefactos de documentos no versionados.

## Evidencia inspeccionada

- [Plan EWO-SEC-NAV-001](../EWO-SEC-NAV-001_TENANT_ISOLATION_PLAN.md) §16, `AI_CONTEXT.md`, `PROJECT_INDEX.md` y `CHANGELOG.md`.
- `safe-navigation.ts` y sus pruebas.
- `company-selector.tsx` y sus pruebas.
- `app-shell.tsx`, `[companyId]/layout.tsx` y `acceso/iniciar-sesion/login-form.tsx`.
- `MembershipsRepository.findAllForUser` y `UsersService.getMe`, que exponen al selector solo Memberships activas y no eliminadas.

## Verificación del cambio manual

`AppShell.handleSwitchCompany()` navega exclusivamente a `/seleccionar-empresa`, sin parámetro `next`. Al elegir Empresa B, `CompanySelector` primero ejecuta `setActiveCompany(B)` y después navega al destino resuelto con `chosenCompanyId = B`; sin `next`, el destino es `/B/inicio`.

No se encontró otra acción manual productiva que construya `/seleccionar-empresa?next=`. Las apariciones restantes con `next` son recuperación legítima de deep link desde login o desde la protección de `[companyId]/layout.tsx`.

## Verificación de deep links

`safeInternalPath` sigue rechazando destino vacío, externo, protocol-relative y con barra invertida inicial. `resolveDestination` es el único punto de decisión posterior a elegir Empresa y:

- devuelve `/{chosenCompanyId}/inicio` sin `next`;
- acepta únicamente la ruta interna cuyo primer segmento es exactamente `chosenCompanyId`;
- rechaza otra Empresa, incluido el caso lógico `abc` frente a `abc-def`, por comparación exacta de segmento;
- rechaza ruta externa, inválida o protocol-relative;
- hace fallback si no existe Membership disponible para la Empresa elegida.

El selector recibe Memberships de `/users/me`; el repositorio de backend filtra por `membershipStatus: ACTIVE` y `deletedAt: null`. El layout valida Membership para el `companyId` de ruta y sincroniza la empresa activa con ese parámetro, por lo que no restaura Empresa A tras navegar a Empresa B.

## Verificación de `resolveDestination`

La función reutiliza `safeInternalPath(next, '')`, extrae el primer segmento con `split('/')` y exige igualdad exacta antes de comprobar la Membership. No hay comparación por prefijo ni redirección a una URL externa.

## Pruebas ejecutadas

| Comando                                                                                                                    | Resultado                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm --filter @contaia/web test -- src/lib/safe-navigation.test.ts src/app/seleccionar-empresa/company-selector.test.tsx` | 2 archivos, 19/19 PASS                                                                            |
| `pnpm --filter @contaia/web run typecheck`                                                                                 | FAIL por siete errores en pruebas ajenas de documentos/inicio; ningún error apunta a archivos T02 |
| ESLint acotado a archivos T02, layout y login                                                                              | PASS, sin advertencias                                                                            |
| `pnpm --filter @contaia/web run build`                                                                                     | PASS; compila rutas productivas de T02                                                            |

Las pruebas cubren ruta sin `next`, deep link válido, otra Empresa, URL externa, protocol-relative y Membership ausente; el filtro del backend demuestra que una Membership inactiva no llega al selector.

## Resultados de validación

El typecheck global está contaminado por cambios locales ajenos: referencias a `SessionState` y `DocumentDto` no exportados, un mock de `fetch` incompatible y `afterEach` no declarado en pruebas de documentos/inicio. No afectan T02; el build productivo y el lint específico completaron correctamente.

## Hallazgos

| ID         | Severidad | Ubicación                                    | Problema y evidencia                                                                                                                                                                     | Impacto                                                                | Corrección mínima                                                                 | Estado                 |
| ---------- | --------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------- |
| T02-OBS-01 | BAJO      | `apps/web/src/app/[companyId]/app-shell.tsx` | No existe prueba de interacción directa del botón “Cambiar empresa”. El handler sí es verificable y navega solo a `/seleccionar-empresa`; selector y resolver tienen cobertura dirigida. | Riesgo bajo de regresión que vuelva a introducir `next` en el handler. | Añadir una prueba de `AppShell` que aserte `router.push('/seleccionar-empresa')`. | ABIERTO, no bloqueante |

## Riesgos residuales

El typecheck global de frontend no es actualmente una señal verde por errores ajenos a T02. El build de producción sí terminó y las pruebas/lint específicos de la tarea pasan.

## Veredicto final

**PASSED CON OBSERVACIONES**

T02 cumple el contrato de cambio manual y recuperación segura de deep links. La Empresa elegida gobierna el destino y no se reutiliza el contexto de una Empresa anterior. Permanece solo la observación BAJA de cobertura directa del botón.

## Estado recomendado de T02

`T02: PASSED`

## Historial

| Fecha      | Evento                                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-04 | Creación de la auditoría final independiente `READ ONLY`; no modifica código, pruebas, decisiones, Work Order ni estados administrativos. |
