'use client';

import { useState } from 'react';
import type { UserProfile } from '@/types/userProfile';
import { sectionCard, sectionHeader, sectionHeaderIcon, formRow, formInput, formSelect, btnPrimary } from './settingsStyles';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface Props {
  initial: Pick<UserProfile, 'displayName' | 'payday' | 'currency' | 'timezone'>;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'MXN'];
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'Europe/London', 'Europe/Paris',
  'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
];

export function SectionAccount({ initial }: Props) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [payday, setPayday]           = useState<string>(initial.payday?.toString() ?? '');
  const [currency, setCurrency]       = useState(initial.currency);
  const [timezone, setTimezone]       = useState(initial.timezone);
  const [status, setStatus]           = useState<SaveStatus>('idle');

  async function handleSave() {
    setStatus('saving');
    try {
      const res = await fetch('/api/v1/user-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          payday: payday ? Number(payday) : null,
          currency,
          timezone,
        }),
      });
      setStatus(res.ok ? 'saved' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div data-testid="section-account" style={sectionCard}>
      <div style={sectionHeader}>
        <div style={sectionHeaderIcon}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Account</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>Your profile and financial preferences</div>
        </div>
      </div>

      <div style={formRow}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>Display name</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Shown in the account hero</div>
        </div>
        <input
          data-testid="display-name-input"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          style={formInput}
        />
      </div>

      <div style={formRow}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>Payday</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Day of month you get paid (1–31)</div>
        </div>
        <input
          data-testid="payday-input"
          type="number"
          min={1}
          max={31}
          value={payday}
          onChange={(e) => setPayday(e.target.value)}
          placeholder="e.g. 24"
          style={{ ...formInput, minWidth: 80 }}
        />
      </div>

      <div style={formRow}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>Currency</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Used for display formatting</div>
        </div>
        <select data-testid="currency-select" value={currency} onChange={(e) => setCurrency(e.target.value)} style={formSelect}>
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={formRow}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>Timezone</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>For date calculations and display</div>
        </div>
        <select data-testid="timezone-select" value={timezone} onChange={(e) => setTimezone(e.target.value)} style={formSelect}>
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </div>

      <div style={{ padding: '13px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={handleSave} disabled={status === 'saving'} style={{ ...btnPrimary, opacity: status === 'saving' ? 0.5 : 1, cursor: status === 'saving' ? 'not-allowed' : 'pointer' }}>
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status === 'saved' && <span style={{ fontSize: 12, color: 'var(--green)' }}>Saved</span>}
        {status === 'error'  && <span style={{ fontSize: 12, color: 'var(--red)' }}>Failed to save</span>}
      </div>
    </div>
  );
}
