import type { Config } from 'tailwindcss';

/**
 * Preset de Tailwind compartido por apps/web (y por cualquier futuro
 * consumidor). Fija unicamente los tokens ya confirmados como definitivos en
 * docs/18_UI_SPECIFICATION.md (seccion 3): espaciado base de 4px, radios y
 * los colores semanticos ya validados por calculo de contraste (seccion 3.1
 * de ese documento).
 *
 * Los dos colores que ese mismo documento marco como "requiere ajuste"
 * (exito, advertencia) se dejan con su HEX heredado de docs/13_DESIGN_SYSTEM.md
 * — el ajuste final de tono es una tarea de un EWO de UI dedicado, no de
 * EWO-001 (fuera de alcance: "no implementar modulos de negocio").
 *
 * Movido de la raiz del paquete a `src/` en EWO-002 para que `rootDir`
 * compile de forma consistente junto con los primeros componentes reales
 * (Button/Input/Card/FormField) — ver docs/engineering/EWO-002_AUTH_REPORT.md.
 */
const contaiaTailwindPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1B3A6B',
        },
        action: {
          DEFAULT: '#2F6FED',
        },
        success: {
          DEFAULT: '#1E8E5A',
        },
        warning: {
          DEFAULT: '#B7791F',
        },
        danger: {
          DEFAULT: '#C0392B',
        },
        risk: {
          DEFAULT: '#C2540C',
        },
        ai: {
          DEFAULT: '#6D5BD0',
        },
        // Neutrales (docs/13_DESIGN_SYSTEM.md seccion 5) — agregados en
        // EWO-002 al construir los primeros componentes reales de
        // packages/ui (Button/Input/Card/FormField).
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#161B22',
        },
        foreground: {
          DEFAULT: '#101828',
          dark: '#E6E9EF',
        },
        'muted-foreground': {
          DEFAULT: '#5B6472',
          dark: '#9AA3B2',
        },
        border: {
          DEFAULT: '#D8DCE3',
          dark: '#2A313C',
        },
        disabled: {
          DEFAULT: '#A6ADB8',
        },
      },
      backgroundColor: {
        page: {
          DEFAULT: '#F7F8FA',
          dark: '#0E1218',
        },
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
    },
  },
};

export default contaiaTailwindPreset;
