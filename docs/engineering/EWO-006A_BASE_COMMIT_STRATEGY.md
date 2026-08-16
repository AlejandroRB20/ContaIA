# EWO-006A BASE_COMMIT STRATEGY

> Documento no ejecutable. No es `queue.yaml`. No materializa tarjetas. No autoriza
> `git merge`, `git rebase`, `git commit` ni ningún cambio de código. Registra el
> análisis read-only de estrategia de `base_commit` operativo para EWO-006A.

## 1. Snapshot de ramas y HEADs

| Ref | HEAD | Contenido relevante |
|---|---|---|
| `main` | `79dccd7` | Base histórica |
| `feature/frontend-ux-audit` | `dac9428` | Trunk de facto (worktree con cambios sin confirmar al momento del análisis) |
| `gov/d013-d015-decision-stack` | `344c690` | D-013…D-016 + auditorías EWO-SEC-NAV-001 |
| `loop/002-missing-context-failclosed` | `00342f6` | Motor Loop Engine + `queue.yaml` real |
| `loop/e6a-s2-t01-account-permission-catalog` | `295b962` | Antecedente D-014, huérfano |

Topología verificada:

```
79dccd7 (main)
   │  44 commits
   ▼
dac9428 (feature/frontend-ux-audit) ◄── merge-base común de gov y loop
   ├──► +17 commits ──► 344c690  gov     [D-014/D-016 · SIN motor Loop]
   └──► +14 commits ──► 00342f6  loop    [motor Loop · SIN D-014/D-016]
```

Hechos confirmados con `git merge-base --is-ancestor` y `git rev-list --count`:

- `main` es ancestro de `dac9428`; `dac9428` es ancestro de `344c690`. `gov..main` = 0 commits → `gov` es fast-forward puro de `main` y de `feature/frontend-ux-audit`.
- `00342f6` no es ancestro de `gov` ni de `main`: `gov` y `loop` han divergido desde `dac9428`.
- `295b962` bifurca de `f64b429` (un commit antes de `344c690`): contiene D-013/D-014/D-015 pero no D-016; no es ancestro de `gov`.

Disyunción de contenido confirmada archivo por archivo:

| | `.claude/automation/loop-engine/` | D-014/D-016 en `brain/DECISION_INDEX.md` |
|---|---|---|
| `344c690` (gov) | No existe | Presentes |
| `00342f6` (loop) | Presente (motor + `queue.yaml` real) | Ausentes |

Ningún commit existente en el repositorio contiene ambas mitades a la vez.

## 2. Diagnóstico — por qué NO usar `base_commit: null`

No es una preferencia de diseño: es un fallo verificado en el código real del motor.

`.claude/automation/loop-engine/lib/worktree.mjs`, función `ensureWorktree`:

```js
export function ensureWorktree({ taskId, baseCommit, branch }) {
  if (!baseCommit) throw new Error('base_commit es obligatorio para crear un worktree.');
  ...
  git(['cat-file', '-e', `${baseCommit}^{commit}`], repoRoot());
  git(['worktree', 'add', '--detach', dir, baseCommit], repoRoot());
```

Consecuencias verificadas:

1. `null` lanza una excepción inmediata; no hay degradación a un estado parcial.
2. `base_commit` define el árbol de trabajo completo del worktree (`worktree add --detach <dir> <baseCommit>`). Sin D-016 en la base, `E6A-S0-T02` no tiene qué sincronizar.
3. Es la regla documentada del propio `queue.yaml` real: sus siete tarjetas de la cola nocturna quedan `BLOCKED` explícitamente porque "no declaran `base_commit`, `allowed_write` ni `test_commands`… inventarlos las volvería despachables con un alcance fabricado" — cita directa del comentario de cabecera de ese archivo.
4. `lib/queue.mjs` define `CONTRACT_FIELDS_REQUIRED_FOR_READY`: sin esos campos completos (incluyendo `base_commit` real), ninguna tarjeta es elegible para despacho.

`base_commit: null` es el valor correcto para un diseño aún no materializado, y simultáneamente incompatible con cualquier intento de ejecución.

## 3. Diagnóstico — ¿puede `344c690` ser base operativa?

No por sí solo.

A favor:

- Contiene D-013 a D-016 canonizadas — necesario para `reads_contract` de las 16 tarjetas.
- Es fast-forward limpio de `main` y de `feature/frontend-ux-audit` (0 commits de divergencia, verificado con `git rev-list --count gov/d013-d015-decision-stack..main` = 0).

En contra:

