import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleGetCreditSummary } from '@/handlers/credit';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    return handleGetCreditSummary(db);
  } catch (err) {
    console.error('[GET /api/v1/credit/summary]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
