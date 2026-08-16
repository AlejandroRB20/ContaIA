# DASHBOARD.md — Tablero Ejecutivo de ContaIA

> Vista de salud del proyecto por **dominio técnico**, no por tarea. Para "qué sigue" (vista por tarea/sprint), ve a [`AI_CONTEXT.md`](AI_CONTEXT.md) — única fuente de ese estado. Cada fila de abajo es un resumen — el detalle vive en el documento enlazado, nunca aquí. Si un número de este tablero contradice su fuente, **la fuente enlazada tiene razón**, no este archivo.

**Última actualización:** 2026-07-30 · **Próxima revisión sugerida:** al cierre de cada EWO (ver [Gobierno y mantenimiento de este documento](MASTER_CONTEXT.md#15-gobierno-y-mantenimiento-de-este-documento), regla 7).

| Área                       | Estado                                      | Avance                                                                                                                                                  | Detalle                                                                                                                                                     |
| -------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🏗️ Arquitectura            | 🟢 Estable                                  | D-001 a D-008 ratificadas; monolito modular vigente (10.9); sin deuda arquitectónica bloqueante                                                         | [`brain/DECISION_INDEX.md`](brain/DECISION_INDEX.md), `docs/07_SOFTWARE_ARCHITECTURE.md`                                                                    |
| ⚙️ Backend                 | 🟡 En progreso                              | EWO-001 a EWO-004 `DONE`; EWO-005 Bloque E Sprint 2: 6/10 tareas `PASSED`, 3 `READY_FOR_AUDIT`, 1 `BLOCKED`                                             | [`AI_CONTEXT.md`](AI_CONTEXT.md), [`EWO-005_IMPLEMENTATION_CHECKLIST.md`](docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md)                             |
| 🎨 Frontend                | 🟢 Funcional (alcance actual)               | Auth, MFA, selección/gestión de Empresa, workspace context y carga de documentos operativos; sin UI de contabilidad/conciliación todavía (no iniciada)  | `docs/engineering/EWO-004_USER_RBAC_REPORT.md`, `docs/12_FRONTEND_ARCHITECTURE.md`                                                                          |
| 🤖 Inteligencia Artificial | 🔴 No implementado                          | Arquitectura y 11 perfiles de Agente documentados (4 activos para MVP); **cero código de agentes construido todavía**                                   | `docs/10_AI_ARCHITECTURE.md`, [Inteligencia artificial](MASTER_CONTEXT.md#7-inteligencia-artificial)                                                        |
| 🔒 Seguridad               | 🟢 Sólido para el alcance actual            | MFA/TOTP, RBAC granular, aislamiento multi-tenant auditado y `PASSED` (`E5-S2-T08`, `BR-GLB-001`); sin pentest externo registrado                       | `docs/11_SECURITY_ARCHITECTURE.md`, [`E5-S2-T08_FINAL_AUDIT.md`](docs/engineering/audits/E5-S2-T08_FINAL_AUDIT.md)                                          |
| 🧪 Testing                 | 🟡 Cobertura por módulo, sin métrica global | 138/138 pruebas en verde en el alcance activo de Bloque E Sprint 2; sin cifra de cobertura consolidada de todo el monorepo                              | `docs/23_TESTING_AND_QA_PLAN.md` (plan; sin ejecución global reportada aquí)                                                                                |
| 📚 Documentación           | 🟢 Recién reorganizada                      | Knowledge Platform v1.0 implementado 2026-07-30 (este conjunto de archivos); deuda conocida: ~45 referencias cruzadas con numeración de sección antigua | [Qué cambió en esta reorganización](MASTER_CONTEXT.md#17-qué-cambió-en-esta-reorganización), [`DOCUMENTATION_STYLE_GUIDE.md`](DOCUMENTATION_STYLE_GUIDE.md) |
| 🗺️ Roadmap                 | 🟡 Etapa 2 (MVP) en curso                   | EWO-001 a EWO-004 completadas; EWO-005 (CFDI) en curso; Etapas 3-6 no iniciadas                                                                         | [Roadmap, alcance por etapas y módulos de largo plazo](MASTER_CONTEXT.md#11-roadmap-alcance-por-etapas-y-módulos-de-largo-plazo)                            |

## Leyenda

🟢 Saludable / sin bloqueo · 🟡 En progreso / requiere atención periódica · 🔴 No iniciado o con hallazgo abierto relevante — no implica error, puede ser simplemente "todavía no construido"

## Qué NO es este tablero

No es una fuente de verdad — es un **rollup de lectura rápida**. Ninguna cifra o estado de aquí se mantiene de forma independiente: si `AI_CONTEXT.md`, el checklist activo o un `_FINAL_AUDIT.md` cambian, este tablero debe reflejarlo en la misma sesión, nunca antes ni de forma distinta. No reporta métricas de negocio (usuarios, adopción, costos) — eso, cuando exista, será un tablero de producto separado, no técnico.

## Mantenimiento

Actualizar la fila correspondiente cuando: cierra un EWO completo, cambia el veredicto de una auditoría de Sprint, o se detecta una desviación material (p. ej. una regresión de pruebas). No actualizar por cada tarea individual — para eso está [`AI_CONTEXT.md`](AI_CONTEXT.md).
