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
9. **No se auto-repara.** Una recuperación pendiente bloquea la tarjeta hasta
   que una persona la resuelva con `--confirmed`; no caduca ni se limpia sola.
10. **No decide sobre estado no confirmado.** Mientras una transacción no esté
    respaldada por el event log, ninguna operación decisoria la consume.

## Estructura

```
queue.yaml        VERSIONADO — definiciones de tarjeta (intención)
cli.mjs           VERSIONADO — interfaz de línea de comandos
lib/              VERSIONADO — el motor
test/             VERSIONADO — suite completa (node:test)
state/            IGNORADO   — runtime efímero; ya cubierto por el
                              .gitignore raíz que versionó LOOP-000
```

`state/` contiene `<task_id>.json` (estado y contadores), `locks/<id>.lock.json`
(ownership), `events.jsonl` (log append-only) con su `events.lock` global,
`manifests/` y `recovery/<task_id>.json` (evidencia de una transacción que no
pudo deshacerse; sólo aparece si algo fue mal). Nada de eso se
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

En el gate de integración esos globs **no se evalúan contra lo que el
constructor declara**, sino contra el diff real que devuelve
`git diff --name-only base..candidato`. Lo declarado se compara aparte: si
difiere, bloquea.

## QA: dos ownerships, no uno

`READY_FOR_QA → QA` exige poseer la tarjeta, y quien la posee es el
implementador — que por definición no puede auditarse. Sin separar los dos
ownerships no había flujo de QA ejecutable:

| Ownership          | Quién                    | Sobre qué                                  |
| ------------------ | ------------------------ | ------------------------------------------ |
| Lock de la tarjeta | implementador            | código, worktree, commit candidato         |
| Handoff de QA      | auditor independiente    | proceso de QA y su traza en `state/`       |

El auditor **nunca adquiere el lock** y nunca escribe en el worktree. Su
autoridad se limita a `READY_FOR_QA`, `QA` y —sólo para escalar— a salir de
`QA_FAILED` hacia un `BLOCKED*`. Abrir `REPARACIÓN` sigue siendo del
implementador.

Que el veredicto se persista en `state/` no rompe el «QA READ ONLY»: el
auditor no toca código, worktree, commit ni documentación de producto.
Dejar constancia del proceso es justamente lo que faltaba.

El flujo real:

```
implementador:  … → TESTING → READY_FOR_QA
implementador:  cli.mjs handoff <id> --agent <impl> --file evidencia.json [--auditor <id>]
auditor:        cli.mjs qa      <id> --auditor <aud> --audit veredicto.json
                → persiste READY_FOR_QA → QA → {READY_FOR_INTEGRATION | QA_FAILED | BLOCKED*}
```

Todo lo que puede fallar por contrato falla **antes** de la primera
escritura, porque el ciclo se calcula puro (`qa-loop.mjs`) y sólo después se
persiste (`qa-session.mjs`).

## Transacciones: qué garantiza v1 y qué no

`events.jsonl` es un recurso **global**, compartido por todas las tarjetas.
La primera versión de la sesión de QA lo protegía con un lock por `task_id`
y, al fallar, lo truncaba al tamaño que tenía al empezar; si otra tarjeta
había registrado un evento válido en ese intervalo, ese evento
desaparecía. Un log append-only no se deshace borrando historia.

De ahí el diseño actual (`transaction.mjs`):

```
PREPARE   todos los saltos se validan y se pliegan en memoria, sin escribir
LOCKS     lock global del log y, dentro, el lock de estado
STATE     estado nuevo MARCADO `transaction_pending`
EVENTS    una sola escritura con todo el grupo
CONFIRM   se retira la marca: el estado ya está respaldado por el log
```

Todos los pasos ocurren bajo `state/events.lock`, la **única** exclusión del
log y la misma para todo escritor. `fs.appendFileSync` sobre el log aparece
exactamente una vez en todo el motor, y hay pruebas que verifican ambas
cosas sobre el código fuente.

