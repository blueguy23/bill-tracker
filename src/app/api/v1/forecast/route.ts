import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleGetForecast } from '@/handlers/forecast';
import { logger } from '@/lib/logger';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    return handleGetForecast(db);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
