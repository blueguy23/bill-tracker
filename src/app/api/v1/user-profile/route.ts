import { NextResponse , NextRequest } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleGetUserProfile, handlePatchUserProfile } from '@/handlers/userProfile';
import type { UserProfilePatch } from '@/types/userProfile';
import { logger } from '@/lib/logger';
import { withRequestLogging } from '@/lib/withRequestLogging';

async function _GET(_req: NextRequest) : Promise<Response> {
  try {
    const db = await getDb();
    return handleGetUserProfile(db);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function _PATCH(req: Request): Promise<Response> {
  try {
    const body = await req.json() as UserProfilePatch;
    const db = await getDb();
    return handlePatchUserProfile(db, body);
  } catch (err) {
    logger.error('route.error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withRequestLogging(_GET);
export const PATCH = withRequestLogging(_PATCH);
