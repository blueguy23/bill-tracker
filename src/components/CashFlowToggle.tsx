'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const LS_KEY      = 'cashflow_view_mode';
const NORM_GATE_KEY = 'normalized_mode_enabled';

export type CashFlowViewMode = 'actual' | 'normalized';

export function CashFlowToggle({ active }: { active: CashFlowViewMode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [hov, setHov]           = useState<CashFlowViewMode | null>(null);
  const [enabled, setEnabled]   = useState<boolean | null>(null);

  useEffect(() => {
    const normEnabled = localStorage.getItem(NORM_GATE_KEY) === 'true';
    setEnabled(normEnabled);

    if (!normEnabled) {
      // Clear any lingering ?view=normalized so the server re-renders as actual
      if (params.get('view') === 'normalized') {
        const next = new URLSearchParams(params.toString());
        next.delete('view');
        router.replace(next.toString() ? `?${next.toString()}` : window.location.pathname);
      }
      return;
    }

    // Normalized mode is on — restore last view from localStorage
    if (!params.get('view')) {
      const saved = localStorage.getItem(LS_KEY) as CashFlowViewMode | null;
      if (saved && saved !== 'actual') {
        const next = new URLSearchParams(params.toString());
        next.set('view', saved);
        router.replace(`?${next.toString()}`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!enabled) return null;

  function select(mode: CashFlowViewMode) {
    localStorage.setItem(LS_KEY, mode);
    const next = new URLSearchParams(params.toString());
    next.set('view', mode);
    router.push(`?${next.toString()}`);
  }

  const btnStyle = (mode: CashFlowViewMode): React.CSSProperties => ({
    padding: '5px 11px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'var(--mono)',
    background: active === mode ? 'var(--surface)' : hov === mode ? 'rgba(237,237,245,0.04)' : 'transparent',
    color: active === mode ? 'var(--text)' : 'var(--text3)',
    transition: 'all .12s',
    boxShadow: active === mode ? '0 0 0 1px var(--border)' : 'none',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <div
      title="Switch between actual cash outflows and amortized monthly cost"
      style={{ display: 'flex', background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2 }}
    >
      <button
        onClick={() => select('actual')}
        onMouseEnter={() => setHov('actual')}
        onMouseLeave={() => setHov(null)}
        style={btnStyle('actual')}
      >
        Actual
      </button>
      <button
        onClick={() => select('normalized')}
        onMouseEnter={() => setHov('normalized')}
        onMouseLeave={() => setHov(null)}
        style={btnStyle('normalized')}
      >
        Normalized
      </button>
    </div>
  );
}
