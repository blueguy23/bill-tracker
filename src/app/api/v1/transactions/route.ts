import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { listTransactions, listAccounts } from '@/adapters/accounts';

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const { searchParams } = req.nextUrl;
    const accountId = searchParams.get('accountId') ?? undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const limit = Math.min(Number(searchParams.get('limit') ?? 100), 500);
    const offset = Number(searchParams.get('offset') ?? 0);

    const db = await getDb();
    const [{ transactions, hasMore }, accounts] = await Promise.all([
      listTransactions(db, { accountId, startDate, endDate, limit, offset }),
      listAccounts(db),
    ]);

    return NextResponse.json({ transactions, accounts, hasMore });
  } catch (err) {
    console.error('[GET /api/v1/transactions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
