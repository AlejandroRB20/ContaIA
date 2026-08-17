import type { DocumentStatus } from '@/lib/dashboard-mock-data';
import { DASHBOARD_COLORS } from '@/lib/dashboard-theme';

export function DocumentStatusCard({ status }: { status: DocumentStatus }): React.JSX.Element {
  const rows: { label: string; value: number; color: string }[] = [
    {
      label: 'Documentos procesados',
      value: status.procesados,
      color: DASHBOARD_COLORS.headingText,
    },
    { label: 'Pendientes', value: status.pendientes, color: DASHBOARD_COLORS.warning },
    { label: 'Con incidencia', value: status.conIncidencia, color: DASHBOARD_COLORS.danger },
  ];

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4"
      style={{ backgroundColor: DASHBOARD_COLORS.cardBg, borderColor: DASHBOARD_COLORS.cardBorder }}
    >
      <span className="text-[13px] font-bold" style={{ color: DASHBOARD_COLORS.headingText }}>
        Estado documental
      </span>
      <dl className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-[12.5px]">
            <dt style={{ color: DASHBOARD_COLORS.mutedText }}>{row.label}</dt>
            <dd className="font-bold" style={{ color: row.color }}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Próximamente"
        className="cursor-not-allowed self-start rounded-lg border px-3 py-1.5 text-[12px] font-semibold opacity-80"
        style={{ borderColor: DASHBOARD_COLORS.cardBorder, color: DASHBOARD_COLORS.mutedText }}
      >
        Ver documentos
      </button>
    </div>
  );
}
