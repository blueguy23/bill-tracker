import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleGetCreditSettings, handleSaveCreditSettings } from '@/handlers/creditSettings';
import type { SaveCreditSettingsDto } from '@/types/creditAdvisor';
import { logger } from '@/lib/logger';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    return handleGetCreditSettings(db);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json() as SaveCreditSettingsDto;
    if (!Array.isArray(body.settings)) {
      return NextResponse.json({ error: 'settings must be an array' }, { status: 400 });
    }
    const db = await getDb();
    return handleSaveCreditSettings(db, body);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
