# AI_PLAYBOOK.md — Cómo Trabajan las IA en ContaIA

> Este documento define **roles y protocolo de entrega**, no reglas técnicas de ninguna herramienta específica. Reglas obligatorias para Claude Code en este repositorio: [`CLAUDE.md`](CLAUDE.md) (no se repiten aquí). Estado vivo de la sesión actual: [`AI_CONTEXT.md`](AI_CONTEXT.md).

## Por qué existe este documento

ContaIA se construye con tres roles de IA distintos trabajando en serie sobre el mismo repositorio, cada uno con una responsabilidad exclusiva. La estructura de tres roles se sigue desde EWO-001 — este documento la hace explícita por primera vez. El detalle exacto de cada responsabilidad (en particular, quién crea el archivo `_FINAL_AUDIT.md`) es la versión **vigente desde la adopción de este documento** — ver "Vigencia de este protocolo" abajo antes de asumir que aplica retroactivamente.

## Vigencia de este protocolo

**Este documento describe el protocolo oficial vigente desde su adopción, el 2026-07-30** (creación de la Knowledge Platform), junto con [`DOCUMENTATION_STYLE_GUIDE.md`](DOCUMENTATION_STYLE_GUIDE.md). No es retroactivo.

- Auditorías y registros anteriores a esa fecha pueden reflejar procedimientos históricos distintos a los aquí descritos — por ejemplo, alguna auditoría histórica muestra a Codex registrando escritura limitada de artefactos, algo que el protocolo vigente ya no contempla. Esos registros **permanecen intactos**, sin reinterpretarse ni corregirse, por motivos de trazabilidad — ver `CHANGELOG.md` y `docs/engineering/audits/` para el historial real, tal como ocurrió.
- En particular, la regla **"Codex nunca crea ni edita archivos"** (rol Codex, más abajo, y regla 6 de "Reglas que ningún rol puede saltarse") **aplica desde la adopción oficial de `AI_PLAYBOOK.md` y `DOCUMENTATION_STYLE_GUIDE.md` (2026-07-30) — no de manera retroactiva.**
- Si una auditoría histórica contradice lo aquí descrito, eso no es una inconsistencia a resolver: es evidencia de cómo operaba el proyecto **en ese momento**. Solo el protocolo aplicado en tareas nuevas, a partir de la fecha de adopción, debe seguir exactamente lo descrito en este documento.

## Los tres roles

### 1. ChatGPT (o equivalente) — Planeación, diseño y coordinación del flujo

- **Responsabilidad:** analizar arquitectura y generar los prompts/Work Orders (WO) que definen qué tarea se implementa, con qué alcance y qué modo (`IMPLEMENTACIÓN CONTROLADA`, `CIERRE ADMINISTRATIVO`, `CORRECCIÓN CONTROLADA DE HALLAZGOS`, etc.); coordinar el flujo completo entre los tres roles; proponer diseño y arquitectura de alto nivel cuando se le pide.
- **No hace:** tocar el repositorio directamente, escribir código, ejecutar comandos, ni marcar ninguna tarea como `PASSED`.
- **Entrega a:** el responsable de producto, quien decide si el encargo pasa a Claude Code.

### 2. Claude Code — Implementación y cierre administrativo autorizado

- **Responsabilidad:** ejecutar exactamente el alcance autorizado por la Work Order — código, pruebas, documentación de estado (`AI_CONTEXT.md`, checklist del EWO correspondiente); **corregir los hallazgos** que una auditoría `READ ONLY` reporte (`FAILED`/`CHANGES_REQUESTED`); y, con autorización expresa (modo `CIERRE ADMINISTRATIVO`), ejecutar el cierre administrativo de una tarea ya auditada con veredicto `PASSED` — lo que incluye **crear el archivo `docs/engineering/audits/<tarea>_FINAL_AUDIT.md`** a partir de ese veredicto, marcar la tarea `PASSED` en el checklist y habilitar la siguiente. Corre las validaciones técnicas (`typecheck`, `lint`, `test`, `build`, `git diff --check`) antes de reportar una tarea como lista.
- **No hace:** marcar una tarea `PASSED` sin un veredicto `PASSED` ya emitido por Codex; ampliar el alcance sin autorización explícita; inventar criterio fiscal, contable o legal sin fuente validada (`CLAUDE.md` regla 6); ejecutar acciones destructivas sin confirmación; auditar su propio trabajo.
- **Entrega a:** Codex, para auditoría independiente (tras implementar); o al responsable de producto, al cerrar (tras un cierre administrativo).

### 3. Codex — Auditoría independiente `READ ONLY`

