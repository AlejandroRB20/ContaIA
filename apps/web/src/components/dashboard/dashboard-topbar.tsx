import { AssistantAvatar } from '@/components/brand/assistant-avatar';
import { DASHBOARD_COLORS } from '@/lib/dashboard-theme';

interface DashboardTopbarProps {
  readonly companyName: string;
  readonly companyInitials: string;
  readonly userName: string;
  readonly userRole: string;
  readonly userInitials: string;
  readonly onLogout?: () => void;
  readonly isLoggingOut?: boolean;
  readonly onSwitchCompany?: () => void;
}

/**
 * Topbar visual fiel a `ContaIA Dashboard V2 (standalone) 2.html`: chip de
 * empresa activa, buscador (visual, sin backend de búsqueda todavía), acceso
 * al asistente y menú de usuario. Presentacional — recibe callbacks reales
 * cuando se usa dentro de `/[companyId]`.
 */
export function DashboardTopbar({
  companyName,
  companyInitials,
  userName,
  userRole,
  userInitials,
  onLogout,
  isLoggingOut,
  onSwitchCompany,
}: DashboardTopbarProps): React.JSX.Element {
  return (
    <header
      className="flex h-16 shrink-0 items-center gap-3 border-b bg-white px-5"
      style={{ borderColor: DASHBOARD_COLORS.cardBorder }}
    >
      <div
        className="flex min-w-0 items-center gap-2 rounded-lg border px-3 py-1.5"
        style={{
          backgroundColor: DASHBOARD_COLORS.searchBg,
          borderColor: DASHBOARD_COLORS.cardBorder,
        }}
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
          style={{ backgroundColor: DASHBOARD_COLORS.accent }}
          aria-hidden="true"
        >
          {companyInitials}
        </span>
        <span className="truncate text-[13px] font-semibold" style={{ color: '#344054' }}>
          {companyName}
        </span>
      </div>

      <div className="relative hidden max-w-sm flex-1 md:block">
        <label htmlFor="dashboard-search" className="sr-only">
          Buscar en ContaIA
        </label>
        <input
          id="dashboard-search"
          type="search"
          disabled
          placeholder="Buscar movimientos, documentos, clientes…"
          title="Próximamente"
          className="h-9 w-full cursor-not-allowed rounded-lg border px-3 text-[13px]"
          style={{
            backgroundColor: DASHBOARD_COLORS.searchBg,
            borderColor: DASHBOARD_COLORS.cardBorder,
            color: DASHBOARD_COLORS.fadedText,
          }}
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Asistente ContaIA — próximamente"
          className="hidden cursor-not-allowed items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold opacity-80 sm:inline-flex"
          style={{ backgroundColor: DASHBOARD_COLORS.accentTint, color: DASHBOARD_COLORS.accent }}
        >
          <AssistantAvatar size={20} />
          Preguntar a ContaIA
        </button>

        {onSwitchCompany ? (
          <button
            type="button"
            onClick={onSwitchCompany}
            className="hidden whitespace-nowrap text-[12.5px] font-medium sm:inline-flex"
            style={{ color: DASHBOARD_COLORS.mutedText }}
          >
            Cambiar empresa
          </button>
        ) : null}

        <div className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold text-white"
            style={{ backgroundColor: DASHBOARD_COLORS.accent }}
            aria-hidden="true"
          >
            {userInitials}
          </span>
          <div className="hidden flex-col leading-tight sm:flex">
            <span
              className="text-[12.5px] font-semibold"
              style={{ color: DASHBOARD_COLORS.headingText }}
            >
              {userName}
            </span>
            <span className="text-[11px]" style={{ color: DASHBOARD_COLORS.fadedText }}>
              {userRole}
            </span>
          </div>
        </div>

        {onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="whitespace-nowrap text-[12.5px] font-medium"
            style={{ color: DASHBOARD_COLORS.mutedText }}
          >
            Salir
          </button>
        ) : null}
      </div>
    </header>
  );
}
