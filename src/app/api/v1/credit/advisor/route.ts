import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleGetCreditAdvisor } from '@/handlers/creditAdvisor';
import { logger } from '@/lib/logger';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    return handleGetCreditAdvisor(db);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
