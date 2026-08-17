/**
 * Colores exactos extraídos del diseño fuente
 * `ContaIA Dashboard V2 (standalone) 2.html` (inspección de estilos
 * computados en navegador, EWO-frontend-ui-02). Locales a los componentes de
 * `components/dashboard/**` — no sustituyen los tokens compartidos de
 * `@contaia/ui` (`tailwind-preset.ts`), que otras pantallas siguen usando.
 */
export const DASHBOARD_COLORS = {
  page: '#F5F7FB',
  sidebar: '#0B1B3B',
  sidebarActiveItem: '#1B2F63',
  accent: '#2E5EEA',
  accentTint: '#EEF3FF',
  cardBg: '#FFFFFF',
  cardBorder: '#E6E9F0',
  searchBg: '#F8F9FC',
  headingText: '#131A2C',
  mutedText: '#667085',
  fadedText: '#98A2B3',
  success: '#17A75A',
  successTint: '#E7F8EF',
  warning: '#B7791F',
  warningTint: '#FEF6E7',
  danger: '#E14848',
  dangerTint: '#FDECEC',
  egresosLine: '#B7C6F0',
  overlay: 'rgba(11, 27, 59, 0.25)',
} as const;
