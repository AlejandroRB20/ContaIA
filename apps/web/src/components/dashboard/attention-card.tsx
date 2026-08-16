import { DASHBOARD_COLORS } from '@/lib/dashboard-theme';

export function AttentionCard({ items }: { items: readonly string[] }): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-2 rounded-xl border p-4"
      style={{ backgroundColor: DASHBOARD_COLORS.cardBg, borderColor: DASHBOARD_COLORS.cardBorder }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: DASHBOARD_COLORS.headingText }}>
          Necesita tu atención
        </span>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Próximamente"
          className="cursor-not-allowed text-xs font-medium opacity-80"
          style={{ color: DASHBOARD_COLORS.accent }}
        >
          Ver todo
        </button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-[12.5px]"
            style={{ color: DASHBOARD_COLORS.mutedText }}
          >
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: DASHBOARD_COLORS.danger }}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
