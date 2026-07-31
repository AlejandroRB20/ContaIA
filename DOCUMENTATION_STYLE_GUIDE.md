# DOCUMENTATION_STYLE_GUIDE.md — Estándar Oficial de Documentación

> Este documento **describe convenciones que ya existían de facto** en 30+ documentos del proyecto — no inventa un estilo nuevo. Se escribe explícitamente por primera vez el 2026-07-30 porque hasta ahora el estándar solo era inferible leyendo suficientes documentos. Aplica a todo documento nuevo o editado desde esta fecha; no exige reformatear retroactivamente lo que ya cumple el espíritu de estas reglas.

## 1. Nomenclatura de archivos

| Tipo                                 | Patrón                                                             | Ejemplo                                                     |
| ------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| Documento técnico numerado           | `docs/NN_TOPIC_NAME.md` (dos dígitos, `UPPER_SNAKE_CASE`)          | `docs/07_SOFTWARE_ARCHITECTURE.md`                          |
| Informe de cierre de Work Order      | `docs/engineering/EWO-NNN_TOPIC_REPORT.md`                         | `docs/engineering/EWO-002_AUTH_REPORT.md`                   |
| Plan técnico de Work Order           | `docs/engineering/EWO-NNN_TOPIC_PLAN.md`                           | `docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md`         |
| Addendum de arquitectura             | `docs/engineering/EWO-NNN_BLOCK_X_ARCHITECTURE_ADDENDUM.md`        | `docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md` |
| Checklist de implementación          | `docs/engineering/EWO-NNN_IMPLEMENTATION_CHECKLIST.md`             | `docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md`      |
| Auditoría final de tarea             | `docs/engineering/audits/E<epic>-S<sprint>-T<task>_FINAL_AUDIT.md` | `docs/engineering/audits/E5-S2-T08_FINAL_AUDIT.md`          |
| Registro de pensamiento del proyecto | `brain/TOPIC.md` (una palabra, mayúscula inicial de carpeta)       | `brain/DECISIONS.md`                                        |
| Documento de contexto/estado raíz    | `NOMBRE_EN_MAYÚSCULAS.md` en la raíz del repositorio               | `MASTER_CONTEXT.md`, `AI_CONTEXT.md`                        |

**No crear numeración nueva sin verificar colisión.** Antes de asignar `docs/NN`, confirmar que esa posición no está ocupada por un marcador de estructura vacío — ver la política de resolución de colisiones ya registrada en `CHANGELOG.md` → "Historial de reorganización documental".

## 2. Encabezado obligatorio — "Control del documento"

Todo documento técnico (`docs/*`) y todo documento de `brain/` lleva, inmediatamente después del título, una tabla o lista con:

- **Versión** (`0.1`, `1.0`, etc. — semántica simple, no SemVer estricto)
- **Estado** (ver vocabulario en la sección 3)
- **Fecha de creación**
- Opcional: **Propietario**, **Última actualización**, **Documentos relacionados**

Los documentos de contexto/estado raíz (`MASTER_CONTEXT.md`, `AI_CONTEXT.md`, `DASHBOARD.md`) siguen el mismo principio pero pueden usar una tabla más corta si su propósito no requiere todos los campos.

## 3. Vocabulario de estado — no mezclar familias

| Familia                 | Valores válidos                                                                          | Dónde se usa                                             |
| ----------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Documento               | `Borrador` · `Draft vX.0` · `Vigente` · `Marcador vacío / reservado`                     | Encabezado "Control del documento" de cualquier `docs/*` |
| Decisión arquitectónica | `PROPUESTA — PENDIENTE DE RATIFICACIÓN` · `Aprobada y vigente` · `ACEPTADA` · `Aplicada` | `brain/DECISIONS.md`, `brain/DECISION_INDEX.md`          |
| Tarea de EWO            | `BLOCKED` → `READY_FOR_AUDIT` → `PASSED` (o `CORREGIDO` si hubo hallazgo resuelto)       | Checklist de cada EWO                                    |
| Auditoría               | `PASSED` · `FAILED` · `CHANGES_REQUESTED`                                                | `docs/engineering/audits/*_FINAL_AUDIT.md`               |
| Pregunta abierta        | `Abierta` · `Resuelta`                                                                   | `brain/QUESTIONS.md`                                     |
| Riesgo                  | libre, pero siempre con Probabilidad + Impacto + Estado en columnas separadas            | `brain/RISKS.md`                                         |

