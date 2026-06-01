'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PendingConfirmation {
  _id: string;
  billId: string;
  billName: string;
  billAmount: number;
  transactionDescription: string;
  transactionAmount: number;
}

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function PendingConfirmationBanner() {
  const [confirmations, setConfirmations] = useState<PendingConfirmation[]>([]);
  const [acting, setActing] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetch('/api/v1/bills/pending-confirmations')
      .then(r => r.json())
      .then(d => setConfirmations(d.confirmations ?? []))
      .catch(() => {});
  }, []);

  if (confirmations.length === 0) return null;

  async function handleAction(id: string, action: 'confirm' | 'dismiss') {
    setActing(prev => new Set(prev).add(id));
    try {
      const res = await fetch('/api/v1/bills/pending-confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        setConfirmations(prev => prev.filter(c => c._id !== id));
        if (action === 'confirm') router.refresh();
      }
    } finally {
      setActing(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  }

  return (
    <div className="space-y-2">
      {confirmations.map(c => (
        <Card key={c._id} className="ring-1 ring-amber-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/25 text-[9px] font-mono">
                  Needs confirmation
                </Badge>
              </div>
              <p className="text-[13px] text-foreground">
                <span className="font-mono text-muted-foreground">{USD.format(c.transactionAmount)}</span>
                {' '}to{' '}
                <span className="font-medium">{c.transactionDescription}</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Is this your <span className="font-semibold text-foreground">{c.billName}</span> payment?
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground h-7 px-3"
                disabled={acting.has(c._id)}
                onClick={() => handleAction(c._id, 'dismiss')}
              >
                No
              </Button>
              <Button
                size="sm"
                className="text-xs h-7 px-3"
                disabled={acting.has(c._id)}
                onClick={() => handleAction(c._id, 'confirm')}
              >
                Yes, that's it
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
