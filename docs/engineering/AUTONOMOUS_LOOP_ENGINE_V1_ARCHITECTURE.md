# ContaIA Autonomous Loop Engine v1 — Arquitectura y gobierno

## Control del documento

| Campo                       | Valor                                                                                                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Versión                     | 0.2                                                                                                                                                                                                                                                                       |
| Estado                      | **PROPUESTA — PENDIENTE DE RATIFICACIÓN.** No autoriza implementación, ejecución autónoma ni cambio de estado de ninguna EWO.                                                                                                                                             |
| Fecha de creación           | 2026-08-08                                                                                                                                                                                                                                                                |
| Propietario lógico          | Responsable de producto de ContaIA (Alejandro Reyes Bocanegra)                                                                                                                                                                                                            |
| Alcance                     | Motor de ejecución de tarjetas de ingeniería del repositorio. **No es** arquitectura del producto ContaIA ni de la IA que consumen los usuarios finales.                                                                                                                  |
| Documentos relacionados     | [`AI_PLAYBOOK.md`](../../AI_PLAYBOOK.md), [`CLAUDE.md`](../../CLAUDE.md), [`DOCUMENTATION_STYLE_GUIDE.md`](../../DOCUMENTATION_STYLE_GUIDE.md), [`AI_CONTEXT.md`](../../AI_CONTEXT.md), [`brain/DECISIONS.md`](../../brain/DECISIONS.md)                                  |
| Identificador de Work Order | **No asignado.** Asignar un `EWO-NNN` es decisión humana; este documento no lo reclama.                                                                                                                                                                                   |
| Corrección v0.2             | Ruta canónica del motor, ubicación de worktrees y regla del auditor contradictorio, verificadas contra las implementaciones reales `7bdf159` y `2e128c7`. Detalle y matriz de reconciliación: [`LOOP-000_GOVERNANCE_SUBSTRATE.md`](LOOP-000_GOVERNANCE_SUBSTRATE.md) §12. |

> **Este documento no cambia el estado de ninguna tarea, EWO, decisión o auditoría.** Describe un motor propuesto. Mientras siga en `PROPUESTA`, ningún agente puede ejecutar el ciclo aquí descrito.

---

## 1. Propósito y principio central

ContaIA depende hoy de un prompt manual por microtarea. El Loop Engine sustituye esa intervención **en el tramo mecánico** del ciclo, sin sustituir ninguna autoridad humana:

```text
tarjeta READY
  → dispatcher
  → agente constructor (worktree aislado)
  → pruebas
  → reparación automática limitada
  → auditor independiente
  → reparación limitada
  → candidato de integración
  → STOP en READY_FOR_INTEGRATION
```

**El motor se detiene en `READY_FOR_INTEGRATION`.** No hace `push`, no hace merge, no toca la rama compartida. La integración es un gate separado, humano en v1.

### 1.1 Restricción absoluta

Ningún agente autónomo escribe sobre `feature/frontend-ux-audit` (rama compartida vigente) ni sobre `main`. La única ruta permitida:

```text
base commit inmutable
  ↓
worktree aislado (1 tarea = 1 worktree)
  ↓
rama de tarea (prefijo reservado)
  ↓
commits candidatos
  ↓
auditoría independiente
  ↓
READY_FOR_INTEGRATION  ← el motor termina aquí
```

Esto no relaja `.claude/rules/40-parallel-work.md` ni `00-governance.md`: los formaliza como invariantes ejecutables.

---

## 2. Arquitectura de automatización existente

Inventario verificado por lectura directa del repositorio el 2026-08-08 sobre `HEAD dac9428`.

| Componente                       | Ubicación                                                                                                                                                          | Qué aporta                                                                                                               | Estado en Git                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| Protocolo de roles y autoridad   | `AI_PLAYBOOK.md`                                                                                                                                                   | Los 3 roles (ChatGPT / Claude Code / Codex), la regla de no-autocertificación y el ciclo `READY_FOR_AUDIT → PASSED`      | **Versionado**                            |
| Reglas de gobierno               | `.claude/rules/00-governance.md`                                                                                                                                   | Fuente de verdad, prohibición de merge/push/reset, no autocertificar `PASSED`                                            | **NO versionado**                         |
| Reglas de worktrees              | `.claude/rules/40-parallel-work.md`                                                                                                                                | Un constructor por worktree; secuencia constructor → QA → arquitectura → seguridad/fiscal → PR                           | **NO versionado**                         |
| Reglas de seguridad multiempresa | `.claude/rules/10-multitenancy-security.md`                                                                                                                        | D-002/D-006, aislamiento por empresa                                                                                     | **NO versionado**                         |
| Reglas fiscales                  | `.claude/rules/20-fiscal-data-safety.md`                                                                                                                           | Prohibición de criterio fiscal sin fuente; migraciones requieren WO aprobada                                             | **NO versionado**                         |
| Reglas de calidad y alcance      | `.claude/rules/30-quality-scope.md`                                                                                                                                | Prohibición de debilitar pruebas; validaciones proporcionales                                                            | **NO versionado**                         |
| Orquestador                      | `.claude/agents/contaia-orchestrator.md`                                                                                                                           | Dispatcher manual: preflight, delegación, consolidación. **No implementa ni certifica.**                                 | **NO versionado**                         |
| Agentes especialistas (7)        | `.claude/agents/{principal-architect, backend-engineer, frontend-engineer, qa-engineer, security-reviewer, fiscal-accounting-reviewer, documentation-engineer}.md` | Contratos por rol con `tools`, `model`, `effort`, `maxTurns`, entrega y condiciones de parada                            | **NO versionado**                         |
| Cola nocturna                    | `.claude/automation/nightly-queue.md`                                                                                                                              | Cola de 7 tareas con estados operativos, dependencias y regla de selección                                               | **NO versionado**                         |
| Permisos de herramienta          | `.claude/settings.json`                                                                                                                                            | `deny`: `git merge`, `git reset --hard`, `git clean`. `ask`: commit, push, rebase, migraciones. `worktree.baseRef: head` | **NO versionado**                         |
| Skills de dominio (4)            | `.claude/skills/contaia-{api-module, web-feature, quality-gate, fiscal-safety}/`                                                                                   | Procedimientos por dominio                                                                                               | **NO versionado**                         |
| AI OS (11 docs)                  | `docs/AI_OS/`                                                                                                                                                      | Onboarding, reglas permanentes, catálogo de modelos, biblioteca de prompts                                               | **NO versionado**                         |
| Severidades de hallazgo          | `AI_PLAYBOOK.md`, agentes, auditorías                                                                                                                              | `CRÍTICO` / `ALTO` / `MEDIO` / `BAJO`                                                                                    | **Versionado** (uso), definición dispersa |
| Convención `MISSION_ID`          | Prompts de sesión                                                                                                                                                  | `CONTAIA-<ÁMBITO>-<ACCIÓN>` — convención de facto, **no documentada** en ningún archivo                                  | **No existe como artefacto**              |
| Auditorías                       | `docs/engineering/audits/*_FINAL_AUDIT.md`                                                                                                                         | Veredicto `PASSED`/`FAILED`/`CHANGES_REQUESTED`                                                                          | **Versionado**                            |
| Mecanismo de locks               | —                                                                                                                                                                  | **No existe.** Ni de worktree, ni de tarea, ni de agente.                                                                | **No existe**                             |
| Registro de transiciones         | —                                                                                                                                                                  | **No existe.** El historial vive en `CHANGELOG.md` y en checklists, en prosa.                                            | **No existe**                             |

