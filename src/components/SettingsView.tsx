'use client';

import { useState, useEffect } from 'react';
import type { CreditSettingsEntry } from '@/types/creditAdvisor';
import type { Account } from '@/lib/simplefin/types';

interface SettingsViewProps {
  initialConfigured: boolean;
  dueSoonDays: number;
  unknownCount?: number;
}

type TestStatus = 'idle' | 'loading' | 'success' | 'error';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const TYPE_ICON: Record<string, string> = {
  checking: '🏦', savings: '💰', credit: '💳', investment: '📈', loan: '🏠',
};

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
};

const sectionHead: React.CSSProperties = {
  padding: '16px 20px', borderBottom: '1px solid var(--border)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};

const sectionTitle: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)',
};

const sectionSub: React.CSSProperties = {
  fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 3,
};

const inputStyle: React.CSSProperties = {
  background: 'var(--raised)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '7px 10px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--mono)',
  outline: 'none', width: '100%',
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)',
  color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)', fontWeight: 600,
};

export function SettingsView({ initialConfigured, dueSoonDays, unknownCount = 0 }: SettingsViewProps) {
  const [testStatus, setTestStatus]       = useState<TestStatus>('idle');
  const [testMessage, setTestMessage]     = useState('');
  const [creditSettings, setCreditSettings] = useState<CreditSettingsEntry[]>([]);
  const [saveStatus, setSaveStatus]       = useState<SaveStatus>('idle');
  const [accounts, setAccounts]           = useState<Account[]>([]);
  const [accountNames, setAccountNames]   = useState<Record<string, string>>({});
  const [nameSaveStatus, setNameSaveStatus] = useState<SaveStatus>('idle');
  const [syncingFromBanner, setSyncingFromBanner] = useState(false);

  useEffect(() => {
    fetch('/api/v1/credit/settings')
      .then((r) => r.json() as Promise<{ settings: CreditSettingsEntry[] }>)
      .then((d) => setCreditSettings(d.settings ?? []))
      .catch(() => {});

    fetch('/api/v1/accounts')
      .then((r) => r.json() as Promise<{ accounts: Account[] }>)
      .then((d) => {
        setAccounts(d.accounts ?? []);
        const names: Record<string, string> = {};
        for (const a of d.accounts ?? []) names[a._id] = a.orgName;
        setAccountNames(names);
      })
      .catch(() => {});
  }, []);

  async function handleSaveAccountNames() {
    setNameSaveStatus('saving');
    try {
      await Promise.all(
        accounts.map((a) =>
          fetch(`/api/v1/accounts/${a._id}/meta`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customOrgName: accountNames[a._id] ?? null }),
          }),
        ),
      );
      setNameSaveStatus('saved');
    } catch {
      setNameSaveStatus('error');
    }
  }

  function updateSetting(accountId: string, field: keyof CreditSettingsEntry, value: unknown) {
    setCreditSettings((prev) =>
      prev.map((s) => s.accountId === accountId ? { ...s, [field]: value } : s),
    );
  }

  async function handleSendTest() {
    setTestStatus('loading'); setTestMessage('');
    try {
      const res  = await fetch('/api/v1/notifications/test');
      const body = await res.json() as { sent?: boolean; message?: string; error?: string };
      if (res.ok && body.sent) { setTestStatus('success'); setTestMessage(body.message ?? 'Test notification sent'); }
      else { setTestStatus('error'); setTestMessage(body.error ?? 'Failed to send test notification'); }
    } catch {
      setTestStatus('error'); setTestMessage('Network error — could not reach the server');
    }
  }

  async function handleSaveCreditSettings() {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/v1/credit/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: creditSettings.map((s) => ({
            accountId: s.accountId, statementClosingDay: s.statementClosingDay,
            targetUtilization: s.targetUtilization, manualCreditLimit: s.manualCreditLimit,
          })),
        }),
      });
      setSaveStatus(res.ok ? 'saved' : 'error');
    } catch { setSaveStatus('error'); }
  }

  async function handleBannerSync() {
    setSyncingFromBanner(true);
    try { await fetch('/api/v1/sync', { method: 'POST' }); }
    finally { setSyncingFromBanner(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Unknown accounts warning */}
      {unknownCount > 0 && (
        <div style={{ background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }}>⚠</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', fontFamily: 'var(--sans)' }}>
              {unknownCount} account{unknownCount !== 1 ? 's' : ''} couldn&apos;t be identified
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 3 }}>
              Their names show as &ldquo;Unknown&rdquo;. This happens when SimpleFIN doesn&apos;t send institution data.
              Try syncing again, or rename them below.
            </div>
          </div>
          <button
            onClick={handleBannerSync}
            disabled={syncingFromBanner}
            style={{ flexShrink: 0, padding: '6px 12px', fontSize: 12, fontWeight: 600, borderRadius: 8, border: 'none', background: 'rgba(245,158,11,.2)', color: 'var(--gold)', cursor: 'pointer', opacity: syncingFromBanner ? 0.5 : 1 }}
          >
            {syncingFromBanner ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      )}

      {/* Connected Accounts */}
      {accounts.length > 0 && (
        <div style={cardStyle}>
          <div style={sectionHead}>
            <div>
              <div style={sectionTitle}>Connected Accounts</div>
              <div style={sectionSub}>Your synced SimpleFIN accounts</div>
            </div>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {accounts.map((a) => (
              <div key={a._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--raised)', borderRadius: 8 }}>
                <span style={{ fontSize: 18 }}>{TYPE_ICON[a.accountType] ?? '🏦'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{a.orgName.toUpperCase()} · {a.accountType}</div>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: a.balance < 0 ? 'var(--red)' : 'var(--text)' }}>
                  {USD.format(a.balance)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discord Notifications */}
      <div style={cardStyle}>
        <div style={sectionHead}>
          <div>
            <div style={sectionTitle}>Discord Notifications</div>
            <div style={sectionSub}>Bill alerts, budget warnings, and daily digest</div>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 4,
            fontFamily: 'var(--mono)', letterSpacing: '.04em',
            background: initialConfigured ? 'rgba(34,197,94,.12)' : 'rgba(113,113,122,.12)',
            color: initialConfigured ? 'var(--green)' : 'var(--text3)',
          }}>
            {initialConfigured ? 'CONFIGURED' : 'NOT SET'}
          </span>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)', marginBottom: 12 }}>
            Set <code style={{ fontFamily: 'var(--mono)', color: 'var(--text2)' }}>DISCORD_WEBHOOK_URL</code> in your .env file to enable notifications.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleSendTest}
              disabled={!initialConfigured || testStatus === 'loading'}
              style={{ ...btnPrimary, opacity: !initialConfigured || testStatus === 'loading' ? 0.4 : 1, cursor: !initialConfigured || testStatus === 'loading' ? 'not-allowed' : 'pointer' }}
            >
              {testStatus === 'loading' ? 'Sending…' : 'Send Test Notification'}
            </button>
            {testStatus === 'success' && <span style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--sans)' }}>{testMessage}</span>}
            {testStatus === 'error' && <span style={{ fontSize: 12, color: 'var(--red)', fontFamily: 'var(--sans)' }}>{testMessage}</span>}
          </div>
        </div>
      </div>

      {/* Notification Events reference */}
      <div style={cardStyle}>
        <div style={sectionHead}>
          <div style={sectionTitle}>Notification Events</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { event: 'Bill Due Soon',       desc: `Bills due within ${dueSoonDays} days`,             color: 'var(--gold)' },
            { event: 'Bill Overdue',        desc: 'Unpaid bills past their due date',                 color: 'var(--red)' },
            { event: 'Budget Warning',      desc: 'Category spending reaches 80%+',                   color: 'var(--gold)' },
            { event: 'Budget Exceeded',     desc: 'Category spending exceeds budget',                 color: 'var(--red)' },
            { event: 'Sync Completed',      desc: 'SimpleFIN sync finishes successfully',             color: 'var(--green)' },
            { event: 'Statement Closing',   desc: 'Pay down before close to lower reported utilization', color: 'var(--gold)' },
            { event: 'High Utilization',    desc: 'Credit card crosses 70% utilization after sync',   color: 'var(--red)' },
            { event: 'Daily Digest',        desc: 'Morning summary via /api/v1/notifications/digest', color: 'var(--accent)' },
          ].map(({ event, desc, color }, i, arr) => (
            <div key={event} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color, fontFamily: 'var(--sans)' }}>{event}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--sans)', marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credit Card Statements */}
      {creditSettings.length > 0 && (
        <div style={cardStyle}>
          <div style={sectionHead}>
            <div>
              <div style={sectionTitle}>Credit Card Statements</div>
              <div style={sectionSub}>Set closing dates to get paydown alerts before your balance is reported to bureaus</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {creditSettings.map((s, i) => (
              <div key={s.accountId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < creditSettings.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)', flex: 1, minWidth: 0, fontFamily: 'var(--sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.accountName}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <label style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>CLOSES DAY</label>
                    <input type="number" min={1} max={31} placeholder="1–31" value={s.statementClosingDay ?? ''} onChange={(e) => updateSetting(s.accountId, 'statementClosingDay', e.target.value ? Number(e.target.value) : null)} style={{ ...inputStyle, width: 60 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <label style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>TARGET %</label>
                    <input type="number" min={0} max={100} placeholder="5" value={Math.round(s.targetUtilization * 100)} onChange={(e) => updateSetting(s.accountId, 'targetUtilization', Number(e.target.value) / 100)} style={{ ...inputStyle, width: 60 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <label style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>CREDIT LIMIT</label>
                    <input type="number" min={0} step={100} placeholder="e.g. 5000" value={s.manualCreditLimit ?? ''} onChange={(e) => updateSetting(s.accountId, 'manualCreditLimit', e.target.value ? Number(e.target.value) : null)} style={{ ...inputStyle, width: 90 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handleSaveCreditSettings} disabled={saveStatus === 'saving'} style={{ ...btnPrimary, opacity: saveStatus === 'saving' ? 0.4 : 1, cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer' }}>
              {saveStatus === 'saving' ? 'Saving…' : 'Save'}
            </button>
            {saveStatus === 'saved' && <span style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--sans)' }}>Saved</span>}
            {saveStatus === 'error'  && <span style={{ fontSize: 12, color: 'var(--red)', fontFamily: 'var(--sans)' }}>Failed to save</span>}
          </div>
        </div>
      )}

      {/* Account Names */}
      {accounts.length > 0 && (
        <div style={cardStyle}>
          <div style={sectionHead}>
            <div>
              <div style={sectionTitle}>Account Names</div>
              <div style={sectionSub}>Override the bank name shown in the app</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {accounts.map((a, i) => (
              <div key={a._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < accounts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                </div>
                <input type="text" value={accountNames[a._id] ?? ''} onChange={(e) => setAccountNames((prev) => ({ ...prev, [a._id]: e.target.value }))} placeholder="Bank name" style={{ ...inputStyle, width: 180 }} />
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={handleSaveAccountNames} disabled={nameSaveStatus === 'saving'} style={{ ...btnPrimary, opacity: nameSaveStatus === 'saving' ? 0.4 : 1, cursor: nameSaveStatus === 'saving' ? 'not-allowed' : 'pointer' }}>
              {nameSaveStatus === 'saving' ? 'Saving…' : 'Save Names'}
            </button>
            {nameSaveStatus === 'saved' && <span style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--sans)' }}>Saved — reload to see changes</span>}
            {nameSaveStatus === 'error'  && <span style={{ fontSize: 12, color: 'var(--red)', fontFamily: 'var(--sans)' }}>Failed to save</span>}
          </div>
        </div>
      )}
    </div>
  );
}