Lo que v1 **garantiza**:

- nunca se pierde un evento ya persistido, propio o de otra tarjeta;
- un fallo al escribir el estado no deja eventos de esa transacción;
- un fallo al escribir los eventos no deja el estado adelantado: se
  restaura sólo `state/<task_id>.json`, y el log no se toca jamás;
- si esa restauración también falla, se lanza `RecoveryRequiredError` y se
  deja evidencia en `state/recovery/<task_id>.json` en vez de silenciarlo;
- los eventos de una transacción comparten `transaction_id` y entran todos
  o ninguno, porque son una sola llamada de escritura;
- **mientras el estado no esté respaldado por el log, ninguna operación
  decisoria puede consumirlo** (ver la marca, abajo).

Lo que v1 **no** garantiza, y no conviene suponer: **no es ACID.** No hay
journal ni commit en dos fases, no hay `fsync`, y las lecturas del log no
toman lock. Un corte de energía a media llamada del sistema operativo puede
dejar una línea incompleta; `readEvents()` fallaría al parsearla, que es
ruidoso a propósito. Tampoco hay aislamiento de instantánea: la ventana entre
STATE y EVENTS **existe**, sólo que ya no es silenciosa.

### La marca `transaction_pending`

Entre STATE y EVENTS el estado en disco va por delante del log. Antes eso no
se señalaba, así que un lector concurrente (`status`, `list`, `readiness`, el
dispatcher) podía **decidir** sobre un estado que un instante después se
restauraba — hallazgo MEDIO de la reauditoría.

Ahora el intervalo es local y verificable: `state/<task_id>.json` lleva
`transaction_pending` mientras dura, y `lib/guard.mjs` lo convierte en
fail-closed. Eliminarlo exigiría un journal; hacerlo explícito no.

| Consumidor                                    | Comportamiento                     |
| --------------------------------------------- | ---------------------------------- |
| `transition` · `block` · `release` · `resume`  | bloquea (`PENDING_TRANSACTION`)    |
| `claim` / dispatcher                           | la tarjeta no es elegible          |
| `handoff` · `qa`                               | bloquea                            |
| `readiness`                                    | bloquea                            |
| `status` · `list`                              | **informa**, nunca promueve        |

Si la marca no puede retirarse en CONFIRM, la transacción fue correcta pero
no pudimos cerrarla: se deja evidencia de recuperación y la tarjeta queda
bloqueada. Una limpieza fallida nunca se da por buena.

## Recuperación: bloqueante y con resolución humana

`state/recovery/<task_id>.json` no es un aviso, es un **bloqueo**. Su sola
presencia hace que la tarjeta no admita ninguna operación que la promueva
(`RECOVERY_REQUIRED`). Antes la evidencia se escribía y nadie la consultaba
— hallazgo ALTO de la reauditoría: la tarjeta seguía avanzando sobre un
estado que el propio motor había declarado irrecuperable.

**No hay auto-heal.** Nada caduca, nada se resuelve solo y ninguna ruta del
motor levanta el bloqueo como efecto lateral. Salir exige una persona:

```
node cli.mjs resolve-recovery <task_id> --human <id> --reason <texto> --confirmed \
                              [--disposition block_human_decision|restore_snapshot]
```

El orden es parte del contrato, no un detalle:

```
VALIDATE   confirmación humana, actor, razón, disposición, recovery activa
PREPARE    se lee la evidencia y se comprueba si el log la contradice
STATE      se aplica la disposición bajo el lock de estado
APPEND     se registra el evento de resolución en events.jsonl
ARCHIVE    sólo ahora se archiva la evidencia y se retira el bloqueo
```

