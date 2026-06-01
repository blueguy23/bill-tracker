'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { EnrichedMatch } from '@/types/subscription';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

interface Props {
  matches: EnrichedMatch[];
  onClose: () => void;
}

export function MatchReviewModal({ matches: initial, onClose }: Props) {
  const router = useRouter();
  const [queue, setQueue] = useState<EnrichedMatch[]>(initial);
  const [loading, setLoading] = useState<string | null>(null);

  const current = queue[0];
  const remaining = queue.length;

  async function approve(match: EnrichedMatch) {
    setLoading(match.billId);
    try {
      await fetch(`/api/v1/bills/${match.billId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaid: true }),
      });
      router.refresh();
    } finally {
      setLoading(null);
      advance();
    }
  }

  function skip() {
    advance();
  }

  function advance() {
    setQueue(q => {
      const next = q.slice(1);
      if (next.length === 0) onClose();
      return next;
    });
  }

  if (!current) return null;

  const isLoading = loading === current.billId;

  return (
    <Dialog open={!!current} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[480px] gap-0 p-0">
        <DialogHeader className="px-5 py-4 border-b border-border">
          <DialogTitle>Review Matches</DialogTitle>
          <DialogDescription style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
            {remaining} match{remaining !== 1 ? 'es' : ''} remaining
          </DialogDescription>
        </DialogHeader>

        <div style={{ padding: '20px' }}>

          {/* Confidence badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 5,
              fontSize: 10, fontWeight: 600, fontFamily: 'var(--mono)', letterSpacing: '.04em',
              background: current.confidence === 'high' ? 'var(--accent-a)' : 'var(--raised)',
              color: current.confidence === 'high' ? 'var(--accent)' : 'var(--text3)',
              border: `1px solid ${current.confidence === 'high' ? 'var(--accent-a)' : 'var(--border)'}`,
            }}>
              {current.confidence === 'high' ? '● HIGH CONFIDENCE' : '◐ MEDIUM CONFIDENCE'}
            </div>
          </div>

          {/* Transaction → Bill comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', marginBottom: 20 }}>

            {/* Transaction side */}
            <div style={{ background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 8 }}>Transaction</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: 4, lineHeight: 1.3 }}>{current.txnDescription}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--red)', marginBottom: 4 }}>
                {USD.format(Math.abs(current.txnAmount))}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{formatDate(current.txnDate)}</div>
            </div>

            {/* Arrow */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>

            {/* Bill side */}
            <div style={{ background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: 8 }}>Bill</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: 4, lineHeight: 1.3 }}>{current.billName}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>
                {USD.format(current.billAmount)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'var(--mono)', fontWeight: 600 }}>UNPAID</div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              onClick={() => approve(current)}
              disabled={isLoading}
              className="flex-1"
              style={{ background: 'var(--green)', color: '#fff' }}
            >
              {isLoading ? 'Saving…' : '✓ Mark as Paid'}
            </Button>
            <Button variant="outline" onClick={skip} disabled={isLoading}>
              Skip
            </Button>
          </div>

          {/* Progress dots */}
          {initial.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 16 }}>
              {initial.map((_, i) => {
                const done = i < initial.length - queue.length;
                const active = i === initial.length - queue.length;
                return (
                  <div key={i} style={{
                    width: active ? 16 : 6, height: 6, borderRadius: 3,
                    background: done ? 'var(--green)' : active ? 'var(--accent)' : 'var(--border)',
                    transition: 'all .2s',
                  }} />
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
