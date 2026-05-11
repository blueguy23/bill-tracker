'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { BillResponse, CreateBillDto, UpdateBillDto } from '@/types/bill';
import { PaymentsHero } from './PaymentsHero';
import { UnifiedPaymentsList } from './UnifiedPaymentsList';
import { BillModal } from './BillModal';
import { PaymentsCalendar } from './PaymentsCalendar';

type Tab = 'payments' | 'calendar';

const TABS: { id: Tab; label: string }[] = [
  { id: 'payments', label: 'Payments' },
  { id: 'calendar', label: 'Calendar' },
];

interface Props {
  initialTab: Tab;
  allBills: BillResponse[];
  trackedBills: BillResponse[];
  serverToday: { d: number; m: number; y: number };
}

export function PaymentsShell({ initialTab, allBills, trackedBills, serverToday }: Props) {
  const [tab, setTab]             = useState<Tab>(initialTab);
  const [isModalOpen, setModal]   = useState(false);
  const [editingBill, setEditing] = useState<BillResponse | undefined>();
  const router   = useRouter();
  const pathname = usePathname();

  const allCombined = [...allBills, ...trackedBills];

  function switchTab(next: Tab) {
    setTab(next);
    router.replace(next === 'payments' ? pathname : `${pathname}?tab=${next}`, { scroll: false });
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

      {/* Sticky header */}
      <div style={{ padding: '16px 24px 0', borderBottom: '0.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: 12 }}>Payments</h1>
        <div data-testid="payments-tabs" role="tablist" style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => switchTab(t.id)}
              style={{
                padding: '8px 16px 10px', fontSize: 14, fontFamily: 'var(--sans)',
                fontWeight: tab === t.id ? 500 : 400,
                color: tab === t.id ? 'var(--text)' : 'rgba(255,255,255,0.45)',
                background: 'transparent', border: 'none',
                borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer', transition: 'color 0.15s', marginBottom: -0.5,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'payments' && (
        <div role="tabpanel">
          <PaymentsHero bills={allCombined} today={serverToday} onAddBill={openCreate} />
          <UnifiedPaymentsList
            bills={allCombined}
            today={serverToday}
            onEdit={openEdit}
            onDelete={(id) => void handleDelete(id)}
            onTogglePaid={(id, isPaid) => void handleTogglePaid(id, isPaid)}
            onToggleAutoPay={(id, isAutoPay) => void handleToggleAutoPay(id, isAutoPay)}
          />
        </div>
      )}

      {tab === 'calendar' && (
        <div role="tabpanel" style={{ padding: '16px 20px 24px' }}>
          <PaymentsCalendar bills={allCombined} today={serverToday} onAddBill={openCreate} />
        </div>
      )}

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
