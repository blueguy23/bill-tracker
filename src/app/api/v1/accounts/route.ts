import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { getTodayLog } from '@/adapters/syncLog';
import { listAccounts, listRecentTransactions } from '@/adapters/accounts';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    const [accounts, transactions, log] = await Promise.all([
      listAccounts(db),
      listRecentTransactions(db),
      getTodayLog(db),
    ]);
    return NextResponse.json({
      accounts,
      transactions,
      lastSyncAt: log.lastSyncAt?.toISOString() ?? null,
      simplefinConfigured: Boolean(process.env.SIMPLEFIN_URL),
    });
  } catch (err) {
    console.error('[GET /api/v1/accounts]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
