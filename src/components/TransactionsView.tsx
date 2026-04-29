'use client';
import { useState, useCallback, useMemo } from 'react';
import type { Account, Transaction } from '@/lib/simplefin/types';
import type { TransactionCategory } from '@/lib/categorization/types';
import { CATEGORY_LABELS, TRANSACTION_CATEGORIES } from '@/lib/categorization/types';
import { CATEGORY_COLORS } from '@/lib/category-colors';
import { TxRow } from './TxRow';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
type DateRange = 'this-month' | 'last-month' | '3-months' | '6-months' | 'all';
const RANGE_LABELS: Record<DateRange, string> = { 'this-month': 'This Month', 'last-month': 'Last Month', '3-months': 'Last 3 Months', '6-months': 'Last 6 Months', 'all': 'All Time' };

function dateRangeBounds(range: DateRange): { startDate?: string; endDate?: string } {
  const now = new Date();
  if (range === 'all') return {};
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  let start: Date;
  if (range === 'this-month') { start = new Date(now.getFullYear(), now.getMonth(), 1); }
  else if (range === 'last-month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end.setFullYear(now.getFullYear(), now.getMonth() - 1, new Date(now.getFullYear(), now.getMonth(), 0).getDate());
  } else if (range === '3-months') { start = new Date(now.getFullYear(), now.getMonth() - 2, 1); }
  else { start = new Date(now.getFullYear(), now.getMonth() - 5, 1); }
  return { startDate: start.toISOString().slice(0, 10), endDate: range === 'last-month' ? end.toISOString().slice(0, 10) : undefined };
}

function isTransfer(d: string) {
  const l = d.toLowerCase();
  return l.includes('zelle') || l.includes('withdrawal to') || l.includes('deposit from') || l.includes('transfer') || l.includes('wire');
}

interface Props { initialTransactions: Transaction[]; initialHasMore: boolean; accounts: Account[] }

