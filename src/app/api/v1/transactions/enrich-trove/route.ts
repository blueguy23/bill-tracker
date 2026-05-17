import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { enrichWithTrove } from '@/handlers/troveEnrich';
import { logger } from '@/lib/logger';

export async function POST(): Promise<Response> {
  if (!process.env.TROVE_API_KEY) {
    return NextResponse.json({ error: 'TROVE_API_KEY not configured' }, { status: 503 });
  }

  try {
    const db = await getDb();
    const result = await enrichWithTrove(db, 'all');
    return NextResponse.json(result);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
