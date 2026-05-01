import type { Metadata } from 'next';
import { getDb } from '@/adapters/db';
import { listAccounts } from '@/adapters/accounts';
import { listCategoryRules } from '@/adapters/categoryRules';
import { getUserProfile } from '@/adapters/userProfile';
import { getLastSyncAt } from '@/adapters/syncLog';
import { SettingsShell } from '@/components/settings/SettingsShell';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const configured  = process.env.NEXT_PUBLIC_DISCORD_CONFIGURED === 'true';
  const dueSoonDays = Number(process.env.BILL_DUE_SOON_DAYS ?? 3);

  const db = await getDb();
  const [accounts, categoryRules, profile, lastSyncDate] = await Promise.all([
    listAccounts(db),
    listCategoryRules(db),
    getUserProfile(db),
    getLastSyncAt(db),
  ]);

  const unknownCount = accounts.filter((a) => a.orgName === 'Unknown').length;
  const lastSyncAt   = lastSyncDate ? lastSyncDate.toISOString() : null;

  return (
    <SettingsShell
      profile={profile}
      lastSyncAt={lastSyncAt}
      discordConfigured={configured}
      dueSoonDays={dueSoonDays}
      unknownCount={unknownCount}
      accountCount={accounts.length}
      categoryRules={categoryRules}
    />
  );
}
