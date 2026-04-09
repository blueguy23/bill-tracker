import type { Metadata } from 'next';
import { SettingsView } from '@/components/SettingsView';
import { getDb } from '@/adapters/db';
import { listAccounts } from '@/adapters/accounts';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const configured = process.env.NEXT_PUBLIC_DISCORD_CONFIGURED === 'true';
  const dueSoonDays = Number(process.env.BILL_DUE_SOON_DAYS ?? 3);

  const db = await getDb();
  const accounts = await listAccounts(db);
  const unknownCount = accounts.filter((a) => a.orgName === 'Unknown').length;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-sky-700 mt-0.5">App configuration and integrations</p>
      </div>
      <SettingsView initialConfigured={configured} dueSoonDays={dueSoonDays} unknownCount={unknownCount} />
    </div>
  );
}
