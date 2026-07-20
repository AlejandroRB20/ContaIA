import { CreateCompanyForm } from './create-company-form';

export const metadata = { title: 'Crear empresa — ContaIA' };

export default function CreateCompanyPage(): React.JSX.Element {
  return (
    <main className="gap-lg p-lg mx-auto flex min-h-dvh max-w-lg flex-col">
      <div className="gap-xs flex flex-col">
        <h1 className="text-brand text-2xl font-semibold dark:text-white">ContaIA</h1>
        <h2 className="text-foreground dark:text-foreground-dark text-lg font-medium">
          Crear empresa
        </h2>
      </div>
      <CreateCompanyForm />
    </main>
  );
}