### 2.1 Hallazgo bloqueante — el sustrato de gobierno no está versionado

**Severidad: `CRÍTICO`.**

Verificado: `git ls-files .claude docs/AI_OS` devuelve **un solo archivo** (`.claude/launch.json`). Todo lo demás es local.

Consecuencia demostrada empíricamente sobre un worktree real creado desde `dac9428`:

```text
.worktrees/<cualquiera>/.claude/  → solo launch.json
.worktrees/<cualquiera>/.claude/rules/     → NO EXISTE
.worktrees/<cualquiera>/.claude/agents/    → NO EXISTE
.worktrees/<cualquiera>/.claude/settings.json → NO EXISTE
.worktrees/<cualquiera>/docs/AI_OS/        → NO EXISTE
```

Es decir: **un agente que se ejecuta hoy en un worktree aislado — la superficie que el Loop Engine exige — opera sin las cinco reglas de gobierno, sin la definición de su propio rol, y sin la lista `deny` que bloquea `git reset --hard`, `git clean` y `git merge`.** La protección que el equipo cree tener sólo existe en el checkout principal.

Esto es un prerrequisito duro. **V1 no puede ejecutarse hasta versionar el sustrato** (tarjeta `LOOP-000`, §17).

### 2.2 Componentes reutilizables — no duplicar

| Necesidad de v1               | Ya existe                                           | Acción                                                                                         |
| ----------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Definiciones de rol de agente | `.claude/agents/*.md` (8)                           | **Reutilizar.** Añadir campos de contrato, no reescribir.                                      |
| Reglas de gobierno            | `.claude/rules/*.md` (5)                            | **Reutilizar como está.** El motor las hace exigibles; no las reinterpreta.                    |
| Cola de tareas                | `.claude/automation/nightly-queue.md`               | **Evolucionar** a formato legible por máquina. Conserva su semántica y su autoridad reservada. |
| Dispatcher                    | `.claude/agents/contaia-orchestrator.md`            | **Reutilizar.** Ya hace preflight y delegación; le falta la máquina de estados y el lock.      |
| QA independiente              | `.claude/agents/qa-engineer.md` + Codex `READ ONLY` | **Reutilizar.** Ya es `READ ONLY` y no puede emitir `PASSED`.                                  |
| Severidades                   | `CRÍTICO`/`ALTO`/`MEDIO`/`BAJO`                     | **Reutilizar.** Prohibido inventar severidades nuevas.                                         |
| Veredictos de auditoría       | `PASSED`/`FAILED`/`CHANGES_REQUESTED`               | **Reutilizar.**                                                                                |
| Aislamiento de ejecución      | Worktrees + `worktree.baseRef: head`                | **Reutilizar.** Añadir ownership lock.                                                         |
| Evidencia de cierre           | `docs/engineering/audits/*_FINAL_AUDIT.md`          | **Reutilizar.** El motor no crea un formato paralelo de auditoría.                             |

---

## 3. Máquina de estados

### 3.1 Familia de estados y su relación con el vocabulario canónico

`DOCUMENTATION_STYLE_GUIDE.md` §3 fija la familia **Tarea de EWO**: `BLOCKED → READY_FOR_AUDIT → PASSED`. El Loop Engine **no la sustituye ni la amplía**: introduce una familia distinta, **Tarjeta del Loop Engine**, que describe la _ejecución mecánica_ de una tarjeta, y que se proyecta sobre la familia canónica en dos puntos de contacto.

| Estado del Loop Engine  | Proyección sobre la familia canónica de EWO                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `READY` … `REPAIRING`   | La tarea de EWO sigue en su estado previo. Sin efecto documental.                                                                                    |
| `READY_FOR_QA`          | Equivale a `READY_FOR_AUDIT` de la familia canónica.                                                                                                 |
| `READY_FOR_INTEGRATION` | Sigue siendo `READY_FOR_AUDIT` canónico: **el motor nunca produce `PASSED`.**                                                                        |
| `PASSED`                | **Espejo de solo lectura.** Sólo puede alcanzarse tras el cierre administrativo humano descrito en `AI_PLAYBOOK.md`. El motor lo lee; no lo escribe. |

Registrar esta familia nueva exige actualizar `DOCUMENTATION_STYLE_GUIDE.md` §3 — **gate humano** (§13), no acción del motor.

### 3.2 Definición de estados

| Estado                   | Significado                                                     | Puede entrar                                      | Puede salir                                        | Evidencia requerida para entrar                                              | Comportamiento ante error                                        |
| ------------------------ | --------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `READY`                  | Tarjeta elegible; dependencias satisfechas                      | Humano; dispatcher tras satisfacer dependencias   | Dispatcher                                         | Tarjeta completa con criterios de aceptación y `allowed_write`               | Si falta un campo del contrato → `BLOCKED`                       |
| `CLAIMED`                | Tarjeta reservada; lock adquirido; worktree aún no creado       | Dispatcher                                        | Dispatcher                                         | Lock atómico adquirido + `base_commit` fijado                                | Fallo de lock → vuelve a `READY` sin efectos                     |
| `IMPLEMENTING`           | Constructor editando en su worktree                             | Dispatcher                                        | Constructor                                        | Worktree creado en `base_commit`; contrato entregado                         | Agente desaparece → `RECOVERY` (§17)                             |
| `TESTING`                | Ejecutando `test_commands`, typecheck y lint                    | Constructor                                       | Constructor                                        | Commit candidato existente en la rama de tarea                               | Timeout → cuenta como fallo de iteración                         |
| `REPAIRING`              | Corrigiendo fallos propios de pruebas o de QA                   | Constructor                                       | Constructor                                        | Fallo registrado + `repair_iteration` incrementada                           | Supera el límite → `BLOCKED` o `BLOCKED_ARCHITECTURE`            |
| `READY_FOR_QA`           | Verde en local; listo para auditoría independiente              | Constructor                                       | Dispatcher                                         | Pruebas/typecheck/lint verdes + `git diff --check` limpio + commit candidato | Evidencia incompleta → `REPAIRING`                               |
| `QA`                     | Auditor independiente revisando `READ ONLY`                     | Dispatcher                                        | Auditor                                            | Contrato de QA con `source_commit` y `base_commit`                           | Auditor desaparece → `RECOVERY`; **nunca** promueve por silencio |
| `QA_FAILED`              | Auditoría con hallazgos que impiden avanzar                     | Auditor                                           | Dispatcher                                         | Hallazgos con severidad, ubicación, impacto y corrección mínima              | Sin hallazgos tipificados → `BLOCKED_HUMAN_DECISION`             |
| `READY_FOR_INTEGRATION`  | Candidato auditado, sin hallazgos bloqueantes                   | Auditor vía dispatcher                            | **Sólo humano** (o gate de integración autorizado) | Paquete de integración completo (§14)                                        | — (estado terminal del motor)                                    |
| `INTEGRATING`            | Integración en curso                                            | **Sólo humano**                                   | Humano                                             | Autorización humana explícita                                                | Conflicto → `BLOCKED_HUMAN_DECISION`                             |
| `INTEGRATED`             | Cambio presente en la rama destino                              | Humano                                            | Humano                                             | Commit de integración verificable                                            | Regresión posterior → tarjeta nueva, nunca reapertura silenciosa |
| `PASSED`                 | Cierre administrativo consumado                                 | **Sólo humano**, tras veredicto `PASSED` de Codex | — (terminal)                                       | `_FINAL_AUDIT.md` + checklist actualizado                                    | —                                                                |
| `BLOCKED`                | Bloqueo mecánico: límite de reparación, dependencia, entorno    | Dispatcher o constructor                          | **Sólo humano**                                    | `blocked_reason` tipificada                                                  | —                                                                |
| `BLOCKED_ARCHITECTURE`   | El ciclo de QA se agotó: el problema es de diseño, no de código | Dispatcher                                        | **Sólo humano**                                    | 2 ciclos de QA fallidos con hallazgos                                        | Exige revisión de `principal-architect` antes de reactivar       |
| `BLOCKED_HUMAN_DECISION` | Requiere autoridad humana (§13)                                 | Cualquier agente                                  | **Sólo humano**                                    | Motivo + decisión concreta solicitada                                        | —                                                                |
| `CANCELLED`              | Tarjeta retirada                                                | **Sólo humano**                                   | — (terminal)                                       | Motivo registrado                                                            | Worktree y lock se liberan; commits se conservan                 |