- No contiene `.claude/automation/loop-engine/`. El `queue.yaml` real del motor vive en `.claude/automation/loop-engine/queue.yaml` (`lib/paths.mjs`, función `queueFile()`, marcado explícitamente "VERSIONADO"). En `344c690` ese directorio no existe: no hay dónde materializar la cola de EWO-006A.
- Riesgo de base rancia: `lib/stale-base.mjs` exige `recordedBaseCommit === targetHeadCommit`; si difieren y la tarjeta no declara `allow_rebase`, el veredicto es `BLOCKED` (fail-closed por diseño, con la nota explícita en el propio código: "nunca se rebasa automáticamente").

Conclusión: `344c690` es un insumo obligatorio de la base operativa, no la base en sí.

## 4. Opción recomendada

Evaluadas cuatro opciones (fast-forward de `gov` a trunk; rama base nueva combinando `gov` + sustrato Loop; trunk actual reintroduciendo D-014/D-016; materialización por etapas). Comparación por seguridad, trazabilidad, riesgo de absorber WIP dirty, compatibilidad con Loop, impacto en D-014, impacto en D-016, impacto en `queue.yaml`, riesgo de pérdida de decisiones y costo.

**Recomendada: crear una rama base nueva que combine `gov/d013-d015-decision-stack` y el sustrato Loop (`loop/002-missing-context-failclosed`)**, ejecutada como fast-forward del trunk a `gov` seguido de un merge del motor Loop.

Evidencia decisiva, verificada de forma read-only:

```
git merge-tree --write-tree --name-only 344c690 00342f6
→ exit=0, árbol resultante a5913ab8c997a870537e9ff61a0f7145bccffc56, CERO conflictos
```

El árbol resultante contiene ambas mitades, confirmado por inspección directa:

- `.claude/automation/loop-engine/` completo, incluido `queue.yaml` real — presente.
- `brain/DECISION_INDEX.md` con D-013, D-014, D-015, D-016 — presentes.

Las dos ramas tocan rutas prácticamente disjuntas (`gov`: `brain/`, `docs/`, `apps/api/`, `packages/`; `loop`: `.claude/automation/`), lo que explica la ausencia de conflictos.

Las otras tres opciones fueron descartadas: fast-forward de `gov` solo (sin el motor Loop) deja el trunk sin lugar donde vivir `queue.yaml`; reintroducir D-014/D-016 dentro del flujo actual duplicaría decisiones ya canonizadas y violaría la regla de gobierno de no modificar decisiones `D-XXX` sin aprobación explícita; materializar por etapas no resuelve el problema de fondo por sí sola.

## 5. Pasos exactos para crear el `base_commit` operativo

Ninguno de estos pasos fue ejecutado. Todos requieren aprobación explícita de Alejandro antes de correr.

**Paso 0 — Preservar el WIP dirty existente (obligatorio, primero).**
El checkout de `feature/frontend-ux-audit` tenía cambios sin confirmar que solapan con archivos que `gov` modifica. Antes de tocar cualquier ref:
```
git status --short
git stash push -u -m "wip-pre-ewo006a"
```
o mover a una rama `preserve/*`. Nunca absorber ese trabajo dentro de la base nueva — es trabajo ajeno no atribuido.

**Paso 1 — Fast-forward del trunk a las decisiones canónicas.**
```
git checkout feature/frontend-ux-audit
git merge --ff-only gov/d013-d015-decision-stack
```
Fast-forward puro (0 commits de divergencia verificados). El trunk pasa a `344c690` con D-014/D-016 canonizadas.

**Paso 2 — Integrar el sustrato Loop mediante PR con aprobación humana.**
```
git merge --no-ff loop/002-missing-context-failclosed
```
Merge de tres vías ya verificado sin conflictos vía `merge-tree`. Produce el commit de integración `<SHA_BASE>`.

**Paso 3 — Verificar la base resultante.**
```
git rev-parse HEAD
test -f .claude/automation/loop-engine/queue.yaml
rg -n "D-014|D-016" brain/DECISION_INDEX.md
```

**Paso 4 — Fijar `base_commit: <SHA_BASE>`** de forma idéntica en las 16 tarjetas de EWO-006A.

**Paso 5 — Confirmar coherencia con `stale-base.mjs`.** `<SHA_BASE>` debe coincidir con el `targetRef` que el motor resuelve por defecto (`HEAD` de `repoRoot()`). Si el trunk avanza después de fijar la base, las 16 tarjetas quedan `stale` y transicionan a `BLOCKED_HUMAN_DECISION`. Congelar el trunk durante la ejecución de EWO-006A, o declarar `allow_rebase` de forma consciente y explícita.

## 6. Decision gates pendientes

Fijar `<SHA_BASE>` resuelve el eje `base_commit`, pero existe un segundo gate, independiente, que sigue bloqueando el despacho de las 16 tarjetas incluso con una base válida.

**Decision Gate (`lib/decision-gate.mjs` + `lib/constants.mjs`).**

`ACCEPTED_DECISION_STATES` acepta exactamente tres cadenas, por comparación exacta:
```
'ACEPTADA'
'Aprobada y vigente'
'IMPLEMENTADA · PASSED'
```

