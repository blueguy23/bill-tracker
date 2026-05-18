import { NextResponse , NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleGetCreditAdvisor } from '@/handlers/creditAdvisor';
import { logger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/withRequestLogging';

async function _GET(_req: NextRequest) : Promise<Response> {
  try {
    const db = await getDb();
    return handleGetCreditAdvisor(db);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRequestLogging(_GET);
