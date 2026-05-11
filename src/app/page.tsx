export const dynamic = 'force-dynamic';

import type { BillResponse, BillSummary, Bill, BillCategory } from '@/types/bill';
import type { EnrichedMatch } from '@/types/subscription';
import type { Account } from '@/lib/simplefin/types';
import { Suspense } from 'react';
import { MatchBanner } from '@/components/MatchBanner';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { NewSubscriptionsBanner } from '@/components/NewSubscriptionsBanner';
import { DashboardCharts, SpendByCategoryCard } from '@/components/DashboardCharts';
import { PeriodSelector } from '@/components/PeriodSelector';
import { CashFlowToggle } from '@/components/CashFlowToggle';
import type { CashFlowViewMode } from '@/components/CashFlowToggle';
import { NotificationBell } from '@/components/NotificationBell';
import type { Period } from '@/components/PeriodSelector';
import { getDb } from '@/adapters/db';
import { listBills } from '@/adapters/bills';
import { listAccounts, listRecentTransactions, getCashFlowForRange } from '@/adapters/accounts';
import { listAccountMeta } from '@/adapters/accountMeta';
import { listBudgets } from '@/adapters/budgets';
import { getCashFlowHistory } from '@/adapters/cashFlowHistory';
import { findAutoMatches } from '@/lib/subscriptions/autoMatch';
import type { Budget as _Budget } from '@/types/budget';
import type { Holding } from '@/lib/simplefin/types';
import { PortfolioWidget } from '@/components/PortfolioWidget';

function periodToRange(p: Period): { start: Date; end: Date; historyMonths: number; label: string } {
  const now = new Date();
  switch (p) {
    case '1W':  return { start: new Date(now.getTime() - 7 * 86400000),   end: now, historyMonths: 6,                  label: 'last 7 days'  };
    case '3M':  return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: now, historyMonths: 6,        label: 'last 3 months' };
    case 'YTD': return { start: new Date(now.getFullYear(), 0, 1),         end: now, historyMonths: now.getMonth() + 1, label: 'year to date'  };
    case '1Y':  return { start: new Date(now.getFullYear() - 1, now.getMonth(), 1), end: now, historyMonths: 12,       label: 'last 12 months' };
    default: {
      // Use current month once we're 15+ days in; otherwise fall back to the
      // previous full calendar month so early-month views aren't empty.
      const usePrev = now.getDate() < 15;
      const start   = usePrev ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1);
      const end     = usePrev ? new Date(now.getFullYear(), now.getMonth(), 1)     : now;
      const label   = usePrev
        ? start.toLocaleString('en-US', { month: 'long' })
        : 'this month';
      return { start, end, historyMonths: 6, label };
    }
  }
}

const USD  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function serializeBill(bill: Bill): BillResponse {
  return {
    _id: bill._id, name: bill.name, amount: bill.amount,
    dueDate: bill.dueDate instanceof Date ? bill.dueDate.toISOString() : bill.dueDate,
    category: bill.category, isPaid: bill.isPaid, isAutoPay: bill.isAutoPay,
    isRecurring: bill.isRecurring, recurrenceInterval: bill.recurrenceInterval,
    url: bill.url, notes: bill.notes, renewalNote: bill.renewalNote,
    createdAt: bill.createdAt instanceof Date ? bill.createdAt.toISOString() : String(bill.createdAt),
    updatedAt: bill.updatedAt instanceof Date ? bill.updatedAt.toISOString() : String(bill.updatedAt),
  };
}

function computeSummary(bills: BillResponse[]): BillSummary {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  let totalOwedThisMonth = 0, totalPaid = 0, overdueCount = 0, autoPayTotal = 0;
  for (const bill of bills) {
    if (bill.isAutoPay) autoPayTotal += bill.amount;
    if (bill.isPaid) { totalPaid += bill.amount; continue; }
    if (bill.isRecurring && bill.recurrenceInterval === 'yearly') {
      if (typeof bill.dueDate === 'string') {
        const due = new Date(bill.dueDate);
        if (due.getMonth() === month) totalOwedThisMonth += bill.amount;
      }
    } else if (bill.isRecurring) {
      totalOwedThisMonth += bill.amount;
      if (typeof bill.dueDate === 'number' && bill.dueDate < now.getDate()) overdueCount++;
    } else if (typeof bill.dueDate === 'string') {
      const due = new Date(bill.dueDate);
      if (due.getFullYear() === year && due.getMonth() === month) totalOwedThisMonth += bill.amount;
      if (due < now) overdueCount++;
    }
  }
  return { totalOwedThisMonth, totalPaid, overdueCount, autoPayTotal };
}

