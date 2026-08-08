import { DocumentsView } from './documents-view';

export const metadata = {
  title: 'Documentos — ContaIA',
  description: 'Carga y gestiona documentos fiscales (CFDI, XML, PDF) de tu empresa en ContaIA.',
};

/**
 * Página de documentos (EWO-005). Recibe companyId del layout padre
 * ([companyId]/layout.tsx) que ya valida sesión, membresía y permisos.
 */
export default function DocumentosPage(): React.JSX.Element {
  return <DocumentsView />;
}
