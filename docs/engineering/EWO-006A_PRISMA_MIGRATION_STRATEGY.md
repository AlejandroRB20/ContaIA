# EWO-006A — Estrategia de Migraciones Prisma

## Estado

- Documento no ejecutable.
- No es `queue.yaml`.
- No materializa tarjetas.
- No autoriza runtime.
- No crea migraciones, no ejecuta `prisma migrate`, no modifica `schema.prisma`.
- Analiza `E6A-S1-T01` (modelo `Account`) y `E6A-S1-T02` (modelo `AccountHistory`), ambas en `state: BLOCKED_HUMAN_DECISION`.
- Fuente: análisis de Principal Software Architect / Prisma Specialist / Loop Security Auditor sobre el repositorio real (rama `feature/frontend-ux-audit`, HEAD `dac9428`) y el código del motor Loop leído en el worktree `.worktrees/loop/loop-002-readiness-failclosed-repair`.

## Problema

`E6A-S1-T01`/`E6A-S1-T02` necesitan escribir exactamente una migración nueva de Prisma sin abrir `packages/database/prisma/migrations/**` completo, que expondría las migraciones históricas ya aplicadas. Prisma genera el nombre del directorio (timestamp + sufijo) en tiempo de ejecución, por lo que la ruta completa no se conoce de antemano. Codex señaló además que los `test_commands` actuales no validan Prisma de forma alguna.

## 1. Hallazgo base: el matcher del motor ya resuelve el problema por datos, no por código nuevo

Verificado leyendo `.claude/automation/loop-engine/lib/glob.mjs` (worktree `loop-002-readiness-failclosed-repair`):

| Hecho verificado | Ubicación | Consecuencia |
|---|---|---|
| `*` casa dentro de un solo segmento, no cruza `/` | `glob.mjs:59` (`[^/]*`) | Un `*` en la posición del timestamp no puede escapar a otro directorio |
| `**` sí cruza segmentos | `glob.mjs:47-56` | Solo se usa después del segmento ya fijado por el sufijo |
| Llaves `{}` no soportadas, se tratan como literal | `glob.mjs:16-20` | Coherente con la prohibición de brace globs del Source Pack |
| `forbidden_scope` gana siempre sobre `allowed_write` | `glob.mjs:103-105`, `checkWriteScope:114-118` | Defensa en profundidad real |
| `allowed_write` vacío no autoriza nada (`queue.mjs:157-161`) | `queue.mjs` | Fail-closed por defecto |
| La verificación corre sobre los archivos realmente cambiados del diff | `integration-readiness.mjs:295-302` → `OUT_OF_SCOPE_WRITE` / `FORBIDDEN_SCOPE_WRITE` | No se autoriza "el directorio", se audita el diff completo |

Comprobación empírica ejecutada replicando el regex del motor contra las 5 migraciones históricas reales del repositorio, usando el patrón `packages/database/prisma/migrations/*_ewo006a_account_model/**`:

```
BLOCK  packages/database/prisma/migrations/20260722194307/migration.sql
BLOCK  packages/database/prisma/migrations/20260723214446_ewo_005_documents_fiscal/migration.sql
BLOCK  packages/database/prisma/migrations/20260804013104_preserve_cfdi_local_issue_datetime/migration.sql
BLOCK  packages/database/prisma/migrations/migration_lock.toml
ALLOW  packages/database/prisma/migrations/20260815120000_ewo006a_account_model/migration.sql
```

Segundo hallazgo: el cerrojo de migración global ya existe y ya es un gate humano real. `concurrency.mjs:27-30` define `MIGRATION_GLOBS = ['packages/database/prisma/**', 'packages/database/prisma']`; cualquier tarjeta cuyo `allowed_write` se solape con eso entra en `migrationLockConflicts` y se serializa. `migration-lock.mjs:20-26` documenta que un lock vencido (`STALE_HEARTBEAT`/`TIMED_OUT`) sigue bloqueando — nunca se interpreta como libre — y liberarlo exige `releaseMigrationLock({confirmed: true})` con decisión humana explícita. El patrón propuesto sí produce solape con `MIGRATION_GLOBS` (su prefijo literal empieza por `packages/database/prisma/`), así que el cerrojo se activa automáticamente sin declararlo aparte.

