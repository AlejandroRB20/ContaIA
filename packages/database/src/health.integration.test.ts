import { afterAll, describe, expect, it } from 'vitest';

import { prisma, disconnectPrisma } from './client';
import { checkDatabaseConnection } from './health';

/**
 * Prueba de integracion real contra PostgreSQL. Requiere que el servicio
 * de base de datos este disponible (`docker compose up -d postgres`, ver
 * `docs/26_LOCAL_DEVELOPMENT.md`), por lo que se ejecuta por separado de
 * las pruebas unitarias (`pnpm test:integration`, nunca en
 * `pnpm test:unit`) — ver docs/23_TESTING_AND_QA_PLAN.md seccion 3.
 *
 * Se omite (no falla) cuando PostgreSQL no esta disponible en
 * `DATABASE_URL` — evita que `pnpm run check`/CI reporten un fallo por
 * infraestructura ausente en vez de un defecto real de codigo, sin ocultar
 * la suite (aparece como "skipped" en el reporte, con el motivo impreso).
 * Ejecutar con Docker disponible: `docker compose up -d postgres && pnpm
 * --filter @contaia/database run test:integration`.
 */
const isDatabaseAvailable = await checkDatabaseConnection();

if (!isDatabaseAvailable) {
  console.warn(
    '[test:integration] PostgreSQL no disponible en DATABASE_URL — se omite "conectividad de base de datos". Ejecuta `docker compose up -d postgres` y reintenta.',
  );
}

describe.skipIf(!isDatabaseAvailable)('conectividad de base de datos', () => {
  afterAll(async () => {
    await disconnectPrisma();
  });

  it('confirma conectividad real con PostgreSQL', async () => {
    expect(isDatabaseAvailable).toBe(true);
  });

  it('escribe y lee un registro con UUID y timestamps UTC', async () => {
    const key = `foundation.integration-test.${Date.now()}`;

    const created = await prisma.systemMetadata.create({
      data: { key, value: 'ok' },
    });

    expect(created.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(created.createdAt).toBeInstanceOf(Date);

    const found = await prisma.systemMetadata.findUniqueOrThrow({ where: { key } });
    expect(found.value).toBe('ok');

    await prisma.systemMetadata.delete({ where: { key } });
  });
});
