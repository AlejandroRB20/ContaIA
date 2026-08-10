# LOOP-000 — Sustrato de gobierno versionado y reconciliación del Loop Engine

## Control del documento

| Campo              | Valor                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Versión            | 0.3                                                                                                                                                                                                                                                                                                                                          |
| Estado             | **IMPLEMENTADA · PENDIENTE DE REAUDITORÍA.** `H3` y `H7` **RATIFICADAS**; `H5` **RESUELTA como `H5-B`** (§10). El sustrato compartido queda versionado (§13). Auditoría independiente `READ ONLY` sobre `7471806`: **REQUIERE CAMBIOS** — dos hallazgos cerrados en §14. `LOOP-001` permanece `BLOCKED · PENDIENTE DE REAUDITORÍA LOOP-000`. |
| Fecha de creación  | 2026-08-08                                                                                                                                                                                                                                                                                                                                   |
| Propietario lógico | Responsable de producto de ContaIA (Alejandro Reyes Bocanegra)                                                                                                                                                                                                                                                                               |
| Tarjeta            | `LOOP-000`, prerrequisito bloqueante de [`AUTONOMOUS_LOOP_ENGINE_V1_ARCHITECTURE.md`](AUTONOMOUS_LOOP_ENGINE_V1_ARCHITECTURE.md) §17                                                                                                                                                                                                         |
| Base de análisis   | `HEAD dac9428` · arquitectura `8f6fa6b` · Claude-02 `7bdf159` · Claude-03 `2e128c7`                                                                                                                                                                                                                                                          |
| Alcance            | Qué debe versionarse para que un worktree autónomo opere con gobierno, y qué ubicación canónica adopta el motor. **No** modifica código de producto.                                                                                                                                                                                         |

> **Secciones §1–§12: análisis y diseño, redactados antes de la aprobación humana.** Describen el estado del repositorio cuando `git ls-files .claude` devolvía un solo archivo y ninguna migración estaba aplicada. Se conservan sin reescribir, como registro de la evidencia original.
>
> **Sección §13: registro de implementación.** Recoge lo que realmente se ejecutó tras la aprobación de `H3`, `H7` y `LOOP-000`, incluidas las divergencias declaradas frente al diseño. Ante cualquier duda sobre el estado vigente, **prevalece §13**.

---

## 1. Hallazgo confirmado

Revalidado desde cero el 2026-08-08 sobre `dac9428`, con un worktree limpio de sondeo creado ex profeso:

```text
git ls-files .claude        → .claude/launch.json          (1 archivo)
git ls-files docs/AI_OS     → (vacío)                      (0 archivos)
```

Contenido real de un worktree recién creado desde `dac9428`:

| Ruta                    | ¿Presente en el worktree? |
| ----------------------- | ------------------------- |
| `CLAUDE.md`             | **Sí** — versionado       |
| `AI_PLAYBOOK.md`        | **Sí** — versionado       |
| `.claude/launch.json`   | **Sí** — versionado       |
| `.claude/rules/`        | **No**                    |
| `.claude/agents/`       | **No**                    |
| `.claude/skills/`       | **No**                    |
| `.claude/automation/`   | **No**                    |
| `.claude/settings.json` | **No**                    |
| `docs/AI_OS/`           | **No**                    |

**Consecuencia operativa.** Un agente autónomo en worktree conserva `CLAUDE.md` (10 reglas) y `AI_PLAYBOOK.md` (roles y no-autocertificación) — no está totalmente desnudo. Pero pierde:

1. Las cinco reglas de `.claude/rules/`, incluidas la prohibición de `merge`/`push`/`reset` y la regla de un constructor por worktree.
2. La definición de su propio rol (`.claude/agents/`), es decir sus `tools`, sus prohibiciones y sus condiciones de parada.
3. **`.claude/settings.json`**, que contiene el `deny` de `git merge`, `git reset --hard` y `git clean` y el `ask` de commit/push/rebase/migraciones.

El punto 3 es el material: **la barrera de permisos que impide operaciones destructivas no existe dentro del worktree.** Severidad `CRÍTICO`, confirmada por segunda vez y por evidencia directa, no por inferencia.

---

## 2. Inventario de gobierno y clasificación

Clasificación pedida: **A** obligatorio para ejecución segura · **B** útil no obligatorio · **C** local/máquina, no versionar · **D** secreto/sensible, jamás versionar.

