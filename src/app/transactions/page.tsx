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

  const [{ transactions, hasMore }, allAccounts] = await Promise.all([
    listTransactions(db, { startDate, limit: 100 }),
    listAccounts(db),
  ]);

  const metaList = allAccounts.length > 0 ? await listAccountMeta(db, allAccounts.map(a => a._id)) : [];
  const metaMap = new Map(metaList.map(m => [m._id, m]));
  const accounts: Account[] = allAccounts.map(a => {
    const meta = metaMap.get(a._id);
    return meta?.customOrgName ? { ...a, orgName: meta.customOrgName } : a;
  });

  const month = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Transactions</h1>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{transactions.length} transactions · {month}</span>
        </div>
        <TransactionsView
          initialTransactions={transactions as Transaction[]}
          initialHasMore={hasMore}
          accounts={accounts}
        />
      </div>
    </div>
  );
}
