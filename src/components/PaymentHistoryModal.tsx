'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle>Payment History</DialogTitle>
          <DialogDescription>{billName}</DialogDescription>
        </DialogHeader>

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
              <p className="text-muted-foreground text-sm">No payment history yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Mark this bill as paid to start tracking</p>
            </div>
          )}

          {!isLoading && !error && payments.length > 0 && (
            <ul className="divide-y divide-border/50">
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
          <div className="px-6 py-3 border-t border-border shrink-0">
            <p className="text-xs text-muted-foreground">{payments.length} payment{payments.length !== 1 ? 's' : ''} recorded</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
