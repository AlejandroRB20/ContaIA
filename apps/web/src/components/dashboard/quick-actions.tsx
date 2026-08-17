import type { QuickAction } from '@/lib/dashboard-mock-data';
import { DASHBOARD_COLORS } from '@/lib/dashboard-theme';

/** Botonera de accesos rápidos — visual únicamente, sin acciones reales todavía. */
export function QuickActions({ actions }: { actions: readonly QuickAction[] }): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled
          aria-disabled="true"
          title="Próximamente"
          className="cursor-not-allowed rounded-lg border px-3.5 py-2 text-[12.5px] font-semibold opacity-80"
          style={{ borderColor: DASHBOARD_COLORS.cardBorder, color: '#344054' }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
