'use client';

import { useState, useEffect } from 'react';
import type { Account } from '@/lib/simplefin/types';
import type { CreditSettingsEntry } from '@/types/creditAdvisor';
import { sectionCard, sectionHeader, sectionHeaderIcon, formInput, btnPrimary, btnGhost } from './settingsStyles';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface Props {
  unknownCount: number;
}

const TYPE_ICON: Record<string, string> = {
  checking: '🏦', savings: '💰', credit: '💳', investment: '📈', loan: '🏠',
};

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const numInput: React.CSSProperties = {
  background: 'var(--raised)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 7,
  padding: '7px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--mono)',
  outline: 'none',
};

export function SectionConnections({ unknownCount }: Props) {
  const [accounts, setAccounts]             = useState<Account[]>([]);
  const [accountNames, setAccountNames]     = useState<Record<string, string>>({});
  const [creditSettings, setCreditSettings] = useState<CreditSettingsEntry[]>([]);
  const [nameSave, setNameSave]             = useState<SaveStatus>('idle');
  const [creditSave, setCreditSave]         = useState<SaveStatus>('idle');
  const [syncing, setSyncing]               = useState(false);

  useEffect(() => {
    void Promise.all([
      fetch('/api/v1/accounts').then((r) => r.json() as Promise<{ accounts: Account[] }>).then((d) => {
        const accs = d.accounts ?? [];
        setAccounts(accs);
        const names: Record<string, string> = {};
        for (const a of accs) names[a._id] = a.orgName;
        setAccountNames(names);
      }),
      fetch('/api/v1/credit/settings').then((r) => r.json() as Promise<{ settings: CreditSettingsEntry[] }>).then((d) => {
        setCreditSettings(d.settings ?? []);
      }),
    ]).catch(() => {});
  }, []);

  function updateCredit(accountId: string, field: keyof CreditSettingsEntry, value: unknown) {
    setCreditSettings((prev) => prev.map((s) => s.accountId === accountId ? { ...s, [field]: value } : s));
  }

  async function handleSaveNames() {
    setNameSave('saving');
    try {
      await Promise.all(accounts.map((a) =>
        fetch(`/api/v1/accounts/${a._id}/meta`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customOrgName: accountNames[a._id] ?? null }),
        }),
      ));
      setNameSave('saved');
    } catch { setNameSave('error'); }
  }

  async function handleSaveCreditSettings() {
    setCreditSave('saving');
    try {
      const res = await fetch('/api/v1/credit/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: creditSettings.map(({ accountId, statementClosingDay, targetUtilization, manualCreditLimit }) =>
            ({ accountId, statementClosingDay, targetUtilization, manualCreditLimit }),
          ),
        }),
      });
      setCreditSave(res.ok ? 'saved' : 'error');
    } catch { setCreditSave('error'); }
  }

  async function handleSync() {
    setSyncing(true);
    try { await fetch('/api/v1/sync', { method: 'POST' }); }
    finally { setSyncing(false); }
  }

  return (
    <div data-testid="section-connections" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {unknownCount > 0 && (
        <div style={{ background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }}>⚠</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>
              {unknownCount} account{unknownCount !== 1 ? 's' : ''} couldn&apos;t be identified
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
              Their names show as &ldquo;Unknown&rdquo;. Try syncing again, or rename them below.
            </div>
          </div>
          <button onClick={handleSync} disabled={syncing} style={{ ...btnGhost, flexShrink: 0, background: 'rgba(245,158,11,.2)', color: 'var(--gold)', border: 'none', opacity: syncing ? 0.5 : 1, cursor: syncing ? 'not-allowed' : 'pointer' }}>
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      )}

      <div style={sectionCard}>
        <div style={sectionHeader}>
          <div style={sectionHeaderIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Connections</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>SimpleFIN accounts and sync settings</div>
          </div>
          <button onClick={handleSync} disabled={syncing} style={{ ...btnGhost, marginLeft: 'auto', opacity: syncing ? 0.5 : 1, cursor: syncing ? 'not-allowed' : 'pointer', fontSize: 11 }}>
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>

        {accounts.length === 0 ? (
          <div style={{ padding: '20px', fontSize: 12, color: 'var(--text3)' }}>No accounts synced yet.</div>
        ) : (
          accounts.map((a, i) => (
            <div key={a._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < accounts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <span style={{ fontSize: 18 }}>{TYPE_ICON[a.accountType] ?? '🏦'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{a.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{a.orgName.toUpperCase()} · {a.accountType}</div>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: a.balance < 0 ? 'var(--red)' : 'var(--text)' }}>
                {USD.format(a.balance)}
              </div>
            </div>
          ))
        )}
      </div>

      {accounts.length > 0 && (
        <div style={sectionCard}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Account Names</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>Override the institution name shown in the app</div>
          </div>
          {accounts.map((a, i) => (
            <div key={a._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < accounts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ flex: 1, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
              <input type="text" value={accountNames[a._id] ?? ''} onChange={(e) => setAccountNames((prev) => ({ ...prev, [a._id]: e.target.value }))} placeholder="Bank name" style={{ ...formInput, minWidth: 180 }} />
            </div>
          ))}
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={handleSaveNames} disabled={nameSave === 'saving'} style={{ ...btnPrimary, opacity: nameSave === 'saving' ? 0.5 : 1, cursor: nameSave === 'saving' ? 'not-allowed' : 'pointer' }}>
              {nameSave === 'saving' ? 'Saving…' : 'Save Names'}
            </button>
            {nameSave === 'saved' && <span style={{ fontSize: 12, color: 'var(--green)' }}>Saved — reload to see changes</span>}
            {nameSave === 'error'  && <span style={{ fontSize: 12, color: 'var(--red)' }}>Failed to save</span>}
          </div>
        </div>
      )}

      {creditSettings.length > 0 && (
        <div style={sectionCard}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Credit Card Statements</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>Set closing dates to get paydown alerts before your balance is reported</div>
          </div>
          {creditSettings.map((s, i) => (
            <div key={s.accountId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < creditSettings.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.accountName}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>CLOSES DAY</label>
                  <input type="number" min={1} max={31} placeholder="1–31" value={s.statementClosingDay ?? ''} onChange={(e) => updateCredit(s.accountId, 'statementClosingDay', e.target.value ? Number(e.target.value) : null)} style={{ ...numInput, width: 60 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>TARGET %</label>
                  <input type="number" min={0} max={100} placeholder="5" value={Math.round(s.targetUtilization * 100)} onChange={(e) => updateCredit(s.accountId, 'targetUtilization', Number(e.target.value) / 100)} style={{ ...numInput, width: 60 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>CREDIT LIMIT</label>
                  <input type="number" min={0} step={100} placeholder="e.g. 5000" value={s.manualCreditLimit ?? ''} onChange={(e) => updateCredit(s.accountId, 'manualCreditLimit', e.target.value ? Number(e.target.value) : null)} style={{ ...numInput, width: 90 }} />
                </div>
              </div>
            </div>
          ))}
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={handleSaveCreditSettings} disabled={creditSave === 'saving'} style={{ ...btnPrimary, opacity: creditSave === 'saving' ? 0.5 : 1, cursor: creditSave === 'saving' ? 'not-allowed' : 'pointer' }}>
              {creditSave === 'saving' ? 'Saving…' : 'Save'}
            </button>
            {creditSave === 'saved' && <span style={{ fontSize: 12, color: 'var(--green)' }}>Saved</span>}
            {creditSave === 'error'  && <span style={{ fontSize: 12, color: 'var(--red)' }}>Failed to save</span>}
          </div>
        </div>
      )}
    </div>
  );
}