### 3.3 Matriz de transiciones

`✔` permitida · `·` prohibida · `H` exige autoridad humana

| Desde ↓ / Hacia →         | READY | CLAIMED | IMPLEMENTING | TESTING | REPAIRING | READY_FOR_QA | QA  | QA_FAILED | READY_FOR_INTEGRATION | INTEGRATING | INTEGRATED | PASSED | BLOCKED | BLOCKED_ARCH | BLOCKED_HUMAN | CANCELLED |
| ------------------------- | ----- | ------- | ------------ | ------- | --------- | ------------ | --- | --------- | --------------------- | ----------- | ---------- | ------ | ------- | ------------ | ------------- | --------- |
| **READY**                 | ·     | ✔       | ·            | ·       | ·         | ·            | ·   | ·         | ·                     | ·           | ·          | ·      | ✔       | ·            | ✔             | H         |
| **CLAIMED**               | ✔     | ·       | ✔            | ·       | ·         | ·            | ·   | ·         | ·                     | ·           | ·          | ·      | ✔       | ·            | ✔             | H         |
| **IMPLEMENTING**          | ·     | ·       | ·            | ✔       | ·         | ·            | ·   | ·         | ·                     | ·           | ·          | ·      | ✔       | ·            | ✔             | H         |
| **TESTING**               | ·     | ·       | ·            | ·       | ✔         | ✔            | ·   | ·         | ·                     | ·           | ·          | ·      | ✔       | ·            | ✔             | H         |
| **REPAIRING**             | ·     | ·       | ·            | ✔       | ·         | ·            | ·   | ·         | ·                     | ·           | ·          | ·      | ✔       | ✔            | ✔             | H         |
| **READY_FOR_QA**          | ·     | ·       | ·            | ·       | ·         | ·            | ✔   | ·         | ·                     | ·           | ·          | ·      | ✔       | ·            | ✔             | H         |
| **QA**                    | ·     | ·       | ·            | ·       | ·         | ·            | ·   | ✔         | ✔                     | ·           | ·          | ·      | ✔       | ·            | ✔             | H         |
| **QA_FAILED**             | ·     | ·       | ·            | ·       | ✔         | ·            | ·   | ·         | ·                     | ·           | ·          | ·      | ✔       | ✔            | ✔             | H         |
| **READY_FOR_INTEGRATION** | ·     | ·       | ·            | ·       | ·         | ·            | ·   | ·         | ·                     | H           | ·          | ·      | ✔       | ·            | ✔             | H         |
| **INTEGRATING**           | ·     | ·       | ·            | ·       | ·         | ·            | ·   | ·         | ·                     | ·           | H          | ·      | ·       | ·            | ✔             | H         |
| **INTEGRATED**            | ·     | ·       | ·            | ·       | ·         | ·            | ·   | ·         | ·                     | ·           | ·          | H      | ·       | ·            | ✔             | ·         |
| **PASSED**                | ·     | ·       | ·            | ·       | ·         | ·            | ·   | ·         | ·                     | ·           | ·          | ·      | ·       | ·            | ·             | ·         |
| **BLOCKED**               | H     | ·       | ·            | ·       | ·         | ·            | ·   | ·         | ·                     | ·           | ·          | ·      | ·       | ·            | ✔             | H         |
| **BLOCKED_ARCH**          | H     | ·       | ·            | ·       | ·         | ·            | ·   | ·         | ·                     | ·           | ·          | ·      | ·       | ·            | ✔             | H         |
| **BLOCKED_HUMAN**         | H     | ·       | ·            | ·       | ·         | ·            | ·   | ·         | H                     | ·           | ·          | ·      | ·       | ·            | ·             | H         |
| **CANCELLED**             | ·     | ·       | ·            | ·       | ·         | ·            | ·   | ·         | ·                     | ·           | ·          | ·      | ·       | ·            | ·             | ·         |

**Transiciones explícitamente prohibidas, sin excepción:**

1. `IMPLEMENTING → READY_FOR_INTEGRATION` — saltarse pruebas y QA.
2. `TESTING → PASSED`, `READY_FOR_QA → PASSED`, `QA → PASSED` — autocertificación. Sólo el cierre humano produce `PASSED`.
3. `QA → INTEGRATED` — saltarse el gate de integración.
4. Cualquier transición hacia `READY` desde un estado `BLOCKED*` sin autoridad humana — permitiría auto-reset del contador (§5).
5. Cualquier salida de `PASSED` o `CANCELLED` — son terminales.
6. Cualquier transición ejecutada por un agente que no posee el lock de la tarjeta (§9).

---

## 4. Clasificación de trabajo (`risk_class`)

