# syntax=docker/dockerfile:1
#
# Imagen de produccion de apps/api (NestJS).
#
# Implementa la contenedorizacion ya ratificada en
# docs/22_INFRASTRUCTURE_IMPLEMENTATION_PLAN.md seccion 4: "Imagen
# independiente por proceso desplegable: Frontend, API, Workers — nunca una
# imagen monolitica que mezcle los tres". Esta imagen contiene UNICAMENTE el
# proceso HTTP del API.
#
# Deliberadamente agnostica de proveedor: no asume Render, Railway, Fly,
# Cloud Run ni ningun otro. docs/22 no nombra proveedor y este archivo
# tampoco lo hace. Corre en cualquier plataforma que ejecute un contenedor y
# le inyecte variables de entorno.
#
# NINGUN secreto se hornea en la imagen: todas las variables se inyectan en
# tiempo de ejecucion (docs/22 seccion 7, gestion de secretos externa).
#
# Build (desde la raiz del repositorio, NO desde apps/api):
#   docker build -f apps/api/Dockerfile -t contaia-api .
#
# Migraciones (proceso aparte, antes de arrancar una version nueva):
#   docker run --rm -e DATABASE_URL=... contaia-api pnpm run db:migrate:deploy

# --- Base comun -------------------------------------------------------------
# openssl es requisito del query engine de Prisma sobre Debian slim.
FROM node:22.18.0-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# --- Build ------------------------------------------------------------------
FROM base AS builder

COPY . .

# Instalacion reproducible: mismo criterio que .github/workflows/ci.yml.
RUN pnpm install --frozen-lockfile

# El cliente de Prisma esta en .gitignore (packages/database/generated/), asi
# que la imagen lo genera.
#
# Se usa la variante `:deploy` (prisma sin dotenv-cli). NO es porque la otra
# falle: se verifico que `dotenv -e ../../.env` tolera la ausencia del
# archivo. Es para que un `.env` que llegara a existir dentro del contenedor
# no pueda sombrear los secretos inyectados por la plataforma, y para que el
# comando siga funcionando si algun dia la imagen instala solo dependencias
# de produccion (dotenv-cli es devDependency de packages/database).
RUN pnpm run db:generate:deploy

# turbo resuelve el grafo de dependencias del workspace (dependsOn ^build),
# de modo que packages/{types,validation,config,database} se compilan antes
# que apps/api. apps/web NO entra en este build.
RUN pnpm exec turbo run build --filter=@contaia/api

# --- Runtime ----------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production

# Se copia el workspace completo ya construido: las dependencias del
# monorepo se resuelven por los enlaces simbolicos que pnpm creo dentro de
# /app/node_modules, y son relativos, por lo que sobreviven a la copia.
# ponytail: imagen mas grande de lo minimo (incluye devDependencies). Si el
# tamano llega a importar, el siguiente paso es `pnpm deploy --prod --filter
# @contaia/api` en una etapa intermedia; no antes, porque complica el build
# sin beneficio observable hoy.
COPY --from=builder --chown=node:node /app /app

USER node

# Debe coincidir con API_PORT. La plataforma suele inyectar su propio puerto;
# en ese caso hay que pasar API_PORT con el mismo valor.
EXPOSE 4000

# Liveness: GET /api/v1/health — nunca depende de servicios externos.
# Readiness: GET /api/v1/health/readiness — PostgreSQL critico, Redis no.
CMD ["node", "apps/api/dist/main.js"]
