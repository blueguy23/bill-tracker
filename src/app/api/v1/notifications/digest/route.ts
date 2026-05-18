import { NextResponse , NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { runDailyDigest } from '@/handlers/notificationDigest';
import { logger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/withRequestLogging';

async function _POST(_req: NextRequest) : Promise<Response> {
  try {
    const db = await getDb();
    const result = await runDailyDigest(db);
    return NextResponse.json(result);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withRequestLogging(_POST);
