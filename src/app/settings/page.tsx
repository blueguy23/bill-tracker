import type { Metadata } from 'next';
import { SettingsView } from '@/components/SettingsView';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  const configured = process.env.NEXT_PUBLIC_DISCORD_CONFIGURED === 'true';

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">App configuration and integrations</p>
      </div>
      <SettingsView initialConfigured={configured} />
    </div>
  );
}
