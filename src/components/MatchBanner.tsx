'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  count: number;
}

export function MatchBanner({ count }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (count === 0 || dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-sm text-amber-300">
          <span className="font-medium">{count} transaction{count !== 1 ? 's' : ''}</span> may match your bills
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/subscriptions"
          className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
        >
          Review →
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-400 transition-colors"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
