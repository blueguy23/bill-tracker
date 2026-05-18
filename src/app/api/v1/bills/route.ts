import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleListBills, handleCreateBill } from '@/handlers/bills';
import { logger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/withRequestLogging';

async function _GET(_req: NextRequest) : Promise<Response> {
  try {
    const db = await getDb();
    return handleListBills(db);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function _POST(req: NextRequest): Promise<Response> {
  try {
    const db = await getDb();
    return handleCreateBill(db, req);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRequestLogging(_GET);
export const POST = withRequestLogging(_POST);
