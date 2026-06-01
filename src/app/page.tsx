export const dynamic = 'force-dynamic';

import type { BillResponse, BillSummary, Bill, BillCategory } from '@/types/bill';
import type { EnrichedMatch } from '@/types/subscription';
import type { Account } from '@/lib/simplefin/types';
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
import type { Holding } from '@/lib/simplefin/types';
import { getForecast } from '@/adapters/forecast';
import { getPayPeriodData } from '@/adapters/payPeriod';
import { getUserProfile } from '@/adapters/userProfile';
import { PanelTrigger } from '@/components/PanelTrigger';
import { DetailPanel } from '@/components/DetailPanel';
import type { DetailPanelData, PanelBill, PanelTransaction, PanelAccount } from '@/components/DetailPanel';
import { MonthlyDashboard } from '@/components/MonthlyDashboard';
import { PayPeriodDashboard } from '@/components/PayPeriodDashboard';
import { PayPeriodHeader } from '@/components/PayPeriodHeader';
import { DashboardViewToggle } from '@/components/DashboardViewToggle';

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

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ p?: string; view?: string; offset?: string }> }) {
  const { p, view, offset: offsetStr } = await searchParams;
  const period   = (['1W', '1M', '3M', 'YTD', '1Y'].includes(p ?? '') ? p : '1M') as Period;
  const viewMode: CashFlowViewMode = view === 'normalized' ? 'normalized' : 'actual';
  const activeView = view === 'monthly' ? 'monthly' : 'payperiod';
  const periodOffset = parseInt(offsetStr ?? '0', 10) || 0;
  const { start, end, historyMonths } = periodToRange(period);

  const db = await getDb();

  const [rawBills, allAccounts, recentTransactions, cashFlow, budgets, history, _forecastResult, payPeriodData, userProfile] = await Promise.all([
    listBills(db),
    listAccounts(db),
    listRecentTransactions(db),
    getCashFlowForRange(db, start, end, viewMode === 'normalized'),
    listBudgets(db),
    getCashFlowHistory(db, historyMonths, viewMode === 'normalized'),
    getForecast(db),
    activeView === 'payperiod' ? getPayPeriodData(db, periodOffset) : Promise.resolve(null),
    getUserProfile(db),
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
  const firstName = userProfile.displayName?.split(/\s+/)[0] || '';
  const greeting = (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + (firstName ? `, ${firstName}` : '');
  const dateStr  = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

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

  const showPayPeriod = activeView === 'payperiod' && payPeriodData !== null;

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

        {showPayPeriod ? (
          <>
            <PayPeriodHeader period={payPeriodData.period} activeView="payperiod" offset={periodOffset} />
            <PayPeriodDashboard data={payPeriodData} />
          </>
        ) : activeView === 'payperiod' && payPeriodData === null ? (
          <>
            <PayPeriodHeader
              period={{ start: new Date(), end: new Date(), isActive: true, dayNumber: 1, totalDays: 1, daysLeft: 0 }}
              activeView="payperiod"
              offset={0}
            />
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '40px 32px', textAlign: 'center', marginBottom: 20,
            }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                Set up your pay period
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, maxWidth: 420, margin: '0 auto 16px' }}>
                Configure your pay frequency in Settings to see your Safe to Spend dashboard. We couldn&apos;t auto-detect a clear income pattern.
              </div>
              <a href="/settings" style={{
                display: 'inline-block', padding: '8px 20px', borderRadius: 8,
                background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
                textDecoration: 'none',
              }}>
                Go to Settings
              </a>
            </div>
            <MonthlyDashboard
              bills={bills} accounts={accounts} recentTransactions={recentTransactions}
              cashFlow={cashFlow} enrichedMatches={enrichedMatches} summary={summary}
              savingsRate={savingsRate} categorySpendData={categorySpendData}
              budgetAlerts={budgetAlerts} billAlerts={billAlerts} priceAlerts={priceAlerts}
              rawBillCount={rawBills.length} accountCount={accounts.length}
              hasBudget={budgets.length > 0} simplefinConfigured={Boolean(process.env.SIMPLEFIN_URL)}
            />
          </>
        ) : (
          <>
          <DashboardViewToggle activeView="monthly" />
          <MonthlyDashboard
            bills={bills} accounts={accounts} recentTransactions={recentTransactions}
            cashFlow={cashFlow} enrichedMatches={enrichedMatches} summary={summary}
            savingsRate={savingsRate} categorySpendData={categorySpendData}
            budgetAlerts={budgetAlerts} billAlerts={billAlerts} priceAlerts={priceAlerts}
            rawBillCount={rawBills.length} accountCount={accounts.length}
            hasBudget={budgets.length > 0} simplefinConfigured={Boolean(process.env.SIMPLEFIN_URL)}
          />
          </>
        )}
      </div>

      <DetailPanel data={panelData} />
    </div>
  );
}
