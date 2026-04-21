'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

const NAV_SECTIONS = [
  { label: 'Overview', items: [
    { href: '/',              icon: '▦',  label: 'Dashboard' },
    { href: '/transactions',  icon: '↕',  label: 'Transactions' },
    { href: '/recurring',     icon: '↺',  label: 'Recurring Bills' },
  ]},
  { label: 'Planning', items: [
    { href: '/budget',        icon: '◎',  label: 'Budget' },
    { href: '/goals',         icon: '◈',  label: 'Goals' },
    { href: '/subscriptions', icon: '⟳',  label: 'Subscriptions' },
  ]},
  { label: 'Insights', items: [
    { href: '/credit',        icon: '◇',  label: 'Credit Health' },
    { href: '/settings',      icon: '⚙',  label: 'Settings' },
  ]},
];

function formatLastSync(iso: string | null): string {
  if (!iso) return 'Never synced';
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type SyncState = 'idle' | 'syncing' | 'done' | 'error' | 'quota';

interface NavItemProps {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  hasAlert?: boolean;
  collapsed: boolean;
}

function NavItem({ href, icon, label, active, hasAlert, collapsed }: NavItemProps) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: collapsed ? '9px 12px' : '8px 10px',
        width: '100%', borderRadius: 8,
        fontSize: 13, fontWeight: active ? 600 : 500,
        fontFamily: 'var(--sans)',
        color: active ? 'var(--text)' : hov ? 'var(--text2)' : 'var(--text2)',
        background: active ? 'var(--surface)' : hov ? 'rgba(237,237,245,0.04)' : 'transparent',
        textDecoration: 'none', transition: 'all .1s',
        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
        marginBottom: 2,
        justifyContent: collapsed ? 'center' : 'flex-start',
        boxSizing: 'border-box',
      }}
    >
      <span style={{ fontSize: 14, opacity: active ? 1 : 0.65, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
      {!collapsed && hasAlert && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
      )}
      {!collapsed && active && !hasAlert && (
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
      )}
    </Link>
  );
}

interface SidebarProps { isOpen?: boolean; onClose?: () => void; collapsed?: boolean; onCollapseChange?: (v: boolean) => void; }