No inventar un séptimo valor de estado sin necesidad real — si algo no encaja en estas familias, es señal de que falta un tipo de documento, no de que hay que forzar el vocabulario existente.

## 4. Historial — una sola regla, sin excepciones

**Todo cambio, por pequeño que sea, se registra en [`CHANGELOG.md`](CHANGELOG.md).** Ningún otro documento — ni `MASTER_CONTEXT.md`, ni un `docs/NN`, ni un informe de EWO — mantiene su propia bitácora cronológica paralela. La sección [Historial ejecutivo](MASTER_CONTEXT.md#18-historial-ejecutivo) de `MASTER_CONTEXT.md` admite como máximo una fila por **hito mayor** (cierre de EWO, cierre de Sprint, decisión ratificada) — nunca una fila por tarea individual; esa fila enlaza a `CHANGELOG.md` para el detalle.

## 5. Referencias cruzadas

- **Citar por ruta real, no por número asumido.** Verificar el nombre exacto del archivo antes de citarlo — el proyecto ya tuvo colisiones de numeración y renombres (`docs/03_BUSINESS_RULES.md` original → `docs/04_BUSINESS_RULES.md` real, registrado en varios documentos).
- **Al citar una sección de otro documento, preferir el título de la sección sobre el número**, cuando sea razonable (`"§ Principios obligatorios"` en vez de solo `"§10"`) — o mejor, un enlace Markdown directo al ancla del título (`[Principios obligatorios](MASTER_CONTEXT.md#5-principios-obligatorios)`). Los números de sección **no son estables entre versiones** — `MASTER_CONTEXT.md` se renumeró por completo el 2026-07-30 y dejó ~45 referencias externas con números obsoletos (mapa de corrección: [Mapeo de numeración histórico](MASTER_CONTEXT.md#16-mapeo-de-numeración-histórico)). Una referencia por título o ancla sobrevive una reorganización; una por número puro, no.
- **Si citas una subsección con numeración propia y estable** (p. ej. los agentes de IA `13.1`-`13.11`, los principios `10.1`-`10.10`), esa numeración interna sí puede citarse directamente — está marcada explícitamente como "no renumerar" en su documento fuente.
- **Enlazar, nunca copiar.** Si te encuentras copiando más de un párrafo de otro documento, es señal de que debiste enlazarlo.

## 6. ADR (decisiones arquitectónicas)

Formato fijo en `brain/DECISIONS.md`, un `## D-NNN — Título` por decisión, con: Contexto → Problema → Fuerzas de decisión → Alternativas consideradas → Decisión → Motivo → Consecuencias (positivas/negativas) → Riesgos → Estado de implementación → Ratificación (quién, rol, fecha, evidencia). Una corrección menor a una decisión ya ratificada usa sufijo (`D-002.1`), nunca reabre ni renumera la decisión original. Toda fila nueva se refleja el mismo día en `brain/DECISION_INDEX.md`.

## 7. Engineering Work Orders (EWO)

- Cada EWO tiene un informe de cierre (`_REPORT.md`) con metadatos (Work Order, fecha, ejecutor, entorno, resultado final) y un resumen ejecutivo.
- Un EWO grande se subdivide en **Bloques** → **Sprints** → **Tareas** (`E<epic>-S<sprint>-T<task>`), pero solo cuando la escala lo justifica — la mayoría de los EWO no necesitan esta subdivisión.
- Ciclo de vida de una tarea: `BLOCKED` → implementación → `READY_FOR_AUDIT` → auditoría independiente → `PASSED`. Nunca se salta la auditoría independiente, sin importar cuán simple parezca la tarea.

## 8. Auditorías

- **`READ ONLY` siempre.** Una auditoría nunca modifica código, pruebas ni documentación de estado, ni crea archivos — el auditor (p. ej. Codex) solo **emite un veredicto** (`PASSED` / `FAILED` / `CHANGES_REQUESTED`).
- El archivo `_FINAL_AUDIT.md` por tarea auditada (con: Auditor, Fecha, Alcance, Veredicto, Resumen, Verificaciones, Hallazgos, Conclusión) **lo crea Claude Code durante el cierre administrativo autorizado**, a partir del veredicto recibido — nunca lo crea el propio auditor. Protocolo completo de roles: [`AI_PLAYBOOK.md`](AI_PLAYBOOK.md).
- Un veredicto `FAILED` o `CHANGES_REQUESTED` se documenta en el checklist de la tarea junto con la corrección aplicada — nunca se reemplaza silenciosamente por un segundo intento sin dejar rastro del primero.

## 9. Versionado de documentos

- `Versión 0.1` = primer borrador completo. `Versión 1.0` = primera versión considerada estable para uso activo (no necesariamente "aprobada formalmente" — ver la nota de honestidad documental en [Estado actual del proyecto](MASTER_CONTEXT.md#3-estado-actual-del-proyecto) sobre documentos `Draft v1.0` usados activamente). Incrementos mayores (`2.0`, etc.) se reservan para rediseños estructurales, no para cada edición de contenido.
- Todo rediseño estructural de un documento (no una edición de contenido) debe registrar, dentro del propio documento, una sección "Qué cambió" con lo movido, consolidado y — si aplica — eliminado. Ver [Qué cambió en esta reorganización](MASTER_CONTEXT.md#17-qué-cambió-en-esta-reorganización) como plantilla de referencia.

## 10. Markdown — convenciones de formato

- **Tablas sobre listas** cuando los datos tienen 2+ dimensiones comparables (ID + Estado + Fecha, por ejemplo) — más escaneable que viñetas repetidas.
- **`>` blockquote** para notas meta, advertencias de alcance o aclaraciones que no son parte del contenido principal del documento.
- **Code span** (`` `texto` ``) para nombres de archivo, identificadores (`E5-S2-T08`), valores de estado (`PASSED`), y nombres de clases/funciones — nunca en texto plano ambiguo con prosa alrededor.
- **Negrita** para el término o dato que el lector está escaneando a buscar, no para enfatizar por énfasis — un párrafo con seis frases en negrita no resalta nada.
- **Encabezados `##`/`###` numerados** en documentos largos con índice; documentos cortos (menos de ~100 líneas) no necesitan numeración de sección.

## 11. Criterios de calidad — checklist antes de dar un documento por terminado

- [ ] ¿Tiene una única responsabilidad clara? Si cubre dos temas no relacionados, probablemente deba dividirse.
- [ ] ¿Todo dato que ya existe en otro documento está enlazado, no copiado?
- [ ] ¿El "Control del documento" (o equivalente) está completo y usa el vocabulario de estado correcto (sección 3)?
- [ ] ¿Toda referencia cruzada apunta a una ruta real, verificada, no asumida?
- [ ] ¿Un lector nuevo puede entender el propósito del documento en el primer párrafo?
- [ ] Si el documento reemplaza o reorganiza contenido previo: ¿se registró en `CHANGELOG.md` y, si aplica, se preservó el contenido movido en vez de eliminarlo?

## 12. Mantenimiento de este documento

Se actualiza cuando se observa una convención nueva y consistente en 2 o más documentos reales (nunca antes de que exista el patrón real), o cuando una convención documentada aquí deja de seguirse y se decide formalmente cambiarla. No es un documento aspiracional — describe lo que el proyecto **ya hace**, no lo que debería hacer algún día.
