import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { setTransactionNotes } from '@/adapters/transactionTags';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  let body: { notes?: unknown };
  try {
    body = await req.json() as { notes?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { notes } = body;
  if (typeof notes !== 'string' && notes !== null && notes !== undefined) {
    return NextResponse.json({ error: 'notes must be a string or null' }, { status: 400 });
  }
  if (typeof notes === 'string' && notes.length > 2000) {
    return NextResponse.json({ error: 'notes must be 2000 characters or fewer' }, { status: 400 });
  }

  const db = await getDb();
  const updated = await setTransactionNotes(db, id, (notes as string | null | undefined) ?? '');

  if (!updated) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id, notes: notes ?? null });
}
