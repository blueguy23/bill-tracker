import type { BillResponse, BillSummary } from '@/types/bill';
import { SummaryCards } from '@/components/SummaryCards';
import { BillsView } from '@/components/BillsView';

async function fetchBills(): Promise<BillResponse[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/v1/bills`, { cache: 'no-store' });
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

export default async function DashboardPage() {
  const bills = await fetchBills();
  const summary = computeSummary(bills);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Your bills at a glance</p>
        </div>
      </div>
      <SummaryCards summary={summary} />
      <BillsView initialBills={bills} />
    </div>
  );
}
