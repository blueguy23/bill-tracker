import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleGetCreditSettings, handleSaveCreditSettings } from '@/handlers/creditSettings';
import type { SaveCreditSettingsDto } from '@/types/creditAdvisor';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    return handleGetCreditSettings(db);
  } catch (err) {
    console.error('[GET /api/v1/credit/settings]', err);
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
    console.error('[POST /api/v1/credit/settings]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
