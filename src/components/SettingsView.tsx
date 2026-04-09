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

export function SettingsView({ initialConfigured, dueSoonDays, unknownCount = 0 }: SettingsViewProps) {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [creditSettings, setCreditSettings] = useState<CreditSettingsEntry[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountNames, setAccountNames] = useState<Record<string, string>>({});
  const [nameSaveStatus, setNameSaveStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    fetch('/api/v1/credit/settings')
      .then((r) => r.json() as Promise<{ settings: CreditSettingsEntry[] }>)
      .then((d) => setCreditSettings(d.settings ?? []))
      .catch(() => { /* no credit accounts configured yet */ });

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
    setTestStatus('loading');
    setTestMessage('');
    try {
      const res = await fetch('/api/v1/notifications/test');
      const body = await res.json() as { sent?: boolean; message?: string; error?: string };
      if (res.ok && body.sent) {
        setTestStatus('success');
        setTestMessage(body.message ?? 'Test notification sent');
      } else {
        setTestStatus('error');
        setTestMessage(body.error ?? 'Failed to send test notification');
      }
    } catch {
      setTestStatus('error');
      setTestMessage('Network error — could not reach the server');
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
            accountId: s.accountId,
            statementClosingDay: s.statementClosingDay,
            targetUtilization: s.targetUtilization,
            manualCreditLimit: s.manualCreditLimit,
          })),
        }),
      });
      setSaveStatus(res.ok ? 'saved' : 'error');
    } catch {
      setSaveStatus('error');
    }
  }

  const [syncingFromBanner, setSyncingFromBanner] = useState(false);

  async function handleBannerSync() {
    setSyncingFromBanner(true);
    try {
      await fetch('/api/v1/sync', { method: 'POST' });
    } finally {
      setSyncingFromBanner(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Unknown accounts warning */}
      {unknownCount > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4 flex items-start gap-3">
          <span className="text-amber-400 shrink-0 mt-0.5">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300">
              {unknownCount} account{unknownCount !== 1 ? 's' : ''} couldn&apos;t be identified
            </p>
            <p className="text-xs text-sky-500 mt-0.5">
              Their names show as &ldquo;Unknown&rdquo;. This happens when SimpleFIN doesn&apos;t send institution data.
              Try syncing again, or rename them below in the Account Names section.
            </p>
          </div>
          <button
            onClick={handleBannerSync}
            disabled={syncingFromBanner}
            className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
          >
            {syncingFromBanner ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      )}

      {/* Discord Notifications */}
      <div className="rounded-xl border border-teal-900/40 bg-depth-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-teal-900/40">
          <p className="text-sm font-semibold text-white">Discord Notifications</p>
          <p className="text-xs text-sky-700 mt-0.5">Bill alerts, budget warnings, and daily digest</p>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-sky-300">Webhook URL</p>
              <p className="text-xs text-sky-700 mt-0.5">Set DISCORD_WEBHOOK_URL in your .env file</p>
            </div>
            {initialConfigured ? (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/[0.12] rounded-full px-2.5 py-1">
                Configured
              </span>
            ) : (
              <span className="text-xs font-semibold text-sky-700 bg-depth-800 rounded-full px-2.5 py-1">
                Not configured
              </span>
            )}
          </div>

          <div className="space-y-2">
            <button
              onClick={handleSendTest}
              disabled={!initialConfigured || testStatus === 'loading'}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors
                bg-teal-500 hover:bg-teal-400 text-white
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {testStatus === 'loading' ? 'Sending…' : 'Send Test Notification'}
            </button>
            {testStatus === 'success' && <p className="text-xs text-emerald-400">{testMessage}</p>}
            {testStatus === 'error' && <p className="text-xs text-red-400">{testMessage}</p>}
          </div>
        </div>
      </div>

      {/* Credit Card Statements */}
      {creditSettings.length > 0 && (
        <div className="rounded-xl border border-teal-900/40 bg-depth-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-teal-900/40">
            <p className="text-sm font-semibold text-white">Credit Card Statements</p>
            <p className="text-xs text-sky-700 mt-0.5">
              Set statement closing dates to get paydown alerts before your balance is reported to the bureaus.
              Find your closing date on your monthly statement or card issuer app.
            </p>
          </div>

          <ul className="divide-y divide-white/[0.04]">
            {creditSettings.map((s) => (
              <li key={s.accountId} className="px-5 py-4 flex items-center gap-4">
                <p className="text-sm text-sky-300 flex-1 min-w-0 truncate">{s.accountName}</p>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] text-sky-700 uppercase tracking-wider">Closes day</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      placeholder="1–31"
                      value={s.statementClosingDay ?? ''}
                      onChange={(e) => updateSetting(s.accountId, 'statementClosingDay', e.target.value ? Number(e.target.value) : null)}
                      className="w-16 px-2 py-1 text-sm text-white bg-depth-800 border border-teal-900/50 rounded-lg
                        focus:outline-none focus:ring-1 focus:ring-teal-500 tabular-nums"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] text-sky-700 uppercase tracking-wider">Target %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="5"
                      value={Math.round(s.targetUtilization * 100)}
                      onChange={(e) => updateSetting(s.accountId, 'targetUtilization', Number(e.target.value) / 100)}
                      className="w-16 px-2 py-1 text-sm text-white bg-depth-800 border border-teal-900/50 rounded-lg
                        focus:outline-none focus:ring-1 focus:ring-teal-500 tabular-nums"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] text-sky-700 uppercase tracking-wider">Credit Limit</label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      placeholder="e.g. 5000"
                      value={s.manualCreditLimit ?? ''}
                      onChange={(e) => updateSetting(s.accountId, 'manualCreditLimit', e.target.value ? Number(e.target.value) : null)}
                      className="w-24 px-2 py-1 text-sm text-white bg-depth-800 border border-teal-900/50 rounded-lg
                        focus:outline-none focus:ring-1 focus:ring-teal-500 tabular-nums"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="px-5 py-4 border-t border-teal-900/40 flex items-center gap-3">
            <button
              onClick={handleSaveCreditSettings}
              disabled={saveStatus === 'saving'}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors
                bg-teal-500 hover:bg-teal-400 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saveStatus === 'saving' ? 'Saving…' : 'Save'}
            </button>
            {saveStatus === 'saved' && <p className="text-xs text-emerald-400">Saved</p>}
            {saveStatus === 'error' && <p className="text-xs text-red-400">Failed to save</p>}
          </div>
        </div>
      )}

      {/* Account Names */}
      {accounts.length > 0 && (
        <div className="rounded-xl border border-teal-900/40 bg-depth-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-teal-900/40">
            <p className="text-sm font-semibold text-white">Account Names</p>
            <p className="text-xs text-sky-700 mt-0.5">
              Override the bank name shown in the app. Helpful when SimpleFIN returns "Unknown" or an abbreviation.
            </p>
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {accounts.map((a) => (
              <li key={a._id} className="px-5 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-sky-700 truncate">{a.name}</p>
                </div>
                <input
                  type="text"
                  value={accountNames[a._id] ?? ''}
                  onChange={(e) => setAccountNames((prev) => ({ ...prev, [a._id]: e.target.value }))}
                  placeholder="Bank name"
                  className="w-48 px-3 py-1.5 text-sm text-white bg-depth-800 border border-teal-900/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </li>
            ))}
          </ul>
          <div className="px-5 py-4 border-t border-teal-900/40 flex items-center gap-3">
            <button
              onClick={handleSaveAccountNames}
              disabled={nameSaveStatus === 'saving'}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-teal-500 hover:bg-teal-400 text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {nameSaveStatus === 'saving' ? 'Saving…' : 'Save Names'}
            </button>
            {nameSaveStatus === 'saved' && <p className="text-xs text-emerald-400">Saved — reload to see changes</p>}
            {nameSaveStatus === 'error' && <p className="text-xs text-red-400">Failed to save</p>}
          </div>
        </div>
      )}

      {/* Notification events reference */}
      <div className="rounded-xl border border-teal-900/40 bg-depth-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-teal-900/40">
          <p className="text-sm font-semibold text-white">Notification Events</p>
        </div>
        <ul className="divide-y divide-white/[0.04]">
          {[
            { event: 'Bill Due Soon', desc: `Bills due within ${dueSoonDays} days`, color: 'text-amber-400' },
            { event: 'Bill Overdue', desc: 'Unpaid bills past their due date', color: 'text-red-400' },
            { event: 'Budget Warning', desc: 'Category spending reaches 80%+', color: 'text-amber-400' },
            { event: 'Budget Exceeded', desc: 'Category spending exceeds budget', color: 'text-red-400' },
            { event: 'Sync Completed', desc: 'SimpleFIN sync finishes successfully', color: 'text-emerald-400' },
            { event: 'Sync Failed', desc: 'SimpleFIN sync encounters an error', color: 'text-red-400' },
            { event: 'Daily Digest', desc: 'Morning summary via /api/v1/notifications/digest', color: 'text-cyan-400' },
            { event: 'Statement Closing Soon', desc: 'Pay down before statement closes to lower reported utilization', color: 'text-amber-400' },
            { event: 'High Utilization', desc: 'Credit card crosses 70% utilization after sync', color: 'text-red-400' },
          ].map(({ event, desc, color }) => (
            <li key={event} className="px-5 py-3 flex items-center justify-between gap-4">
              <div>
                <p className={`text-sm font-medium ${color}`}>{event}</p>
                <p className="text-xs text-sky-700 mt-0.5">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
