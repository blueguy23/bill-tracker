import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleGetCreditSummary } from '@/handlers/credit';
import { logger } from '@/lib/logger';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    return handleGetCreditSummary(db);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
