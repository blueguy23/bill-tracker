import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { setTransactionTags } from '@/adapters/transactionTags';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  let body: { tags?: unknown };
  try {
    body = await req.json() as { tags?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { tags } = body;
  if (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string')) {
    return NextResponse.json({ error: 'tags must be an array of strings' }, { status: 400 });
  }

  if (tags.length > 10) {
    return NextResponse.json({ error: 'Maximum 10 tags per transaction' }, { status: 400 });
  }
  if (tags.some((t) => (t as string).length > 100)) {
    return NextResponse.json({ error: 'Each tag must be 100 characters or fewer' }, { status: 400 });
  }

  const db = await getDb();
  const updated = await setTransactionTags(db, id, tags as string[]);

  if (!updated) {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id, tags });
}
