'use client';

interface MobileHeaderProps {
  onMenuOpen: () => void;
}

export function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
  return (
    <header className="sm:hidden" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 30 }}>
      <button
        onClick={onMenuOpen}
        style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: 'transparent', border: 'none', color: 'var(--text2)', cursor: 'pointer' }}
        aria-label="Open menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(145deg, oklch(0.22 0.08 265) 0%, oklch(0.14 0.06 285) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid oklch(0.68 0.22 265 / 0.3)' }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <rect x="5" y="2" width="11" height="14" rx="2" fill="oklch(0.68 0.22 265)" opacity="0.25" />
            <rect x="3" y="4" width="11" height="14" rx="2" fill="oklch(0.68 0.22 265)" opacity="0.5" />
            <path d="M5.5 14.5 L7.5 11.5 L9.5 12.8 L12 9" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--sans)', letterSpacing: '-.03em' }}>Folio</span>
      </div>

      <div style={{ width: 36 }} />
    </header>
  );
}
