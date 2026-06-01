'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { BillResponse, CreateBillDto, UpdateBillDto } from '@/types/bill';
import { PaymentsHero } from './PaymentsHero';
import { UnifiedPaymentsList } from './UnifiedPaymentsList';
import { BillModal } from './BillModal';
import { PaymentsCalendar } from './PaymentsCalendar';
import { PendingConfirmationBanner } from './PendingConfirmationBanner';

type ViewMode = 'list' | 'calendar';

interface Props {
  initialTab: string;
  allBills: BillResponse[];
  trackedBills: BillResponse[];
  serverToday: { d: number; m: number; y: number };
}

export function PaymentsShell({ initialTab, allBills, trackedBills, serverToday }: Props) {
  const [view, setView] = useState<ViewMode>(initialTab === 'calendar' ? 'calendar' : 'list');
  const [isModalOpen, setModal]   = useState(false);
  const [editingBill, setEditing] = useState<BillResponse | undefined>();
  const router   = useRouter();
  const pathname = usePathname();

  const allCombined = [...allBills, ...trackedBills];

  function switchView(next: ViewMode) {
    setView(next);
    router.replace(next === 'list' ? pathname : `${pathname}?tab=calendar`, { scroll: false });
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
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid var(--border)', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Bills & Payments</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: 2 }}>
          <button
            onClick={() => switchView('list')}
            title="List view"
            aria-label="List view"
            style={{
              width: 30, height: 28, borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: view === 'list' ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none', cursor: 'pointer', transition: 'background 0.15s',
              color: view === 'list' ? 'var(--text)' : 'var(--text3)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="4" x2="14" y2="4" />
              <line x1="2" y1="8" x2="14" y2="8" />
              <line x1="2" y1="12" x2="14" y2="12" />
            </svg>
          </button>
          <button
            onClick={() => switchView('calendar')}
            title="Calendar view"
            aria-label="Calendar view"
            style={{
              width: 30, height: 28, borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: view === 'calendar' ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: 'none', cursor: 'pointer', transition: 'background 0.15s',
              color: view === 'calendar' ? 'var(--text)' : 'var(--text3)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="12" height="11" rx="1.5" />
              <line x1="2" y1="7" x2="14" y2="7" />
              <line x1="5" y1="1.5" x2="5" y2="4" />
              <line x1="11" y1="1.5" x2="11" y2="4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {view === 'list' && (
        <div>
          <PaymentsHero bills={allCombined} today={serverToday} onAddBill={openCreate} />
          <div style={{ padding: '0 20px' }}>
            <PendingConfirmationBanner />
          </div>
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

      {view === 'calendar' && (
        <div style={{ padding: '16px 20px 24px' }}>
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