## 2. Opciones comparadas

| Opción | Resuelve "una sola migración" | Impide tocar históricas | Costo | Veredicto |
|---|---|---|---|---|
| A) Gate humano crea la carpeta antes | Sí | Sí | Obliga a una persona a inventar un timestamp que Prisma después no reutiliza; `migrate dev` crearía otra carpeta | Rechazada — frágil, el humano no puede predecir el timestamp real de Prisma |
| B) Tarjeta pre-migration reserva el nombre | Sí | Sí | Una 17ª tarjeta, nuevo nodo en el DAG, más estado que mantener | Rechazada — funciona pero es burocracia para un dato que cabe en un campo de la propia tarjeta |
| C) Mecanismo nuevo de Loop `allow_new_directory_once` | Sí | Sí | Mecanismo nuevo en el motor: toca `queue.mjs`/`glob.mjs`, exige su propia LOOP-00X, QA y gate. Fuera del alcance de EWO-006A | Rechazada — resolvería con código lo que el matcher actual ya resuelve con datos |
| D) Migración manual con ruta preaprobada (`--create-only`) | Sí | Sí | Requiere generar con `--create-only`, SQL revisable antes de aplicar | Aceptada — base de la recomendación |
| E) Separar schema de migración a fase posterior | N/A | Sí | Deja `schema.prisma` y la BD divergentes; la aplicación posterior arrastra deuda; rompe la reproducibilidad exigida | Rechazada — traslada el riesgo, no lo elimina |
| F) Glob anclado por sufijo + enumeración de históricas | Sí, con aserción de conteo en el diff | Sí, doblemente (lista blanca + lista negra) | Cero mecanismo nuevo, cero tarjetas nuevas | Aceptada — recomendada, compuesta con D |

## 3. Recomendación final

**F + D: glob anclado por sufijo, con generación `--create-only` y enumeración explícita de las migraciones históricas en `forbidden_scope`.**

Mecánica, en orden:

1. El gate humano ratifica una sola cadena por tarjeta: el sufijo de nombre de migración (`ewo006a_account_model` para `E6A-S1-T01`, `ewo006a_account_history` para `E6A-S1-T02`). No un timestamp, no una ruta completa — un sufijo, que es lo único que un humano sí puede fijar de antemano.
2. La tarjeta declara `allowed_write` con `*` en la posición del timestamp y el sufijo literal a continuación.
3. El agente genera con `prisma migrate dev --create-only --name <sufijo>` — crea el directorio y el SQL, no aplica nada contra ninguna base de datos. El SQL queda revisable en el diff antes de cualquier aplicación.
4. `forbidden_scope` enumera las 5 migraciones históricas existentes más `migration_lock.toml`. Es redundante con la lista blanca por sufijo, pero como `forbidden_scope` gana siempre sobre `allowed_write`, actúa como segunda capa si en el futuro alguien amplía el `allowed_write` sin darse cuenta.
5. El cerrojo global de migración (`MIGRATION_GLOBS`) serializa `E6A-S1-T01` y `E6A-S1-T02` entre sí automáticamente — no hay que declararlo aparte.

Por qué no la opción C: introducir `allow_new_directory_once` significa modificar el motor Loop para expresar algo que `[^/]*` más un sufijo ratificado ya expresan con exactitud, usando el matcher que ya existe y ya está auditado.

## 4. `allowed_write` recomendado

**`E6A-S1-T01` — modelo `Account`:**

```yaml
allowed_write:
  - packages/database/prisma/schema.prisma
  - packages/database/prisma/migrations/*_ewo006a_account_model/**
```

**`E6A-S1-T02` — modelo `AccountHistory`:**

```yaml
allowed_write:
  - packages/database/prisma/schema.prisma
  - packages/database/prisma/migrations/*_ewo006a_account_history/**
```

Los sufijos respetan `docs/21_DATABASE_MIGRATION_PLAN.md` §3 (timestamp + descripción breve en `snake_case`, inglés técnico). Nota: dos migraciones históricas (`20260722194307`, `20260726020913`) no tienen sufijo — la convención no se ha aplicado de forma uniforme en el historial existente; estas dos tarjetas nuevas la restauran.

