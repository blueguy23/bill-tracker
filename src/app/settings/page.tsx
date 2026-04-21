import type { Metadata } from 'next';
import { SettingsView } from '@/components/SettingsView';
import { CategoryRulesView } from '@/components/CategoryRulesView';
import { getDb } from '@/adapters/db';
import { listAccounts } from '@/adapters/accounts';
import { listCategoryRules } from '@/adapters/categoryRules';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const configured = process.env.NEXT_PUBLIC_DISCORD_CONFIGURED === 'true';
  const dueSoonDays = Number(process.env.BILL_DUE_SOON_DAYS ?? 3);

  const db = await getDb();
  const [accounts, categoryRules] = await Promise.all([
    listAccounts(db),
    listCategoryRules(db),
  ]);
  const unknownCount = accounts.filter((a) => a.orgName === 'Unknown').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Settings</h1>
        <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>App configuration and integrations</p>
      </div>
      <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <SettingsView initialConfigured={configured} dueSoonDays={dueSoonDays} unknownCount={unknownCount} />
        <CategoryRulesView initialRules={categoryRules} />
      </div>
    </div>
  );
}
