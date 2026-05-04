'use client';

import { useEffect, useState } from 'react';
import type { DetectedSubscriptionResponse } from '@/types/subscription';
import { SubscriptionReviewModal } from './SubscriptionReviewModal';

export function NewSubscriptionsBanner() {
  const [pending, setPending]     = useState<DetectedSubscriptionResponse[]>([]);
  const [loaded, setLoaded]       = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen]           = useState(false);

  useEffect(() => {
    fetch('/api/v1/subscriptions')
      .then(r => r.json() as Promise<{ subscriptions: DetectedSubscriptionResponse[] }>)
      .then(d => {
        setPending(d.subscriptions ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || pending.length === 0 || dismissed) return null;

  const count = pending.length;

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        background: 'var(--accent-a)', border: '1px solid var(--accent-a)',
        borderRadius: 10, padding: '10px 14px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span style={{ fontSize: 13, color: 'var(--text)', fontFamily: 'var(--sans)' }}>
            <strong>{count} recurring charge{count !== 1 ? 's' : ''}</strong> detected — confirm or ignore
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button
            onClick={() => setOpen(true)}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', padding: 0 }}
          >
            Review →
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 0 }}
            aria-label="Dismiss banner"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {open && (
        <SubscriptionReviewModal
          subscriptions={pending}
          onClose={() => setOpen(false)}
          onResolved={(id) => {
            const next = pending.filter(s => s.id !== id);
            setPending(next);
            if (next.length === 0) setOpen(false);
          }}
        />
      )}
    </>
  );
}
