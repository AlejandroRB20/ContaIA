import { AiInsightsCard } from '@/components/dashboard/ai-insights-card';
import { AttentionCard } from '@/components/dashboard/attention-card';
import { DocumentStatusCard } from '@/components/dashboard/document-status-card';
import { FinanceChart } from '@/components/dashboard/finance-chart';
import { InvoicesTable } from '@/components/dashboard/invoices-table';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { PeriodSummaryCard } from '@/components/dashboard/period-summary-card';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivityCard } from '@/components/dashboard/recent-activity-card';
import {
  MOCK_AI_INSIGHTS,
  MOCK_ATTENTION_ITEMS,
  MOCK_DASHBOARD_KPIS,
  MOCK_DATE_RANGE_LABEL,
  MOCK_DOCUMENT_STATUS,
  MOCK_FINANCE_CHART,
  MOCK_INVOICES,
  MOCK_PERIOD_LABEL,
  MOCK_PERIOD_SUMMARY,
  MOCK_QUICK_ACTIONS,
  MOCK_RECENT_ACTIVITY,
} from '@/lib/dashboard-mock-data';
import { DASHBOARD_COLORS } from '@/lib/dashboard-theme';

interface DashboardPreviewProps {
  readonly companyName: string;
  readonly periodLabel?: string;
}

/**
 * Contenido del panel financiero — fiel a `ContaIA Dashboard V2 (standalone)
 * 2.html` (EWO-frontend-ui-02). Todos los indicadores, la gráfica, la tabla
 * de facturas y la actividad son datos de MOCK (`lib/dashboard-mock-data.ts`)
 * hasta que exista el contrato de API correspondiente. Compartido entre
 * `/demo` (sin sesión) y `/[companyId]/inicio` (sesión real) — solo cambia
 * el nombre de empresa recibido por props.
 */
export function DashboardPreview({
  companyName,
  periodLabel = MOCK_PERIOD_LABEL,
}: DashboardPreviewProps): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="text-[22px] font-extrabold"
            style={{ color: DASHBOARD_COLORS.headingText }}
          >
            Resumen general
          </h1>
          <p className="text-[13px]" style={{ color: DASHBOARD_COLORS.mutedText }}>
            {periodLabel} · {companyName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-lg border px-3 py-1.5 text-[12.5px] font-medium"
            style={{ borderColor: DASHBOARD_COLORS.cardBorder, color: DASHBOARD_COLORS.mutedText }}
          >
            {MOCK_DATE_RANGE_LABEL}
          </span>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Próximamente"
            className="cursor-not-allowed rounded-lg px-3 py-1.5 text-[12.5px] font-semibold opacity-80"
            style={{ backgroundColor: DASHBOARD_COLORS.accent, color: '#FFFFFF' }}
          >
            Personalizar vista
          </button>
        </div>
      </div>

      <p className="text-xs" style={{ color: DASHBOARD_COLORS.fadedText }}>
        Los indicadores, la gráfica, las facturas y la actividad de este panel son datos de
        demostración — se conectarán a información real cuando el contrato de API correspondiente
        esté disponible.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MOCK_DASHBOARD_KPIS.map((kpi) => (
          <KpiCard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div
          className="flex flex-col gap-2 rounded-xl border p-4 xl:col-span-2"
          style={{
            backgroundColor: DASHBOARD_COLORS.cardBg,
            borderColor: DASHBOARD_COLORS.cardBorder,
          }}
        >
          <h2 className="text-[13px] font-bold" style={{ color: DASHBOARD_COLORS.headingText }}>
            Flujo financiero
          </h2>
          <FinanceChart data={MOCK_FINANCE_CHART} ariaLabel="Ingresos y egresos de demostración" />
        </div>

        <PeriodSummaryCard summary={MOCK_PERIOD_SUMMARY} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AttentionCard items={MOCK_ATTENTION_ITEMS} />
        <div className="flex flex-col justify-center gap-2 xl:col-span-2">
          <QuickActions actions={MOCK_QUICK_ACTIONS} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <InvoicesTable invoices={MOCK_INVOICES} />
        </div>
        <div className="flex flex-col gap-4">
          <AiInsightsCard insights={MOCK_AI_INSIGHTS} />
          <DocumentStatusCard status={MOCK_DOCUMENT_STATUS} />
          <RecentActivityCard items={MOCK_RECENT_ACTIVITY} />
        </div>
      </div>
    </div>
  );
}
