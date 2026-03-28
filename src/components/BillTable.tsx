'use client';

import type { BillResponse } from '@/types/bill';
import { CategoryBadge } from './CategoryBadge';

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
  upcoming: 'text-[11px] font-medium text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full',
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
  if (bills.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900 p-16 text-center">
        <p className="text-zinc-500 text-sm">No bills yet</p>
        <p className="text-zinc-600 text-xs mt-1">Click &ldquo;Add Bill&rdquo; to get started</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-900 overflow-hidden">
      <table className="min-w-full" data-testid="bills-table">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {['Name', 'Amount', 'Due Date', 'Category', 'Status', ''].map((h) => (
              <th key={h} className={`px-5 py-3.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider ${h === '' ? 'text-right' : 'text-left'}`}>
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
                  <p className="font-medium text-zinc-100 text-sm">{bill.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {bill.isAutoPay && <span className="text-[11px] font-medium text-blue-400">AutoPay</span>}
                    {bill.isRecurring && <span className="text-[11px] text-zinc-600 capitalize">{bill.recurrenceInterval}</span>}
                  </div>
                </td>

                <td className="px-5 py-4">
                  <span className="text-base font-semibold text-white tabular-nums">{USD.format(bill.amount)}</span>
                </td>

                <td className="px-5 py-4" suppressHydrationWarning>
                  <p className="text-sm text-zinc-300">{formatDueDate(bill.dueDate)}</p>
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
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
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
                      onClick={() => onEdit(bill)}
                      className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                      data-testid={`edit-${bill._id}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => { if (window.confirm(`Delete "${bill.name}"?`)) onDelete(bill._id); }}
                      className="text-xs font-medium text-zinc-600 hover:text-red-400 transition-colors"
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
  );
}
