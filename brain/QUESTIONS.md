# Preguntas Abiertas

## Propósito

Registro de preguntas pendientes de resolver.

## Estado

Borrador

## Fecha de creación

2026-07-18

> Nota: Cada pregunta debe resolverse con el responsable de producto antes de que la funcionalidad que depende de ella se declare terminada.

---

## Q-001 — ¿Qué debe ocurrir cuando se carga un CFDI cuyo folio fiscal ya pertenece a OTRO documento de la misma Empresa?

- **Fecha de registro:** 2026-07-25
- **Fecha de resolución:** 2026-08-05
- **Origen:** decisión **D-007** (`brain/DECISIONS.md`) y `docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md` §9.3 / AD-3.
- **Bloquea:** ~~el cierre de EWO-005 Bloque E~~ — **desbloqueado.**
- **Contexto:** la restricción `@@unique([companyId, folioFiscal])` del modelo `Cfdi` impide a nivel de dato que dos documentos de la misma Empresa compartan folio fiscal. El worker detecta la colisión de forma fiable y por evidencia positiva (existe otro `Cfdi`, mismo `folioFiscal`, `documentId` distinto).
- **Alternativas evaluadas:**
  1. **Rechazar** el documento duplicado (`Document = REJECTED`, `rejectionReason = 'CFDI_DUPLICATE'`, `Job = FAILED`). ← **ELEGIDA**
  2. Aceptarlo y marcarlo como duplicado no bloqueante, dejando ambos documentos visibles para revisión humana.
  3. Escalar a revisión manual sin estado terminal automático.
- **Resolución:** el responsable de producto aprobó la **Alternativa 1** el 2026-08-05. Cuando el worker detecte un CFDI cuyo `folioFiscal` ya existe para la misma empresa en otro documento, rechazará inmediatamente con `Document = REJECTED (CFDI_DUPLICATE)` y `Job = FAILED` vía `UnrecoverableError`. No se almacenan duplicados. No hay campo `isDuplicate`. No hay migración. No hay revisión manual.
- **Decisión registrada:** **D-013** (`brain/DECISIONS.md`).
- **Estatus:** **RESUELTA — D-013 (2026-08-05).**

---

## Preguntas estratégicas (nivel producto, sin dueño de tarea específico)

Trasladadas desde `MASTER_CONTEXT.md` (contenido original de 2026-07-18, re-evaluado el 2026-07-30 contra la evidencia documental de esa fecha). `MASTER_CONTEXT.md` §9 únicamente enlaza a esta sección — no repite esta tabla.

| #   | Pregunta                                                               | Estado observado                                                                                                                        |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ¿Se confirma la misión redactada, o se ajusta?                         | Sin confirmación formal registrada — sigue abierta                                                                                      |
| 2   | ¿Alcance definitivo del MVP?                                           | **Resuelta** — `docs/01_PRD.md` §3-9 lo define con precisión (incluye exclusiones explícitas)                                           |
| 3   | ¿Se confirma el stack técnico preliminar?                              | **Resuelta en la práctica** — el stack de `MASTER_CONTEXT.md` §6 está implementado y en uso desde EWO-001                               |
| 4   | ¿Qué ORM sobre PostgreSQL?                                             | **Resuelta** — Prisma, en uso desde EWO-001                                                                                             |
| 5   | ¿Qué proveedor(es) de IA para la capa de abstracción?                  | Arquitectura de abstracción decidida (`docs/10_AI_ARCHITECTURE.md`, AD-05); proveedor(es) específico(s) sin confirmar públicamente aquí |
| 6   | ¿Planes y precios definitivos del modelo de negocio?                   | Sigue abierta — sin definición                                                                                                          |
| 7   | ¿Cuándo se justifica migrar de monolito modular a servicios separados? | Sigue abierta — sin umbral definido                                                                                                     |
| 8   | ¿Quién valida el contenido cargado en `knowledge/`?                    | Sigue abierta — `knowledge/` no implementado todavía                                                                                    |
| 9   | ¿Cuándo y con qué PAC se aborda la integración fiscal de la Etapa 4?   | Sigue abierta — Etapa 4 no iniciada                                                                                                     |
