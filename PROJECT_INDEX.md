# PROJECT_INDEX.md — Índice Maestro de ContaIA

> Este documento no explica ni resume. Solo responde: **¿dónde vive cada cosa?** Para entender el proyecto, lee [`MASTER_CONTEXT.md`](MASTER_CONTEXT.md). Para el estado vivo de la sesión de ingeniería, lee [`AI_CONTEXT.md`](AI_CONTEXT.md).

## Cómo usar este índice

Busca por categoría (Ctrl+F el nombre del dominio: "API", "Seguridad", "Auditorías", etc.) o recorre las tablas. Cada fila es una ruta real del repositorio — ninguna ruta de aquí es aspiracional.

---

## Producto y estrategia

| Documento                                                | Contenido                                                                                                                                                        |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/00_PRODUCT_VISION.md`](docs/00_PRODUCT_VISION.md) | Visión de producto a largo plazo                                                                                                                                 |
| [`docs/01_PRD.md`](docs/01_PRD.md)                       | Requisitos y alcance del MVP — autoridad de alcance                                                                                                              |
| [`docs/02_USER_PERSONAS.md`](docs/02_USER_PERSONAS.md)   | Personas de usuario                                                                                                                                              |
| `docs/03_ROADMAP.md`                                     | Reservado — roadmap vive hoy en [Roadmap, alcance por etapas y módulos de largo plazo](MASTER_CONTEXT.md#11-roadmap-alcance-por-etapas-y-módulos-de-largo-plazo) |
| [`docs/04_BUSINESS_RULES.md`](docs/04_BUSINESS_RULES.md) | Reglas de negocio (`BR-*`)                                                                                                                                       |

## Arquitectura

| Documento                                                              | Contenido                |
| ---------------------------------------------------------------------- | ------------------------ |
| [`docs/05_SYSTEM_DOMAIN_MODEL.md`](docs/05_SYSTEM_DOMAIN_MODEL.md)     | Modelo de dominio        |
| [`docs/06_SYSTEM_WORKFLOWS.md`](docs/06_SYSTEM_WORKFLOWS.md)           | Workflows del sistema    |
| [`docs/07_SOFTWARE_ARCHITECTURE.md`](docs/07_SOFTWARE_ARCHITECTURE.md) | Arquitectura de software |

## API

| Documento                                        | Contenido     |
| ------------------------------------------------ | ------------- |
| [`docs/08_API_DESIGN.md`](docs/08_API_DESIGN.md) | Diseño de API |

## Base de datos

| Documento                                                                  | Contenido                          |
| -------------------------------------------------------------------------- | ---------------------------------- |
| [`docs/09_DATABASE_DESIGN.md`](docs/09_DATABASE_DESIGN.md)                 | Diseño de base de datos            |
| [`docs/21_DATABASE_MIGRATION_PLAN.md`](docs/21_DATABASE_MIGRATION_PLAN.md) | Plan de migración                  |
| `packages/database/prisma/schema.prisma`                                   | Esquema Prisma real, en producción |

## Inteligencia artificial

| Documento                                                                                    | Contenido                                                                                 |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`docs/10_AI_ARCHITECTURE.md`](docs/10_AI_ARCHITECTURE.md)                                   | Arquitectura de IA, RAG, agentes activos del MVP                                          |
| [Inteligencia artificial](MASTER_CONTEXT.md#7-inteligencia-artificial) — `MASTER_CONTEXT.md` | Catálogo de los 11 perfiles de Agente (fuente canónica citada por nombre desde `docs/10`) |
| [`docs/29_RAG_ARCHITECTURE.md`](docs/29_RAG_ARCHITECTURE.md)                                 | Reservado — RAG ya cubierto en `docs/10` §6                                               |

## Seguridad

| Documento                                                              | Contenido                                                  |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| [`docs/11_SECURITY_ARCHITECTURE.md`](docs/11_SECURITY_ARCHITECTURE.md) | Arquitectura de seguridad                                  |
| [`docs/04_BUSINESS_RULES.md`](docs/04_BUSINESS_RULES.md)               | `BR-GLB-001` (aislamiento multi-tenant) y demás `BR-SEC-*` |

## Frontend, UX y diseño

| Documento                                                                    | Contenido                     |
| ---------------------------------------------------------------------------- | ----------------------------- |
| [`docs/12_FRONTEND_ARCHITECTURE.md`](docs/12_FRONTEND_ARCHITECTURE.md)       | Arquitectura de frontend      |
| [`docs/13_DESIGN_SYSTEM.md`](docs/13_DESIGN_SYSTEM.md)                       | Sistema de diseño             |
| [`docs/14_INFORMATION_ARCHITECTURE.md`](docs/14_INFORMATION_ARCHITECTURE.md) | Arquitectura de información   |
| [`docs/15_UX_FLOWS.md`](docs/15_UX_FLOWS.md)                                 | Flujos de experiencia (UXF-*) |

## Wireframes y prototipo

| Documento                                                                    | Contenido                                                                 |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [`docs/16_WIREFRAMES_SPECIFICATION.md`](docs/16_WIREFRAMES_SPECIFICATION.md) | Especificación de wireframes                                              |
| [`docs/17_PROTOTYPE_SPECIFICATION.md`](docs/17_PROTOTYPE_SPECIFICATION.md)   | Especificación de prototipo navegable                                     |
| [`docs/18_UI_SPECIFICATION.md`](docs/18_UI_SPECIFICATION.md)                 | Especificación de UI                                                      |
| `docs/frontend/CONTAIA_FUNCTIONAL_PROTOTYPE.md`                              | Prototipo funcional (documento independiente, fuera de la serie numerada) |

## Planes de implementación

| Documento                                                                                        | Contenido                          |
| ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| [`docs/19_FRONTEND_IMPLEMENTATION_PLAN.md`](docs/19_FRONTEND_IMPLEMENTATION_PLAN.md)             | Plan de implementación de frontend |
| [`docs/20_BACKEND_IMPLEMENTATION_PLAN.md`](docs/20_BACKEND_IMPLEMENTATION_PLAN.md)               | Plan de implementación de backend  |
| [`docs/22_INFRASTRUCTURE_IMPLEMENTATION_PLAN.md`](docs/22_INFRASTRUCTURE_IMPLEMENTATION_PLAN.md) | Plan de infraestructura            |
| [`docs/23_TESTING_AND_QA_PLAN.md`](docs/23_TESTING_AND_QA_PLAN.md)                               | Plan de pruebas y QA               |
| [`docs/24_RELEASE_PLAN.md`](docs/24_RELEASE_PLAN.md)                                             | Plan de liberación de versiones    |
| [`docs/25_DEVOPS.md`](docs/25_DEVOPS.md)                                                         | Plan DevOps                        |

## Reservados (marcadores vacíos)

`docs/26_LOCAL_DEVELOPMENT.md` · `docs/27_LEGAL_COMPLIANCE.md` · `docs/28_GLOSSARY.md` · `docs/29_RAG_ARCHITECTURE.md` · `docs/30_TESTING_STRATEGY.md`

## Engineering (EWO)

| Documento                                                                                                                | Contenido                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| [`docs/engineering/EWO-001_FOUNDATION_REPORT.md`](docs/engineering/EWO-001_FOUNDATION_REPORT.md)                         | Cierre EWO-001 — Project Foundation                                                                             |
| [`docs/engineering/EWO-002_AUTH_REPORT.md`](docs/engineering/EWO-002_AUTH_REPORT.md)                                     | Cierre EWO-002 — Authentication & Authorization                                                                 |
| [`docs/engineering/EWO-003_COMPANY_REPORT.md`](docs/engineering/EWO-003_COMPANY_REPORT.md)                               | Cierre EWO-003 — Organization & Company Management                                                              |
| [`docs/engineering/EWO-004_USER_RBAC_REPORT.md`](docs/engineering/EWO-004_USER_RBAC_REPORT.md)                           | Cierre EWO-004 — User, RBAC & Workspace Context                                                                 |
| [`docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md`](docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md)                 | Plan técnico EWO-005 — Documents & Fiscal                                                                       |
| [`docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md`](docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md) | Addendum de arquitectura, Bloque E (AD-*)                                                                       |
| [`docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md`](docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md)           | Checklist tarea por tarea, EWO-005 — la fuente más detallada de "qué se hizo y cómo"                            |
| [`docs/engineering/EWO-SEC-NAV-001_TENANT_ISOLATION_PLAN.md`](docs/engineering/EWO-SEC-NAV-001_TENANT_ISOLATION_PLAN.md) | Plan de corrección EWO-SEC-NAV-001 — `EN PROGRESO`; T01–T04 `PASSED`; D-010/D-011/D-012 `IMPLEMENTADA · PASSED` |

## Auditorías

| Ruta                                                           | Contenido                                                               |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [`docs/engineering/audits/`](docs/engineering/audits/)         | Todas las auditorías finales `READ ONLY` (Codex), una por tarea cerrada |
| `docs/engineering/audits/E5-S1-T10_FINAL_AUDIT.md`             | Cierre de Sprint 1, Bloque E                                            |
| `docs/engineering/audits/E5-S2-T0{1,2,4,5,6,8}_FINAL_AUDIT.md` | Tareas cerradas de Sprint 2, Bloque E                                   |

## Decisiones, preguntas y riesgos (ADR-equivalente)

| Documento                                                                                                                            | Contenido                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| [`brain/DECISIONS.md`](brain/DECISIONS.md)                                                                                           | Registro completo de decisiones arquitectónicas (D-001 a D-008) |
| [`brain/DECISION_INDEX.md`](brain/DECISION_INDEX.md)                                                                                 | Índice rápido de navegación de decisiones                       |
| [`brain/QUESTIONS.md`](brain/QUESTIONS.md)                                                                                           | Preguntas de negocio/ingeniería sin resolver                    |
| [`brain/RISKS.md`](brain/RISKS.md)                                                                                                   | Riesgos arquitectónicos (R-001 a R-012)                         |
| [`brain/IDEAS.md`](brain/IDEAS.md), [`brain/IMPROVEMENTS.md`](brain/IMPROVEMENTS.md), [`brain/COMPETITORS.md`](brain/COMPETITORS.md) | Marcadores vacíos, sin contenido todavía                        |

## Business Rules

| Documento                                                | Contenido                                         |
| -------------------------------------------------------- | ------------------------------------------------- |
| [`docs/04_BUSINESS_RULES.md`](docs/04_BUSINESS_RULES.md) | Todas las `BR-*` (negocio, seguridad, fiscal, IA) |

## Contexto, estado, historial y gobierno documental

| Documento                                                      | Contenido                                                       |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| [`MASTER_CONTEXT.md`](MASTER_CONTEXT.md)                       | Contexto ejecutivo — puerta de entrada                          |
| [`AI_CONTEXT.md`](AI_CONTEXT.md)                               | Estado vivo para continuidad entre sesiones de IA               |
| [`DASHBOARD.md`](DASHBOARD.md)                                 | Tablero ejecutivo de estado por dominio                         |
| [`CHANGELOG.md`](CHANGELOG.md)                                 | Historial cronológico detallado                                 |
| [`AI_PLAYBOOK.md`](AI_PLAYBOOK.md)                             | Roles y protocolo de trabajo entre Claude Code, Codex y ChatGPT |
| [`DOCUMENTATION_STYLE_GUIDE.md`](DOCUMENTATION_STYLE_GUIDE.md) | Estándar oficial de documentación del proyecto                  |
| [`CLAUDE.md`](CLAUDE.md)                                       | Reglas obligatorias para Claude Code en este repositorio        |
| [`README.md`](README.md)                                       | Punto de entrada técnico del monorepo                           |

## Código (no documentación, referencia rápida de carpetas)

| Ruta                                                                          | Contenido                                  |
| ----------------------------------------------------------------------------- | ------------------------------------------ |
| `apps/web/`                                                                   | Frontend Next.js                           |
| `apps/api/`                                                                   | Backend NestJS                             |
| `packages/database/`                                                          | Esquema Prisma, cliente, migraciones, seed |
| `packages/config/`, `packages/validation/`, `packages/types/`, `packages/ui/` | Paquetes compartidos                       |
