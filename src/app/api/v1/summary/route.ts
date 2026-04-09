import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { listTransactions } from '@/adapters/accounts';

function isTransfer(description: string): boolean {
  const lower = description.toLowerCase();
  return (
    lower.includes('zelle') ||
    lower.includes('withdrawal to') ||
    lower.includes('deposit from') ||
    lower.includes('transfer') ||
    lower.includes('wire')
  );
}

export interface MerchantStat {
  merchant: string;
  total: number;
  count: number;
}

export interface SummaryResponse {
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
  topMerchants: MerchantStat[];
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const month = req.nextUrl.searchParams.get('month');
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month parameter required (YYYY-MM)' }, { status: 400 });
    }

    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year!, mon! - 1, 1);
    const endDate = new Date(year!, mon!, 0, 23, 59, 59, 999); // last moment of last day

    const db = await getDb();
    // Fetch all transactions for the month (no limit — aggregate over full month)
    const { transactions } = await listTransactions(db, { startDate, endDate, limit: 5000 });

    let income = 0;
    let expenses = 0;
    const merchantMap = new Map<string, { total: number; count: number }>();

    for (const txn of transactions) {
      if (txn.amount > 0) {
        income += txn.amount;
      } else if (!isTransfer(txn.description)) {
        expenses += Math.abs(txn.amount);
        const key = txn.description.trim();
        const existing = merchantMap.get(key) ?? { total: 0, count: 0 };
        existing.total += Math.abs(txn.amount);
        existing.count += 1;
        merchantMap.set(key, existing);
      }
    }

    const topMerchants: MerchantStat[] = Array.from(merchantMap.entries())
      .map(([merchant, stats]) => ({ merchant, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return NextResponse.json({
      income,
      expenses,
      net: income - expenses,
      transactionCount: transactions.length,
      topMerchants,
    } satisfies SummaryResponse);
  } catch (err) {
    console.error('[GET /api/v1/summary]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
