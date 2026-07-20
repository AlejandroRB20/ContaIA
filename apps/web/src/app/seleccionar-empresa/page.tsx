import { Suspense } from 'react';

import { CompanySelector } from './company-selector';

export const metadata = { title: 'Selecciona una Empresa — ContaIA' };

export default function SelectCompanyPage(): React.JSX.Element {
  return (
    <main className="gap-lg p-lg mx-auto flex min-h-dvh max-w-lg flex-col">
      <div className="gap-xs flex flex-col">
        <h1 className="text-brand text-2xl font-semibold dark:text-white">ContaIA</h1>
        <h2 className="text-foreground dark:text-foreground-dark text-lg font-medium">
          Selecciona una Empresa
        </h2>
      </div>
      <Suspense fallback={null}>
        <CompanySelector />
      </Suspense>
    </main>
  );
}
