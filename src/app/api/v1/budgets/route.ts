import { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleGetBudgets } from '@/handlers/budgets';
import { withRequestLogging } from '@/lib/withRequestLogging';

async function _GET(_req: NextRequest) {
  const db = await getDb();
  return handleGetBudgets(db);
}

export const GET = withRequestLogging(_GET);
