'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { FolioLogo } from './FolioLogo';

const NAV_SECTIONS: { label: string; items: { href: string; icon: string; label: string; hidden?: boolean }[] }[] = [
  { label: 'Overview', items: [
    { href: '/',              icon: '▦', label: 'Dashboard' },
    { href: '/transactions',  icon: '↕', label: 'Transactions' },
    { href: '/payments',      icon: '↺', label: 'Payments' },
  ]},
  { label: 'Planning', items: [
    { href: '/budget',        icon: '◎', label: 'Budget & Goals' },
    { href: '/settings',      icon: '⚙', label: 'Settings' },
  ]},
  { label: 'Insights', items: [
    { href: '/credit-health', icon: '◇', label: 'Credit Health', hidden: true },
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
      aria-current={active ? 'page' : undefined}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? '9px 12px' : '9px 10px',
        width: '100%', borderRadius: 6,
        fontSize: 13, fontWeight: 500,
        fontFamily: 'var(--sans)',
        color: active ? 'var(--accent)' : hov ? 'var(--text)' : 'var(--text2)',
        background: active ? 'var(--accent-a)' : hov ? 'var(--raised)' : 'transparent',
        textDecoration: 'none', transition: 'all .15s',
        marginBottom: 2,
        justifyContent: collapsed ? 'center' : 'flex-start',
        boxSizing: 'border-box',
      }}
    >
      <span style={{ fontSize: 14, opacity: active ? 1 : 0.65, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
      {!collapsed && hasAlert && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
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

  const PREFETCH = ['/', '/transactions', '/payments', '/budget', '/settings'];
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
          background: 'var(--sidebar-bg)',
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
          <FolioLogo size={collapsed ? 22 : 26} withWordmark={!collapsed} />
          {!collapsed && onCollapseChange && (
            <button onClick={() => onCollapseChange(true)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 2 }}>‹</button>
          )}
        </div>

        {collapsed && onCollapseChange && (
          <button onClick={() => onCollapseChange(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '8px 20px', fontSize: 14 }}>›</button>
        )}

        {/* Net Worth — spacer pushes to bottom */}

        {/* Nav */}
        <nav style={{ flex: 1, padding: collapsed ? '8px 8px' : '8px 10px', overflowY: 'auto' }}>
          {NAV_SECTIONS.map(section => {
            const visibleItems = section.items.filter(item => !item.hidden);
            if (visibleItems.length === 0) return null;
            return (
            <div key={section.label}>
              {!collapsed && (
                <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.12em', padding: '12px 8px 5px', fontWeight: 600, fontFamily: 'var(--mono)' }}>
                  {section.label}
                </div>
              )}
              {visibleItems.map(item => (
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
            );
          })}
        </nav>

        {/* Net Worth */}
        <div
          onClick={handleSync}
          style={{
            marginTop: 'auto', padding: collapsed ? '12px 8px' : '14px 10px',
            borderTop: '1px solid var(--border)', cursor: 'pointer',
            borderRadius: 6, transition: 'background .15s', flexShrink: 0,
            marginLeft: collapsed ? 0 : 10, marginRight: collapsed ? 0 : 10,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--raised)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          title={collapsed ? `${USD0.format(netWorth)} · Click to sync` : 'Click to sync'}
        >
          {!collapsed ? (
            <>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text3)', marginBottom: 4 }}>Net Worth</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
                {netWorth > 0 ? USD0.format(netWorth) : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                {accountCount} account{accountCount !== 1 ? 's' : ''}
                {mtdChange !== null && <> · <span style={{ color: mtdChange >= 0 ? 'var(--green)' : 'var(--red)' }}>{mtdChange >= 0 ? '+' : ''}{USD0.format(mtdChange)}</span> MTD</>}
              </div>
            </>
          ) : (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: 'var(--text)', textAlign: 'center' }}>
              {netWorth > 0 ? USD0.format(netWorth) : '—'}
            </div>
          )}
        </div>

        {/* Sync status */}
        <div
          onClick={handleSync}
          style={{
            padding: collapsed ? '8px' : '10px 10px',
            display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8, fontSize: 11, color: syncState === 'error' || syncState === 'quota' ? 'var(--red)' : 'var(--text3)',
            cursor: syncState === 'syncing' ? 'not-allowed' : 'pointer',
            flexShrink: 0, marginLeft: collapsed ? 0 : 10, marginRight: collapsed ? 0 : 10,
          }}
          title="Click to sync"
        >
          {syncState === 'syncing' ? (
            <span style={{ display: 'inline-block', animation: 'btSpin 1s linear infinite', fontSize: 12 }}>↻</span>
          ) : (
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: syncState === 'error' || syncState === 'quota' ? 'var(--red)' : 'var(--green)', flexShrink: 0 }} />
          )}
          {!collapsed && (
            syncState === 'syncing' ? 'Syncing…' :
            syncState === 'done' ? 'Synced just now' :
            syncState === 'error' || syncState === 'quota' ? (errorMsg ?? 'Sync failed') :
            `Synced ${formatLastSync(lastSyncAt).toLowerCase()}`
          )}
        </div>
      </aside>
    </>
  );
}
