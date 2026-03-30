import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleDeleteQuickAdd } from '@/handlers/quickAdd';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = await getDb();
  return handleDeleteQuickAdd(db, id);
}