// ── UI primitives ─────────────────────────────────────────────────────────────

type BadgeVariant = 'warn' | 'good' | 'info';

const BADGE: Record<BadgeVariant, React.CSSProperties> = {
  warn: { background: 'rgba(184,130,50,0.15)', color: 'var(--gold)'  },
  good: { background: 'rgba(34,197,94,0.12)',  color: 'var(--green)' },
  info: { background: 'var(--accent-a)',        color: '#a09bff'      },
};

interface StatCardProps {
  label: string; value: string; valueColor?: string;
  sub?: string; badge?: string; badgeVariant?: BadgeVariant;
  barWidth?: string; barColor?: string;
}

function StatCard({ label, value, valueColor, sub, badge, badgeVariant = 'warn', barWidth, barColor }: StatCardProps) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden', flex: '1 1 0', minWidth: 0 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text3)', marginBottom: 7, fontFamily: 'var(--mono)' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 500, lineHeight: 1, color: valueColor ?? 'var(--text)', fontFamily: 'var(--mono)', fontFeatureSettings: '"tnum"' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, fontFamily: 'var(--sans)' }}>{sub}</div>}
      {badge && (
        <div style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 20, marginTop: 7, ...BADGE[badgeVariant] }}>
          {badge}
        </div>
      )}
      {barWidth && <div style={{ position: 'absolute', bottom: 0, left: 0, height: 2, width: barWidth, background: barColor }} />}
    </div>
  );
}

function InsightBar({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, color: '#a09bff' }}>◎</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--sans)' }}>{sub}</div>
      </div>
    </div>
  );
}

function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--mono)' }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

