# EWO-006A PREFLIGHT SOURCE PACK

## 1. Estado

- Documento no ejecutable.
- No es `queue.yaml`.
- No materializa tarjetas.
- No autoriza runtime.
- No autoriza el valor `READY` en `state`.
- No autoriza el valor `PASSED` en ningún estado de cierre.
- No es fuente canónica: es un working document local para generar YAML v3 sin improvisar. La fuente canónica de decisiones sigue siendo `brain/DECISIONS.md` y `brain/DECISION_INDEX.md`.

## 2. Decisiones base

- D-014 — Contrato de autorización del Catálogo de Cuentas (M5): **APROBADA · PENDIENTE DE IMPLEMENTACIÓN** (`brain/DECISION_INDEX.md`).
- D-016 — Contrato de dominio de Cuenta para M5: **APROBADA · PENDIENTE DE IMPLEMENTACIÓN** (`brain/DECISION_INDEX.md`).
- D-015 — Representación canónica de impuestos CFDI 4.0: **PROPUESTA · PENDIENTE DE APROBACIÓN HUMANA**, fuera de alcance de EWO-006A. No se aprueba, ratifica ni resuelve en este documento.
- M6 (posting/grouping, restricciones contables sobre hijos, pólizas, `MovimientoPoliza`): fuera de alcance de EWO-006A por diseño de D-016. No se resuelve en este documento.
- H-GRAPH-004 — **corrección aplicada a la instrucción original**: el estado verificado en `docs/engineering/AUTONOMOUS_TASK_GRAPH_V1_ARCHITECTURE.md` (rama `docs/graph-v1-architecture-v02`, no presente en `main` ni en esta rama) es **`PENDING_HUMAN_RATIFICATION`**, no "aprobada". La arquitectura documental Graph v0.8 está ratificada como diseño, pero el propio documento fuente declara explícitamente: "Ninguna versión autoriza por sí sola la implementación" y que `GRAPH-RUNTIME`/`GRAPH-001` permanecen `BLOCKED_ON_H-GRAPH-004` hasta ratificación humana explícita. Se registra así, sin inventar una aprobación que el documento fuente no otorga. H-GRAPH-004 es, además, ajena al alcance funcional de EWO-006A (gobierna la ubicación de `graph.yaml`/motor Loop, no el módulo Cuenta) — se incluye aquí únicamente como nota de gobierno cruzado, no como bloqueo de esta EWO.

## 3. Resultado Codex YAML v2

Codex confirmó sobre el YAML v2:

- Parsea correctamente.
- 16 tarjetas.
- Raíz `version: 2` + `tasks:`.
- Cero anclas YAML.
- Cero alias YAML.
- Cero brace globs.
- Cero lenguaje natural en `forbidden_scope`.
- Las 16 tarjetas incluyen los 14 campos exigidos.
- `risk_class` y `state` usan solo valores válidos del contrato.
- Cero tarjetas con el valor `READY` en `state`.
- `base_commit` es `null` en las 16 tarjetas.
- El DAG de dependencias no tiene ciclos.
- `E6A-S4-T03` está correctamente excluida del YAML materializable.

Codex mantuvo el veredicto:

`PREFLIGHT YAML v2 REQUIRES CHANGES`

por estos bloqueos:

- `dependencies: []` necesita ratificación explícita como excepción canónica de listas vacías.
- `E6A-S2-T02` debe incluir `apps/api/src/app.module.ts` en `allowed_write`.
- Los gates documentales de S0 (S0-T01, S0-T02) deben fortalecerse — verificar presencia de una cadena `D-01x` no es suficiente criterio de coherencia.
- Las migraciones Prisma (S1-T01, S1-T02) no pueden expresar una ruta exacta de directorio nuevo antes de la ejecución.
- El frontend debe confirmar convención de colocalización de cliente/hooks.
- Ninguna tarjeta debe instanciarse (worktree, rama, `candidate_commit`) mientras `base_commit` sea `null`.
- `qa_required` y `human_gate_required` son campos descriptivos, no mecanismos de enforcement autónomo.
- `295b962` (candidato de `E6A-S2-T01`) es solo antecedente documental, no reutilizable como `base_commit`.
- `E6A-S4-T03` queda fuera de la cola materializable.

## 4. Decisiones ratificadas para YAML v3

