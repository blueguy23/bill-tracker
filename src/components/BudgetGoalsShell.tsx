'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { CategoryBudgetSummary } from '@/types/budget';
import { BudgetView } from './BudgetView';
import { GoalsView } from './GoalsView';

type Tab = 'budget' | 'goals';

const TABS: { id: Tab; label: string }[] = [
  { id: 'budget', label: 'Budget' },
  { id: 'goals',  label: 'Goals' },
];

interface Props {
  initialTab: Tab;
  budgetData: { month: string; budgets: CategoryBudgetSummary[] };
}

export function BudgetGoalsShell({ initialTab, budgetData }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const router   = useRouter();
  const pathname = usePathname();

  function switchTab(next: Tab) {
    setTab(next);
    const url = next === 'budget' ? pathname : `${pathname}?tab=${next}`;
    router.replace(url, { scroll: false });
  }

  return (
    <>
      {/* Header */}
      <div style={{
        padding: '16px 28px 0',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 5,
        background: 'var(--bg)',
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: 12 }}>
          Budget &amp; Goals
        </h1>
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              style={{
                padding: '8px 16px',
                fontSize: 13, fontWeight: tab === t.id ? 600 : 500,
                fontFamily: 'var(--sans)',
                color: tab === t.id ? 'var(--text)' : 'var(--text3)',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all .1s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'budget' && <BudgetView initialData={budgetData} />}
      {tab === 'goals'  && (
        <div style={{ padding: '24px 28px' }}>
          <GoalsView />
        </div>
      )}
    </>
  );
}
