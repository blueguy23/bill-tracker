import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { setTransactionCategory } from '@/adapters/categoryRules';
import { TRANSACTION_CATEGORIES } from '@/lib/categorization/types';
import type { TransactionCategory } from '@/lib/categorization/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  let body: { category?: unknown };
  try {
    body = await req.json() as { category?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { category } = body;
  if (!category || !TRANSACTION_CATEGORIES.includes(category as TransactionCategory)) {
    return NextResponse.json(
      { error: `category must be one of: ${TRANSACTION_CATEGORIES.join(', ')}` },
      { status: 400 },
    );
  }

  const db = await getDb();
  const updated = await setTransactionCategory(db, id, category as TransactionCategory);

  if (!updated) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id, category });
}
