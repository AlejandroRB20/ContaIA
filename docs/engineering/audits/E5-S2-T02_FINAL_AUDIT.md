# E5-S2-T02 — Auditoría final independiente

## Metadatos

| Campo              | Valor observado                                             |
| ------------------ | ----------------------------------------------------------- |
| Fecha y hora local | 2026-07-26 20:09:00 -06:00                                  |
| Auditor            | Codex                                                       |
| Modo               | Auditoría independiente con escritura limitada de artefacto |
| Repositorio        | C:\Users\EliteBook\Desktop\contai\ContaIA                   |
| Rama               | feature/frontend-ux-audit                                   |
| Commit HEAD        | 8fb0638                                                     |
| Árbol al inicio    | 39 entradas staged, 3 unstaged y 2 directorios untracked    |

## 1. Veredicto

**PASSED**

No se detectaron hallazgos nuevos CRITICAL, HIGH ni MEDIUM. Permanece H-T01-01 como seguimiento LOW preexistente y no bloqueante.

## 2. Resumen ejecutivo

CfdiRepository.create() cumple la tarjeta E5-S2-T02 y AD-10.1.2. Recibe explícitamente el Prisma.TransactionClient, documentId, companyId y el ExtractedCfdiAggregate; usa documentId_companyId como guarda de invariante; lanza de inmediato ante una cabecera existente; y, si no existe, usa exclusivamente create().

No hay reutilización, upsert, nested writes, transacción propia, cambios de Document o Job, ni política de negocio sobre folios duplicados. La exportación de tipo Cfdi en prisma-types.ts y ViolacionDeInvarianteError son extensiones mínimas necesarias y no anticipan indebidamente T03 a T07.

## 3. Fuentes inspeccionadas

- MASTER_CONTEXT.md.
- docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md, incluida la tarjeta completa E5-S2-T02.
- brain/DECISIONS.md, brain/QUESTIONS.md y brain/RISKS.md.
- packages/database/prisma/schema.prisma y migraciones CFDI relevantes.
- packages/database/src/prisma-types.ts.
- docs/08_API_DESIGN.md, docs/20_BACKEND_IMPLEMENTATION_PLAN.md y docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md.
- docs/engineering/audits/E5-S2-T01_FINAL_AUDIT.md.
- docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md, especialmente AD-10.1 y AD-10.1.2.
- cfdi-aggregate.types.ts, cfdi.repository.ts, cfdi.errors.ts y cfdi.repository.spec.ts.
- documents.repository.ts, jobs.repository.ts, jobs.errors.ts y pruebas de Jobs como patrón.

## 4. Comandos ejecutados

| Comando                                                                                   | Resultado relevante                                                                    |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Get-Date; git branch --show-current; git rev-parse --short HEAD; git status --short       | Metadatos y estado actual capturados directamente.                                     |
| Get-Content sobre tarjeta, MASTER_CONTEXT, schema, repositorio, error y prisma-types      | Implementación y fuentes de verdad revisadas directamente.                             |
| rg sobre Addendum, riesgos, preguntas, decisiones, API y migraciones                      | Confirmó invariantes, P2002 externo, Q-001 abierta y restricciones únicas.             |
| pnpm --filter @contaia/database run typecheck                                             | Exit 0.                                                                                |
| pnpm --filter @contaia/api run typecheck                                                  | Exit 0.                                                                                |
| ESLint sobre prisma-types.ts                                                              | Exit 0.                                                                                |
| ESLint sobre repositorio, prueba y error CFDI                                             | Exit 0.                                                                                |
| Prettier sobre los cuatro archivos T02                                                    | Correcto.                                                                              |
| pnpm --filter @contaia/api exec jest --runInBand src/modules/cfdi/cfdi.repository.spec.ts | 1 suite, 6 pruebas, PASSED.                                                            |
| git diff --check; git diff --cached --check                                               | El diff unstaged está limpio; el staged tiene advertencias preexistentes ajenas a T02. |

No se ejecutó build, migraciones, SQL, Docker ni operaciones destructivas.

## 5. Estado del árbol de trabajo

