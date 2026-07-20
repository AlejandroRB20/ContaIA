import { Card } from '@contaia/ui';
import type { ReactNode } from 'react';

interface AuthShellProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** Envoltura visual comun de las pantallas de Auth (EWO-002). */
export function AuthShell({ title, description, children }: AuthShellProps): React.JSX.Element {
  return (
    <main className="gap-lg p-lg mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center">
      <div className="gap-xs flex flex-col items-center text-center">
        <h1 className="text-brand text-2xl font-semibold dark:text-white">ContaIA</h1>
        <h2 className="text-foreground dark:text-foreground-dark text-lg font-medium">{title}</h2>
        {description ? (
          <p className="text-muted-foreground dark:text-muted-foreground-dark text-sm">
            {description}
          </p>
        ) : null}
      </div>
      <Card className="w-full">{children}</Card>
    </main>
  );
}
