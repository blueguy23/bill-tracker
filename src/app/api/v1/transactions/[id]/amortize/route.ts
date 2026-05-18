import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import type { Transaction } from '@/lib/simplefin/types';
import { withRequestLogging } from '@/lib/withRequestLogging';

const TRANSACTIONS = 'transactions';

async function _PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  let body: { amortize?: unknown };
  try {
    body = await req.json() as { amortize?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.amortize !== 'boolean') {
    return NextResponse.json({ error: 'amortize must be a boolean' }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.updateOne<Transaction>(
    TRANSACTIONS,
    { _id: id },
    { $set: { amortize: body.amortize } },
  );

  if (!result) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, amortize: body.amortize });
}

export const PATCH = withRequestLogging(_PATCH);