const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function Sidebar({ isOpen = true, onClose, collapsed = false, onCollapseChange }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [syncState, setSyncState]   = useState<SyncState>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [hasUnknown, setHasUnknown] = useState(false);
  const [netWorth, setNetWorth]     = useState<number>(0);
  const [accountCount, setAccountCount] = useState<number>(0);
  const [mtdChange, setMtdChange]   = useState<number | null>(null);

  const fetchStatus = useCallback(() => {
    fetch('/api/v1/sync/status').then(r => r.json()).then(d => setLastSyncAt(d.lastSyncAt ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchStatus();
    fetch('/api/v1/accounts')
      .then(r => r.json() as Promise<{ accounts: { orgName: string; balance?: string | number }[] }>)
      .then(d => {
        const accts = d.accounts ?? [];
        setHasUnknown(accts.some((a) => a.orgName === 'Unknown'));
        setAccountCount(accts.length);
        setNetWorth(accts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0));
      })
      .catch(() => {});
    fetch('/api/v1/transactions/cash-flow-month')
      .then(r => r.json())
      .then(d => setMtdChange(typeof d.net === 'number' ? d.net : null))
      .catch(() => {});
  }, [fetchStatus]);

  const PREFETCH = ['/', '/recurring', '/transactions', '/budget', '/goals', '/subscriptions', '/credit', '/settings'];
  useEffect(() => { PREFETCH.forEach(r => router.prefetch(r)); }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSync() {
    if (syncState === 'syncing') return;
    setSyncState('syncing'); setErrorMsg(null);
    try {
      const r = await fetch('/api/v1/sync', { method: 'POST' });
      if (r.ok) { setSyncState('done'); setLastSyncAt(new Date().toISOString()); router.refresh(); setTimeout(() => setSyncState('idle'), 3000); }
      else if (r.status === 429) { setSyncState('quota'); setErrorMsg('Quota reached'); setTimeout(() => setSyncState('idle'), 5000); }
      else { setSyncState('error'); setErrorMsg('Sync failed'); setTimeout(() => setSyncState('idle'), 5000); }
    } catch { setSyncState('error'); setErrorMsg('Network error'); setTimeout(() => setSyncState('idle'), 5000); }
  }

  const syncLabel = syncState === 'syncing' ? 'SYNCING…' : syncState === 'done' ? '✓ SYNCED' : syncState === 'quota' ? 'QUOTA' : syncState === 'error' ? (errorMsg?.toUpperCase() ?? 'ERROR') : 'SYNC NOW';
  const syncColor = syncState === 'done' ? 'var(--green)' : (syncState === 'error' || syncState === 'quota') ? 'var(--red)' : syncState === 'syncing' ? 'var(--accent)' : 'var(--text3)';

  const w = collapsed ? 64 : 224;

  return (
    <>
      {onClose && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,.6)', display: isOpen ? 'block' : 'none' }}
          className="sm:hidden"
        />
      )}
      <aside
        className="sidebar-overlay"
        style={{
          width: w, minHeight: '100vh',
          background: 'linear-gradient(180deg, #0f0f14 0%, var(--bg) 100%)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'width .2s cubic-bezier(.4,0,.2,1), transform .2s',
          overflow: 'hidden',
        }}
      >
        {/* Brand */}
        <div style={{ padding: collapsed ? '18px 16px' : '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(145deg, oklch(0.22 0.08 265) 0%, oklch(0.14 0.06 285) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px oklch(0.68 0.22 265 / 0.28), inset 0 1px 0 rgba(255,255,255,0.08)',
            border: '1px solid oklch(0.68 0.22 265 / 0.3)',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="5" y="2" width="11" height="14" rx="2" fill="oklch(0.68 0.22 265)" opacity="0.25" />
              <rect x="3" y="4" width="11" height="14" rx="2" fill="oklch(0.68 0.22 265)" opacity="0.5" />
              <rect x="3" y="4" width="11" height="14" rx="2" fill="none" stroke="oklch(0.78 0.22 265)" strokeWidth="1" />
              <path d="M5.5 14.5 L7.5 11.5 L9.5 12.8 L12 9" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
              <circle cx="12" cy="9" r="1.2" fill="white" opacity="0.9" />
            </svg>
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--sans)', letterSpacing: '-.03em' }}>Folio</div>
              <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.1em', fontFamily: 'var(--mono)', marginTop: 1 }}>PERSONAL FINANCE</div>
            </div>
          )}
          {!collapsed && onCollapseChange && (
            <button onClick={() => onCollapseChange(true)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 2 }}>‹</button>
          )}
        </div>

        {collapsed && onCollapseChange && (
          <button onClick={() => onCollapseChange(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '8px 20px', fontSize: 14 }}>›</button>
        )}

        {/* Net Worth */}
        {!collapsed && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.12em', fontFamily: 'var(--mono)', marginBottom: 4 }}>Net Worth</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 400, color: 'var(--text)', letterSpacing: '-.01em', lineHeight: 1.2 }}>
              {netWorth > 0 ? USD0.format(netWorth) : '—'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--mono)' }}>
              {accountCount} linked account{accountCount !== 1 ? 's' : ''}
            </div>
            {mtdChange !== null && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--mono)', background: mtdChange >= 0 ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)', color: mtdChange >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {mtdChange >= 0 ? '↑' : '↓'} {mtdChange >= 0 ? '+' : ''}{USD0.format(mtdChange)} MTD
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: collapsed ? '8px 8px' : '8px 10px', overflowY: 'auto' }}>
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              {!collapsed && (
                <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.12em', padding: '12px 8px 5px', fontWeight: 600, fontFamily: 'var(--mono)' }}>
                  {section.label}
                </div>
              )}
              {section.items.map(item => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={pathname === item.href}
                  collapsed={collapsed}
                  hasAlert={item.href === '/settings' && hasUnknown}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Footer sync */}
        <div style={{ padding: collapsed ? '12px 8px' : '12px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button
            onClick={handleSync}
            disabled={syncState === 'syncing'}
            title="Sync accounts"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 8, width: '100%', padding: collapsed ? '8px' : '8px 10px',
              borderRadius: 8, border: '1px solid var(--border)',
              background: syncState === 'syncing' ? 'var(--accent-a)' : 'var(--raised)',
              cursor: syncState === 'syncing' ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
              color: syncColor,
              transition: 'all .15s', letterSpacing: '.04em',
            }}
          >
            <span style={{ display: 'inline-block', animation: syncState === 'syncing' ? 'btSpin 1s linear infinite' : 'none', fontSize: 12 }}>↻</span>
            {!collapsed && syncLabel}
          </button>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'btPulse 2s infinite', flexShrink: 0 }} />
              LIVE · {formatLastSync(lastSyncAt).toUpperCase()}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
