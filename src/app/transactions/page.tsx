import type { Metadata } from 'next';
import type { Account, Transaction } from '@/lib/simplefin/types';
import { TransactionsView } from '@/components/TransactionsView';
import { getDb } from '@/adapters/db';
import { listTransactions, listAccounts } from '@/adapters/accounts';
import { listAccountMeta } from '@/adapters/accountMeta';

export const metadata: Metadata = { title: 'Transactions — Folio' };

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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Transactions</h1>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{transactions.length} transactions</p>
      </div>
      <div style={{ padding: '24px 28px' }}>
        <TransactionsView
          initialTransactions={transactions as Transaction[]}
          initialHasMore={hasMore}
          accounts={accounts}
        />
      </div>
    </div>
  );
}
