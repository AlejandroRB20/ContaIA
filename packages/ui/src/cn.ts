import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases de Tailwind de forma segura, resolviendo conflictos de
 * utilidades duplicadas (por ejemplo, dos anchos distintos aplicados
 * condicionalmente). Utilidad base de shadcn/ui — se prepara aqui para que
 * los componentes reales (UIC-01 a UIC-18, docs/18_UI_SPECIFICATION.md
 * seccion 4) la reutilicen sin definirla de nuevo por componente.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
