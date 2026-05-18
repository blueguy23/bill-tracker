import { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleCreateQuickAdd } from '@/handlers/quickAdd';
import { withRequestLogging } from '@/lib/withRequestLogging';

async function _POST(req: NextRequest) {
  const db = await getDb();
  return handleCreateQuickAdd(db, req);
}

export const POST = withRequestLogging(_POST);
