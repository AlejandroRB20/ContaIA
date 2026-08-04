# DECISION_INDEX.md — Índice de Decisiones Arquitectónicas

> Este archivo **no reemplaza** [`DECISIONS.md`](DECISIONS.md) — no contiene contexto, alternativas, motivos ni consecuencias. Solo permite navegar rápido: qué decisiones existen, en qué estado, desde cuándo, y dónde leer el detalle completo. Para el análisis completo de cualquier fila, abre `DECISIONS.md` y busca el ID.

| ID      | Título                                                                                                 | Estado                                                        | Fecha      | Documento relacionado                                                       |
| ------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| D-001   | Política oficial de gestión de colisiones de numeración de `docs/`                                     | Aprobada y vigente                                            | 2026-07-18 | `DECISIONS.md`                                                              |
| D-002   | Multi-tenancy de EWO-002 preserva el patrón Membresía de `docs/09`                                     | Aprobada y vigente                                            | 2026-07-19 | `DECISIONS.md`, `docs/engineering/EWO-002_AUTH_REPORT.md`                   |
| D-002.1 | Corrección de nombres de campo (`User.status`→`accountStatus`, `Membership.status`→`membershipStatus`) | Aplicada                                                      | 2026-07-19 | `DECISIONS.md`, `docs/engineering/EWO-002_AUTH_REPORT.md`                   |
| D-003   | Sesión: JWT de acceso + refresh token aleatorio (no Better Auth)                                       | Aprobada y vigente                                            | 2026-07-19 | `DECISIONS.md`, `docs/engineering/EWO-002_AUTH_REPORT.md`                   |
| D-004   | MFA/TOTP se implementa completo en EWO-002                                                             | Aprobada y vigente                                            | 2026-07-19 | `DECISIONS.md`, `docs/engineering/EWO-002_AUTH_REPORT.md`                   |
| D-005   | Límites de alcance de EWO-002 (Companies, correo real, MFA forzoso quedan fuera)                       | Aprobada y vigente (MFA forzoso resuelto por D-006)           | 2026-07-19 | `DECISIONS.md`                                                              |
| D-006   | Política de enrolamiento forzoso de MFA (cierre de EWO-002)                                            | Aprobada y vigente                                            | 2026-07-19 | `DECISIONS.md`, `docs/engineering/EWO-002_AUTH_REPORT.md`                   |
| D-007   | Estrategia de concurrencia y persistencia atómica del agregado CFDI (EWO-005 Bloque E)                 | **ACEPTADA**                                                  | 2026-07-25 | `DECISIONS.md`, `docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md` |
| D-008   | Recuperación de `E5-S1-T07` mediante migración correctiva versionada                                   | **ACEPTADA**                                                  | 2026-07-26 | `DECISIONS.md`, `docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md`      |
| D-009   | Semántica de `Fecha` CFDI 4.0 (`issuedAtLocal: string`) y namespace oficial del TFD (EWO-005 Bloque E) | **APROBADA E IMPLEMENTADA** · corrección en `READY_FOR_AUDIT` | 2026-08-02 | `DECISIONS.md`, `docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md` |

## Convenciones

- **ID:** `D-NNN`, secuencial, nunca reutilizado — una corrección menor a una decisión existente usa sufijo (`D-002.1`), nunca un ID nuevo.
- **Estado:** `Aprobada y vigente` (uso normal) · `ACEPTADA` (terminología propia de decisiones ratificadas formalmente por el Product Owner, ver D-007/D-008) · `Aplicada` (corrección ya ejecutada, no requiere ratificación separada) · `PROPUESTA — PENDIENTE DE RATIFICACIÓN` (borrador, todavía no vinculante).
- **Fecha:** fecha de la decisión, no de su registro documental si difieren.
- **Nueva decisión:** siempre se agrega primero en `DECISIONS.md` con el detalle completo; esta tabla se actualiza en la misma sesión — nunca al revés.

Vista ejecutiva de las 2 decisiones más relevantes hoy: [`AI_CONTEXT.md`](../AI_CONTEXT.md). Mapa completo del proyecto: [Cómo navegar este ecosistema documental](../MASTER_CONTEXT.md#2-cómo-navegar-este-ecosistema-documental) en `MASTER_CONTEXT.md`.
