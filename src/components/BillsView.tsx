'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BillResponse, CreateBillDto, UpdateBillDto } from '@/types/bill';
import { BillTable } from './BillTable';
import { BillModal } from './BillModal';

interface BillsViewProps {
  initialBills: BillResponse[];
}

export function BillsView({ initialBills }: BillsViewProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillResponse | undefined>(undefined);

  function openCreate() {
    setEditingBill(undefined);
    setIsModalOpen(true);
  }

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

  return (
    <div>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">All Bills</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {initialBills.length === 0 ? 'No bills' : `${initialBills.length} bill${initialBills.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
          data-testid="add-bill-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Bill
        </button>
      </div>

      <BillTable
        bills={initialBills}
        onEdit={openEdit}
        onDelete={handleDelete}
        onTogglePaid={handleTogglePaid}
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
}
