import { baseConfig } from '@contaia/eslint-config/base';

export default [
  ...baseConfig,
  {
    ignores: ['generated/**', 'prisma/migrations/**'],
  },
];