| Área                  | Estado observado                                                          | Evaluación                                                                     |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Staged                | 39 entradas de skills, web, documentación, seed y pruebas                 | Cambios preexistentes, no atribuidos a T02.                                    |
| Unstaged              | MASTER_CONTEXT, checklist y prisma-types.ts                               | El cambio T02 propio en prisma-types.ts es mínimo; los demás son documentales. |
| Untracked             | apps/api/src/modules/cfdi y docs/engineering/audits                       | El primero contiene T01 y T02; el segundo contiene auditorías previas.         |
| Cambios T02           | cfdi.repository.ts, cfdi.errors.ts, cfdi.repository.spec.ts y export Cfdi | Dentro del alcance interpretado.                                               |
| Auditorías existentes | E5-S1-T10_FINAL_AUDIT.md y E5-S2-T01_FINAL_AUDIT.md                       | Preexistentes a este artefacto.                                                |
| Schema y migraciones  | Sin diff activo                                                           | T02 no los modifica.                                                           |
| Artefactos ignorados  | packages/database/dist y apps/api/dist                                    | Ignorados por .gitignore; no se alteraron en esta auditoría.                   |

Las 25 advertencias de git diff --cached --check corresponden a archivos web y de pruebas ajenos a T02. No afectan sus archivos, que son untracked o unstaged.

## 6. Estado documental

| Elemento  | Esperado                       | Encontrado                 | Consistente |
| --------- | ------------------------------ | -------------------------- | ----------- |
| Sprint 1  | COMPLETADO                     | COMPLETADO                 | Sí          |
| E5-S2-T01 | PASSED                         | PASSED                     | Sí          |
| E5-S2-T02 | READY_FOR_AUDIT                | READY_FOR_AUDIT            | Sí          |
| Sprint 2  | IN_PROGRESS                    | IN_PROGRESS                | Sí          |
| E5-S2-T03 | No iniciada                    | No iniciada                | Sí          |
| Q-001     | ABIERTA                        | Abierta                    | Sí          |
| H-T01-01  | LOW, seguimiento no bloqueante | R-009 sigue desactualizado | Sí          |

El checklist y MASTER_CONTEXT son coherentes respecto del estado actual. Las referencias anteriores que describen modelos fiscales ausentes son históricas, salvo R-009, que sigue siendo el seguimiento LOW ya registrado.

## 7. Alcance interpretado

T02 exige exclusivamente crear la cabecera Cfdi mediante el patrón findUnique por documentId_companyId seguido de create(), usando el TransactionClient de la futura Transacción A. Debe rechazar una preexistencia como violación de invariante y no reutilizarla.

cfdi.errors.ts es una dependencia técnica legítima: la tarjeta ordena lanzar ViolacionDeInvarianteError. Solo declara la razón que T02 puede producir; T07 deberá ampliarlo. Exportar Cfdi desde prisma-types.ts es igualmente mínimo y necesario para el retorno público del repositorio.

## 8. Revisión de CfdiRepository.create()

| Criterio                           | Resultado | Evidencia                                                                         |
| ---------------------------------- | --------- | --------------------------------------------------------------------------------- |
| Firma                              | Correcto  | Recibe tx, documentId, companyId y ExtractedCfdiAggregate; retorna Promise<Cfdi>. |
| TransactionClient explícito        | Correcto  | tx: Prisma.TransactionClient; no cliente global.                                  |
| Contexto separado del agregado     | Correcto  | documentId y companyId no aparecen en el contrato extraído.                       |
| Tenant isolation                   | Correcto  | companyId se incluye en búsqueda y create.                                        |
| Guarda compuesta                   | Correcto  | findUnique usa documentId_companyId.                                              |
| Preexistencia                      | Correcto  | Lanza ViolacionDeInvarianteError inmediatamente.                                  |
| Uso del resultado existente        | Correcto  | Solo se comprueba su existencia; no se lee ni reutiliza.                          |
| Creación                           | Correcto  | Solo tx.cfdi.create.                                                              |
| Ausencia de upsert                 | Correcto  | Sin llamada ejecutable a upsert.                                                  |
| Mapeo de cabecera                  | Correcto  | RFCs, folio, fecha, montos, moneda, tipo y ambiguousFields incluidos.             |
| Hijos y nested writes              | Correcto  | No hay conceptos ni impuestos en data.                                            |
| Document, Job y transacción propia | Correcto  | Sin escrituras ni $transaction propios.                                           |

## 9. Mapeo contra Prisma

