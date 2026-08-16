import type { DashboardKpi } from '@/lib/dashboard-mock-data';
import { DASHBOARD_COLORS } from '@/lib/dashboard-theme';

export function KpiCard({ kpi }: { kpi: DashboardKpi }): React.JSX.Element {
  const deltaColor = kpi.deltaTone === 'up' ? DASHBOARD_COLORS.success : DASHBOARD_COLORS.danger;

  return (
    <div
      className="flex flex-col gap-1 rounded-xl border p-4"
      style={{ backgroundColor: DASHBOARD_COLORS.cardBg, borderColor: DASHBOARD_COLORS.cardBorder }}
    >
      <div className="flex items-center gap-1">
        <span
          className="text-xs font-semibold"
          style={{ color: DASHBOARD_COLORS.mutedText, fontSize: '12.5px' }}
        >
          {kpi.label}
        </span>
        {kpi.helpText ? (
          <span
            title={kpi.helpText}
            aria-label={kpi.helpText}
            className="flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full text-[9px] font-bold"
            style={{ backgroundColor: DASHBOARD_COLORS.accentTint, color: DASHBOARD_COLORS.accent }}
          >
            i
          </span>
        ) : null}
      </div>
      <span
        className="font-extrabold tabular-nums"
        style={{ color: DASHBOARD_COLORS.headingText, fontSize: '18px' }}
      >
        {kpi.value}
      </span>
      <span className="text-[11.5px] font-bold" style={{ color: deltaColor }}>
        {kpi.delta}{' '}
        <span className="font-normal" style={{ color: DASHBOARD_COLORS.fadedText }}>
          vs. mes anterior
        </span>
      </span>
    </div>
  );
}
