import contaiaTailwindPresetModule from '@contaia/ui/tailwind-preset';
import type { Config } from 'tailwindcss';

/**
 * El loader de TS que usa Tailwind (jiti) no siempre aplica la interop de
 * "export default" al requerir `@contaia/ui/tailwind-preset` (CJS compilado
 * por tsc) — a veces entrega el modulo completo (`{ default: {...} }`) en vez
 * del preset. Sin este `unwrapDefault`, Tailwind recibe un preset sin
 * `theme.extend`, lo fusiona como vacio y ninguno de los tokens de marca
 * (bg-page, text-action, bg-brand, etc.) llega a compilarse — toda la app se
 * ve con los colores por defecto de Tailwind.
 */
function unwrapDefault<T>(mod: T | { default: T }): T {
  return typeof mod === 'object' && mod !== null && 'default' in mod
    ? (mod as { default: T }).default
    : (mod as T);
}

const contaiaTailwindPreset = unwrapDefault(contaiaTailwindPresetModule);

const config: Config = {
  presets: [contaiaTailwindPreset as Config],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
