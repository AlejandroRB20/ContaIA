/**
 * Personaje asistente de IA de ContaIA: figura cuadrada con "traje".
 * Uso exclusivo para representar al asistente conversacional (botón,
 * tarjetas de IA) — nunca como logotipo principal (`logo-icon.tsx`).
 */
interface AssistantAvatarProps {
  readonly className?: string;
  readonly size?: number;
}

export function AssistantAvatar({ className, size = 40 }: AssistantAvatarProps): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Asistente ContaIA"
      className={className}
    >
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#6D5BD0" />
      <rect x="10" y="21" width="20" height="14" rx="4" fill="#1B3A6B" />
      <path d="M17 21L20 25L23 21" stroke="#F7F8FA" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="11" y="7" width="18" height="15" rx="5" fill="#F7F8FA" />
      <rect x="15.5" y="13" width="3" height="3.4" rx="1" fill="#1B3A6B" />
      <rect x="21.5" y="13" width="3" height="3.4" rx="1" fill="#1B3A6B" />
      <path
        d="M16 18.5C17.2 19.6 22.8 19.6 24 18.5"
        stroke="#1B3A6B"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
