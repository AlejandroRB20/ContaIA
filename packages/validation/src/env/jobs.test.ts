import { describe, expect, it } from 'vitest';

import { jobsEnvSchema } from './jobs';

describe('jobsEnvSchema', () => {
  it('aplica los defaults MVP de Addendum §10.3 cuando todo esta ausente', () => {
    expect(jobsEnvSchema.parse({})).toEqual({
      JOBS_RECONCILIATION_ENABLED: true,
      JOBS_RECONCILIATION_INTERVAL_MS: 300000,
      JOBS_STALE_QUEUED_MS: 600000,
      JOBS_STALE_PROCESSING_MS: 900000,
      JOBS_ATTEMPTS: 3,
      JOBS_BACKOFF_DELAY_MS: 5000,
      JOBS_REMOVE_ON_COMPLETE_COUNT: 1000,
      JOBS_REMOVE_ON_COMPLETE_AGE_SECONDS: 86400,
      JOBS_REMOVE_ON_FAIL_COUNT: 5000,
      JOBS_REMOVE_ON_FAIL_AGE_SECONDS: 604800,
    });
  });

  it('JOBS_ATTEMPTS=1 es valido (minimo admitido: sin reintentos)', () => {
    expect(jobsEnvSchema.parse({ JOBS_ATTEMPTS: '1' }).JOBS_ATTEMPTS).toBe(1);
  });

  it('JOBS_ATTEMPTS=0 falla el arranque (0 intentos dejaria el Job sin ejecutarse nunca)', () => {
    expect(() => jobsEnvSchema.parse({ JOBS_ATTEMPTS: '0' })).toThrow();
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('convierte JOBS_RECONCILIATION_ENABLED=%s a %s', (value, expected) => {
    expect(
      jobsEnvSchema.parse({ JOBS_RECONCILIATION_ENABLED: value }).JOBS_RECONCILIATION_ENABLED,
    ).toBe(expected);
  });

  it('JOBS_RECONCILIATION_ENABLED con valor invalido falla el arranque (no se deshabilita silenciosamente)', () => {
    expect(() => jobsEnvSchema.parse({ JOBS_RECONCILIATION_ENABLED: 'yes' })).toThrow();
  });

  it.each([
    ['JOBS_RECONCILIATION_INTERVAL_MS', '59999'],
    ['JOBS_RECONCILIATION_INTERVAL_MS', '3600001'],
    ['JOBS_STALE_QUEUED_MS', '59999'],
    ['JOBS_STALE_QUEUED_MS', '7200001'],
    ['JOBS_STALE_PROCESSING_MS', '59999'],
    ['JOBS_STALE_PROCESSING_MS', '7200001'],
    ['JOBS_ATTEMPTS', '11'],
    ['JOBS_BACKOFF_DELAY_MS', '99'],
    ['JOBS_BACKOFF_DELAY_MS', '60001'],
    ['JOBS_REMOVE_ON_COMPLETE_COUNT', '9'],
    ['JOBS_REMOVE_ON_COMPLETE_COUNT', '100001'],
    ['JOBS_REMOVE_ON_COMPLETE_AGE_SECONDS', '3599'],
    ['JOBS_REMOVE_ON_COMPLETE_AGE_SECONDS', '2592001'],
    ['JOBS_REMOVE_ON_FAIL_COUNT', '9'],
    ['JOBS_REMOVE_ON_FAIL_COUNT', '100001'],
    ['JOBS_REMOVE_ON_FAIL_AGE_SECONDS', '3599'],
    ['JOBS_REMOVE_ON_FAIL_AGE_SECONDS', '7776001'],
  ])('%s fuera de rango (%s) falla el arranque (fail-fast)', (key, value) => {
    expect(() => jobsEnvSchema.parse({ [key]: value })).toThrow();
  });

  it.each([
    'JOBS_RECONCILIATION_INTERVAL_MS',
    'JOBS_STALE_QUEUED_MS',
    'JOBS_STALE_PROCESSING_MS',
    'JOBS_ATTEMPTS',
    'JOBS_BACKOFF_DELAY_MS',
    'JOBS_REMOVE_ON_COMPLETE_COUNT',
    'JOBS_REMOVE_ON_COMPLETE_AGE_SECONDS',
    'JOBS_REMOVE_ON_FAIL_COUNT',
    'JOBS_REMOVE_ON_FAIL_AGE_SECONDS',
  ])('%s no numerico falla el arranque', (key) => {
    expect(() => jobsEnvSchema.parse({ [key]: 'no-numero' })).toThrow();
  });

  it('JOBS_STALE_PROCESSING_MS por default excede holgadamente el peor caso de backoff (JOBS_ATTEMPTS x JOBS_BACKOFF_DELAY_MS)', () => {
    const parsed = jobsEnvSchema.parse({});
    expect(parsed.JOBS_STALE_PROCESSING_MS).toBeGreaterThan(
      parsed.JOBS_ATTEMPTS * parsed.JOBS_BACKOFF_DELAY_MS,
    );
  });
});