**Una recuperación no está resuelta hasta que su evidencia obligatoria está
persistida.** Antes se archivaba y se borraba *antes* de escribir el evento, y
un `appendEvents` fallido dejaba la tarjeta operable, sin traza de quién la
había desbloqueado y con un archivo en `resolved/` que afirmaba un éxito que
nunca ocurrió. Las dos rutas de fallo son fail-closed:

| Falla     | Qué pasa                                                                   |
| --------- | -------------------------------------------------------------------------- |
| `APPEND`  | no se toca nada; recovery sigue activa. `RESOLUTION_EVENT_NOT_PERSISTED`    |
| `ARCHIVE` | el evento ya es durable y **no se borra**; recovery sigue activa y queda marcada con `resolution_event_appended`. `RESOLUTION_INCOMPLETE` |

En el segundo caso `status` lo reporta como resolución **incompleta**, y
reintentar la misma resolución reconcilia sin duplicar la traza. `events.jsonl`
nunca se trunca.

Dos disposiciones, ninguna elegida por el motor:

- `block_human_decision` (por defecto) — el motor **no infiere** el estado
  correcto: la tarjeta va a `BLOCKED_HUMAN_DECISION` y decide una persona.
- `restore_snapshot` — sólo procede si la evidencia conserva el estado previo
  **y** el log confirma que los eventos de esa transacción nunca llegaron.
  Entonces restaurar no es adivinar: es reconciliar el estado con la única
  fuente de verdad. Si el log lo contradice, se rechaza.

La evidencia nunca se destruye: se archiva en `state/recovery/resolved/` con
quién, cuándo, por qué y con qué disposición, y la resolución queda además en
`events.jsonl` como acto humano.

## Locks bajo contención en Windows

`acquireLock` usa `O_EXCL` (`'wx'`), una sola syscall atómica. Bajo contención
real Windows devuelve dos códigos distintos, y confundirlos era el tercer
hallazgo de la reauditoría. Medido en Windows 11 · Node 24, 6 procesos × 4000
adquisiciones sobre la misma ruta:

```
open:EEXIST  21332      lock ocupado por otro proceso
open:EPERM    1857      ventana delete-pending de NTFS (~8 %)
```

`EPERM` aparece cuando un proceso llama a `unlink` mientras otro hace
`CreateFile`: Win32 devuelve `ERROR_ACCESS_DENIED` y libuv lo traduce a
`EPERM`. No es un error permanente ni un lock legible — es contención.