| Campo o aspecto                              | Implementación                      | Evaluación                                                    |
| -------------------------------------------- | ----------------------------------- | ------------------------------------------------------------- |
| documentId_companyId                         | findUnique compuesto                | Coincide con @@unique de Cfdi.                                |
| companyId_folioFiscal                        | No se consulta ni maneja localmente | Correcto: su P2002 se arbitra fuera en T06.                   |
| documentId y companyId                       | Parámetros y data de create         | Compatible con FK compuesta y aislamiento tenant.             |
| folioFiscal, RFCs, currency, tipoComprobante | Strings del agregado                | Correspondencia completa.                                     |
| issuedAt                                     | Date                                | Compatible con DateTime.                                      |
| subtotal y total                             | Cadenas decimales exactas           | Prisma acepta strings para Decimal; no introduce float.       |
| ambiguousFields                              | Copia con spread                    | Convierte readonly string array a String[] mutable sin alias. |
| Retorno                                      | Cfdi reexportado por database       | API pública mínima y tipada.                                  |
| IDs, timestamps, relaciones e hijos          | No mapeados                         | Correcto: los genera o maneja persistencia posterior.         |

## 10. Guarda, concurrencia y errores

La guarda protege la invariante de que no puede existir un Cfdi para el mismo documento y empresa dentro de la Transacción A cuando el Document sigue PROCESSING. Si aparece, la única respuesta válida es rollback y escalamiento; nunca reutilización.

La ventana entre findUnique y create es intencional: las restricciones únicas documentId_companyId y companyId_folioFiscal protegen el commit. Una carrera del mismo documento produce P2002 de convergencia; un folio de otro documento produce P2002 de conflicto fiscal. Ambos abortan y T06 los clasifica fuera de la transacción, con consultas nuevas y evidencia positiva. El repositorio no captura ni transforma P2002, como exige AD-10.1.2.

## 11. Revisión de cfdi.errors.ts

ViolacionDeInvarianteError hereda de Error, mantiene un discriminador literal tipado en razon y sigue la convención de JobsError. Su nombre y semántica coinciden con la tarjeta y el Addendum. No exporta errores futuros ni duplica RecoverableError o UnrecoverableError; el solape con T07 es necesario, limitado y documentado.

## 12. Revisión de prisma-types.ts

Cfdi se agrega solo como export de tipo. Permite tipar Promise<Cfdi> sin importar generated/client desde apps/api. No se exportan modelos, enums o clientes innecesarios y typecheck de ambos paquetes confirma que no rompe consumidores.

## 13. Q-001

Q-001 continúa ABIERTA. El repositorio no adopta una política de negocio, no reutiliza el CFDI, no ignora ni reemplaza datos, y no captura P2002.

La afirmación documental de que el folioFiscal duplicado no participa en T02 es imprecisa en sentido literal: create puede generar P2002 por companyId_folioFiscal. El propio texto aclara correctamente que ese P2002 se propaga para clasificación posterior; por ello no constituye un defecto de T02 ni una resolución implícita de Q-001.

## 14. Pruebas

| Caso                               | Cubierto           | Evidencia                                                                               |
| ---------------------------------- | ------------------ | --------------------------------------------------------------------------------------- |
| findUnique con clave compuesta     | Sí                 | Expectación exacta de documentId_companyId.                                             |
| create y mapeo de cabecera         | Sí                 | Expectación exacta de data.                                                             |
| companyId y documentId             | Sí                 | Presentes en búsqueda y creación.                                                       |
| Fecha y decimales string           | Sí                 | Fixture y mapeo comprobado.                                                             |
| ambiguousFields readonly           | Sí                 | Prueba de copia mutable sin alias.                                                      |
| Preexistencia                      | Sí                 | Error tipado y ausencia de create/upsert.                                               |
| Resultado existente no reutilizado | Sí                 | Mock vacío prueba que no se leen campos.                                                |
| Prohibición de upsert              | Sí                 | Spy explícito en ruta de creación.                                                      |
| Nested writes                      | Sí, indirectamente | La expectativa completa de data no contiene hijos.                                      |
| P2002 propagado                    | No aislado         | El código no tiene catch; la clasificación y prueba de integración quedan para T06/T10. |

La prueba aislada pasó con 6 de 6. No hay skip, only, snapshots ni mocks permisivos que oculten llamadas relevantes. Los casts de TransactionClient y Cfdi vacío están delimitados a mocks de pruebas y tienen finalidad explícita.

## 15. Criterios de aceptación

