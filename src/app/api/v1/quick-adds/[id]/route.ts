import { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleDeleteQuickAdd } from '@/handlers/quickAdd';
import { withRequestLogging } from '@/lib/withRequestLogging';

async function _DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = await getDb();
  return handleDeleteQuickAdd(db, id);
}

export const DELETE = withRequestLogging(_DELETE);
