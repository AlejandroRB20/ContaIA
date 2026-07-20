# ContaIA

Plataforma SaaS de contabilidad, cumplimiento fiscal (México) e inteligencia artificial. Este repositorio es el monorepo técnico del proyecto.

## Estado

Fundación técnica (EWO-001). No contiene todavía módulos funcionales (auth, empresas, CFDI, contabilidad, reportes, IA). Ver `docs/engineering/EWO-001_FOUNDATION_REPORT.md` para el detalle completo de esta fase.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Frontend (`apps/web`):** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, TanStack Query, React Hook Form, Zod, Zustand
- **Backend (`apps/api`):** NestJS 10, TypeScript, REST + Swagger/OpenAPI, class-validator/class-transformer
- **Base de datos (`packages/database`):** Prisma ORM sobre PostgreSQL
- **Cache/colas:** Redis (ioredis), BullMQ preparado (sin uso funcional aún)
- **Calidad:** ESLint (flat config), Prettier, Vitest (frontend y paquetes), Jest (backend), Husky + lint-staged, Commitlint

## Estructura del repositorio

```
apps/
  web/                  Frontend Next.js
  api/                  Backend NestJS
packages/
  database/             Esquema Prisma, cliente, migraciones, seed
  config/                Carga centralizada y validada de variables de entorno
  validation/            Esquemas Zod de entorno, por dominio
  types/                 Tipos compartidos (contrato de API, health)
  ui/                    Tokens de diseño y utilidad `cn` (sin componentes aún)
  eslint-config/         Configuración ESLint compartida (flat config)
  typescript-config/     Configuraciones tsconfig compartidas
docs/                    Documentación de arquitectura e ingeniería
docker-compose.yml       PostgreSQL + Redis para desarrollo local
```

## Requisitos previos

- Node.js (ver `.node-version` / `.nvmrc`)
- pnpm 11
- Docker (para PostgreSQL y Redis locales) — opcional para lint/typecheck/test/build de código, pero necesario para levantar el backend con datos reales

## Primeros pasos

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# (apps/web necesita además sus propias NEXT_PUBLIC_* en apps/web/.env.local
# para build/dev local — Next.js no lee el .env de la raíz del monorepo)

# 3. Levantar PostgreSQL y Redis
pnpm run docker:up

# 4. Generar el cliente de Prisma y aplicar migraciones
pnpm run db:generate
pnpm run db:migrate

# 5. Iniciar backend y frontend en paralelo
pnpm run dev
```

- Backend: http://localhost:4000 (`/api/v1/health`, `/api/v1/health/readiness`, `/api/v1/version`, Swagger en `/api/docs`)
- Frontend: http://localhost:3000

## Scripts principales (raíz)

| Script                                                          | Descripción                                                |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| `pnpm run dev`                                                  | Inicia todas las apps en modo desarrollo                   |
| `pnpm run build`                                                | Compila todos los paquetes y apps                          |
| `pnpm run lint` / `lint:fix`                                    | Lint en todo el monorepo                                   |
| `pnpm run typecheck`                                            | Verificación de tipos en todo el monorepo                  |
| `pnpm run test` / `test:unit`                                   | Pruebas (unitarias) en todo el monorepo                    |
| `pnpm run test:integration`                                     | Pruebas de integración (requieren PostgreSQL/Redis reales) |
| `pnpm run check`                                                | lint + typecheck + test + build en secuencia               |
| `pnpm run docker:up` / `docker:down`                            | Levanta/detiene PostgreSQL y Redis locales                 |
| `pnpm run db:generate` / `db:migrate` / `db:seed` / `db:studio` | Operaciones de Prisma                                      |

## Documentación

- `docs/` — arquitectura, PRD y planes de implementación por dominio
- `docs/engineering/` — reportes de ejecución de Work Orders de ingeniería
- `CLAUDE.md` — reglas obligatorias para Claude Code en este proyecto
