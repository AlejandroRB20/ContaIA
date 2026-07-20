import type { HTMLAttributes } from 'react';

import { cn } from './cn';

/** docs/13_DESIGN_SYSTEM.md seccion 22 — contenedor base tipo "Estado". */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn(
        'border-border bg-surface p-lg dark:border-border-dark dark:bg-surface-dark rounded-md border shadow-sm',
        className,
      )}
      {...props}
    />
  );
}
