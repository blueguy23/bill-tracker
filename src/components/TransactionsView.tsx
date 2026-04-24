'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import type { Account, Transaction } from '@/lib/simplefin/types';
import { CATEGORY_LABELS, CATEGORY_COLORS, TRANSACTION_CATEGORIES } from '@/lib/categorization/types';
import type { TransactionCategory } from '@/lib/categorization/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

interface CategoryBadgeProps {
  txnId: string;
  category: TransactionCategory | undefined;
  onChanged: (txnId: string, category: TransactionCategory) => void;
}

function CategoryBadge({ txnId, category, onChanged }: CategoryBadgeProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const colors = category ? CATEGORY_COLORS[category] : CATEGORY_COLORS.other;
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        data-testid={`category-badge-${txnId}`}
        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full transition-opacity ${colors.bg} ${colors.text} ${saving ? 'opacity-50' : 'hover:opacity-80 cursor-pointer'}`}
      >
        {label}
      </button>
      {open && (
        <div className="absolute z-10 left-0 top-5 w-44 rounded-lg border border-white/[0.1] bg-zinc-900 shadow-xl py-1">
          {TRANSACTION_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => void pick(cat)}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/[0.05] transition-colors ${cat === category ? 'text-white font-semibold' : 'text-zinc-400'}`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tags & Notes inline editor ────────────────────────────────────────────────

interface TagsRowProps {
  txnId: string;
  tags: string[] | undefined;
  notes: string | null | undefined;
  onTagsChanged: (txnId: string, tags: string[]) => void;
  onNotesChanged: (txnId: string, notes: string | null) => void;
}

function TagsRow({ txnId, tags = [], notes, onTagsChanged, onNotesChanged }: TagsRowProps) {
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState(notes ?? '');
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasData = tags.length > 0 || !!notes;
  const showControls = hasData || expanded;

  async function submitTag() {
    const val = tagInput.trim().toLowerCase();
    if (!val || tags.includes(val)) { setAddingTag(false); setTagInput(''); return; }
    const next = [...tags, val];
    setAddingTag(false);
    setTagInput('');
    await fetch(`/api/v1/transactions/${txnId}/tags`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: next }),
    });
    onTagsChanged(txnId, next);
  }

  async function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    await fetch(`/api/v1/transactions/${txnId}/tags`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: next }),
    });
    onTagsChanged(txnId, next);
  }

  async function saveNotes() {
    setEditingNotes(false);
    await fetch(`/api/v1/transactions/${txnId}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notesInput || null }),
    });
    onNotesChanged(txnId, notesInput || null);
  }

  return (
    <div className="mt-1" data-testid={`tags-row-${txnId}`}>
      {showControls ? (
        <div className="flex flex-wrap items-center gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="group inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 hover:bg-white/[0.1] transition-colors"
              data-testid={`tag-${txnId}-${tag}`}
            >
              #{tag}
              <button
                onClick={() => void removeTag(tag)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-opacity leading-none"
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))}

          {addingTag ? (
            <input
              ref={inputRef}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitTag();
                if (e.key === 'Escape') { setAddingTag(false); setTagInput(''); }
              }}
              onBlur={() => void submitTag()}
              autoFocus
              placeholder="tag name"
              maxLength={50}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 placeholder-zinc-600 border border-white/[0.12] focus:outline-none focus:border-blue-500/50 w-20"
            />
          ) : tags.length < 10 && (
            <button
              onClick={() => setAddingTag(true)}
              data-testid={`add-tag-btn-${txnId}`}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.08] transition-colors"
            >
              + tag
            </button>
          )}

          {editingNotes ? (
            <input
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveNotes();
                if (e.key === 'Escape') { setEditingNotes(false); setNotesInput(notes ?? ''); }
              }}
              onBlur={() => void saveNotes()}
              autoFocus
              placeholder="add a note…"
              maxLength={500}
              className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300 placeholder-zinc-600 border border-white/[0.12] focus:outline-none focus:border-blue-500/50 w-40"
              data-testid={`notes-input-${txnId}`}
            />
          ) : (
            <button
              onClick={() => { setNotesInput(notes ?? ''); setEditingNotes(true); }}
              data-testid={`notes-btn-${txnId}`}
              className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${notes ? 'bg-white/[0.06] text-zinc-400 hover:bg-white/[0.1]' : 'bg-white/[0.04] text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.08]'}`}
            >
              {notes ? `"${notes.slice(0, 20)}${notes.length > 20 ? '…' : ''}"` : '+ note'}
            </button>
          )}
        </div>
      ) : (
        // Row has no tags/notes — show a faint "+" only on row hover via CSS group
        <button
          onClick={() => setExpanded(true)}
          data-testid={`add-tag-btn-${txnId}`}
          className="text-[10px] px-1.5 py-0.5 rounded-full text-zinc-700 hover:text-zinc-500 hover:bg-white/[0.06] transition-colors opacity-0 group-hover/row:opacity-100"
        >
          + tag
        </button>
      )}
    </div>
  );
}