| Clase           | Ejemplos                                                                 | Modelo mínimo del constructor                                           | QA independiente                              | Gate humano previo                              | Gate humano final |
| --------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------- | ----------------- |
| `STANDARD`      | Componente React, hook, endpoint sin cambio de contrato, prueba unitaria | Sonnet                                                                  | Requerida                                     | No                                              | Integración       |
| `DOCUMENTATION` | Sincronización documental, índices, redacción sin cambio de estado       | Sonnet                                                                  | Requerida (ligera)                            | No                                              | Integración       |
| `CRITICAL`      | Cambio de contrato API, autorización, flujo transaccional                | Sonnet                                                                  | **Requerida e independiente del constructor** | No                                              | Integración       |
| `ARCHITECTURE`  | Decisión `D-XXX`, frontera transaccional, contrato entre módulos         | **Opus para el diseño**; Sonnet puede implementar el diseño ya aprobado | Requerida                                     | **Sí** — diseño ratificado antes de implementar | Integración       |
| `SECURITY`      | Guards, sesión, MFA, aislamiento multiempresa, secretos                  | **Opus**                                                                | Requerida + `security-reviewer`               | **Sí**                                          | Integración       |
| `FISCAL`        | CFDI, SAT, RFC, IVA/ISR, cálculo, catálogos, textos fiscales             | **Opus**                                                                | Requerida + `fiscal-accounting-reviewer`      | **Sí** — fuente oficial validada                | Integración       |
| `MIGRATION`     | `schema.prisma`, migraciones, seeds con efecto en datos                  | **Opus**                                                                | Requerida + arquitectura                      | **Sí** — WO aprobada y plan de reversión        | Integración       |

### 4.1 Regla de escalamiento

Escalar a Opus cuando ocurra **cualquiera**:

1. `risk_class` ∈ {`ARCHITECTURE`, `SECURITY`, `FISCAL`, `MIGRATION`}.
2. `repair_iteration ≥ 3` en una tarjeta `STANDARD` o `CRITICAL` — tres intentos fallidos indican que el problema no es de ejecución.
3. `qa_iteration = 1` con hallazgo `ALTO` o `CRÍTICO`.
4. El constructor reporta contradicción entre fuentes canónicas.

El escalamiento **no reinicia los contadores** (§5). Cambia quién ejecuta, no cuánto margen queda.

---

## 5. Límites de ciclo

```yaml
MAX_IMPLEMENTATION_REPAIR_ITERATIONS: 5 # TESTING → REPAIRING → TESTING
MAX_QA_REPAIR_ITERATIONS: 2 # QA_FAILED → REPAIRING → READY_FOR_QA → QA
```

- Superar 5 reparaciones de implementación → **`BLOCKED`** (`blocked_reason: implementation_repair_limit_exceeded`).
- Superar 2 ciclos de QA → **`BLOCKED_ARCHITECTURE`** (`blocked_reason: qa_repair_limit_exceeded`).

**Reglas duras:**

1. **Sin auto-reset.** Ningún agente puede poner a cero un contador. Sólo un humano, al desbloquear, decide si reinicia o mantiene.
2. **Los contadores son independientes.** Reparar por QA no consume presupuesto de implementación ni al revés.
3. **Los contadores persisten** en el estado de la tarjeta, no en el contexto del agente: sobreviven a la muerte del proceso.
4. **Un timeout de pruebas consume iteración.** Si no, un test colgado genera un bucle infinito gratuito.
5. **Escalar de modelo no otorga iteraciones nuevas.**

---

## 6. Contrato de agente (entrada)

Formato: **YAML front-matter + cuerpo Markdown** — el mismo patrón que ya usan `.claude/agents/*.md`. No se introduce un formato nuevo.

Ubicación: `.claude/automation/loop-engine/contracts/<task_id>.md` (runtime, no versionado).

```yaml
---
task_id: LOOP-E5S3T10-001          # estable, único, nunca reutilizado
mission_id: CONTAIA-E5-S3-T10-CHECKSUM   # convención <ÁMBITO>-<ACCIÓN>, ver §6.1
work_order: EWO-005                # EWO o WO que autoriza el trabajo
card_ref: docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md#e5-s3-t10
risk_class: STANDARD               # §4
agent_id: CLAUDE-01                # quién ejecuta
agent_role: backend-engineer       # debe existir en .claude/agents/

base_commit: dac9428272177b475d6adb400182daeba4e5ad64   # SHA completo, inmutable
branch: loop/e5-s3-t10-checksum    # prefijo reservado loop/
worktree: .worktrees/loop/e5-s3-t10-checksum

allowed_write:                     # lista blanca; todo lo demás es de solo lectura
  - apps/api/src/modules/xml-processing/**
  - apps/api/src/modules/xml-processing/*.spec.ts
forbidden_scope:                   # prohibición explícita, gana sobre allowed_write
  - packages/database/prisma/**
  - brain/DECISIONS.md
  - AI_CONTEXT.md
  - CHANGELOG.md
  - docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md

dependencies:                      # task_ids que deben estar INTEGRATED o PASSED
  - LOOP-E5S3T07-001

acceptance_criteria:               # verificables, trazables a la tarjeta canónica
  - id: AC-1
    text: "El checksum SHA-256 se calcula sobre el Buffer descargado, sin reencodear."
    verified_by: apps/api/src/modules/xml-processing/checksum.spec.ts

test_commands:                     # exactos y no destructivos
  - pnpm --filter @contaia/api exec tsc --noEmit
  - pnpm --filter @contaia/api exec eslint src/modules/xml-processing
  - pnpm --filter @contaia/api exec jest src/modules/xml-processing

max_repairs: 5                     # espeja MAX_IMPLEMENTATION_REPAIR_ITERATIONS
qa_required: true
human_gate_required: false         # true para ARCHITECTURE/SECURITY/FISCAL/MIGRATION
---

# Contexto de la tarjeta

Prosa mínima. **No sustituye** los campos estructurados: si el texto contradice
el YAML, gana el YAML y el agente reporta la contradicción.
```

### 6.1 Convención `MISSION_ID`

De facto en uso, **no documentada** hasta ahora: `CONTAIA-<ÁMBITO>-<ACCIÓN>` en `SCREAMING-KEBAB-CASE`. Ejemplos reales observados: `CONTAIA-D014-FINAL-ARCHITECTURE-REVIEW`, `CONTAIA-T01-T02-DIRTY-TREE-PRESERVATION`. Se formaliza aquí sin cambiarla.

### 6.2 Reglas del contrato

1. `allowed_write` es lista blanca; `forbidden_scope` gana siempre.
2. Un archivo fuera de `allowed_write` que el agente necesite tocar → **`BLOCKED_HUMAN_DECISION`**, nunca ampliación unilateral.
3. `base_commit` es un SHA completo inmutable. Si `HEAD` de la rama compartida avanza, el candidato **no** se rebasa solo (§17.8).
4. Sin `acceptance_criteria` verificables no hay `READY`.
5. `test_commands` no puede contener comandos destructivos, migraciones ni operaciones remotas.

---

## 7. Contrato de resultado (salida)

Mismo formato, escrito por el agente a `.claude/automation/loop-engine/results/<task_id>.<iteration>.md`.

