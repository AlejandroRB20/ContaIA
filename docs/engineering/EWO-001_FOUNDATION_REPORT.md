# EWO-001 — Reporte de Ejecución: Project Foundation

## 1. Metadatos

| Campo              | Valor                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| Work Order         | EWO-001 — PROJECT FOUNDATION                                                 |
| Fecha de ejecución | 2026-07-19                                                                   |
| Ejecutado por      | Claude Code (autónomo, dentro del alcance definido)                          |
| Entorno            | Windows 11 Pro, Node.js v22.18.0, pnpm 11.15.0, sin Docker Desktop instalado |
| Resultado final    | **COMPLETE_WITH_NON_BLOCKING_WARNINGS**                                      |

## 2. Resumen ejecutivo

Se inspeccionó, implementó, instaló, validó y estabilizó la base técnica del monorepo ContaIA conforme al alcance de EWO-001: monorepo pnpm + Turborepo, frontend Next.js, backend NestJS, paquete de base de datos Prisma (esquema mínimo, sin entidades de negocio), paquetes compartidos (`config`, `validation`, `types`, `ui`), Docker Compose para PostgreSQL/Redis locales, y automatización de calidad (ESLint, Prettier, Husky, lint-staged, Commitlint, CI de GitHub Actions).

Todas las validaciones ejecutables en este entorno (`install`, `prisma generate`, `typecheck`, `lint`, `test` unitarias, `build`) terminaron en verde tras corregir varios errores reales encontrados durante la ejecución (detallados en la sección 5). Los pasos que requieren PostgreSQL/Redis en vivo (Docker Compose, migraciones aplicadas, seed, arranque real del backend/frontend e integración end-to-end) **no pudieron ejecutarse** porque Docker no está disponible en este entorno y no existe una alternativa instalable de forma segura y no destructiva. Esto se documenta como bloqueo no crítico en la sección 7, conforme a EWO-001 §18.

No se declara `COMPLETE` porque el bucle de autoevaluación de 15 pasos no pudo completarse en su totalidad (pasos dependientes de infraestructura viva quedaron sin ejecutar). No se declara `BLOCKED` porque ninguna validación crítica de código (compilación, tipos, lint, pruebas unitarias, build) falló — el repositorio queda estable, compilable y listo para EWO-002.

## 3. Alcance ejecutado

- Monorepo pnpm workspaces + Turborepo (`pnpm-workspace.yaml`, `turbo.json`)
- `apps/web`: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, TanStack Query, Zustand, Zod — página técnica de estado únicamente
- `apps/api`: NestJS 10, Swagger/OpenAPI, class-validator/class-transformer, Helmet, rate limiting, filtro de excepciones + interceptor de transformación de respuesta (contrato de `docs/08_API_DESIGN.md`), correlation ID
- Endpoints backend requeridos: `GET /api/v1/health`, `GET /api/v1/health/readiness`, `GET /api/v1/version` — implementados y con pruebas unitarias en verde
- `packages/database`: esquema Prisma mínimo (`SystemMetadata`, técnico, sin `User`/`Company`/`Role`/CFDI/etc.), cliente reutilizable, seed
- `packages/config`, `packages/validation`, `packages/types`, `packages/ui` (tokens + `cn`, sin componentes shadcn instalados)
- `docker-compose.yml`: PostgreSQL 16-alpine + Redis 7-alpine únicamente (MinIO excluido deliberadamente, sin justificación de uso en EWO-001)
- ESLint (flat config compartida), Prettier, Vitest (frontend/paquetes) y Jest (backend), Husky + lint-staged + Commitlint, CI de GitHub Actions (install, lint, format:check, typecheck, test:unit, build — sin despliegue, sin servicios en vivo)
- `README.md` actualizado; este reporte

Explícitamente fuera de alcance (no implementado, conforme a EWO-001): autenticación/autorización funcional, empresas, usuarios, dashboard real, CFDI, XML, contabilidad, reportes, IA, SAT, PAC, microservicios, Kubernetes, configuración de producción, secretos almacenados.

## 4. Comandos ejecutados y resultado

