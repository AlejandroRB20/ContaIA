import { nextConfig } from '@contaia/eslint-config/next';

export default [
  ...nextConfig,
  {
    ignores: ['.next/**', 'next-env.d.ts'],
  },
];