| Ruta                                                                      | Clase | Justificación                                                                                   |
| ------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `.claude/rules/00-governance.md`                                          | **A** | Fuente de verdad, prohibición de merge/push/reset, no autocertificar `PASSED`                   |
| `.claude/rules/40-parallel-work.md`                                       | **A** | Un constructor por worktree; secuencia obligatoria de revisión                                  |
| `.claude/rules/10-multitenancy-security.md`                               | **A** | D-002/D-006, aislamiento por empresa, prohibición de exponer secretos                           |
| `.claude/rules/20-fiscal-data-safety.md`                                  | **A** | Prohibición de criterio fiscal sin fuente; migraciones con WO aprobada                          |
| `.claude/rules/30-quality-scope.md`                                       | **A** | Prohibición de debilitar pruebas                                                                |
| `.claude/settings.json`                                                   | **A** | Único `deny` de operaciones destructivas. **Requiere aprobación humana** (§3)                   |
| `.claude/agents/contaia-orchestrator.md`                                  | **A** | Contrato del dispatcher: no implementa, no certifica                                            |
| `.claude/agents/qa-engineer.md`                                           | **A** | Contrato del auditor `READ ONLY` — pilar de la independencia de QA                              |
| `.claude/agents/security-reviewer.md`                                     | **A** | Requerido por `risk_class: SECURITY`                                                            |
| `.claude/agents/fiscal-accounting-reviewer.md`                            | **A** | Requerido por `risk_class: FISCAL`                                                              |
| `.claude/agents/principal-architect.md`                                   | **A** | Requerido para salir de `BLOCKED_ARCHITECTURE`                                                  |
| `.claude/agents/backend-engineer.md`                                      | **A** | Rol constructor referenciado por `agent_role`                                                   |
| `.claude/agents/frontend-engineer.md`                                     | **A** | Ídem                                                                                            |
| `.claude/agents/documentation-engineer.md`                                | **B** | Útil; ninguna transición del motor depende de él                                                |
| `.claude/automation/nightly-queue.md`                                     | **A** | Cola y regla de selección; entrada de `queue` (§6)                                              |
| `.claude/skills/contaia-*/SKILL.md` (4)                                   | **B** | Procedimientos de dominio; mejoran calidad, no condicionan seguridad                            |
| `.claude/skills/contaia-*/agents/openai.yaml` (4)                         | **B** | Variante para otro proveedor; sin efecto sobre el motor                                         |
| `.claude/skills/contaia-fiscal-safety/references/fiscal-source-policy.md` | **A** | Política de fuente fiscal; `risk_class: FISCAL` la necesita                                     |
| `.claude/launch.json`                                                     | —     | **Ya versionado.** Sin cambio                                                                   |
| `.claude/settings.local.json`                                             | **C** | Preferencias de máquina (§3.2)                                                                  |
| `.claude/worktrees/**`                                                    | **C** | Worktrees efímeros de Claude Code; ya ignorado en `.gitignore`                                  |
| `.claude/automation/loop-engine/state/**`                                 | **C** | Estado de ejecución; Claude-02 ya lo ignora correctamente                                       |
| `docs/AI_OS/**` (11 archivos)                                             | **B** | Onboarding y catálogo. Ninguna transición del motor depende de ellos. **Decisión humana** (§10) |

**No se encontró ningún archivo de clase D.** Ver §3.

---

## 3. Revisión de seguridad de la configuración

### 3.1 `.claude/settings.json`

```json
{
  "worktree": { "baseRef": "head" },
  "permissions": {
    "ask": [
      "Bash(git commit *)",
      "Bash(git push *)",
      "Bash(git rebase *)",
      "Bash(git worktree remove *)",
      "Bash(pnpm run db:migrate *)",
      "Bash(pnpm --filter @contaia/database run migrate *)",
      "Bash(prisma migrate *)",
      "Bash(npx prisma migrate *)"
    ],
    "deny": ["Bash(git merge *)", "Bash(git reset --hard *)", "Bash(git clean *)"]
  },
  "disableBypassPermissionsMode": "disable"
}
```

| Comprobación                        | Resultado                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| Secretos, tokens, claves API        | **Ninguno**                                                                                 |
| Rutas absolutas de máquina          | **Ninguna** — verificado con búsqueda de `C:\Users`, `/Users/`, `/home/`, nombre de usuario |
| Hooks                               | **Ninguno configurado**                                                                     |
| Referencias a herramientas locales  | **Ninguna**                                                                                 |
| Contenido específico de una máquina | **Ninguno**: todo es política de proyecto                                                   |

**Veredicto de seguridad: seguro de versionar.** No contiene nada sensible ni local.

**Veredicto de gobierno: requiere aprobación humana.** Versionarlo cambia el perímetro de permisos efectivo para **todo** colaborador y para todo worktree — hoy `deny` sólo aplica a quien tenga el archivo localmente. El cambio es de endurecimiento (más restricciones, no menos), pero sigue siendo un cambio de política, no una acción técnica neutra. **Entregado, no aplicado.**

### 3.2 `.claude/settings.local.json`

```json
{ "permissions": { "allow": ["Bash(echo \"exit=$?\")"] } }
```

Preferencia trivial de una máquina. **Clase C — permanece local.** La separación `settings.json` / `settings.local.json` que la misión pide como posible propuesta **ya existe y ya es el mecanismo nativo de Claude Code**: no hay que inventar nada. Sólo falta añadir `settings.local.json` al `.gitignore` para que la separación sea explícita en vez de accidental.

### 3.3 Barrido de secretos en todo `.claude/`

Búsqueda de `api_key`, `secret`, `token`, `password`, `bearer`, `private_key`, `xox*-`, `ghp_`, `sk-…`, `AKIA…`: **11 coincidencias, todas prosa en español que ordena _no_ exponer secretos** (p. ej. `10-multitenancy-security.md`: «No revelar secretos, tokens, credenciales…»). **Cero credenciales reales.** Ningún archivo de clase D.

---

## 4. Sustrato mínimo versionado

Cobertura exigida por la misión §3, y quién la aporta:

| Requisito                          | Aportado por                                                 | ¿Versionado hoy?                         |
| ---------------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| Reglas de seguridad Git            | `.claude/rules/00-governance.md` §Gobierno de cambios 1      | **No**                                   |
| Trabajo paralelo                   | `.claude/rules/40-parallel-work.md`                          | **No**                                   |
| Gobierno                           | `.claude/rules/00-governance.md`                             | **No**                                   |
| Contratos de agente                | `.claude/agents/*.md` (8)                                    | **No**                                   |
| `deny` de operaciones destructivas | `.claude/settings.json`                                      | **No**                                   |
| `MISSION_ID`                       | Arquitectura §6.1 (formalizada allí por primera vez)         | **Sí**, vía `8f6fa6b`                    |
| Ownership                          | Arquitectura §9 + `40-parallel-work.md` §3                   | Parcial                                  |
| No-auto-`PASSED`                   | `AI_PLAYBOOK.md` regla 1 + `00-governance.md` §Gobierno 5    | `AI_PLAYBOOK.md` **sí**; la regla **no** |
| No-auto-integración                | Arquitectura §14 + `nightly-queue.md` §Límites               | Arquitectura **sí**; cola **no**         |
| Auditor independiente              | `.claude/agents/qa-engineer.md` + `AI_PLAYBOOK.md` rol Codex | `AI_PLAYBOOK.md` **sí**; agente **no**   |

**Conclusión:** de los diez requisitos, sólo `MISSION_ID`, no-auto-`PASSED` (parcial) y no-auto-integración (parcial) sobreviven hoy dentro de un worktree. Los otros siete dependen de archivos no versionados.

### 4.1 Matriz de versionado

| path                                                                       | tracked_now | should_track        | reason                                           | security_risk                 | migration_action                                     |
| -------------------------------------------------------------------------- | ----------- | ------------------- | ------------------------------------------------ | ----------------------------- | ---------------------------------------------------- |
| `.claude/rules/*.md` (5)                                                   | No          | **Sí**              | Clase A: gobierno exigible en worktree           | Ninguno                       | `git add` directo                                    |
| `.claude/agents/*.md` (7 de clase A)                                       | No          | **Sí**              | Contratos de rol referenciados por `agent_role`  | Ninguno                       | `git add` directo                                    |
| `.claude/agents/documentation-engineer.md`                                 | No          | **Sí**              | Clase B, pero versionar 7 de 8 sería incoherente | Ninguno                       | `git add` directo                                    |
| `.claude/automation/nightly-queue.md`                                      | No          | **Sí**              | Entrada de la cola y autoridad reservada         | Ninguno                       | `git add` directo                                    |
| `.claude/skills/**` (10)                                                   | No          | **Sí**              | Clase B; coherencia y reproducibilidad           | Ninguno                       | `git add` directo                                    |
| `.claude/settings.json`                                                    | No          | **Sí**              | Clase A: único `deny` destructivo                | Ninguno (sin secretos)        | **Gate humano** — cambia permisos efectivos          |
| `.claude/settings.local.json`                                              | No          | **No**              | Clase C: preferencia de máquina                  | Bajo si se versiona por error | Añadir a `.gitignore`                                |
| `.claude/worktrees/**`                                                     | No          | **No**              | Clase C: efímero de Claude Code                  | Ninguno                       | Ya ignorado                                          |
| `.claude/launch.json`                                                      | **Sí**      | Sí                  | Sin cambio                                       | Ninguno                       | Ninguna                                              |
| `.claude/automation/loop-engine/lib/**`, `cli.mjs`, `test/**`, `README.md` | No          | **Sí**              | Código del motor (`7bdf159`)                     | Ninguno                       | Vía reconciliación §6                                |
| `.claude/automation/loop-engine/state/**`                                  | No          | **No**              | Estado de ejecución                              | Ninguno                       | Ya ignorado por su `.gitignore`                      |
| `.worktrees/**`                                                            | No          | **No**              | Worktrees de tarea                               | Ninguno                       | **Añadir a `.gitignore`** — hoy ensucia `git status` |
| `.audit-worktrees/**`                                                      | No          | **No**              | Worktrees de auditoría                           | Ninguno                       | **Añadir a `.gitignore`** — ídem                     |
| `docs/AI_OS/**` (11)                                                       | No          | **Decisión humana** | Clase B; ninguna transición depende de ellos     | Ninguno                       | §10                                                  |

---

## 5. Bootstrap de worktree

**Conclusión: no hace falta ningún script de bootstrap.**

Git entrega automáticamente todo archivo versionado a cada worktree nuevo. Versionar las clases A y B resuelve el problema completo sin código adicional — que es exactamente la preferencia declarada en la misión §5.

Queda una única pieza que Git no puede entregar por diseño: `settings.local.json`, que es local a propósito. No requiere bootstrap porque **su ausencia no degrada la seguridad**: es un `allow` adicional, no un `deny`.

Lo que sí conviene es una **verificación**, no un bootstrap: el dispatcher, antes de entregar un contrato, comprueba que el worktree contiene el sustrato mínimo.

```text
verifySubstrate(worktreePath) → OK | MISSING[]
  exige: .claude/rules/{00,10,20,30,40}-*.md
         .claude/settings.json
         .claude/agents/<agent_role>.md
         CLAUDE.md, AI_PLAYBOOK.md
  si falta cualquiera → BLOCKED (substrate_missing); nunca ejecutar igualmente
```

Es una comprobación de existencia de archivos, no un instalador: no copia, no genera, no repara. Si falla, la tarjeta se bloquea y lo reporta.

---

## 6. Reconciliación del Loop Engine

`7bdf159` (Claude-02) y `2e128c7` (Claude-03) se construyeron **ambos directamente sobre `dac9428`, en paralelo, y ninguno tiene `8f6fa6b` como ancestro**: los dos se escribieron sin conocer la arquitectura. La divergencia es consecuencia de eso, no de un desacuerdo de diseño.