| Comando                                    | Resultado                      | Notas                                                                                                        |
| ------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `npm install -g pnpm`                      | ✅ OK                          | pnpm no estaba disponible en el entorno; instalado como alternativa segura (pnpm 11.15.0)                    |
| `pnpm install`                             | ✅ OK                          | Resueltos ~1150 paquetes; build scripts aprobados vía `allowBuilds` en `pnpm-workspace.yaml` (ver sección 5) |
| `pnpm run db:generate` (`prisma generate`) | ✅ OK                          | Cliente de Prisma generado sin conexión real a base de datos                                                 |
| `docker compose up -d` (Postgres/Redis)    | ⛔ No ejecutado                | Docker no instalado en el entorno (ver sección 7)                                                            |
| `pnpm run db:migrate` / `db:seed`          | ⛔ No ejecutado                | Depende de PostgreSQL en vivo (ver sección 7)                                                                |
| `pnpm run dev` (backend/frontend reales)   | ⛔ No ejecutado                | Depende de PostgreSQL/Redis en vivo (ver sección 7)                                                          |
| `pnpm run typecheck`                       | ✅ OK (tras 3 rondas de fixes) | 12/12 tareas de Turborepo en verde                                                                           |
| `pnpm run lint`                            | ✅ OK (tras 2 rondas de fixes) | 12/12 tareas en verde, 0 errores, 0 warnings                                                                 |
| `pnpm run test` (unitarias)                | ✅ OK (tras 2 rondas de fixes) | 11/11 tareas en verde — 19 pruebas unitarias pasando en total                                                |
| `pnpm run build`                           | ✅ OK (tras 1 ronda de fix)    | 7/7 tareas en verde (2 apps + 5 paquetes)                                                                    |

## 5. Errores encontrados y correcciones aplicadas

Todos los errores siguientes fueron encontrados durante la ejecución real de los comandos anteriores y corregidos antes de continuar, conforme a la instrucción de no detenerse tras el primer error.

1. **`[ERR_PNPM_IGNORED_BUILDS]` tras `pnpm install`.** pnpm 11 bloquea por defecto los scripts de postinstalación de `@nestjs/core`, `@prisma/client`, `@prisma/engines`, `@scarf/scarf`, `esbuild`, `prisma` y `sharp`. El campo `pnpm.onlyBuiltDependencies` en `package.json` (mecanismo de versiones anteriores de pnpm) ya no es leído por pnpm 11. **Corrección:** se añadió el mapa `allowBuilds` en `pnpm-workspace.yaml` con los 7 paquetes en `true`.

2. **`TS6059` — rootDir inconsistente** en `packages/types`, `packages/validation`, `packages/config`, `packages/database` y `apps/api`. La configuración compartida `packages/typescript-config/internal-package.json` (y `nestjs.json`) define `rootDir`/`outDir` relativos, que TypeScript resuelve relativos a la carpeta del archivo que los define, no del paquete que los extiende. **Corrección:** se añadieron overrides explícitos de `rootDir`/`outDir` en el `tsconfig.json` de cada paquete consumidor. En `apps/api` se ajustó además `include`/`exclude` para que `test/` (pruebas e2e) no forme parte del `rootDir` de `src/`, ya que Jest/ts-jest no requiere que las pruebas e2e estén dentro del `rootDir` del `tsc` de compilación.

3. **`TS2580: Cannot find name 'process'`** en `packages/database/src/client.ts` y en `packages/config/src/{client,server,parse-env}.ts`. Ambos paquetes usan `process.env` pero no declaraban `@types/node` como dependencia. **Corrección:** se añadió `@types/node@^22.10.7` a `devDependencies` de `packages/config` y `packages/database`.

4. **`TS2307: Cannot find module '@contaia/config/server'`** en `apps/api` (5 archivos). La resolución de módulos `Node10`/clásica de TypeScript (usada por `nestjs.json` para compatibilidad con CommonJS) no interpreta el mapa `exports` de `package.json`, a diferencia de la resolución `Bundler` usada por `apps/web`. Cambiar `apps/api` a `moduleResolution: "Bundler"` no es viable porque esa opción exige `module: "esnext"` o `"preserve"`, incompatible con la salida CommonJS que requiere NestJS/Jest/ts-node. **Corrección:** se añadió un campo `typesVersions` en `packages/config/package.json` que redirige explícitamente los subpaths `server`/`client` a sus `.d.ts` en `dist/`, patrón estándar para dar soporte simultáneo a resolución clásica (Node10) y moderna (Bundler/Node16) sin migrar todo `apps/api` a ESM.

5. **Bug de test:** `apps/web/src/app/page.test.tsx` renderizaba `<StatusPage />` sin `QueryClientProvider`, lo que habría lanzado una excepción en tiempo de ejecución porque `<HealthStatus />` usa `useQuery` internamente. **Corrección:** se envolvió el render en un `QueryClientProvider` propio del test.

6. **Falso positivo de ESLint (`import/named`)** en `apps/web/src/app/page.test.tsx` y `apps/web/src/components/health-status.test.tsx`: el resolvedor por defecto de `eslint-plugin-import` no logra analizar estáticamente las exportaciones nombradas de `@testing-library/react` (paquete dual ESM/CJS), reportando `screen`/`waitFor` como "no encontrados" pese a que TypeScript los resuelve correctamente. **Corrección:** se desactivó la regla `import/named` en `packages/eslint-config/base.js` (ya se contaba con `import/no-unresolved: off` por el mismo motivo) — TypeScript ya garantiza en `typecheck` que estos imports son válidos.

