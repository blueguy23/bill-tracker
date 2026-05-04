import type { UserProfile } from '@/types/userProfile';
import type { CategoryRule } from '@/lib/categorization/types';
import { SettingsNav } from './SettingsNav';
import { SectionAccountHero } from './SectionAccountHero';
import { SectionAccount } from './SectionAccount';
import { SectionConnections } from './SectionConnections';
import { SectionNotifications } from './SectionNotifications';
import { SectionPreferences } from './SectionPreferences';
import { CategoryRulesView } from '@/components/CategoryRulesView';

interface Props {
  profile: UserProfile;
  lastSyncAt: string | null;
  discordConfigured: boolean;
  dueSoonDays: number;
  unknownCount: number;
  accountCount: number;
  categoryRules: CategoryRule[];
}

export function SettingsShell({ profile, lastSyncAt, discordConfigured, dueSoonDays, unknownCount, accountCount, categoryRules }: Props) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--sans)', marginBottom: 2 }}>Settings</h1>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Account, connections, and preferences</span>
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', gap: 24 }}>
        <SettingsNav />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>
          <SectionAccountHero
            displayName={profile.displayName}
            lastSyncAt={lastSyncAt}
            discordConfigured={discordConfigured}
            accountCount={accountCount}
          />

          <div id="section-account">
            <SectionAccount initial={{ displayName: profile.displayName, ownerName: profile.ownerName, payday: profile.payday, currency: profile.currency, timezone: profile.timezone }} />
          </div>

          <div id="section-connections">
            <SectionConnections unknownCount={unknownCount} />
          </div>

          <div id="section-notifications">
            <SectionNotifications configured={discordConfigured} dueSoonDays={dueSoonDays} />
          </div>

          <div id="section-preferences">
            <SectionPreferences initial={{ theme: profile.theme, defaultDateRange: profile.defaultDateRange, hideTransfers: profile.hideTransfers, compactRows: profile.compactRows, numberFormat: profile.numberFormat }} />
          </div>

          <div id="section-category-rules">
            <CategoryRulesView initialRules={categoryRules} />
          </div>
        </div>
      </div>
    </div>
  );
}
