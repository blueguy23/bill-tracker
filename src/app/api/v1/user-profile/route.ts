import { NextResponse } from 'next/server';
import { getDb } from '@/adapters/db';
import { handleGetUserProfile, handlePatchUserProfile } from '@/handlers/userProfile';
import type { UserProfilePatch } from '@/types/userProfile';

export async function GET(): Promise<Response> {
  try {
    const db = await getDb();
    return handleGetUserProfile(db);
  } catch (err) {
    console.error('[GET /api/v1/user-profile]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request): Promise<Response> {
  try {
    const body = await req.json() as UserProfilePatch;
    const db = await getDb();
    return handlePatchUserProfile(db, body);
  } catch (err) {
    console.error('[PATCH /api/v1/user-profile]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