7. **Regresión de fixture de Vitest en `apps/web`:** al ejecutar `pnpm run test`, los tres tests con JSX fallaban con `ReferenceError: React is not defined`, porque `vitest.config.ts` no tenía configurado el plugin `@vitejs/plugin-react`, necesario para que Vite transforme JSX con el runtime automático. **Corrección:** se añadió `@vitejs/plugin-react` a `devDependencies` y se registró en `vitest.config.ts`.

8. **Bug crítico de inyección de dependencias en NestJS**, introducido por la propia corrección automática de lint (`pnpm run lint:fix`, paso 6 de esta sección): la regla `@typescript-eslint/consistent-type-imports` convirtió automáticamente a `import type` los imports de `RedisService` (en `health.service.ts`) y `HealthService` (en `health.controller.ts` y `version.controller.ts`), que son inyectados implícitamente por NestJS vía metadatos de reflexión (`design:paramtypes`) sin decorador `@Inject()` explícito. Un `import type` es eliminado por completo en tiempo de compilación, por lo que Nest no puede resolver la clase real como token de inyección — esto habría causado un fallo real en tiempo de arranque (`Nest can't resolve dependencies...`), detectado por las pruebas unitarias de `HealthService` (8 pruebas fallidas). **Corrección:** se revirtieron los tres imports a imports de valor, con un comentario `eslint-disable-next-line` explicando la razón, para evitar que un futuro `lint:fix` reintroduzca el mismo bug.

9. **Fallo de build de `apps/web`:** `next build` falla al generar la página estática `/` porque `NEXT_PUBLIC_API_URL` es requerida por `@contaia/validation` pero Next.js no lee el `.env` de la raíz del monorepo (solo lee `.env*` dentro de `apps/web/`). **Corrección:** se creó `apps/web/.env.local` (ignorado por git) con los mismos valores que `.env.example`, documentado en el README. El workflow de CI ya inyectaba `NEXT_PUBLIC_API_URL` como variable de entorno del paso de build, por lo que este problema era exclusivo de la ejecución local.

10. **Bit de ejecutable de los hooks de Husky:** `chmod +x` sobre `.husky/{pre-commit,pre-push,commit-msg}` no modifica visiblemente los permisos reportados por `ls -la` en este entorno (peculiaridad conocida de filesystem Windows/Git-Bash). No bloquea ninguna validación automatizada de EWO-001; se documenta como deuda menor en la sección 8.

## 6. Dependencias añadidas

| Paquete             | Dependencia                         | Motivo                                                                                       |
| ------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `packages/config`   | `@types/node@^22.10.7` (dev)        | Uso de `process.env` sin tipos declarados                                                    |
| `packages/database` | `@types/node@^22.10.7` (dev)        | Uso de `process.env` sin tipos declarados                                                    |
| `apps/web`          | `@vitejs/plugin-react@^4.3.4` (dev) | Transformación JSX en Vitest (runtime automático de React)                                   |
| raíz                | `prettier-plugin-tailwindcss` (dev) | Ordenamiento de clases Tailwind en Prettier (ya presente antes de esta sesión de validación) |

No se agregaron dependencias de producción fuera del alcance original de EWO-001.

## 7. Bloqueo no crítico: infraestructura en vivo no disponible

**Naturaleza del bloqueo:** este entorno de ejecución no tiene Docker instalado (`docker: command not found`, sin Docker Desktop en rutas estándar) ni binarios nativos de PostgreSQL o Redis. Se verificó que no existe una alternativa instalable de forma segura y no destructiva dentro del alcance de esta sesión.

**Pasos del bucle de autoevaluación de EWO-001 §17 que no pudieron ejecutarse por este motivo:**

- `docker compose up` (PostgreSQL + Redis locales)
- `prisma migrate dev` / `migrate deploy` contra una base de datos real
- `prisma db seed` contra una base de datos real
- Arranque real de `apps/api` con conexión efectiva a PostgreSQL/Redis
- Verificación en vivo de `GET /api/v1/health/readiness` reportando `ok` con dependencias reales arriba
- Arranque real de `apps/web` consumiendo el backend real
- Verificación de integración frontend↔backend end-to-end

**Mitigación aplicada dentro de lo posible en este entorno:**

