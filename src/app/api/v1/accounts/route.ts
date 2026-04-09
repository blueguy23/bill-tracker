import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { getTodayLog } from '@/adapters/syncLog';
import { listAccounts, listRecentTransactions } from '@/adapters/accounts';
import { listAccountMeta } from '@/adapters/accountMeta';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    const [accounts, transactions, log] = await Promise.all([
      listAccounts(db),
      listRecentTransactions(db),
      getTodayLog(db),
    ]);

    // Apply customOrgName overrides
    const accountIds = accounts.map((a) => a._id);
    const metaList = accountIds.length > 0 ? await listAccountMeta(db, accountIds) : [];
    const metaMap = new Map(metaList.map((m) => [m._id, m]));
    const accountsWithNames = accounts.map((a) => {
      const meta = metaMap.get(a._id);
      return meta?.customOrgName ? { ...a, orgName: meta.customOrgName } : a;
    });

    return NextResponse.json({
      accounts: accountsWithNames,
      transactions,
      lastSyncAt: log.lastSyncAt?.toISOString() ?? null,
      simplefinConfigured: Boolean(process.env.SIMPLEFIN_URL),
    });
  } catch (err) {
    console.error('[GET /api/v1/accounts]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
