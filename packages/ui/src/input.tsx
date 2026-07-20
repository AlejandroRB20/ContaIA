import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from './cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

/** docs/13_DESIGN_SYSTEM.md seccion 18 — estado de error via borde + color, nunca solo color. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={hasError}
        className={cn(
          'bg-surface px-sm text-foreground placeholder:text-muted-foreground focus:ring-action disabled:bg-page disabled:text-disabled dark:bg-surface-dark dark:text-foreground-dark dark:placeholder:text-muted-foreground-dark h-10 w-full rounded-sm border text-sm focus:outline-none focus:ring-2 disabled:cursor-not-allowed',
          hasError ? 'border-danger' : 'border-border dark:border-border-dark',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
