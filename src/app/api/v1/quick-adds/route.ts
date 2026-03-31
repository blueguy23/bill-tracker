import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleCreateQuickAdd } from '@/handlers/quickAdd';

export async function POST(req: NextRequest) {
  const db = await getDb();
  return handleCreateQuickAdd(db, req);
}