### 6.1 Ubicación canónica — decisión

| Candidato                         | Autor     | Evaluación                                                                                                                                                                                                                                                                                                                          |
| --------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.claude/automation/loop-engine/` | Claude-02 | `.claude/automation/` **ya existe** y ya aloja `nightly-queue.md`. Es el espacio de automatización de agentes ya establecido.                                                                                                                                                                                                       |
| `tools/autonomous-loop-engine/`   | Claude-03 | `tools/` **no existe** en el repositorio (`git ls-tree -d dac9428`: `.claude`, `.github`, `.husky`, `apps`, `brain`, `docs`, `knowledge`, `packages`, `prompts`, `scripts`). Sería un espacio de nivel superior nuevo, además con un `package.json` (`@contaia-tools/…`) que insinúa un paquete sin estar en `pnpm-workspace.yaml`. |

**Ubicación canónica adoptada: `.claude/automation/loop-engine/`.** Un solo Loop Engine. Los módulos de Claude-03 se adaptan a esa ruta; `tools/` no se crea.

**Corrección a la arquitectura:** §8 decía `.claude/automation/loop/`. Se corrige a `.claude/automation/loop-engine/` para adoptar la ruta ya implementada y probada, en vez de obligar a un renombrado gratuito.

### 6.2 Ubicación de los worktrees de tarea — corrección

Claude-02 coloca los worktrees de tarea en `.claude/worktrees/<id>`. **Conflicto real:** ese directorio es el de los worktrees efímeros de Claude Code y ya está en `.gitignore` como tal («Worktrees efímeros creados por Claude Code»). Un worktree de tarea del motor viviría en el mismo espacio que los que Claude Code crea y destruye por su cuenta.

**Ubicación canónica adoptada: `.worktrees/loop/<task_id>`.** Es el espacio que ya usan de facto todas las misiones de este repositorio, separado del de Claude Code, y namespaced para no mezclarse con worktrees manuales.

### 6.3 Matriz de compatibilidad

| Dimensión                                        | Claude-02 `7bdf159`                              | Claude-03 `2e128c7`                                                                         | Arquitectura `8f6fa6b`                                                      | Marca             | Acción                                                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Ubicación del motor**                          | `.claude/automation/loop-engine/`                | `tools/autonomous-loop-engine/`                                                             | `.claude/automation/loop/`                                                  | **CONFLICT**      | `.claude/automation/loop-engine/` canónico; arquitectura corregida; `tools/` no se crea                                                          |
| **Estados: núcleo**                              | 13 estados                                       | 7 estados                                                                                   | 16 estados                                                                  | **ADAPT**         | Los 13 de Claude-02 son correctos y coinciden con la arquitectura                                                                                |
| **Estados: `QA` vs `IN_QA`**                     | `QA`                                             | `IN_QA`                                                                                     | `QA`                                                                        | **CONFLICT**      | `QA` gana (2 de 3 y canon). Claude-03 renombra                                                                                                   |
| **Estados: `INTEGRATING`/`INTEGRATED`/`PASSED`** | Ausentes                                         | Ausentes                                                                                    | Presentes, sólo humanos                                                     | **ADAPT**         | Añadir como estados **reconocidos sin transición iniciable por el motor**, para que el motor pueda rehusar actuar sobre una tarjeta ya integrada |
| **Estados: `BLOCKED_HUMAN_DECISION`**            | Presente                                         | **Ausente**                                                                                 | Presente                                                                    | **ADAPT**         | Claude-03 debe enrutar `MEDIO` a este estado                                                                                                     |
| **Tabla de transiciones**                        | Explícita, sin transición libre                  | Asserts por función                                                                         | Matriz 16×16 con marca `H`                                                  | **ADAPT**         | Base = Claude-02; añadir el flag `requiresHuman` que hoy no existe                                                                               |
| **`BLOCKED → READY`**                            | **Permitido sin gate humano**                    | n/a                                                                                         | Sólo humano (§3.3 regla 4)                                                  | **CONFLICT**      | Marcar `requiresHuman`. Sin eso, un dispatcher automático puede desbloquear solo                                                                 |
| **`MAX_REPAIR`**                                 | 5                                                | n/a                                                                                         | 5                                                                           | **REUSE**         | Coinciden                                                                                                                                        |
| **`MAX_QA`**                                     | 2 (bloquea al 3.º)                               | 2 (bloquea al 3.º)                                                                          | 2                                                                           | **REUSE**         | Semántica verificada equivalente en ambos                                                                                                        |
| **Sin auto-reset de contadores**                 | Contadores en la tarea, no en el agente          | Contador en `loopState`                                                                     | Exigido                                                                     | **REUSE**         | Ambos cumplen                                                                                                                                    |
| **Locks**                                        | `open wx` atómico, `state/locks/<id>.lock`       | `classifyClaim` + `releaseClaim` con `confirmed:true`                                       | `O_EXCL` + heartbeat                                                        | **REUSE + ADAPT** | Claude-02 aporta la primitiva; Claude-03 aporta la clasificación y el rechazo a liberar por inferencia. Complementarios                          |
| **Ownership de worktree**                        | `worktree-ownership.json` + `WorktreeOwnedError` | n/a                                                                                         | §9                                                                          | **REUSE**         | Claude-02 lo cubre                                                                                                                               |
| **Rama protegida**                               | `PROTECTED_BRANCH` + `ProtectedBranchWriteError` | `BRANCH_MISMATCH` en preflight                                                              | §1.1                                                                        | **REUSE**         | Ambos; se conservan los dos, defensa en profundidad                                                                                              |
| **Queue**                                        | `queue.json` **dentro de `state/`, gitignored**  | n/a                                                                                         | `queue.yaml` **versionado**                                                 | **CONFLICT**      | Separar: definiciones de tarjeta versionadas; estado de ejecución ignorado. Hoy Claude-02 ignora también las definiciones                        |
| **Event log**                                    | `events.log` append-only                         | `history[]` en memoria                                                                      | `events.jsonl` append-only                                                  | **REUSE + ADAPT** | Claude-02 canónico; el `history` de Claude-03 se vuelca a él                                                                                     |
| **Política de hallazgos**                        | n/a                                              | `CRITICO`/`ALTO` no anulables; `MEDIO`/`BAJO` fail-closed con `allowSeverities`             | `CRÍTICO`/`ALTO` nunca; `MEDIO` → humano; `BAJO` si el contrato lo autoriza | **ADAPT**         | Alinear `MEDIO` → `BLOCKED_HUMAN_DECISION`                                                                                                       |
| **Severidades: acentuación**                     | n/a                                              | `CRITICO` (sin tilde)                                                                       | `CRÍTICO` (con tilde)                                                       | **CONFLICT**      | Canon del repositorio y de todas las auditorías es **`CRÍTICO`**. Normalizar en un módulo único de constantes                                    |
| **Independencia del auditor**                    | n/a                                              | `assertIndependentAuditor` en runtime                                                       | §11                                                                         | **REUSE**         | Pieza valiosa que Claude-02 no tiene                                                                                                             |
| **Auditor contradictorio**                       | n/a                                              | `PASSED` con hallazgos bloqueantes → `BLOCKED_ARCHITECTURE`                                 | No especificado                                                             | **REUSE**         | Mejora real de Claude-03: adoptar e incorporar a la arquitectura                                                                                 |
| **Integration gate**                             | Estado terminal, sin manifest                    | `evaluateIntegrationReadiness` con 9 condiciones y manifest nunca parcial                   | §14 con `conflict_prediction`                                               | **REUSE + ADAPT** | Adoptar Claude-03; añadirle `conflict_prediction` de §14, que hoy no calcula                                                                     |
| **`allowed_write` con globs**                    | n/a                                              | **`Set` de coincidencia exacta**                                                            | Globs (§6)                                                                  | **CONFLICT**      | Defecto: con `allowed_write: ["apps/api/**"]` ningún archivo real coincide y todo se rechaza. Requiere matcher de globs                          |
| **`forbidden_scope`**                            | n/a                                              | `startsWith` (prefijo)                                                                      | Globs                                                                       | **ADAPT**         | Funciona para directorios; unificar con el mismo matcher                                                                                         |
| **Colisión de archivos**                         | n/a                                              | Coincidencia exacta de ruta, sin globs (límite documentado)                                 | Intersección de globs (§10)                                                 | **ADAPT**         | Elevar al mismo matcher de globs                                                                                                                 |
| **Preflight Git**                                | n/a                                              | `evaluatePreflight` puro + `gatherGitFacts` con `execFileSync` y `git rev-parse --git-path` | §16                                                                         | **REUSE**         | Correcto y consciente de worktrees. Adoptar tal cual                                                                                             |
| **Stale base**                                   | n/a                                              | `evaluateStaleBase`, nunca rebasea; `allowRebase` explícito                                 | §16, rebasar es humano                                                      | **REUSE**         | Coinciden                                                                                                                                        |
| **Recovery**                                     | `resume` en CLI                                  | `classifyClaim`, `findRecoverableClaims`, `validateCandidateEnvironment`                    | §16, nueve escenarios                                                       | **REUSE + ADAPT** | Complementarios; Claude-03 es más completo                                                                                                       |
| **Concurrencia (5 comprobaciones)**              | Parcial                                          | Sólo colisión de archivos                                                                   | 5 comprobaciones (§10)                                                      | **ADAPT**         | Faltan: dependencia transitiva, cerrojo de migración, `D-XXX` pendiente, contrato compartido                                                     |
| **`README.md` del motor**                        | Presente (158 líneas)                            | Ninguno                                                                                     | n/a                                                                         | **REUSE**         | Conservar como documentación operativa del módulo                                                                                                |
| **Duplicación real**                             | —                                                | —                                                                                           | —                                                                           | **DUPLICATE**     | Estados y límites de QA implementados dos veces. Tras la reconciliación queda **una**                                                            |

### 6.4 Nada que eliminar

Ningún módulo se marca `REMOVE`. Las dos implementaciones son en gran medida **complementarias**: Claude-02 aportó cola, máquina de estados, lock, worktrees y CLI; Claude-03 aportó QA, hallazgos, preflight Git, stale base, integración y recovery. El solape real se reduce a estados de QA y límites de ciclo. La reconciliación es un traslado de ruta más renombrados, no una reescritura.

---

## 7. Conflictos de máquina de estados — resumen accionable

1. **`IN_QA` vs `QA`** — renombrar en Claude-03.
2. **`BLOCKED_HUMAN_DECISION` ausente en Claude-03** — añadirlo y enrutar `MEDIO` hacia él.
3. **`BLOCKED → READY` sin gate humano en Claude-02** — añadir `requiresHuman`; hoy un dispatcher automático podría desbloquear por su cuenta.
4. **`INTEGRATING`/`INTEGRATED`/`PASSED` ausentes en ambos** — reconocerlos sin transición iniciable por el motor.
5. **`CRITICO` sin tilde** — normalizar a `CRÍTICO` en un módulo único de constantes.
6. **`allowed_write` sin globs** — defecto funcional que hace inusable el contrato de §6.

---

## 8. Migraciones requeridas

| #   | Migración                                                                               | Ejecutable sin humano | Motivo                                          |
| --- | --------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------- |
| M1  | Versionar `.claude/rules/**`                                                            | **Sí**                | Documentos de política ya escritos y en uso     |
| M2  | Versionar `.claude/agents/**`                                                           | **Sí**                | Ídem                                            |
| M3  | Versionar `.claude/skills/**`                                                           | **Sí**                | Ídem                                            |
| M4  | Versionar `.claude/automation/nightly-queue.md`                                         | **Sí**                | Ídem; no cambia estados de tarea                |
| M5  | Versionar `.claude/settings.json`                                                       | **No**                | Cambia el perímetro de permisos efectivo (§3.1) |
| M6  | Añadir `.claude/settings.local.json`, `.worktrees/`, `.audit-worktrees/` a `.gitignore` | **No**                | `.gitignore` afecta a todo colaborador          |
| M7  | Decidir el destino de `docs/AI_OS/**`                                                   | **No**                | Decisión de gobierno documental (§10)           |
| M8  | Trasladar `tools/autonomous-loop-engine/` → `.claude/automation/loop-engine/`           | **No**                | Requiere ratificar la ubicación canónica        |
| M9  | Reconciliar máquinas de estado (§7)                                                     | **No**                | Depende de M8                                   |
| M10 | Separar definiciones de tarjeta (versionadas) del estado de ejecución (ignorado)        | **No**                | Depende de M8                                   |

**M1–M4 son técnicamente ejecutables sin humano, pero no las ejecuté.** Versionar reglas de gobierno es en sí un acto de gobierno, y `00-governance.md` §Gobierno 3 exige alcance y aprobación explícitos para documentos canónicos. Se entregan como propuesta.

---

## 9. Aprobaciones humanas requeridas

| #   | Decisión                                                                       | Por qué no puede automatizarse                                        |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| H1  | Versionar `.claude/settings.json`                                              | Endurece permisos para todos; es política, no técnica                 |
| H2  | Cambios a `.gitignore` (M6)                                                    | Afecta a todo colaborador                                             |
| H3  | Ubicación canónica `.claude/automation/loop-engine/` y no creación de `tools/` | Descarta trabajo ya entregado por un agente; decisión de arquitectura |
| H4  | Ubicación de worktrees `.worktrees/loop/<task_id>`                             | Corrige a Claude-02; afecta al aislamiento                            |
| H5  | Destino de `docs/AI_OS/**`                                                     | Gobierno documental (§10)                                             |
| H6  | Normalización de severidad a `CRÍTICO`                                         | Toca el vocabulario canónico de hallazgos                             |
| H7  | Ratificar la arquitectura `8f6fa6b` y este documento                           | Prerrequisito de todo lo anterior                                     |

**Estado tras la resolución humana del 2026-08-10:** `H3` y `H7` **RATIFICADAS**; `H5` **RESUELTA — `H5-B`** (§10). `H1`, `H2`, `H4` y `H6` ya fueron aplicadas como parte de la implementación registrada en §13. La tabla de arriba se conserva sin reescribir como registro del análisis original.

---

## 10. Pregunta abierta — `docs/AI_OS/`

Once documentos que se autodescriben como «punto de entrada documental para las inteligencias artificiales», con su propio `README.md` que exige actualizar `PROJECT_INDEX.md` y `CHANGELOG.md` al crear un archivo — **y que nunca han estado en Git**. Su `README.md` afirma que ciertos archivos están «pendientes de creación», lo que sugiere intención de permanencia, no un borrador desechable.

Ninguna transición del Loop Engine depende de ellos: clase **B**. La decisión no bloquea `LOOP-000`, pero conviene resolverla, porque hoy el AI OS se cita como autoridad sin ser canónico según la regla 3 de `00-governance.md`.

Tres opciones, sin preselección: **(a)** versionarlo completo; **(b)** declararlo explícitamente local por diseño y anotarlo en su `README.md`; **(c)** versionar sólo `AI_RULES.md` y `04_AI_MODELS.md` (los dos con contenido normativo) y dejar el resto local.

### Resolución — `H5-B` (2026-08-10)

**RESUELTA.** El responsable de producto adoptó la opción **(b)**: `docs/AI_OS/**` permanece **local y no canónico**. No se versiona ninguno de sus once archivos.

Fundamento, verificado contra el repositorio:

1. Ninguna transición del Loop Engine depende de `docs/AI_OS/**` (clase B, confirmado en §2).
2. Sigue sin estar versionado (`git ls-files docs/AI_OS` → 0 archivos antes y después de `LOOP-000`).
3. `.claude/agents/documentation-engineer.md`, ya versionado por `LOOP-000`, **prohíbe explícitamente** elevar `docs/AI_OS/` a autoridad canónica: _"Elevar los contenidos no versionados en `docs/AI_OS/` o prototipos locales a autoridad canónica"_ está en su lista de acciones prohibidas.
4. Las fuentes de autoridad siguen siendo exclusivamente las ya versionadas: `AI_PLAYBOOK.md`, `CLAUDE.md`, `DOCUMENTATION_STYLE_GUIDE.md`, `brain/DECISIONS.md` y el checklist de la EWO activa.

Esta resolución **no** anota el `README.md` de `docs/AI_OS/` — anotarlo sería editar ese árbol documental, fuera del alcance autorizado de esta misión (§5, Tarea 5). La anotación queda como trabajo pendiente, no bloqueante para `LOOP-001`.

---

## 11. Plan de implementación de `LOOP-000`

Tras ratificación, en este orden:

1. **H1–H7 resueltas** por el responsable de producto.
2. **M1–M4** — versionar reglas, agentes, skills y cola. Verificación: un worktree nuevo contiene `.claude/rules/` completo.
3. **M5** — versionar `settings.json`. Verificación: un worktree nuevo contiene el `deny`.
4. **M6** — `.gitignore`. Verificación: `git status` deja de listar `.worktrees/` y `.audit-worktrees/`.
5. **M7** — aplicar la decisión sobre `docs/AI_OS/`.
6. **`verifySubstrate`** (§5) en el dispatcher, con `BLOCKED (substrate_missing)`.
7. **M8–M10** — reconciliación del motor; entra en `LOOP-001`, no en `LOOP-000`.

**Criterio de aceptación de `LOOP-000`:** un worktree creado desde la rama contiene `.claude/rules/` (5), `.claude/agents/` (8), `.claude/settings.json`, `.claude/automation/nightly-queue.md`, `CLAUDE.md` y `AI_PLAYBOOK.md`; `settings.local.json` sigue ignorado; `git status` limpio; ningún archivo de producto modificado.

---

## 12. Corrección aplicada a la arquitectura

Este documento corrige `8f6fa6b` en dos puntos verificados contra implementación real, y en nada más:

1. **§8 — ruta del motor:** `.claude/automation/loop/` → `.claude/automation/loop-engine/`.
2. **§9 — ruta de los worktrees:** se fija `.worktrees/loop/<task_id>` y se prohíbe `.claude/worktrees/` (colisión con los worktrees efímeros de Claude Code, ya ignorados).

Se incorpora además una mejora aportada por Claude-03 que la arquitectura no había previsto: **un veredicto `PASSED` acompañado de hallazgos aún bloqueantes es una inconsistencia del auditor y escala a `BLOCKED_ARCHITECTURE`**, nunca a integración.

El resto de la arquitectura se mantiene sin cambios.

---

## 13. Registro de implementación de `LOOP-000` (2026-08-10)

**Autorización humana aplicada:** `H3` (ubicación canónica `.claude/automation/loop-engine/`), `H7` (ratificación de la arquitectura v0.2) y autorización expresa de implementar `LOOP-000`, con la restricción explícita de versionar **únicamente el sustrato compartido realmente necesario y seguro** — no `.claude/` de forma indiscriminada.

### 13.1 Archivos versionados (16)

Cada archivo fue **leído completo e inspeccionado individualmente** antes de añadirse. En ningún momento se ejecutó `git add .claude`.

| Grupo                 | Archivos                                                                                                                                                                           | Garantía que aporta                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `.claude/rules/`      | `00-governance.md`, `10-multitenancy-security.md`, `20-fiscal-data-safety.md`, `30-quality-scope.md`, `40-parallel-work.md`                                                        | Gobierno, seguridad Git, trabajo paralelo, ownership, gates fiscales, prohibición de debilitar pruebas |
| `.claude/agents/`     | `contaia-orchestrator`, `qa-engineer`, `principal-architect`, `security-reviewer`, `fiscal-accounting-reviewer`, `backend-engineer`, `frontend-engineer`, `documentation-engineer` | Contrato de misión por rol, QA independiente, modelo de severidades, condiciones de parada             |
| `.claude/automation/` | `nightly-queue.md`                                                                                                                                                                 | Cola, regla de selección y límites de ejecución nocturna                                               |
| Configuración         | `.claude/settings.json`                                                                                                                                                            | `deny` de `git merge` / `git reset --hard` / `git clean`; `ask` de commit/push/rebase/migraciones      |
| Exclusiones           | `.gitignore` (modificado)                                                                                                                                                          | Mantiene fuera `settings.local.json` y el `state/` del motor                                           |

### 13.2 Excluido deliberadamente

| Ruta                             | Clase | Motivo                                                                                                                     |
| -------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------- |
| `.claude/settings.local.json`    | C     | Preferencia de una máquina. Añadido a `.gitignore`; verificado que Git ya no lo ve aun estando presente en disco           |
| `.claude/skills/**` (9 archivos) | B     | Procedimientos de **construcción**, no de gobierno. Ninguna de las doce garantías del sustrato depende de ellos. Ver §13.3 |
| `.claude/worktrees/**`           | C     | Worktrees efímeros de Claude Code                                                                                          |
| `docs/AI_OS/**` (11 archivos)    | B     | `H5` sigue pendiente. Ver §10 y §13.4                                                                                      |

### 13.3 Divergencia declarada frente a la clasificación de §2

`.claude/skills/contaia-fiscal-safety/references/fiscal-source-policy.md` estaba clasificado **A** en §2. Tras leerlo completo se comprueba que son 13 líneas que **complementan** —no sustituyen— la garantía que ya aporta `.claude/rules/20-fiscal-data-safety.md`, que sí queda versionado. La garantía de gobierno («ninguna regla fiscal sin fuente oficial vigente y revisión humana») se conserva íntegra sin él.

Se reclasifica a **B** y se excluye, aplicando la restricción humana de versionar sólo lo necesario. **La divergencia se declara aquí en vez de aplicarse en silencio**; revertirla es un `git add` de un archivo si el responsable de producto prefiere lo contrario.

La frontera adoptada es: **gobierno se versiona; procedimiento de construcción no.** Las reglas, los agentes, la cola y los permisos dicen _quién puede actuar, qué está prohibido y qué está denegado_; las skills dicen _cómo construir bien_. `LOOP-000` cubre lo primero.

### 13.4 `verifySubstrate` — no implementado en `LOOP-000`, y por qué

§5 propone una verificación de existencia. **No se implementa aquí**, por una razón concreta: su ubicación natural es el motor canónico `.claude/automation/loop-engine/`, que todavía no existe — se crea en `LOOP-001` durante la reconciliación. Escribirlo ahora obligaría a inventar una estructura paralela que `LOOP-001` tendría que desmontar, y contradiría la instrucción de no anticipar la reconciliación de los motores.

Queda como **precondición explícita de `LOOP-001`**, con el contrato ya fijado en §5: comprobar existencia, fallar con error claro, bloquear la ejecución autónoma; nunca copiar, crear ni reparar. Git es quien entrega el gobierno.

### 13.5 Evidencia de worktree limpio

Verificado sobre un worktree creado desde el commit candidato, **sin copiar nada a mano**: los 15 archivos de gobierno llegan por Git; `settings.local.json` no aparece; no hay estado de ejecución; no hay secretos ni configuración personal. Detalle en el reporte de la misión.

### 13.6 Estado de las migraciones

| Migración                          | Estado                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1 — versionar `.claude/rules/**`  | **APLICADA**                                                                                                                                                                                                                                                                                                                               |
| M2 — versionar `.claude/agents/**` | **APLICADA**                                                                                                                                                                                                                                                                                                                               |
| M3 — versionar `.claude/skills/**` | **NO APLICADA** — reclasificada a B (§13.3)                                                                                                                                                                                                                                                                                                |
| M4 — versionar `nightly-queue.md`  | **APLICADA**                                                                                                                                                                                                                                                                                                                               |
| M5 — versionar `settings.json`     | **APLICADA** — autorizada por el gate humano                                                                                                                                                                                                                                                                                               |
| M6 — `.gitignore`                  | **APLICADA** — `settings.local.json`, `.claude/automation/loop-engine/state/` y, tras el cierre de hallazgos de §14, `.claude/worktrees/`. `.worktrees/` (sin punto, distinto de `.claude/worktrees/`) y `.audit-worktrees/` **no** se tocan: esa entrada ya existe sin confirmar en el árbol principal y absorberla mezclaría iniciativas |
| M7 — destino de `docs/AI_OS/**`    | **APLICADA — `H5-B`** (§10)                                                                                                                                                                                                                                                                                                                |
| M8–M10 — reconciliación del motor  | **PENDIENTE** — `LOOP-001`, bloqueada hasta reauditoría de `LOOP-000` (§14)                                                                                                                                                                                                                                                                |

---

## 14. Cierre de hallazgos de auditoría independiente (2026-08-10)

Auditoría `READ ONLY` de Codex sobre el candidato `7471806894869b775b31280e7ea6431f8259a3a7`: veredicto **`REQUIERE CAMBIOS`**. Los gates técnicos A–I (staging archivo por archivo, ausencia de secretos, portabilidad, no-bulk-add, alcance) **pasaron**. Dos hallazgos activos, ninguno técnico:

### MEDIO — Arquitectura seguía marcada `PROPUESTA — PENDIENTE DE RATIFICACIÓN`

**Ubicación:** encabezado de `AUTONOMOUS_LOOP_ENGINE_V1_ARCHITECTURE.md`, y §20 puntos 1–2.
**Problema:** el responsable de producto ya había aprobado `H7` (ratificación) y `H3` (ubicación canónica), pero el documento seguía leyéndose como si la ejecución no estuviera autorizada por falta de ratificación.
**Corrección aplicada:** encabezado actualizado a `RATIFICADA` con fecha, autoridad y alcance exacto de la ratificación; §20 marca los puntos 1 y 2 como resueltos con tachado, preservando el texto original como historial. **La advertencia de seguridad real se conserva**: cada tarjeta de implementación (`LOOP-001` en adelante) sigue exigiendo su propio commit candidato y su propia auditoría `READ ONLY` — la ratificación del diseño no la sustituye.

### BAJO — `.claude/worktrees/` sólo ignorado localmente

**Ubicación:** `.gitignore` del repositorio.
**Problema:** la exclusión de `.claude/worktrees/` (worktrees efímeros de Claude Code) vivía únicamente en `.git/info/exclude`, que no viaja con el repositorio ni con un clon nuevo.
**Corrección aplicada:** entrada añadida al `.gitignore` **versionado**. Verificado con `git check-ignore -v` en un worktree fresco creado desde el candidato: la ruta resuelve contra el `.gitignore` del árbol, no contra `.git/info/exclude` local — ver reporte de la misión, sección "`.gitignore` portability".

**Nada más estaba activo.** No se tocó `.claude/rules/**`, `.claude/agents/**`, `.claude/settings.json` ni `.claude/automation/**` en esta misión: sólo `.gitignore` y los dos documentos.
