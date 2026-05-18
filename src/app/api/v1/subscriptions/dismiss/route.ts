import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleDismissSubscription } from '@/handlers/subscriptions';
import { logger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/withRequestLogging';

async function _POST(req: NextRequest): Promise<Response> {
  try {
    const db = await getDb();
    return handleDismissSubscription(db, req);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withRequestLogging(_POST);
