import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import type { Transaction } from '@/lib/simplefin/types';

const TRANSACTIONS = 'transactions';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  let body: { customName?: unknown };
  try {
    body = await req.json() as { customName?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { customName } = body;
  if (customName !== null && customName !== undefined && typeof customName !== 'string') {
    return NextResponse.json({ error: 'customName must be a string or null' }, { status: 400 });
  }
  if (typeof customName === 'string' && customName.length > 200) {
    return NextResponse.json({ error: 'customName must be 200 characters or fewer' }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.updateOne<Transaction>(
    TRANSACTIONS,
    { _id: id },
    { $set: { customName: (customName as string | undefined) ?? undefined } },
  );

  if (!result) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id, customName: customName ?? null });
}
