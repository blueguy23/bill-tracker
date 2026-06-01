'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface Props {
  activeView: 'payperiod' | 'monthly';
}

export function DashboardViewToggle({ activeView }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function switchView(view: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    if (view === 'monthly') params.delete('offset');
    router.push(`/?${params.toString()}`);
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end', marginBottom: 16,
    }}>
      <div style={{
        display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 8, padding: 3, gap: 2,
      }}>
        {(['payperiod', 'monthly'] as const).map(v => (
          <button
            key={v}
            onClick={() => switchView(v)}
            style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              cursor: 'pointer', border: 'none', fontFamily: 'var(--sans)',
              background: activeView === v ? 'var(--raised)' : 'transparent',
              color: activeView === v ? 'var(--text)' : 'var(--text3)',
              boxShadow: activeView === v ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {v === 'payperiod' ? 'Pay Period' : 'Monthly'}
          </button>
        ))}
      </div>
    </div>
  );
}
