import type { StrictDB } from 'strictdb';
import type {
  PayPeriodDashboardData,
  PayPeriodStats,
  PayPeriodComparison,
  PayPeriodEvent,
  CategorySpend,
} from '@/types/payPeriod';
import { getUserProfile } from '@/adapters/userProfile';
import { listBills } from '@/adapters/bills';
import { listAccounts, getCashFlowForRange, listTransactions } from '@/adapters/accounts';
import { getForecast } from '@/adapters/forecast';
import {
  resolvePayConfig,
  computePeriodBounds,
  getAdjacentPeriod,
  buildDailyBalances,
  generateBalanceWarning,
} from '@/lib/payPeriod';
import { projectBillDates } from '@/lib/forecast';

export async function getPayPeriodData(
  db: StrictDB,
  periodOffset = 0,
): Promise<PayPeriodDashboardData | null> {
  const [profile, allBills, accounts, forecastResult] = await Promise.all([
    getUserProfile(db),
    listBills(db),
    listAccounts(db),
    getForecast(db),
  ]);

  const payConfig = resolvePayConfig(profile, forecastResult.incomePatterns);
  if (!payConfig) return null;

  let period = computePeriodBounds(payConfig.anchor, payConfig.frequency);
  for (let i = 0; i < Math.abs(periodOffset); i++) {
    period = getAdjacentPeriod(period, payConfig.frequency, periodOffset > 0 ? 'next' : 'prev', payConfig.anchor);
  }

  const periodEnd = new Date(period.end);
  periodEnd.setHours(23, 59, 59, 999);

  const [cashFlow, { transactions: periodTransactions }] = await Promise.all([
    getCashFlowForRange(db, period.start, periodEnd),
    listTransactions(db, { startDate: period.start, endDate: periodEnd, limit: 5000 }),
  ]);

  const currentYYYYMM = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const recurringBills = allBills.filter(b => b.isRecurring && typeof b.dueDate === 'number');
  const upcomingEvents: PayPeriodEvent[] = [];
  let billsDue = 0;
  let billsDueCount = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const bill of recurringBills) {
    const dates = projectBillDates(
      { name: bill.name, amount: bill.amount, dueDate: bill.dueDate as number, recurrenceInterval: bill.recurrenceInterval! },
      period.start,
      periodEnd,
    );

    for (const date of dates) {
      const isPaidThisPeriod = bill.isPaid && bill.paidMonth === currentYYYYMM;

      if (!isPaidThisPeriod && date >= today) {
        billsDue += bill.amount;
        billsDueCount++;
        upcomingEvents.push({
          date,
          type: 'bill',
          name: bill.name,
          amount: bill.amount,
          detail: `${bill.category} · ${bill.isAutoPay ? 'Auto-pay' : 'Manual'}`,
          projectedBalance: 0,
        });
      }
    }
  }

  const incomePatterns = forecastResult.incomePatterns;
  let nextPayday = '';
  if (incomePatterns.length > 0) {
    const topIncome = incomePatterns[0]!;
    const nextPay = topIncome.nextExpected;
    nextPayday = nextPay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (nextPay >= today && nextPay <= periodEnd) {
      upcomingEvents.push({
        date: nextPay,
        type: 'income',
        name: topIncome.name,
        amount: topIncome.amount,
        detail: 'Direct deposit',
        projectedBalance: 0,
      });
    }
  }

  upcomingEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

  let runningBalance = cashFlow.income - cashFlow.expenses;
  for (const evt of upcomingEvents) {
    if (evt.type === 'bill') {
      runningBalance -= evt.amount;
    } else {
      runningBalance += evt.amount;
    }
    evt.projectedBalance = Math.round(runningBalance * 100) / 100;
  }

  const remaining = cashFlow.income - cashFlow.expenses;
  const safeToSpend = remaining - billsDue;
  const spentPercent = cashFlow.income > 0 ? Math.round((cashFlow.expenses / cashFlow.income) * 100) : 0;

  const stats: PayPeriodStats = {
    income: cashFlow.income,
    spent: cashFlow.expenses,
    billsDue,
    billsDueCount,
    remaining,
    safeToSpend,
    spentPercent,
    transactionCount: periodTransactions.length,
  };

  const currentBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const txnsForChart = periodTransactions.map(t => ({
    posted: t.posted instanceof Date ? t.posted : new Date(Number(t.posted) * 1000),
    amount: Number(t.amount),
    description: t.description,
  }));
  const dailyBalances = buildDailyBalances(period.start, period.end, currentBalance - remaining, txnsForChart, upcomingEvents);
  const balanceWarning = generateBalanceWarning(upcomingEvents, remaining);

  const categoryMap = new Map<string, number>();
  for (const txn of periodTransactions) {
    if (Number(txn.amount) < 0 && !txn.isTransfer) {
      const cat = txn.category ?? 'Other';
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + Math.abs(Number(txn.amount)));
    }
  }
  const categorySpend: CategorySpend[] = Array.from(categoryMap.entries())
    .map(([label, amount]) => ({ label, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);

  let comparison: PayPeriodComparison | null = null;
  try {
    const prevPeriod = getAdjacentPeriod(period, payConfig.frequency, 'prev', payConfig.anchor);
    const prevEnd = new Date(prevPeriod.end);
    prevEnd.setHours(23, 59, 59, 999);
    const prevCashFlow = await getCashFlowForRange(db, prevPeriod.start, prevEnd);

    const prevBillsDue = recurringBills.reduce((sum, b) => {
      const dates = projectBillDates(
        { name: b.name, amount: b.amount, dueDate: b.dueDate as number, recurrenceInterval: b.recurrenceInterval! },
        prevPeriod.start,
        prevEnd,
      );
      return sum + dates.length * b.amount;
    }, 0);

    const prevRemaining = prevCashFlow.income - prevCashFlow.expenses;
    const prevSafeToSpend = prevRemaining - prevBillsDue;
    const prevSavingsRate = prevCashFlow.income > 0 ? ((prevCashFlow.income - prevCashFlow.expenses) / prevCashFlow.income) * 100 : 0;
    const currentSavingsRate = cashFlow.income > 0 ? ((cashFlow.income - cashFlow.expenses) / cashFlow.income) * 100 : 0;

    comparison = {
      prevIncome: prevCashFlow.income,
      prevSpent: prevCashFlow.expenses,
      prevSafeToSpend,
      prevSavingsRate,
      incomeDelta: cashFlow.income - prevCashFlow.income,
      spentDelta: cashFlow.expenses - prevCashFlow.expenses,
      safeToSpendDelta: safeToSpend - prevSafeToSpend,
      savingsRateDelta: currentSavingsRate - prevSavingsRate,
    };
  } catch {
    // No previous period data available
  }

  return {
    period,
    stats,
    dailyBalances,
    upcomingEvents,
    categorySpend,
    comparison,
    balanceWarning,
    nextPayday,
  };
}
