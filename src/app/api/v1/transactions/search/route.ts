import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import type { Transaction } from '@/lib/simplefin/types';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(Number(searchParams.get('limit') ?? 10), 50);

  if (q.length < 2) {
    return NextResponse.json({ transactions: [] });
  }

  const db = await getDb();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = await db.queryMany<Transaction>(
    'transactions',
    { amount: { $lt: 0 }, pending: false } as any,
    { sort: { posted: -1 }, limit: 5000 } as any,
  );

  const lower = q.toLowerCase();
  const matches = all
    .filter((t) => t.description.toLowerCase().includes(lower))
    .slice(0, limit);

  return NextResponse.json({
    transactions: matches.map((t) => ({
      _id: t._id,
      description: t.description,
      amount: t.amount,
      posted: t.posted,
    })),
  });
}