```yaml
---
task_id: LOOP-E5S3T10-001
mission_id: CONTAIA-E5-S3-T10-CHECKSUM
agent_id: CLAUDE-01
status: READY_FOR_QA # estado alcanzado, de §3.2
next_transition: QA # transición propuesta; el dispatcher la valida

commit: 7f3a91c... # SHA del candidato; null si no hubo commit
base_commit: dac9428...
branch: loop/e5-s3-t10-checksum

files_changed:
  - path: apps/api/src/modules/xml-processing/checksum.ts
    change: modified
  - path: apps/api/src/modules/xml-processing/checksum.spec.ts
    change: added

tests:
  command: pnpm --filter @contaia/api exec jest src/modules/xml-processing
  result: PASS # PASS | FAIL | NOT_RUN | TIMEOUT
  suites: 3
  cases: 41
  detail: '41/41'
typecheck:
  command: pnpm --filter @contaia/api exec tsc --noEmit
  result: PASS
lint:
  command: pnpm --filter @contaia/api exec eslint src/modules/xml-processing
  result: PASS

findings: [] # severidades §12; el constructor reporta las propias
repair_iteration: 0
qa_iteration: 0
blocked_reason: null # tipificada; obligatoria si status empieza por BLOCKED
---
# Evidencia

Qué se hizo, qué no se pudo verificar y por qué. Un `NOT_RUN` sin motivo
declarado invalida el resultado.
```

**Reglas:** `status: PASSED` es siempre inválido viniendo de un agente. `tests.result: NOT_RUN` sin motivo → el dispatcher devuelve a `REPAIRING`. `findings` con `CRÍTICO`/`ALTO` es incompatible con `READY_FOR_INTEGRATION` (§12).

---

## 8. Fuente de eventos y observabilidad

**Sin base de datos.** Log append-only en JSONL más un archivo de estado por tarjeta.

```text
.claude/automation/loop-engine/
├── lib/**, cli.mjs, test/**      # VERSIONADO — código del motor
├── README.md                     # VERSIONADO — documentación operativa
├── queue.yaml                    # VERSIONADO — tarjetas y dependencias
└── state/                        # IGNORADO — todo lo de aquí es efímero
    ├── contracts/<task_id>.md
    ├── results/<task_id>.<n>.md
    ├── <task_id>.json            # estado y contadores actuales
    ├── locks/<task_id>.lock.json # ownership (§9)
    └── events.jsonl              # log append-only de transiciones
```

**La frontera es `state/`, no el directorio entero:** el código del motor y las
definiciones de tarjeta se versionan; todo lo que vive bajo `state/` es estado de
ejecución y se ignora. La historia del proyecto sigue siendo `CHANGELOG.md` y los
`_FINAL_AUDIT.md`, nunca `events.jsonl`.

Evento (una línea JSON por transición):

```json
{
  "ts": "2026-08-08T13:40:12Z",
  "mission_id": "CONTAIA-E5-S3-T10-CHECKSUM",
  "task_id": "LOOP-E5S3T10-001",
  "agent_id": "CLAUDE-01",
  "from_state": "TESTING",
  "to_state": "READY_FOR_QA",
  "repair_iteration": 1,
  "qa_iteration": 0,
  "commit": "7f3a91c",
  "result": "PASS",
  "note": null
}
```

Append-only, nunca reescrito. `state/<task_id>.json` es una proyección derivable del log: si se corrompe, se reconstruye reproduciéndolo.

---

## 9. Ownership de worktree

**Invariante: 1 tarjeta = 1 worktree = 1 rama = 1 agente dueño.**

Lock en `.claude/automation/loop-engine/state/locks/<task_id>.lock.json`, adquirido por **creación exclusiva** del archivo (`O_EXCL`): si ya existe, la adquisición falla. Es la primitiva atómica disponible sin infraestructura nueva.

**Ubicación de los worktrees de tarea: `.worktrees/loop/<task_id>`.** Queda
**prohibido** usar `.claude/worktrees/`: ese directorio aloja los worktrees
efímeros que Claude Code crea y destruye por su cuenta (y ya está en
`.gitignore` como tal), de modo que un worktree de tarea allí podría ser
reciclado por un proceso ajeno al motor. Ver
[`LOOP-000_GOVERNANCE_SUBSTRATE.md`](LOOP-000_GOVERNANCE_SUBSTRATE.md) §6.2.

```json
{
  "mission_id": "CONTAIA-E5-S3-T10-CHECKSUM",
  "task_id": "LOOP-E5S3T10-001",
  "agent_id": "CLAUDE-01",
  "agent_role": "backend-engineer",
  "worktree": ".worktrees/loop/e5-s3-t10-checksum",
  "branch": "loop/e5-s3-t10-checksum",
  "base_commit": "dac9428272177b475d6adb400182daeba4e5ad64",
  "created_at": "2026-08-08T13:31:07Z",
  "heartbeat_at": "2026-08-08T13:52:44Z",
  "pid_hint": 25708
}
```

**Reglas:**

1. Sin lock no hay escritura. Un agente sin lock que intente editar → `BLOCKED`.
2. Un worktree pertenece a exactamente un `task_id`. Prohibido reutilizarlo para otra tarjeta.
3. **Dos constructores en el mismo worktree están prohibidos** — ya es regla en `.claude/rules/40-parallel-work.md`; aquí se vuelve exigible.
4. El auditor **no toma el lock del constructor**: audita en `READ ONLY` sobre el commit candidato, en su propio worktree desechable o por `git show`.
5. `heartbeat_at` se refresca en cada transición. Lock sin refrescar más de `LOCK_STALE_MINUTES` (propuesto: 45) es **candidato** a huérfano — nunca se borra automáticamente (§17.4).
6. **Nadie borra un lock ajeno.** Coherente con la regla vigente de no eliminar worktrees con cambios sin confirmación humana.

---

## 10. Concurrencia y paralelismo

Dos tarjetas pueden ejecutarse en paralelo **sólo si superan las cinco comprobaciones**. Cualquier fallo las serializa.

| #   | Comprobación                   | Método de detección                                                                                                                                                                                                                       |
| --- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Solape de archivos**         | Intersección de los globs `allowed_write`. Cualquier intersección no vacía → serializar. Barato y estático: no requiere ejecutar nada.                                                                                                    |
| 2   | **Dependencia declarada**      | `dependencies` de una contiene el `task_id` de la otra, directa o transitivamente. Se recorre el grafo; un ciclo → `BLOCKED_HUMAN_DECISION`.                                                                                              |
| 3   | **Migración compartida**       | Cualquiera toca `packages/database/prisma/**`. **Las migraciones nunca corren en paralelo**, ni entre sí ni con nada que lea el schema. Cerrojo global.                                                                                   |
| 4   | **Decisión `D-XXX` pendiente** | Ambas referencian una decisión cuyo estado en `brain/DECISION_INDEX.md` no es `ACEPTADA`/`Aprobada y vigente`/`IMPLEMENTADA · PASSED` → ninguna arranca.                                                                                  |
| 5   | **Contrato compartido**        | Una escribe un archivo que la otra lee como contrato (tipos, DTO, `*-client.ts`, `*.types.ts`, `schema.prisma`, `docs/08_API_DESIGN.md`). Se deriva de los globs `allowed_write` de A contra un conjunto declarado `reads_contract` de B. |