## 5. `forbidden_scope` recomendado

Idéntico en ambas tarjetas:

```yaml
forbidden_scope:
  - packages/database/prisma/migrations/20260722194307
  - packages/database/prisma/migrations/20260723214446_ewo_005_documents_fiscal
  - packages/database/prisma/migrations/20260726020913
  - packages/database/prisma/migrations/20260726022147_ewo_005_block_e_cfdi_tax_scope_check
  - packages/database/prisma/migrations/20260804013104_preserve_cfdi_local_issue_datetime
  - packages/database/prisma/migrations/migration_lock.toml
  - packages/database/prisma/seed.ts
  - apps/api/src
  - apps/api/src/app.module.ts
  - apps/web/src
```

Un patrón sin comodines que nombra un directorio cubre su contenido por prefijo (`glob.mjs:85-89`), así que cada entrada protege todo el directorio de la migración histórica correspondiente.

**Diferencia con el YAML v3 vigente al momento de este análisis:** ese draft declaraba `packages/database/prisma/migrations` completo en `forbidden_scope` para ambas tarjetas, lo que hace imposible crear cualquier migración nueva — es exactamente la razón documentada de su `state: BLOCKED_HUMAN_DECISION`. Este documento no modifica ningún YAML; el reemplazo de ese `forbidden_scope` por la enumeración de esta sección requiere su propia ratificación humana y una versión posterior del draft.

## 6. `test_commands` reproducibles

Los comandos vigentes (`typecheck` + `test`) no validan Prisma: `typecheck` corre `tsc` sobre `src/`, y `vitest.config.ts` excluye explícitamente los `*.integration.test.ts` — hoy ninguna prueba automatizada toca la base de datos.

Secuencia propuesta, de más barata a más cara:

```yaml
test_commands:
  # 1. Formato determinista del schema (no toca BD)
  - pnpm --filter @contaia/database exec prisma format --check
  # 2. Validez semántica del schema (no conecta a BD)
  - pnpm --filter @contaia/database exec dotenv -e ../../.env -- prisma validate
  # 3. Historial reproducible: BD desechable limpia + aplicar TODAS las migraciones
  - pnpm --filter @contaia/database exec dotenv -e ../../.env.migration-check -- prisma migrate reset --force --skip-seed
  # 4. Prueba de no-drift: la BD resultante debe igualar al datamodel
  - pnpm --filter @contaia/database exec dotenv -e ../../.env.migration-check -- prisma migrate diff --from-schema-datasource ./prisma/schema.prisma --to-schema-datamodel ./prisma/schema.prisma --exit-code
  # 5. Tipos y unidad
  - pnpm --filter @contaia/database typecheck
  - pnpm --filter @contaia/database test
  # 6. Integración real contra la BD de validación
  - pnpm --filter @contaia/database exec dotenv -e ../../.env.migration-check -- vitest run --config vitest.integration.config.ts
```

El comando 4 es el núcleo de la reproducibilidad: `--exit-code` devuelve `0` si no hay diferencia y distinto de `0` si la hay. Aplicar todo el historial a una base vacía y comprobar que el resultado coincide exactamente con `schema.prisma` demuestra que la migración es reproducible y que el schema no se editó sin migrar — es la verificación formal que Codex señaló como ausente.

Se usa `exec` en vez de agregar scripts nuevos a `package.json` deliberadamente: agregar scripts obligaría a incluir `packages/database/package.json` en `allowed_write`, ampliando el alcance de la tarjeta más allá de lo necesario. Promoverlos a scripts nombrados es una mejora legítima pero pertenece a otra tarjeta.

## 7. Requerimientos de `.env` / `DATABASE_URL`

Estado verificado en el repositorio:

- `.env.example` define `DATABASE_URL=postgresql://contaia:contaia_dev_only@localhost:5432/contaia`.
- No existe `SHADOW_DATABASE_URL` en ningún archivo del repositorio (confirmado por búsqueda directa).
- El `datasource` de `schema.prisma` (líneas 55-58) solo declara `provider` y `url` — sin `shadowDatabaseUrl`.
- No hay ninguna referencia a `prisma validate` ni `migrate diff` en `package.json` ni en workflows existentes — estos comandos no se usan hoy en el repositorio.
- `docker-compose.yml` levanta un único servicio `postgres:16-alpine` con una sola base de datos.

