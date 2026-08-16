import type { ActivityItem } from '@/lib/dashboard-mock-data';
import { DASHBOARD_COLORS } from '@/lib/dashboard-theme';

export function RecentActivityCard({
  items,
}: {
  items: readonly ActivityItem[];
}): React.JSX.Element {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4"
      style={{ backgroundColor: DASHBOARD_COLORS.cardBg, borderColor: DASHBOARD_COLORS.cardBorder }}
    >
      <span className="text-[13px] font-bold" style={{ color: DASHBOARD_COLORS.headingText }}>
        Actividad reciente
      </span>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-0.5 text-[12.5px]">
            <span style={{ color: DASHBOARD_COLORS.headingText }}>{item.text}</span>
            <span style={{ color: DASHBOARD_COLORS.fadedText }} className="text-[11px]">
              {item.time}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
