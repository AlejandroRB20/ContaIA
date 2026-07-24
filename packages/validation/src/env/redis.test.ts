import { describe, expect, it } from 'vitest';

import { redisEnvSchema } from './redis';

describe('redisEnvSchema', () => {
  it('usa Redis habilitado por defecto y una URL local por defecto', () => {
    expect(redisEnvSchema.parse({})).toEqual({
      REDIS_ENABLED: true,
      REDIS_URL: 'redis://localhost:6379',
    });
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('convierte REDIS_ENABLED=%s a %s', (value, expected) => {
    expect(redisEnvSchema.parse({ REDIS_ENABLED: value }).REDIS_ENABLED).toBe(expected);
  });

  it('rechaza valores inválidos para evitar deshabilitar Redis silenciosamente', () => {
    expect(() => redisEnvSchema.parse({ REDIS_ENABLED: 'False' })).toThrow();
    expect(() => redisEnvSchema.parse({ REDIS_ENABLED: '1' })).toThrow();
  });
});
