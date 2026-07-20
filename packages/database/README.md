# @contaia/database

Paquete de base de datos de ContaIA: esquema Prisma, cliente reutilizable, migraciones y seed.

## Alcance en EWO-001

Solo contiene `SystemMetadata`, una entidad tecnica para validar que la infraestructura (migraciones, escritura, lectura, UUID, timestamps UTC, conexion desde NestJS) funciona de extremo a extremo. El modelo de dominio (Usuario, Empresa, Rol, CFDI, Poliza, etc.) se implementa en los EWO correspondientes — ver `docs/09_DATABASE_DESIGN.md` y `docs/21_DATABASE_MIGRATION_PLAN.md`.

## Uso

```bash
pnpm db:generate   # genera el cliente Prisma en generated/client
pnpm db:migrate    # aplica migraciones (requiere DATABASE_URL activa)
pnpm db:seed       # siembra el registro tecnico minimo
pnpm db:studio     # abre Prisma Studio
```

Requiere `DATABASE_URL` definida en el `.env` de la raiz del monorepo (ver `.env.example`).

## Por que no hay `MigrationRecord`

Prisma ya mantiene su propia tabla de control de migraciones (`_prisma_migrations`) automaticamente. Agregar una entidad `MigrationRecord` propia duplicaria esa responsabilidad sin aportar valor — decision explicita, no una omision.
