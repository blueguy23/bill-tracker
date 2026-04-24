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
  const matches = await db.queryMany<Transaction>(
    'transactions',
    {
      amount: { $lt: 0 },
      pending: false,
      description: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    } as any,
    { sort: { posted: -1 }, limit } as any,
  );

  return NextResponse.json({
    transactions: matches.map((t) => ({
      _id: t._id,
      description: t.description,
      amount: t.amount,
      posted: t.posted,
    })),
  });
}
