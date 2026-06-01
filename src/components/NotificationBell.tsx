'use client';

import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { openDetailPanel } from './PanelTrigger';

interface Alert {
  id: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  category: 'Due Soon' | 'Budget' | 'Activity' | 'System';
  icon: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  action?: () => void;
}

type FilterTab = 'all' | 'due-soon' | 'budget' | 'activity' | 'system';

const TYPE_CLASSES: Record<Alert['type'], { badge: string; dot: string; iconBg: string }> = {
  danger:  { badge: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-500 shadow-[0_0_6px_rgba(248,113,113,0.6)]', iconBg: 'bg-red-500/10 border-red-500/20' },
  warning: { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]', iconBg: 'bg-amber-500/10 border-amber-500/20' },
  success: { badge: 'bg-green-500/10 text-green-400 border-green-500/20', dot: 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]', iconBg: 'bg-green-500/10 border-green-500/20' },
  info:    { badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', dot: 'bg-zinc-400 shadow-[0_0_4px_rgba(161,161,170,0.3)]', iconBg: 'bg-zinc-500/10 border-zinc-500/20' },
};

const TAB_TO_CATEGORY: Record<FilterTab, Alert['category'] | null> = {
  'all': null,
  'due-soon': 'Due Soon',
  'budget': 'Budget',
  'activity': 'Activity',
  'system': 'System',
};

function NotificationItem({ alert, onRead, onClose }: { alert: Alert; onRead: (id: string) => void; onClose: () => void }) {
  const styles = TYPE_CLASSES[alert.type];

  return (
    <button
      onClick={() => {
        onRead(alert.id);
        if (alert.action) { onClose(); alert.action(); }
      }}
      className={`w-full flex gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/60 ${alert.read ? 'opacity-45' : ''}`}
    >
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-lg shrink-0 ${styles.iconBg}`}>
        {alert.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <span className={`text-[13px] leading-tight text-foreground ${alert.read ? 'font-medium' : 'font-semibold'}`}>
            {alert.title}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono shrink-0 mt-0.5">{alert.time}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{alert.body}</p>
        <Badge variant="outline" className={`mt-2 text-[9px] font-bold tracking-wider px-1.5 py-0 h-4 ${styles.badge}`}>
          {alert.category.toUpperCase()}
        </Badge>
      </div>
      {!alert.read && (
        <div className={`w-2 h-2 rounded-full shrink-0 mt-2.5 ${styles.dot}`} />
      )}
    </button>
  );
}

interface NotificationBellProps {
  budgetAlerts?: { category: string; spent: number; limit: number }[];
  billAlerts?: { name: string; amount: number; daysUntilDue: number; isOverdue: boolean }[];
  priceAlerts?: { name: string; oldAmount: number; newAmount: number; isSubscription: boolean }[];
  renewalAlerts?: { name: string; daysUntil: number; renewalNote: string }[];
}

export function NotificationBell({ budgetAlerts = [], billAlerts = [], priceAlerts = [], renewalAlerts = [] }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<FilterTab>('all');
  const [alerts, setAlerts] = useState<Alert[]>(() => buildAlerts(billAlerts, budgetAlerts, priceAlerts, renewalAlerts));

  const unreadCount = useMemo(() => alerts.filter(a => !a.read).length, [alerts]);
  const urgentCount = useMemo(() => alerts.filter(a => !a.read && a.type === 'danger').length, [alerts]);

  const filtered = useMemo(() => {
    const cat = TAB_TO_CATEGORY[tab];
    return cat === null ? alerts : alerts.filter(a => a.category === cat);
  }, [alerts, tab]);

  const tabCounts = useMemo(() => ({
    'all': alerts.filter(a => !a.read).length,
    'due-soon': alerts.filter(a => !a.read && a.category === 'Due Soon').length,
    'budget': alerts.filter(a => !a.read && a.category === 'Budget').length,
    'activity': alerts.filter(a => !a.read && a.category === 'Activity').length,
    'system': alerts.filter(a => !a.read && a.category === 'System').length,
  }), [alerts]);

  function handleMarkRead(id: string) {
    setAlerts(p => p.map(a => a.id === id ? { ...a, read: true } : a));
  }

  function handleMarkAllRead() {
    setAlerts(p => p.map(a => ({ ...a, read: true })));
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <span className="text-base">🔔</span>
          {urgentCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 border-2 border-background shadow-[0_0_8px_rgba(248,113,113,0.7)] flex items-center justify-center text-[10px] font-bold text-white font-mono px-0.5">
              {urgentCount}
            </span>
          ) : unreadCount > 0 ? (
            <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-background shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-0 space-y-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <SheetTitle className="text-base font-bold">Notifications</SheetTitle>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="h-5 px-2 text-[11px] font-bold font-mono">
                  {unreadCount}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </Button>
            )}
          </div>
          <SheetDescription className="sr-only">View and manage your notifications</SheetDescription>
        </SheetHeader>

        {/* Tabs */}
        <div className="px-5 pt-3 pb-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
            <TabsList className="h-8 p-0.5 w-full grid grid-cols-5 bg-muted/60">
              {(['all', 'due-soon', 'budget', 'activity', 'system'] as FilterTab[]).map(t => (
                <TabsTrigger
                  key={t}
                  value={t}
                  className="text-[10px] font-semibold font-mono h-7 px-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  {t === 'all' ? 'All' : t === 'due-soon' ? 'Due' : t.charAt(0).toUpperCase() + t.slice(1)}
                  {tabCounts[t] > 0 && <span className="ml-1 text-[9px] opacity-60">{tabCounts[t]}</span>}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <Separator />

        {/* Notifications list */}
        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <span className="text-2xl">✓</span>
              <span className="text-sm text-muted-foreground">Nothing here</span>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(a => (
                <NotificationItem key={a.id} alert={a} onRead={handleMarkRead} onClose={() => setOpen(false)} />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function buildAlerts(
  billAlerts: NonNullable<NotificationBellProps['billAlerts']>,
  budgetAlerts: NonNullable<NotificationBellProps['budgetAlerts']>,
  priceAlerts: NonNullable<NotificationBellProps['priceAlerts']>,
  renewalAlerts: NonNullable<NotificationBellProps['renewalAlerts']>,
): Alert[] {
  const list: Alert[] = [];

  // ── Due Soon / Overdue bills ──
  billAlerts.forEach((b, i) => {
    if (b.isOverdue) {
      list.push({
        id: `bill-overdue-${i}`, type: 'danger', category: 'Due Soon', icon: '⚠️',
        title: `${b.name} is overdue`,
        body: `$${b.amount.toFixed(2)} payment is past due`,
        time: 'Now', read: false,
        action: () => openDetailPanel('bills'),
      });
    } else if (b.daysUntilDue <= 3) {
      list.push({
        id: `bill-urgent-${i}`, type: 'danger', category: 'Due Soon', icon: '🔴',
        title: `${b.name} due ${b.daysUntilDue === 0 ? 'today' : b.daysUntilDue === 1 ? 'tomorrow' : `in ${b.daysUntilDue}d`}`,
        body: `$${b.amount.toFixed(2)} — pay now to avoid late fees`,
        time: b.daysUntilDue === 0 ? 'Today' : `${b.daysUntilDue}d`, read: false,
        action: () => openDetailPanel('bills'),
      });
    } else if (b.daysUntilDue <= 7) {
      list.push({
        id: `bill-soon-${i}`, type: 'warning', category: 'Due Soon', icon: '🗓️',
        title: `${b.name} due in ${b.daysUntilDue} days`,
        body: `$${b.amount.toFixed(2)} coming up this week`,
        time: `${b.daysUntilDue}d`, read: false,
        action: () => openDetailPanel('bills'),
      });
    }
  });

  // ── Renewals ──
  renewalAlerts.forEach((r, i) => {
    list.push({
      id: `renewal-${i}`, type: 'warning', category: 'Due Soon', icon: '🔄',
      title: `${r.name} renews ${r.daysUntil === 0 ? 'today' : `in ${r.daysUntil}d`}`,
      body: r.renewalNote,
      time: r.daysUntil === 0 ? 'Today' : `${r.daysUntil}d`, read: false,
    });
  });

  // ── Budget alerts ──
  budgetAlerts.forEach((b, i) => {
    const pct = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
    if (pct >= 100) {
      list.push({
        id: `budget-over-${i}`, type: 'danger', category: 'Budget', icon: '🚨',
        title: `${b.category} over budget`,
        body: `Spent $${b.spent.toFixed(0)} of $${b.limit.toFixed(0)} (${Math.round(pct)}%)`,
        time: 'This month', read: false,
      });
    } else if (pct >= 80) {
      list.push({
        id: `budget-warn-${i}`, type: 'warning', category: 'Budget', icon: '📊',
        title: `${b.category} at ${Math.round(pct)}%`,
        body: `$${(b.limit - b.spent).toFixed(0)} remaining — pace yourself`,
        time: 'This month', read: false,
      });
    } else if (pct >= 50) {
      list.push({
        id: `budget-half-${i}`, type: 'info', category: 'Budget', icon: '📈',
        title: `${b.category} halfway`,
        body: `$${b.spent.toFixed(0)} of $${b.limit.toFixed(0)} used — on track`,
        time: 'This month', read: true,
      });
    }
  });

  // ── Activity: price changes ──
  priceAlerts.forEach((p, i) => {
    const delta = p.newAmount - p.oldAmount;
    const direction = delta > 0 ? 'increased' : 'decreased';
    list.push({
      id: `price-${i}`, type: delta > 0 ? 'warning' : 'success', category: 'Activity', icon: delta > 0 ? '📈' : '📉',
      title: `${p.name} ${direction}`,
      body: `$${p.oldAmount.toFixed(2)} → $${p.newAmount.toFixed(2)} (${delta > 0 ? '+' : ''}$${delta.toFixed(2)}/mo)`,
      time: 'Detected', read: false,
    });
  });

  // ── System: always-present status ──
  const upcomingCount = billAlerts.filter(b => !b.isOverdue && b.daysUntilDue > 7).length;

  if (upcomingCount > 0) {
    list.push({
      id: 'sys-upcoming', type: 'info', category: 'System', icon: '📋',
      title: `${upcomingCount} bill${upcomingCount > 1 ? 's' : ''} upcoming`,
      body: 'Due later this month — no action needed yet',
      time: 'Status', read: true,
      action: () => openDetailPanel('bills'),
    });
  }

  list.push({
    id: 'sys-sync', type: 'success', category: 'System', icon: '🔗',
    title: 'Accounts synced',
    body: 'Bank data refreshed automatically every 2 hours',
    time: 'Last sync', read: true,
  });

  list.push({
    id: 'sys-autopay', type: 'info', category: 'System', icon: '⚡',
    title: 'AutoPay active',
    body: 'Bills marked autopay will be tracked but not alerted',
    time: 'Always', read: true,
  });

  const hasUrgent = list.some(a => !a.read && (a.type === 'danger' || a.type === 'warning'));
  if (!hasUrgent) {
    list.unshift({
      id: 'sys-allclear', type: 'success', category: 'System', icon: '✅',
      title: 'All clear',
      body: 'No overdue bills, budgets on track',
      time: 'Now', read: false,
    });
  }

  return list;
}
