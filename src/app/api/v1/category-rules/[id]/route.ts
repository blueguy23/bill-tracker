import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { deleteCategoryRule } from '@/adapters/categoryRules';
import { withRequestLogging } from '@/lib/withRequestLogging';

async function _DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const db = await getDb();
  const deleted = await deleteCategoryRule(db, id);

  if (!deleted) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id });
}

export const DELETE = withRequestLogging(_DELETE);
