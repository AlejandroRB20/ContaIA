import type { FinanceChartPoint } from '@/lib/dashboard-mock-data';
import { DASHBOARD_COLORS } from '@/lib/dashboard-theme';

/**
 * Gráfica de área + línea de dos series (Ingresos/Egresos), SVG plano — sin
 * librería nueva. Simplificación deliberada frente al diseño fuente: el HTML
 * original tiene un crosshair interactivo al pasar el cursor; aquí se omite
 * (fuera del alcance "visual", sin datos reales que explorar todavía).
 */
interface FinanceChartProps {
  readonly data: readonly FinanceChartPoint[];
  readonly ariaLabel: string;
}

export function FinanceChart({ data, ariaLabel }: FinanceChartProps): React.JSX.Element {
  const width = 640;
  const height = 220;
  const paddingBottom = 24;
  const paddingTop = 12;
  const paddingX = 12;
  const maxValue = Math.max(...data.map((point) => Math.max(point.ingresos, point.egresos)));
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingBottom - paddingTop;

  function pointsFor(key: 'ingresos' | 'egresos'): { x: number; y: number }[] {
    return data.map((point, index) => ({
      x: paddingX + (index / (data.length - 1)) * usableWidth,
      y: paddingTop + usableHeight - (point[key] / maxValue) * usableHeight,
    }));
  }

  const ingresosPoints = pointsFor('ingresos');
  const egresosPoints = pointsFor('egresos');
  const firstX = ingresosPoints[0]?.x ?? paddingX;
  const lastX = ingresosPoints.at(-1)?.x ?? width - paddingX;
  const toPath = (pts: { x: number; y: number }[]): string =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${toPath(ingresosPoints)} L${lastX.toFixed(1)},${height - paddingBottom} L${firstX.toFixed(1)},${height - paddingBottom} Z`;

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs font-medium">
        <span className="flex items-center gap-1.5" style={{ color: DASHBOARD_COLORS.mutedText }}>
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: DASHBOARD_COLORS.accent }}
          />
          Ingresos
        </span>
        <span className="flex items-center gap-1.5" style={{ color: DASHBOARD_COLORS.mutedText }}>
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: DASHBOARD_COLORS.egresosLine }}
          />
          Egresos
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={ariaLabel}
        className="max-w-full"
      >
        <title>{ariaLabel}</title>
        <path d={areaPath} fill={DASHBOARD_COLORS.accent} opacity="0.08" />
        <path
          d={toPath(egresosPoints)}
          fill="none"
          stroke={DASHBOARD_COLORS.egresosLine}
          strokeWidth="2"
        />
        <path
          d={toPath(ingresosPoints)}
          fill="none"
          stroke={DASHBOARD_COLORS.accent}
          strokeWidth="2"
        />
        {data.map((point, index) => (
          <text
            key={point.label}
            x={paddingX + (index / (data.length - 1)) * usableWidth}
            y={height - 6}
            textAnchor="middle"
            fontSize="10.5"
            fill={DASHBOARD_COLORS.fadedText}
          >
            {point.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
