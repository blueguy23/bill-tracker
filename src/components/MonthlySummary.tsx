'use client';

import { useState, useEffect } from 'react';
import type { BillCategory, BillResponse } from '@/types/bill';
import { BILL_CATEGORIES } from '@/types/bill';
import { CategoryBadge } from './CategoryBadge';
import { SpendingSection } from './SpendingSection';
import type { SummaryResponse } from '@/app/api/v1/summary/route';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export interface CategoryStat {
  category: BillCategory;
  count: number;
  total: number;
  paid: number;
  unpaid: number;
}

export interface MonthStats {
  totalOwed: number;
  totalPaid: number;
  unpaidCount: number;
  categoryBreakdown: CategoryStat[];
}

export function computeMonthStats(bills: BillResponse[], month: string): MonthStats {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1; // 0-based

  const catMap = new Map<BillCategory, CategoryStat>();

  let totalOwed = 0;
  let totalPaid = 0;
  let unpaidCount = 0;

  for (const bill of bills) {
    // Determine if this bill falls in the target month
    const inMonth = bill.isRecurring
      ? true
      : typeof bill.dueDate === 'string' && (() => {
          const d = new Date(bill.dueDate);
          return d.getUTCFullYear() === year && d.getUTCMonth() === monthIndex;
        })();

    if (!inMonth) continue;

    if (bill.isPaid) {
      totalPaid += bill.amount;
    } else {
      totalOwed += bill.amount;
      unpaidCount++;
    }

    const existing = catMap.get(bill.category) ?? {
      category: bill.category,
      count: 0,
      total: 0,
      paid: 0,
      unpaid: 0,
    };
    existing.count++;
    existing.total += bill.amount;
    if (bill.isPaid) existing.paid += bill.amount;
    else existing.unpaid += bill.amount;
    catMap.set(bill.category, existing);
  }

  // Return categories in canonical order, only those with bills
  const categoryBreakdown = BILL_CATEGORIES
    .map((c) => catMap.get(c))
    .filter((s): s is CategoryStat => s !== undefined);

  return { totalOwed, totalPaid, unpaidCount, categoryBreakdown };
}

function toMonthString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y!, m! - 1, 1);
  d.setMonth(d.getMonth() + delta);
  return toMonthString(d);
}

interface StatCardProps {
  label: string;
  value: string;
  fromColor: string;
  dotColor: string;
  subtext?: string;
}

function StatCard({ label, value, fromColor, dotColor, subtext }: StatCardProps) {
  return (
    <div className={`rounded-xl p-5 border border-teal-900/40 bg-gradient-to-br ${fromColor} to-zinc-900`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <p className="text-xs font-semibold text-sky-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-[1.75rem] font-bold text-white leading-none tracking-tight">{value}</p>
      {subtext && <p className="mt-2 text-xs text-sky-900">{subtext}</p>}
    </div>
  );
}

interface MonthlySummaryProps {
  bills: BillResponse[];
}

export function MonthlySummary({ bills }: MonthlySummaryProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => toMonthString(new Date()));
  const [spendData, setSpendData] = useState<SummaryResponse | null>(null);
  const [spendLoading, setSpendLoading] = useState(false);

  useEffect(() => {
    setSpendLoading(true);
    setSpendData(null);
    fetch(`/api/v1/summary?month=${selectedMonth}`)
      .then((r) => r.ok ? r.json() as Promise<SummaryResponse> : null)
      .then((data) => { if (data) setSpendData(data); })
      .catch(() => {})
      .finally(() => setSpendLoading(false));
  }, [selectedMonth]);

  const now = toMonthString(new Date());
  const maxMonth = addMonths(now, 12);

  // Earliest month from one-off bills (recurring have no bound)
  const oneOffMonths = bills
    .filter((b) => !b.isRecurring && typeof b.dueDate === 'string')
    .map((b) => (b.dueDate as string).slice(0, 7))
    .filter(Boolean);
  const minMonth = oneOffMonths.length > 0
    ? oneOffMonths.reduce((a, b) => (a < b ? a : b))
    : addMonths(now, -12);

  const stats = computeMonthStats(bills, selectedMonth);
  const hasBills = stats.totalOwed > 0 || stats.totalPaid > 0;

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSelectedMonth(addMonths(selectedMonth, -1))}
          disabled={selectedMonth <= minMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-depth-800 text-sky-500 hover:text-white hover:bg-depth-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous month"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h2 className="text-base font-semibold text-white min-w-[160px] text-center">
          {formatMonthLabel(selectedMonth)}
        </h2>
        <button
          onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
          disabled={selectedMonth >= maxMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-depth-800 text-sky-500 hover:text-white hover:bg-depth-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next month"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
        {selectedMonth !== now && (
          <button
            onClick={() => setSelectedMonth(now)}
            className="text-xs text-sky-700 hover:text-sky-300 transition-colors ml-1"
          >
            Today
          </button>
        )}
      </div>

      {/* Actual spending from transactions */}
      {spendLoading && (
        <div className="rounded-xl border border-teal-900/40 bg-depth-900 p-8 text-center">
          <p className="text-sky-900 text-sm">Loading spending data…</p>
        </div>
      )}
      {spendData && !spendLoading && <SpendingSection data={spendData} />}

      <div className="border-t border-teal-900/40 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xs font-semibold text-sky-700 uppercase tracking-wider">Bills</h3>
          <span className="text-xs text-sky-900">manually tracked</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Total Owed"
          value={USD.format(stats.totalOwed)}
          fromColor="from-red-500/[0.12]"
          dotColor="bg-red-500"
        />
        <StatCard
          label="Total Paid"
          value={USD.format(stats.totalPaid)}
          fromColor="from-emerald-500/[0.12]"
          dotColor="bg-emerald-500"
        />
        <StatCard
          label="Unpaid Bills"
          value={String(stats.unpaidCount)}
          fromColor="from-orange-500/[0.12]"
          dotColor="bg-orange-500"
          subtext={stats.unpaidCount === 0 ? 'All clear' : undefined}
        />
      </div>

      {/* Category breakdown */}
      {hasBills ? (
        <div className="rounded-xl border border-teal-900/40 bg-depth-900 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-teal-900/40">
            <h3 className="text-xs font-semibold text-sky-700 uppercase tracking-wider">By Category</h3>
          </div>
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-teal-900/25">
                {['Category', 'Bills', 'Total', 'Paid', 'Unpaid'].map((h) => (
                  <th key={h} className={`px-5 py-3 text-[11px] font-semibold text-sky-700 uppercase tracking-wider ${h === 'Category' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {stats.categoryBreakdown.map((row) => (
                <tr key={row.category} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5"><CategoryBadge category={row.category} /></td>
                  <td className="px-5 py-3.5 text-right text-sm text-sky-500 tabular-nums">{row.count}</td>
                  <td className="px-5 py-3.5 text-right text-sm font-medium text-white tabular-nums">{USD.format(row.total)}</td>
                  <td className="px-5 py-3.5 text-right text-sm text-emerald-400 tabular-nums">{USD.format(row.paid)}</td>
                  <td className="px-5 py-3.5 text-right text-sm text-red-400 tabular-nums">{USD.format(row.unpaid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-teal-900/40 bg-depth-900 p-16 text-center">
          <p className="text-sky-700 text-sm">No bills for this month</p>
          <p className="text-sky-900 text-xs mt-1">Recurring bills will always appear here</p>
        </div>
      )}
    </div>
  );
}
