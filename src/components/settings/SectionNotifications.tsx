'use client';

import { useState } from 'react';
import { sectionCard, sectionHeader, sectionHeaderIcon, formRow, btnPrimary } from './settingsStyles';

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

interface Props {
  configured: boolean;
  dueSoonDays: number;
}

const EVENTS = [
  { event: 'Bill Due Soon',     desc: (days: number) => `Bills due within ${days} days`,          color: 'var(--gold)' },
  { event: 'Bill Overdue',      desc: () => 'Unpaid bills past their due date',                   color: 'var(--red)' },
  { event: 'Budget Warning',    desc: () => 'Category spending reaches 80%+',                     color: 'var(--gold)' },
  { event: 'Budget Exceeded',   desc: () => 'Category spending exceeds budget',                   color: 'var(--red)' },
  { event: 'Sync Completed',    desc: () => 'SimpleFIN sync finishes successfully',               color: 'var(--green)' },
  { event: 'Statement Closing', desc: () => 'Pay down before close to lower reported utilization', color: 'var(--gold)' },
  { event: 'High Utilization',  desc: () => 'Credit card crosses 70% utilization after sync',    color: 'var(--red)' },
  { event: 'Daily Digest',      desc: () => 'Morning summary via /api/v1/notifications/digest',  color: 'var(--accent)' },
] as const;

export function SectionNotifications({ configured, dueSoonDays }: Props) {
  const [status, setStatus]   = useState<TestStatus>('idle');
  const [message, setMessage] = useState('');

  async function handleTest() {
    setStatus('loading'); setMessage('');
    try {
      const res  = await fetch('/api/v1/notifications/test');
      const body = await res.json() as { sent?: boolean; message?: string; error?: string };
      if (res.ok && body.sent) { setStatus('success'); setMessage(body.message ?? 'Test notification sent'); }
      else                     { setStatus('error');   setMessage(body.error   ?? 'Failed to send'); }
    } catch {
      setStatus('error'); setMessage('Network error');
    }
  }

  return (
    <div data-testid="section-notifications" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={sectionCard}>
        <div style={{ ...sectionHeader, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={sectionHeaderIcon}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Notifications</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>Discord webhook alerts and event configuration</div>
            </div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 4, fontFamily: 'var(--mono)', letterSpacing: '.04em', background: configured ? 'rgba(34,197,94,.12)' : 'rgba(113,113,122,.12)', color: configured ? 'var(--green)' : 'var(--text3)' }}>
            {configured ? 'CONFIGURED' : 'NOT SET'}
          </span>
        </div>

        <div style={formRow}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>Discord webhook</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              Set <code style={{ fontFamily: 'var(--mono)', color: 'var(--text2)', fontSize: 10 }}>DISCORD_WEBHOOK_URL</code> in your .env to enable alerts
            </div>
          </div>
          <button
            data-testid="test-notification-btn"
            onClick={handleTest}
            disabled={!configured || status === 'loading'}
            style={{ ...btnPrimary, opacity: (!configured || status === 'loading') ? 0.4 : 1, cursor: (!configured || status === 'loading') ? 'not-allowed' : 'pointer' }}
          >
            {status === 'loading' ? 'Sending…' : 'Send test'}
          </button>
        </div>
        {(status === 'success' || status === 'error') && (
          <div style={{ padding: '0 20px 12px', fontSize: 12, color: status === 'success' ? 'var(--green)' : 'var(--red)' }}>{message}</div>
        )}
      </div>

      <div style={sectionCard}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Notification Events</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>Events that trigger a Discord message when configured</div>
        </div>
        {EVENTS.map(({ event, desc, color }, i) => (
          <div key={event} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: i < EVENTS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color, fontFamily: 'var(--sans)' }}>{event}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{desc(dueSoonDays)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