1. `dependencies: []` queda permitido como excepción canónica para listas vacías — únicamente en tarjetas sin dependencia real dentro de EWO-006A.
2. `E6A-S2-T02` debe incluir `apps/api/src/app.module.ts` en `allowed_write`.
3. `apps/api/src/app.module.ts` debe aparecer en `forbidden_scope` de cualquier otra tarjeta backend que toque `apps/api` (todas excepto `E6A-S2-T02`).
4. Frontend v1 usará colocalización dentro de `apps/web/src/app/[companyId]/contabilidad/cuentas` — cliente, hooks y componentes viven en ese árbol, no en `apps/web/src/lib`, `apps/web/src/hooks` ni `apps/web/src/components` compartidos.
5. `E6A-S4-T03` queda fuera del YAML materializable de EWO-006A.
6. Las migraciones Prisma (`E6A-S1-T01`, `E6A-S1-T02`) quedan en `state: BLOCKED_HUMAN_DECISION` hasta que exista un mecanismo humano-autorizado para expresar una ruta nueva exacta de directorio de migración.
7. Ninguna tarjeta debe instanciarse (worktree, rama, ejecución) mientras `base_commit` sea `null`.
8. `295b962e2910142851da7089b98ca99438c24b63` es solo antecedente documental — nunca `base_commit` de `E6A-S2-T01` ni de ninguna otra tarjeta.
9. `E6A-S0-T03` no puede contener la cadena literal `PASSED` en ningún campo ni en el contenido que produzca.
10. `E6A-S4-T02` debe incluir tanto D-014 como D-016 en `decision_refs`.
11. QA (`E6A-S4-T01`, `E6A-S4-T02`) no puede tener un directorio de módulo de producción completo como `allowed_write` — solo archivos de prueba exactos.
12. `E6A-S0-T03` solo puede preparar el cierre a un estado de "pendiente de auditoría independiente"; certificar el cierre final es exclusivo de la auditoría READ ONLY de Codex.

## 5. Contrato YAML v3

El YAML debe iniciar con:

```yaml
version: 2
tasks:
```

Cada tarjeta debe tener exactamente estos 14 campos:

- `task_id`
- `mission_id`
- `title`
- `risk_class`
- `state`
- `base_commit`
- `allowed_write`
- `forbidden_scope`
- `dependencies`
- `test_commands`
- `reads_contract`
- `qa_required`
- `human_gate_required`
- `decision_refs`

`mission_id` siempre: `EWO-006A`.

No usar en el YAML v3:

- anclas YAML;
- alias YAML;
- brace globs;
- lenguaje natural dentro de `forbidden_scope`;
- metadata operativa en la raíz (`mission`, `decision_refs`, `base_ref_note` como claves de nivel raíz);
- el valor `READY` en el campo `state`;
- este mismo documento como si fuera el `queue.yaml` real — es su fuente, no su sustituto.

Valores válidos de `risk_class`: `STANDARD`, `DOCUMENTATION`, `CRITICAL`, `ARCHITECTURE`, `SECURITY`, `FISCAL`, `MIGRATION`.

Valores válidos de `state` en esta versión: `BLOCKED`, `BLOCKED_HUMAN_DECISION` (y, si aplica en el futuro, `BLOCKED_ARCHITECTURE`). Ninguna tarjeta de EWO-006A usa el estado inicial que autoriza ejecución mientras `base_commit` sea `null`.

## 6. Inventario de tarjetas YAML v3

El YAML v3 debe tener 16 tarjetas.

### E6A-S0-T01
Título: Sync docs to D-014 account permissions
risk_class: DOCUMENTATION
state: BLOCKED
decision_refs: D-014
dependencies: []

### E6A-S0-T02
Título: Sync docs to D-016 account domain contract
risk_class: DOCUMENTATION
state: BLOCKED
decision_refs: D-016
dependencies: []

### E6A-S0-T03
Título: Prepare EWO-006A governance closure pending independent audit
risk_class: DOCUMENTATION
state: BLOCKED
decision_refs: D-014, D-016
dependencies:
- E6A-S0-T01
- E6A-S0-T02
- E6A-S3-T01
- E6A-S3-T02
- E6A-S3-T03
- E6A-S3-T04
- E6A-S4-T01
- E6A-S4-T02

Nota: no puede contener la cadena literal `PASSED`.

### E6A-S1-T01
Título: Implement Account Prisma model
risk_class: MIGRATION
state: BLOCKED_HUMAN_DECISION
decision_refs: D-016
dependencies: []

### E6A-S1-T02
Título: Implement Account history Prisma model
risk_class: MIGRATION
state: BLOCKED_HUMAN_DECISION
decision_refs: D-016
dependencies:
- E6A-S1-T01

### E6A-S2-T01
Título: Implement account permission catalog
risk_class: SECURITY
state: BLOCKED_HUMAN_DECISION
decision_refs: D-014
dependencies: []
Nota: `295b962` solo antecedente documental.

### E6A-S2-T02
Título: Implement POST Accounts API and AccountsModule scaffold
risk_class: CRITICAL
state: BLOCKED
decision_refs: D-014, D-016
dependencies:
- E6A-S1-T01
- E6A-S2-T01
Nota: debe incluir `apps/api/src/app.module.ts` en `allowed_write`.

