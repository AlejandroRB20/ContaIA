import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from './cn';

/**
 * Variantes de docs/13_DESIGN_SYSTEM.md seccion 17 — subconjunto usado por
 * las pantallas de Auth de EWO-002 (primaria/secundaria/silenciosa/enlace).
 * Las variantes de aprobacion/rechazo/destructiva quedan reservadas para
 * los modulos de negocio que las necesiten.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-action text-white hover:bg-action/90 disabled:bg-disabled',
  secondary:
    'border border-border bg-surface text-foreground hover:bg-page disabled:text-disabled dark:bg-surface-dark dark:text-foreground-dark dark:border-border-dark',
  ghost: 'text-foreground hover:bg-page disabled:text-disabled dark:text-foreground-dark',
  link: 'text-action underline-offset-4 hover:underline disabled:text-disabled p-0 h-auto',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled ?? isLoading}
        aria-busy={isLoading}
        className={cn(
          'gap-sm px-md inline-flex h-10 items-center justify-center rounded-sm text-sm font-medium transition-colors disabled:cursor-not-allowed',
          VARIANT_CLASSES[variant],
          className,
        )}
        {...props}
      >
        {isLoading ? 'Procesando…' : children}
      </button>
    );
  },
);

Button.displayName = 'Button';
