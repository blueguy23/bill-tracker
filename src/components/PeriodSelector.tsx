'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const PERIODS = ['1W', '1M', '3M', 'YTD', '1Y'] as const;
export type Period = typeof PERIODS[number];

export function PeriodSelector({ active }: { active: Period }) {
  const router = useRouter();
  const params = useSearchParams();

  function select(p: Period) {
    const next = new URLSearchParams(params.toString());
    next.set('p', p);
    router.push(`?${next.toString()}`);
  }

  return (
    <div style={{ display: 'flex', background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2 }}>
      {PERIODS.map(p => (
        <PeriodBtn key={p} p={p} active={active === p} onClick={() => select(p)} />
      ))}
    </div>
  );
}

function PeriodBtn({ p, active, onClick }: { p: string; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '5px 11px', borderRadius: 6,
        fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
        fontFamily: 'var(--mono)',
        background: active ? 'var(--surface)' : hov ? 'rgba(237,237,245,0.04)' : 'transparent',
        color: active ? 'var(--text)' : 'var(--text3)',
        transition: 'all .12s',
        boxShadow: active ? '0 0 0 1px var(--border)' : 'none',
      }}
    >
      {p}
    </button>
  );
}
