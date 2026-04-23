'use client';

import { useState, useCallback } from 'react';
import { TRANSACTION_CATEGORIES, CATEGORY_LABELS } from '@/lib/categorization/types';
import type { TransactionCategory, CategoryRule } from '@/lib/categorization/types';

const CAT_COLORS: Record<TransactionCategory, string> = {
  food:          '#f97316',
  transport:     '#3b82f6',
  shopping:      '#8b5cf6',
  entertainment: '#ec4899',
  health:        '#10b981',
  utilities:     '#06b6d4',
  subscriptions: '#6366f1',
  income:        '#22c55e',
  transfer:      '#71717a',
  other:         '#71717a',
};

interface Props {
  initialRules: CategoryRule[];
}

const inputStyle: React.CSSProperties = {
  background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '7px 10px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--mono)',
  outline: 'none',
};

export function CategoryRulesView({ initialRules }: Props) {
  const [rules, setRules]       = useState<CategoryRule[]>(initialRules);
  const [pattern, setPattern]   = useState('');
  const [category, setCategory] = useState<TransactionCategory>('other');
  const [isRegex, setIsRegex]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    if (!pattern.trim()) return;
    setSaving(true); setError(null);
    const res = await fetch('/api/v1/category-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pattern: pattern.trim(), category, isRegex }),
    });
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error ?? 'Failed to save rule');
      setSaving(false); return;
    }
    const listRes  = await fetch('/api/v1/category-rules');
    const listData = await listRes.json() as { rules: CategoryRule[] };
    setRules(listData.rules);
    setPattern(''); setIsRegex(false); setSaving(false);
  }, [pattern, category, isRegex]);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/v1/category-rules/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    setRules((prev) => prev.filter((r) => r._id !== id));
  }, []);

  return (
    <div data-testid="category-rules" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Category Rules</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 3 }}>Custom rules run before built-in defaults. First match wins.</div>
        </div>

        {/* Add rule form */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); }}
              data-testid="rule-pattern-input"
              placeholder={isRegex ? 'e.g. ^AMZN.*PRIME' : 'e.g. amazon prime'}
              style={{ ...inputStyle, flex: 1 }}
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TransactionCategory)}
              data-testid="rule-category-select"
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {TRANSACTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <button
              onClick={() => void handleAdd()}
              disabled={saving || !pattern.trim()}
              data-testid="add-rule-btn"
              style={{
                padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)',
                color: '#fff', cursor: saving || !pattern.trim() ? 'not-allowed' : 'pointer',
                fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 600,
                opacity: saving || !pattern.trim() ? 0.4 : 1,
              }}
            >
              {saving ? '…' : 'Add'}
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>
            <input
              type="checkbox"
              checked={isRegex}
              onChange={(e) => setIsRegex(e.target.checked)}
              data-testid="rule-regex-toggle"
              style={{ accentColor: 'var(--accent)' }}
            />
            Treat as regex
          </label>

          {error && (
            <div data-testid="rule-error" style={{ fontSize: 12, color: 'var(--red)', fontFamily: 'var(--sans)' }}>{error}</div>
          )}
        </div>
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--sans)', padding: '4px 2px' }} data-testid="no-rules-msg">
          No custom rules yet. Built-in defaults apply.
        </div>
      ) : (
        <div data-testid="rules-list" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rules.map((rule) => {
            const color = CAT_COLORS[rule.category];
            return (
              <div
                key={rule._id}
                data-testid={`rule-row-${rule._id}`}
                onMouseEnter={(e) => { (e.currentTarget.querySelector('[data-del]') as HTMLElement | null)?.style.setProperty('opacity', '1'); }}
                onMouseLeave={(e) => { (e.currentTarget.querySelector('[data-del]') as HTMLElement | null)?.style.setProperty('opacity', '0'); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <code style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rule.isRegex ? `/${rule.pattern}/` : rule.pattern}
                  </code>
                  {rule.isRegex && (
                    <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px' }}>regex</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--mono)', background: `${color}18`, color }}>
                    {CATEGORY_LABELS[rule.category].toUpperCase()}
                  </span>
                  <button
                    data-del
                    onClick={() => void handleDelete(rule._id)}
                    data-testid={`delete-rule-${rule._id}`}
                    style={{ padding: '2px 6px', border: 'none', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: 12, opacity: 0, transition: 'opacity .1s' }}
                    aria-label="Delete rule"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
