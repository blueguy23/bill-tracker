import { NextResponse , NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { SimpleFINClient } from '@/lib/simplefin/client';
import { runHistoricalImport } from '@/handlers/sync';
import { logger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/withRequestLogging';

function getClient() {
  return new SimpleFINClient({ url: process.env.SIMPLEFIN_URL });
}

async function _POST(_req: NextRequest) : Promise<Response> {
  if (!process.env.SIMPLEFIN_URL) {
    return NextResponse.json(
      { error: 'SimpleFIN not configured. Set SIMPLEFIN_URL in your environment.' },
      { status: 503 },
    );
  }
  try {
    const db = await getDb();
    const client = getClient();
    const result = await runHistoricalImport(db, client);
    return NextResponse.json({ synced: true, ...result });
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withRequestLogging(_POST);
