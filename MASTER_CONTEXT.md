# MASTER_CONTEXT.md — Contexto Maestro de ContaIA

## Control del documento

| Campo                                    | Valor                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documento                                | `MASTER_CONTEXT.md`                                                                                                                                                                                                                                                                                                                                 |
| Versión                                  | 2.1 — extracción hacia Knowledge Platform                                                                                                                                                                                                                                                                                                           |
| Estado                                   | Vigente — puerta de entrada oficial al proyecto                                                                                                                                                                                                                                                                                                     |
| Fecha de creación                        | 2026-07-18                                                                                                                                                                                                                                                                                                                                          |
| Última actualización                     | 2026-07-30                                                                                                                                                                                                                                                                                                                                          |
| Propietario                              | Alejandro Reyes Bocanegra (Product Owner y Arquitecto de Producto de ContaIA)                                                                                                                                                                                                                                                                       |
| Historial de versiones de este documento | v0.1 (2026-07-18) → v2.0 (2026-07-30, rediseño ejecutivo) → v2.1 (2026-07-30, extracción de estado vivo e índice hacia documentos dedicados) → v2.1, corrección de hallazgos de auditoría (2026-07-30) → v2.1, segunda corrección — §12.3 vuelto completamente atemporal (2026-07-30, mismo día) — ver [§17](#17-qué-cambió-en-esta-reorganización) |

> **Regla de lectura.** Este documento da contexto y enlaza — no repite el contenido completo de ningún documento especializado, ni el estado vivo de la sesión, ni el índice de archivos. Si algo aquí contradice a un documento especializado más reciente, **el documento especializado prevalece**, salvo decisión de alcance de MVP (`docs/01_PRD.md`) o decisión arquitectónica ratificada (`brain/DECISIONS.md`).
>
> **Si llegaste aquí desde una referencia a una sección que ya no coincide** (p. ej. "`MASTER_CONTEXT.md` sección 17" o "§21"): este documento se renumeró dos veces el 2026-07-30. Ve directo a [§16 — Mapeo de numeración](#16-mapeo-de-numeración-histórico).

---

## Índice

1. [ContaIA en 60 segundos](#1-contaia-en-60-segundos)
2. [Cómo navegar este ecosistema documental](#2-cómo-navegar-este-ecosistema-documental)
3. [Estado actual del proyecto](#3-estado-actual-del-proyecto)
4. [Qué es ContaIA](#4-qué-es-contaia)
5. [Principios obligatorios](#5-principios-obligatorios)
6. [Arquitectura y stack tecnológico](#6-arquitectura-y-stack-tecnológico)
7. [Inteligencia artificial](#7-inteligencia-artificial)
8. [Decisiones arquitectónicas](#8-decisiones-arquitectónicas)
9. [Preguntas abiertas](#9-preguntas-abiertas)
10. [Riesgos](#10-riesgos)
11. [Roadmap, alcance por etapas y módulos de largo plazo](#11-roadmap-alcance-por-etapas-y-módulos-de-largo-plazo)
12. [Engineering Workflow — estado de implementación](#12-engineering-workflow--estado-de-implementación)
13. [Definición de terminado](#13-definición-de-terminado)
14. [Glosario mínimo](#14-glosario-mínimo)
15. [Gobierno y mantenimiento de este documento](#15-gobierno-y-mantenimiento-de-este-documento)
16. [Mapeo de numeración histórico](#16-mapeo-de-numeración-histórico)
17. [Qué cambió en esta reorganización](#17-qué-cambió-en-esta-reorganización)
18. [Historial ejecutivo](#18-historial-ejecutivo)

---

## 1. ContaIA en 60 segundos

**Qué es.** ContaIA es una plataforma SaaS mexicana de contabilidad, cumplimiento fiscal e inteligencia artificial: un copiloto para contadores, despachos, empresas y estudiantes que organiza, analiza, automatiza y explica procesos contables y fiscales.

**Qué NO es.** No sustituye el criterio profesional humano, no es una autoridad fiscal, no garantiza cumplimiento automático y no ejecuta ninguna acción fiscal/contable sensible sin aprobación humana explícita (§5).

**En qué etapa está.** Ya no está "en diseño puro": la Etapa 0 (documentación) y buena parte de la Etapa 1 quedaron atrás. El proyecto está en implementación activa del backend fiscal — **EWO-005 (Documents & Fiscal)** — sobre una base ya construida y auditada de fundación técnica, autenticación, multiempresa y RBAC (EWO-001 a EWO-004, todos cerrados). Estado operativo detallado (sprint/tarea activos): [`AI_CONTEXT.md`](AI_CONTEXT.md). Ver §3 y §12.

**Stack real, en uso.** Monorepo pnpm + Turborepo · Next.js 15/React 19 (frontend) · NestJS 10 (backend) · PostgreSQL vía Prisma · Redis + BullMQ (jobs) · MinIO/S3 (documentos). Ver §6.

**Si vas a continuar trabajo de ingeniería ahora mismo:** no sigas leyendo este documento — ve directo a [`AI_CONTEXT.md`](AI_CONTEXT.md). Este documento es contexto; ese es estado.

---

## 2. Cómo navegar este ecosistema documental

ContaIA separa explícitamente **ocho tipos de información**, cada uno con un único documento responsable. No hay una segunda copia de ninguno de estos datos en ningún otro archivo.

| Necesito...                                                                     | Voy a...                                                                                                         | Tipo de información              |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| Entender qué es el proyecto y por qué existe                                    | Este documento (§1, §4)                                                                                          | Contexto (permanente)            |
| Saber en qué se está trabajando _ahora mismo_                                   | [`AI_CONTEXT.md`](AI_CONTEXT.md)                                                                                 | Estado (vivo, cambia por sesión) |
| Ver la salud general del proyecto por dominio (backend, IA, seguridad...)       | [`DASHBOARD.md`](DASHBOARD.md)                                                                                   | Estado (vivo, cambia por hito)   |
| Encontrar en qué archivo vive un tema técnico específico                        | [`PROJECT_INDEX.md`](PROJECT_INDEX.md)                                                                           | Índice                           |
| Ver qué cambió, cuándo y por qué — con todo el detalle                          | [`CHANGELOG.md`](CHANGELOG.md)                                                                                   | Historial                        |
| Entender una decisión arquitectónica ratificada                                 | [`brain/DECISIONS.md`](brain/DECISIONS.md) (índice rápido: [`brain/DECISION_INDEX.md`](brain/DECISION_INDEX.md)) | Decisiones                       |
| Ver qué preguntas de negocio/ingeniería siguen sin resolver                     | [`brain/QUESTIONS.md`](brain/QUESTIONS.md)                                                                       | Preguntas                        |
| Ver riesgos arquitectónicos concretos y su mitigación                           | [`brain/RISKS.md`](brain/RISKS.md)                                                                               | Riesgos                          |
| Leer la arquitectura técnica profunda de un dominio (API, BD, seguridad, IA...) | `docs/05` a `docs/25` (mapa completo en `PROJECT_INDEX.md`)                                                      | Arquitectura                     |
| Saber cómo trabajan Claude Code, Codex y ChatGPT juntos                         | [`AI_PLAYBOOK.md`](AI_PLAYBOOK.md)                                                                               | Protocolo de IA                  |
| Saber cómo se escribe/nombra/versiona un documento en este proyecto             | [`DOCUMENTATION_STYLE_GUIDE.md`](DOCUMENTATION_STYLE_GUIDE.md)                                                   | Estándar documental              |

**Relación entre documentos** (orden de profundidad recomendado, no obligatorio — cada documento enlaza directo a cualquier otro que necesites):

```text
MASTER_CONTEXT.md  (contexto: qué es, por qué, principios)
      │
      ├──► AI_CONTEXT.md      (estado vivo: qué sigue, ahora mismo)
      ├──► DASHBOARD.md       (estado vivo: salud por dominio)
      ├──► PROJECT_INDEX.md   (índice: dónde vive cada cosa)
      │         │
      │         └──► docs/00 a docs/30, docs/engineering/  (arquitectura profunda)
      │
      ├──► CHANGELOG.md              (historial completo)
      ├──► brain/DECISIONS.md        (decisiones, con brain/DECISION_INDEX.md como índice)
      ├──► brain/QUESTIONS.md        (preguntas abiertas)
      ├──► brain/RISKS.md            (riesgos)
      ├──► AI_PLAYBOOK.md            (protocolo entre IA)
      └──► DOCUMENTATION_STYLE_GUIDE.md  (estándar documental)
```

**Prueba de suficiencia:** una IA nueva que lea únicamente `AI_CONTEXT.md` + este documento debe poder continuar el trabajo de ingeniería sin abrir nada más — y si necesita más, sabe exactamente a qué archivo ir por la tabla de arriba, nunca tiene que adivinar ni leer el repositorio completo.

---

## 3. Estado actual del proyecto

ContaIA se ejecuta como una serie de **Engineering Work Orders (EWO)** secuenciales, cada una con su propio informe de cierre en `docs/engineering/`. Cuatro ya cerraron; la quinta está en curso. Vista de salud por dominio (backend, frontend, IA, seguridad...): [`DASHBOARD.md`](DASHBOARD.md). Estado vivo minuto a minuto: [`AI_CONTEXT.md`](AI_CONTEXT.md).

| EWO     | Alcance                                                   | Estado                                                                                                         | Informe                                                                                                                                                                                                                                                                                         |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EWO-001 | Project Foundation — monorepo, CI/CD, calidad             | **DONE**                                                                                                       | [`EWO-001_FOUNDATION_REPORT.md`](docs/engineering/EWO-001_FOUNDATION_REPORT.md)                                                                                                                                                                                                                 |
| EWO-002 | Authentication & Authorization — JWT, MFA/TOTP, RBAC base | **DONE**                                                                                                       | [`EWO-002_AUTH_REPORT.md`](docs/engineering/EWO-002_AUTH_REPORT.md)                                                                                                                                                                                                                             |
| EWO-003 | Organization & Company Management                         | Completo funcionalmente; su bloqueo de infraestructura (migración inicial) se resolvió en el cierre de EWO-004 | [`EWO-003_COMPANY_REPORT.md`](docs/engineering/EWO-003_COMPANY_REPORT.md)                                                                                                                                                                                                                       |
| EWO-004 | User, RBAC & Workspace Context                            | **DONE** (2026-07-22) — migración inicial aplicada, 137/137 pruebas                                            | [`EWO-004_USER_RBAC_REPORT.md`](docs/engineering/EWO-004_USER_RBAC_REPORT.md)                                                                                                                                                                                                                   |
| EWO-005 | Documents & Fiscal (CFDI)                                 | **IN_PROGRESS** — detalle de sprint/tarea en [`AI_CONTEXT.md`](AI_CONTEXT.md)                                  | [`EWO-005_DOCUMENTS_FISCAL_PLAN.md`](docs/engineering/EWO-005_DOCUMENTS_FISCAL_PLAN.md), [`EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md`](docs/engineering/EWO-005_BLOCK_E_ARCHITECTURE_ADDENDUM.md), [`EWO-005_IMPLEMENTATION_CHECKLIST.md`](docs/engineering/EWO-005_IMPLEMENTATION_CHECKLIST.md) |

**Lo que ya existe y funciona hoy:** autenticación completa (login, MFA/TOTP, recuperación de contraseña, sesiones JWT + refresh rotable), multiempresa con Membresías y RBAC granular, gestión de Empresas (perfil fiscal, domicilio, configuración regional), workspace context en el frontend, carga y confirmación de documentos (Bloque A-D de EWO-005), y — en construcción activa — la persistencia atómica del agregado CFDI (Bloque E).

**Lo que todavía no existe:** worker/processor de extracción XML (`XmlProcessingModule`), contabilidad (pólizas, catálogo de cuentas, estados financieros), conciliación, chat contable-fiscal con IA, y todo lo que EWO-006 en adelante deba cubrir. Ver [§11](#11-roadmap-alcance-por-etapas-y-módulos-de-largo-plazo) para el mapa completo de etapas y [§12](#12-engineering-workflow--estado-de-implementación) para el detalle de lo que sí está construido.

**Nota de honestidad documental:** todos los documentos técnicos (`docs/00` a `docs/25`) llevan estado formal `Draft v1.0` / `Borrador` — ninguno tiene un sello de "aprobación final" — pero se usan activamente como fuente de verdad vinculante para la implementación en curso. Este documento refleja esa realidad tal cual es.

---

## 4. Qué es ContaIA

Contenido completo y autoritativo en [`docs/00_PRODUCT_VISION.md`](docs/00_PRODUCT_VISION.md) (visión de producto) y [`docs/01_PRD.md`](docs/01_PRD.md) (alcance del MVP, única autoridad sobre qué entra y qué no). Esta sección es un resumen de orientación, no la fuente.

- **Propuesta central:** copiloto inteligente para contadores, despachos, empresas y estudiantes; organiza, analiza, automatiza y explica procesos contables y fiscales de forma clara, verificable y segura.
- **Diferenciador:** no es "una IA que contesta preguntas fiscales" — es un sistema que muestra fuentes, versiones y vigencias, separa cálculo determinístico de interpretación de IA, y deja siempre un rastro de auditoría revisable por un humano.
- **Usuarios (10 perfiles, detalle completo en [`docs/02_USER_PERSONAS.md`](docs/02_USER_PERSONAS.md)):** Contador independiente, Despacho contable, Empresa/negocio, Director financiero, Auxiliar contable, Auditor, Asesor fiscal, Estudiante de contaduría, Administrador interno de ContaIA, Especialista humano revisor. `docs/01_PRD.md` §6 prioriza un subconjunto para el ciclo de valor del MVP.
- **Problema que ataca:** captura manual repetitiva, desorganización documental, dificultad para interpretar CFDI/XML, información fiscal dispersa, riesgo de respuestas de IA sin fundamento, falta de trazabilidad. Lista completa en `docs/00_PRODUCT_VISION.md`.
- **Límites explícitos — ContaIA NO debe:** actuar como autoridad fiscal · garantizar cumplimiento automático · sustituir asesoría profesional personalizada · enviar declaraciones sin aprobación · timbrar CFDI sin integración autorizada · almacenar contraseñas o e.firma de forma insegura · simular conexión real con el SAT · presentar cálculos no validados como definitivos · mezclar información entre Empresas · entrenar modelos con datos privados sin autorización · ejecutar acciones destructivas sin confirmación.
- **UX/UI, modelo de negocio e indicadores de éxito:** todavía `Propuesta pendiente de validación`, sin decisión ratificada ni documento técnico dedicado. Texto original íntegro preservado en [`CHANGELOG.md`](CHANGELOG.md) → "Contenido preliminar de producto".

---

## 5. Principios obligatorios

Diez principios, todos con `Estado: Aprobado como principio inicial`. Se citan por número (`principio 10.4`, etc.) desde `brain/DECISIONS.md`, `docs/01_PRD.md` y varios documentos técnicos — **no renumerar**.

| #     | Principio                | Resumen                                                                                                     |
| ----- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 10.1  | Confiabilidad            | Exactitud, validación, trazabilidad y evidencia en todo cálculo o dato presentado.                          |
| 10.2  | Revisión humana          | Ninguna acción fiscal/contable/legal/financiera sensible se ejecuta sin punto de control humano.            |
| 10.3  | IA con fundamentos       | Toda respuesta especializada muestra fuente, vigencia y ejercicio fiscal, o declara ausencia de fundamento. |
| 10.4  | Cálculos determinísticos | La IA nunca calcula cifras fiscales/contables críticas — eso lo hacen motores de reglas verificables.       |
| 10.5  | Versionado normativo     | Toda información fiscal/legal se identifica por periodo y vigencia (vigente vs. histórica).                 |
| 10.6  | Seguridad y privacidad   | Aislamiento entre Empresas, roles, MFA, cifrado, auditoría, mínimos privilegios desde el diseño.            |
| 10.7  | Simplicidad              | Lenguaje claro, procesos guiados, diseño limpio, accesible, consistente.                                    |
| 10.8  | Trazabilidad             | Toda acción importante registra usuario, Empresa, fecha, resultado, versión de reglas y aprobaciones.       |
| 10.9  | Modularidad              | MVP como monolito modular; migración a servicios separados solo con razón operativa concreta.               |
| 10.10 | Honestidad de la IA      | La IA reconoce cuando no sabe; nunca inventa fundamentos ni finge certeza.                                  |

---

## 6. Arquitectura y stack tecnológico

Fuente completa: [`docs/07_SOFTWARE_ARCHITECTURE.md`](docs/07_SOFTWARE_ARCHITECTURE.md) (arquitectura), [`docs/09_DATABASE_DESIGN.md`](docs/09_DATABASE_DESIGN.md) (base de datos), [`docs/08_API_DESIGN.md`](docs/08_API_DESIGN.md) (API), [`docs/11_SECURITY_ARCHITECTURE.md`](docs/11_SECURITY_ARCHITECTURE.md) (seguridad), [`docs/12_FRONTEND_ARCHITECTURE.md`](docs/12_FRONTEND_ARCHITECTURE.md) (frontend).

| Capa                                | Tecnología real, en uso hoy                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Monorepo                            | pnpm workspaces + Turborepo                                                                                                    |
| Frontend (`apps/web`)               | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, TanStack Query, React Hook Form, Zod, Zustand                     |
| Backend (`apps/api`)                | NestJS 10, TypeScript, REST + Swagger/OpenAPI, class-validator/class-transformer                                               |
| Base de datos (`packages/database`) | PostgreSQL vía Prisma ORM                                                                                                      |
| Cache / colas                       | Redis (ioredis) + BullMQ (en uso funcional desde EWO-005 Bloque D)                                                             |
| Almacenamiento de objetos           | MinIO local (compatible S3), `@aws-sdk/client-s3`                                                                              |
| Calidad                             | ESLint (flat config), Prettier, Jest (backend), Vitest (frontend/paquetes), Husky + lint-staged, Commitlint, CI GitHub Actions |
| Autenticación                       | JWT de acceso + refresh token rotable, Argon2id, TOTP (MFA), CSRF de doble cookie                                              |

**Principio arquitectónico rector:** monolito modular (principio 10.9) — sin microservicios hasta que exista una razón operativa concreta. Multi-tenancy vía patrón Membresía (`Company` ↔ `User` vía `Membership`, D-002), nunca por base de datos separada por Empresa.

---

## 7. Inteligencia artificial

Fuente completa: [`docs/10_AI_ARCHITECTURE.md`](docs/10_AI_ARCHITECTURE.md) (orquestación, RAG, seguridad) y [`docs/01_PRD.md`](docs/01_PRD.md) §10 (alcance del MVP). Los 11 perfiles de abajo son la fuente canónica citada por nombre desde `docs/10_AI_ARCHITECTURE.md` ("`MASTER_CONTEXT.md` 13.1", etc., numeración histórica — ver [§16](#16-mapeo-de-numeración-histórico)) — no renombrar los agentes sin actualizar esa referencia cruzada.

**Alcance del MVP:** de los 11 agentes definidos, **solo 4 están activos en el MVP** (`docs/01_PRD.md` §10): Agente Contable, Agente Fiscal, Agente de CFDI y XML, y Agente Supervisor de Calidad y Fuentes. Los otros 7 quedan documentados pero diferidos.

| Agente                          | Estado MVP | Propósito                                                       | Prohibiciones clave                                                                                |
| ------------------------------- | ---------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Contable                        | **Activo** | Clasificar, explicar y proponer sobre información contable      | Nunca contabiliza automáticamente ni modifica registros validados                                  |
| Fiscal                          | **Activo** | Interpretar y organizar obligaciones fiscales con fuente citada | Nunca presenta declaraciones ni garantiza cumplimiento                                             |
| CFDI y XML                      | **Activo** | Extraer y validar estructuralmente comprobantes                 | Nunca timbra ni simula validación oficial ante el SAT                                              |
| Supervisor de Calidad y Fuentes | **Activo** | Vigilar que otros agentes citen fuente/vigencia                 | Nunca genera contenido sustantivo propio ni aprueba de forma autónoma una respuesta de alto riesgo |
| NIF                             | Diferido   | Interpretar Normas de Información Financiera                    | No reproduce contenido protegido del CINIF                                                         |
| Auditoría                       | Diferido   | Apoyar revisión de consistencia y evidencia                     | No emite opinión de auditoría formal                                                               |
| Financiero y empresarial        | Diferido   | Interpretar indicadores financieros ya calculados               | No calcula indicadores fuera de motores determinísticos                                            |
| Nómina                          | Diferido   | Organizar e interpretar información de nómina                   | No calcula percepciones/deducciones/cuotas                                                         |
| Jurídico corporativo            | Diferido   | Apoyar en aspectos societarios generales                        | No redacta documentos legales definitivos sin abogado                                              |
| Educativo                       | Diferido   | Apoyar el aprendizaje con ejemplos y ejercicios                 | No usa datos reales de una Empresa como material educativo                                         |
| Soporte                         | Diferido   | Ayudar a usar la plataforma                                     | No da asesoría contable/fiscal/legal sustantiva                                                    |

Todos los agentes están sujetos a los principios 10.2, 10.3, 10.4 y 10.10 (§5) sin excepción.

**Política de conocimiento (`knowledge/`).** Clasificación de fuentes: oficiales, autorizadas, internas, académicas, jurisprudenciales, criterios orientativos, casos prácticos, no verificadas. Metadatos mínimos por documento: título, institución, tipo, fecha de publicación/consulta/vigencia, ejercicio fiscal, versión, procedencia, estatus de validación, derechos de uso, responsable de revisión, hash de integridad. Fuentes prioritarias: Diario Oficial de la Federación, Cámara de Diputados, SAT, PRODECON, SCJN, TFJA, IMSS, INFONAVIT, Secretaría del Trabajo, Secretaría de Economía, CINIF — siempre respetando licencias. **No se copian ni distribuyen documentos protegidos sin autorización.** `docs/28_GLOSSARY.md`/`knowledge/` todavía no implementan esto en código — es política, no un sistema construido.

---

## 8. Decisiones arquitectónicas

Índice de navegación rápida (ID, título, estado, fecha, documento relacionado): [`brain/DECISION_INDEX.md`](brain/DECISION_INDEX.md). Registro completo con contexto, alternativas y consecuencias: [`brain/DECISIONS.md`](brain/DECISIONS.md). Toda decisión nueva se registra ahí — nunca en este documento.

Las dos decisiones más relevantes para el trabajo activo hoy:

| ID    | Decisión                                                                               | Estatus                                                                       |
| ----- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| D-007 | Estrategia de concurrencia y persistencia atómica del agregado CFDI (EWO-005 Bloque E) | **ACEPTADA**, ratificada 2026-07-25 — rige toda la Transacción A del Bloque E |
| D-008 | Recuperación de `E5-S1-T07` mediante migración correctiva versionada                   | **ACEPTADA**                                                                  |

---

## 9. Preguntas abiertas

### Preguntas de ingeniería (bloquean una tarea concreta)

Registro completo: [`brain/QUESTIONS.md`](brain/QUESTIONS.md).

| ID    | Pregunta                                                                                                       | Bloquea                                                                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-001 | ¿Qué debe ocurrir cuando se carga un CFDI cuyo folio fiscal ya pertenece a OTRO documento de la misma Empresa? | Clasificación final de errores AD-10.2/AD-11 en EWO-005 Bloque E; el worker no puede rechazar automáticamente por duplicado hasta resolverla |

### Preguntas estratégicas (nivel producto, sin dueño de tarea específico)

Del `MASTER_CONTEXT.md` original (2026-07-18). Estado re-evaluado el 2026-07-30 contra la evidencia documental actual — no todas siguen abiertas:

| #   | Pregunta                                                               | Estado observado                                                                                                                        |
| --- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ¿Se confirma la misión redactada, o se ajusta?                         | Sin confirmación formal registrada — sigue abierta                                                                                      |
| 2   | ¿Alcance definitivo del MVP?                                           | **Resuelta** — `docs/01_PRD.md` §3-9 lo define con precisión (incluye exclusiones explícitas)                                           |
| 3   | ¿Se confirma el stack técnico preliminar?                              | **Resuelta en la práctica** — el stack de §6 está implementado y en uso desde EWO-001                                                   |
| 4   | ¿Qué ORM sobre PostgreSQL?                                             | **Resuelta** — Prisma, en uso desde EWO-001                                                                                             |
| 5   | ¿Qué proveedor(es) de IA para la capa de abstracción?                  | Arquitectura de abstracción decidida (`docs/10_AI_ARCHITECTURE.md`, AD-05); proveedor(es) específico(s) sin confirmar públicamente aquí |
| 6   | ¿Planes y precios definitivos del modelo de negocio?                   | Sigue abierta — sin definición                                                                                                          |
| 7   | ¿Cuándo se justifica migrar de monolito modular a servicios separados? | Sigue abierta — sin umbral definido                                                                                                     |
| 8   | ¿Quién valida el contenido cargado en `knowledge/`?                    | Sigue abierta — `knowledge/` no implementado todavía                                                                                    |
| 9   | ¿Cuándo y con qué PAC se aborda la integración fiscal de la Etapa 4?   | Sigue abierta — Etapa 4 no iniciada                                                                                                     |

---

## 10. Riesgos

### Riesgos de producto y negocio

Los 11 más relevantes hoy. Tabla íntegra original (17 riesgos): [`CHANGELOG.md`](CHANGELOG.md) → "Contenido preliminar de producto".

| Riesgo                                      | Mitigación preliminar                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| Errores fiscales                            | Separar cálculo determinístico de interpretación de IA; revisión humana obligatoria |
| Información desactualizada                  | Versionado normativo obligatorio (principio 10.5)                                   |
| Respuestas inventadas                       | Honestidad de la IA (10.10) + Agente Supervisor de Calidad y Fuentes                |
| Filtración de datos entre Empresas          | Aislamiento estricto (`BR-GLB-001`), cifrado, mínimos privilegios, auditoría        |
| Uso indebido de e.firma                     | Prohibición explícita de almacenamiento inseguro (§4)                               |
| Dependencia de un solo proveedor de IA      | Capa de abstracción de proveedores                                                  |
| Costos elevados de IA                       | Métricas de costo por usuario; calculadoras determinísticas                         |
| Complejidad/crecimiento prematuro           | Monolito modular (10.9); migración solo con razón operativa concreta                |
| Incumplimiento de licencias de conocimiento | Política de clasificación de fuentes y derechos de uso                              |
| Falta de validación profesional             | Revisión humana obligatoria (10.2) en toda acción sensible                          |
| Cambios normativos                          | Versionado normativo; distinción vigente/histórica                                  |

### Riesgos arquitectónicos activos (EWO-005 Bloque E)

Catálogo completo con probabilidad/impacto/estado: [`brain/RISKS.md`](brain/RISKS.md) (R-001 a R-012). Los más relevantes hoy:

| ID    | Riesgo                                                                                | Estado                                                                                    |
| ----- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| R-005 | Política de folio duplicado no definida — el worker no puede rechazar automáticamente | **Abierto** — depende de Q-001                                                            |
| R-010 | Pérdida de efectos externos post-commit (sin outbox transaccional)                    | **Abierto** — aceptado como post-MVP, revisar cuando exista un consumidor real del evento |
| R-001 | Corrupción silenciosa del agregado CFDI (mezcla entre workers)                        | Mitigado por diseño (D-007), pendiente de verificación en integración (`E5-S2-T10`)       |

---

## 11. Roadmap, alcance por etapas y módulos de largo plazo

`docs/03_ROADMAP.md` es hoy un marcador vacío — esta sección es la fuente de facto hasta que se formalice ahí. Alcance definitivo de cada etapa (especialmente la Etapa 2/MVP): autoridad de `docs/01_PRD.md`.

### 11.1 Etapas

| Etapa                       | Contenido                                                                                                                                                             | Estado                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 0 — Documentación y diseño  | Visión, PRD, reglas de negocio, arquitectura, UX/UI, BD, seguridad, IA, pruebas                                                                                       | Sustancialmente completa (docs/00-25 existen, en `Draft v1.0`)                                                  |
| 1 — Prototipo visual        | Landing, login simulado, dashboard, navegación, empresas, asistente IA visual                                                                                         | Parcialmente superada por implementación real (EWO-001 a EWO-004)                                               |
| 2 — MVP funcional           | Usuarios/auth/roles/empresas · XML CFDI · organización documental · catálogo/pólizas · balanza/EF básicos · chat contable-fiscal · calculadoras · historial/auditoría | **En curso** — EWO-001 a EWO-004 cerrados; EWO-005 (CFDI) en curso, detalle en [`AI_CONTEXT.md`](AI_CONTEXT.md) |
| 3 — Automatización contable | Clasificación, pólizas sugeridas, conciliaciones, reglas recurrentes                                                                                                  | No iniciada                                                                                                     |
| 4 — Integraciones fiscales  | PAC autorizado, descarga masiva SAT, declaraciones asistidas                                                                                                          | No iniciada — bloqueada además por pregunta 9 (§9)                                                              |
| 5 — Gestión empresarial     | Inventarios, activos, nómina, tesorería, presupuestos                                                                                                                 | No iniciada                                                                                                     |
| 6 — Expansión               | API pública, app móvil, marketplace, integraciones bancarias                                                                                                          | No iniciada                                                                                                     |

### 11.2 Módulos de largo plazo

Visión de largo plazo (principio: no todos entran al MVP — `docs/01_PRD.md` decide el alcance real de cada etapa):

- **Núcleo y administración:** autenticación y seguridad · usuarios/equipos/roles/permisos · administración multiempresa · expediente fiscal y empresarial · panel administrativo interno.
- **Terceros y catálogos:** clientes y proveedores · catálogo de cuentas.
- **Contabilidad:** pólizas contables · auxiliares · balanza de comprobación · estados financieros · papeles de trabajo.
- **Documentos fiscales:** carga y análisis de XML · repositorio de CFDI · conciliación bancaria · conciliación CFDI-contabilidad.
- **Finanzas operativas:** cuentas por cobrar/pagar · bancos y tesorería · inventarios · activos fijos · nómina · presupuestos · flujo de efectivo.
- **Análisis y control:** indicadores financieros · auditoría · reportes · alertas · automatizaciones.
- **Conocimiento e IA:** centro de conocimiento · agentes de inteligencia artificial (§7).
- **Futuro:** marketplace de especialistas — fase futura únicamente.

---

## 12. Engineering Workflow — estado de implementación

### 12.1 Resumen por EWO

Ver tabla completa en [§3](#3-estado-actual-del-proyecto). Esta sección resume únicamente la EWO **activa**, sin repetir su estado detallado por tarea — ese estado vivo tiene una única fuente cada uno: [`AI_CONTEXT.md`](AI_CONTEXT.md) (minuto a minuto) y el checklist del EWO activo (detalle por tarea). Las EWO cerradas no se re-detallan aquí — su informe de cierre es la fuente completa.

### 12.2 EWO-005 — Bloque E, Sprint 1 (cerrado)

**`COMPLETADO`.** `E5-S1-T01` a `E5-S1-T10` → `PASSED`. Auditoría final independiente: [`E5-S1-T10_FINAL_AUDIT.md`](docs/engineering/audits/E5-S1-T10_FINAL_AUDIT.md). Entregó: modelos `CfdiConcept`/`CfdiTax`, CHECK `cfdi_taxes_scope_concept_check`, FKs compuestas tenant-safe, migraciones aplicadas y verificadas contra PostgreSQL real, procedimiento de rollback documentado y auditado.

### 12.3 Estado operativo del Sprint activo

**El estado operativo del proyecto se mantiene exclusivamente en [`AI_CONTEXT.md`](AI_CONTEXT.md).** `MASTER_CONTEXT.md` conserva únicamente el contexto ejecutivo — nunca la EWO activa, el bloque/sprint activo, el estado general, la última tarea, el siguiente hito ni el estado de ninguna auditoría. Ninguno de esos datos vive aquí, en ninguna forma ni formato.

Para conocer el estado actual, consultar:

- [`AI_CONTEXT.md`](AI_CONTEXT.md) — estado vivo, minuto a minuto.
- El checklist de implementación de la EWO activa — su nombre exacto de archivo está en la columna "Informe" de la fila marcada `IN_PROGRESS` en [§3](#3-estado-actual-del-proyecto) — para el detalle por tarea.

### 12.4 Convención de cierre de tarea (aplica a toda tarea de todo EWO)

`BLOCKED` → implementación → `READY_FOR_AUDIT` → auditoría independiente `READ ONLY` (Codex) → `PASSED` (con `docs/engineering/audits/<tarea>_FINAL_AUDIT.md`) → habilita la siguiente tarea. Ninguna tarea se autocertifica `PASSED` sin esa auditoría independiente. Protocolo completo entre roles de IA: [`AI_PLAYBOOK.md`](AI_PLAYBOOK.md).

---

## 13. Definición de terminado

Citada activamente desde otros documentos (p. ej. `docs/11_SECURITY_ARCHITECTURE.md`, `docs/01_PRD.md`) — **mantener esta sección localizable, no mover a un archivo secundario**.

Una funcionalidad no se considera terminada solo porque su interfaz aparezca. Debe cumplir, según corresponda: requisito documentado · diseño aprobado · código revisado · pruebas · validación de seguridad · manejo de errores · permisos · auditoría · documentación · accesibilidad · rendimiento · observabilidad · revisión contable o fiscal · aprobación del propietario del producto.

`Estado: Aprobado como principio inicial`

---

## 14. Glosario mínimo

Cubre solo el lenguaje usado en este documento. No es fuente fiscal/contable/legal — para eso, `knowledge/` (no implementado todavía) y `docs/28_GLOSSARY.md` (reservado, sin contenido).

- **SaaS:** software como servicio, entregado y operado en la nube.
- **MVP:** producto mínimo viable, primera versión funcional con el menor alcance útil.
- **CFDI:** comprobante fiscal digital por internet.
- **XML:** formato estructurado en que se emiten los CFDI.
- **PAC:** proveedor autorizado de certificación (integración futura, Etapa 4).
- **RAG:** recuperación aumentada por generación, para fundamentar respuestas de IA en fuentes.
- **NIF:** Normas de Información Financiera.
- **Monorepo:** repositorio único con múltiples aplicaciones/paquetes.
- **Motor determinístico:** componente que produce siempre el mismo resultado ante las mismas entradas — usado para cálculos fiscales/contables críticos.
- **EWO:** Engineering Work Order — unidad de trabajo de ingeniería con informe de cierre propio.
- **Bloque / Sprint / Tarea:** subdivisión interna de una EWO grande (hoy solo EWO-005 la usa); una tarea es la unidad auditable mínima.
- **Knowledge Platform:** el conjunto de `MASTER_CONTEXT.md` + `AI_CONTEXT.md` + `PROJECT_INDEX.md` + `DASHBOARD.md` + `CHANGELOG.md` + `brain/` + `AI_PLAYBOOK.md` + `DOCUMENTATION_STYLE_GUIDE.md` — la arquitectura documental completa del proyecto, ver §2.

---

## 15. Gobierno y mantenimiento de este documento

**Dónde documentar qué (sin excepción):**

| Tipo de información                                                | Vive en                                                  |
| ------------------------------------------------------------------ | -------------------------------------------------------- |
| Estado vivo de la sesión de ingeniería                             | `AI_CONTEXT.md`                                          |
| Salud del proyecto por dominio técnico                             | `DASHBOARD.md`                                           |
| Ubicación de cualquier documento                                   | `PROJECT_INDEX.md`                                       |
| Decisión técnica ratificada                                        | `brain/DECISIONS.md` (índice: `brain/DECISION_INDEX.md`) |
| Pregunta de negocio o ingeniería sin resolver                      | `brain/QUESTIONS.md`                                     |
| Riesgo arquitectónico concreto                                     | `brain/RISKS.md`                                         |
| Idea sin aprobar / mejora futura                                   | `brain/IDEAS.md` / `brain/IMPROVEMENTS.md`               |
| Cambio técnico, cierre de tarea, corrección — **detalle completo** | `CHANGELOG.md`                                           |
| Hito mayor (cierre de EWO/Sprint/decisión) — **una línea**         | Este documento, [§18](#18-historial-ejecutivo)           |
| Detalle de una tarea de ingeniería específica                      | `docs/engineering/<EWO>_IMPLEMENTATION_CHECKLIST.md`     |
| Auditoría final de una tarea                                       | `docs/engineering/audits/<tarea>_FINAL_AUDIT.md`         |
| Cómo trabajan Claude Code / Codex / ChatGPT juntos                 | `AI_PLAYBOOK.md`                                         |
| Cómo se nombra/versiona/formatea un documento nuevo                | `DOCUMENTATION_STYLE_GUIDE.md`                           |

**Reglas para que este documento no vuelva a crecer sin control:**

1. **Nunca pegar contenido completo de otro documento aquí.** Si una sección empieza a superar ~15-20 líneas de prosa, pertenece a un documento especializado — mover el detalle allá (o a `CHANGELOG.md` si es contenido preliminar sin dueño todavía) y dejar un resumen + enlace real. **Verificar que el enlace exista de verdad antes de escribir "preservado en X".**
2. **El historial jamás vuelve a esta página.** [§18](#18-historial-ejecutivo) admite como máximo una fila por hito mayor — nunca una fila por tarea individual.
3. **[§12.3](#12-engineering-workflow--estado-de-implementación) es un bloque atemporal — nunca contiene EWO activa, sprint/bloque activo, estado, última tarea ni siguiente hito.** Al cerrar EWO-005 e iniciar EWO-006, solo la fila de [§3](#3-estado-actual-del-proyecto) cambia (nueva EWO, nuevo informe enlazado); §12.3 no requiere ninguna edición porque ya no contiene ningún dato específico de la EWO activa.
4. **Ninguna tabla de estado vivo se mantiene aquí.** Si sientes la tentación de agregar una columna "estado actual" a alguna tabla de este documento, esa información va a `AI_CONTEXT.md` o `DASHBOARD.md`, no aquí — este documento es contexto, no estado.
5. **Si renumeras secciones, actualiza [§16](#16-mapeo-de-numeración-histórico) en el mismo cambio.**
6. **Antes de agregar una sección nueva, preguntar: ¿esto ya tiene un documento dedicado?** Si sí, no duplicar — enlazar desde [§2](#2-cómo-navegar-este-ecosistema-documental).
7. **Revisión periódica sugerida:** al cierre de cada EWO, verificar que §2, §3, §8, §9, §10 y §12 siguen reflejando la realidad.
8. **Separación operativa explícita (corrección de auditoría, 2026-07-30):** `AI_CONTEXT.md` es la única fuente viva de continuidad entre sesiones; el checklist activo de cada EWO es la única fuente detallada de estado por tarea; este documento es un **resumen ejecutivo** — nunca la fuente operativa detallada de ninguno de los dos. Si una edición futura a este documento empieza a repetir un dato que cambia sesión a sesión, es señal de que ese dato pertenece a `AI_CONTEXT.md`, no aquí.

---

## 16. Mapeo de numeración histórico

> **Deuda documental conocida, parcialmente resuelta.** Este documento se renumeró dos veces el 2026-07-30: v0.1→v2.0 (rediseño ejecutivo) y v2.0→v2.1 (extracción hacia `AI_CONTEXT.md`/`PROJECT_INDEX.md`, esta versión). Al menos 45 referencias cruzadas en `docs/*.md` citan numeración de v0.1 (nunca llegaron a citar v2.0, que existió menos de un día) — no se corrigieron una por una, ver razón en §17. Esta tabla resuelve cualquier referencia antigua directamente a su ubicación en v2.1.

| Sección en v0.1 (original) | Título original                        | Dónde vive en v2.1 (hoy)                                                                     |
| -------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------- |
| §3                         | Resumen ejecutivo                      | [§1](#1-contaia-en-60-segundos)                                                              |
| §4                         | Identidad del producto                 | [§4](#4-qué-es-contaia)                                                                      |
| §5                         | Visión                                 | [§4](#4-qué-es-contaia) / `docs/00_PRODUCT_VISION.md`                                        |
| §6                         | Misión                                 | `docs/00_PRODUCT_VISION.md`                                                                  |
| §7                         | Propuesta de valor                     | [§4](#4-qué-es-contaia)                                                                      |
| §8                         | Usuarios principales                   | [§4](#4-qué-es-contaia) / `docs/02_USER_PERSONAS.md`                                         |
| §9                         | Problemas que busca resolver           | [§4](#4-qué-es-contaia) / `docs/00_PRODUCT_VISION.md`                                        |
| §10                        | Principios obligatorios                | [§5](#5-principios-obligatorios) — subnumeración 10.1-10.10 sin cambio                       |
| §11                        | Alcance general futuro                 | [§11.2](#112-módulos-de-largo-plazo)                                                         |
| §12                        | Módulos                                | [§11.2](#112-módulos-de-largo-plazo)                                                         |
| §13                        | Agentes de inteligencia artificial     | [§7](#7-inteligencia-artificial) — subnumeración 13.1-13.11 citada externamente, no resuelta |
| §14                        | Política de conocimiento               | [§7](#7-inteligencia-artificial) (final de la sección)                                       |
| §15                        | Límites del producto                   | [§4](#4-qué-es-contaia)                                                                      |
| §16                        | Estrategia inicial del producto        | [§11.1](#111-etapas)                                                                         |
| §17                        | Arquitectura técnica preliminar        | [§6](#6-arquitectura-y-stack-tecnológico)                                                    |
| §18                        | Experiencia de usuario (UX/UI)         | `CHANGELOG.md` → "Contenido preliminar de producto"                                          |
| §19                        | Modelo de negocio preliminar           | `CHANGELOG.md` → "Contenido preliminar de producto"                                          |
| §20                        | Indicadores de éxito preliminares      | `CHANGELOG.md` → "Contenido preliminar de producto"                                          |
| §21                        | Riesgos principales                    | [§10](#10-riesgos) (11 de 17) / `CHANGELOG.md` (tabla completa)                              |
| §22                        | Gobierno del proyecto                  | [§15](#15-gobierno-y-mantenimiento-de-este-documento)                                        |
| §23                        | Definición de terminado                | [§13](#13-definición-de-terminado)                                                           |
| §24                        | Glosario inicial                       | [§14](#14-glosario-mínimo)                                                                   |
| §25                        | Preguntas pendientes                   | [§9](#9-preguntas-abiertas)                                                                  |
| §26                        | Historial de cambios                   | `CHANGELOG.md` → "Historial detallado (tabla completa)"                                      |
| §27                        | Historial de reorganización documental | `CHANGELOG.md` → "Historial de reorganización documental"                                    |

**Recomendación de seguimiento sin cambios:** sigue pendiente crear `docs/00_DOCUMENTATION_INDEX.md` (mencionado desde `docs/19_FRONTEND_IMPLEMENTATION_PLAN.md`) y usar esa sesión para corregir las ~45 referencias de una vez.

---

## 17. Qué cambió en esta reorganización

### Segunda corrección de hallazgos de auditoría (2026-07-30, mismo día)

Segunda auditoría `READ ONLY` (Codex) tras la primera corrección: veredicto con 3 hallazgos restantes, ninguno `ALTO` resuelto del todo. Corrección aplicada por Claude Code en modo `CORRECCIÓN MÍNIMA DE HALLAZGOS`:

- **§12.3 seguía siendo una tabla operativa editable (ALTO):** aunque ya no listaba tareas individuales, seguía repitiendo EWO activa/bloque-sprint/estado/última tarea/siguiente hito — los mismos 5 campos que `AI_CONTEXT.md`. Sustituida por un bloque puramente atemporal, sin ningún dato vivo, que solo remite a `AI_CONTEXT.md` y al checklist activo (localizado dinámicamente vía la fila `IN_PROGRESS` de [§3](#3-estado-actual-del-proyecto), sin nombrar la EWO por hardcode). También se quitó la mención a "Bloque E, Sprint 2" de [§1](#1-contaia-en-60-segundos) y de la tabla de [§3](#3-estado-actual-del-proyecto) — ambas mencionaban sprint activo, dato igualmente prohibido fuera de `AI_CONTEXT.md`.
- **Referencias numéricas nuevas en `PROJECT_INDEX.md` y `brain/DECISION_INDEX.md` (MEDIO):** corregidas a enlaces de título/ancla — incluía una referencia a §9 (Preguntas abiertas) donde el texto pedía un "mapa completo del proyecto", que en realidad es [§2](#2-cómo-navegar-este-ecosistema-documental).
- **`AI_PLAYBOOK.md` implicaba que el protocolo actual siempre existió (MEDIO):** se agregó la sección "Vigencia de este protocolo", que fija la adopción oficial en 2026-07-30 y aclara que auditorías anteriores a esa fecha pueden reflejar procedimientos distintos, sin reinterpretar ni corregir esos registros históricos.

No se modificó código, pruebas, arquitectura técnica, decisiones, preguntas, riesgos ni auditorías históricas. No se creó ningún documento nuevo. Listo para una reauditoría `READ ONLY` final.

### Corrección de hallazgos de auditoría (2026-07-30, mismo día)

Auditoría `READ ONLY` independiente (Codex) sobre la Knowledge Platform v1.0 emitió veredicto `FAILED` con 4 hallazgos. Corrección aplicada por Claude Code, en modo `CORRECCIÓN CONTROLADA DE HALLAZGOS` (sin rediseñar la arquitectura ni tocar código):

- **Duplicación de estado vivo (ALTO):** se eliminó de [§12.3](#12-engineering-workflow--estado-de-implementación) la tabla detallada por tarea (objetivo/estado/auditoría de cada una) — duplicaba `AI_CONTEXT.md` y el checklist activo. §12.3 quedó como resumen ejecutivo (EWO, bloque/sprint, estado general, última tarea cerrada, siguiente hito), con enlaces explícitos a las dos únicas fuentes operativas detalladas. Se agregó la regla 8 de [§15](#15-gobierno-y-mantenimiento-de-este-documento) declarando esta separación sin ambigüedad.
- **Referencias numéricas rotas (MEDIO):** corregidas en `AI_CONTEXT.md`, `DASHBOARD.md`, `AI_PLAYBOOK.md` y `DOCUMENTATION_STYLE_GUIDE.md` — incluía una referencia a una sección §19 inexistente en este documento (solo tiene 18). Sustituidas por enlaces Markdown a título/ancla estable, según la propia regla de [`DOCUMENTATION_STYLE_GUIDE.md`](DOCUMENTATION_STYLE_GUIDE.md) §5.
- **Atribución incorrecta en el protocolo de auditoría (MEDIO):** `AI_PLAYBOOK.md` y `DOCUMENTATION_STYLE_GUIDE.md` implicaban que Codex (auditor `READ ONLY`) crea el archivo `_FINAL_AUDIT.md`. Corregido: Codex solo emite el veredicto; Claude Code crea ese archivo durante el cierre administrativo autorizado.
- **Reorganización no registrada en `CHANGELOG.md` (BAJO):** agregada una entrada ejecutiva única, fechada 2026-07-30, cubriendo la creación de la Knowledge Platform y esta corrección.

No se modificó código, pruebas, arquitectura técnica, decisiones, preguntas ni riesgos. Listo para reauditoría `READ ONLY`.

### v2.1 (2026-07-30, extracción hacia Knowledge Platform)

- **Se creó un ecosistema documental nuevo de 6 archivos:** [`AI_CONTEXT.md`](AI_CONTEXT.md), [`PROJECT_INDEX.md`](PROJECT_INDEX.md), [`DASHBOARD.md`](DASHBOARD.md), [`brain/DECISION_INDEX.md`](brain/DECISION_INDEX.md), [`AI_PLAYBOOK.md`](AI_PLAYBOOK.md), [`DOCUMENTATION_STYLE_GUIDE.md`](DOCUMENTATION_STYLE_GUIDE.md) — ninguno existía antes de hoy.
- **Se extrajo, sin duplicar:** la sección "Estado para IA" (v2.0 §2) se movió íntegra a `AI_CONTEXT.md`; la sección "Mapa documental" (v2.0 §8) se movió íntegra a `PROJECT_INDEX.md`. En ambos casos, esta sección quedó como un puntero de una línea — el dato vive en un único lugar.
- **Se delegó la tabla de Decisiones** (v2.0 §9, 9 filas completas) a `brain/DECISION_INDEX.md`, que ahora es su única fuente; este documento conserva solo las 2 decisiones más relevantes para el trabajo activo.
- **Se agregó** [§2 (Cómo navegar)](#2-cómo-navegar-este-ecosistema-documental) — el diagrama explícito de relación entre los 8 tipos de información, pedido explícitamente para que la arquitectura documental sea legible sin tener que inferirla.
- **No se eliminó ninguna decisión, pregunta, riesgo ni dato de estado** — todo lo que salió de este documento tiene una ubicación nueva verificable, listada arriba.
- **Limitación conocida, sin resolver:** las ~45 referencias cruzadas externas a la numeración de v0.1 (ver [§16](#16-mapeo-de-numeración-histórico)) siguen sin corregirse una por una — el volumen de archivos a tocar (20+) y el riesgo de introducir un error en documentación técnica ajena al encargo siguen pesando más que la ganancia de resolverlo ahora, mismo criterio que en v2.0.

### v2.0 (2026-07-30, rediseño ejecutivo)

Ver detalle en el historial: el rediseño original que redujo el documento de 658 a ~520 líneas, migró el historial detallado a `CHANGELOG.md`, y corrigió en la misma sesión un error propio (afirmar que cierto contenido estaba "preservado" sin haberlo movido realmente) — documentado explícitamente en su momento como evidencia de por qué la regla 1 de [§15](#15-gobierno-y-mantenimiento-de-este-documento) existe.

---

## 18. Historial ejecutivo

Solo hitos mayores. Detalle completo, línea por línea, de **todo** cambio del proyecto: [`CHANGELOG.md`](CHANGELOG.md).

| Fecha                   | Hito                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-18              | Primera versión de `MASTER_CONTEXT.md` (v0.1)                                                                                                                               |
| 2026-07-19              | EWO-002 (Authentication & Authorization) → `DONE`                                                                                                                           |
| 2026-07-19              | Primer commit del repositorio (`756358d`)                                                                                                                                   |
| 2026-07-19              | EWO-003 (Organization & Company Management) implementado                                                                                                                    |
| 2026-07-20              | EWO-004 (User, RBAC & Workspace Context) implementado                                                                                                                       |
| 2026-07-22              | EWO-004 → `DONE` — migración inicial de Prisma aplicada, 137/137 pruebas                                                                                                    |
| 2026-07-25              | **D-007** ratificada — estrategia de concurrencia y persistencia atómica del agregado CFDI (EWO-005 Bloque E)                                                               |
| 2026-07-26              | Sprint 1 de Bloque E (EWO-005) → `COMPLETADO`, `PASSED`                                                                                                                     |
| 2026-07-26              | **D-008** ratificada — recuperación de `E5-S1-T07`                                                                                                                          |
| 2026-07-29 – 2026-07-30 | Sprint 2 de Bloque E en curso: `E5-S2-T01` a `E5-S2-T08` → `PASSED`; `E5-S2-T09` implementada, pendiente de auditoría                                                       |
| 2026-07-30              | Rediseño ejecutivo de `MASTER_CONTEXT.md` (v0.1 → v2.0); historial detallado migrado a `CHANGELOG.md`                                                                       |
| 2026-07-30              | Knowledge Platform completo (v2.0 → v2.1): `AI_CONTEXT.md`, `PROJECT_INDEX.md`, `DASHBOARD.md`, `brain/DECISION_INDEX.md`, `AI_PLAYBOOK.md`, `DOCUMENTATION_STYLE_GUIDE.md` |
