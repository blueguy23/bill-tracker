'use client';

import { useState, useCallback } from 'react';
import { TRANSACTION_CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/categorization/types';
import type { TransactionCategory, CategoryRule } from '@/lib/categorization/types';

interface Props {
  initialRules: CategoryRule[];
}

export function CategoryRulesView({ initialRules }: Props) {
  const [rules, setRules] = useState<CategoryRule[]>(initialRules);
  const [pattern, setPattern] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('other');
  const [isRegex, setIsRegex] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    if (!pattern.trim()) return;
    setSaving(true);
    setError(null);

    const res = await fetch('/api/v1/category-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pattern: pattern.trim(), category, isRegex }),
    });

    if (!res.ok) {
      const data = await res.json() as { error?: string };
      setError(data.error ?? 'Failed to save rule');
      setSaving(false);
      return;
    }

    // Refresh list
    const listRes = await fetch('/api/v1/category-rules');
    const listData = await listRes.json() as { rules: CategoryRule[] };
    setRules(listData.rules);
    setPattern('');
    setIsRegex(false);
    setSaving(false);
  }, [pattern, category, isRegex]);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/v1/category-rules/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    setRules((prev) => prev.filter((r) => r._id !== id));
  }, []);

  return (
    <div data-testid="category-rules" className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-white">Category Rules</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Custom rules run before the built-in defaults. First match wins.
        </p>
      </div>

      {/* Add rule form */}
      <div className="bg-zinc-900 border border-white/[0.06] rounded-xl p-4 space-y-3">
        <p className="text-xs font-medium text-zinc-400">Add a rule</p>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); }}
            data-testid="rule-pattern-input"
            placeholder={isRegex ? 'e.g. ^AMZN.*PRIME' : 'e.g. amazon prime'}
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-white/[0.06] text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TransactionCategory)}
            data-testid="rule-category-select"
            className="px-3 py-2 rounded-lg bg-zinc-800 border border-white/[0.06] text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {TRANSACTION_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>

          <button
            onClick={() => void handleAdd()}
            disabled={saving || !pattern.trim()}
            data-testid="add-rule-btn"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {saving ? 'Saving…' : 'Add'}
          </button>
        </div>

        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isRegex}
            onChange={(e) => setIsRegex(e.target.checked)}
            data-testid="rule-regex-toggle"
            className="rounded border-white/[0.2] bg-zinc-800 accent-blue-500"
          />
          Treat as regex
        </label>

        {error && (
          <p data-testid="rule-error" className="text-xs text-red-400">{error}</p>
        )}
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <p className="text-xs text-zinc-600 px-1" data-testid="no-rules-msg">
          No custom rules yet. Built-in defaults apply.
        </p>
      ) : (
        <div className="space-y-1" data-testid="rules-list">
          {rules.map((rule) => {
            const colors = CATEGORY_COLORS[rule.category];
            return (
              <div
                key={rule._id}
                data-testid={`rule-row-${rule._id}`}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-zinc-900 border border-white/[0.04] group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <code className="text-xs text-zinc-300 truncate font-mono">
                    {rule.isRegex ? `/${rule.pattern}/` : rule.pattern}
                  </code>
                  {rule.isRegex && (
                    <span className="text-[10px] text-zinc-600 border border-zinc-700 rounded px-1">regex</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                    {CATEGORY_LABELS[rule.category]}
                  </span>
                  <button
                    onClick={() => void handleDelete(rule._id)}
                    data-testid={`delete-rule-${rule._id}`}
                    className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs"
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
