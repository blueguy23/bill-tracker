'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { BillResponse, CreateBillDto, UpdateBillDto } from '@/types/bill';
import { BILL_CATEGORIES, RECURRENCE_INTERVALS } from '@/types/bill';

interface TxnSearchResult {
  _id: string;
  description: string;
  amount: number;
  posted: string | Date;
}

type ModalMode = 'create' | 'edit';

interface BillModalProps {
  mode: ModalMode;
  initialData?: BillResponse;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateBillDto | UpdateBillDto) => Promise<void>;
}

function toDateInputValue(dueDate: string | number): string {
  if (typeof dueDate === 'number') return '';
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0] ?? '';
}

interface FormState {
  name: string; amount: string; dueDateStr: string; dueDateDay: string;
  category: string; isPaid: boolean; isAutoPay: boolean; isRecurring: boolean;
  recurrenceInterval: string; url: string; notes: string;
  paymentDescriptionHint: string;
}

function buildInitialState(initialData?: BillResponse): FormState {
  if (!initialData) {
    return {
      name: '', amount: '', dueDateStr: '', dueDateDay: '1',
      category: BILL_CATEGORIES[0] ?? 'other', isPaid: false, isAutoPay: false,
      isRecurring: false, recurrenceInterval: RECURRENCE_INTERVALS[2] ?? 'monthly',
      url: '', notes: '', paymentDescriptionHint: '',
    };
  }
  return {
    name: initialData.name, amount: String(initialData.amount),
    dueDateStr: typeof initialData.dueDate === 'string' ? toDateInputValue(initialData.dueDate) : '',
    dueDateDay: typeof initialData.dueDate === 'number' ? String(initialData.dueDate) : '1',
    category: initialData.category, isPaid: initialData.isPaid, isAutoPay: initialData.isAutoPay,
    isRecurring: initialData.isRecurring,
    recurrenceInterval: initialData.recurrenceInterval ?? (RECURRENCE_INTERVALS[2] ?? 'monthly'),
    url: initialData.url ?? '', notes: initialData.notes ?? '',
    paymentDescriptionHint: initialData.paymentDescriptionHint ?? '',
  };
}

export function BillModal({ mode, initialData, isOpen, onClose, onSave }: BillModalProps) {
  const [form, setForm] = useState<FormState>(() => buildInitialState(initialData));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hintSearch, setHintSearch] = useState('');
  const [hintResults, setHintResults] = useState<TxnSearchResult[]>([]);
  const [hintSearching, setHintSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialState(initialData));
      setError(null);
      setHintSearch('');
      setHintResults([]);
    }
  }, [isOpen, initialData]);

  const searchTransactions = useCallback((q: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setHintResults([]); return; }
    setHintSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/transactions/search?q=${encodeURIComponent(q)}&limit=8`);
        const data = await res.json() as { transactions: TxnSearchResult[] };
        setHintResults(data.transactions ?? []);
      } catch { setHintResults([]); }
      finally { setHintSearching(false); }
    }, 300);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    const dto: CreateBillDto = {
      name: form.name.trim(), amount: Number(form.amount),
      dueDate: form.isRecurring ? Number(form.dueDateDay) : form.dueDateStr,
      category: form.category as CreateBillDto['category'],
      isPaid: form.isPaid, isAutoPay: form.isAutoPay, isRecurring: form.isRecurring,
      ...(form.isRecurring && { recurrenceInterval: form.recurrenceInterval as CreateBillDto['recurrenceInterval'] }),
      ...(form.url.trim() && { url: form.url.trim() }),
      ...(form.notes.trim() && { notes: form.notes.trim() }),
      ...(form.paymentDescriptionHint.trim() && { paymentDescriptionHint: form.paymentDescriptionHint.trim() }),
    };
    try {
      await onSave(dto);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save bill');
    } finally {
      setIsSaving(false);
    }
  }

  const label = 'block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5';
  const input = 'w-full bg-zinc-800 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" data-testid="bill-modal">
      <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-white">
            {mode === 'create' ? 'Add Bill' : 'Edit Bill'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label className={label}>Name</label>
            <input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Netflix, Rent" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Amount ($)</label>
              <input className={input} type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" required />
            </div>
            <div>
              <label className={label}>Category</label>
              <select className={input} value={form.category} onChange={(e) => set('category', e.target.value)}>
                {BILL_CATEGORIES.map((c) => <option key={c} value={c} className="bg-zinc-800 capitalize">{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-5 pt-1">
            {([['isRecurring', 'Recurring'], ['isAutoPay', 'AutoPay'], ['isPaid', 'Paid']] as [keyof FormState, string][]).map(([key, lbl]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form[key] as boolean}
                  onChange={(e) => set(key, e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                {lbl}
              </label>
            ))}
          </div>

          {form.isRecurring ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Day of Month</label>
                <input className={input} type="number" min="1" max="31" value={form.dueDateDay} onChange={(e) => set('dueDateDay', e.target.value)} required />
              </div>
              <div>
                <label className={label}>Recurrence</label>
                <select className={input} value={form.recurrenceInterval} onChange={(e) => set('recurrenceInterval', e.target.value)}>
                  {RECURRENCE_INTERVALS.map((r) => <option key={r} value={r} className="bg-zinc-800 capitalize">{r}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className={label}>Due Date</label>
              <input className={input} type="date" style={{ colorScheme: 'dark' }} value={form.dueDateStr} onChange={(e) => set('dueDateStr', e.target.value)} required />
            </div>
          )}

          <div>
            <label className={label}>URL</label>
            <input className={input} type="text" value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://billing.example.com" />
          </div>

          <div>
            <label className={label}>Notes</label>
            <textarea className={input} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes" />
          </div>

          {/* Payment description hint — helps auto-pay detection for ambiguous bills */}
          <div className="border-t border-white/[0.06] pt-4">
            <label className={label}>Payment Transaction Hint</label>
            <p className="text-xs text-zinc-500 mb-2">
              For loans or ambiguous bills, link a real transaction so Folio knows what to look for.
            </p>
            {form.paymentDescriptionHint ? (
              <div className="flex items-center gap-2 bg-zinc-800 border border-blue-500/30 rounded-lg px-3 py-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                <span className="text-sm text-zinc-200 font-mono flex-1 truncate">{form.paymentDescriptionHint}</span>
                <button
                  type="button"
                  onClick={() => { set('paymentDescriptionHint', ''); setHintSearch(''); setHintResults([]); }}
                  className="text-zinc-500 hover:text-zinc-200 transition-colors flex-shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  className={input}
                  value={hintSearch}
                  onChange={(e) => { setHintSearch(e.target.value); searchTransactions(e.target.value); }}
                  placeholder="Search transactions… e.g. SCHOOLSFIRST, AT&T"
                />
                {hintSearching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">searching…</span>
                )}
                {hintResults.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full bg-zinc-800 border border-white/[0.08] rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                    {hintResults.map((t) => (
                      <li key={t._id}>
                        <button
                          type="button"
                          onClick={() => { set('paymentDescriptionHint', t.description); setHintSearch(''); setHintResults([]); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-zinc-700 transition-colors flex items-center justify-between gap-3"
                        >
                          <span className="text-sm text-zinc-200 font-mono truncate">{t.description}</span>
                          <span className="text-xs text-zinc-500 flex-shrink-0">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(t.amount))}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-400 bg-zinc-800 border border-white/[0.08] rounded-lg hover:text-zinc-200 hover:bg-zinc-700 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors" data-testid="save-bill-btn">
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
