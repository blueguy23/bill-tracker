export const dynamic = 'force-dynamic';

import type { BillResponse, BillSummary, Bill, BillCategory } from '@/types/bill';
import type { EnrichedMatch } from '@/types/subscription';
import type { Account } from '@/lib/simplefin/types';
// import { Suspense } from 'react';
import { MatchBanner } from '@/components/MatchBanner';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { NewSubscriptionsBanner } from '@/components/NewSubscriptionsBanner';
// TODO: relocate or remove
// import { DashboardCharts, SpendByCategoryCard } from '@/components/DashboardCharts';
// import { PeriodSelector } from '@/components/PeriodSelector';
// import { CashFlowToggle } from '@/components/CashFlowToggle';
import type { CashFlowViewMode } from '@/components/CashFlowToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { MonthInReview, AnomalyCard, KpiTile, SectionTitle, CategoryRow, getCategoryIcon } from '@/components/DashboardCards';
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
// TODO: relocate or remove
// import { PortfolioWidget } from '@/components/PortfolioWidget';
// import { ForecastChart } from '@/components/ForecastChart';
import { getForecast } from '@/adapters/forecast';
import { PanelTrigger } from '@/components/PanelTrigger';
import { DetailPanel } from '@/components/DetailPanel';
import type { DetailPanelData, PanelBill, PanelTransaction, PanelAccount } from '@/components/DetailPanel';

function periodToRange(p: Period): { start: Date; end: Date; historyMonths: number; label: string } {
  const now = new Date();
  switch (p) {
    case '1W':  return { start: new Date(now.getTime() - 7 * 86400000),   end: now, historyMonths: 6,                  label: 'last 7 days'  };
    case '3M':  return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: now, historyMonths: 6,        label: 'last 3 months' };
    case 'YTD': return { start: new Date(now.getFullYear(), 0, 1),         end: now, historyMonths: now.getMonth() + 1, label: 'year to date'  };
    case '1Y':  return { start: new Date(now.getFullYear() - 1, now.getMonth(), 1), end: now, historyMonths: 12,       label: 'last 12 months' };
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end   = now;
      return { start, end, historyMonths: 6, label: 'this month' };
    }
  }
}

const USD  = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function isPaidThisMonth(bill: Bill): boolean {
  if (!bill.isPaid) return false;
  if (!bill.isRecurring) return bill.isPaid;
  return bill.paidMonth === currentYYYYMM();
}

