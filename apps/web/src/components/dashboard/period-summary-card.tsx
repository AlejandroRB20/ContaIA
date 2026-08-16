import type { PeriodSummary } from '@/lib/dashboard-mock-data';
import { DASHBOARD_COLORS } from '@/lib/dashboard-theme';

function Stat({ value, label }: { value: number; label: string }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-lg font-extrabold" style={{ color: DASHBOARD_COLORS.headingText }}>
        {value}
      </span>
      <span className="text-[11px]" style={{ color: DASHBOARD_COLORS.fadedText }}>
        {label}
      </span>
    </div>
  );
}

export function PeriodSummaryCard({ summary }: { summary: PeriodSummary }): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4"
      style={{ backgroundColor: DASHBOARD_COLORS.cardBg, borderColor: DASHBOARD_COLORS.cardBorder }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase"
          style={{ color: DASHBOARD_COLORS.mutedText }}
        >
          Periodo actual
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
          style={{ backgroundColor: DASHBOARD_COLORS.successTint, color: DASHBOARD_COLORS.success }}
        >
          {summary.status}
        </span>
      </div>
      <span className="text-sm font-bold" style={{ color: DASHBOARD_COLORS.headingText }}>
        {summary.label}
      </span>
      <div className="grid grid-cols-2 gap-3">
        <Stat value={summary.documentos} label="Documentos" />
        <Stat value={summary.movimientos} label="Movimientos" />
        <Stat value={summary.pendientes} label="Pendientes" />
        <Stat value={summary.revisados} label="Revisados" />
      </div>
    </div>
  );
}
