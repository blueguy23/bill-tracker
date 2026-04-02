'use client';

import { useState } from 'react';

interface SettingsViewProps {
  initialConfigured: boolean;
}

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

export function SettingsView({ initialConfigured }: SettingsViewProps) {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');

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

  return (
    <div className="space-y-6">
      {/* Discord Notifications */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <p className="text-sm font-semibold text-white">Discord Notifications</p>
          <p className="text-xs text-zinc-500 mt-0.5">Bill alerts, budget warnings, and daily digest</p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Webhook status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-300">Webhook URL</p>
              <p className="text-xs text-zinc-500 mt-0.5">Set DISCORD_WEBHOOK_URL in your .env file</p>
            </div>
            {initialConfigured ? (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/[0.12] rounded-full px-2.5 py-1">
                Configured
              </span>
            ) : (
              <span className="text-xs font-semibold text-zinc-500 bg-zinc-800 rounded-full px-2.5 py-1">
                Not configured
              </span>
            )}
          </div>

          {/* Send test button */}
          <div className="space-y-2">
            <button
              onClick={handleSendTest}
              disabled={!initialConfigured || testStatus === 'loading'}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors
                bg-blue-600 hover:bg-blue-500 text-white
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {testStatus === 'loading' ? 'Sending…' : 'Send Test Notification'}
            </button>

            {testStatus === 'success' && (
              <p className="text-xs text-emerald-400">{testMessage}</p>
            )}
            {testStatus === 'error' && (
              <p className="text-xs text-red-400">{testMessage}</p>
            )}
          </div>
        </div>
      </div>

      {/* Notification events reference */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <p className="text-sm font-semibold text-white">Notification Events</p>
        </div>
        <ul className="divide-y divide-white/[0.04]">
          {[
            { event: 'Bill Due Soon', desc: `Bills due within ${process.env.NEXT_PUBLIC_DUE_SOON_DAYS ?? 3} days`, color: 'text-amber-400' },
            { event: 'Bill Overdue', desc: 'Unpaid bills past their due date', color: 'text-red-400' },
            { event: 'Budget Warning', desc: 'Category spending reaches 80%+', color: 'text-amber-400' },
            { event: 'Budget Exceeded', desc: 'Category spending exceeds budget', color: 'text-red-400' },
            { event: 'Sync Completed', desc: 'SimpleFIN sync finishes successfully', color: 'text-emerald-400' },
            { event: 'Sync Failed', desc: 'SimpleFIN sync encounters an error', color: 'text-red-400' },
            { event: 'Daily Digest', desc: 'Morning summary via /api/v1/notifications/digest', color: 'text-blue-400' },
          ].map(({ event, desc, color }) => (
            <li key={event} className="px-5 py-3 flex items-center justify-between gap-4">
              <div>
                <p className={`text-sm font-medium ${color}`}>{event}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
