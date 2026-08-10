# Loop Engine v1 — motor unificado

Motor de ejecución de tarjetas de ingeniería de ContaIA. **No es** código de
producto: no toca `apps/**`, `packages/**`, Prisma ni migraciones.

Implementa `LOOP-001` de
[`AUTONOMOUS_LOOP_ENGINE_V1_ARCHITECTURE.md`](../../../docs/engineering/AUTONOMOUS_LOOP_ENGINE_V1_ARCHITECTURE.md)
(ratificada 2026-08-10), sobre el sustrato de gobierno versionado por
`LOOP-000` ([`LOOP-000_GOVERNANCE_SUBSTRATE.md`](../../../docs/engineering/LOOP-000_GOVERNANCE_SUBSTRATE.md)).

## Un solo motor

Este directorio es la **ubicación canónica única** (`H3`, ratificada). Unifica
dos implementaciones paralelas previas, ambas construidas sobre `dac9428` sin
conocer la arquitectura:

| Aporta                                                            | Origen                    |
| ----------------------------------------------------------------- | ------------------------- |
| Cola, máquina de estados, locks, worktrees, event log, CLI        | Claude-02 `7bdf159`       |
| QA, auditor independiente, hallazgos, preflight Git, stale base, integración, recovery | Claude-03 `2e128c7`       |

`tools/autonomous-loop-engine/` **no se crea**: `tools/` no existe en el
repositorio y su `package.json` insinuaba un paquete fuera de
`pnpm-workspace.yaml`.

## Garantías que el motor no puede violar

1. **No integra.** Su estado máximo es `READY_FOR_INTEGRATION`. Ninguna
   función hace `push`, `merge`, `rebase` ni `cherry-pick`; `dispatcher.mjs`
   ni siquiera importa `child_process` (verificado por prueba).
2. **No marca `PASSED`.** Ninguna transición hacia `PASSED`, `INTEGRATING` o
   `INTEGRATED` es ejecutable por un agente — todas exigen actor humano.
3. **No sale de `BLOCKED*` por su cuenta.** `BLOCKED → READY` es un gate
   humano; un agente que lo intente recibe `HumanGateRequiredError`.
4. **No escribe en ramas protegidas.** `feature/frontend-ux-audit` y `main`
   están vetadas; las ramas de tarea usan el prefijo reservado `loop/`.
5. **No repara el gobierno.** `verifySubstrate` comprueba y bloquea; nunca
   copia, genera ni repara. Git entrega el sustrato.
6. **No corrige anomalías de Git.** El preflight detecta, bloquea y reporta:
   nunca borra `index.lock` ni aborta un merge/rebase/cherry-pick.
7. **No borra nada ajeno.** Ni locks, ni worktrees, ni trabajo sin commitear.
   Liberar exige `confirmed: true` y coincidencia de dueño.
8. **No ignora hallazgos.** `CRÍTICO`/`ALTO` bloquean sin excepción; `MEDIO`
   exige decisión humana; `BAJO` sólo pasa con autorización explícita.

## Estructura

```
queue.yaml        VERSIONADO — definiciones de tarjeta (intención)
cli.mjs           VERSIONADO — interfaz de línea de comandos
lib/              VERSIONADO — el motor
test/             VERSIONADO — 100 pruebas (node:test)
state/            IGNORADO   — runtime efímero; ya cubierto por el
                              .gitignore raíz que versionó LOOP-000
```

`state/` contiene `<task_id>.json` (estado y contadores), `locks/<id>.lock.json`
(ownership), `events.jsonl` (log append-only) y `manifests/`. Nada de eso se
versiona: el historial del proyecto sigue siendo `CHANGELOG.md` y los
`_FINAL_AUDIT.md`, nunca `events.jsonl`.

### `queue.yaml` frente a `state/`

Es la separación que `LOOP-000` §6.3 marcó como conflicto pendiente: Claude-02
guardaba `queue.json` **dentro** de `state/`, con lo que ni las definiciones se
versionaban.

- `queue.yaml` declara qué tarjetas existen, su contrato y su estado inicial.
- `state/` guarda en qué estado va cada instancia.
- La única dirección de escritura es `queue.yaml → state/` (`instantiate()`).
  **El runtime nunca reescribe `queue.yaml`** (verificado por prueba).

Una tarjeta sólo necesita contrato completo (`base_commit`, `allowed_write`,
`test_commands`) si está en `READY`. Sin él **debe** estar `BLOCKED` — es la
regla §3.2 ("Si falta un campo del contrato → `BLOCKED`"), no una omisión.