function serializeBill(bill: Bill): BillResponse {
  return {
    _id: bill._id, name: bill.name, amount: bill.amount,
    dueDate: bill.dueDate instanceof Date ? bill.dueDate.toISOString() : bill.dueDate,
    category: bill.category, isPaid: isPaidThisMonth(bill), isAutoPay: bill.isAutoPay,
    isRecurring: bill.isRecurring, recurrenceInterval: bill.recurrenceInterval,
    url: bill.url, notes: bill.notes, renewalNote: bill.renewalNote,
    paidMonth: bill.paidMonth,
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ p?: string; view?: string }> }) {
  const { p, view } = await searchParams;
  const period   = (['1W', '1M', '3M', 'YTD', '1Y'].includes(p ?? '') ? p : '1M') as Period;
  const viewMode: CashFlowViewMode = view === 'normalized' ? 'normalized' : 'actual';
  const { start, end, historyMonths } = periodToRange(period);

  const db = await getDb();

  const [rawBills, allAccounts, recentTransactions, cashFlow, budgets, history, forecastResult] = await Promise.all([
    listBills(db),
    listAccounts(db),
    listRecentTransactions(db),
    getCashFlowForRange(db, start, end, viewMode === 'normalized'),
    listBudgets(db),
    getCashFlowHistory(db, historyMonths, viewMode === 'normalized'),
    getForecast(db),
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
      const now = new Date();
      let daysUntilDue: number;
      if (typeof b.dueDate === 'number') {
        daysUntilDue = b.dueDate - now.getDate();
      } else if (typeof b.dueDate === 'string') {
        const due = new Date(b.dueDate);
        if (isNaN(due.getTime())) return null;
        daysUntilDue = Math.round((due.getTime() - now.getTime()) / 86400000);
      } else {
        return null;
      }
      return { name: b.name, amount: b.amount, daysUntilDue, isOverdue: daysUntilDue < 0 };
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
  const dateStr  = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const monthlyBills = bills.filter(b => b.recurrenceInterval !== 'yearly');
  const paidCount    = bills.filter(b => b.isPaid).length;
  const billsPct     = monthlyBills.length > 0 ? Math.round((paidCount / monthlyBills.length) * 100) : 0;

  const savingsBarW = Math.min(Math.max(savingsRate, 0) / 20 * 100, 100);

  const overBudget = budgetAlerts
    .filter(b => b.spent > b.limit)
    .sort((a, b) => (b.spent / b.limit) - (a.spent / a.limit));

  const panelData: DetailPanelData = {
    bills: bills.map<PanelBill>(b => ({
      name: b.name, amount: b.amount, category: b.category,
      isPaid: b.isPaid ?? false, isAutoPay: b.isAutoPay,
      dueDate: b.dueDate, recurrenceInterval: b.recurrenceInterval,
      paidMonth: b.paidMonth, renewalNote: b.renewalNote,
    })),
    transactions: recentTransactions.map<PanelTransaction>(t => ({
      _id: t._id, description: t.description, amount: Number(t.amount),
      category: t.category,
      posted: t.posted instanceof Date ? t.posted.toISOString() : typeof t.posted === 'number' ? t.posted : String(t.posted),
    })),
    accounts: accounts.map<PanelAccount>(a => ({
      _id: a._id, orgName: a.orgName, name: a.name,
      balance: a.balance, accountType: a.accountType,
    })),
    cashFlow: { income: cashFlow.income, expenses: cashFlow.expenses, net: cashFlow.net },
    history: history.map(h => ({ month: h.label, income: h.income, expenses: h.expenses })),
    savingsRate,
    categorySpend: categorySpendData,
    budgetAlerts,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 24px 0', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 15, color: 'var(--text2)' }}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>{greeting}</strong></div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text3)' }}>{dateStr}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <NotificationBell billAlerts={billAlerts} budgetAlerts={budgetAlerts} priceAlerts={priceAlerts} renewalAlerts={renewalAlerts} />
        </div>
      </header>

      <div style={{ padding: '0 24px 24px' }}>

        <OnboardingBanner simplefinConfigured={Boolean(process.env.SIMPLEFIN_URL)} accountCount={accounts.length} billCount={rawBills.length} hasBudget={budgets.length > 0} />
        <NewSubscriptionsBanner />
        <MatchBanner matches={enrichedMatches} />

        {/* TODO: replace with real review data — show only on 1st-5th of month */}
        <MonthInReview
          month={new Date(new Date().getFullYear(), new Date().getMonth() - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          stats={[
            { label: 'Top Category', value: 'Food', detail: '$412 spent' },
            { label: 'Savings Rate', value: '22%', detail: 'Above target', color: 'var(--green)' },
            { label: 'Biggest Anomaly', value: 'Amazon', detail: '+$85 vs usual', color: 'var(--gold)' },
            { label: 'Net Change', value: '+$680', detail: 'Across all accounts', color: 'var(--green)' },
          ]}
        />

        {/* TODO: replace with real anomaly detection data */}
        {priceAlerts.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {priceAlerts.slice(0, 2).map(a => (
              <AnomalyCard key={a.name} merchant={a.name} amount={USD.format(Math.abs(a.newAmount - a.oldAmount))} usual={`${USD.format(a.oldAmount)}/mo`} />
            ))}
          </div>
        )}

        {/* Budget Alerts */}
        {overBudget.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {overBudget.slice(0, 2).map(b => (
              <div key={b.category} style={{ flex: 1, minWidth: 260, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, background: 'rgba(239,68,68,0.12)', color: 'var(--red)' }}>!</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{b.category} spending over budget</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>{USD0.format(b.spent)} of {USD0.format(b.limit)} budget · {USD0.format(b.spent - b.limit)} over</div>
                  </div>
                </div>
                <a href="/budget" style={{ alignSelf: 'flex-start', padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.12)', color: 'var(--red)', textDecoration: 'none' }}>Review</a>
              </div>
            ))}
          </div>
        )}

        {/* KPI Tiles */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <PanelTrigger type="money-left" style={{ flex: '1 1 0', minWidth: 0 }}>
            <KpiTile
              label="Money left after bills"
              value={USD0.format(Math.max(0, cashFlow.net))}
              trend={undefined}
              context={`Net balance after upcoming bills · ${USD0.format(cashFlow.income)} in · ${USD0.format(cashFlow.expenses)} out`}
              barPct={cashFlow.income > 0 ? ((cashFlow.income - cashFlow.expenses) / cashFlow.income) * 100 : 0}
              barVariant={cashFlow.net >= 0 ? 'good' : 'warn'}
            />
          </PanelTrigger>
          <PanelTrigger type="bills" style={{ flex: '1 1 0', minWidth: 0 }}>
            <KpiTile
              label="Bills covered this month"
              value={`${paidCount} of ${monthlyBills.length}`}
              trend={monthlyBills.length - paidCount > 0 ? { direction: 'neutral', text: `${monthlyBills.length - paidCount} left` } : undefined}
              context={`${USD0.format(summary.totalPaid)} paid · ${USD0.format(summary.totalOwedThisMonth)} remaining`}
              barPct={billsPct}
              barVariant={billsPct >= 80 ? 'good' : 'warn'}
            />
          </PanelTrigger>
          <PanelTrigger type="savings" style={{ flex: '1 1 0', minWidth: 0 }}>
            <KpiTile
              label="Savings rate"
              value={`${Math.max(0, savingsRate).toFixed(0)}%`}
              trend={savingsRate >= 20 ? { direction: 'up', text: 'On target' } : { direction: 'down', text: 'Below 20% target' }}
              context={`${USD0.format(Math.max(0, cashFlow.net))} saved · target 20%`}
              barPct={savingsBarW}
              barVariant={savingsRate >= 20 ? 'good' : 'warn'}
            />
          </PanelTrigger>
        </div>

        {/* Spending by Category */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <SectionTitle title="Spending by Category" subtitle={new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })} />
          {categorySpendData.length === 0 ? (
            <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textAlign: 'center', padding: '24px 0' }}>No spending data yet</p>
          ) : (
            categorySpendData
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 6)
              .map(cat => {
                const budget = budgetAlerts.find(b => b.category === cat.label);
                return (
                  <PanelTrigger key={cat.label} type="category" arg={cat.label}>
                    <CategoryRow label={cat.label} icon={getCategoryIcon(cat.label)} spent={cat.amount} limit={budget?.limit ?? 0} barColor="var(--accent)" />
                  </PanelTrigger>
                );
              })
          )}
        </div>

        {/* Two-column: Upcoming Bills + Recent Transactions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Upcoming Bills */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Upcoming Bills</span>
              {billAlerts.some(a => a.isOverdue || (a.daysUntilDue >= 0 && a.daysUntilDue <= 3)) && (
                <span style={{ fontSize: 13, color: 'var(--gold)' }} title="Bills need attention">⚠</span>
              )}
              <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Next 14 days</span>
            </div>
            {billAlerts.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textAlign: 'center', padding: '24px 0' }}>No upcoming bills</p>
            ) : (
              billAlerts.filter(a => a.daysUntilDue >= 0).sort((a, b) => a.daysUntilDue - b.daysUntilDue).slice(0, 5).map(bill => {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + bill.daysUntilDue);
                const urgent = bill.isOverdue || bill.daysUntilDue <= 3;
                return (
                  <PanelTrigger key={bill.name} type="bill-detail" arg={bill.name}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      borderBottom: '1px solid var(--border)',
                      background: urgent ? (bill.isOverdue ? 'rgba(239,68,68,0.04)' : 'rgba(212,148,58,0.04)') : 'transparent',
                      margin: urgent ? '0 -8px' : 0, padding: urgent ? '10px 8px' : '10px 0',
                      borderRadius: urgent ? 6 : 0,
                    }}>
                      <div style={{ textAlign: 'center', width: 36, flexShrink: 0 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{dueDate.getDate()}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>{dueDate.toLocaleString('en-US', { weekday: 'short' })}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bill.name}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: 'var(--text)', flexShrink: 0 }}>{USD.format(bill.amount)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
                        {urgent && <span style={{ fontSize: 11, color: bill.isOverdue ? 'var(--red)' : 'var(--gold)' }}>⚠</span>}
                        <span>{bill.daysUntilDue}d</span>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, flexShrink: 0, background: bill.isOverdue ? 'rgba(239,68,68,0.12)' : urgent ? 'rgba(212,148,58,0.12)' : 'rgba(212,148,58,0.08)', color: bill.isOverdue ? 'var(--red)' : 'var(--gold)' }}>
                        {bill.isOverdue ? 'Late' : 'Due'}
                      </div>
                    </div>
                  </PanelTrigger>
                );
              })
            )}
          </div>

          {/* Recent Transactions */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <SectionTitle title="Recent Transactions" subtitle="Last 7 days" />
              <a href="/transactions" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', fontFamily: 'var(--mono)', textDecoration: 'none', letterSpacing: '.04em' }}>All →</a>
            </div>
            {recentTransactions.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', textAlign: 'center', padding: '24px 0' }}>No transactions — sync to load</p>
            ) : (
              recentTransactions.slice(0, 5).map((t, i) => {
                const amt = Number(t.amount);
                const pos = amt >= 0;
                const date = t.posted
                  ? (t.posted instanceof Date ? t.posted : new Date(Number(t.posted) * 1000))
                      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '';
                return (
                  <PanelTrigger key={t._id} type="transaction" arg={i}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: pos ? 'var(--green)' : 'var(--accent)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1, fontFamily: 'var(--mono)' }}>{t.category ?? 'Uncategorized'}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: pos ? 'var(--green)' : 'var(--text)', flexShrink: 0 }}>
                        {pos ? '+' : '−'}{USD.format(Math.abs(amt))}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', flexShrink: 0 }}>{date}</div>
                    </div>
                  </PanelTrigger>
                );
              })
            )}
          </div>

        </div>

        {/* TODO: relocate or remove */}
        {/* <DashboardCharts history={history} /> */}
        {/* <ForecastChart forecast={forecastResult.days} /> */}
        {/* <PortfolioWidget holdings={portfolioHoldings} /> */}
      </div>

      <DetailPanel data={panelData} />
    </div>
  );
}
