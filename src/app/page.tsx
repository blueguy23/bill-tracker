import type { BillResponse, BillSummary, Bill, BillCategory } from '@/types/bill';
import type { SuggestedMatch } from '@/types/subscription';
import type { Account } from '@/lib/simplefin/types';
import { Suspense } from 'react';
import { MatchBanner } from '@/components/MatchBanner';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { DashboardCharts, SpendByCategoryCard } from '@/components/DashboardCharts';
import { PeriodSelector } from '@/components/PeriodSelector';
import { NotificationBell } from '@/components/NotificationBell';
import type { Period } from '@/components/PeriodSelector';
import { getDb } from '@/adapters/db';
import { listBills } from '@/adapters/bills';
import { listAccounts, listRecentTransactions, getCashFlowForRange } from '@/adapters/accounts';
import { listAccountMeta } from '@/adapters/accountMeta';
import { listBudgets } from '@/adapters/budgets';
import { getCashFlowHistory } from '@/adapters/cashFlowHistory';
import { findAutoMatches } from '@/lib/subscriptions/autoMatch';
import type { Budget } from '@/types/budget';

function periodToRange(p: Period): { start: Date; end: Date; historyMonths: number; label: string } {
  const now = new Date();
  switch (p) {
    case '1W': return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now, historyMonths: 6, label: 'Last 7 days' };
    case '3M': return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: now, historyMonths: 6, label: 'Last 3 months' };
    case 'YTD': return { start: new Date(now.getFullYear(), 0, 1), end: now, historyMonths: now.getMonth() + 1, label: `YTD ${now.getFullYear()}` };
    case '1Y': return { start: new Date(now.getFullYear() - 1, now.getMonth(), 1), end: now, historyMonths: 12, label: 'Last 12 months' };
    case '1M':
    default: return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1), historyMonths: 6, label: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }) };
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
    url: bill.url, notes: bill.notes,
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
    if (bill.isRecurring) {
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

// ── Inline components ──────────────────────────────────────────────────────

function FolioCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, ...style }}>
      {children}
    </div>
  );
}

interface MetricCardProps {
  label: string; value: string; sub?: string;
  badge?: { text: string; positive: boolean };
  valueColor?: string; hero?: boolean;
}

function MetricCard({ label, value, sub, badge, valueColor, hero }: MetricCardProps) {
  return (
    <FolioCard style={{ flex: hero ? '1.6 1 0' : '1 1 0', minWidth: 0, padding: '20px 22px' }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700, fontFamily: 'var(--mono)', marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: hero ? 26 : 22, fontWeight: 300, color: valueColor ?? 'var(--text)', letterSpacing: '0em', lineHeight: 1, fontFeatureSettings: '"tnum"' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, fontFamily: 'var(--sans)' }}>{sub}</div>}
      {badge && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 4, marginTop: 8, fontFamily: 'var(--mono)', background: badge.positive ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)', color: badge.positive ? 'var(--green)' : 'var(--red)' }}>
          {badge.text}
        </div>
      )}
    </FolioCard>
  );
}

function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)', marginBottom: 3 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

