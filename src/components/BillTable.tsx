'use client';

import { useState } from 'react';
import type { BillResponse } from '@/types/bill';
import { CategoryBadge } from './CategoryBadge';
import { PaymentHistoryModal } from './PaymentHistoryModal';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

type DueDateStatus = 'overdue' | 'soon' | 'upcoming';

function getDueDateStatus(bill: BillResponse): DueDateStatus {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (typeof bill.dueDate === 'number') {
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const clampedDay = Math.min(bill.dueDate, lastDay);
    const due = new Date(today.getFullYear(), today.getMonth(), clampedDay);
    const diff = (due.getTime() - today.getTime()) / 86400000;
    if (diff < 0) return 'overdue';
    if (diff <= 7) return 'soon';
    return 'upcoming';
  }

  const due = new Date(bill.dueDate);
  const diff = (due.getTime() - today.getTime()) / 86400000;
  if (diff < 0) return 'overdue';
  if (diff <= 7) return 'soon';
  return 'upcoming';
}

function formatDueDate(dueDate: string | number): string {
  if (typeof dueDate === 'number') return `Day ${dueDate}`;
  const d = new Date(dueDate);
  return isNaN(d.getTime())
    ? String(dueDate)
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const DUE_BADGE: Record<DueDateStatus, string> = {
  overdue:  'text-[11px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full',
  soon:     'text-[11px] font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full',
  upcoming: 'text-[11px] font-medium text-sky-900 bg-depth-800 px-2 py-0.5 rounded-full',
};

const DUE_LABEL: Record<DueDateStatus, string> = {
  overdue: 'Overdue',
  soon: 'Due soon',
  upcoming: 'Upcoming',
};

interface BillTableProps {
  bills: BillResponse[];
  onEdit: (bill: BillResponse) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string, isPaid: boolean) => void;
}

export function BillTable({ bills, onEdit, onDelete, onTogglePaid }: BillTableProps) {
  const [historyBill, setHistoryBill] = useState<{ id: string; name: string } | null>(null);

  if (bills.length === 0) {
    return (
      <div className="rounded-xl border border-teal-900/40 bg-depth-900 p-16 text-center">
        <p className="text-sky-700 text-sm">No bills yet</p>
        <p className="text-sky-900 text-xs mt-1">Click &ldquo;Add Bill&rdquo; to get started</p>
      </div>
    );
  }

  return (
    <>
    <div className="rounded-xl border border-teal-900/40 bg-depth-900 overflow-hidden">
      <table className="min-w-full" data-testid="bills-table">
        <thead>
          <tr className="border-b border-teal-900/40">
            {['Name', 'Amount', 'Due Date', 'Category', 'Status', ''].map((h) => (
              <th key={h} className={`px-5 py-3.5 text-[11px] font-semibold text-sky-700 uppercase tracking-wider ${h === '' ? 'text-right' : 'text-left'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {bills.map((bill) => {
            const status = getDueDateStatus(bill);
            return (
              <tr key={bill._id} className="group hover:bg-white/[0.02] transition-colors">

                <td className="px-5 py-4">
                  <p className="font-medium text-white text-sm">{bill.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {bill.isAutoPay && <span className="text-[11px] font-medium text-cyan-400">AutoPay</span>}
                    {bill.isRecurring && <span className="text-[11px] text-sky-900 capitalize">{bill.recurrenceInterval}</span>}
                  </div>
                </td>

                <td className="px-5 py-4">
                  <span className="text-base font-semibold text-white tabular-nums">{USD.format(bill.amount)}</span>
                </td>

                <td className="px-5 py-4" suppressHydrationWarning>
                  <p className="text-sm text-sky-300">{formatDueDate(bill.dueDate)}</p>
                  {!bill.isPaid && (
                    <span className={`mt-1 inline-block ${DUE_BADGE[status]}`}>
                      {DUE_LABEL[status]}
                    </span>
                  )}
                </td>

                <td className="px-5 py-4">
                  <CategoryBadge category={bill.category} />
                </td>

                <td className="px-5 py-4">
                  <button
                    onClick={() => onTogglePaid(bill._id, !bill.isPaid)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      bill.isPaid
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-depth-800 text-sky-500 hover:bg-depth-700 hover:text-sky-100'
                    }`}
                    data-testid={`toggle-paid-${bill._id}`}
                  >
                    {bill.isPaid && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                    {bill.isPaid ? 'Paid' : 'Unpaid'}
                  </button>
                </td>

                <td className="px-5 py-4">
                  <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setHistoryBill({ id: bill._id, name: bill.name })}
                      className="text-xs font-medium text-sky-700 hover:text-sky-300 transition-colors"
                      data-testid={`history-${bill._id}`}
                    >
                      History
                    </button>
                    <button
                      onClick={() => onEdit(bill)}
                      className="text-xs font-medium text-sky-500 hover:text-white transition-colors"
                      data-testid={`edit-${bill._id}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { if (window.confirm(`Delete "${bill.name}"?`)) onDelete(bill._id); }}
                      className="text-xs font-medium text-sky-900 hover:text-red-400 transition-colors"
                      data-testid={`delete-${bill._id}`}
                    >
                      Delete
                    </button>
                  </div>
                </td>

              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    <PaymentHistoryModal
      billId={historyBill?.id ?? ''}
      billName={historyBill?.name ?? ''}
      isOpen={historyBill !== null}
      onClose={() => setHistoryBill(null)}
    />
    </>
  );
}
