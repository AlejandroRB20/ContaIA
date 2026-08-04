# AI_CONTEXT.md — Estado Vivo para Continuidad de Sesión

> Lectura objetivo: **menos de 2 minutos**. Este documento contiene únicamente información viva — cambia casi a diario. No contiene documentación técnica: para eso, [`MASTER_CONTEXT.md`](MASTER_CONTEXT.md) y [`PROJECT_INDEX.md`](PROJECT_INDEX.md). Si estás retomando trabajo de ingeniería en este repositorio, lee **solo este archivo primero** — si necesitas más contexto, sigue sus enlaces.
>
> **Regla de mantenimiento:** este archivo se actualiza al final de cada sesión de ingeniería que cierre, corrija o audite una tarea. Es una edición mecánica de la tabla de abajo — nunca una reescritura de prosa. Ver [`DOCUMENTATION_STYLE_GUIDE.md`](DOCUMENTATION_STYLE_GUIDE.md) si tienes dudas de formato.

## Estado actual (2026-08-04)

| Campo                                                             | Valor                                                                                                                                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Proyecto                                                          | ContaIA — monorepo `apps/web` (Next.js) + `apps/api` (NestJS) + `packages/database` (Prisma)                                                                          |
| Versión de la documentación                                       | `MASTER_CONTEXT.md` v2.1 · Knowledge Platform v1.0 (este conjunto de archivos)                                                                                        |
| Work Order activa                                                 | **EWO-005 — Documents & Fiscal**, Bloque E ("Persistencia atómica CFDI")                                                                                              |
| Sprint / Bloque activo                                            | Sprint 2 de Bloque E — **`COMPLETADO`** · Sprint 1 ya `COMPLETADO` · Sprint 3 `IN_PROGRESS`                                                                           |
| Última tarea cerrada (`PASSED`)                                   | Corrección arquitectónica **D-009** — `issuedAtLocal: string` y columna `issued_at` como `VARCHAR(19)` — cierre administrativo 2026-08-03; `I-14` e `I-15` `RESOLVED` |
| Tareas implementadas, pendientes de auditoría (`READY_FOR_AUDIT`) | Ninguna                                                                                                                                                               |
| Siguiente paso inmediato                                          | Implementación controlada de `E5-S3-T06` con Claude Code, usando el análisis técnico ya aprobado y el contrato `issuedAtLocal` vigente                                |
| Tarea siguiente en la secuencia                                   | `E5-S3-T06` — habilitada, **no iniciada**. Sprint 3 `IN_PROGRESS`; `E5-S3-T07`–`T12` conservan su estado vigente (`BLOCKED`)                                          |
| Última auditoría cerrada                                          | [`D-009_FINAL_AUDIT.md`](docs/engineering/audits/D-009_FINAL_AUDIT.md) — `PASSED`                                                                                     |
| Detalle completo tarea por tarea                                  | [`EWO-005_IMPLEMENTATION_CHECKLIST.md`](docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md) sección 10 — única fuente detallada por tarea                           |

## Decisiones activas más relevantes

| ID    | Decisión                                                              | Por qué importa ahora                                                                   |
| ----- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| D-007 | Estrategia de concurrencia y persistencia atómica del agregado CFDI   | Rige todo el Bloque E — cualquier cambio en `persist-cfdi-aggregate.ts` debe respetarla |
| D-008 | Recuperación de `E5-S1-T07` vía migración correctiva versionada       | Precedente para futuras correcciones de migración                                       |
| D-009 | `Fecha` CFDI 4.0 → `issuedAtLocal: string`; namespace oficial del TFD | **APROBADA · IMPLEMENTADA · PASSED** — `E5-S3-T06` desbloqueada                         |

Registro completo: [`brain/DECISIONS.md`](brain/DECISIONS.md) · índice rápido: [`brain/DECISION_INDEX.md`](brain/DECISION_INDEX.md).

## Preguntas abiertas que bloquean trabajo

| ID    | Pregunta                                                               | Bloquea                                                                                                     |
| ----- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Q-001 | ¿Qué hacer ante un CFDI con `folioFiscal` duplicado de otro documento? | Clasificación final de errores AD-10.2/AD-11 — el worker no puede rechazar automáticamente hasta resolverla |

Registro completo: [`brain/QUESTIONS.md`](brain/QUESTIONS.md).

## Riesgos abiertos más relevantes

| ID    | Riesgo                                                                                             |
| ----- | -------------------------------------------------------------------------------------------------- |
| R-005 | Política de folio duplicado no definida (ligado a Q-001)                                           |
| R-010 | Sin outbox transaccional — pérdida posible de efectos externos post-commit, aceptado como post-MVP |

Registro completo: [`brain/RISKS.md`](brain/RISKS.md).

## Documentos críticos para continuar el trabajo de hoy

1. [`CLAUDE.md`](CLAUDE.md) — reglas obligatorias para Claude Code en este repositorio.
2. [`docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md`](docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md) — qué se hizo, tarea por tarea.
3. [`docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md`](docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md) — reglas arquitectónicas vinculantes del Bloque E (AD-10, AD-11).
4. [`brain/DECISIONS.md`](brain/DECISIONS.md) (D-007) y [`brain/QUESTIONS.md`](brain/QUESTIONS.md) (Q-001).

## Roles de IA en este proyecto

Protocolo completo: [`AI_PLAYBOOK.md`](AI_PLAYBOOK.md). Resumen de una línea cada uno:

- **Claude Code** — implementa dentro del alcance autorizado, nunca se autocertifica `PASSED`.
- **Codex** — audita `READ ONLY`, independiente; es el único que puede certificar `PASSED`.
- **ChatGPT** (u otra IA de planeación) — redacta las Work Orders/prompts de encargo y propone diseño; no toca el repositorio directamente.

## Reglas de sesión no negociables

- No modificar código, pruebas, `schema.prisma` o migraciones sin autorización explícita de alcance.
- Nunca marcar una tarea `PASSED` sin auditoría independiente `READ ONLY` de Codex.
- Nunca fijar un criterio fiscal/contable sin fuente validada por el responsable de producto (`CLAUDE.md` regla 6).
- Toda decisión nueva va a `brain/DECISIONS.md`; toda pregunta sin resolver a `brain/QUESTIONS.md`; todo riesgo a `brain/RISKS.md`; todo cambio a `CHANGELOG.md`. Nunca aquí, nunca en `MASTER_CONTEXT.md`.

## Deuda documental conocida

~45 referencias cruzadas en `docs/*.md` citan la numeración de secciones de `MASTER_CONTEXT.md` anterior a 2026-07-30. Mapa de resolución: [Mapeo de numeración histórico](MASTER_CONTEXT.md#16-mapeo-de-numeración-histórico). No es un bloqueador de ingeniería — es limpieza documental pendiente.

## Cierre de la iniciativa Knowledge Platform

Auditoría final `READ ONLY` (Codex, 2026-07-31) sobre HEAD `26356bffcc1c38df40a3eadd13981765a97c5a6b`: **`PASSED`**. Los ocho pilares documentales quedan adoptados como vigentes. Evidencia: [`KNOWLEDGE_PLATFORM_FINAL_AUDIT.md`](docs/engineering/audits/KNOWLEDGE_PLATFORM_FINAL_AUDIT.md); detalle en `MASTER_CONTEXT.md` §17. Este archivo sigue siendo la única fuente de estado vivo — el cierre no cambia esa regla.

---

**Si acabas de terminar una tarea de ingeniería:** actualiza la tabla "Estado actual" de este archivo antes de cerrar la sesión. Es la única acción de mantenimiento que este documento requiere.
