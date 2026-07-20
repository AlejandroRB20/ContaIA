import Link from 'next/link';

import { CompaniesList } from './companies-list';

export const metadata = { title: 'Tus empresas — ContaIA' };

export default function CompaniesPage(): React.JSX.Element {
  return (
    <main className="gap-lg p-lg mx-auto flex min-h-dvh max-w-2xl flex-col">
      <div className="gap-md flex items-center justify-between">
        <div className="gap-xs flex flex-col">
          <h1 className="text-brand text-2xl font-semibold dark:text-white">ContaIA</h1>
          <h2 className="text-foreground dark:text-foreground-dark text-lg font-medium">
            Tus empresas
          </h2>
        </div>
        <Link
          href="/crear-empresa"
          className="border-border bg-surface px-md text-foreground hover:bg-page dark:border-border-dark dark:bg-surface-dark dark:text-foreground-dark inline-flex h-10 items-center justify-center rounded-sm border text-sm font-medium"
        >
          Crear empresa
        </Link>
      </div>
      <CompaniesList />
    </main>
  );
}
