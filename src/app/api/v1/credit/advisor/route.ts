import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleGetCreditAdvisor } from '@/handlers/creditAdvisor';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    return handleGetCreditAdvisor(db);
  } catch (err) {
    console.error('[GET /api/v1/credit/advisor]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
