import type { Metadata } from 'next';
import type { Account, Transaction } from '@/lib/simplefin/types';
import { TransactionsView } from '@/components/TransactionsView';

export const metadata: Metadata = { title: 'Transactions' };

interface TransactionsResponse {
  transactions: Transaction[];
  accounts: Account[];
  hasMore: boolean;
}

async function fetchTransactions(): Promise<TransactionsResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const res = await fetch(`${baseUrl}/api/v1/transactions?startDate=${startDate}&limit=100`, { cache: 'no-store' });
  if (!res.ok) {
    console.error(`[fetchTransactions] API returned ${res.status}`);
    return { transactions: [], accounts: [], hasMore: false };
  }
  return res.json() as Promise<TransactionsResponse>;
}

export default async function TransactionsPage() {
  const { transactions, accounts, hasMore } = await fetchTransactions();

  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">Transactions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{monthLabel} — all accounts</p>
        </div>
      </div>
      <TransactionsView
        initialTransactions={transactions}
        initialHasMore={hasMore}
        accounts={accounts}
      />
    </div>
  );
}