| Criterio                                   | Estado   | Evidencia                                |
| ------------------------------------------ | -------- | ---------------------------------------- |
| Cabecera creada con create(), nunca upsert | Cumplido | Código, revisión estática y prueba.      |
| Guarda previa por documento y empresa      | Cumplido | findUnique con clave declarada.          |
| Preexistencia no reutilizable              | Cumplido | Error inmediato y pruebas.               |
| Ninguna ruta usa existing para continuar   | Cumplido | Código y mock vacío.                     |
| Entrada basada en ExtractedCfdiAggregate   | Cumplido | Firma y mapeo completo.                  |
| Contexto tenant y documento explícito      | Cumplido | Parámetros y data.                       |
| Prueba unitaria                            | Cumplido | 1 suite, 6 pruebas verdes.               |
| Sin tareas posteriores                     | Cumplido | Sin hijos, orquestación ni transiciones. |

## 16. Alcance y tareas posteriores

- T03 implementará conceptos, impuestos, posiciones y exports adicionales.
- T06 integrará todos los repositorios en una única transacción y arbitrará P2002.
- T07 completará los errores tipados.
- T10 probará integración, rollback y propagación/clasificación de errores.

No existe implementación anticipada bloqueante de esas tareas.

## 17. Validaciones

| Comando                                                                                   | Resultado                                                       |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| pnpm --filter @contaia/database run typecheck                                             | Exit 0.                                                         |
| pnpm --filter @contaia/api run typecheck                                                  | Exit 0.                                                         |
| pnpm --filter @contaia/database exec eslint src/prisma-types.ts --max-warnings 0          | Exit 0.                                                         |
| pnpm --filter @contaia/api exec eslint sobre los tres archivos CFDI                       | Exit 0.                                                         |
| pnpm exec prettier --check sobre los cuatro archivos                                      | Correcto.                                                       |
| pnpm --filter @contaia/api exec jest --runInBand src/modules/cfdi/cfdi.repository.spec.ts | 1 suite y 6 pruebas PASSED.                                     |
| git diff --check                                                                          | Exit 0.                                                         |
| git diff --cached --check                                                                 | Exit 2 por 25 espacios finales en archivos staged ajenos a T02. |

## 18. Hallazgos

No se detectaron hallazgos nuevos atribuibles a T02 con severidad CRITICAL, HIGH, MEDIUM ni LOW.

H-T01-01 permanece como hallazgo LOW preexistente:

| Campo                  | Detalle                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| ID                     | H-T01-01                                                                                                |
| Severidad              | LOW                                                                                                     |
| Archivo y ubicación    | brain/RISKS.md, R-009                                                                                   |
| Descripción            | Afirma que CfdiConcept, CfdiTax y conceptSlot no existen, aunque están materializados en schema Prisma. |
| Impacto                | Riesgo documental desactualizado.                                                                       |
| Evidencia              | schema.prisma contiene los tres elementos.                                                              |
| Corrección recomendada | Actualización documental posterior de R-009.                                                            |
| Condición de bloqueo   | No bloquea T02 y no es atribuible a ella.                                                               |

## 19. Riesgos y verificaciones diferidas

| Categoría                            | Estado                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| Defecto actual                       | Ninguno atribuido a T02.                                                             |
| Concurrencia cubierta por constraint | La carrera findUnique a create se resuelve por restricciones únicas y P2002 externo. |
| T03                                  | Persistencia de hijos, posiciones, scope y conceptSlot.                              |
| T06                                  | Transacción única y clasificación externa de P2002.                                  |
| T07                                  | Ampliación de errores tipados.                                                       |
| T10                                  | Cobertura de integración, rollback y propagación de errores Prisma.                  |
| H-T01-01 preexistente                | LOW documental; pendiente, no bloqueante.                                            |

## 20. Recomendación final

Aprobar E5-S2-T02. Posteriormente debe actualizarse a PASSED y habilitarse E5-S2-T03. Q-001 debe mantenerse ABIERTA y H-T01-01 debe seguir como LOW no bloqueante hasta su corrección documental posterior.

## 21. Confirmación de independencia

- El resultado se basa en inspección directa del repositorio actual.
- No se usó como evidencia el resumen narrado del Product Owner.
- Esta intervención creó únicamente este artefacto.
- No se modificó código, checklist, MASTER_CONTEXT, brain/RISKS.md, schema ni migraciones.
- No se ejecutó SQL.
- No hubo git add, commit ni push.
