import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { isWebhookConfigured } from '@/lib/discord/webhook';
import { notifyTest } from '@/handlers/notifications';

export async function GET(): Promise<Response> {
  if (!isWebhookConfigured()) {
    return NextResponse.json(
      { error: 'DISCORD_WEBHOOK_URL is not configured' },
      { status: 503 },
    );
  }
  try {
    const db = await getDb();
    await notifyTest(db);
    return NextResponse.json({ sent: true, message: 'Test notification sent' });
  } catch (err) {
    console.error('[GET /api/v1/notifications/test]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
