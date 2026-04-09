import type { BillResponse, BillSummary } from '@/types/bill';
import type { SuggestedMatch } from '@/types/subscription';
import type { Account } from '@/lib/simplefin/types';
import { SummaryCards } from '@/components/SummaryCards';
import { BillsView } from '@/components/BillsView';
import { MatchBanner } from '@/components/MatchBanner';
import { NetWorthCard } from '@/components/NetWorthCard';
import { OnboardingBanner } from '@/components/OnboardingBanner';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

async function fetchBills(): Promise<BillResponse[]> {
  const res = await fetch(`${BASE}/api/v1/bills`, { cache: 'no-store' });
  if (!res.ok) {
    console.error(`[fetchBills] API returned ${res.status} ${res.statusText}`);
    return [];
  }
  const data = await res.json() as { bills: BillResponse[] };
  return data.bills;
}

function computeSummary(bills: BillResponse[]): BillSummary {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let totalOwedThisMonth = 0;
  let totalPaid = 0;
  let overdueCount = 0;
  let autoPayTotal = 0;

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

async function fetchSuggestedMatches(): Promise<SuggestedMatch[]> {
  try {
    const res = await fetch(`${BASE}/api/v1/subscriptions/matches`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json() as { matches: SuggestedMatch[] };
    return data.matches;
  } catch {
    return [];
  }
}

async function fetchBalances(): Promise<Account[]> {
  try {
    const res = await fetch(`${BASE}/api/v1/accounts/balances`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json() as { accounts: Account[] };
    return data.accounts;
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [bills, matches, accounts] = await Promise.all([
    fetchBills(),
    fetchSuggestedMatches(),
    fetchBalances(),
  ]);
  const summary = computeSummary(bills);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Your bills at a glance</p>
        </div>
      </div>
      <OnboardingBanner
        simplefinConfigured={Boolean(process.env.SIMPLEFIN_ACCESS_URL || process.env.SIMPLEFIN_URL)}
        accountCount={accounts.length}
      />
      <MatchBanner count={matches.length} />
      <SummaryCards summary={summary} />
      <NetWorthCard accounts={accounts} />
      <BillsView initialBills={bills} />
    </div>
  );
}