El criterio es deliberadamente **estrecho**: sólo se reintenta el `EPERM` que
ocurre al crear/abrir el lock y con el directorio contenedor escribible.
`withLock` lo reintenta con presupuesto acotado y backoff lineal con techo de
100 ms; agotarlo **falla** (`TransientLockError`), nunca devuelve éxito.
Cualquier otro código (`ENOENT`, `EACCES`, `EROFS`, `EMFILE`…) se propaga en el
primer intento. `EEXIST` sigue siendo `LockHeldError`, y nadie borra un lock
ajeno.

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
node cli.mjs handoff <task_id> --agent <implementer_id> --file <f.json> [--auditor <id>]
node cli.mjs qa <task_id> --auditor <auditor_id> --audit <f.json>
node cli.mjs readiness <task_id> [--repo <ruta>] [--target <ref>] [--write] [--decisions <f.json>]
node cli.mjs resolve-recovery <task_id> --human <id> --reason <t> --confirmed [--disposition <d>]
node cli.mjs migration-lock-status
node cli.mjs resolve-migration-lock --human <id> --reason <t> --confirmed
```

`claim` y `readiness` aceptan `--decisions <archivo.json>`: evidencia
explícita de estado de decisión `D-XXX` en la forma
`{ "D-014": { "status": "ACEPTADA" } }` (§10.4). El motor nunca la deriva
leyendo `brain/DECISION_INDEX.md` ni infiriéndola de que exista código en
una rama — sin el archivo, cualquier `decision_refs` declarado bloquea por
ausencia de evidencia, no por aprobación asumida.

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

Se ejecuta la suite completa; aquí no se declara un número de pruebas,
porque una cifra escrita a mano queda obsoleta en la primera tarjeta que
añada casos. Sin dependencias nuevas y sin registrar el motor en `pnpm-workspace.yaml`:
corre con Node nativo.

## Gates avanzados de concurrencia (`LOOP-002`)

Completa las cinco comprobaciones de §10 sobre la base certificada de
`LOOP-001`, sin rediseñarla:

1. **Dependencia transitiva** (`transitiveDependencyClosure` en
   `concurrency.mjs`). No basta con que el padre directo esté satisfecho: si
   A depende de B y B de C, un C sin cerrar bloquea a A aunque B ya lo esté.
   Recorre el grafo completo con protección de ciclos (`visited`) y **falla
   cerrado ante DAG malformado** — un `task_id` referenciado que no existe en
   la cola cuenta como no satisfecho, nunca se ignora.
2. **Cerrojo de migración** (`migration-lock.mjs`). Un único archivo global
   (`state/locks/migration.lock.json`, no uno por tarea), con el mismo
   primitivo `acquireLock`/`releaseLock` de `lock.mjs`. Nadie libera el
   cerrojo de otra tarjeta, y uno vencido **sigue bloqueando** — vencido
   nunca es sinónimo de libre; liberarlo exige
   `resolve-migration-lock --confirmed`, un gate humano explícito.
3. **Gate de decisión `D-XXX`** (`decision-gate.mjs`). El motor recibe
   `decisionEvidence` como parámetro explícito — nunca lee
   `brain/DECISION_INDEX.md` ni infiere aprobación de que el código exista en
   una rama. Sin evidencia para un `decision_refs` declarado, bloquea; con
   evidencia, sólo las tres formas canónicas de la arquitectura
   (`ACEPTADA`, `Aprobada y vigente`, `IMPLEMENTADA · PASSED`) permiten.
4. **Colisión de contrato compartido** (`contracts.mjs`). Contract-driven,
   no adivinanza por nombre de archivo: compara los `allowed_write`
   declarados de una tarjeta contra el `reads_contract` declarado de la
   otra (bidireccional), exactamente como especifica la arquitectura §10.5.
   Detecta colisión aunque los `allowed_write` de ambas no se toquen en
   absoluto — es el caso que un colisionador de rutas puro no ve.

`queue.yaml` gana un campo de definición opcional y versionado,
`decision_refs` (`DEFINITION_FIELDS_VERSION = 2`), aditivo: una tarjeta `v1`
sin él sigue siendo válida y se comporta exactamente igual que antes. Un
`decision_refs` malformado (que no calce `D-NNN`/`D-NNN.N`) se rechaza en la
validación de `queue.yaml`, no se ignora en silencio.

`conflict_prediction`, en el manifest de `readiness`, se extiende con las
siete dimensiones — `file_collision`, `glob_overlap`,
`shared_contract_collision`, `dependency_conflict`, `stale_base`,
`migration_lock`, `pending_decision` — calculadas sobre la cola real cuando
se provee (`tasks`); sin ella se reportan `calculable: false`, nunca se
omiten en silencio. Como el resto de `conflict_prediction`, son
**informativas**: no bloquean `ready` por sí solas — la elegibilidad para
*trabajar* una tarjeta ya la decide `evaluateConcurrency` antes del
despacho, no el manifest de integración.

## Limitaciones conocidas de v1

- El lector de YAML cubre sólo el subconjunto que `queue.yaml` necesita y falla
  ruidosamente ante el resto (anclas, escalares de bloque, estilo de flujo).
- `events.jsonl` no rota ni se compacta.
- La ejecución real del constructor y del auditor (invocar al agente, correr
  `test_commands`) no forma parte de `LOOP-001`: el motor gestiona estado,
  alcance y evidencia, no lanza procesos de agente.
