'use client';

import { useState, useEffect } from 'react';
import type { PaymentResponse } from '@/types/payment';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface PaymentHistoryModalProps {
  billId: string;
  billName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentHistoryModal({ billId, billName, isOpen, onClose }: PaymentHistoryModalProps) {
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(null);
    fetch(`/api/v1/bills/${billId}/payments`)
      .then((res) => res.json() as Promise<{ payments?: PaymentResponse[]; error?: string }>)
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setPayments(data.payments ?? []);
      })
      .catch(() => setError('Failed to load payment history'))
      .finally(() => setIsLoading(false));
  }, [isOpen, billId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Payment History</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{billName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-zinc-800 animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 text-center py-8">{error}</p>
          )}

          {!isLoading && !error && payments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-zinc-500 text-sm">No payment history yet</p>
              <p className="text-zinc-600 text-xs mt-1">Mark this bill as paid to start tracking</p>
            </div>
          )}

          {!isLoading && !error && payments.length > 0 && (
            <ul className="divide-y divide-white/[0.04]">
              {payments.map((p) => (
                <li key={p._id} className="flex items-center justify-between py-3.5">
                  <span className="text-sm text-zinc-300" suppressHydrationWarning>{formatDate(p.paidAt)}</span>
                  <span className="text-sm font-semibold text-emerald-400 tabular-nums">{USD.format(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!isLoading && !error && payments.length > 0 && (
          <div className="px-6 py-3 border-t border-white/[0.06] shrink-0">
            <p className="text-xs text-zinc-600">{payments.length} payment{payments.length !== 1 ? 's' : ''} recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}
