# Cola nocturna controlada — ContaIA

> Estado: configuración operativa, **no** documento canónico ni actualización del estado oficial de una EWO.
>
> Fuente de tareas: `HEAD` de `AI_CONTEXT.md`, `docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md` y `docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md`.
>
> Regla: antes de tomar cualquier elemento, el orquestador debe verificar rama, HEAD, estado Git, fuentes canónicas, dependencias y autorizaciones. Si la evidencia actual contradice esta cola, debe detenerse y reportar la diferencia.

## Límites de ejecución nocturna

- Un worktree y una rama local aislados por tarea; nunca trabajar en `main` ni en el checkout principal.
- Sin `push`, merge, despliegue, migraciones, cambios de Prisma, borrados ni cambios de decisiones `D-XXX`.
- Cada implementación debe pasar constructor → QA → arquitectura → seguridad → fiscal/contable antes de solicitar aprobación de Alejandro.
- Ningún revisor puede declarar una tarea oficialmente `PASSED`, editar las fuentes canónicas de estado ni iniciar una tarea bloqueada.
- Al terminar una sesión, dejar: ubicación del worktree, diff, pruebas ejecutadas, revisiones, riesgos y siguiente gate.

## Cola de siete tareas

| Orden | Trabajo | Estado operativo | Dependencia/gate | Acción nocturna permitida |
| --- | --- | --- | --- | --- |
| 1 | `E5-S3-T06` — cierre de revisiones del extractor de encabezado | `READY_FOR_REVIEWS` | El cambio existe solamente en un worktree local; falta arquitectura, seguridad, fiscal/contable y aprobación de Alejandro. | Revisar en modo lectura y preparar el informe consolidado. No reimplementar ni cerrar oficialmente. |
| 2 | `E5-S3-T07` — conceptos con `position` contigua | `BLOCKED` | `E5-S3-T06` debe estar aceptada oficialmente. | No iniciar. Preparar preflight y plan solo si Alejandro lo solicita. |
| 3 | `E5-S3-T08` — impuestos de comprobante y concepto | `BLOCKED` | `E5-S3-T07` aceptada; requiere revisión fiscal y de invariantes. | No iniciar. |
| 4 | `E5-S3-T09` — campos ambiguos y fuera de MVP | `BLOCKED` | `E5-S3-T06` y `E5-S3-T07` aceptadas. | No iniciar. Nunca inferir datos fiscales. |
| 5 | `E5-S3-T10` — checksum SHA-256 del `Buffer` | `WAITING_FOR_SCOPE_ORDER` | La ficha no lista dependencia técnica, pero la fuente canónica establece `T06` como siguiente tarea de la secuencia. | No iniciar hasta que Alejandro autorice ejecutarla en paralelo o después de `T06`. |
| 6 | `E5-S3-T11` — clasificación de errores del parser | `BLOCKED` | `E5-S3-T03` a `E5-S3-T09` implementadas/aceptadas. | No iniciar. |
| 7 | `E5-S3-T12` — fixtures y cobertura integral | `BLOCKED` | `E5-S3-T01` a `E5-S3-T11` implementadas/aceptadas. | No iniciar; requiere fixtures SAT reales y revisión fiscal antes de declarar el sprint terminado. |

## Regla de selección del orquestador

1. Elegir solamente el primer elemento con estado `APPROVED_FOR_IMPLEMENTATION` o `READY_FOR_REVIEWS`.
2. Para `READY_FOR_REVIEWS`, ejecutar exclusivamente revisiones en modo lectura y entregar el gate humano.
3. Para `BLOCKED` o `WAITING_FOR_SCOPE_ORDER`, no editar archivos ni cambiar su estado: reportar la dependencia exacta.
4. Después de la aprobación humana de una tarea, Alejandro o el orquestador con una instrucción explícita puede convertir el siguiente elemento en `APPROVED_FOR_IMPLEMENTATION`.

## Autoridad reservada a Alejandro

- Aprobar el inicio de una tarea de implementación.
- Autorizar ejecución paralela de `E5-S3-T10`.
- Aceptar el resultado de `E5-S3-T06` y desbloquear oficialmente `E5-S3-T07`.
- Aprobar cambios fiscales, de seguridad, Prisma/migraciones, decisiones, commits, PRs, merge, push o despliegue.
