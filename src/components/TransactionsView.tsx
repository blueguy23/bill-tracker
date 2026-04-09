'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Account, Transaction } from '@/lib/simplefin/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatDate(d: Date | string): string {
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
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('this-month');
  const [search, setSearch] = useState('');
  const [hideTransfers, setHideTransfers] = useState(false);

  const accountMap = new Map(accounts.map((a) => [a._id, a]));

  const displayed = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter((t) => {
      if (hideTransfers && isTransfer(t.description)) return false;
      if (q && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transactions, search, hideTransfers]);

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

  const DATE_RANGE_LABELS: Record<DateRange, string> = {
    'this-month': 'This Month',
    'last-month': 'Last Month',
    '3-months': 'Last 3 Months',
    '6-months': 'Last 6 Months',
    'all': 'All Time',
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-700 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search transactions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-depth-900 border border-teal-900/50 rounded-lg pl-9 pr-4 py-2.5 text-sm text-sky-100 placeholder-zinc-600 focus:outline-none focus:border-teal-500/50"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={accountFilter}
          onChange={(e) => handleFilterChange(e.target.value, dateRange)}
          className="bg-depth-900 border border-teal-900/50 rounded-lg px-3 py-2 text-sm text-sky-100 focus:outline-none focus:border-teal-500/50"
        >
          <option value="all">All Accounts</option>
          {accounts.map((a) => (
            <option key={a._id} value={a._id}>
              {a.orgName} — {a.name}
            </option>
          ))}
        </select>

        <div className="flex rounded-lg border border-teal-900/50 overflow-hidden">
          {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => handleFilterChange(accountFilter, range)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                dateRange === range
                  ? 'bg-white/[0.1] text-white'
                  : 'text-sky-700 hover:text-sky-300 hover:bg-teal-950/40'
              }`}
            >
              {DATE_RANGE_LABELS[range]}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-sky-500 hover:text-sky-100 transition-colors">
          <input
            type="checkbox"
            checked={hideTransfers}
            onChange={(e) => setHideTransfers(e.target.checked)}
            className="rounded border-white/[0.2] bg-depth-800 accent-blue-500"
          />
          Hide Transfers
        </label>
      </div>

      {/* Summary bar */}
      {!loading && displayed.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-sky-700 border-t border-teal-900/40 pt-3">
          <span>In: <span className="text-emerald-400 font-medium">{USD.format(summary.totalIn)}</span></span>
          <span>Out: <span className="text-red-400 font-medium">{USD.format(summary.totalOut)}</span></span>
          <span>Net: <span className={`font-medium ${summary.net >= 0 ? 'text-cyan-400' : 'text-orange-400'}`}>
            {summary.net >= 0 ? '+' : ''}{USD.format(summary.net)}
          </span></span>
          <span className="ml-auto">{displayed.length} transaction{displayed.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-teal-900/40 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sky-900 text-sm">Loading…</div>
        ) : displayed.length === 0 ? (
          <div className="py-16 text-center text-sky-900 text-sm">
            {search || hideTransfers ? 'No matching transactions' : 'No transactions found'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-teal-900/40 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-sky-700 uppercase tracking-wider w-32">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-sky-700 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-xs font-semibold text-sky-700 uppercase tracking-wider hidden md:table-cell">Account</th>
                <th className="px-4 py-3 text-xs font-semibold text-sky-700 uppercase tracking-wider text-right w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {displayed.map((txn) => {
                const acct = accountMap.get(txn.accountId);
                const transfer = isTransfer(txn.description);
                return (
                  <tr key={txn._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-sky-700 text-xs whitespace-nowrap">
                      {formatDate(txn.posted)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sky-100">{txn.description}</span>
                        {transfer && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-cyan-400 shrink-0">
                            Transfer
                          </span>
                        )}
                        {txn.pending && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 shrink-0">
                            Pending
                          </span>
                        )}
                      </div>
                      {txn.memo && (
                        <p className="text-xs text-sky-900 mt-0.5">{txn.memo}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {acct ? (
                        <div>
                          <p className="text-sky-500 text-xs">{acct.orgName}</p>
                          <p className="text-sky-900 text-[11px]">{acct.name}</p>
                        </div>
                      ) : (
                        <span className="text-sky-900 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-medium">
                      <span className={txn.amount < 0 ? 'text-red-400' : 'text-emerald-400'}>
                        {USD.format(Math.abs(txn.amount))}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Load More */}
      {hasMore && !loading && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-5 py-2 rounded-lg text-sm font-medium text-sky-500 hover:text-sky-100 border border-teal-900/50 hover:bg-teal-950/40 transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}

      {!hasMore && displayed.length > 0 && !loading && (
        <p className="text-center text-xs text-zinc-700">{transactions.length} loaded · {displayed.length} shown</p>
      )}
    </div>
  );
}
