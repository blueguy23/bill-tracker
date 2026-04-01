import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { listRecentTransactions } from '@/adapters/accounts';
import { listBills } from '@/adapters/bills';
import { findAutoMatches } from '@/lib/subscriptions/autoMatch';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    const [transactions, bills] = await Promise.all([
      listRecentTransactions(db),
      listBills(db),
    ]);
    const matches = findAutoMatches(transactions, bills);
    return NextResponse.json({ matches });
  } catch (err) {
    console.error('[GET /api/v1/subscriptions/matches]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
