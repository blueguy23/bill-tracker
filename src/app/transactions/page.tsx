import type { Metadata } from 'next';
import type { Account, Transaction } from '@/lib/simplefin/types';
import { TransactionsView } from '@/components/TransactionsView';
import { getDb } from '@/adapters/db';
import { listTransactions, listAccounts } from '@/adapters/accounts';
import { listAccountMeta } from '@/adapters/accountMeta';

export const metadata: Metadata = { title: 'Transactions' };

export default async function TransactionsPage() {
  const db = await getDb();
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

  const [{ transactions, hasMore }, allAccounts, metaList] = await Promise.all([
    listTransactions(db, { startDate, limit: 100 }),
    listAccounts(db),
    listAccounts(db).then((accts) =>
      accts.length > 0 ? listAccountMeta(db, accts.map((a) => a._id)) : [],
    ),
  ]);

  const metaMap = new Map(metaList.map((m) => [m._id, m]));
  const accounts: Account[] = allAccounts.map((a) => {
    const meta = metaMap.get(a._id);
    return meta?.customOrgName ? { ...a, orgName: meta.customOrgName } : a;
  });

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
        initialTransactions={transactions as Transaction[]}
        initialHasMore={hasMore}
        accounts={accounts}
      />
    </div>
  );
}
