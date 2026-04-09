'use client';

import { useState, useEffect } from 'react';

interface Props {
  category: string | null;
  currentAmount: number | null;
  onClose: () => void;
  onSave: (category: string, monthlyAmount: number) => Promise<void>;
}

export function SetBudgetModal({ category, currentAmount, onClose, onSave }: Props) {
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (category) {
      setAmount(currentAmount !== null ? String(currentAmount) : '');
      setError('');
    }
  }, [category, currentAmount]);

  if (!category) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Enter a positive amount');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(category!, parsed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-2xl">
        <div>
          <h2 className="text-base font-semibold text-white capitalize">
            {currentAmount !== null ? 'Edit' : 'Set'} budget — {category}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">Monthly spending limit for this category</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="budget-amount" className="block text-xs font-medium text-zinc-400 mb-1.5">
              Monthly Amount ($)
            </label>
            <input
              id="budget-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-zinc-800 border border-white/[0.08] rounded-lg px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. 200"
              autoFocus
            />
            {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
