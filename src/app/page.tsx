import type { BillResponse, BillSummary, Bill } from '@/types/bill';
import type { SuggestedMatch } from '@/types/subscription';
import type { Account } from '@/lib/simplefin/types';
import { SummaryCards } from '@/components/SummaryCards';
import { BillsView } from '@/components/BillsView';
import { MatchBanner } from '@/components/MatchBanner';
import { NetWorthCard } from '@/components/NetWorthCard';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { getDb } from '@/adapters/db';
import { listBills } from '@/adapters/bills';
import { listAccounts, listRecentTransactions } from '@/adapters/accounts';
import { listAccountMeta } from '@/adapters/accountMeta';
import { listBudgets } from '@/adapters/budgets';
import { findAutoMatches } from '@/lib/subscriptions/autoMatch';

function serializeBill(bill: Bill): BillResponse {
  return {
    _id: bill._id,
    name: bill.name,
    amount: bill.amount,
    dueDate: bill.dueDate instanceof Date ? bill.dueDate.toISOString() : bill.dueDate,
    category: bill.category,
    isPaid: bill.isPaid,
    isAutoPay: bill.isAutoPay,
    isRecurring: bill.isRecurring,
    recurrenceInterval: bill.recurrenceInterval,
    url: bill.url,
    notes: bill.notes,
    createdAt: bill.createdAt instanceof Date ? bill.createdAt.toISOString() : String(bill.createdAt),
    updatedAt: bill.updatedAt instanceof Date ? bill.updatedAt.toISOString() : String(bill.updatedAt),
  };
}

function computeSummary(bills: BillResponse[]): BillSummary {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
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

export default async function DashboardPage() {
  const db = await getDb();

  const [rawBills, allAccounts, recentTransactions, budgets] = await Promise.all([
    listBills(db),
    listAccounts(db),
    listRecentTransactions(db),
    listBudgets(db),
  ]);

  // Apply customOrgName overrides
  const metaList = allAccounts.length > 0 ? await listAccountMeta(db, allAccounts.map((a) => a._id)) : [];
  const metaMap = new Map(metaList.map((m) => [m._id, m]));
  const accounts: Account[] = allAccounts.map((a) => {
    const meta = metaMap.get(a._id);
    return meta?.customOrgName ? { ...a, orgName: meta.customOrgName } : a;
  });

  const bills = rawBills.map(serializeBill);
  const matches: SuggestedMatch[] = findAutoMatches(recentTransactions, rawBills);
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
        billCount={rawBills.length}
        hasBudget={budgets.length > 0}
      />
      <MatchBanner count={matches.length} />
      <SummaryCards summary={summary} />
      <NetWorthCard accounts={accounts} />
      <BillsView initialBills={bills} />
    </div>
  );
}
