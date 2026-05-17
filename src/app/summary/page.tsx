import type { BillResponse, Bill } from '@/types/bill';
import { MonthlySummary } from '@/components/MonthlySummary';
import { getDb } from '@/adapters/db';
import { listBills } from '@/adapters/bills';

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
    _id: bill._id,
    name: bill.name,
    amount: bill.amount,
    dueDate: bill.dueDate instanceof Date ? bill.dueDate.toISOString() : bill.dueDate,
    category: bill.category,
    isPaid: isPaidThisMonth(bill),
    isAutoPay: bill.isAutoPay,
    isRecurring: bill.isRecurring,
    recurrenceInterval: bill.recurrenceInterval,
    url: bill.url,
    notes: bill.notes,
    paidMonth: bill.paidMonth,
    createdAt: bill.createdAt instanceof Date ? bill.createdAt.toISOString() : String(bill.createdAt),
    updatedAt: bill.updatedAt instanceof Date ? bill.updatedAt.toISOString() : String(bill.updatedAt),
  };
}

export default async function SummaryPage() {
  const db = await getDb();
  const rawBills = await listBills(db);
  const bills: BillResponse[] = rawBills.map(serializeBill);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-white">Monthly Summary</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Spending breakdown by month</p>
      </div>
      <MonthlySummary bills={bills} />
    </div>
  );
}
