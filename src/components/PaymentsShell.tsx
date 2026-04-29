'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { BillResponse } from '@/types/bill';
import type { DetectedSubscriptionResponse } from '@/types/subscription';
import { BillsView } from './BillsView';
import { RecurringView } from './RecurringView';
import { SubscriptionsView } from './SubscriptionsView';

type Tab = 'bills' | 'subscriptions' | 'recurring';

const TABS: { id: Tab; label: string }[] = [
  { id: 'bills',         label: 'Bills' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'recurring',     label: 'Recurring' },
];

interface Props {
  initialTab: Tab;
  allBills: BillResponse[];
  recurringBills: BillResponse[];
  totalMonthly: number;
  totalPaid: number;
  autoPayCount: number;
  subscriptions: DetectedSubscriptionResponse[];
}

export function PaymentsShell({
  initialTab,
  allBills,
  recurringBills,
  totalMonthly,
  totalPaid,
  autoPayCount,
  subscriptions,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const router   = useRouter();
  const pathname = usePathname();

  function switchTab(next: Tab) {
    setTab(next);
    const url = next === 'bills' ? pathname : `${pathname}?tab=${next}`;
    router.replace(url, { scroll: false });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        padding: '16px 28px 0',
        borderBottom: '1px solid var(--border)',
        position: 'sticky', top: 0, zIndex: 5,
        background: 'var(--bg)',
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: 12 }}>
          Payments
        </h1>
        {/* Tabs */}
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
      <div>
        {tab === 'bills' && (
          <div style={{ padding: '24px 28px' }}>
            <BillsView initialBills={allBills} />
          </div>
        )}
        {tab === 'subscriptions' && (
          <div style={{ padding: '24px 28px' }}>
            <SubscriptionsView initialSubscriptions={subscriptions} />
          </div>
        )}
        {tab === 'recurring' && (
          <RecurringView
            bills={recurringBills}
            totalMonthly={totalMonthly}
            totalPaid={totalPaid}
            autoPayCount={autoPayCount}
          />
        )}
      </div>
    </div>
  );
}