- **Responsabilidad:** revisar, sin modificar nada, si la implementación cumple el alcance, los criterios de aceptación y las reglas arquitectónicas vinculantes (Addendums, `BR-*`, principios de `MASTER_CONTEXT.md`) — inspeccionando código y documentación reales, nunca solo la palabra de quien implementó; **emitir un veredicto** (`PASSED` / `FAILED` / `CHANGES_REQUESTED`).
- **No hace:** modificar código, pruebas, `schema.prisma`, migraciones ni documentación de estado; ejecutar migraciones, SQL, `git add`, commits ni operaciones remotas; **crear ni editar el archivo `_FINAL_AUDIT.md`** — ese archivo lo crea Claude Code durante el cierre administrativo, a partir del veredicto que Codex emite; cambiar el estado de ninguna tarea en ningún checklist. Es la **única** fuente autorizada de un veredicto `PASSED`.
- **Entrega a:** Claude Code (si `FAILED`/`CHANGES_REQUESTED`, para corrección) o al responsable de producto (si `PASSED`, para autorizar el cierre administrativo).

## Protocolo de entrega (el ciclo completo de una tarea)

```text
ChatGPT redacta la Work Order
        │
        ▼
Responsable de producto autoriza el alcance
        │
        ▼
Claude Code implementa (modo "IMPLEMENTACIÓN CONTROLADA")
  → actualiza checklist del EWO + AI_CONTEXT.md
  → deja la tarea en READY_FOR_AUDIT
  → NUNCA se autocertifica PASSED
        │
        ▼
Codex audita READ ONLY (independiente)
  → emite veredicto: PASSED / FAILED / CHANGES_REQUESTED
  → NO crea ni edita ningún archivo
        │
   ┌────┴────┐
FAILED/     PASSED
CHANGES_    │
REQUESTED   ▼
   │    Responsable de producto autoriza el "cierre administrativo"
   │    ChatGPT genera el prompt de cierre administrativo
   │    Claude Code ejecuta el cierre (modo "CIERRE ADMINISTRATIVO"):
   │      → crea docs/engineering/audits/<tarea>_FINAL_AUDIT.md
   │      → marca la tarea PASSED en el checklist
   │      → actualiza AI_CONTEXT.md y habilita la siguiente tarea
   │      → NO modifica código/pruebas/auditorías anteriores
   │           │
   └──┐        │
      ▼        │
Claude Code    │
corrige, luego │
Codex reaudita │
READ ONLY      │
   │           │
   └───────────┴──→ siguiente tarea de la secuencia
```

## Reglas que ningún rol puede saltarse

1. **Ninguna tarea se autocertifica.** El mismo agente que implementa nunca es el que audita. Solo Codex, mediante auditoría independiente `READ ONLY`, puede emitir el veredicto `PASSED` — y solo Claude Code, en un cierre administrativo autorizado, deja ese veredicto por escrito (`_FINAL_AUDIT.md` + checklist).
2. **El cierre administrativo no modifica producción.** Crear el `_FINAL_AUDIT.md`, marcar `PASSED` y habilitar la siguiente tarea es un acto documental, nunca una oportunidad para tocar código "ya que estamos".
3. **Una auditoría `FAILED` no se oculta.** El hallazgo, la corrección y la reauditoría quedan registrados en el checklist del EWO y en el `_FINAL_AUDIT.md` correspondiente — nunca se reescribe la historia de una auditoría fallida.
4. **Ningún rol inventa criterio fiscal, contable o legal** sin fuente validada por el responsable de producto — regla transversal a los tres roles, no solo a Claude Code.
5. **El responsable de producto (Alejandro Reyes Bocanegra, Product Owner y Arquitecto de Producto de ContaIA) es la única autoridad de ratificación** — de decisiones (`brain/DECISIONS.md`), de alcance de MVP (`docs/01_PRD.md`) y de cierre administrativo.
6. **Codex nunca crea ni edita archivos.** Su entregable es el veredicto en sí (comunicado vía WO o reporte) — el archivo `_FINAL_AUDIT.md` que lo registra en el repositorio siempre lo crea Claude Code, durante el cierre administrativo.

## Qué leer según tu rol, en cada sesión nueva

| Si vas a...                                  | Lee primero                                                                                                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Redactar una Work Order                      | `AI_CONTEXT.md` (para saber qué sigue) + el [Roadmap](MASTER_CONTEXT.md#11-roadmap-alcance-por-etapas-y-módulos-de-largo-plazo) de `MASTER_CONTEXT.md`                                                         |
| Implementar una tarea (Claude Code)          | `AI_CONTEXT.md` + `CLAUDE.md` + el checklist del EWO activo + el Addendum/reglas de negocio que aplique                                                                                                        |
| Auditar una tarea (Codex)                    | La Work Order original, el checklist del EWO, el Addendum, y el código/pruebas reales — nunca solo la palabra de quien implementó                                                                              |
| Hacer un cierre administrativo (Claude Code) | El veredicto `PASSED` recibido de Codex (vía WO o reporte de auditoría), y nada más — no se re-audita código en este modo. El `_FINAL_AUDIT.md` se crea como parte de este mismo cierre, no se lee de antemano |

## Mantenimiento de este documento

Se actualiza solo si el protocolo mismo cambia (p. ej. se agrega un cuarto rol, o cambia quién puede certificar `PASSED`) — no se actualiza por cada tarea o EWO. Si el protocolo real diverge de lo aquí descrito, este documento está desactualizado y debe corregirse, no el comportamiento observado ignorarse en silencio.
