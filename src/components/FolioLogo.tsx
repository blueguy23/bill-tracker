interface FolioLogoProps {
  size?: number;
  withWordmark?: boolean;
}

export function FolioLogo({ size = 22, withWordmark = true }: FolioLogoProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-label="Folio" style={{ flexShrink: 0 }}>
        <defs>
          <linearGradient id="folio-ember" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F2A988" />
            <stop offset="1" stopColor="#C9624A" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#folio-ember)" />
        <path
          d="M7 7h10M7 12h7M7 17h4"
          stroke="#0A0E15"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      {withWordmark && (
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.2, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Folio</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: 1.4, color: 'var(--text3)', marginTop: 4 }}>
            PERSONAL FINANCE
          </span>
        </span>
      )}
    </span>
  );
}