**Límite de concurrencia propuesto para v1: 2 tarjetas simultáneas.** No es una restricción técnica sino de revisabilidad humana: el gate de integración es humano y en serie, así que más paralelismo sólo acumula candidatos sin revisar.

---

## 11. Ciclo de QA e independencia

```text
IMPLEMENTING → TESTING → READY_FOR_QA
                              │
                              ▼
                    QA  (auditor independiente, READ ONLY)
                       │
              ┌────────┴────────┐
         hallazgos          sin hallazgos
         bloqueantes        bloqueantes
              │                 │
              ▼                 ▼
         QA_FAILED      READY_FOR_INTEGRATION
              │
              ▼
         REPAIRING ──→ READY_FOR_QA ──→ QA   (máximo 2 ciclos)
              │
        supera el límite
              │
              ▼
     BLOCKED_ARCHITECTURE
```

**Independencia — no negociable:**

1. El constructor **nunca** se autocertifica. Ya es regla 1 de `AI_PLAYBOOK.md`.
2. `agent_id` del auditor ≠ `agent_id` del constructor. El dispatcher lo verifica y rechaza el contrato si coinciden.
3. El auditor es `READ ONLY`: sin `Edit`/`Write`, sin commits, sin corregir lo que audita.
4. El auditor **no puede emitir `PASSED`** en el sentido canónico. Emite `PASS`/`FAIL` de ciclo; el `PASSED` de EWO sigue siendo exclusivo del veredicto de Codex más cierre administrativo humano (`AI_PLAYBOOK.md` reglas 1 y 6).
5. El silencio del auditor nunca promueve. Ausencia de veredicto → `RECOVERY`, no aprobación.
6. **Un auditor que se contradice no promueve.** Un veredicto `PASSED` acompañado
   de hallazgos aún bloqueantes (`CRÍTICO`/`ALTO`, o `MEDIO`/`BAJO` no
   autorizados por el contrato) es una inconsistencia del propio auditor: escala
   a `BLOCKED_ARCHITECTURE`, nunca a `READY_FOR_INTEGRATION`. Regla aportada por
   la implementación de Claude-03 (`2e128c7`) y adoptada aquí.

---

## 12. Política de hallazgos

Severidades canónicas, sin añadir ninguna: `CRÍTICO` · `ALTO` · `MEDIO` · `BAJO`.

