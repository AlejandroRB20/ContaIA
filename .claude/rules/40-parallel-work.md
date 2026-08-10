# Trabajo paralelo y worktrees

1. Todo trabajo que pueda editar archivos debe ejecutarse en un worktree o rama aislada, no en un checkout con cambios ajenos. Para los worktrees de Claude Code, el proyecto configura `worktree.baseRef: "head"`; verificar aun así rama y `HEAD` antes de editar.
2. El encargo debe especificar EWO/tarea, base esperada, archivos o módulos permitidos, criterios de aceptación, pruebas y exclusiones. Si la base real no coincide, detenerse antes de editar.
3. Un agente constructor no comparte worktree con otro constructor. QA, arquitectura, seguridad y fiscal revisan el diff/commit propuesto de manera independiente y no corrigen silenciosamente trabajo ajeno.
4. Mantener el worktree con nombre trazable, por ejemplo `ewo-005-s3-t06-backend`. No borrar un worktree con cambios; pedir confirmación humana y entregar su ruta, rama y estado.
5. La secuencia obligatoria es constructor → QA → arquitectura → seguridad/fiscal cuando aplique → PR → aprobación humana. Ningún agente fusiona, publica ni certifica cierre por sí solo.
