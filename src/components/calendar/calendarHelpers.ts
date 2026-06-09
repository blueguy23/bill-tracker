import type { BillResponse } from '@/types/bill';

export type BillStatus = 'paid' | 'autopay' | 'upcoming' | 'overdue';
export type CalView = 'month' | 'week';

export interface CalDay {
  id: string;
  name: string;
  category: string;
  amount: number;
  status: BillStatus;
  isAutoPay: boolean;
}

export type Cell = { day: number; type: 'prev' | 'cur' | 'next' };
export type Today = { d: number; m: number; y: number };

export const STATUS_VARIANT: Record<BillStatus, string> = {
  paid:     'bg-green-500/15 text-green-400 border-green-500/25',
  autopay:  'bg-purple-500/15 text-purple-400 border-purple-500/25',
  upcoming: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
  overdue:  'bg-red-500/15 text-red-400 border-red-500/25',
};

export const STATUS_DOT: Record<BillStatus, string> = {
  paid: 'bg-green-400', autopay: 'bg-purple-400', upcoming: 'bg-zinc-400', overdue: 'bg-red-400',
};

export const STATUS_LABEL: Record<BillStatus, string> = {
  paid: 'Paid', autopay: 'Autopay', upcoming: 'Upcoming', overdue: 'Overdue',
};

export const AVATAR_COLORS: Record<BillStatus, string> = {
  paid: 'bg-green-500/15 text-green-400',
  autopay: 'bg-purple-500/15 text-purple-400',
  upcoming: 'bg-zinc-500/15 text-zinc-300',
  overdue: 'bg-red-500/15 text-red-400',
};

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export const USD0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const STATUS_PRIORITY: BillStatus[] = ['overdue', 'upcoming', 'autopay', 'paid'];

export function billStatus(
  bill: BillResponse, day: number, month: number, year: number, today: Today,
): BillStatus {
  if (bill.isPaid) return 'paid';
  const isCurrentMonth = month === today.m && year === today.y;
  if (isCurrentMonth && day < today.d) return bill.isAutoPay ? 'autopay' : 'overdue';
  return bill.isAutoPay ? 'autopay' : 'upcoming';
}

export function getBillsForMonth(
  bills: BillResponse[], month: number, year: number, today: Today,
): Map<number, CalDay[]> {
  const map = new Map<number, CalDay[]>();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function add(day: number, bill: BillResponse, status: BillStatus) {
    if (day < 1 || day > daysInMonth) return;
    const existing = map.get(day) ?? [];
    map.set(day, [...existing, { id: bill._id, name: bill.name, category: bill.category, amount: bill.amount, status, isAutoPay: bill.isAutoPay }]);
  }

  for (const bill of bills) {
    if (bill.isRecurring && bill.recurrenceInterval === 'yearly') {
      if (typeof bill.dueDate !== 'string') continue;
      const d = new Date(bill.dueDate);
      if (isNaN(d.getTime()) || d.getMonth() !== month) continue;
      add(d.getDate(), bill, billStatus(bill, d.getDate(), month, year, today));
    } else if (bill.isRecurring) {
      if (typeof bill.dueDate !== 'number') continue;
      add(bill.dueDate, bill, billStatus(bill, bill.dueDate, month, year, today));
    } else {
      if (typeof bill.dueDate !== 'string') continue;
      const d = new Date(bill.dueDate);
      if (isNaN(d.getTime()) || d.getMonth() !== month || d.getFullYear() !== year) continue;
      add(d.getDate(), bill, billStatus(bill, d.getDate(), month, year, today));
    }
  }
  return map;
}

export function getBillsForDate(
  bills: BillResponse[], year: number, month: number, day: number, today: Today,
): CalDay[] {
  const result: CalDay[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  if (day < 1 || day > daysInMonth) return result;

  for (const bill of bills) {
    if (bill.isRecurring && bill.recurrenceInterval === 'yearly') {
      if (typeof bill.dueDate !== 'string') continue;
      const d = new Date(bill.dueDate);
      if (isNaN(d.getTime()) || d.getMonth() !== month || d.getDate() !== day) continue;
    } else if (bill.isRecurring) {
      if (typeof bill.dueDate !== 'number') continue;
      if (bill.dueDate !== day) continue;
    } else {
      if (typeof bill.dueDate !== 'string') continue;
      const d = new Date(bill.dueDate);
      if (isNaN(d.getTime()) || d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) continue;
    }
    result.push({ id: bill._id, name: bill.name, category: bill.category, amount: bill.amount, status: billStatus(bill, day, month, year, today), isAutoPay: bill.isAutoPay });
  }
  return result;
}

export function toSunday(y: number, m: number, d: number): Today {
  const date = new Date(y, m, d);
  date.setDate(date.getDate() - date.getDay());
  return { d: date.getDate(), m: date.getMonth(), y: date.getFullYear() };
}

export function dominantStatus(dayBills: CalDay[]): BillStatus {
  for (const s of STATUS_PRIORITY) if (dayBills.some(b => b.status === s)) return s;
  return 'paid';
}
