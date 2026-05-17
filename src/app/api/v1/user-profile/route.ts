import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleGetUserProfile, handlePatchUserProfile } from '@/handlers/userProfile';
import type { UserProfilePatch } from '@/types/userProfile';
import { logger } from '@/lib/logger';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    return handleGetUserProfile(db);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request): Promise<Response> {
  try {
    const body = await req.json() as UserProfilePatch;
    const db = await getDb();
    return handlePatchUserProfile(db, body);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
