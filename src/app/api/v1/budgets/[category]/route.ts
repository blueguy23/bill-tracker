import type { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleSetBudget } from '@/handlers/budgets';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ category: string }> },
) {
  const { category } = await params;
  const db = await getDb();
  return handleSetBudget(db, category, req);
}
