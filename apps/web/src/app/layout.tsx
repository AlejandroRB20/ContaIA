import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { QueryProvider } from '@/lib/query-provider';

import './globals.css';

export const metadata: Metadata = {
  title: 'ContaIA — Estado de la plataforma',
  description:
    'Copiloto inteligente para contadores, despachos, empresas y estudiantes. Plataforma en construccion (EWO-001: base tecnica).',
};

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <html lang="es">
      <body className="bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