- `prisma generate` sí se ejecutó correctamente (no requiere conexión a base de datos).
- Las pruebas unitarias de `HealthService` cubren la lógica de readiness (`ok`/`degraded`/`down`) con PostgreSQL y Redis mockeados, incluyendo el caso de Redis no crítico caído.
- La prueba e2e `apps/api/test/health.e2e-spec.ts` fija explícitamente `REDIS_ENABLED=false` para no depender de un Redis real, pero **tampoco pudo ejecutarse en esta sesión** porque Jest e2e igualmente requiere PostgreSQL real para `checkDatabaseConnection` en el flujo de readiness — queda pendiente de ejecución en un entorno con Docker disponible.
- El pipeline de CI (`.github/workflows/ci.yml`) sí provisiona PostgreSQL como servicio de GitHub Actions para las pruebas unitarias con `DATABASE_URL` real; esta ruta no fue validada en esta sesión local pero su configuración fue revisada y es consistente con el resto del proyecto.

**Por qué no se declara `BLOCKED`:** ninguna validación de código (compilación, tipos, lint, pruebas unitarias con mocks, build) falló. El bloqueo es exclusivamente de infraestructura del entorno de ejecución, no del código entregado. Se recomienda que el primer paso de EWO-002 (o una validación previa) se ejecute en un entorno con Docker disponible para correr el bucle completo de EWO-001 §17 al menos una vez antes de construir funcionalidad nueva sobre esta base.

## 8. Deuda no crítica pendiente

- Verificar en un entorno con Docker: `docker compose up`, migraciones reales, seed, arranque real de ambas apps, y la prueba e2e de `apps/api`.
- Bit de ejecutable de los hooks de Husky no se refleja en `ls -la` en este entorno Windows/Git-Bash (funcionalidad no verificada end-to-end de los hooks de git; el contenido de los scripts es correcto).
- Next.js reporta en build: _"The Next.js plugin was not detected in your ESLint configuration"_ — advertencia informativa de `next build`, no bloqueante, porque este proyecto usa una configuración ESLint flat propia (`@contaia/eslint-config`) en lugar de `eslint-config-next`. No se integró `eslint-config-next` para mantener una única fuente de verdad de reglas de lint en todo el monorepo; evaluar en un futuro EWO si vale la pena sumar el plugin de Next.js solo para sus reglas específicas (p. ej. `next/image`, `next/no-html-link-for-pages`).
- `packages/database` no tiene pruebas unitarias propias (`src/**/*.test.ts` vacío); solo cuenta con `health.integration.test.ts`, que requiere PostgreSQL real y no se ejecutó en esta sesión.

## 9. Inconsistencias documentales encontradas

No se encontraron inconsistencias entre la documentación de arquitectura (`docs/`) y lo implementado que ameriten corrección en esta fase. La documentación de `docs/20_BACKEND_IMPLEMENTATION_PLAN.md` (contrato de readiness, punto único de lectura de configuración) y `docs/08_API_DESIGN.md` (envolvente de respuesta de la API) se siguieron al pie de la letra en la implementación.

## 10. Evaluación de preparación para EWO-002 (Authentication & Authorization)

La base queda en condiciones de soportar el siguiente Work Order:

- ✅ Backend NestJS con módulo de configuración centralizado (`SERVER_CONFIG`), listo para añadir módulos de dominio (auth, users, companies) sin reestructurar la base.
- ✅ Esquema Prisma mínimo y sin conflictos: añadir modelos `User`/`Company`/`Role` no requiere deshacer nada existente.
- ✅ Contrato de API (envolvente de éxito/error, correlation ID, filtro de excepciones global) ya operativo — los nuevos endpoints de auth pueden apoyarse en él directamente.
- ✅ Frontend con TanStack Query, Zustand y cliente de API ya preparados para consumir endpoints autenticados.
- ⚠️ Recomendado: ejecutar el bucle completo de EWO-001 §17 en un entorno con Docker antes de iniciar EWO-002, para confirmar el comportamiento con PostgreSQL/Redis reales (no solo mockeados) antes de construir lógica de sesiones/tokens sobre la base de datos real.

## 11. Resultado final

**COMPLETE_WITH_NON_BLOCKING_WARNINGS**

Justificación: todas las validaciones ejecutables sobre el código en este entorno (instalación, generación de Prisma, typecheck, lint, pruebas unitarias, build) pasan en verde tras corregir los 10 errores documentados en la sección 5, incluyendo un bug real de inyección de dependencias en NestJS que habría roto el arranque del backend en producción. El único punto pendiente es la verificación de infraestructura en vivo (Docker/PostgreSQL/Redis), bloqueada exclusivamente por la ausencia de Docker en este entorno de ejecución — no por ningún defecto del código entregado. No se declara `COMPLETE` porque esa verificación en vivo, mandatada por EWO-001 §17, queda pendiente de ejecución.
