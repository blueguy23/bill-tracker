'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { BillResponse, CreateBillDto, UpdateBillDto } from '@/types/bill';
import type { DetectedSubscriptionResponse } from '@/types/subscription';
import { PaymentsHero } from './PaymentsHero';
import { BillListPanel } from './BillListPanel';
import { BillModal } from './BillModal';
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

export function PaymentsShell({ initialTab, allBills, recurringBills, totalMonthly, totalPaid, autoPayCount, subscriptions }: Props) {
  const [tab, setTab]             = useState<Tab>(initialTab);
  const [isModalOpen, setModal]   = useState(false);
  const [editingBill, setEditing] = useState<BillResponse | undefined>();
  const router   = useRouter();
  const pathname = usePathname();

  function switchTab(next: Tab) {
    setTab(next);
    router.replace(next === 'bills' ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  }

  function openCreate() { setEditing(undefined); setModal(true); }
  function openEdit(bill: BillResponse) { setEditing(bill); setModal(true); }
  function closeModal() { setModal(false); setEditing(undefined); }

  async function handleSave(data: CreateBillDto | UpdateBillDto) {
    if (editingBill) {
      const res = await fetch(`/api/v1/bills/${editingBill._id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? 'Failed to update bill'); }
    } else {
      const res = await fetch('/api/v1/bills', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? `Failed to create bill (${res.status})`); }
    }
    router.refresh();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/v1/bills/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('Failed to delete bill'); return; }
    router.refresh();
  }

  async function handleTogglePaid(id: string, isPaid: boolean) {
    const res = await fetch(`/api/v1/bills/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isPaid }),
    });
    if (!res.ok) { alert('Failed to update bill status'); return; }
    router.refresh();
  }

  async function handleToggleAutoPay(id: string, isAutoPay: boolean) {
    const res = await fetch(`/api/v1/bills/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isAutoPay: !isAutoPay }),
    });
    if (!res.ok) { alert('Failed to update autopay'); return; }
    router.refresh();
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sticky header: title + tab bar */}
      <div style={{ padding: '16px 28px 0', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: 12 }}>Payments</h1>
        <div data-testid="payments-tabs" style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => switchTab(t.id)} style={{
              padding: '8px 16px', fontSize: 13, fontWeight: tab === t.id ? 600 : 500,
              fontFamily: 'var(--sans)',
              color: tab === t.id ? 'var(--gold)' : 'var(--text3)',
              background: 'transparent', border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
              cursor: 'pointer', transition: 'all .1s', marginBottom: -1,
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero — shown on all tabs */}
      <div style={{ padding: '20px 28px 0' }}>
        <PaymentsHero allBills={allBills} onAddBill={openCreate} />
      </div>

      {/* Tab content */}
      <div style={{ padding: '16px 28px 24px' }}>
        {tab === 'bills' && (
          <BillListPanel
            bills={allBills}
            onEdit={openEdit}
            onDelete={(id) => void handleDelete(id)}
            onTogglePaid={(id, isPaid) => void handleTogglePaid(id, isPaid)}
            onToggleAutoPay={(id, isAutoPay) => void handleToggleAutoPay(id, isAutoPay)}
          />
        )}
        {tab === 'subscriptions' && <SubscriptionsView initialSubscriptions={subscriptions} />}
        {tab === 'recurring' && (
          <RecurringView bills={recurringBills} totalMonthly={totalMonthly} totalPaid={totalPaid} autoPayCount={autoPayCount} />
        )}
      </div>

      <BillModal
        mode={editingBill ? 'edit' : 'create'}
        initialData={editingBill}
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSave}
      />
    </div>
  );
}
