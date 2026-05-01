'use client';

interface Props {
  displayName: string;
  lastSyncAt: string | null;
  discordConfigured: boolean;
  accountCount: number;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return (parts[0]![0] ?? '?').toUpperCase();
  return ((parts[0]![0] ?? '') + (parts[parts.length - 1]![0] ?? '')).toUpperCase();
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function SectionAccountHero({ displayName, lastSyncAt, discordConfigured, accountCount }: Props) {
  const label = displayName || 'Your Account';
  const abbr  = initials(label);

  return (
    <div data-testid="account-hero" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '2px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {abbr}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.15)', fontSize: 10, fontWeight: 600, color: 'var(--green)' }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Active
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Private beta · v0.5.0</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text3)', marginBottom: 2 }}>System status</div>
          <StatusRow label="SimpleFIN" ok={accountCount > 0} okText="Connected" failText="Not connected" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
            <span style={{ color: 'var(--text3)' }}>Last sync</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)' }}>
              {lastSyncAt ? timeAgo(lastSyncAt) : '—'}
            </span>
          </div>
          <StatusRow label="Discord" ok={discordConfigured} okText="Configured" failText="Not set" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
            <span style={{ color: 'var(--text3)' }}>Data stored</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text2)' }}>Local · MongoDB</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        <span style={{ fontSize: 11, color: 'var(--green)' }}>All systems healthy</span>
        <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>
          {accountCount} account{accountCount !== 1 ? 's' : ''} synced
        </span>
      </div>
    </div>
  );
}

function StatusRow({ label, ok, okText, failText }: { label: string; ok: boolean; okText: string; failText: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
      <span style={{ color: 'var(--text3)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 4, background: ok ? 'rgba(74,222,128,0.10)' : 'rgba(113,113,122,0.12)', border: `1px solid ${ok ? 'rgba(74,222,128,0.15)' : 'rgba(113,113,122,0.2)'}`, fontSize: 10, fontWeight: 600, color: ok ? 'var(--green)' : 'var(--text3)' }}>
        ● {ok ? okText : failText}
      </div>
    </div>
  );
}
