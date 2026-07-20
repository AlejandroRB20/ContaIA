import Link from 'next/link';

/**
 * Pagina 404 minima (docs/14_INFORMATION_ARCHITECTURE.md seccion 29:
 * "Ruta inexistente" — enlace a Inicio). El Dashboard real llega en un EWO
 * posterior; en EWO-001 "Inicio" es la pagina tecnica de estado.
 */
export default function NotFound(): React.JSX.Element {
  return (
    <main className="gap-md p-lg flex min-h-dvh flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="text-slate-600 dark:text-slate-400">La ruta solicitada no existe en ContaIA.</p>
      <Link href="/" className="text-action underline underline-offset-4">
        Volver al inicio
      </Link>
    </main>
  );
}
