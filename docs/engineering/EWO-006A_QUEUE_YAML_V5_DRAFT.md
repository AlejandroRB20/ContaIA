# EWO-006A QUEUE YAML v5 DRAFT

## Estado

- BORRADOR NO MATERIALIZADO.
- NO CREAR ARCHIVO queue.yaml.
- NO EJECUTAR.
- NO INSTANCIAR TARJETAS.
- Ninguna tarjeta está READY.
- Sucesor de `EWO-006A_QUEUE_YAML_V4_DRAFT.md`, corregido según auditoría Codex (veredicto: `YAML v4 DRAFT REQUIRES CHANGES` — gates documentales S0 insuficientes). Único cambio de contenido respecto a v4: `test_commands` de `E6A-S0-T01`, `E6A-S0-T02` y `E6A-S0-T03`.

## YAML v5

```yaml
version: 2
tasks:
  - task_id: E6A-S0-T01
    mission_id: EWO-006A
    title: Sync docs to D-014 account permissions
    risk_class: DOCUMENTATION
    state: BLOCKED
    base_commit: null
    allowed_write:
      - docs/04_BUSINESS_RULES.md
      - docs/11_SECURITY_ARCHITECTURE.md
      - docs/31_MASTER_SCREEN_MAP.md
      - brain/DECISION_INDEX.md
    forbidden_scope:
      - apps/api/src
      - apps/web/src
      - packages/database/prisma/schema.prisma
      - packages/database/prisma/migrations
      - apps/api/src/app.module.ts
    dependencies: []
    test_commands:
      - rg -q "D-014" docs/04_BUSINESS_RULES.md
      - rg -q "account.read" docs/04_BUSINESS_RULES.md
      - rg -q "account.create" docs/04_BUSINESS_RULES.md
      - rg -q "account.update" docs/04_BUSINESS_RULES.md
      - rg -q "account.deactivate" docs/04_BUSINESS_RULES.md
      - rg -q "D-014" docs/11_SECURITY_ARCHITECTURE.md
      - rg -q "D-014" docs/31_MASTER_SCREEN_MAP.md
      - rg -q "D-014" brain/DECISION_INDEX.md
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-014

  - task_id: E6A-S0-T02
    mission_id: EWO-006A
    title: Sync docs to D-016 account domain contract
    risk_class: DOCUMENTATION
    state: BLOCKED
    base_commit: null
    allowed_write:
      - brain/DECISION_INDEX.md
      - docs/09_DATABASE_DESIGN.md
      - docs/15_UX_FLOWS.md
      - docs/16_WIREFRAMES_SPECIFICATION.md
    forbidden_scope:
      - apps/api/src
      - apps/web/src
      - packages/database/prisma/schema.prisma
      - packages/database/prisma/migrations
      - apps/api/src/app.module.ts
    dependencies: []
    test_commands:
      - rg -q "D-016" docs/09_DATABASE_DESIGN.md
      - rg -q "accountCode" docs/09_DATABASE_DESIGN.md
      - rg -q "parentAccountId" docs/09_DATABASE_DESIGN.md
      - rg -q "ACTIVO" docs/09_DATABASE_DESIGN.md
      - rg -q "PASIVO" docs/09_DATABASE_DESIGN.md
      - rg -q "CAPITAL" docs/09_DATABASE_DESIGN.md
      - rg -q "INGRESO" docs/09_DATABASE_DESIGN.md
      - rg -q "GASTO" docs/09_DATABASE_DESIGN.md
      - rg -q "D-016" docs/15_UX_FLOWS.md
      - rg -q "D-016" docs/16_WIREFRAMES_SPECIFICATION.md
      - rg -q "D-016" brain/DECISION_INDEX.md
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-016

  - task_id: E6A-S0-T03
    mission_id: EWO-006A
    title: Prepare EWO-006A governance closure pending independent audit
    risk_class: DOCUMENTATION
    state: BLOCKED
    base_commit: null
    allowed_write:
      - AI_CONTEXT.md
    forbidden_scope:
      - apps/api/src
      - apps/web/src
      - packages/database/prisma/schema.prisma
      - packages/database/prisma/migrations
      - apps/api/src/app.module.ts
    dependencies:
      - E6A-S0-T01
      - E6A-S0-T02
      - E6A-S3-T01
      - E6A-S3-T02
      - E6A-S3-T03
      - E6A-S3-T04
      - E6A-S4-T01
      - E6A-S4-T02
    test_commands:
      - rg -q "D-014" brain/DECISIONS.md
      - rg -q "D-016" brain/DECISIONS.md
      - rg -q "D-014" brain/DECISION_INDEX.md
      - rg -q "D-016" brain/DECISION_INDEX.md
      - rg -q "EWO-006A" AI_CONTEXT.md
      - rg -q "D-014" AI_CONTEXT.md
      - rg -q "D-016" AI_CONTEXT.md
      - rg -q "pendiente de auditoría independiente" AI_CONTEXT.md
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-014
      - D-016

  - task_id: E6A-S1-T01
    mission_id: EWO-006A
    title: Implement Account Prisma model
    risk_class: MIGRATION
    state: BLOCKED_HUMAN_DECISION
    base_commit: null
    allowed_write:
      - packages/database/prisma/schema.prisma
    forbidden_scope:
      - packages/database/prisma/migrations
      - apps/api/src
      - apps/web/src
      - apps/api/src/app.module.ts
    dependencies: []
    test_commands:
      - pnpm --filter @contaia/database typecheck
      - pnpm --filter @contaia/database test
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-016

  - task_id: E6A-S1-T02
    mission_id: EWO-006A
    title: Implement Account history Prisma model
    risk_class: MIGRATION
    state: BLOCKED_HUMAN_DECISION
    base_commit: null
    allowed_write:
      - packages/database/prisma/schema.prisma
    forbidden_scope:
      - packages/database/prisma/migrations
      - apps/api/src
      - apps/web/src
      - apps/api/src/app.module.ts
    dependencies:
      - E6A-S1-T01
    test_commands:
      - pnpm --filter @contaia/database typecheck
      - pnpm --filter @contaia/database test
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-016

  - task_id: E6A-S2-T01
    mission_id: EWO-006A
    title: Implement account permission catalog
    risk_class: SECURITY
    state: BLOCKED_HUMAN_DECISION
    base_commit: null
    allowed_write:
      - packages/database/prisma/permissions-catalog.ts
      - packages/database/src/permissions-catalog.test.ts
    forbidden_scope:
      - apps/api/src
      - apps/api/src/app.module.ts
      - apps/web/src
    dependencies: []
    test_commands:
      - pnpm --filter @contaia/database typecheck
      - pnpm --filter @contaia/database test
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-014

  - task_id: E6A-S2-T02
    mission_id: EWO-006A
    title: Implement POST Accounts API and AccountsModule scaffold
    risk_class: CRITICAL
    state: BLOCKED
    base_commit: null
    allowed_write:
      - apps/api/src/modules/accounts
      - apps/api/src/app.module.ts
    forbidden_scope:
      - apps/web/src
      - packages/database/prisma/migrations
    dependencies:
      - E6A-S1-T01
      - E6A-S2-T01
    test_commands:
      - pnpm --filter @contaia/api typecheck
      - pnpm --filter @contaia/api lint
      - pnpm --filter @contaia/api test
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-014
      - D-016

  - task_id: E6A-S2-T03
    mission_id: EWO-006A
    title: Implement GET Accounts API
    risk_class: CRITICAL
    state: BLOCKED
    base_commit: null
    allowed_write:
      - apps/api/src/modules/accounts
    forbidden_scope:
      - apps/api/src/app.module.ts
      - apps/web/src
      - packages/database/prisma/migrations
    dependencies:
      - E6A-S1-T01
      - E6A-S2-T01
      - E6A-S2-T02
    test_commands:
      - pnpm --filter @contaia/api typecheck
      - pnpm --filter @contaia/api lint
      - pnpm --filter @contaia/api test
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-014
      - D-016

  - task_id: E6A-S2-T04
    mission_id: EWO-006A
    title: Implement PATCH Account API with history
    risk_class: CRITICAL
    state: BLOCKED
    base_commit: null
    allowed_write:
      - apps/api/src/modules/accounts
    forbidden_scope:
      - apps/api/src/app.module.ts
      - apps/web/src
      - packages/database/prisma/migrations
    dependencies:
      - E6A-S1-T01
      - E6A-S1-T02
      - E6A-S2-T01
      - E6A-S2-T02
    test_commands:
      - pnpm --filter @contaia/api typecheck
      - pnpm --filter @contaia/api lint
      - pnpm --filter @contaia/api test
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-014
      - D-016

  - task_id: E6A-S2-T05
    mission_id: EWO-006A
    title: Implement logical Account deactivation API
    risk_class: CRITICAL
    state: BLOCKED
    base_commit: null
    allowed_write:
      - apps/api/src/modules/accounts
    forbidden_scope:
      - apps/api/src/app.module.ts
      - apps/web/src
      - packages/database/prisma/migrations
    dependencies:
      - E6A-S1-T01
      - E6A-S1-T02
      - E6A-S2-T01
      - E6A-S2-T02
    test_commands:
      - pnpm --filter @contaia/api typecheck
      - pnpm --filter @contaia/api lint
      - pnpm --filter @contaia/api test
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-014
      - D-016

  - task_id: E6A-S3-T01
    mission_id: EWO-006A
    title: Implement Accounts list and tree page
    risk_class: STANDARD
    state: BLOCKED
    base_commit: null
    allowed_write:
      - apps/web/src/app/[companyId]/contabilidad/cuentas
    forbidden_scope:
      - apps/web/src/lib
      - apps/web/src/hooks
      - apps/web/src/components
      - apps/api/src
      - apps/api/src/app.module.ts
      - packages/database/prisma/schema.prisma
      - packages/database/prisma/migrations
    dependencies:
      - E6A-S2-T03
    test_commands:
      - pnpm --filter @contaia/web typecheck
      - pnpm --filter @contaia/web lint
      - pnpm --filter @contaia/web test
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-014
      - D-016

  - task_id: E6A-S3-T02
    mission_id: EWO-006A
    title: Implement Account creation UI
    risk_class: STANDARD
    state: BLOCKED
    base_commit: null
    allowed_write:
      - apps/web/src/app/[companyId]/contabilidad/cuentas
    forbidden_scope:
      - apps/web/src/lib
      - apps/web/src/hooks
      - apps/web/src/components
      - apps/api/src
      - apps/api/src/app.module.ts
      - packages/database/prisma/schema.prisma
      - packages/database/prisma/migrations
    dependencies:
      - E6A-S2-T02
    test_commands:
      - pnpm --filter @contaia/web typecheck
      - pnpm --filter @contaia/web lint
      - pnpm --filter @contaia/web test
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-014
      - D-016

  - task_id: E6A-S3-T03
    mission_id: EWO-006A
    title: Implement Account detail edit and activity UI
    risk_class: STANDARD
    state: BLOCKED
    base_commit: null
    allowed_write:
      - apps/web/src/app/[companyId]/contabilidad/cuentas
    forbidden_scope:
      - apps/web/src/lib
      - apps/web/src/hooks
      - apps/web/src/components
      - apps/api/src
      - apps/api/src/app.module.ts
      - packages/database/prisma/schema.prisma
      - packages/database/prisma/migrations
    dependencies:
      - E6A-S2-T04
      - E6A-S1-T02
    test_commands:
      - pnpm --filter @contaia/web typecheck
      - pnpm --filter @contaia/web lint
      - pnpm --filter @contaia/web test
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-014
      - D-016

  - task_id: E6A-S3-T04
    mission_id: EWO-006A
    title: Implement Account logical deactivation UI
    risk_class: CRITICAL
    state: BLOCKED
    base_commit: null
    allowed_write:
      - apps/web/src/app/[companyId]/contabilidad/cuentas
    forbidden_scope:
      - apps/web/src/lib
      - apps/web/src/hooks
      - apps/web/src/components
      - apps/api/src
      - apps/api/src/app.module.ts
      - packages/database/prisma/schema.prisma
      - packages/database/prisma/migrations
    dependencies:
      - E6A-S2-T05
    test_commands:
      - pnpm --filter @contaia/web typecheck
      - pnpm --filter @contaia/web lint
      - pnpm --filter @contaia/web test
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-014
      - D-016

  - task_id: E6A-S4-T01
    mission_id: EWO-006A
    title: Implement backend Account integration tests
    risk_class: CRITICAL
    state: BLOCKED
    base_commit: null
    allowed_write:
      - apps/api/test/accounts.e2e-spec.ts
    forbidden_scope:
      - apps/api/src/modules/accounts
      - apps/api/src/app.module.ts
      - apps/web/src
      - packages/database/prisma/schema.prisma
      - packages/database/prisma/migrations
    dependencies:
      - E6A-S2-T02
      - E6A-S2-T03
      - E6A-S2-T04
      - E6A-S2-T05
    test_commands:
      - pnpm --filter @contaia/api typecheck
      - pnpm --filter @contaia/api test:integration
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-016

  - task_id: E6A-S4-T02
    mission_id: EWO-006A
    title: Implement Account permission matrix tests
    risk_class: SECURITY
    state: BLOCKED
    base_commit: null
    allowed_write:
      - packages/database/src/permissions-catalog.test.ts
    forbidden_scope:
      - packages/database/prisma/permissions-catalog.ts
      - apps/api/src
      - apps/api/src/app.module.ts
      - apps/web/src
    dependencies:
      - E6A-S2-T01
      - E6A-S2-T02
      - E6A-S2-T03
      - E6A-S2-T04
      - E6A-S2-T05
    test_commands:
      - pnpm --filter @contaia/database typecheck
      - pnpm --filter @contaia/database test
    reads_contract:
      - brain/DECISIONS.md
      - brain/DECISION_INDEX.md
    qa_required: true
    human_gate_required: true
    decision_refs:
      - D-014
      - D-016
```

