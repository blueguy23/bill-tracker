import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { listAccounts } from '@/adapters/accounts';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    const accounts = await listAccounts(db);
    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    return NextResponse.json({ accounts, totalBalance });
  } catch (err) {
    console.error('[GET /api/v1/accounts/balances]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
