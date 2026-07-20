// Configuracion de ESLint (flat config) para apps/api (NestJS).
import globals from 'globals';

import { baseConfig } from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export const nestjsConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // NestJS depende de clases con decoradores e inyeccion de dependencias;
      // estas reglas de estilo funcional no aplican a ese patron arquitectonico.
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',
      // Desactivada por completo (no solo ajustada) para apps/api: esta regla
      // no puede distinguir "clase inyectada via parametro de constructor sin
      // @Inject() explicito" ni "DTO usado en @Body()/@Param()" de un tipo
      // puramente estatico — en ambos casos NestJS necesita el valor real de
      // la clase en tiempo de ejecucion (reflect-metadata para DI, o
      // class-validator/ValidationPipe para DTOs). Convertir cualquiera de
      // esos imports a `import type` los borra del JS compilado y rompe la
      // resolucion en tiempo de ejecucion de forma silenciosa (bug real
      // encontrado y corregido durante EWO-001, reproducido a mayor escala en
      // EWO-002) — `disallowTypeAnnotations: false` no evita este problema,
      // es una opcion distinta de la regla. TypeScript ya valida estos
      // imports en `typecheck`; esta regla es solo estilo, no una red de
      // seguridad segura para codigo con decoradores.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];

export default nestjsConfig;