### E6A-S2-T03
Título: Implement GET Accounts API
risk_class: CRITICAL
state: BLOCKED
decision_refs: D-014, D-016
dependencies:
- E6A-S1-T01
- E6A-S2-T01
- E6A-S2-T02

### E6A-S2-T04
Título: Implement PATCH Account API with history
risk_class: CRITICAL
state: BLOCKED
decision_refs: D-014, D-016
dependencies:
- E6A-S1-T01
- E6A-S1-T02
- E6A-S2-T01
- E6A-S2-T02

### E6A-S2-T05
Título: Implement logical Account deactivation API
risk_class: CRITICAL
state: BLOCKED
decision_refs: D-014, D-016
dependencies:
- E6A-S1-T01
- E6A-S1-T02
- E6A-S2-T01
- E6A-S2-T02

### E6A-S3-T01
Título: Implement Accounts list and tree page
risk_class: STANDARD
state: BLOCKED
decision_refs: D-014, D-016
dependencies:
- E6A-S2-T03
Nota: frontend colocalizado.

### E6A-S3-T02
Título: Implement Account creation UI
risk_class: STANDARD
state: BLOCKED
decision_refs: D-014, D-016
dependencies:
- E6A-S2-T02
Nota: frontend colocalizado.

### E6A-S3-T03
Título: Implement Account detail edit and activity UI
risk_class: STANDARD
state: BLOCKED
decision_refs: D-014, D-016
dependencies:
- E6A-S2-T04
- E6A-S1-T02
Nota: frontend colocalizado.

### E6A-S3-T04
Título: Implement Account logical deactivation UI
risk_class: CRITICAL
state: BLOCKED
decision_refs: D-014, D-016
dependencies:
- E6A-S2-T05
Nota: frontend colocalizado.

### E6A-S4-T01
Título: Implement backend Account integration tests
risk_class: CRITICAL
state: BLOCKED
decision_refs: D-016
dependencies:
- E6A-S2-T02
- E6A-S2-T03
- E6A-S2-T04
- E6A-S2-T05
Nota: QA test-only, no producción.

### E6A-S4-T02
Título: Implement Account permission matrix tests
risk_class: SECURITY
state: BLOCKED
decision_refs: D-014, D-016
dependencies:
- E6A-S2-T01
- E6A-S2-T02
- E6A-S2-T03
- E6A-S2-T04
- E6A-S2-T05
Nota: QA test-only, no producción.

## 7. Tarjeta excluida

E6A-S4-T03 queda fuera del YAML.

Motivo:

- no existe runner E2E frontend en el repositorio;
- Vitest/jsdom no equivale a una prueba E2E real;
- requiere decisión humana posterior entre:
  - A) introducir runner E2E;
  - B) redefinir como integración frontend;
  - C) excluir definitivamente de esta EWO.

## 8. Bloqueos humanos abiertos

- `base_commit` operativo pendiente de ratificación (relación entre `main` y `gov/d013-d015-decision-stack` sin resolver).
- Mecanismo Prisma para permitir exactamente un nuevo directorio de migración, sin glob amplio ni ruta ficticia.
- Destino de `295b962` (rama `loop/e6a-s2-t01-account-permission-catalog`) pendiente.
- Decisión sobre `E6A-S4-T03` pendiente (A/B/C, ver sección 7).
- Prohibido instanciar cualquier tarjeta mientras `base_commit` sea `null`.
- `E6A-S0-T03` no puede escribir un estado final auditado por sí misma.

## 9. Checklist para productor YAML

- `version: 2`.
- `tasks:`.
- 16 tarjetas.
- Sin `E6A-S4-T03`.
- Ninguna tarjeta con el valor `READY` en `state`.
- `base_commit` en `null` en todas.
- `mission_id: EWO-006A` en todas.
- Títulos específicos, no genéricos.
- `apps/api/src/app.module.ts` solo en `allowed_write` de `E6A-S2-T02`.
- `apps/api/src/app.module.ts` en `forbidden_scope` de cualquier otra tarjeta backend.
- `E6A-S4-T01`/`E6A-S4-T02` solo con archivos de prueba en `allowed_write`.
- `E6A-S4-T02` con D-014 y D-016 en `decision_refs`.
- `E6A-S0-T03` sin la cadena literal `PASSED`.
- `dependencies: []` permitido solo donde la lista vacía es real.

## 10. Checklist para validator local

- Verificación conceptual contra las reglas de este Source Pack (no un parser YAML real).
- 16 tarjetas.
- DAG sin ciclos.
- Cero dependencias que referencien un `task_id` inexistente.
- Sin metadata operativa en la raíz.
- Sin anclas ni alias.
- Sin brace globs.
- Sin `forbidden_scope` en lenguaje natural.
- Ninguna tarjeta con el valor `READY` en `state`.
- Sin `E6A-S4-T03` en `tasks:`.
- Bloqueos humanos abiertos listados fuera del YAML (sección 8 de este documento).
