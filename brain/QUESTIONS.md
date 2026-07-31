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
- **Origen:** decisión **D-007** (`brain/DECISIONS.md`) y `docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md` §9.3 / AD-3.
- **Bloquea:** el cierre de EWO-005 Bloque E. El worker **no puede** implementar un rechazo automático por duplicado hasta que esta pregunta se resuelva.
- **Contexto:** la restricción `@@unique([companyId, folioFiscal])` del modelo `Cfdi` impide a nivel de dato que dos documentos de la misma Empresa compartan folio fiscal. El worker detecta la colisión de forma fiable y por evidencia positiva (existe otro `Cfdi`, mismo `folioFiscal`, `documentId` distinto). Lo que **no** está decidido es qué debe hacer el sistema a continuación.
- **Por qué no puede decidirse técnicamente:** rechazar un comprobante fiscal tiene consecuencias contables para el usuario. Un mismo folio cargado dos veces puede ser un error del usuario, una recarga legítima del mismo archivo, o una sustitución intencional. `CLAUDE.md` regla 6 prohíbe fijar criterios fiscales o contables sin fuente validada por el responsable de producto.
- **Alternativas a resolver** (ninguna preseleccionada):
  1. **Rechazar** el documento duplicado (`Document = REJECTED`, `rejectionReason = 'CFDI_DUPLICATE'`, `Job = FAILED`).
  2. **Aceptarlo y marcarlo** como duplicado no bloqueante, dejando ambos documentos visibles para revisión humana.
  3. **Escalar a revisión manual** sin estado terminal automático.
- **Comportamiento provisional mientras siga abierta:** el worker clasifica el caso como **error recuperable con log de incidente y métrica dedicada**, sin transición terminal del `Document`. Riesgo asumido y documentado: los documentos con folio duplicado se reintentan sin resolverse hasta que exista la regla.
- **Estatus:** **Abierta.** Requiere decisión del responsable de producto.

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