| Severidad | Efecto en el motor                                                                                                                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CRÍTICO` | **Nunca** `READY_FOR_INTEGRATION`. → `QA_FAILED`. Si reaparece tras 2 ciclos → `BLOCKED_ARCHITECTURE`.                                                                                                                                  |
| `ALTO`    | **Nunca** `READY_FOR_INTEGRATION`. → `QA_FAILED`.                                                                                                                                                                                       |
| `MEDIO`   | No integrar salvo decisión humana explícita registrada. → `BLOCKED_HUMAN_DECISION` con la decisión concreta que se pide.                                                                                                                |
| `BAJO`    | Permite `READY_FOR_INTEGRATION` **si** el contrato lo autoriza (`allow_low_findings: true`, por defecto ausente). Se arrastra como observación de seguimiento, igual que las observaciones `BAJO` ya registradas en auditorías previas. |

Todo hallazgo lleva **Ubicación · Problema · Impacto · Corrección mínima** — el formato ya usado por `qa-engineer` y por las auditorías del repositorio.

---

## 13. Gates humanos

**Exigen aprobación humana (el motor se detiene y no propone alternativa):**

- Crear, modificar o ratificar una decisión `D-XXX`.
- Cualquier cambio con criterio fiscal, contable o legal (`CLAUDE.md` regla 6).
- Migraciones destructivas o con posible pérdida de datos.
- Cambios de seguridad crítica: guards, sesión, MFA, aislamiento multiempresa, secretos.
- Producción, infraestructura o cambio de proveedor.
- Cualquier operación irreversible.
- Cambios de contratos públicos relevantes (`docs/08_API_DESIGN.md`, tipos compartidos, `schema.prisma`).
- **Integración a la rama compartida** — siempre, sin excepción en v1.
- `push`, merge, PR, despliegue.
- Salir de cualquier estado `BLOCKED*`.
- Marcar `PASSED`.
- Modificar `AI_CONTEXT.md`, `CHANGELOG.md`, checklists de EWO o `brain/*`.

**No exigen humano** (el motor los resuelve dentro de `allowed_write`): lint, Prettier, errores de TypeScript triviales, pruebas unitarias, mocks y tipos de prueba, imports, correcciones locales seguras dentro del alcance declarado.

La frontera es empírica y ya validada: la corrección de tipado de pruebas de `documents-*` (0 errores de `tsc`, sin tocar producción, sin `any` ni `@ts-ignore`) es exactamente el perfil que el motor puede cerrar solo. Un cambio equivalente en `schema.prisma` no lo es.

---

## 14. Gate de integración

**El motor v1 termina en `READY_FOR_INTEGRATION` y no ejecuta `push`, merge ni integración.**

Produce un paquete de integración por tarjeta:

```yaml
task_id: LOOP-E5S3T10-001
source_commit: 7f3a91c... # candidato a integrar
base_commit: dac9428... # base sobre la que se construyó
branch: loop/e5-s3-t10-checksum
worktree: .worktrees/loop/e5-s3-t10-checksum

changed_files: [...] # name-status completo
test_evidence:
  tests: '41/41 PASS'
  typecheck: PASS
  lint: PASS
  diff_check: CLEAN
qa_verdict:
  auditor: CODEX-01
  result: PASS
  findings: [] # o sólo BAJO, si el contrato lo autoriza

conflict_prediction: # calculado, no adivinado
  target_head: dac9428...
  base_is_ancestor_of_target: true
  files_changed_in_target_since_base: []
  overlap_with_candidate: []
  predicted_conflicts: NONE # NONE | POSSIBLE | CERTAIN

integration_instructions: |
  Revisar `git show 7f3a91c`.
  Integrar con cherry-pick sobre la rama destino verificada.
  No hacer push sin autorización.
```

`conflict_prediction` se calcula con datos reales: `git merge-base --is-ancestor`, `git diff --name-only base..target` y la intersección con los archivos del candidato. **`POSSIBLE`/`CERTAIN` no bloquea el estado**; informa al humano.

---

## 15. Modo nocturno

Reutiliza toda la infraestructura anterior; no añade componentes.

```text
dispatcher nocturno
  → lee queue.yaml
  → filtra READY con dependencias satisfechas
  → aplica las 5 comprobaciones de concurrencia (§10)
  → adquiere lock, crea worktree en base_commit
  → ejecuta constructor → TESTING → REPAIRING (máx. 5)
  → READY_FOR_QA → auditor independiente → máx. 2 ciclos
  → deja candidatos en READY_FOR_INTEGRATION
  → escribe events.jsonl y el paquete de integración
  → SE DETIENE
```

**Prohibiciones nocturnas** (heredadas de `.claude/automation/nightly-queue.md`, sin relajar ninguna): sin integración automática, sin `push`, sin merge, sin migraciones, sin cambios de Prisma, sin borrados, sin tocar `D-XXX`, sin marcar `PASSED`, sin editar fuentes canónicas de estado.

**Además:** ninguna tarjeta `FISCAL`, `MIGRATION`, `SECURITY` o `ARCHITECTURE` es elegible en modo nocturno. Todas requieren gate humano previo (§4), y un gate humano no puede satisfacerse de madrugada sin humano.

Entrega matinal: lista de tarjetas por estado final, paquetes de integración, tarjetas bloqueadas con motivo tipificado, y locks huérfanos detectados (no borrados).

---

## 16. Recuperación

| Escenario                        | Detección                                                     | Comportamiento                                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude interrumpido**          | `heartbeat_at` vencido                                        | La tarjeta conserva su estado y contadores en `state/`. Al reanudar con el mismo `agent_id`, continúa desde el último evento. No reinicia.                                      |
| **Terminal cerrada**             | Igual                                                         | Igual. El estado vive en disco, nunca en el contexto del agente.                                                                                                                |
| **`index.lock`**                 | `.git/index.lock` presente                                    | **Nunca borrarlo automáticamente.** → `BLOCKED` con `git_index_locked`. Investigar qué proceso lo sostiene.                                                                     |
| **Worktree huérfano**            | Lock vencido + worktree con cambios                           | **Nunca borrar.** Reportar ruta, rama, estado y diff. Regla vigente de `40-parallel-work.md` §4. Sólo un humano decide.                                                         |
| **Commit parcial**               | `git status` sucio en un estado que lo prohíbe                | → `REPAIRING`. El trabajo no se descarta jamás: se conserva y se reporta.                                                                                                       |
| **Timeout de pruebas**           | Reloj del `test_command`                                      | `tests.result: TIMEOUT`, **consume iteración** (§5.4). Reintento manda a `REPAIRING`.                                                                                           |
| **Agente desaparece**            | Sin heartbeat ni resultado                                    | La tarjeta queda en su último estado válido. El dispatcher **no** la reasigna solo: marcarla libre exige decisión humana, porque el worktree puede tener trabajo sin commitear. |
| **`HEAD` compartido movió**      | `git rev-parse` de la rama destino ≠ `target_head` registrado | El candidato **no se invalida ni se rebasa solo**. Se recalcula `conflict_prediction` y se anota en el paquete. Rebasar es decisión humana.                                     |
| **Candidato sobre base antigua** | `base_commit` no es ancestro del `HEAD` destino               | → `BLOCKED_HUMAN_DECISION` con `stale_base`. Reconstruir sobre base nueva es una tarjeta nueva, no una mutación silenciosa de la anterior.                                      |

**Principio transversal:** ante ambigüedad, el motor **conserva y reporta**; nunca borra, descarta ni resetea. Es la misma disciplina aplicada en las misiones de preservación ya ejecutadas en este repositorio.

---

## 17. Alcance de v1 (MVP)

### Entra en v1

1. `queue.yaml` versionado con tarjetas, `risk_class` y dependencias.
2. Máquina de estados de 16 estados con la matriz de §3.3 aplicada estrictamente.
3. Ownership lock por creación exclusiva, con heartbeat.
4. Worktree por tarjeta desde `base_commit` inmutable.
5. Dispatcher: selección, comprobaciones de concurrencia, entrega de contrato.
6. Bucle de construcción y bucle de pruebas con límites duros.
7. Handoff a QA independiente con verificación `agent_id` distinto.
8. Límites de reparación sin auto-reset.
9. Paquete de `READY_FOR_INTEGRATION` con predicción de conflicto calculada.
10. `events.jsonl` append-only.

### Queda fuera de v1

Dashboard web · base de datos propia · Kubernetes · colas distribuidas · auto-deploy · auto-push · auto-merge · rebase automático · reasignación automática de tarjetas huérfanas · generación automática de tarjetas a partir de checklists · métricas agregadas.

### Prerrequisito duro

**`LOOP-000` debe cerrarse antes que cualquier otra tarjeta de este motor.** Sin versionar `.claude/rules/`, `.claude/agents/`, `.claude/settings.json` y `.claude/automation/`, cada worktree nace sin gobierno ni permisos (§2.1). Ejecutar v1 antes de eso sería automatizar agentes sin reglas.

---

## 18. Riesgos

| ID      | Riesgo                                                                                               | Prob.                       | Impacto     | Mitigación                                                                                           |
| ------- | ---------------------------------------------------------------------------------------------------- | --------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `RL-01` | **El sustrato de gobierno no está versionado**; los worktrees nacen sin reglas ni `deny` de permisos | **Alta (hecho verificado)** | **Crítico** | `LOOP-000` es prerrequisito bloqueante de v1 (§2.1)                                                  |
| `RL-02` | Un agente amplía alcance por creerlo "obvio"                                                         | Media                       | Alto        | `allowed_write` / `forbidden_scope` explícitos; salir del alcance es `BLOCKED_HUMAN_DECISION`        |
| `RL-03` | Autocertificación encubierta (mismo modelo construye y audita)                                       | Media                       | Crítico     | Verificación de `agent_id` distinto; auditor sin herramientas de escritura                           |
| `RL-04` | Acumulación de candidatos sin integrar; bases envejecen en masa                                      | **Alta**                    | Medio       | Límite de 2 tarjetas concurrentes; `stale_base` explícito; revisión humana diaria                    |
| `RL-05` | Reparación cosmética que enmascara un defecto real (`any`, `@ts-ignore`, prueba debilitada)          | Media                       | Alto        | Prohibición ya vigente (`30-quality-scope.md` §1); el auditor debe buscarlo explícitamente           |
| `RL-06` | Bucle de gasto: 5 reparaciones × varias tarjetas × Opus                                              | Media                       | Medio       | Límites duros, escalamiento sólo por regla, concurrencia acotada                                     |
| `RL-07` | El log de eventos se convierte en una segunda fuente de verdad del estado del proyecto               | Media                       | Medio       | `events.jsonl` no versionado y explícitamente subordinado a `CHANGELOG.md` y a los `_FINAL_AUDIT.md` |
| `RL-08` | La familia de estados nueva contamina el vocabulario canónico de EWO                                 | Media                       | Medio       | Proyección explícita de §3.1; el motor nunca escribe `PASSED`                                        |
| `RL-09` | Lock huérfano paraliza una tarjeta indefinidamente                                                   | Media                       | Bajo        | Heartbeat + reporte matinal; desbloqueo humano, nunca borrado automático                             |
| `RL-10` | Falsa sensación de autonomía: se asume que el motor "ya revisó"                                      | Media                       | Alto        | El paquete de integración declara siempre qué **no** se verificó                                     |

---

## 19. Tarjetas de implementación

Ninguna autoriza ejecución: dependen de la ratificación de este documento.

### `LOOP-000` — Versionar el sustrato de gobierno · **`CLAUDE-02`** · `risk_class: CRITICAL`

- **Objetivo:** poner bajo control de versiones `.claude/rules/`, `.claude/agents/`, `.claude/automation/`, `.claude/settings.json`, `.claude/skills/` y decidir el destino de `docs/AI_OS/`.
- **Por qué:** §2.1. Sin esto, todo worktree nace sin gobierno ni permisos.
- **`allowed_write`:** `.claude/**`, `.gitignore`.
- **`forbidden_scope`:** todo `apps/**`, `packages/**`, `docs/**` salvo `docs/AI_OS/**` si el humano lo autoriza; `brain/**`; `AI_CONTEXT.md`; `CHANGELOG.md`.
- **Aceptación:** `git ls-files .claude` lista reglas, agentes, automation y settings; un worktree recién creado desde la rama contiene `.claude/rules/` y `.claude/settings.json`; `settings.local.json` permanece ignorado.
- **Gate humano:** **sí** — versionar `settings.json` cambia el perímetro de permisos efectivo.
- **Dependencias:** ninguna. **Es la primera.**

### `LOOP-001` — Esquema de cola y contratos · **`CLAUDE-02`** · `risk_class: STANDARD`

- **Objetivo:** `queue.yaml` versionado + esquemas de contrato de agente y de resultado (§6, §7) + `.gitignore` del runtime.
- **`allowed_write`:** `.claude/automation/loop-engine/**`, `.gitignore`.
- **Aceptación:** las 7 tarjetas de `nightly-queue.md` se expresan en `queue.yaml` **sin cambiar su estado ni su dependencia**; los esquemas validan los ejemplos de §6 y §7.
- **Dependencias:** `LOOP-000`.

### `LOOP-002` — Máquina de estados y validador de transiciones · **`CLAUDE-02`** · `risk_class: CRITICAL`

- **Objetivo:** implementar §3.3 como validador puro: dado `(from, to, actor, evidencia)` → permitido / prohibido / requiere-humano.
- **Aceptación:** las 6 transiciones prohibidas de §3.3 se rechazan con prueba propia; ningún actor no-humano alcanza `PASSED`, `INTEGRATING` ni `INTEGRATED`; contadores sin auto-reset.
- **Pruebas:** unitarias, tabla completa de la matriz.
- **Dependencias:** `LOOP-001`.

### `LOOP-003` — Ownership lock y ciclo de vida del worktree · **`CLAUDE-02`** · `risk_class: CRITICAL`

- **Objetivo:** lock por creación exclusiva, heartbeat, detección (no borrado) de huérfanos, creación de worktree en `base_commit`.
- **Aceptación:** dos adquisiciones concurrentes → exactamente una gana; ningún camino de código borra un lock o un worktree ajeno; `base_commit` verificado antes de crear.
- **Dependencias:** `LOOP-002`.

### `LOOP-004` — Dispatcher y comprobaciones de concurrencia · **`CLAUDE-02`** · `risk_class: CRITICAL`

- **Objetivo:** selección de tarjetas `READY` y las 5 comprobaciones de §10.
- **Aceptación:** solape de globs serializa; ciclo de dependencias → `BLOCKED_HUMAN_DECISION`; cualquier tarjeta con `packages/database/prisma/**` toma cerrojo global; `D-XXX` no aceptada bloquea; máximo 2 concurrentes.
- **Dependencias:** `LOOP-003`.

### `LOOP-005` — Auditor independiente y ciclo de QA · **`CLAUDE-03`** · `risk_class: CRITICAL`

- **Objetivo:** handoff a QA, verificación de `agent_id` distinto, mapeo de severidades a transiciones (§12), límite de 2 ciclos.
- **Por qué `CLAUDE-03`:** quien construye el motor no debe construir también su propio control de independencia.
- **Aceptación:** constructor y auditor iguales → rechazo; `CRÍTICO`/`ALTO` nunca alcanzan `READY_FOR_INTEGRATION`; `MEDIO` → `BLOCKED_HUMAN_DECISION`; tercer ciclo de QA imposible.
- **Dependencias:** `LOOP-004`.

### `LOOP-006` — Paquete de integración y predicción de conflicto · **`CLAUDE-03`** · `risk_class: STANDARD`

- **Objetivo:** generar §14 con predicción calculada sobre datos reales de Git.
- **Aceptación:** ninguna ruta ejecuta `push`, merge, rebase ni `cherry-pick`; `base_commit` no ancestro → `stale_base`; predicción reproducible.
- **Dependencias:** `LOOP-005`.

### `LOOP-007` — Log de eventos y recuperación · **`CLAUDE-03`** · `risk_class: STANDARD`

- **Objetivo:** `events.jsonl` append-only y los nueve escenarios de §16.
- **Aceptación:** `state/` se reconstruye reproduciendo el log; `index.lock` y worktree huérfano nunca se borran; timeout consume iteración; reanudar no reinicia contadores.
- **Dependencias:** `LOOP-006`.

### `LOOP-008` — Modo nocturno · **`CLAUDE-03`** · `risk_class: CRITICAL`

- **Objetivo:** §15 sobre los componentes anteriores, sin añadir ninguno.
- **Aceptación:** `FISCAL`/`MIGRATION`/`SECURITY`/`ARCHITECTURE` nunca elegibles; ninguna ruta integra ni hace `push`; entrega matinal completa.
- **Dependencias:** `LOOP-007`.

### Orden recomendado

```text
LOOP-000  ← prerrequisito bloqueante, humano en el bucle
   ↓
LOOP-001 → LOOP-002 → LOOP-003 → LOOP-004     (CLAUDE-02)
   ↓
LOOP-005 → LOOP-006 → LOOP-007 → LOOP-008     (CLAUDE-03)
```

Estrictamente secuencial. Paralelizar contradiría §10: todas comparten `.claude/automation/loop-engine/**`.

---

## 20. Qué exige este documento antes de implementarse

1. **Ratificación humana** de este documento (pasa de `PROPUESTA` a `ACEPTADA`).
2. **Autorización de `LOOP-000`**, que cambia el perímetro de permisos versionado.
3. **Decisión sobre `docs/AI_OS/`**: versionarlo o declararlo local por diseño. Hoy es ambiguo.
4. **Actualización de `DOCUMENTATION_STYLE_GUIDE.md` §3** para registrar la familia de estados del Loop Engine (§3.1).
5. **Asignación de un `EWO-NNN`**, si el responsable de producto decide tratarlo como Work Order formal.
6. **Registro en `brain/DECISIONS.md`** como decisión `D-XXX` si se ratifica, dado que altera cómo se ejecuta el trabajo de ingeniería.

Ninguno de los seis puntos lo puede ejecutar un agente por su cuenta.