El estado real de D-014 y D-016 en `brain/DECISION_INDEX.md` es `APROBADA · PENDIENTE DE IMPLEMENTACIÓN` — no pertenece a ese conjunto. `decisionGateConflicts()` producirá `PENDING_DECISION_GATE` / `blocked_reason: pending_decision` para las 16 tarjetas de EWO-006A, porque todas declaran `decision_refs` con D-014 y/o D-016, con o sin `base_commit` válido.

El propio módulo documenta por qué: no lee `brain/DECISION_INDEX.md` ni infiere aprobación de que el código exista en una rama; exige `decisionEvidence` construido explícitamente por una fuente humana.

Otros bloqueos de decisión humana que subsisten después de fijar la base:

- Mecanismo para que `E6A-S1-T01`/`E6A-S1-T02` (migraciones Prisma) declaren exactamente un directorio nuevo de migración sin glob amplio ni ruta ficticia.
- Destino de la rama huérfana de `295b962` (`loop/e6a-s2-t01-account-permission-catalog`) — descartar o autorizar su revisión/rebase auditado.
- Decisión sobre `E6A-S4-T03` (introducir runner E2E real, redefinir como integración Vitest, o excluir de forma permanente).
- Resolución del Decision Gate en sí: o Alejandro aporta `decisionEvidence` con un estado canónico aceptado, o se actualiza el estado documental de D-014/D-016, o se amplía `ACCEPTED_DECISION_STATES` — las tres son decisiones humanas, ninguna la puede tomar un agente.

Discrepancia adicional a verificar (inferencia a partir del código, no hecho auditado de forma independiente): el `queue.yaml` real en `00342f6` es `version: 1`, con 8 campos por tarjeta y campo `card_ref`, mientras el diseño de EWO-006A asume `version: 2` con 14 campos. `lib/queue.mjs` carga `version: parsed.version ?? 1` sin validar estrictamente, por lo que `version: 2` no produce error de carga — pero la coexistencia de dos formas de tarjeta en el mismo archivo debe confirmarse explícitamente antes de materializar.

## 7. Qué NO hacer

- No usar `295b962` como `base_commit`: bifurca antes de D-016, no es ancestro de `gov`. Solo antecedente documental.
- No usar `344c690` como `base_commit` directo: sin `loop-engine/` no hay dónde vivir `queue.yaml`.
- No usar `00342f6` como `base_commit`: sin D-014/D-016, `E6A-S0-T01`/`E6A-S0-T02` no tienen fuente que sincronizar.
- No usar `dac9428` (merge-base de ambas ramas): carece de las dos mitades.
- No hacer rebase automático: `stale-base.mjs` declara explícitamente que nunca se rebasa de forma automática; el rebase lo ejecuta una persona.
- No escribir sobre `main` ni `feature/frontend-ux-audit` sin aprobación: ambas están en `PROTECTED_BRANCHES` en el código del motor, y el gobierno del proyecto exige aprobación humana para cualquier cambio sobre ellas.
- No absorber el WIP dirty preexistente dentro de la base nueva de EWO-006A.
- No reintroducir D-014/D-016 dentro del flujo actual como alternativa a fijar una base combinada: duplicaría decisiones ya canonizadas.

## 8. Impacto en EWO-006A

| Eje | Antes de la estrategia | Después de aplicar §5 |
|---|---|---|
| `base_commit` | `null` — imposible instanciar cualquier tarjeta | SHA válido de un commit que contiene ambas mitades |
| Ubicación de `queue.yaml` | Inexistente en la base documental sola | `.claude/automation/loop-engine/queue.yaml` disponible |
| D-014/D-016 legibles en la base | No, en la base del motor solo | Sí |
| Decision Gate | Bloqueado (sin base tampoco se llega a evaluar) | Sigue bloqueado — estados no pertenecen a `ACCEPTED_DECISION_STATES` |
| Migraciones S1-T01/S1-T02 | Bloqueadas | Siguen bloqueadas — mecanismo de directorio nuevo pendiente |
| Destino de `295b962` | Pendiente | Sigue pendiente |
| `E6A-S4-T03` | Fuera de la cola | Sigue fuera de la cola |

Fijar la base resuelve un bloqueo estructural (imposibilidad de instanciar), pero no despacha ninguna tarjeta por sí solo: el Decision Gate es un segundo bloqueo, independiente, que requiere una decisión humana separada.

## 9. Veredicto

BASE_COMMIT STRATEGY READY

*(condicionado a: aprobación humana explícita de los pasos 1–2 de la sección 5, y resolución separada del Decision Gate descrito en la sección 6 — ninguna de las dos cosas ha ocurrido; este documento no las ejecuta ni las presupone resueltas)*
