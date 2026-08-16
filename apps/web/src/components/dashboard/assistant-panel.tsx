import { AssistantAvatar } from '@/components/brand/assistant-avatar';
import { DASHBOARD_COLORS } from '@/lib/dashboard-theme';

interface AssistantPanelProps {
  readonly greeting: string;
  readonly suggestions: readonly string[];
}

/**
 * Vista previa del panel del asistente — visual únicamente (el HTML fuente
 * ya lo rotula "Demo"). Las sugerencias y el campo de texto están
 * deshabilitados: no hay motor de respuestas real detrás todavía.
 */
export function AssistantPanel({ greeting, suggestions }: AssistantPanelProps): React.JSX.Element {
  return (
    <div
      className="flex w-full max-w-xs flex-col gap-3 rounded-xl border p-4 shadow-lg"
      style={{ backgroundColor: DASHBOARD_COLORS.cardBg, borderColor: DASHBOARD_COLORS.cardBorder }}
    >
      <div className="flex items-center gap-2">
        <AssistantAvatar size={38} />
        <div className="flex flex-col">
          <span className="text-[13.5px] font-bold" style={{ color: DASHBOARD_COLORS.headingText }}>
            Asistente ContaIA
          </span>
          <span className="text-[11px]" style={{ color: DASHBOARD_COLORS.success }}>
            En línea · Demo
          </span>
        </div>
      </div>

      <p
        className="rounded-lg p-3 text-[12.5px]"
        style={{
          backgroundColor: DASHBOARD_COLORS.accentTint,
          color: DASHBOARD_COLORS.headingText,
        }}
      >
        {greeting}
      </p>

      <div className="flex flex-col gap-1.5">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled
            aria-disabled="true"
            title="Próximamente"
            className="cursor-not-allowed rounded-lg border px-3 py-1.5 text-left text-[12px] font-medium opacity-80"
            style={{ borderColor: DASHBOARD_COLORS.cardBorder, color: DASHBOARD_COLORS.mutedText }}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <input
        type="text"
        disabled
        placeholder="Escribe tu pregunta a ContaIA…"
        aria-label="Escribe tu pregunta a ContaIA (próximamente)"
        className="rounded-lg border px-3 py-2 text-[12.5px]"
        style={{ borderColor: DASHBOARD_COLORS.cardBorder, color: DASHBOARD_COLORS.fadedText }}
      />
    </div>
  );
}
