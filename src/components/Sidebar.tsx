'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconRepeat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconPieChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 118 2.83" />
      <path d="M22 12A10 10 0 0012 2v10z" />
    </svg>
  );
}

function IconCreditCard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconRefreshCw() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function formatLastSync(iso: string | null): string {
  if (!iso) return 'Never synced';
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type SyncState = 'idle' | 'syncing' | 'done' | 'error' | 'quota';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
}

function NavItem({ href, icon, label, active, disabled }: NavItemProps) {
  const base = 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full';
  if (disabled) {
    return (
      <div className={`${base} text-zinc-700 cursor-not-allowed`}>
        {icon}<span>{label}</span>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className={`${base} ${active ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]'}`}
    >
      {icon}<span>{label}</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStatus = useCallback(() => {
    fetch('/api/v1/sync/status')
      .then((r) => r.json())
      .then((data) => setLastSyncAt(data.lastSyncAt ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleSync() {
    if (syncState === 'syncing') return;
    setSyncState('syncing');
    setErrorMsg(null);
    try {
      const r = await fetch('/api/v1/sync', { method: 'POST' });
      if (r.ok) {
        setSyncState('done');
        setLastSyncAt(new Date().toISOString());
        router.refresh();
        setTimeout(() => setSyncState('idle'), 3000);
      } else if (r.status === 429) {
        setSyncState('quota');
        setErrorMsg('Quota reached');
        setTimeout(() => setSyncState('idle'), 5000);
      } else {
        setSyncState('error');
        setErrorMsg('Sync failed');
        setTimeout(() => setSyncState('idle'), 5000);
      }
    } catch {
      setSyncState('error');
      setErrorMsg('Network error');
      setTimeout(() => setSyncState('idle'), 5000);
    }
  }

  const syncLabel =
    syncState === 'syncing' ? 'Syncing…' :
    syncState === 'done'    ? 'Synced!' :
    syncState === 'quota'   ? 'Quota reached' :
    syncState === 'error'   ? (errorMsg ?? 'Error') :
    'Sync Now';

  const syncColor =
    syncState === 'done'  ? 'text-green-400' :
    syncState === 'error' || syncState === 'quota' ? 'text-red-400' :
    syncState === 'syncing' ? 'text-blue-400' :
    'text-zinc-400 hover:text-zinc-200';

  return (
    <aside className="w-56 shrink-0 flex flex-col min-h-screen border-r border-white/[0.06] bg-zinc-950">
      <div className="px-4 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold leading-none">B</span>
          </div>
          <span className="text-sm font-semibold text-white">Bill Tracker</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Overview</p>
        <NavItem href="/" icon={<IconGrid />} label="Dashboard" active={pathname === '/'} />
        <NavItem href="/recurring" icon={<IconRepeat />} label="Recurring" active={pathname === '/recurring'} />
        <NavItem href="/summary" icon={<IconCalendar />} label="Summary" active={pathname === '/summary'} />
        <NavItem href="/budget" icon={<IconPieChart />} label="Budget" active={pathname === '/budget'} />
        <NavItem href="/subscriptions" icon={<IconRefreshCw />} label="Subscriptions" active={pathname === '/subscriptions'} />
        <NavItem href="/credit" icon={<IconCreditCard />} label="Credit Health" active={pathname === '/credit'} />
        <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Account</p>
        <NavItem href="/settings" icon={<IconSettings />} label="Settings" active={pathname === '/settings'} />
      </nav>

      <div className="p-3 border-t border-white/[0.06] space-y-1">
        <button
          onClick={handleSync}
          disabled={syncState === 'syncing'}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full ${syncColor} hover:bg-white/[0.04] disabled:cursor-not-allowed`}
        >
          <span className={syncState === 'syncing' ? 'animate-spin' : ''}>
            <IconRefreshCw />
          </span>
          <span>{syncLabel}</span>
        </button>
        <p className="px-3 text-[10px] text-zinc-600">{formatLastSync(lastSyncAt)}</p>
      </div>
    </aside>
  );
}