Requerimiento nuevo — dependencia dura de esta estrategia: los pasos 3, 4 y 6 de la sección anterior destruyen datos (`migrate reset`). Ejecutarlos contra `DATABASE_URL` borraría la base de desarrollo. Hace falta una base desechable separada:

```
# .env.migration-check (nuevo archivo, en .gitignore, con .env.migration-check.example versionado)
DATABASE_URL=postgresql://contaia:contaia_dev_only@localhost:5432/contaia_migration_check
```

El usuario `contaia` ya es dueño de la instancia Postgres del compose, así que puede crear esa base sin privilegios adicionales. No hace falta declarar `SHADOW_DATABASE_URL` mientras se use `--from-schema-datasource` (compara contra la BD viva) en lugar de `--from-migrations` (que sí exigiría una shadow database explícita).

**Esto toca `.env.example`, `.gitignore` y posiblemente `docker-compose.yml` — los tres fuera del `allowed_write` de `E6A-S1-T01`/`E6A-S1-T02` y fuera del alcance funcional declarado de EWO-006A.** Es una ratificación humana separada (ver sección 9).

## 8. Mecanismo para el directorio exacto nuevo

No se introduce mecanismo nuevo en el Loop Engine. El mecanismo es la combinación de:

1. **Ratificación humana del sufijo** (no del timestamp) — lo único predecible antes de ejecutar.
2. **Glob anclado por sufijo** en `allowed_write`, usando la semántica ya existente de `*` (un segmento, `glob.mjs:59`) para el timestamp libre y literal para el sufijo fijado.
3. **`--create-only`** en la generación — el directorio se crea, el SQL queda para revisión humana, nada se aplica todavía contra ninguna base de datos.
4. **Verificación en QA**: el diff debe mostrar exactamente un directorio nuevo bajo `migrations/` que case el glob declarado — si aparece un segundo directorio (por ejemplo por reintento del agente), la tarjeta falla la revisión aunque el matcher técnicamente lo hubiera permitido.

## 9. Rollback mínimo

Prisma no genera migraciones *down*. El rollback depende de en qué momento se detecta el fallo:

| Momento | Acción de rollback | Costo |
|---|---|---|
| Antes de aplicar (`--create-only`, SQL aún sin ejecutar) | Borrar el directorio nuevo + `git checkout -- packages/database/prisma/schema.prisma` | Nulo — es el estado normal de trabajo de la tarjeta |
| Aplicada solo en `contaia_migration_check` | `prisma migrate reset --force` sobre esa base | Nulo — es desechable por diseño |
| Aplicada en desarrollo local | `prisma migrate reset --force` + re-seed | Pérdida de datos sintéticos locales, aceptable |
| Integrada en rama | Revertir el commit; la migración desaparece del historial antes de tocar cualquier ambiente compartido | Bajo |
| Ambiente compartido (staging/producción) | No aplica en EWO-006A — ninguna tarjeta de esta EWO despliega. `docs/21_DATABASE_MIGRATION_PLAN.md` §5 exige forward-fix, nunca edición de una migración ya aplicada | — |

Condición que mantiene barato el rollback: ambas migraciones deben ser puramente aditivas (tablas nuevas `Account` / `AccountHistory`, sin `ALTER` destructivo sobre tablas existentes). Si el SQL generado contiene `DROP`, cambio de tipo de columna existente o `NOT NULL` sobre columna ya poblada, la tarjeta debe detenerse y escalar — deja de ser aditiva y `docs/21` §5 exige aprobación de segundo revisor. Esta condición no está verificada en este documento: el modelo `Account` aún no existe, por lo que el SQL tampoco existe; es un criterio de aceptación a comprobar en el gate de QA cuando la migración se genere, no un hecho ya establecido.

## 10. Ratificaciones humanas pendientes

