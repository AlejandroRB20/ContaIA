import { getQueueToken } from '@nestjs/bullmq';
import type { FactoryProvider } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { BullMqJobsQueueAdapter } from './bullmq-jobs-queue.adapter';
import { DisabledJobsQueueAdapter } from './disabled-jobs-queue.adapter';
import { JOBS_QUEUE_ADAPTER, XML_EXTRACTION_QUEUE_NAME } from './jobs-queue.interface';
import {
  buildBullConnectionOptions,
  buildJobsQueueAdapterProvider,
  buildJobsQueueImports,
} from './jobs.module';

describe('buildBullConnectionOptions', () => {
  it('deriva la conexion unicamente de REDIS_URL (config ya validada) — sin credenciales hardcodeadas', () => {
    const config = { REDIS_URL: 'redis://user:pass@redis-host:6379' } as never;

    const connection = buildBullConnectionOptions(config);

    expect(connection).toEqual({
      url: 'redis://user:pass@redis-host:6379',
      maxRetriesPerRequest: null,
    });
  });

  it('el codigo fuente no contiene ningun host/credencial de Redis hardcodeado', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const source = require('node:fs').readFileSync(require.resolve('./jobs.module.ts'), 'utf8');
    expect(source).not.toMatch(/redis:\/\/[^'"\s]*:[^'"\s]*@/);
  });
});

describe('buildJobsQueueImports', () => {
  it('cuando REDIS_ENABLED=false, no registra BullModule en absoluto (cero conexion real)', () => {
    const imports = buildJobsQueueImports(false);

    expect(imports).toEqual([]);
  });

  it('cuando REDIS_ENABLED=true, registra la conexion compartida y la cola xml-extraction', () => {
    const imports = buildJobsQueueImports(true);

    expect(imports).toHaveLength(2);
    imports.forEach((dynamicModule) => {
      expect(dynamicModule).toHaveProperty('module');
    });
  });
});

describe('buildJobsQueueAdapterProvider', () => {
  it('cuando REDIS_ENABLED=false, resuelve a DisabledJobsQueueAdapter sin depender de ningun token de cola', async () => {
    const provider = buildJobsQueueAdapterProvider(false) as FactoryProvider;

    expect(provider.provide).toBe(JOBS_QUEUE_ADAPTER);
    expect(provider.inject ?? []).toEqual([]);
    const adapter = await provider.useFactory();
    expect(adapter).toBeInstanceOf(DisabledJobsQueueAdapter);
  });

  it('cuando REDIS_ENABLED=true, inyecta la Queue xml-extraction y produce un BullMqJobsQueueAdapter', async () => {
    const provider = buildJobsQueueAdapterProvider(true) as FactoryProvider;
    const fakeQueue = { add: jest.fn() } as unknown as Queue;

    expect(provider.provide).toBe(JOBS_QUEUE_ADAPTER);
    expect(provider.inject).toEqual([getQueueToken(XML_EXTRACTION_QUEUE_NAME)]);
    const adapter = await provider.useFactory(fakeQueue);
    expect(adapter).toBeInstanceOf(BullMqJobsQueueAdapter);
  });
});
