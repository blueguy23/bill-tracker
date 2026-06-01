import type { Transaction } from '@/lib/simplefin/types';
import type { RecurrenceInterval } from '@/types/bill';
import type { SubscriptionInterval } from '@/types/subscription';
import { INTERVAL_WINDOWS } from '@/lib/subscriptions/detect';
import { normalizeDescription, toDisplayName } from '@/lib/subscriptions/normalize';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ── Public types ─────────────────────────────────────────────────────────────

export interface ForecastBill {
  name: string;
  amount: number;
  dueDate: number;
  recurrenceInterval: RecurrenceInterval;
}

export interface ForecastSub {
  name: string;
  amount: number;
  nextEstimated: Date;
  interval: SubscriptionInterval;
}

export interface IncomePattern {
  name: string;
  amount: number;
  nextExpected: Date;
  interval: SubscriptionInterval;
  occurrences: number;
}

export interface ForecastEvent {
  type: 'bill' | 'subscription' | 'income';
  name: string;
  amount: number;
}

export interface ForecastDay {
  date: string;
  balance: number;
  events: ForecastEvent[];
}

export interface ForecastInput {
  currentBalance: number;
  bills: ForecastBill[];
  subscriptions: ForecastSub[];
  incomePatterns: IncomePattern[];
}

export interface ForecastResult {
  days: ForecastDay[];
  incomePatterns: IncomePattern[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const INTERVAL_DAYS: Record<string, number> = {
  weekly: INTERVAL_WINDOWS.weekly.midpoint,
  biweekly: INTERVAL_WINDOWS.biweekly.midpoint,
  monthly: INTERVAL_WINDOWS.monthly.midpoint,
  quarterly: INTERVAL_WINDOWS.quarterly.midpoint,
  yearly: INTERVAL_WINDOWS.yearly.midpoint,
};

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function projectOccurrences(
  startDate: Date,
  interval: string,
  windowStart: Date,
  windowEnd: Date,
): Date[] {
  const step = INTERVAL_DAYS[interval];
  if (!step) return [];
  const dates: Date[] = [];
  let cursor = new Date(startDate);
  while (cursor <= windowEnd) {
    if (cursor >= windowStart) dates.push(new Date(cursor));
    cursor = addDays(cursor, step);
  }
  return dates;
}

function amountBucket(amount: number): number {
  return Math.round(Math.abs(amount) * 2) / 2;
}

// ── Income detection ─────────────────────────────────────────────────────────

const INTERVAL_ORDER: SubscriptionInterval[] = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];

export function detectIncomePatterns(transactions: Transaction[]): IncomePattern[] {
  const income = transactions.filter(
    (t) => t.amount > 0 && !t.pending && !t.isTransfer,
  );

  const groups = new Map<string, Transaction[]>();
  for (const txn of income) {
    const nameKey = normalizeDescription(txn.description);
    const bucket = amountBucket(txn.amount);
    const key = `${nameKey}::${bucket}`;
    const existing = groups.get(key) ?? [];
    existing.push(txn);
    groups.set(key, existing);
  }

  const results: IncomePattern[] = [];

  for (const [compoundKey, txns] of groups) {
    if (txns.length < 2) continue;

    const nameKey = compoundKey.split('::')[0] ?? compoundKey;
    const sorted = [...txns].sort(
      (a, b) => a.posted.getTime() - b.posted.getTime(),
    );

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev && curr) {
        gaps.push(
          (curr.posted.getTime() - prev.posted.getTime()) / MS_PER_DAY,
        );
      }
    }

    let winningInterval: SubscriptionInterval | null = null;
    let maxHits = 0;

    for (const interval of INTERVAL_ORDER) {
      const window = INTERVAL_WINDOWS[interval];
      const hits = gaps.filter(
        (g) => g >= window.min && g <= window.max,
      ).length;
      if (hits >= 1 && hits > maxHits) {
        maxHits = hits;
        winningInterval = interval;
      }
    }

    if (!winningInterval) continue;

    const lastTxn = sorted[sorted.length - 1]!;
    const midpoint = INTERVAL_WINDOWS[winningInterval].midpoint;

    results.push({
      name: toDisplayName(nameKey),
      amount: lastTxn.amount,
      nextExpected: addDays(lastTxn.posted, midpoint),
      interval: winningInterval,
      occurrences: txns.length,
    });
  }

  return results.sort((a, b) => b.amount - a.amount);
}

// ── Forecast engine ──────────────────────────────────────────────────────────

function projectBillDates(
  bill: ForecastBill,
  windowStart: Date,
  windowEnd: Date,
): Date[] {
  if (bill.recurrenceInterval === 'monthly') {
    const dates: Date[] = [];
    const cursor = new Date(
      windowStart.getFullYear(),
      windowStart.getMonth(),
      bill.dueDate,
    );
    while (cursor <= windowEnd) {
      if (cursor >= windowStart) dates.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return dates;
  }

  const anchor = new Date(
    windowStart.getFullYear(),
    windowStart.getMonth(),
    bill.dueDate,
  );
  if (anchor < windowStart) anchor.setMonth(anchor.getMonth() + 1);
  return projectOccurrences(anchor, bill.recurrenceInterval, windowStart, windowEnd);
}

export function buildForecast(input: ForecastInput): ForecastDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowEnd = addDays(today, 90);

  const eventsByDate = new Map<string, ForecastEvent[]>();

  for (const bill of input.bills) {
    for (const d of projectBillDates(bill, today, windowEnd)) {
      const key = toDateKey(d);
      const events = eventsByDate.get(key) ?? [];
      events.push({ type: 'bill', name: bill.name, amount: -bill.amount });
      eventsByDate.set(key, events);
    }
  }

  for (const sub of input.subscriptions) {
    for (const d of projectOccurrences(sub.nextEstimated, sub.interval, today, windowEnd)) {
      const key = toDateKey(d);
      const events = eventsByDate.get(key) ?? [];
      events.push({ type: 'subscription', name: sub.name, amount: -sub.amount });
      eventsByDate.set(key, events);
    }
  }

  for (const inc of input.incomePatterns) {
    for (const d of projectOccurrences(inc.nextExpected, inc.interval, today, windowEnd)) {
      const key = toDateKey(d);
      const events = eventsByDate.get(key) ?? [];
      events.push({ type: 'income', name: inc.name, amount: inc.amount });
      eventsByDate.set(key, events);
    }
  }

  const days: ForecastDay[] = [];
  let balance = input.currentBalance;

  for (let i = 0; i <= 90; i++) {
    const d = addDays(today, i);
    const key = toDateKey(d);
    const events = eventsByDate.get(key) ?? [];
    for (const e of events) {
      balance += e.amount;
    }
    days.push({
      date: key,
      balance: Math.round(balance * 100) / 100,
      events,
    });
  }

  return days;
}
