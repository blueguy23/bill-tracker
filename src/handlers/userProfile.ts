import { NextResponse } from 'next/server';
import type { StrictDB } from 'strictdb';
import type { UserProfilePatch } from '@/types/userProfile';
import { getUserProfile, upsertUserProfile } from '@/adapters/userProfile';

export async function handleGetUserProfile(db: StrictDB): Promise<Response> {
  const profile = await getUserProfile(db);
  return NextResponse.json(profile);
}

export async function handlePatchUserProfile(db: StrictDB, patch: UserProfilePatch): Promise<Response> {
  if (patch.payday !== undefined && patch.payday !== null) {
    const day = Number(patch.payday);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return NextResponse.json({ error: 'payday must be an integer between 1 and 31' }, { status: 400 });
    }
    patch.payday = day;
  }
  await upsertUserProfile(db, patch);
  const updated = await getUserProfile(db);
  return NextResponse.json(updated);
}
