import { AssistantAvatar } from '@/components/brand/assistant-avatar';
import type { AiInsight, AiInsightTone } from '@/lib/dashboard-mock-data';
import { DASHBOARD_COLORS } from '@/lib/dashboard-theme';

const TONE_ICON: Record<AiInsightTone, string> = { up: '↑', warning: '⚠', down: '↓' };
const TONE_COLOR: Record<AiInsightTone, string> = {
  up: DASHBOARD_COLORS.warning,
  warning: DASHBOARD_COLORS.danger,
  down: DASHBOARD_COLORS.accent,
};

export function AiInsightsCard({
  insights,
}: {
  insights: readonly AiInsight[];
}): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4"
      style={{ backgroundColor: DASHBOARD_COLORS.cardBg, borderColor: DASHBOARD_COLORS.cardBorder }}
    >
      <div className="flex items-center gap-2">
        <AssistantAvatar size={24} />
        <span className="text-[13px] font-bold" style={{ color: DASHBOARD_COLORS.headingText }}>
          ContaIA AI
        </span>
      </div>
      <span className="text-[12.5px]" style={{ color: DASHBOARD_COLORS.mutedText }}>
        Detecté {insights.length} situaciones relevantes
      </span>
      <ul className="flex flex-col gap-2">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className="flex items-center gap-2 text-[12.5px]"
            style={{ color: DASHBOARD_COLORS.headingText }}
          >
            <span
              aria-hidden="true"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
              style={{
                backgroundColor: DASHBOARD_COLORS.accentTint,
                color: TONE_COLOR[insight.tone],
              }}
            >
              {TONE_ICON[insight.tone]}
            </span>
            {insight.text}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Próximamente"
          className="cursor-not-allowed rounded-lg px-3 py-1.5 text-[12px] font-semibold opacity-80"
          style={{ backgroundColor: DASHBOARD_COLORS.accent, color: '#FFFFFF' }}
        >
          Ver análisis
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Próximamente"
          className="cursor-not-allowed rounded-lg border px-3 py-1.5 text-[12px] font-semibold opacity-80"
          style={{ borderColor: DASHBOARD_COLORS.cardBorder, color: DASHBOARD_COLORS.mutedText }}
        >
          Preguntar
        </button>
      </div>
    </div>
  );
}
