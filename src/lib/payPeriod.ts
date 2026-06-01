import type { PayFrequency, PayPeriodBounds, PayConfig, DailyBalance, PayPeriodEvent } from '@/types/payPeriod';
import type { IncomePattern } from '@/lib/forecast';
import type { UserProfile } from '@/types/userProfile';
import { addDays, toDateKey } from '@/lib/forecast';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const FREQUENCY_TO_INTERVAL: Record<PayFrequency, string> = {
  weekly: 'weekly',
  biweekly: 'biweekly',
  semimonthly: 'semimonthly',
  monthly: 'monthly',
};

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function resolvePayConfig(
  profile: Pick<UserProfile, 'payFrequency' | 'payday'>,
  incomePatterns: IncomePattern[],
): PayConfig | null {
  if (profile.payFrequency) {
    const anchor = findAnchorDate(profile.payFrequency, profile.payday, incomePatterns);
    return { frequency: profile.payFrequency, anchor };
  }

  if (incomePatterns.length === 0) return null;

  const sorted = [...incomePatterns].sort((a, b) => b.amount - a.amount);
  const top = sorted[0]!;

  if (sorted.length >= 2) {
    const second = sorted[1]!;
    if (second.amount > top.amount * 0.5 && second.interval !== top.interval) {
      return null;
    }
  }

  const freq = intervalToFrequency(top.interval);
  if (!freq) return null;

  return { frequency: freq, anchor: top.nextExpected };
}

function intervalToFrequency(interval: string): PayFrequency | null {
  switch (interval) {
    case 'weekly': return 'weekly';
    case 'biweekly': return 'biweekly';
    case 'monthly': return 'monthly';
    default: return null;
  }
}

function findAnchorDate(
  frequency: PayFrequency,
  payday: number | null,
  incomePatterns: IncomePattern[],
): Date {
  if (incomePatterns.length > 0) {
    const sorted = [...incomePatterns].sort((a, b) => b.amount - a.amount);
    return sorted[0]!.nextExpected;
  }

  const today = startOfDay(new Date());
  if (payday) {
    const anchor = new Date(today.getFullYear(), today.getMonth(), payday);
    if (anchor > today) anchor.setMonth(anchor.getMonth() - 1);
    return anchor;
  }

  return today;
}

export function computePeriodBounds(
  anchor: Date,
  frequency: PayFrequency,
  targetDate?: Date,
): PayPeriodBounds {
  const target = startOfDay(targetDate ?? new Date());

  if (frequency === 'semimonthly') {
    return computeSemimonthlyBounds(target);
  }

  const periodDays = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 30;

  if (frequency === 'monthly') {
    return computeMonthlyBounds(anchor, target);
  }

  const anchorStart = startOfDay(new Date(anchor));
  const diffDays = daysBetween(anchorStart, target);
  const periodsAway = Math.floor(diffDays / periodDays);
  const start = addDays(anchorStart, periodsAway * periodDays);
  const end = addDays(start, periodDays - 1);

  const dayNumber = daysBetween(start, target) + 1;
  const daysLeft = daysBetween(target, end);

  return {
    start,
    end,
    isActive: target >= start && target <= end,
    dayNumber,
    totalDays: periodDays,
    daysLeft,
  };
}

function computeSemimonthlyBounds(target: Date): PayPeriodBounds {
  const year = target.getFullYear();
  const month = target.getMonth();
  const day = target.getDate();

  let start: Date, end: Date;
  if (day <= 15) {
    start = new Date(year, month, 1);
    end = new Date(year, month, 15);
  } else {
    start = new Date(year, month, 16);
    end = new Date(year, month, lastDayOfMonth(year, month));
  }

  const totalDays = daysBetween(start, end) + 1;
  const dayNumber = daysBetween(start, target) + 1;
  const daysLeft = daysBetween(target, end);

  return { start, end, isActive: true, dayNumber, totalDays, daysLeft };
}

function computeMonthlyBounds(anchor: Date, target: Date): PayPeriodBounds {
  const anchorDay = anchor.getDate();
  const year = target.getFullYear();
  const month = target.getMonth();
  const day = target.getDate();

  let start: Date, end: Date;
  if (day >= anchorDay) {
    start = new Date(year, month, anchorDay);
    end = addDays(new Date(year, month + 1, anchorDay), -1);
  } else {
    start = new Date(year, month - 1, anchorDay);
    end = addDays(new Date(year, month, anchorDay), -1);
  }

  const totalDays = daysBetween(start, end) + 1;
  const dayNumber = daysBetween(start, target) + 1;
  const daysLeft = daysBetween(target, end);

  return { start, end, isActive: true, dayNumber, totalDays, daysLeft };
}

export function getAdjacentPeriod(
  current: PayPeriodBounds,
  frequency: PayFrequency,
  direction: 'prev' | 'next',
  anchor: Date,
): PayPeriodBounds {
  const offset = direction === 'next' ? 1 : -1;
  const targetDate = addDays(direction === 'next' ? current.end : current.start, offset);
  return computePeriodBounds(anchor, frequency, targetDate);
}

export function buildDailyBalances(
  periodStart: Date,
  periodEnd: Date,
  startingBalance: number,
  transactions: Array<{ posted: Date; amount: number; description: string }>,
  projectedEvents: PayPeriodEvent[],
): DailyBalance[] {
  const today = startOfDay(new Date());
  const totalDays = daysBetween(periodStart, periodEnd) + 1;
  const balances: DailyBalance[] = [];

  const txnByDate = new Map<string, number>();
  for (const txn of transactions) {
    const key = toDateKey(txn.posted);
    txnByDate.set(key, (txnByDate.get(key) ?? 0) + txn.amount);
  }

  const eventsByDate = new Map<string, PayPeriodEvent[]>();
  for (const evt of projectedEvents) {
    const key = toDateKey(evt.date);
    const existing = eventsByDate.get(key) ?? [];
    existing.push(evt);
    eventsByDate.set(key, existing);
  }

  let balance = startingBalance;

  for (let i = 0; i < totalDays; i++) {
    const date = addDays(periodStart, i);
    const key = toDateKey(date);
    const isProjected = date > today;
    const dayEvents = eventsByDate.get(key) ?? [];

    if (!isProjected) {
      const txnAmount = txnByDate.get(key) ?? 0;
      balance += txnAmount;
    } else {
      for (const evt of dayEvents) {
        balance += evt.type === 'income' ? evt.amount : -evt.amount;
      }
    }

    balances.push({
      date: key,
      balance: Math.round(balance * 100) / 100,
      isProjected,
      events: dayEvents,
    });
  }

  return balances;
}

export function generateBalanceWarning(
  events: PayPeriodEvent[],
  currentBalance: number,
): string | null {
  let balance = currentBalance;
  let lowestBalance = currentBalance;
  let lowestEvent: PayPeriodEvent | null = null;

  const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const evt of sorted) {
    if (evt.type === 'bill') {
      balance -= evt.amount;
      if (balance < lowestBalance) {
        lowestBalance = balance;
        lowestEvent = evt;
      }
    } else {
      balance += evt.amount;
    }
  }

  if (lowestBalance < 0 && lowestEvent) {
    const dateStr = lowestEvent.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `Balance will go negative ($${Math.round(lowestBalance).toLocaleString()}) after ${lowestEvent.name} hits on ${dateStr}.`;
  }

  if (lowestBalance < 100 && lowestEvent) {
    const dateStr = lowestEvent.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `Balance will be $${Math.round(lowestBalance)} after ${lowestEvent.name} hits on ${dateStr}.`;
  }

  return null;
}

export { FREQUENCY_TO_INTERVAL };
