'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

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
    <Dialog open={!!category} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {currentAmount !== null ? 'Edit' : 'Set'} budget — {category}
          </DialogTitle>
          <DialogDescription>Monthly spending limit for this category</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="budget-amount" className="block text-xs font-medium text-muted-foreground mb-1.5">
              Monthly Amount ($)
            </label>
            <input
              id="budget-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-zinc-800 border border-input rounded-lg px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="e.g. 200"
              autoFocus
            />
            {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