export function TransactionsView({ initialTransactions, initialHasMore, accounts }: Props) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [accountFilter, setAccountFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>('this-month');
  const [search, setSearch] = useState('');
  const [hideTransfers, setHideTransfers] = useState(false);
  const [catFilter, setCatFilter] = useState<TransactionCategory | 'all'>('all');
  const [sort, setSort] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  const accountMap = useMemo(() => new Map(accounts.map(a => [a._id, a])), [accounts]);

  const onCategoryChanged = useCallback((id: string, cat: TransactionCategory) =>
    setTransactions(p => p.map(t => t._id === id ? { ...t, category: cat, categorySource: 'user' } : t)), []);
  const onTagsChanged = useCallback((id: string, tags: string[]) =>
    setTransactions(p => p.map(t => t._id === id ? { ...t, tags } : t)), []);
  const onNotesChanged = useCallback((id: string, notes: string | null) =>
    setTransactions(p => p.map(t => t._id === id ? { ...t, notes } : t)), []);

  const { displayed, summary, pendingTxns, dateGroups } = useMemo(() => {
    const q = search.toLowerCase();
    let list = transactions.filter(t => {
      if (hideTransfers && isTransfer(t.description)) return false;
      if (q && !(t.payee ?? t.description).toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      if (catFilter !== 'all' && t.category !== catFilter) return false;
      return true;
    });
    if (sort === 'date-asc') list = [...list].sort((a, b) => new Date(a.posted).getTime() - new Date(b.posted).getTime());
    else if (sort === 'amount-desc') list = [...list].sort((a, b) => b.amount - a.amount);
    else if (sort === 'amount-asc') list = [...list].sort((a, b) => a.amount - b.amount);

    let totalIn = 0, totalOut = 0, largestExpense: { amount: number; description: string } | null = null;
    for (const t of list) {
      if (t.amount > 0) totalIn += t.amount;
      else { totalOut += Math.abs(t.amount); if (!largestExpense || t.amount < largestExpense.amount) largestExpense = { amount: t.amount, description: t.payee ?? t.description }; }
    }

    const pendingTxns = list.filter(t => t.pending);
    const cleared = list.filter(t => !t.pending);
    const dateGroups = new Map<string, Transaction[]>();
    for (const t of cleared) {
      const key = new Date(t.posted).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      if (!dateGroups.has(key)) dateGroups.set(key, []);
      dateGroups.get(key)!.push(t);
    }
    return { displayed: list, summary: { totalIn, totalOut, net: totalIn - totalOut, largestExpense }, pendingTxns, dateGroups };
  }, [transactions, search, hideTransfers, catFilter, sort]);

  const fetchTransactions = useCallback(async (account: string, range: DateRange, offset = 0, append = false) => {
    const p = new URLSearchParams({ limit: '100', offset: String(offset) });
    if (account !== 'all') p.set('accountId', account);
    const b = dateRangeBounds(range);
    if (b.startDate) p.set('startDate', b.startDate);
    if (b.endDate) p.set('endDate', b.endDate);
    const res = await fetch(`/api/v1/transactions?${p}`);
    if (!res.ok) return;
    const data = await res.json() as { transactions: Transaction[]; hasMore: boolean };
    setTransactions(prev => append ? [...prev, ...data.transactions] : data.transactions);
    setHasMore(data.hasMore);
  }, []);

  async function handleFilterChange(account: string, range: DateRange) {
    setAccountFilter(account); setDateRange(range); setLoading(true);
    await fetchTransactions(account, range); setLoading(false);
  }

  async function handleRecategorize() {
    setRecategorizing(true);
    try { const res = await fetch('/api/v1/transactions/recategorize', { method: 'POST' }); if (res.ok) await fetchTransactions(accountFilter, dateRange); }
    finally { setRecategorizing(false); }
  }

  async function handleExport() {
    const b = dateRangeBounds(dateRange);
    const p = new URLSearchParams();
    if (b.startDate) p.set('startDate', b.startDate);
    if (b.endDate) p.set('endDate', b.endDate);
    if (accountFilter !== 'all') p.set('accountId', accountFilter);
    const res = await fetch(`/api/v1/export?${p}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '');
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = match?.[1] ?? 'transactions.csv'; link.click(); URL.revokeObjectURL(link.href);
  }

  // ── Styles ──
  const chip = (on: boolean): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
    border: `1px solid ${on ? 'rgba(232,201,126,0.25)' : 'rgba(255,255,255,0.07)'}`,
    background: on ? 'rgba(232,201,126,0.1)' : 'transparent',
    color: on ? '#e8c97e' : 'var(--text3)', whiteSpace: 'nowrap' as const,
  });
  const ctrlBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', background: 'transparent', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 7, fontSize: 11.5, color: 'var(--text2)', cursor: 'pointer', whiteSpace: 'nowrap' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1px 1fr', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {[
          { label: 'Money In', val: `+${USD.format(summary.totalIn)}`, pos: true, sub: `${displayed.filter(t => t.amount > 0).length} transactions` },
          { label: 'Money Out', val: `−${USD.format(summary.totalOut)}`, pos: false, sub: `${displayed.filter(t => t.amount < 0).length} transactions` },
          { label: 'Net', val: `${summary.net >= 0 ? '+' : '−'}${USD.format(Math.abs(summary.net))}`, pos: summary.net >= 0, sub: summary.totalIn > 0 ? `${Math.round((summary.net / summary.totalIn) * 100)}% saved` : '—' },
        ].map(c => (
          <div key={c.label} style={{ padding: '14px 20px' }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text3)', marginBottom: 3 }}>{c.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: c.pos ? 'var(--positive)' : 'var(--negative)', marginBottom: 2 }}>{c.val}</div>
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>{c.sub}</div>
          </div>
        ))}
        <div style={{ background: 'var(--border)' }} />
        <div style={{ padding: '14px 20px' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text3)', marginBottom: 3 }}>Largest expense</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{summary.largestExpense ? `−${USD.format(Math.abs(summary.largestExpense.amount))}` : '—'}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary.largestExpense?.description ?? '—'}</div>
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none', fontSize: 13 }}>⌕</span>
          <input type="text" placeholder="Search transactions…" value={search} onChange={e => setSearch(e.target.value)}
            data-testid="search-input"
            style={{ width: '100%', background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 8, padding: '8px 12px 8px 30px', fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--sans)', outline: 'none' }} />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} data-testid="sort-select"
          style={{ ...ctrlBtn, appearance: 'none', paddingRight: 24 }}>
          <option value="date-desc">Newest first</option>
          <option value="date-asc">Oldest first</option>
          <option value="amount-desc">Largest first</option>
          <option value="amount-asc">Smallest first</option>
        </select>
        <select value={accountFilter} onChange={e => void handleFilterChange(e.target.value, dateRange)} data-testid="account-select"
          style={{ ...ctrlBtn, appearance: 'none', paddingRight: 24 }}>
          <option value="all">All Accounts</option>
          {accounts.map(a => <option key={a._id} value={a._id}>{a.orgName} — {a.name}</option>)}
        </select>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setOverflowOpen(o => !o)} style={{ ...ctrlBtn }} data-testid="overflow-btn">⋯</button>
          {overflowOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'var(--raised)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 8, padding: 4, minWidth: 170, zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
              <button onClick={() => { setOverflowOpen(false); void handleRecategorize(); }} disabled={recategorizing} data-testid="auto-categorize-btn" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', fontSize: 12, color: 'var(--text2)', background: 'none', border: 'none', borderRadius: 5, cursor: 'pointer' }}>
                {recategorizing ? 'Categorizing…' : 'Auto-Categorize all'}
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '3px 0' }} />
              <button onClick={() => { setOverflowOpen(false); void handleExport(); }} data-testid="export-btn" style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', fontSize: 12, color: 'var(--text2)', background: 'none', border: 'none', borderRadius: 5, cursor: 'pointer' }}>Export CSV</button>
            </div>
          )}
        </div>
        <button data-testid="add-transaction-btn" title="Coming soon" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#e8c97e', color: '#0b0b0f', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'not-allowed', opacity: 0.6 }}>+ Add Transaction</button>
      </div>

      {/* Filter rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', width: 36, flexShrink: 0 }}>Period</span>
          {(Object.keys(RANGE_LABELS) as DateRange[]).map(r => (
            <button key={r} onClick={() => void handleFilterChange(accountFilter, r)} data-testid={`period-${r}`} style={chip(dateRange === r)}>{RANGE_LABELS[r]}</button>
          ))}
          <button onClick={() => setHideTransfers(h => !h)} data-testid="hide-transfers" style={{ ...chip(hideTransfers), marginLeft: 'auto' }}>⇄ Hide Transfers</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text3)', width: 36, flexShrink: 0 }}>Filter</span>
          <button onClick={() => setCatFilter('all')} data-testid="cat-all" style={chip(catFilter === 'all')}>All</button>
          {TRANSACTION_CATEGORIES.map(cat => {
            const hex = CATEGORY_COLORS[cat] ?? '#71717a';
            const on = catFilter === cat;
            return (
              <button key={cat} onClick={() => setCatFilter(cat)} data-testid={`cat-${cat}`}
                style={{ ...chip(on), display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: hex, flexShrink: 0 }} />
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transaction table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }} data-testid="transaction-table">
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 120px 80px 100px 82px', padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
          {['', 'Payee', 'Category', 'Account', 'Amount', ''].map((h, i) => (
            <div key={i} style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text3)', textAlign: i >= 4 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading…</div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            {search || hideTransfers || catFilter !== 'all' ? 'No matching transactions' : 'No transactions found'}
          </div>
        ) : (
          <>
            {/* Pending section */}
            {pendingTxns.length > 0 && (
              <>
                <div data-testid="pending-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 16px 5px', background: 'rgba(96,165,250,0.04)', borderBottom: '1px solid rgba(96,165,250,0.1)' }}>
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#60a5fa', fontFamily: 'var(--mono)' }}>⏱ Pending · not yet cleared</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{pendingTxns.length} transactions · −{USD.format(pendingTxns.reduce((s, t) => s + Math.abs(t.amount), 0))} held</span>
                </div>
                {pendingTxns.map(t => <TxRow key={t._id} txn={t} acct={accountMap.get(t.accountId)} onCategoryChanged={onCategoryChanged} onTagsChanged={onTagsChanged} onNotesChanged={onNotesChanged} />)}
              </>
            )}

            {/* Cleared section */}
            {dateGroups.size > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 16px 5px', background: 'rgba(255,255,255,0.015)', borderBottom: '1px solid var(--border)', borderTop: pendingTxns.length > 0 ? '1px solid var(--border)' : undefined }}>
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Cleared</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{displayed.filter(t => !t.pending).length} transactions</span>
                </div>
                {[...dateGroups.entries()].map(([day, txns]) => {
                  const dayTotal = txns.reduce((s, t) => s + t.amount, 0);
                  return (
                    <div key={day}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 4px', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)', fontFamily: 'var(--mono)', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.015)' }}>
                        <span>{day}</span>
                        <span style={{ color: dayTotal >= 0 ? 'var(--positive)' : 'var(--text3)' }}>
                          {dayTotal >= 0 ? '+' : '−'}{USD.format(Math.abs(dayTotal))}
                        </span>
                      </div>
                      {txns.map(t => <TxRow key={t._id} txn={t} acct={accountMap.get(t.accountId)} onCategoryChanged={onCategoryChanged} onTagsChanged={onTagsChanged} onNotesChanged={onNotesChanged} />)}
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer / load more */}
      {hasMore && !loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 0' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Showing {transactions.length} loaded · {displayed.length} shown</span>
          <button onClick={() => { setLoadingMore(true); void fetchTransactions(accountFilter, dateRange, transactions.length, true).finally(() => setLoadingMore(false)); }} disabled={loadingMore}
            style={{ padding: '4px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 5, fontSize: 11, color: 'var(--text3)', cursor: loadingMore ? 'not-allowed' : 'pointer' }}>
            {loadingMore ? 'Loading…' : 'Load More →'}
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
