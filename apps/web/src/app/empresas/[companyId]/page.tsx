import Link from 'next/link';

import { CompanyDetail } from './company-detail';

export const metadata = { title: 'Empresa — ContaIA' };

export default function CompanyDetailPage(): React.JSX.Element {
  return (
    <main className="gap-lg p-lg mx-auto flex min-h-dvh max-w-lg flex-col">
      <div className="gap-xs flex flex-col">
        <Link href="/empresas" className="text-action text-sm hover:underline">
          ← Tus empresas
        </Link>
        <h1 className="text-foreground dark:text-foreground-dark text-lg font-medium">
          Perfil de la empresa
        </h1>
      </div>
      <CompanyDetail />
    </main>
  );
}
