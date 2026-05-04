import type { StrictDB } from 'strictdb';
import type { UserProfile, UserProfilePatch } from '@/types/userProfile';

const COLLECTION = 'userProfile';
const SINGLETON_ID = 'singleton' as const;

const DEFAULTS: Omit<UserProfile, '_id'> = {
  displayName: '',
  ownerName: '',
  payday: null,
  currency: 'USD',
  timezone: 'America/Chicago',
  theme: 'dark',
  defaultDateRange: '30d',
  hideTransfers: true,
  compactRows: false,
  numberFormat: 'en-US',
};

export async function getUserProfile(db: StrictDB): Promise<UserProfile> {
  const doc = await db.queryOne<UserProfile>(COLLECTION, { _id: SINGLETON_ID });
  return doc ?? { _id: SINGLETON_ID, ...DEFAULTS };
}

export async function upsertUserProfile(db: StrictDB, patch: UserProfilePatch): Promise<void> {
  await db.updateOne<UserProfile>(
    COLLECTION,
    { _id: SINGLETON_ID },
    { $set: { _id: SINGLETON_ID, ...patch } },
    true,
  );
}
