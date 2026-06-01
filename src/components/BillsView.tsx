'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';
import type { BillResponse, CreateBillDto, UpdateBillDto } from '@/types/bill';
import { BillTable } from './BillTable';
import { BillModal } from './BillModal';

interface BillsViewProps {
  initialBills: BillResponse[];
  hideAddButton?: boolean;
}

export interface BillsViewHandle {
  openCreate: () => void;
}

export const BillsView = forwardRef<BillsViewHandle, BillsViewProps>(function BillsView({ initialBills, hideAddButton }, ref) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillResponse | undefined>(undefined);

  function openCreate() {
    setEditingBill(undefined);
    setIsModalOpen(true);
  }

  useImperativeHandle(ref, () => ({ openCreate }));

  function openEdit(bill: BillResponse) {
    setEditingBill(bill);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingBill(undefined);
  }

  async function handleSave(data: CreateBillDto | UpdateBillDto) {
    if (editingBill) {
      const res = await fetch(`/api/v1/bills/${editingBill._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        let message = 'Failed to update bill';
        try { const json = await res.json() as { error?: string }; message = json.error ?? message; } catch { /* empty body */ }
        throw new Error(message);
      }
    } else {
      const res = await fetch('/api/v1/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        let message = `Failed to create bill (${res.status})`;
        try { const json = await res.json() as { error?: string }; message = json.error ?? message; } catch { /* empty body */ }
        throw new Error(message);
      }
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
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPaid }),
    });
    if (!res.ok) { alert('Failed to update bill status'); return; }
    router.refresh();
  }

  async function handleToggleAutoPay(id: string, isAutoPay: boolean) {
    const res = await fetch(`/api/v1/bills/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAutoPay: !isAutoPay }),
    });
    if (!res.ok) { alert('Failed to update autopay'); return; }
    router.refresh();
  }

  return (
    <div>
      {!hideAddButton && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>
            {initialBills.length === 0 ? 'NO BILLS' : `${initialBills.length} BILL${initialBills.length !== 1 ? 'S' : ''}`}
          </div>
          <button
            onClick={openCreate}
            data-testid="add-bill-btn"
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 600 }}
          >
            + Add Bill
          </button>
        </div>
      )}

      <BillTable
        bills={initialBills}
        onEdit={openEdit}
        onDelete={handleDelete}
        onTogglePaid={handleTogglePaid}
        onToggleAutoPay={handleToggleAutoPay}
      />

      <BillModal
        mode={editingBill ? 'edit' : 'create'}
        initialData={editingBill}
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSave}
      />
    </div>
  );
});