function _formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isTransfer(description: string): boolean {
  const lower = description.toLowerCase();
  return (
    lower.includes('zelle') ||
    lower.includes('withdrawal to') ||
    lower.includes('deposit from') ||
    lower.includes('transfer') ||
    lower.includes('wire')
  );
}

type DateRange = 'this-month' | 'last-month' | '3-months' | '6-months' | 'all';

function dateRangeBounds(range: DateRange): { startDate?: string; endDate?: string } {
  const now = new Date();
  if (range === 'all') return {};

  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of current month
  let start: Date;

  if (range === 'this-month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (range === 'last-month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end.setMonth(end.getMonth() - 1);
    end.setDate(new Date(now.getFullYear(), now.getMonth(), 0).getDate());
  } else if (range === '3-months') {
    start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  } else {
    start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: range === 'last-month' ? end.toISOString().slice(0, 10) : undefined,
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TransactionsViewProps {
  initialTransactions: Transaction[];
  initialHasMore: boolean;
  accounts: Account[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TransactionsView({ initialTransactions, initialHasMore, accounts }: TransactionsViewProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('this-month');
  const [search, setSearch] = useState('');
  const [hideTransfers, setHideTransfers] = useState(false);
  const [catFilter, setCatFilter] = useState<TransactionCategory | 'all'>('all');
  const [sort, setSort] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  const handleCategoryChanged = useCallback((txnId: string, category: TransactionCategory) => {
    setTransactions((prev) =>
      prev.map((t) => (t._id === txnId ? { ...t, category, categorySource: 'user' } : t)),
    );
  }, []);

  const handleTagsChanged = useCallback((txnId: string, tags: string[]) => {
    setTransactions((prev) => prev.map((t) => (t._id === txnId ? { ...t, tags } : t)));
  }, []);

  const handleNotesChanged = useCallback((txnId: string, notes: string | null) => {
    setTransactions((prev) => prev.map((t) => (t._id === txnId ? { ...t, notes } : t)));
  }, []);

  const accountMap = new Map(accounts.map((a) => [a._id, a]));

  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    let list = transactions.filter((t) => {
      if (hideTransfers && isTransfer(t.description)) return false;
      if (q && !t.description.toLowerCase().includes(q)) return false;
      if (catFilter !== 'all' && t.category !== catFilter) return false;
      return true;
    });
    if (sort === 'date-asc') list = [...list].sort((a, b) => new Date(a.posted).getTime() - new Date(b.posted).getTime());
    else if (sort === 'amount-desc') list = [...list].sort((a, b) => b.amount - a.amount);
    else if (sort === 'amount-asc') list = [...list].sort((a, b) => a.amount - b.amount);
    return list;
  }, [transactions, search, hideTransfers, catFilter, sort]);

  const summary = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const t of displayed) {
      if (t.amount > 0) totalIn += t.amount;
      else totalOut += Math.abs(t.amount);
    }
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [displayed]);

  const fetchTransactions = useCallback(async (
    account: string,
    range: DateRange,
    offset = 0,
    append = false,
  ) => {
    const params = new URLSearchParams({ limit: '100', offset: String(offset) });
    if (account !== 'all') params.set('accountId', account);
    const bounds = dateRangeBounds(range);
    if (bounds.startDate) params.set('startDate', bounds.startDate);
    if (bounds.endDate) params.set('endDate', bounds.endDate);

    const res = await fetch(`/api/v1/transactions?${params}`);
    if (!res.ok) return;
    const data = await res.json() as { transactions: Transaction[]; hasMore: boolean };

    setTransactions((prev) => append ? [...prev, ...data.transactions] : data.transactions);
    setHasMore(data.hasMore);
  }, []);

  async function handleFilterChange(account: string, range: DateRange) {
    setAccountFilter(account);
    setDateRange(range);
    setLoading(true);
    await fetchTransactions(account, range);
    setLoading(false);
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    await fetchTransactions(accountFilter, dateRange, transactions.length, true);
    setLoadingMore(false);
  }

  async function handleRecategorize() {
    setRecategorizing(true);
    try {
      const res = await fetch('/api/v1/transactions/recategorize', { method: 'POST' });
      if (res.ok) await fetchTransactions(accountFilter, dateRange);
    } finally {
      setRecategorizing(false);
    }
  }

  async function handleExport() {
    const bounds = dateRangeBounds(dateRange);
    const params = new URLSearchParams();
    if (bounds.startDate) params.set('startDate', bounds.startDate);
    if (bounds.endDate) params.set('endDate', bounds.endDate);
    if (accountFilter !== 'all') params.set('accountId', accountFilter);

    const res = await fetch(`/api/v1/export?${params.toString()}`);
    if (!res.ok) return;

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') ?? '';
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match?.[1] ?? 'transactions.csv';

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const DATE_RANGE_LABELS: Record<DateRange, string> = {
    'this-month': 'This Month',
    'last-month': 'Last Month',
    '3-months': 'Last 3 Months',
    '6-months': 'Last 6 Months',
    'all': 'All Time',
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--sans)',
    outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Filter bar row 1: search + sort + account + export */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 13, pointerEvents: 'none' }}>⌕</span>
          <input
            type="text" placeholder="Search transactions…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, width: '100%', paddingLeft: 32 }}
          />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="amount-desc">Largest first</option>
          <option value="amount-asc">Smallest first</option>
        </select>
        <select value={accountFilter} onChange={(e) => handleFilterChange(e.target.value, dateRange)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="all">All Accounts</option>
          {accounts.map((a) => <option key={a._id} value={a._id}>{a.orgName} — {a.name}</option>)}
        </select>
        {!loading && displayed.length > 0 && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 600 }}>
            <span style={{ color: 'var(--green)' }}>+{USD.format(summary.totalIn)}</span>
            <span style={{ color: 'var(--red)' }}>−{USD.format(summary.totalOut)}</span>
          </div>
        )}
        <button
          onClick={() => void handleRecategorize()}
          disabled={recategorizing}
          title="Re-run auto-categorization on all transactions"
          style={{ ...inputStyle, cursor: recategorizing ? 'not-allowed' : 'pointer', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '.04em', opacity: recategorizing ? 0.5 : 1 }}
        >
          {recategorizing ? 'CATEGORIZING…' : 'AUTO-CATEGORIZE'}
        </button>
        <button onClick={() => void handleExport()} data-testid="export-btn" style={{ ...inputStyle, cursor: 'pointer', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '.04em', marginLeft: 'auto' }}>
          EXPORT CSV
        </button>
      </div>

      {/* Filter bar row 2: date range tabs + hide transfers */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
            <button key={range} onClick={() => handleFilterChange(accountFilter, range)} style={{
              padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
              fontFamily: 'var(--mono)', transition: 'all .12s',
              background: dateRange === range ? 'var(--surface)' : 'transparent',
              color: dateRange === range ? 'var(--text)' : 'var(--text3)',
            }}>
              {DATE_RANGE_LABELS[range]}
            </button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--sans)' }}>
          <input type="checkbox" checked={hideTransfers} onChange={(e) => setHideTransfers(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          Hide Transfers
        </label>
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(['all', ...TRANSACTION_CATEGORIES] as (TransactionCategory | 'all')[]).map((cat) => {
          const active = catFilter === cat;
          const label  = cat === 'all' ? 'All' : CATEGORY_LABELS[cat];
          return (
            <button key={cat} onClick={() => setCatFilter(cat)} style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600, fontFamily: 'var(--mono)', letterSpacing: '.04em',
              background: active ? 'var(--accent)' : 'var(--raised)',
              color: active ? '#fff' : 'var(--text3)',
              transition: 'all .12s',
            }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Transaction list */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text3)', fontSize: 13, fontFamily: 'var(--sans)' }}>Loading…</div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text3)', fontSize: 13, fontFamily: 'var(--sans)' }}>
            {search || hideTransfers || catFilter !== 'all' ? 'No matching transactions' : 'No transactions found'}
          </div>
        ) : displayed.map((txn) => {
          const acct     = accountMap.get(txn.accountId);
          const transfer = isTransfer(txn.description);
          return (
            <div key={txn._id} className="group/row" data-testid={`txn-row-${txn._id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(237,237,245,0.02)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Date */}
              <div style={{ width: 64, flexShrink: 0, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                {new Date(txn.posted).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
              </div>
              {/* Desc + account */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txn.description}</span>
                  {transfer && txn.category !== 'transfer' && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,.12)', color: '#60a5fa', fontFamily: 'var(--mono)', flexShrink: 0 }}>TRANSFER</span>}
                  {txn.pending && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,.12)', color: 'var(--gold)', fontFamily: 'var(--mono)', flexShrink: 0 }}>PENDING</span>}
                  <CategoryBadge txnId={txn._id} category={txn.category} onChanged={handleCategoryChanged} />
                </div>
                {acct && (
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                    {acct.orgName.toUpperCase()} · {acct.name}
                  </div>
                )}
                {txn.memo && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{txn.memo}</div>}
                <TagsRow txnId={txn._id} tags={txn.tags} notes={txn.notes} onTagsChanged={handleTagsChanged} onNotesChanged={handleNotesChanged} />
              </div>
              {/* Amount */}
              <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600, color: txn.amount < 0 ? 'var(--text)' : 'var(--green)', flexShrink: 0, minWidth: 90, textAlign: 'right' }}>
                {txn.amount >= 0 ? '+' : '−'}{USD.format(Math.abs(txn.amount))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Load more / footer */}
      {hasMore && !loading && (
        <div style={{ textAlign: 'center' }}>
          <button onClick={handleLoadMore} disabled={loadingMore} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', cursor: loadingMore ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'var(--sans)', opacity: loadingMore ? 0.5 : 1 }}>
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
      {!hasMore && displayed.length > 0 && !loading && (
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          {transactions.length} loaded · {displayed.length} shown
        </div>
      )}
    </div>
  );
}