function BudgetMiniRow({ label, spent, limit }: { label: string; spent: number; limit: number }) {
  const pct  = Math.min((spent / limit) * 100, 100);
  const over = spent > limit;
  const warn = !over && pct > 80;
  const barColor = over ? 'var(--red)' : warn ? 'var(--gold)' : 'var(--accent)';
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--sans)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 11, color: over ? 'var(--red)' : 'var(--text3)', fontFamily: 'var(--mono)' }}>{USD0.format(spent)} / {USD0.format(limit)}</span>
      </div>
      <div style={{ height: 4, background: 'var(--raised)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const period = (['1W', '1M', '3M', 'YTD', '1Y'].includes(p ?? '') ? p : '1M') as Period;
  const { start, end, historyMonths } = periodToRange(period);

  const db = await getDb();

  const [rawBills, allAccounts, recentTransactions, cashFlow, budgets, history] = await Promise.all([
    listBills(db),
    listAccounts(db),
    listRecentTransactions(db),
    getCashFlowForRange(db, start, end),
    listBudgets(db),
    getCashFlowHistory(db, historyMonths),
  ]);

  const metaList = allAccounts.length > 0 ? await listAccountMeta(db, allAccounts.map(a => a._id)) : [];
  const metaMap  = new Map(metaList.map(m => [m._id, m]));
  const accounts: Account[] = allAccounts.map(a => {
    const meta = metaMap.get(a._id);
    return meta?.customOrgName ? { ...a, orgName: meta.customOrgName } : a;
  });

  const bills   = rawBills.map(serializeBill);
  const matches: SuggestedMatch[] = findAutoMatches(recentTransactions, rawBills);
  const summary = computeSummary(bills);

  const savingsRate = cashFlow.income > 0 ? ((cashFlow.income - cashFlow.expenses) / cashFlow.income) * 100 : 0;

  const budgetMap = new Map<string, Budget>(budgets.map(b => [b.category, b]));
  const spendByCat = new Map<BillCategory, number>();
  for (const bill of bills) {
    if (bill.isRecurring) spendByCat.set(bill.category, (spendByCat.get(bill.category) ?? 0) + bill.amount);
  }
  const categorySpendData = Array.from(spendByCat.entries()).map(([label, amount]) => ({ label, amount }));

  const billAlerts = bills
    .filter(b => !b.isPaid)
    .map(b => {
      const dueDay = typeof b.dueDate === 'number' ? b.dueDate : null;
      const today = new Date().getDate();
      if (dueDay === null) return null;
      return { name: b.name, amount: b.amount, daysUntilDue: dueDay - today, isOverdue: dueDay < today };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const budgetAlerts = budgets
    .map(b => ({ category: b.category, spent: spendByCat.get(b.category as BillCategory) ?? 0, limit: b.monthlyAmount }))
    .filter(b => b.limit > 0);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Sticky top bar */}
      <div style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg)', backdropFilter: 'blur(8px)' }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{greeting}</h1>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--mono)' }}>{dateStr}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Suspense>
            <PeriodSelector active={period} />
          </Suspense>
          <NotificationBell billAlerts={billAlerts} budgetAlerts={budgetAlerts} />
        </div>
      </div>

      <div style={{ padding: '24px 28px' }}>

        <OnboardingBanner
          simplefinConfigured={Boolean(process.env.SIMPLEFIN_URL)}
          accountCount={accounts.length}
          billCount={rawBills.length}
          hasBudget={budgets.length > 0}
        />
        <MatchBanner count={matches.length} />

        {/* Metric strip */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <MetricCard
            hero label="Monthly Net"
            value={`${cashFlow.net >= 0 ? '+' : ''}${USD.format(cashFlow.net)}`}
            sub={`${USD0.format(cashFlow.income)} income · ${USD0.format(cashFlow.expenses)} exp`}
            badge={{ text: `↑ ${savingsRate.toFixed(1)}% SAVINGS RATE`, positive: savingsRate >= 20 }}
            valueColor={cashFlow.net >= 0 ? 'var(--green)' : 'var(--red)'}
          />
          <MetricCard
            label="Bills Owed"
            value={USD.format(summary.totalOwedThisMonth)}
            sub={`${bills.filter(b => b.isPaid).length}/${bills.length} bills paid`}
            badge={summary.totalOwedThisMonth === 0 ? { text: 'ALL CLEAR ✓', positive: true } : { text: `${bills.length - bills.filter(b => b.isPaid).length} REMAINING`, positive: false }}
          />
          <MetricCard
            label="AutoPay"
            value={USD.format(summary.autoPayTotal)}
            sub={`${bills.filter(b => b.isAutoPay).length} bills auto-scheduled`}
            badge={{ text: 'AUTOPAY ACTIVE', positive: true }}
          />
        </div>

        {/* Charts row */}
        <div style={{ marginBottom: 20 }}>
          <DashboardCharts history={history} />
        </div>

        {/* Bottom row: Spend by Category + Budget + Recent Transactions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12 }}>

          {/* Spend by Category donut */}
          <SpendByCategoryCard data={categorySpendData} />

          {/* Budget mini */}
          <FolioCard style={{ padding: '20px' }}>
            <CardHeader
              title="Budget"
              subtitle={`${new Date().getDate()} days in`}
              action={
                <a href="/budget" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', fontFamily: 'var(--mono)', textDecoration: 'none', letterSpacing: '.04em', padding: '4px 0' }}>View →</a>
              }
            />
            {budgets.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textAlign: 'center', padding: '24px 0' }}>No budgets set</p>
            ) : (
              budgets.slice(0, 6).map(b => (
                <BudgetMiniRow key={b.category} label={b.category} spent={spendByCat.get(b.category as BillCategory) ?? 0} limit={b.monthlyAmount} />
              ))
            )}
          </FolioCard>

          {/* Recent transactions */}
          <FolioCard style={{ padding: '20px' }}>
            <CardHeader
              title="Recent"
              subtitle="Latest transactions"
              action={
                <a href="/transactions" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', fontFamily: 'var(--mono)', textDecoration: 'none', letterSpacing: '.04em', padding: '4px 0' }}>All →</a>
              }
            />
            {recentTransactions.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textAlign: 'center', padding: '24px 0' }}>No transactions — sync to load</p>
            ) : (
              recentTransactions.slice(0, 6).map(t => {
                const amt = Number(t.amount);
                const pos = amt >= 0;
                const date = t.posted ? (t.posted instanceof Date ? t.posted : new Date(Number(t.posted) * 1000)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase() : '';
                return (
                  <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--sans)' }}>{t.description}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--mono)', display: 'flex', gap: 6, alignItems: 'center' }}>
                        {date}
                        {t.category && <span style={{ background: 'rgba(237,237,245,.06)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.05em' }}>{t.category}</span>}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: pos ? 'var(--green)' : 'var(--text2)', flexShrink: 0 }}>
                      {pos ? '+' : '−'}{USD.format(Math.abs(amt))}
                    </div>
                  </div>
                );
              })
            )}
          </FolioCard>
        </div>

      </div>
    </div>
  );
}
