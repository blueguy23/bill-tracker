import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { isWebhookConfigured } from '@/lib/discord/webhook';
import { notifyTest } from '@/handlers/notifications';
import { logger } from '@/lib/logger';

export async function POST(): Promise<Response> {
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
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
