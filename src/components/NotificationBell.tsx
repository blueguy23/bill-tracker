'use client';

import { useState, useEffect, useRef } from 'react';

interface Alert {
  id: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  category: 'Bills' | 'Budget' | 'Goals' | 'Insights';
  icon: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const TYPE_STYLES = {
  danger:  { color: '#ef4444', bg: '#ef444412', border: '#ef444425' },
  warning: { color: 'oklch(0.78 0.15 85)', bg: 'oklch(0.78 0.15 85 / 0.1)', border: 'oklch(0.78 0.15 85 / 0.2)' },
  success: { color: '#22c55e', bg: '#22c55e12', border: '#22c55e25' },
  info:    { color: 'oklch(0.68 0.22 265)', bg: 'oklch(0.68 0.22 265 / 0.1)', border: 'oklch(0.68 0.22 265 / 0.2)' },
};

function NotificationItem({ alert, onRead }: { alert: Alert; onRead: (id: string) => void }) {
  const [hov, setHov] = useState(false);
  const s = TYPE_STYLES[alert.type];
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onRead(alert.id)}
      style={{
        display: 'flex', gap: 12, padding: '12px 16px',
        background: hov ? 'rgba(237,237,245,0.03)' : 'transparent',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer', transition: 'background .1s',
        opacity: alert.read ? 0.65 : 1,
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, marginTop: 1 }}>
        {alert.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
          <div style={{ fontSize: 13, fontWeight: alert.read ? 500 : 700, color: 'var(--text)', fontFamily: 'var(--sans)', lineHeight: 1.3 }}>{alert.title}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', flexShrink: 0, marginTop: 1 }}>{alert.time}</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--sans)', lineHeight: 1.4 }}>{alert.body}</div>
        <div style={{ marginTop: 5 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', padding: '2px 7px', borderRadius: 4, fontFamily: 'var(--mono)', background: s.bg, color: s.color }}>
            {alert.category.toUpperCase()}
          </span>
        </div>
      </div>
      {!alert.read && (
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0, marginTop: 6, boxShadow: `0 0 6px ${s.color}` }} />
      )}
    </div>
  );
}

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  alerts: Alert[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

function NotificationsPanel({ open, onClose, alerts, onMarkRead, onMarkAllRead }: NotificationsPanelProps) {
  const [filter, setFilter] = useState<string>('All');
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = alerts.filter(a => !a.read).length;
  const categories = ['All', 'Bills', 'Budget', 'Goals', 'Insights'];
  const filtered = filter === 'All' ? alerts : alerts.filter(a => a.category === filter);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 100,
        width: 380, maxHeight: 520, background: 'var(--surface)',
        border: '1px solid var(--border-l)', borderRadius: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        animation: 'btSlideUp .15s ease',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>Notifications</div>
          {unreadCount > 0 && (
            <button onClick={onMarkAllRead} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)', fontWeight: 600 }}>
              Mark all read
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {categories.map(c => {
            const count = c === 'All' ? alerts.filter(a => !a.read).length : alerts.filter(a => a.category === c && !a.read).length;
            return (
              <button key={c} onClick={() => setFilter(c)} style={{ padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600, fontFamily: 'var(--mono)', letterSpacing: '.04em', background: filter === c ? 'var(--accent)' : 'var(--raised)', color: filter === c ? '#fff' : 'var(--text3)', transition: 'all .12s' }}>
                {c}{count > 0 ? ` ${count}` : ''}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filtered.length === 0
          ? <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: 13, fontFamily: 'var(--sans)' }}>All clear ✓</div>
          : filtered.map(a => <NotificationItem key={a.id} alert={a} onRead={onMarkRead} />)
        }
      </div>
    </div>
  );
}

interface NotificationBellProps {
  budgetAlerts?: { category: string; spent: number; limit: number }[];
  billAlerts?: { name: string; amount: number; daysUntilDue: number; isOverdue: boolean }[];
}

export function NotificationBell({ budgetAlerts = [], billAlerts = [] }: NotificationBellProps) {
  const [open, setOpen]   = useState(false);
  const [hov, setHov]     = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    const list: Alert[] = [];

    billAlerts.forEach((b, i) => {
      if (b.isOverdue) {
        list.push({ id: `bill-overdue-${i}`, type: 'danger', category: 'Bills', icon: '⚠️', title: `${b.name} is overdue`, body: `Payment of $${b.amount.toFixed(2)} is past due`, time: 'Now', read: false });
      } else if (b.daysUntilDue <= 5) {
        list.push({ id: `bill-due-${i}`, type: 'warning', category: 'Bills', icon: '🗓️', title: `${b.name} due in ${b.daysUntilDue}d`, body: `$${b.amount.toFixed(2)} due soon`, time: `${b.daysUntilDue}d`, read: false });
      }
    });

    budgetAlerts.forEach((b, i) => {
      const pct = (b.spent / b.limit) * 100;
      if (pct >= 100) {
        list.push({ id: `budget-over-${i}`, type: 'danger', category: 'Budget', icon: '🚨', title: `${b.category} budget exceeded`, body: `Spent $${b.spent.toFixed(0)} of $${b.limit.toFixed(0)} limit`, time: 'Today', read: false });
      } else if (pct >= 80) {
        list.push({ id: `budget-warn-${i}`, type: 'warning', category: 'Budget', icon: '📊', title: `${b.category} at ${Math.round(pct)}%`, body: `$${(b.limit - b.spent).toFixed(0)} remaining this month`, time: 'Today', read: true });
      }
    });

    list.push({ id: 'autopay-info', type: 'info', category: 'Insights', icon: '✅', title: 'AutoPay is active', body: 'Bills on autopay will be handled automatically', time: 'Always on', read: true });

    return list;
  });

  const unread = alerts.filter(a => !a.read).length;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          position: 'relative', width: 36, height: 36, borderRadius: 10,
          background: open ? 'var(--accent-a)' : hov ? 'rgba(237,237,245,0.06)' : 'transparent',
          border: `1px solid ${open ? 'var(--accent)' : 'transparent'}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .15s', color: 'var(--text2)', fontSize: 16,
        }}
      >
        🔔
        {unread > 0 && (
          <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', border: '2px solid var(--bg)', boxShadow: '0 0 6px #ef444480' }} />
        )}
      </button>
      <NotificationsPanel
        open={open}
        onClose={() => setOpen(false)}
        alerts={alerts}
        onMarkRead={(id) => setAlerts(p => p.map(a => a.id === id ? { ...a, read: true } : a))}
        onMarkAllRead={() => setAlerts(p => p.map(a => ({ ...a, read: true })))}
      />
    </div>
  );
}
