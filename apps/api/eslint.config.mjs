import { nestjsConfig } from '@contaia/eslint-config/nestjs';

export default [
  ...nestjsConfig,
  {
    ignores: ['dist/**'],
  },
];
