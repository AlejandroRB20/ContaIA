import contaiaTailwindPreset from '@contaia/ui/tailwind-preset';
import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [contaiaTailwindPreset as Config],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