## Máquina de estados

16 estados canónicos y la matriz 16×16 de §3.3, transcrita literalmente en
`lib/state-machine.mjs`. Cada arco es `'A'` (agente), `'H'` (humano) o
prohibido. No hay transición libre.

```
READY → CLAIMED → IMPLEMENTING → TESTING → READY_FOR_QA → QA → READY_FOR_INTEGRATION
                                    ↑ ↓                    ↓          ┊ (gate humano)
                                 REPAIRING ←──────── QA_FAILED    INTEGRATING → INTEGRATED → PASSED
```

Reconciliaciones aplicadas (`LOOP-000` §7): `IN_QA` → `QA`;
`BLOCKED_HUMAN_DECISION` presente y receptor de los `MEDIO`;
`BLOCKED → READY` marcado `requiresHuman`; `INTEGRATING`/`INTEGRATED`/`PASSED`
reconocidos pero inalcanzables para un agente.

Límites: 5 reparaciones de implementación, 2 ciclos de QA. **Sin auto-reset** —
ningún agente pone un contador a cero, y superarlos bloquea en vez de
reintentar.

## Severidades

`CRÍTICO` · `ALTO` · `MEDIO` · `BAJO`, con tilde, en `lib/constants.mjs` como
fuente única. Se acepta `CRITICO` como entrada y se normaliza, pero **lo que se
persiste es siempre la forma canónica**.

## Alcance de escritura

`allowed_write` y `forbidden_scope` se evalúan con un matcher de globs propio
(`lib/glob.mjs`), sin dependencias. Sustituye la coincidencia exacta de
Claude-03, que con `allowed_write: ["apps/api/**"]` no casaba ningún archivo
real y rechazaba todo. Soporta `*`, `**`, `?` y prefijo de directorio; cualquier
otra sintaxis se trata como literal, a propósito: un patrón que el motor no
entiende del todo no debe ampliar el alcance por accidente.

`forbidden_scope` gana siempre sobre `allowed_write`, y un `allowed_write`
ausente no autoriza nada.

## Comandos

```
node cli.mjs list [--state ESTADO]
node cli.mjs status <task_id>
node cli.mjs claim --agent <id> [--mission <id>] [--no-auto-start] [--skip-substrate]
node cli.mjs transition <task_id> --to <ESTADO> [--agent <id>|--human <id>] [--commit <sha>] [--reason <t>] [--blocked-reason <t>]
node cli.mjs block <task_id> --reason <texto> [--to BLOCKED|BLOCKED_ARCHITECTURE|BLOCKED_HUMAN_DECISION] [--blocked-reason <t>]
node cli.mjs release <task_id> --agent <id>
node cli.mjs resume <task_id> --human <id>          # exige --human
node cli.mjs validate [--worktree <ruta>] [--role <agent_role>]
node cli.mjs qa <task_id> --handoff <f.json> --audit <f.json>
node cli.mjs readiness <task_id> --handoff <f.json> --audit <f.json> [--write]
```

`release` distingue el momento: desde `CLAIMED` devuelve la tarjeta a `READY`
(no se construyó nada); desde `IMPLEMENTING` en adelante va a `BLOCKED`, porque
el worktree puede tener trabajo sin commitear y reabrir la tarjeta dejaría que
otro agente lo reclamara. Reactivarla es entonces un gate humano.

Variables de entorno para pruebas: `LOOP_ENGINE_STATE_DIR`,
`LOOP_ENGINE_QUEUE_FILE`, `LOOP_ENGINE_REPO_ROOT`.

## Pruebas

```
node --test 'test/*.test.mjs'
```

Sin dependencias nuevas y sin registrar el motor en `pnpm-workspace.yaml`:
corre con Node nativo.

## Limitaciones conocidas de v1

- Las comprobaciones de concurrencia §10.4 (`D-XXX` no aceptada) y §10.5
  (contrato compartido) están **declaradas pero no implementadas**: devuelven
  `status: 'NOT_IMPLEMENTED'` para no confundirse con "comprobado y correcto".
  Corresponden a tarjetas posteriores.
- El lector de YAML cubre sólo el subconjunto que `queue.yaml` necesita y falla
  ruidosamente ante el resto (anclas, escalares de bloque, estilo de flujo).
- `events.jsonl` no rota ni se compacta.
- La ejecución real del constructor y del auditor (invocar al agente, correr
  `test_commands`) no forma parte de `LOOP-001`: el motor gestiona estado,
  alcance y evidencia, no lanza procesos de agente.
