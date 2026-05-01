'use client';

import { useState } from 'react';
import type { UserProfile } from '@/types/userProfile';
import { sectionCard, sectionHeader, sectionHeaderIcon, formRow, formSelect, btnPrimary } from './settingsStyles';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface Props {
  initial: Pick<UserProfile, 'theme' | 'defaultDateRange' | 'hideTransfers' | 'compactRows' | 'numberFormat'>;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{ width: 36, height: 20, borderRadius: 10, background: on ? 'var(--accent)' : 'rgba(255,255,255,0.12)', cursor: 'pointer', position: 'relative', transition: 'background 0.15s', flexShrink: 0 }}
    >
      <div style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 14, height: 14, borderRadius: '50%', background: 'white', transition: 'left 0.15s' }} />
    </div>
  );
}

export function SectionPreferences({ initial }: Props) {
  const [theme, setTheme]               = useState(initial.theme);
  const [dateRange, setDateRange]       = useState(initial.defaultDateRange);
  const [hideTransfers, setHideTransfers] = useState(initial.hideTransfers);
  const [compactRows, setCompactRows]   = useState(initial.compactRows);
  const [numberFormat, setNumberFormat] = useState(initial.numberFormat);
  const [status, setStatus]             = useState<SaveStatus>('idle');

  async function handleSave() {
    setStatus('saving');
    try {
      const res = await fetch('/api/v1/user-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, defaultDateRange: dateRange, hideTransfers, compactRows, numberFormat }),
      });
      setStatus(res.ok ? 'saved' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div data-testid="section-preferences" style={sectionCard}>
      <div style={sectionHeader}>
        <div style={sectionHeaderIcon}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Preferences</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>Display and behaviour settings</div>
        </div>
      </div>

      <div style={formRow}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>Theme</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>App color scheme</div>
        </div>
        <select data-testid="theme-select" value={theme} onChange={(e) => setTheme(e.target.value as UserProfile['theme'])} style={formSelect}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="auto">Auto (system)</option>
        </select>
      </div>

      <div style={formRow}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>Default date range</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Starting filter on transaction views</div>
        </div>
        <select data-testid="date-range-select" value={dateRange} onChange={(e) => setDateRange(e.target.value as UserProfile['defaultDateRange'])} style={formSelect}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      <div style={formRow}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>Hide transfers</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Exclude account transfers from spending totals</div>
        </div>
        <Toggle on={hideTransfers} onChange={setHideTransfers} />
      </div>

      <div style={formRow}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>Compact rows</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Reduce row height in transaction lists</div>
        </div>
        <Toggle on={compactRows} onChange={setCompactRows} />
      </div>

      <div style={formRow}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>Number format</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Thousands separator and decimal style</div>
        </div>
        <select data-testid="number-format-select" value={numberFormat} onChange={(e) => setNumberFormat(e.target.value as UserProfile['numberFormat'])} style={formSelect}>
          <option value="en-US">1,234.56 (US)</option>
          <option value="en-GB">1,234.56 (UK)</option>
          <option value="de-DE">1.234,56 (EU)</option>
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
