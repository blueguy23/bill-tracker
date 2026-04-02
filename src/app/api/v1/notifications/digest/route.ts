import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { runDailyDigest } from '@/handlers/notificationDigest';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    const result = await runDailyDigest(db);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/v1/notifications/digest]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
