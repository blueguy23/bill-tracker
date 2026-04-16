import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { listTransactions, listAccounts } from '@/adapters/accounts';
import type { Transaction, Account } from '@/lib/simplefin/types';

function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCSV(transactions: Transaction[], accountMap: Map<string, Account>): string {
  const headers = ['Date', 'Description', 'Memo', 'Amount', 'Account', 'Institution', 'Pending'];
  const rows = transactions.map((t) => {
    const acct = accountMap.get(t.accountId);
    return [
      new Date(t.posted).toISOString().slice(0, 10),
      t.description,
      t.memo ?? '',
      t.amount.toFixed(2),
      acct?.name ?? '',
      acct?.orgName ?? '',
      t.pending ? 'Yes' : 'No',
    ].map(escapeCSV).join(',');
  });
  return [headers.join(','), ...rows].join('\r\n');
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);

  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const accountId = searchParams.get('accountId') ?? undefined;

  // Default: current month
  const now = new Date();
  const startDate = startDateParam
    ? new Date(startDateParam)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = endDateParam
    ? new Date(endDateParam)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format — use YYYY-MM-DD' }, { status: 400 });
  }

  const db = await getDb();
  const [{ transactions }, accounts] = await Promise.all([
    listTransactions(db, { startDate, endDate, accountId, limit: 5000 }),
    listAccounts(db),
  ]);

  const accountMap = new Map(accounts.map((a) => [a._id, a]));
  const csv = buildCSV(transactions, accountMap);

  const label = `${startDate.toISOString().slice(0, 7)}`;
  const filename = `transactions-${label}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