1. **Sufijos exactos**: `ewo006a_account_model` y `ewo006a_account_history`.
2. **Base de datos de validación**: crear `.env.migration-check` (más `.env.migration-check.example` versionado, entrada en `.gitignore`) apuntando a `contaia_migration_check`. Toca archivos fuera del alcance funcional de EWO-006A — requiere autorización propia, independiente de esta estrategia.
3. **Reemplazo de `forbidden_scope`** en `E6A-S1-T01`/`E6A-S1-T02`: sustituir `packages/database/prisma/migrations` completo por la enumeración de la sección 5. Esto implica una versión posterior del draft YAML — no se generó aquí.
4. **`base_commit`** sigue en `null` para ambas tarjetas y sigue siendo un bloqueo independiente: ninguna tarjeta se instancia (worktree, rama, ejecución) mientras lo esté, según el Source Pack de EWO-006A.

Los puntos 1 a 3 desbloquean la estrategia; el punto 4 sigue bloqueando la ejecución y no se resuelve en este documento.

## 11. Riesgos

| # | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| R1 | El agente crea dos directorios con el mismo sufijo y distinto timestamp; ambos casan el glob | Media | Aserción explícita en el gate de QA: el diff debe mostrar exactamente un directorio nuevo bajo `migrations/`. El glob acota el dónde, no el cuántos |
| R2 | El sufijo ratificado no coincide con el `--name` tecleado por el agente | Baja | Falla cerrado por diseño (`OUT_OF_SCOPE_WRITE`), que es el comportamiento correcto. El sufijo exacto debe quedar en el `title`/`reads_contract` de la tarjeta |
| R3 | `migrate reset` se ejecuta por error contra `DATABASE_URL` en vez de contra `.env.migration-check` | Alta | Archivo `.env` separado, nunca override inline de `DATABASE_URL`; el nombre de la base de validación incluye `_migration_check` para que sea evidente en cualquier log |
| R4 | `E6A-S1-T01` y `E6A-S1-T02` corren en paralelo y colisionan sobre `schema.prisma` | Media | Ya mitigado por el motor: `MIGRATION_GLOBS` las serializa vía el cerrojo global de migración; además `E6A-S1-T02` depende de `E6A-S1-T01` en el DAG declarado |
| R5 | Un cerrojo de migración vencido bloquea indefinidamente | Baja | Comportamiento intencional del motor: vencido no equivale a libre; exige `releaseMigrationLock({confirmed: true})` con decisión humana explícita |
| R6 | El SQL generado resulta no-aditivo y nadie lo nota | Media | Revisión obligatoria del `migration.sql` en el diff — está dentro del `allowed_write` declarado, así que siempre aparece en el candidato a revisar |
| R7 | La enumeración de migraciones históricas en `forbidden_scope` envejece: una migración futura no estará en la lista | Baja | Aceptable dentro del alcance de EWO-006A (lista congelada al momento de este análisis). La lista blanca por sufijo ya excluye lo desconocido; la enumeración es solo defensa secundaria |
| R8 | `prisma format --check` falla por formato preexistente ajeno a esta tarjeta | Baja | Verificar en el preflight; si el schema actual no está formateado, tratar como hallazgo separado, no como bloqueo de esta tarjeta |

## Fuentes consultadas

- `packages/database/package.json`, `packages/database/prisma/schema.prisma`, `packages/database/vitest.config.ts`, `packages/database/vitest.integration.config.ts`.
- `packages/database/prisma/migrations/` (5 directorios existentes + `migration_lock.toml`).
- `.env.example`, `docker-compose.yml`.
- `docs/21_DATABASE_MIGRATION_PLAN.md`.
- Worktree `.worktrees/loop/loop-002-readiness-failclosed-repair`: `.claude/automation/loop-engine/lib/{glob,migration-lock,concurrency,queue,integration-readiness,constants}.mjs`.
- `docs/engineering/EWO-006A_PREFLIGHT_SOURCE_PACK.md`.

## Veredicto

La estrategia está completa y no requiere mecanismo nuevo en el Loop Engine — el matcher de globs y el cerrojo de migración existentes la soportan tal como están, verificado contra el código real del motor. El veredicto califica al diseño, no autoriza ejecución: `E6A-S1-T01` y `E6A-S1-T02` permanecen en `BLOCKED_HUMAN_DECISION` hasta que se ratifiquen los cuatro puntos de la sección 10.

**PRISMA MIGRATION STRATEGY READY**