function BudgetMiniRow({ label, spent, limit }: { label: string; spent: number; limit: number }) {
  const pct  = Math.min((spent / limit) * 100, 100);
  const over = spent > limit;
  const warn = !over && pct > 80;
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--sans)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, color: over ? 'var(--red)' : 'var(--text3)', fontFamily: 'var(--mono)' }}>{USD0.format(spent)} / {USD0.format(limit)}</span>
      </div>
      <div style={{ height: 4, background: 'var(--raised)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: over ? 'var(--red)' : warn ? 'var(--gold)' : 'var(--accent)', borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ p?: string; view?: string }> }) {
  const { p, view } = await searchParams;
  const period   = (['1W', '1M', '3M', 'YTD', '1Y'].includes(p ?? '') ? p : '1M') as Period;
  const viewMode: CashFlowViewMode = view === 'normalized' ? 'normalized' : 'actual';
  const { start, end, historyMonths, label: periodLabel } = periodToRange(period);

  const db = await getDb();

  const [rawBills, allAccounts, recentTransactions, cashFlow, budgets, history] = await Promise.all([
    listBills(db),
    listAccounts(db),
    listRecentTransactions(db),
    getCashFlowForRange(db, start, end, viewMode === 'normalized'),
    listBudgets(db),
    getCashFlowHistory(db, historyMonths, viewMode === 'normalized'),
  ]);

  const metaList = allAccounts.length > 0 ? await listAccountMeta(db, allAccounts.map(a => a._id)) : [];
  const metaMap  = new Map(metaList.map(m => [m._id, m]));
  const accounts: Account[] = allAccounts.map(a => {
    const meta = metaMap.get(a._id);
    return meta?.customOrgName ? { ...a, orgName: meta.customOrgName } : a;
  });

  const bills   = rawBills.map(serializeBill);
  const txnMap  = new Map(recentTransactions.map(t => [t._id, t]));
  const enrichedMatches: EnrichedMatch[] = findAutoMatches(recentTransactions, rawBills).flatMap(m => {
    const txn = txnMap.get(m.transactionId);
    if (!txn) return [];
    const posted = txn.posted instanceof Date ? txn.posted : new Date(Number(txn.posted) * 1000);
    return [{ ...m, txnDescription: txn.description, txnAmount: Number(txn.amount), txnDate: posted.toISOString() }];
  });

  const portfolioHoldings: Holding[] = accounts
    .filter(a => a.accountType === 'investment' && a.holdings?.length)
    .flatMap(a => a.holdings ?? []);

  const summary     = computeSummary(bills);
  const savingsRate = cashFlow.income > 0 ? ((cashFlow.income - cashFlow.expenses) / cashFlow.income) * 100 : 0;

  const spendByCat = new Map<BillCategory, number>();
  for (const bill of bills) {
    if (bill.isRecurring) spendByCat.set(bill.category, (spendByCat.get(bill.category) ?? 0) + bill.amount);
  }
  const categorySpendData = Array.from(spendByCat.entries()).map(([label, amount]) => ({ label, amount }));

  const budgetAlerts = budgets
    .map(b => ({ category: b.category, spent: spendByCat.get(b.category as BillCategory) ?? 0, limit: b.monthlyAmount }))
    .filter(b => b.limit > 0);

  const billAlerts = bills
    .filter(b => !b.isPaid && b.recurrenceInterval !== 'yearly')
    .map(b => {
      const dueDay = typeof b.dueDate === 'number' ? b.dueDate : null;
      const today  = new Date().getDate();
      if (dueDay === null) return null;
      return { name: b.name, amount: b.amount, daysUntilDue: dueDay - today, isOverdue: dueDay < today };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const priceAlerts = rawBills
    .filter(b => b.lastChargedAmount !== undefined && Math.abs(b.lastChargedAmount - b.amount) > 0.5)
    .map(b => ({ name: b.name, oldAmount: b.amount, newAmount: b.lastChargedAmount!, isSubscription: b.isSubscription ?? false }));

  const renewalAlerts = (() => {
    const now = new Date();
    const out: { name: string; daysUntil: number; renewalNote: string }[] = [];
    for (const b of bills) {
      if (b.recurrenceInterval !== 'yearly' || !b.renewalNote || typeof b.dueDate !== 'string') continue;
      const stored = new Date(b.dueDate);
      if (isNaN(stored.getTime())) continue;
      for (const yr of [now.getFullYear(), now.getFullYear() + 1]) {
        const ann = new Date(yr, stored.getMonth(), stored.getDate());
        const d   = Math.round((ann.getTime() - now.getTime()) / 86400000);
        if (d >= 0 && d <= 30) { out.push({ name: b.name, daysUntil: d, renewalNote: b.renewalNote }); break; }
      }
    }
    return out;
  })();

  // ── Derived display values ────────────────────────────────────────────────
  const h        = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr  = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const monthlyBills = bills.filter(b => b.recurrenceInterval !== 'yearly');
  const paidCount    = bills.filter(b => b.isPaid).length;
  const billsPct     = monthlyBills.length > 0 ? Math.round((paidCount / monthlyBills.length) * 100) : 0;
  const monthStr     = new Date().toLocaleString('en-US', { month: 'short' });

  const nextAutoBill = bills
    .filter(b => !b.isPaid && b.isAutoPay && typeof b.dueDate === 'number' && b.recurrenceInterval !== 'yearly')
    .sort((a, b) => (a.dueDate as number) - (b.dueDate as number))[0];
  const billsBadge =
    nextAutoBill ? `Next due ${monthStr} ${nextAutoBill.dueDate} · auto`
    : paidCount === monthlyBills.length && monthlyBills.length > 0 ? 'All bills clear ✓'
    : `${monthlyBills.length - paidCount} remaining`;

  const savingsBarW = Math.min(Math.max(savingsRate, 0) / 20 * 100, 100);

  const overBudget = budgetAlerts
    .filter(b => b.spent > b.limit)
    .sort((a, b) => (b.spent / b.limit) - (a.spent / a.limit));
  const topOver  = overBudget[0];
  const insight = topOver
    ? { title: `${topOver.category} is running ${Math.round(((topOver.spent - topOver.limit) / topOver.limit) * 100)}% over budget`, sub: `${USD0.format(topOver.spent)} spent vs ${USD0.format(topOver.limit)} budget this month` }
    : savingsRate > 20
      ? { title: `Strong savings rate: ${savingsRate.toFixed(1)}% this month`, sub: `${USD0.format(cashFlow.income - cashFlow.expenses)} ahead — on track to hit your goals` }
      : { title: 'Sync your accounts to unlock personalized insights', sub: 'Track spending, bills, and savings automatically' };

  const linkStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--text2)', fontFamily: 'var(--mono)', textDecoration: 'none', letterSpacing: '.04em' };
  const panelStyle: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Sticky header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)', backdropFilter: 'blur(8px)' }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{greeting}</h1>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1, fontFamily: 'var(--mono)' }}>{dateStr}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Suspense><CashFlowToggle active={viewMode} /></Suspense>
          <Suspense><PeriodSelector active={period} /></Suspense>
          <NotificationBell billAlerts={billAlerts} budgetAlerts={budgetAlerts} priceAlerts={priceAlerts} renewalAlerts={renewalAlerts} />
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>

        <OnboardingBanner simplefinConfigured={Boolean(process.env.SIMPLEFIN_URL)} accountCount={accounts.length} billCount={rawBills.length} hasBudget={budgets.length > 0} />
        <NewSubscriptionsBanner />
        <MatchBanner matches={enrichedMatches} />

        {/* Normalized mode banner */}
        {viewMode === 'normalized' && (
          <div style={{ marginBottom: 14, padding: '8px 14px', background: 'var(--accent-a)', borderLeft: '2px solid var(--accent)', borderRadius: '0 8px 8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--sans)' }}>
              Showing <strong style={{ color: '#a09bff' }}>normalized</strong> view — annual charges amortized over 12 months
            </span>
          </div>
        )}

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <StatCard
            label="Money in vs out"
            value={USD.format(cashFlow.income)}
            sub={`income · ${periodLabel}`}
            badge={`${cashFlow.net >= 0 ? '+' : ''}${USD.format(cashFlow.net)} net after bills`}
            badgeVariant={cashFlow.net >= 0 ? 'good' : 'warn'}
            barWidth="100%"
            barColor={cashFlow.net >= 0 ? 'rgba(34,197,94,0.45)' : 'rgba(184,130,50,0.45)'}
          />
          <StatCard
            label="Bills this month"
            value={`${paidCount} of ${monthlyBills.length} covered`}
            valueColor={paidCount === monthlyBills.length && monthlyBills.length > 0 ? 'var(--green)' : undefined}
            sub={`${USD0.format(summary.totalPaid)} paid · ${USD0.format(summary.totalOwedThisMonth)} left`}
            badge={billsBadge}
            badgeVariant={paidCount === monthlyBills.length ? 'good' : 'info'}
            barWidth={`${billsPct}%`}
            barColor="rgba(34,197,94,0.5)"
          />
          <StatCard
            label="Savings rate"
            value={`${Math.max(0, savingsRate).toFixed(1)}%`}
            sub={`${USD0.format(Math.max(0, cashFlow.net))} saved · ${periodLabel}`}
            badge={savingsRate >= 20 ? 'On target' : 'Below target'}
            badgeVariant={savingsRate >= 20 ? 'good' : 'warn'}
            barWidth={`${savingsBarW}%`}
            barColor="var(--green)"
          />
        </div>

        {/* Insight bar */}
        <InsightBar title={insight.title} sub={insight.sub} />

        {/* Cash flow chart */}
        <div style={{ marginBottom: 12 }}>
          <DashboardCharts history={history} />
        </div>

        <PortfolioWidget holdings={portfolioHoldings} />

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

          {/* Recent transactions */}
          <div style={panelStyle}>
            <CardHeader title="Recent" subtitle="Latest transactions" action={<a href="/transactions" style={linkStyle}>All →</a>} />
            {recentTransactions.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textAlign: 'center', padding: '24px 0' }}>No transactions — sync to load</p>
            ) : (
              recentTransactions.slice(0, 6).map(t => {
                const amt = Number(t.amount);
                const pos = amt >= 0;
                const date = t.posted
                  ? (t.posted instanceof Date ? t.posted : new Date(Number(t.posted) * 1000))
                      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '';
                return (
                  <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: pos ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: pos ? 'var(--green)' : 'var(--text3)', flexShrink: 0, fontFamily: 'var(--mono)' }}>
                      {t.description.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--sans)' }}>{t.description}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1, fontFamily: 'var(--mono)', display: 'flex', gap: 5, alignItems: 'center' }}>
                        {date}
                        {t.category && <span style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: 3, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.05em' }}>{t.category}</span>}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: pos ? 'var(--green)' : 'var(--text2)', flexShrink: 0 }}>
                      {pos ? '+' : '−'}{USD.format(Math.abs(amt))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Budget mini */}
          <div style={panelStyle}>
            <CardHeader title="Budget" subtitle={`${new Date().getDate()} days in`} action={<a href="/budget" style={linkStyle}>View →</a>} />
            {budgets.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textAlign: 'center', padding: '24px 0' }}>No budgets set</p>
            ) : (
              budgets.slice(0, 6).map(b => (
                <BudgetMiniRow key={b.category} label={b.category} spent={spendByCat.get(b.category as BillCategory) ?? 0} limit={b.monthlyAmount} />
              ))
            )}
          </div>

          {/* Spend by category — horizontal bars */}
          <SpendByCategoryCard data={categorySpendData} />

        </div>
      </div>
    </div>
  );
}
