import { NextResponse , NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { listRecentTransactions } from '@/adapters/accounts';
import { listBills } from '@/adapters/bills';
import { findAutoMatches } from '@/lib/subscriptions/autoMatch';
import { logger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/withRequestLogging';

async function _GET(_req: NextRequest) : Promise<Response> {
  try {
    const db = await getDb();
    const [transactions, bills] = await Promise.all([
      listRecentTransactions(db),
      listBills(db),
    ]);
    const matches = findAutoMatches(transactions, bills);
    return NextResponse.json({ matches });
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRequestLogging(_GET);
