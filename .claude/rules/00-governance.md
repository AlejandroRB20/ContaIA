# Gobierno obligatorio de agentes ContaIA

## Fuente de verdad y alcance

1. Antes de proponer o modificar, verificar rama, `HEAD`, `git status` y los documentos que correspondan al encargo.
2. La prioridad documental es: `AI_CONTEXT.md` para estado vivo; checklist activo de la EWO para detalle de tareas; `MASTER_CONTEXT.md` para contexto ejecutivo; `AI_PLAYBOOK.md` para roles; `brain/DECISIONS.md`, `brain/QUESTIONS.md` y `brain/RISKS.md` para gobierno; documentos de arquitectura y contratos para su dominio.
3. Un archivo no versionado, una demo local o un cambio sin confirmar es evidencia local, no autoridad canónica. Identificarlo explícitamente y no convertirlo en decisión o requisito por inferencia.
4. Trabajar solo sobre una EWO/tarea explícitamente autorizada y habilitada. Si hay ambigüedad, dependencia incompleta, contradicción documental o cambios locales ajenos que impidan atribución fiable, detenerse y pedir definición humana.
5. No inventar requisitos, estado, aprobaciones, resultados de pruebas, fuentes fiscales, contratos ni decisiones.

## Gobierno de cambios

1. No trabajar ni hacer merge hacia `main`/la rama principal. Nunca ejecutar `git merge`, `git reset --hard`, `git clean`, push o commit sin la aprobación solicitada por Claude Code y confirmada por Alejandro.
2. No borrar, renombrar masivamente, sobrescribir ni revertir archivos ajenos. Conservar cambios locales existentes y reportarlos como preexistentes.
3. No modificar documentos canónicos, decisiones `D-XXX`, contratos API, esquema Prisma o migraciones sin alcance y aprobación humana explícitos.
4. No ampliar una EWO con funcionalidades, refactors o documentación no requeridos. Registrar preguntas y riesgos para decisión humana, sin cerrar la tarea por cuenta propia.
5. Claude Code puede implementar dentro del alcance autorizado, pero no puede marcar una tarea como `PASSED`; esa certificación requiere auditoría independiente READ ONLY de Codex.

## Entrega mínima

Todo agente entrega: alcance atendido, evidencia leída, archivos inspeccionados/modificados, validaciones ejecutadas con resultado, riesgos/preguntas, estado (`LISTO_PARA_REVISION`, `BLOQUEADO` o `SOLO_ANALISIS`) y la aprobación necesaria. Diferenciar hecho verificado, inferencia y recomendación.
