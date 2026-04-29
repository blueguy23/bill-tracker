'use client';
import { useState } from 'react';
import type { TransactionCategory } from '@/lib/categorization/types';
import { CATEGORY_LABELS, TRANSACTION_CATEGORIES } from '@/lib/categorization/types';
import { CATEGORY_COLORS } from '@/lib/category-colors';

interface Props {
  txnId: string;
  category: TransactionCategory | undefined;
  onChanged: (txnId: string, category: TransactionCategory) => void;
}

export function TxCategoryBadge({ txnId, category, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const hex = CATEGORY_COLORS[category ?? 'other'] ?? '#71717a';
  const label = category ? CATEGORY_LABELS[category] : 'Uncategorized';

  async function pick(next: TransactionCategory) {
    setOpen(false);
    if (next === category) return;
    setSaving(true);
    try {
      await fetch(`/api/v1/transactions/${txnId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: next }),
      });
      onChanged(txnId, next);
    } finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        data-testid={`category-badge-${txnId}`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 7px', borderRadius: 4, fontSize: 10, border: 'none',
          background: `${hex}1a`, color: hex,
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1,
          outline: `1px solid ${hex}44`,
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: hex, flexShrink: 0 }} />
        {label}
      </button>
      {open && (
        <div style={{
          position: 'absolute', zIndex: 20, left: 0, top: 24, minWidth: 155,
          background: 'var(--raised)', border: '1px solid rgba(255,255,255,0.11)',
          borderRadius: 8, padding: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {TRANSACTION_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => void pick(cat)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '6px 10px', fontSize: 12, borderRadius: 5,
                background: 'transparent', border: 'none',
                color: cat === category ? 'var(--text)' : 'var(--text2)',
                fontWeight: cat === category ? 600 : 400, cursor: 'pointer',
              }}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