## Bloqueos humanos abiertos

- `base_commit` operativo pendiente de ratificación — relación entre `main` y `gov/d013-d015-decision-stack` (donde vive `D-016`, commit `344c690`) sin resolver.
- Migraciones Prisma (`E6A-S1-T01`, `E6A-S1-T02`) pendientes de un mecanismo humano-autorizado para expresar una ruta nueva exacta de directorio de migración; hasta entonces `packages/database/prisma/migrations` permanece en `forbidden_scope` de ambas.
- Validación Prisma reproducible (`prisma validate` / `prisma generate` contra `schema.prisma`) sigue pendiente para `E6A-S1-T01`/`E6A-S1-T02`: no se promete reproducibilidad mientras falten `.env`/`DATABASE_URL` en el entorno de ejecución de la tarjeta.
- Destino de `295b962` (rama `loop/e6a-s2-t01-account-permission-catalog`) pendiente — antecedente documental de `E6A-S2-T01`, nunca `base_commit`.
- `E6A-S4-T03` excluida de este YAML hasta decisión humana entre introducir runner E2E, redefinir como integración frontend, o excluir definitivamente.
- No instanciar (worktree, rama, `candidate_commit`) ninguna de las 16 tarjetas mientras su `base_commit` sea `null`.
- `docs/engineering/EWO-006A_PREFLIGHT_SOURCE_PACK.md` es documento de trabajo no canónico y no versionado: se usó para producir este YAML pero no aparece como `reads_contract` de ninguna tarjeta.

## Veredicto

YAML v5 DRAFT READY FOR CODEX RE-AUDIT
