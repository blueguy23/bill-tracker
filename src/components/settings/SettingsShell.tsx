'use client';

import { useState } from 'react';
import type { UserProfile } from '@/types/userProfile';
import type { CategoryRule } from '@/lib/categorization/types';
import { SectionAccountHero } from './SectionAccountHero';
import { SectionAccount } from './SectionAccount';
import { SectionConnections } from './SectionConnections';
import { SectionNotifications } from './SectionNotifications';
import { SectionPreferences } from './SectionPreferences';
import { CategoryRulesView } from '@/components/CategoryRulesView';
import { SettingsModal } from './SettingsModal';

interface Props {
  profile: UserProfile;
  lastSyncAt: string | null;
  discordConfigured: boolean;
  dueSoonDays: number;
  unknownCount: number;
  accountCount: number;
  categoryRules: CategoryRule[];
}

type SectionKey = 'account' | 'connections' | 'notifications' | 'preferences' | 'categories';

interface SectionDef {
  key: SectionKey;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const SECTIONS: SectionDef[] = [
  {
    key: 'account',
    title: 'Account',
    subtitle: 'Profile and financial preferences',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    key: 'connections',
    title: 'Connections',
    subtitle: 'SimpleFIN accounts and sync',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
  {
    key: 'notifications',
    title: 'Notifications',
    subtitle: 'Discord alerts and events',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    key: 'preferences',
    title: 'Preferences',
    subtitle: 'Display and behaviour settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2" />
      </svg>
    ),
  },
  {
    key: 'categories',
    title: 'Categories',
    subtitle: 'Transaction categorization rules',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
];

const MODAL_META: Record<SectionKey, { title: string; subtitle: string }> = {
  account:       { title: 'Account',       subtitle: 'Your profile and financial preferences' },
  connections:   { title: 'Connections',   subtitle: 'SimpleFIN accounts and sync settings' },
  notifications: { title: 'Notifications', subtitle: 'Discord webhook alerts and event configuration' },
  preferences:   { title: 'Preferences',   subtitle: 'Display and behaviour settings' },
  categories:    { title: 'Categories',    subtitle: 'Transaction categorization rules' },
};

export function SettingsShell({ profile, lastSyncAt, discordConfigured, dueSoonDays, unknownCount, accountCount, categoryRules }: Props) {
  const [active, setActive] = useState<SectionKey | null>(null);

  function close() { setActive(null); }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: 2 }}>Settings</h1>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Account, connections, and preferences</span>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <SectionAccountHero
          displayName={profile.displayName}
          lastSyncAt={lastSyncAt}
          discordConfigured={discordConfigured}
          accountCount={accountCount}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {SECTIONS.map((s) => (
            <SettingCard
              key={s.key}
              title={s.title}
              subtitle={s.subtitle}
              icon={s.icon}
              onClick={() => setActive(s.key)}
            />
          ))}
        </div>
      </div>

      {active && (
        <SettingsModal
          title={MODAL_META[active].title}
          subtitle={MODAL_META[active].subtitle}
          onClose={close}
        >
          {active === 'account' && (
            <SectionAccount
              initial={{
                displayName: profile.displayName,
                ownerName: profile.ownerName,
                payday: profile.payday,
                currency: profile.currency,
                timezone: profile.timezone,
              }}
            />
          )}
          {active === 'connections' && <SectionConnections unknownCount={unknownCount} />}
          {active === 'notifications' && <SectionNotifications configured={discordConfigured} dueSoonDays={dueSoonDays} />}
          {active === 'preferences' && (
            <SectionPreferences
              initial={{
                defaultDateRange: profile.defaultDateRange,
                hideTransfers: profile.hideTransfers,
                compactRows: profile.compactRows,
                numberFormat: profile.numberFormat,
              }}
            />
          )}
          {active === 'categories' && <CategoryRulesView initialRules={categoryRules} />}
        </SettingsModal>
      )}
    </div>
  );
}

interface CardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function SettingCard({ title, subtitle, icon, onClick }: CardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 18px',
        background: hovered ? 'var(--raised)' : 'var(--surface)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.12)' : 'var(--border)'}`,
        borderRadius: 12,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition: 'background 0.12s, border-color 0.12s',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          background: hovered ? 'rgba(99,102,241,0.15)' : 'var(--raised)',
          border: `1px solid ${hovered ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: hovered ? 'var(--accent)' : 'var(--text3)',
          flexShrink: 0,
          transition: 'background 0.12s, border-color 0.12s, color 0.12s',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--sans)' }}>{subtitle}</div>
      </div>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={{ color: hovered ? 'var(--accent)' : 'var(--text3)', flexShrink: 0, transition: 'color 0.12s, transform 0.12s', transform: hovered ? 'translateX(2px)' : 'none' }}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}
