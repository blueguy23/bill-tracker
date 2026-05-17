import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleGetForecast } from '@/handlers/forecast';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    return handleGetForecast(db);
  } catch (err) {
    console.error('[GET /api/v1/forecast]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
