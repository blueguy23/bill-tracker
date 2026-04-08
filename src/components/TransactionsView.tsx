'use client';

import { useState, useCallback } from 'react';
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

  const accountMap = new Map(accounts.map((a) => [a._id, a]));

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
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={accountFilter}
          onChange={(e) => handleFilterChange(e.target.value, dateRange)}
          className="bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50"
        >
          <option value="all">All Accounts</option>
          {accounts.map((a) => (
            <option key={a._id} value={a._id}>
              {a.orgName} — {a.name}
            </option>
          ))}
        </select>

        <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
          {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => handleFilterChange(accountFilter, range)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                dateRange === range
                  ? 'bg-white/[0.1] text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
              }`}
            >
              {DATE_RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-zinc-600 text-sm">Loading…</div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-zinc-600 text-sm">No transactions found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-left">
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-32">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Account</th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {transactions.map((txn) => {
                const acct = accountMap.get(txn.accountId);
                const transfer = isTransfer(txn.description);
                return (
                  <tr key={txn._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                      {formatDate(txn.posted)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-200">{txn.description}</span>
                        {transfer && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 shrink-0">
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
                        <p className="text-xs text-zinc-600 mt-0.5">{txn.memo}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {acct ? (
                        <div>
                          <p className="text-zinc-400 text-xs">{acct.orgName}</p>
                          <p className="text-zinc-600 text-[11px]">{acct.name}</p>
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
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
            className="px-5 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-200 border border-white/[0.08] hover:bg-white/[0.04] transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}

      {!hasMore && transactions.length > 0 && !loading && (
        <p className="text-center text-xs text-zinc-700">{transactions.length} transactions</p>
      )}
    </div>
  );
}
