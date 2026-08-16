/**
 * Logotipo oficial de ContaIA: icono con gráfica (identidad de marca,
 * docs/13_DESIGN_SYSTEM.md). No es el asistente de IA — ese es un elemento
 * visual distinto (`assistant-avatar.tsx`) y nunca debe usarse como logotipo.
 */
interface LogoIconProps {
  readonly className?: string;
  readonly withWordmark?: boolean;
  /** Fondo oscuro (p. ej. sidebar navy) — usa texto blanco en vez de `text-foreground`. */
  readonly onDark?: boolean;
}

export function LogoIcon({
  className,
  withWordmark = true,
  onDark = false,
}: LogoIconProps): React.JSX.Element {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="ContaIA"
      >
        <rect width="28" height="28" rx="7" fill="#1B3A6B" />
        <path
          d="M6 19.5L11 13.5L15 16.5L22 8"
          stroke="#F7F8FA"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M22 8H17.5" stroke="#2F6FED" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M22 8V12.5" stroke="#2F6FED" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      {withWordmark ? (
        <span
          className={
            onDark
              ? 'text-base font-semibold tracking-tight text-white'
              : 'text-foreground dark:text-foreground-dark text-base font-semibold tracking-tight'
          }
        >
          ContaIA
        </span>
      ) : null}
    </span>
  );
}
