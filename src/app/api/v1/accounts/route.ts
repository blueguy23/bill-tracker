import { NextResponse , NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { getTodayLog } from '@/adapters/syncLog';
import { listAccounts, listRecentTransactions } from '@/adapters/accounts';
import { listAccountMeta } from '@/adapters/accountMeta';
import { logger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/withRequestLogging';

async function _GET(_req: NextRequest) : Promise<Response> {
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
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRequestLogging(_GET);
